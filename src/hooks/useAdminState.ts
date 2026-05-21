import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Profile, Model } from '@/types'
import { useModalStore } from '@/stores/modalStore'
import { logger } from '@/lib/logger'

export function useAdminState() {
  const { isAdmin } = useAuth()
  const modal = useModalStore()
  
  const [activeTab, setActiveTab] = useState<'users' | 'models' | 'settings'>('users')
  
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

  useEffect(() => {
    if (!isAdmin) return
    if (activeTab === 'users') {
      loadProfiles()
    } else if (activeTab === 'models') {
      loadModels()
    } else if (activeTab === 'settings') {
      loadModels()
      loadSettings()
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

  const loadSettings = async () => {
    try {
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

      let apiKeyName = (editForm.api_key_name || '').toUpperCase().trim()
      if (apiKeyName && !apiKeyName.endsWith('_API_KEY')) {
        apiKeyName = `${apiKeyName}_API_KEY`
      }

      const safePayload = {
        name:        formattedName,
        provider:    editForm.provider    ?? 'google',
        model_id:    editForm.model_id    ?? '',
        description: editForm.description ?? '',
        category:    formattedCategory,
        tags:        tagsArray,
        is_active:   editForm.is_active   ?? true,
        api_key_name: apiKeyName,
        base_url:    editForm.base_url    ?? '',
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
    handleSaveDefaultChatModel
  }
}
