import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Profile, Model } from '@/types'
import { useModalStore } from '@/stores/modalStore'
import { logger } from '@/lib/logger'

export function useAdminState() {
  const { isAdmin } = useAuth()
  const modal = useModalStore()
  
  const [activeTab, setActiveTab] = useState<'users' | 'models' | 'settings' | 'invites'>('users')
  
  // User Management State
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'inactive'>('all')
  
  // Model Management State
  const [models, setModels] = useState<Model[]>([])
  const [modelSearch, setModelSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  
  const [showProviderFilterDropdown, setShowProviderFilterDropdown] = useState(false)
  const [showCategoryFilterDropdown, setShowCategoryFilterDropdown] = useState(false)
  
  const [isEditingModel, setIsEditingModel] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Model>>({})
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showProviderDropdown, setShowProviderDropdown] = useState(false)
  
  const [suggestionModelId, setSuggestionModelId] = useState<string>('')
  const [pendingModelId, setPendingModelId] = useState<string>('')
  
  const [defaultChatModelId, setDefaultChatModelId] = useState<string>('')
  const [pendingDefaultChatModelId, setPendingDefaultChatModelId] = useState<string>('')
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [providers, setProviders] = useState<any[]>([])

  // Invite Codes State
  const [inviteCodes, setInviteCodes] = useState<any[]>([])

  useEffect(() => {
    if (!isAdmin) return
    if (activeTab === 'users') {
      loadProfiles()
    } else if (activeTab === 'models') {
      loadModels()
      loadSettings()
    } else if (activeTab === 'settings') {
      loadModels()
      loadSettings()
    } else if (activeTab === 'invites') {
      loadInviteCodes()
    }
  }, [isAdmin, activeTab])

  const loadProfiles = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (profileErr) throw profileErr
      setProfiles(data || [])
    } catch (err: any) {
      logger.error('Admin error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadModels = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: modelErr } = await supabase
        .from('models')
        .select('*')
        .order('name', { ascending: true })
      
      if (modelErr) throw modelErr
      setModels(data || [])
    } catch (err: any) {
      logger.error('Admin error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const DEFAULT_PROVIDERS = [
    { key: 'google', name: 'Google (Official)', base_url: '', api_key_name: 'GEMINI_API_KEY' },
    { key: 'openai', name: 'OpenAI (Official)', base_url: 'https://api.openai.com/v1', api_key_name: 'OPENAI_API_KEY' },
    { key: 'deepseek', name: 'DeepSeek', base_url: 'https://api.deepseek.com/v1', api_key_name: 'DEEPSEEK_API_KEY' },
    { key: 'anthropic', name: 'Anthropic', base_url: 'https://api.anthropic.com/v1', api_key_name: 'ANTHROPIC_API_KEY' },
    { key: 'openrouter', name: 'OpenRouter', base_url: 'https://openrouter.ai/api/v1', api_key_name: 'OPENROUTER_API_KEY' }
  ]

  const loadSettings = async () => {
    try {
      // Load providers directly from the public.providers table
      const { data: provData, error: provErr } = await (supabase.from('providers') as any)
        .select('*')
        .order('name', { ascending: true })
      
      if (!provErr && provData && provData.length > 0) {
        setProviders(provData)
      } else {
        setProviders(DEFAULT_PROVIDERS)
      }

      const { data, error: settingsErr } = await supabase
        .from('configs')
        .select('key, value')
        .in('key', ['suggestion_model_id', 'default_chat_model_id'])
      
      if (!settingsErr && data) {
        ;(data as any[]).forEach((item: any) => {
          if (item.key === 'suggestion_model_id') {
            setSuggestionModelId(item.value)
            setPendingModelId(item.value)
          } else if (item.key === 'default_chat_model_id') {
            setDefaultChatModelId(item.value)
            setPendingDefaultChatModelId(item.value)
          }
        })
      }
    } catch (err: any) {
      logger.error('Failed to load settings:', err)
    }
  }

  const handleSaveSettings = async () => {
    if (!pendingModelId || pendingModelId === suggestionModelId) return
    
    try {
      const { error: saveErr } = await (supabase.from('configs') as any).upsert({ 
        key: 'suggestion_model_id', 
        value: pendingModelId,
        description: 'AI model used for character chat suggestions (the Lightbulb feature)'
      })
      if (saveErr) throw saveErr
      setSuggestionModelId(pendingModelId)
      modal.alert('建議模型設定已更新並生效。', { title: '儲存成功' })
    } catch (err: any) {
      modal.alert(`儲存設定失敗: ${err.message}`, { title: '系統錯誤' })
    }
  }

  const handleSaveDefaultChatModel = async () => {
    if (!pendingDefaultChatModelId || pendingDefaultChatModelId === defaultChatModelId) return
    
    try {
      const { error: saveErr } = await (supabase.from('configs') as any).upsert({ 
        key: 'default_chat_model_id', 
        value: pendingDefaultChatModelId,
        description: 'Default AI model used for new chat rooms'
      })
      if (saveErr) throw saveErr
      setDefaultChatModelId(pendingDefaultChatModelId)
      modal.alert('預設對話模型設定已更新並生效。', { title: '儲存成功' })
    } catch (err: any) {
      modal.alert(`儲存設定失敗: ${err.message}`, { title: '系統錯誤' })
    }
  }

  const saveProviders = async (newProviders: any[]) => {
    try {
      // 1. Get existing keys in database
      const { data: existing } = await (supabase.from('providers') as any).select('key')
      const existingKeys = ((existing || []) as any[]).map(p => p.key)
      const newKeys = newProviders.map(p => p.key)
      
      // 2. Find keys to delete
      const keysToDelete = existingKeys.filter(k => !newKeys.includes(k))
      if (keysToDelete.length > 0) {
        const { error: delErr } = await (supabase.from('providers') as any).delete().in('key', keysToDelete)
        if (delErr) throw delErr
      }
      
      // 3. Upsert new/updated providers
      const { error: upsertErr } = await (supabase.from('providers') as any).upsert(
        newProviders.map(p => ({
          key: p.key,
          name: p.name,
          base_url: p.base_url,
          api_key_name: p.api_key_name
        })),
        { onConflict: 'key' }
      )
      if (upsertErr) throw upsertErr
      
      setProviders(newProviders)
      return true
    } catch (err: any) {
      modal.alert(`儲存供應商失敗: ${err.message}`, { title: '系統錯誤' })
      return false
    }
  }

  const toggleUserActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error: updateErr } = await (supabase
        .from('profiles') as any)
        .update({ is_active: !currentStatus })
        .eq('id', id)
      
      if (updateErr) throw updateErr
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p))
    } catch (err: any) {
      logger.error('Admin error:', err)
      modal.alert(`更新失敗: ${err.message}`, { title: '系統錯誤' })
    }
  }

  const toggleModelActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error: updateErr } = await (supabase
        .from('models') as any)
        .update({ is_active: !currentStatus })
        .eq('id', id)
      
      if (updateErr) throw updateErr
      setModels(prev => prev.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m))
    } catch (err: any) {
      logger.error('Admin error:', err)
      modal.alert(`更新失敗: ${err.message}`, { title: '系統錯誤' })
    }
  }

  // Invite Codes management functions
  const loadInviteCodes = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: err } = await (supabase
        .from('invite_codes') as any)
        .select('*')
        .order('created_at', { ascending: false })
      if (err) throw err
      setInviteCodes(data || [])
    } catch (err: any) {
      logger.error('Failed to load invite codes:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const createInviteCode = async (payload: { code: string, max_uses: number, expires_at: string | null }) => {
    try {
      const { data, error: err } = await (supabase
        .from('invite_codes') as any)
        .insert({
          code: payload.code.trim(),
          max_uses: payload.max_uses,
          expires_at: payload.expires_at ? new Date(payload.expires_at).toISOString() : null,
          uses_count: 0,
          is_active: true
        })
        .select()
        .single()
      if (err) throw err
      setInviteCodes(prev => [data, ...prev])
      return true
    } catch (err: any) {
      modal.alert(`建立邀請碼失敗: ${err.message}`, { title: '系統錯誤' })
      return false
    }
  }

  const toggleInviteCodeActive = async (code: string, currentStatus: boolean) => {
    try {
      const { error: err } = await (supabase
        .from('invite_codes') as any)
        .update({ is_active: !currentStatus })
        .eq('code', code)
      if (err) throw err
      setInviteCodes(prev => prev.map(c => c.code === code ? { ...c, is_active: !currentStatus } : c))
    } catch (err: any) {
      modal.alert(`更新狀態失敗: ${err.message}`, { title: '系統錯誤' })
    }
  }

  const deleteInviteCode = async (code: string) => {
    modal.confirm(`確定要刪除邀請碼「${code}」嗎？`, {
      title: '刪除確認',
      confirmText: '確定刪除',
      destructive: true,
      onConfirm: async () => {
        try {
          const { error: err } = await (supabase
            .from('invite_codes') as any)
            .delete()
            .eq('code', code)
          if (err) throw err
          setInviteCodes(prev => prev.filter(c => c.code !== code))
        } catch (err: any) {
          modal.alert(`刪除失敗: ${err.message}`, { title: '系統錯誤' })
        }
      }
    })
  }

  const deleteModel = async (id: string) => {
    modal.confirm('確定要刪除此模型嗎？', {
      title: '刪除確認',
      confirmText: '確定刪除',
      destructive: true,
      onConfirm: async () => {
        try {
          const { error: deleteErr } = await supabase.from('models').delete().eq('id', id)
          if (deleteErr) throw deleteErr
          setModels(prev => prev.filter(m => m.id !== id))
        } catch (err: any) {
          modal.alert(`刪除失敗: ${err.message}`, { title: '系統錯誤' })
        }
      }
    })
  }

  const saveModel = async () => {
    try {
      const toTitleCase = (str: string) => {
        if (!str) return ''
        return str.trim().split(' ').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ')
      }

      const tagsArray = typeof editForm.tags === 'string'
        ? (editForm.tags as string).split(',').map(t => t.trim()).filter(Boolean)
        : (editForm.tags ?? [])

      const formattedName = toTitleCase(editForm.name || '')
      const formattedCategory = toTitleCase(editForm.category || '')

      const safePayload = {
        name:        formattedName,
        provider:    editForm.provider    ?? 'google',
        model_id:    editForm.model_id    ?? '',
        description: editForm.description ?? '',
        category:    formattedCategory,
        tags:        tagsArray,
        is_active:   editForm.is_active   ?? true,
        icon_url:    editForm.icon_url    ?? '',
      }

      if (isEditingModel === 'new') {
        const { data, error: insertErr } = await (supabase
          .from('models') as any)
          .insert(safePayload)
          .select()
          .single()
        
        if (insertErr) throw insertErr
        setModels(prev => [data as Model, ...prev])
      } else {
        const { error: updateErr } = await (supabase
          .from('models') as any)
          .update(safePayload)
          .eq('id', isEditingModel!)
        
        if (updateErr) throw updateErr
        setModels(prev => prev.map(m => m.id === isEditingModel ? { ...m, ...safePayload } : m))
      }
      setIsEditingModel(null)
    } catch (err: any) {
      modal.alert(`儲存失敗: ${err.message}`, { title: '系統錯誤' })
    }
  }

  return {
    isAdmin,
    activeTab,
    setActiveTab,
    profiles,
    userFilter,
    setUserFilter,
    models,
    modelSearch,
    setModelSearch,
    providerFilter,
    setProviderFilter,
    categoryFilter,
    setCategoryFilter,
    showProviderFilterDropdown,
    setShowProviderFilterDropdown,
    showCategoryFilterDropdown,
    setShowCategoryFilterDropdown,
    isEditingModel,
    setIsEditingModel,
    editForm,
    setEditForm,
    showCategoryDropdown,
    setShowCategoryDropdown,
    showProviderDropdown,
    setShowProviderDropdown,
    suggestionModelId,
    pendingModelId,
    setPendingModelId,
    defaultChatModelId,
    pendingDefaultChatModelId,
    setPendingDefaultChatModelId,
    isLoading,
    error,
    toggleUserActive,
    toggleModelActive,
    deleteModel,
    saveModel,
    handleSaveSettings,
    handleSaveDefaultChatModel,
    providers,
    saveProviders,
    inviteCodes,
    loadInviteCodes,
    createInviteCode,
    toggleInviteCodeActive,
    deleteInviteCode
  }
}
