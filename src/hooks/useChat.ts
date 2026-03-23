import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useUIStore } from '@/stores/uiStore'

export type ConversationItem = {
  id: string
  character_id: string
  updated_at: string
  character: {
    id: string
    name: string
    avatar_url: string | null
    description: string
    prompt?: string
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
  const { model } = useUIStore()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  
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
          updated_at,
          character:characters (
            id,
            name,
            avatar_url,
            description
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
  const { isLoading: isMessagesLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return []
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setMessages(data as ChatMessage[])
      return data
    },
    enabled: !!conversationId,
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
      
      // If none, create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, character_id: characterId } as any)
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
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          conversationId,
          characterId: charId,
          content,
          model: model || 'gemini-1.5-pro' // Fallback to avoid 400
        })
      })

      if (!response.ok) {
        throw new Error('呼叫 AI 發生錯誤')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullAssistantMessage = ''

      if (reader) {
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
        // @ts-expect-error supabase types
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() } as any).eq('id', conversationId)
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      }
    } catch (err) {
      console.error('Streaming error:', err)
      // Remove temp assistant message or show error mark
      setMessages(prev => [
        ...prev.filter(msg => msg.id !== tempAssistantId),
        { id: crypto.randomUUID(), role: 'assistant', content: '（連線中斷或發生錯誤，請稍後再試）', created_at: new Date().toISOString() }
      ])
    } finally {
      setIsTyping(false)
    }
  }, [conversationId, user, queryClient, model])

  return {
    conversations,
    isConversationsLoading,
    messages,
    isMessagesLoading,
    isTyping,
    startConversation,
    sendMessage,
    deleteConversation,
    deleteMessage: async (msgId: string) => {
      const { error } = await supabase.from('messages').delete().eq('id', msgId)
      if (error) throw error
      setMessages(prev => prev.filter(m => m.id !== msgId))
    },
    updateMessage: async (msgId: string, content: string) => {
      const { error } = await supabase.from('messages').update({ content } as any).eq('id', msgId)
      if (error) throw error
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content } : m))
    },
    regenerateMessage: async (msgId: string, charId: string) => {
      // 1. Find message index
      const msgIndex = messages.findIndex(m => m.id === msgId)
      if (msgIndex === -1) return

      // 2. All IDs from this message onwards
      const idsToDelete = messages.slice(msgIndex).map(m => m.id)
      
      // 3. Delete from DB
      const { error } = await supabase.from('messages').delete().in('id', idsToDelete)
      if (error) throw error
      
      // 4. Update UI
      setMessages(prev => prev.slice(0, msgIndex))
      
      // 5. Trigger new generation for the remaining context
      // The content used for the AI will be the last remaining user message
      const remainingMsgs = messages.slice(0, msgIndex)
      const lastUserMsg = [...remainingMsgs].reverse().find(m => m.role === 'user')
      
      if (lastUserMsg) {
        // We use the last user message to "prompt" the AI again
        await sendMessage(lastUserMsg.content, charId, true)
      } else {
        // Fallback: Continue with empty content (should be handled by edge function)
        await sendMessage('', charId, true)
      }
    },
    getSuggestions: async (_charId: string): Promise<string[]> => {
      // Mocked for now since edge function deploy failed, but structure is ready
      return [
        "你為什麼在這裡？",
        "我可以幫你什麼嗎？",
        "這是一個漫長的故事..."
      ]
    }
  }
}
