import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useUIStore } from '@/stores/uiStore'
import { logger } from '@/lib/logger'

export type ConversationItem = {
  id: string
  character_id: string
  model_id: string | null
  bg_image_url: string | null
  updated_at: string
  character: {
    id: string
    name: string
    avatar_url: string | null
    description: string
    greeting?: string
    prompt?: string
    author_id: string
    tags?: string[]
  }
  last_message?: {
    content: string
    created_at: string
  }
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export function useChat(conversationId?: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { model, setConversationModel } = useUIStore()

  const [isTyping, setIsTyping] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Helper to update query cache directly instead of local state
  const setMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    if (!conversationId) return
    queryClient.setQueryData<ChatMessage[]>(['messages', conversationId], (old = []) => {
      return typeof updater === 'function' ? updater(old) : updater
    })
  }, [conversationId, queryClient])
  
  // 1. Fetch conversations list
  const { data: conversations = [], isLoading: isConversationsLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          character_id,
          model_id,
          bg_image_url,
          updated_at,
          character:characters (
            id,
            name,
            avatar_url,
            description,
            greeting,
            prompt,
            author_id
          ),
          messages:messages (
            content,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      
      // Process to get the single last message for each conversation
      const items = (data as any[]).map(d => ({
        ...d,
        last_message: d.messages && d.messages.length > 0 
          ? d.messages.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]
          : undefined
      }))

      return items as unknown as ConversationItem[]
    },
    enabled: !!user,
  })

  // 1.5 Delete conversation
  const { mutateAsync: deleteConversation } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  })

  // 2. Fetch messages for active conversation
  const { data: messages = [], isLoading: isMessagesLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return []
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      return data as ChatMessage[]
    },
    enabled: !!conversationId,
    refetchOnWindowFocus: false,
    staleTime: Infinity, // Rely on optimistic UI updates instead of background polling
  })

  // 3. Start a new conversation
  const { mutateAsync: startConversation } = useMutation({
    mutationFn: async (characterId: string) => {
      if (!user) throw new Error('未登入')
      
      // Check if conversation already exists for this character
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('character_id', characterId)
        .maybeSingle()
        
      if (existing) {
        return (existing as any).id
      }
      
      // Fetch default model id from configs for new conversations
      const { data: configData } = await supabase.from('configs').select('value').eq('key', 'default_chat_model_id').maybeSingle()
      const fallbackModel = (configData as any)?.value || model || 'gemini-1.5-pro'

      // If none, create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, character_id: characterId, model_id: fallbackModel } as any)
        .select('id')
        .single<any>()
        
      if (error) throw error

      // Also fetch character's greeting
      const { data: charData } = await supabase
        .from('characters')
        .select('greeting')
        .eq('id', characterId)
        .single<any>()
        
      if ((charData as any)?.greeting) {
        await supabase.from('messages').insert({
          conversation_id: (data as any).id,
          role: 'assistant',
          content: (charData as any).greeting
        } as any)
      }
      
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      return data.id
    }
  })

  // 4. Send message to Edge Function (Streaming)
  const sendMessage = useCallback(async (content: string, charId: string, isContinue = false) => {
    if (!conversationId || !user) return

    if (!isContinue) {
      const tempId = crypto.randomUUID()
      const userMessage: ChatMessage = {
        id: tempId,
        role: 'user',
        content,
        created_at: new Date().toISOString()
      }

      setMessages(prev => [...prev, userMessage])
      
      // First save user message to DB
      const { data: savedMsg, error: insertError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content
      } as any).select().single()
      
      if (!insertError && savedMsg) {
        setMessages(prev => prev.map(m => m.id === tempId ? savedMsg as ChatMessage : m))
      }
    }

    setIsTyping(true)

    // Create a temporary assistant message that will be filled in over the stream
    const tempAssistantId = crypto.randomUUID()
    setMessages(prev => [
      ...prev,
      { id: tempAssistantId, role: 'assistant', content: '', created_at: new Date().toISOString() }
    ])

    try {
      // Get the session access token for edge function
      const { data: { session } } = await supabase.auth.getSession()
      
      const currentConv = conversations.find(c => c.id === conversationId)
      let activeModelId = currentConv?.model_id
      
      if (!activeModelId) {
        const { data: configData } = await supabase.from('configs').select('value').eq('key', 'default_chat_model_id').maybeSingle()
        activeModelId = (configData as any)?.value || model || 'gemini-1.5-pro'
      }

      // Create a fresh AbortController for this request
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        signal,
        body: JSON.stringify({
          conversationId,
          characterId: charId,
          content,
          model: activeModelId
        })
      })

      if (!response.ok) {
        throw new Error('呼叫 AI 發生錯誤')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullAssistantMessage = ''

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = decoder.decode(value, { stream: true })
            fullAssistantMessage += chunk
            
            // Update the streaming message in UI
            setMessages(prev => prev.map(msg => 
              msg.id === tempAssistantId ? { ...msg, content: fullAssistantMessage } : msg
            ))
          }
        } catch (readErr: any) {
          // AbortError is expected when user cancels — ignore it, keep what we have
          if (readErr?.name !== 'AbortError') throw readErr
        } finally {
          reader.cancel().catch(() => {})
        }
      }

      // Finish streaming, save assistant message to DB
      if (fullAssistantMessage) {
        const { data: savedAsst, error: asstError } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: fullAssistantMessage
        } as any).select().single()
        
        if (!asstError && savedAsst) {
          setMessages(prev => prev.map(m => m.id === tempAssistantId ? savedAsst as ChatMessage : m))
        }
        
        // Update conversation updated_at
        await (supabase.from('conversations') as any).update({ updated_at: new Date().toISOString() }).eq('id', conversationId)
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      } else {
        // Nothing received (aborted immediately or empty response) — remove blank bubble
        setMessages(prev => prev.filter(m => m.id !== tempAssistantId))
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // Aborted before any response arrived — remove the blank temp bubble
        setMessages(prev => prev.filter(m => m.id !== tempAssistantId))
      } else {
        logger.error('Streaming error:', err)
        setMessages(prev => [
          ...prev.filter(msg => msg.id !== tempAssistantId),
          { id: crypto.randomUUID(), role: 'assistant', content: '（連線中斷或發生錯誤，請稍後再試）', created_at: new Date().toISOString() }
        ])
      }
    } finally {
      abortControllerRef.current = null
      setIsTyping(false)
    }
  }, [conversationId, user, queryClient, model, conversations])

  return {
    conversations,
    isConversationsLoading,
    messages,
    isMessagesLoading,
    isTyping,
    startConversation,
    sendMessage,
    abortMessage: () => {
      abortControllerRef.current?.abort()
    },
    deleteConversation,
    deleteMessage: async (msgId: string) => {
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(['messages', conversationId])
      setMessages(prev => prev.filter(m => m.id !== msgId))

      const { error } = await supabase.from('messages').delete().eq('id', msgId)
      if (error) {
        if (previousMessages) setMessages(previousMessages)
        throw error
      }
    },
    updateMessage: async (msgId: string, content: string) => {
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(['messages', conversationId])
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content } : m))

      const { error } = await (supabase.from('messages') as any).update({ content }).eq('id', msgId)
      if (error) {
        if (previousMessages) setMessages(previousMessages)
        throw error
      }
    },
    updateConversationModel: async (convId: string, modelId: string) => {
      try {
        const { error } = await (supabase.from('conversations') as any).update({ model_id: modelId }).eq('id', convId)
        if (error) throw error
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      } catch (err) {
        logger.warn('Failed to sync model to database, using local state fallback:', err)
        setConversationModel(convId, modelId)
      }
    },
    updateConversationBg: async (convId: string, bgUrl: string) => {
      const { error } = await (supabase.from('conversations') as any).update({ bg_image_url: bgUrl }).eq('id', convId)
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    regenerateMessage: async (msgId: string, charId: string) => {
      const msgIndex = messages.findIndex(m => m.id === msgId)
      if (msgIndex === -1) return

      const idsToDelete = messages.slice(msgIndex).map(m => m.id)
      
      const { error } = await supabase.from('messages').delete().in('id', idsToDelete)
      if (error) throw error
      
      setMessages(prev => prev.slice(0, msgIndex))
      
      const remainingMsgs = messages.slice(0, msgIndex)
      const lastUserMsg = [...remainingMsgs].reverse().find(m => m.role === 'user')
      
      if (lastUserMsg) {
        await sendMessage(lastUserMsg.content, charId, true)
      } else {
        await sendMessage('', charId, true)
      }
    },
    rollbackMessage: async (msgId: string) => {
      const msgIndex = messages.findIndex(m => m.id === msgId)
      if (msgIndex === -1) return

      const idsToDelete = messages.slice(msgIndex + 1).map(m => m.id)
      if (idsToDelete.length === 0) return

      const previousMessages = queryClient.getQueryData<ChatMessage[]>(['messages', conversationId])
      setMessages(prev => prev.slice(0, msgIndex + 1))

      const { error } = await (supabase.from('messages') as any).delete().in('id', idsToDelete)
      if (error) {
        if (previousMessages) setMessages(previousMessages)
        throw error
      }
    },
    getSuggestions: async (charId: string): Promise<string[]> => {
      if (!conversationId) return []
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggestions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            conversationId,
            characterId: charId
          })
        })

        if (!response.ok) {
          throw new Error('呼叫建議模型失敗')
        }

        const data = await response.json()
        return data.suggestions || []
      } catch (err) {
        logger.error('Suggestions error:', err)
        return [
          "（點頭）",
          "然後呢？",
          "（保持沉默）"
        ]
      }
    }
  }
}
