import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { 
  Shield, CheckCircle, XCircle, Loader2, Users, 
  Database, Plus, Trash2, Edit, Save, X, ChevronDown, Settings
} from 'lucide-react'
import type { Profile, Model } from '@/types'
import { cn } from '@/lib/utils'
import { useModalStore } from '@/stores/modalStore'
import { logger } from '@/lib/logger'


export default function AdminPage() {
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
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
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
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
      const { data, error } = await supabase.from('configs').select('key, value').in('key', ['suggestion_model_id', 'default_chat_model_id'])
      if (!error && data) {
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
      const { error } = await (supabase.from('configs') as any).upsert({ 
        key: 'suggestion_model_id', 
        value: pendingModelId,
        description: 'AI model used for character chat suggestions (the Lightbulb feature)'
      })
      if (error) throw error
      setSuggestionModelId(pendingModelId)
      modal.alert('建議模型設定已更新並生效。', { title: '儲存成功' })
    } catch (err: any) {
      modal.alert(`儲存設定失敗: ${err.message}`, { title: '系統錯誤' })
    }
  }

  const handleSaveDefaultChatModel = async () => {
    if (!pendingDefaultChatModelId || pendingDefaultChatModelId === defaultChatModelId) return
    
    try {
      const { error } = await (supabase.from('configs') as any).upsert({ 
        key: 'default_chat_model_id', 
        value: pendingDefaultChatModelId,
        description: 'Default AI model used for new chat rooms'
      })
      if (error) throw error
      setDefaultChatModelId(pendingDefaultChatModelId)
      modal.alert('預設對話模型設定已更新並生效。', { title: '儲存成功' })
    } catch (err: any) {
      modal.alert(`儲存設定失敗: ${err.message}`, { title: '系統錯誤' })
    }
  }

  const toggleUserActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase
        .from('profiles') as any)
        .update({ is_active: !currentStatus })
        .eq('id', id)
      
      if (error) throw error
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p))
    } catch (err: any) {
      logger.error('Admin error:', err)
      modal.alert(`更新失敗: ${err.message}`, { title: '系統錯誤' })
    }
  }

  const toggleModelActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase
        .from('models') as any)
        .update({ is_active: !currentStatus })
        .eq('id', id)
      
      if (error) throw error
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
          const { error } = await supabase.from('models').delete().eq('id', id)
          if (error) throw error
          setModels(prev => prev.filter(m => m.id !== id))
        } catch (err: any) {
          modal.alert(`刪除失敗: ${err.message}`, { title: '系統錯誤' })
        }
      }
    })
  }

  const saveModel = async () => {
    try {
      // Formatter function: Capitalize first letter (Title Case)
      const toTitleCase = (str: string) => {
        if (!str) return ''
        return str.trim().split(' ').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ')
      }

      // Clean up tags
      const tagsArray = typeof editForm.tags === 'string'
        ? (editForm.tags as string).split(',').map(t => t.trim()).filter(Boolean)
        : (editForm.tags ?? [])

      // Format name and category
      const formattedName = toTitleCase(editForm.name || '')
      const formattedCategory = toTitleCase(editForm.category || '')

      // Handle api_key_name: convert to uppercase and append _API_KEY if missing
      let apiKeyName = (editForm.api_key_name || '').toUpperCase().trim()
      if (apiKeyName && !apiKeyName.endsWith('_API_KEY')) {
        apiKeyName = `${apiKeyName}_API_KEY`
      }

      // [Security H-03] Explicit whitelist — never spread editForm directly.
      // This prevents Mass Assignment: id, created_at, updated_at etc. are excluded.
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
        // Explicitly excluded: id, created_at, updated_at
      }

      if (isEditingModel === 'new') {
        const { data, error } = await (supabase
          .from('models') as any)
          .insert(safePayload)
          .select()
          .single()
        if (error) throw error
        setModels(prev => [data as Model, ...prev])
      } else {
        const { error } = await (supabase
          .from('models') as any)
          .update(safePayload)
          .eq('id', isEditingModel!)
        if (error) throw error
        setModels(prev => prev.map(m => m.id === isEditingModel ? { ...m, ...safePayload } : m))
      }
      setIsEditingModel(null)
    } catch (err: any) {
      modal.alert(`儲存失敗: ${err.message}`, { title: '系統錯誤' })
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-dvh relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-500/5 blur-[120px] pointer-events-none" />
        <div className="relative z-10 text-center space-y-4">
          <div className="w-20 h-20 rounded-[28px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto shadow-lg">
            <Shield className="w-10 h-10 text-red-500/70" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">權限不足</h2>
          <p className="text-muted-foreground text-sm max-w-xs">您不是管理員，無法存取此頁面。</p>
          <a href="/" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-muted border border-border text-sm font-bold hover:bg-muted/80 transition-all">
            返回大廳
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">System Admin</h1>
            <p className="text-[11px] text-muted-foreground/50 font-medium uppercase tracking-widest mt-0.5">Administration Panel</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 shadow-inner">
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === 'users' ? "bg-white/10 text-white shadow-lg border border-white/10" : "text-white/40 hover:text-white/80"
            )}
          >
            <Users className="w-4 h-4" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === 'models' ? "bg-white/10 text-white shadow-lg border border-white/10" : "text-white/40 hover:text-white/80"
            )}
          >
            <Database className="w-4 h-4" />
            Models
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
              activeTab === 'settings' ? "bg-white/10 text-white shadow-lg border border-white/10" : "text-white/40 hover:text-white/80"
            )}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}

        {isLoading && !isEditingModel ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeTab === 'users' ? (
          <div className="space-y-6">
            {/* Section header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[24px] bg-white/[0.03] border border-white/5">
              <div>
                <h2 className="text-lg font-black flex items-center gap-2">
                  使用者審核
                  {profiles.filter(p => !p.is_active).length > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-lg shadow-red-500/20">
                      {profiles.filter(p => !p.is_active).length} 待審核
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5 font-medium">管理平台使用者帳號審核與狀態控制</p>
              </div>

              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start sm:self-auto overflow-x-auto print:hidden">
                {[
                  { id: 'all', label: '全部', icon: Users },
                  { id: 'active', label: '已啟用', icon: CheckCircle },
                  { id: 'inactive', label: '未啟用', icon: XCircle }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setUserFilter(f.id as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                      userFilter === f.id 
                        ? "bg-white/10 text-white shadow-sm border border-white/10" 
                        : "text-white/40 hover:text-white/60 hover:bg-white/[0.02]"
                    )}
                  >
                    <f.icon className="w-3.5 h-3.5" />
                    {f.label}
                    <span className="opacity-40 ml-0.5">
                      ({profiles.filter(p => {
                        if (f.id === 'active') return p.is_active
                        if (f.id === 'inactive') return !p.is_active
                        return true
                      }).length})
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="md:glass-md md:rounded-3xl overflow-hidden md:shadow-2xl">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/[0.05]">
                      <th className="p-5 text-[11px] font-black text-white/50 uppercase tracking-widest">User</th>
                      <th className="p-5 text-[11px] font-black text-white/50 uppercase tracking-widest">Joined</th>
                      <th className="p-5 text-center text-[11px] font-black text-white/50 uppercase tracking-widest">Status</th>
                      <th className="p-5 text-right text-[11px] font-black text-white/50 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {profiles
                      .filter(p => {
                        if (userFilter === 'active') return p.is_active
                        if (userFilter === 'inactive') return !p.is_active
                        return true
                      })
                      .map(profile => (
                      <tr key={profile.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-5">
                          <div className="flex items-center gap-4">
                            <img 
                              src={profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + profile.username} 
                              alt={profile.username}
                              className="w-11 h-11 rounded-full bg-white/5 object-cover ring-1 ring-white/10"
                            />
                            <div>
                              <p className="font-bold text-[15px] text-white/90">{profile.username}</p>
                              <p className="text-[10px] text-white/20 mt-0.5 tracking-widest font-mono uppercase">
                                ID: {profile.id.split('-')[0]}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-center">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            profile.is_active 
                              ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                              : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                          }`}>
                            {profile.is_active ? '已啟用' : '待審核'}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => toggleUserActive(profile.id, profile.is_active)}
                            className={cn(
                              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all outline-none",
                              profile.is_active
                                ? "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                                : "bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg hover:shadow-green-500/20"
                            )}
                          >
                            {profile.is_active ? (
                              <><XCircle className="w-4 h-4" /> 停用帳號</>
                            ) : (
                              <><CheckCircle className="w-4 h-4" /> 核准啟用</>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards for Users */}
              <div className="flex flex-col gap-4 md:hidden">
                {profiles
                  .filter(p => {
                    if (userFilter === 'active') return p.is_active
                    if (userFilter === 'inactive') return !p.is_active
                    return true
                  })
                  .map(profile => (
                    <div key={profile.id} className="glass-md p-5 rounded-[28px] border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + profile.username} 
                            alt={profile.username}
                            className="w-12 h-12 rounded-full bg-white/5 object-cover ring-1 ring-white/10"
                          />
                          <div>
                            <p className="font-bold text-[16px] text-white/90 leading-tight">{profile.username}</p>
                            <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono mt-1">
                              ID: {profile.id.split('-')[0]}
                            </p>
                          </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          profile.is_active 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                        }`}>
                          {profile.is_active ? '已啟用' : '待審核'}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <span className="text-[11px] text-white/20 font-medium">加入: {new Date(profile.created_at).toLocaleDateString()}</span>
                        <button
                          onClick={() => toggleUserActive(profile.id, profile.is_active)}
                          className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            profile.is_active
                              ? "bg-red-500/10 text-red-500 border border-red-500/20"
                              : "bg-green-500 text-white shadow-md shadow-green-500/20"
                          )}
                        >
                          {profile.is_active ? (
                            <><XCircle className="w-4 h-4" /> 停用</>
                          ) : (
                            <><CheckCircle className="w-4 h-4" /> 啟用</>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'models' ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black whitespace-nowrap">AI 模型列表</h2>
                  <p className="text-[11px] text-muted-foreground/50 mt-0.5 font-medium">管理可用的 AI 對話模型</p>
                </div>
                <button
                  onClick={() => {
                    setEditForm({ 
                      name: '', 
                      provider: 'google', 
                      model_id: '', 
                      category: '', 
                      is_active: true,
                      api_key_name: '',
                      base_url: '',
                      icon_url: '',
                      tags: [],
                      description: ''
                    })
                    setIsEditingModel('new')
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:brightness-110 active:scale-[0.98] cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, hsl(267, 46%, 35%), hsl(244, 52%, 31%))' }}
                >
                  <Plus className="w-4 h-4" />
                  Add Model
                </button>
              </div>

              {/* Advanced Filter Row */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 rounded-[28px] bg-white/[0.05] border border-white/8 relative">
                {/* Search */}
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    placeholder="搜尋模型名稱或 ID..."
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
                  />
                  {modelSearch && (
                    <button onClick={() => setModelSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Provider Filter */}
                  <div className="flex items-center gap-2 flex-1 sm:flex-none">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider whitespace-nowrap hidden sm:inline">供應商:</span>
                    <div className="relative flex-1 sm:flex-none">
                      <button
                        onClick={() => setShowProviderFilterDropdown(!showProviderFilterDropdown)}
                        onBlur={() => setTimeout(() => setShowProviderFilterDropdown(false), 200)}
                        className="w-full sm:min-w-[120px] bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white flex items-center justify-between hover:border-white/20 transition-all"
                      >
                        <span className="capitalize">{providerFilter === 'all' ? '全部供應商' : providerFilter}</span>
                        <ChevronDown className={cn("w-3.5 h-3.5 text-white/20 transition-transform ml-2", showProviderFilterDropdown && "rotate-180")} />
                      </button>
                      
                      {showProviderFilterDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#111318] border border-white/10 rounded-2xl shadow-2xl py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors flex items-center justify-between"
                            onClick={() => { setProviderFilter('all'); setShowProviderFilterDropdown(false); }}
                          >
                            <span>全部</span>
                            {providerFilter === 'all' && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                          </button>
                          {Array.from(new Set(models.map(m => m.provider))).sort().map(p => (
                            <button
                              key={p}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors flex items-center justify-between"
                              onClick={() => { setProviderFilter(p); setShowProviderFilterDropdown(false); }}
                            >
                              <span className="capitalize">{p}</span>
                              {providerFilter === p && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div className="flex items-center gap-2 flex-1 sm:flex-none">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider whitespace-nowrap hidden sm:inline">分類:</span>
                    <div className="relative flex-1 sm:flex-none">
                      <button
                        onClick={() => setShowCategoryFilterDropdown(!showCategoryFilterDropdown)}
                        onBlur={() => setTimeout(() => setShowCategoryFilterDropdown(false), 200)}
                        className="w-full sm:min-w-[120px] bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white flex items-center justify-between hover:border-white/20 transition-all"
                      >
                        <span>{categoryFilter === 'all' ? '全部分類' : categoryFilter}</span>
                        <ChevronDown className={cn("w-3.5 h-3.5 text-white/20 transition-transform ml-2", showCategoryFilterDropdown && "rotate-180")} />
                      </button>
                      
                      {showCategoryFilterDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#111318] border border-white/10 rounded-2xl shadow-2xl py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors flex items-center justify-between"
                            onClick={() => { setCategoryFilter('all'); setShowCategoryFilterDropdown(false); }}
                          >
                            <span>全部</span>
                            {categoryFilter === 'all' && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                          </button>
                          {Array.from(new Set(models.map(m => m.category))).sort().map(c => (
                            <button
                              key={c}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors flex items-center justify-between"
                              onClick={() => { setCategoryFilter(c); setShowCategoryFilterDropdown(false); }}
                            >
                              <span>{c}</span>
                              {categoryFilter === c && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:glass-md md:rounded-3xl overflow-hidden md:shadow-2xl">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/[0.05]">
                      <th className="p-5 text-xs font-black text-white/50 uppercase tracking-widest">Provider / Name</th>
                      <th className="p-5 text-xs font-black text-white/50 uppercase tracking-widest">Model ID</th>
                      <th className="p-5 text-xs font-black text-white/50 uppercase tracking-widest">Categories</th>
                      <th className="p-5 text-center text-xs font-black text-white/50 uppercase tracking-widest">Status</th>
                      <th className="p-5 text-right text-xs font-black text-white/50 uppercase tracking-widest">Options</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {models
                      .filter(m => {
                        // Provider Filter
                        const matchProvider = providerFilter === 'all' || m.provider === providerFilter;
                        // Category Filter
                        const matchCategory = categoryFilter === 'all' || m.category === categoryFilter;
                        // Search Filter (Name or ID)
                        const searchLower = modelSearch.toLowerCase();
                        const matchSearch = !modelSearch || 
                          m.name.toLowerCase().includes(searchLower) || 
                          m.model_id.toLowerCase().includes(searchLower);
                        
                        return matchProvider && matchCategory && matchSearch;
                      })
                      .map(m => (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {m.icon_url ? (
                              <img src={m.icon_url} className="w-8 h-8 rounded-lg object-cover" alt="" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                                <Database className="w-4 h-4 opacity-40" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-sm">{m.name}</p>
                              <p className="text-xs text-muted-foreground uppercase">{m.provider}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs text-muted-foreground">
                          {m.model_id}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] uppercase font-bold border border-primary/20">
                              {m.category}
                            </span>
                            {m.tags && m.tags.map((tag, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground border border-border">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleModelActive(m.id, m.is_active)}
                            className={cn(
                              "w-10 h-6 rounded-full relative transition-colors duration-200",
                              m.is_active ? "bg-green-500" : "bg-muted border border-border"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm",
                              m.is_active ? "translate-x-4" : "translate-x-0"
                            )} />
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditForm({
                                  ...m,
                                  tags: m.tags || []
                                })
                                setIsEditingModel(m.id)
                              }}
                              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteModel(m.id)}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards for Models */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {models
                  .filter(m => {
                    const matchProvider = providerFilter === 'all' || m.provider === providerFilter;
                    const matchCategory = categoryFilter === 'all' || m.category === categoryFilter;
                    const searchLower = modelSearch.toLowerCase();
                    const matchSearch = !modelSearch || 
                      m.name.toLowerCase().includes(searchLower) || 
                      m.model_id.toLowerCase().includes(searchLower);
                    return matchProvider && matchCategory && matchSearch;
                  })
                  .map(m => (
                    <div key={m.id} className="glass-md p-5 rounded-[28px] border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {m.icon_url ? (
                            <img src={m.icon_url} className="w-10 h-10 rounded-xl object-cover" alt="" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                              <Database className="w-5 h-5 opacity-40" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-[15px] truncate">{m.name}</p>
                            <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono truncate block">{m.provider}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleModelActive(m.id, m.is_active)}
                          className={cn(
                            "w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0",
                            m.is_active ? "bg-green-500" : "bg-muted border border-border"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm",
                            m.is_active ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                           <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] uppercase font-black border border-primary/20">
                              {m.category}
                            </span>
                            {m.tags && m.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-lg bg-muted/50 text-[10px] font-bold text-muted-foreground border border-border">
                                {tag}
                              </span>
                            ))}
                        </div>
                        <p className="text-[10px] text-white/20 font-mono pl-1 uppercase tracking-tighter truncate">ID: {m.model_id}</p>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => {
                            setEditForm({ ...m, tags: m.tags || [] })
                            setIsEditingModel(m.id)
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 font-bold text-sm text-white/80 hover:bg-white/10"
                        >
                          <Edit className="w-4 h-4" /> 編輯
                        </button>
                        <button
                          onClick={() => deleteModel(m.id)}
                          className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                系統全域設定
              </h2>
              <p className="text-[11px] text-muted-foreground/50 mt-1 font-medium">配置全站 AI 設定與預設行為</p>
            </div>
            
            <div className="md:glass-md p-6 rounded-[28px] border border-white/5 space-y-6 max-w-2xl">
              <div className="space-y-4 pb-6 border-b border-white/5 pl-4 border-l-2 border-l-primary/40">
                <div>
                  <h3 className="text-sm font-black text-white/90">【聊天室首推】預設對話模型</h3>
                  <p className="text-xs text-white/50 leading-relaxed mt-1.5">
                    選擇當使用者開啟**新聊天室**時，系統預設帶入的 AI 說話模型。若使用者後續自行切換，該聊天室將以使用者的選擇為主。
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:border-primary/50 transition-all font-mono"
                      value={pendingDefaultChatModelId || ''}
                      onChange={(e) => setPendingDefaultChatModelId(e.target.value)}
                    >
                      <option value="" disabled className="bg-black">-- 選擇一個預設模型 --</option>
                      {models.map(m => (
                        <option key={m.id} value={m.model_id} className="bg-gray-900 border-b border-gray-800 py-2">
                          {m.name} ({m.model_id})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  </div>
                  
                  <button
                    onClick={handleSaveDefaultChatModel}
                    disabled={!pendingDefaultChatModelId || pendingDefaultChatModelId === defaultChatModelId}
                    className="shrink-0 px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    儲存變更
                  </button>
                </div>
                {pendingDefaultChatModelId === defaultChatModelId && defaultChatModelId && (
                   <p className="text-[11px] text-green-500 font-medium flex items-center gap-1.5 pt-1">
                     <CheckCircle className="w-3.5 h-3.5" /> 目前已套用此預設模型
                   </p>
                )}
              </div>

              <div className="space-y-4 pl-4 border-l-2 border-l-blue-400/40">
                <div>
                  <h3 className="text-sm font-black text-white/90">【聊天室燈泡】AI 建議模型</h3>
                  <p className="text-xs text-white/50 leading-relaxed mt-1.5">
                    選擇當使用者點擊聊天室「燈泡」時，負責產生三個劇情建議的模型。建議選擇速度快、成本低的模型（如 Flash 或是 Mini）。
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:border-primary/50 transition-all font-mono"
                      value={pendingModelId || ''}
                      onChange={(e) => setPendingModelId(e.target.value)}
                    >
                      <option value="" disabled className="bg-black">-- 選擇一個模型 --</option>
                      {models.map(m => (
                        <option key={m.id} value={m.model_id} className="bg-gray-900 border-b border-gray-800 py-2">
                          {m.name} ({m.model_id})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  </div>
                  
                  <button
                    onClick={handleSaveSettings}
                    disabled={!pendingModelId || pendingModelId === suggestionModelId}
                    className="shrink-0 px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    儲存變更
                  </button>
                </div>
                {pendingModelId === suggestionModelId && suggestionModelId && (
                   <p className="text-[11px] text-green-500 font-medium flex items-center gap-1.5 pt-1">
                     <CheckCircle className="w-3.5 h-3.5" /> 目前已套用此模型
                   </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Model Overlay */}
      {isEditingModel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-lg w-full max-w-2xl rounded-[32px] overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
            <div className="p-5 md:p-8 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight">{isEditingModel === 'new' ? 'Create Model' : 'Edit Model'}</h3>
              <button 
                onClick={() => setIsEditingModel(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            
            <div className="p-5 md:p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Row 1: Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground ml-1">名稱 (顯示用)</label>
                  <input
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm"
                    value={editForm.name || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例如: Gemini 1.5 Pro"
                  />
                </div>
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-muted-foreground ml-1">供應商</label>
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                      onBlur={() => {
                        setTimeout(() => setShowProviderDropdown(false), 200)
                      }}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm flex items-center justify-between hover:border-white/20 transition-all text-left"
                    >
                      <span className="capitalize">{editForm.provider || 'google'}</span>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showProviderDropdown && "rotate-180")} />
                    </button>
                    
                    {showProviderDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-[999] bg-[#111318] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {[
                          { value: 'google', label: 'Google (Official)' },
                          { value: 'openai', label: 'OpenAI (Official)' },
                          { value: 'openrouter', label: 'OpenRouter' },
                          { value: 'anthropic', label: 'Anthropic' },
                          { value: 'nvidia', label: 'NVIDIA' },
                          { value: 'other', label: 'Other' }
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors flex items-center justify-between"
                            onClick={() => {
                              setEditForm(prev => ({ ...prev, provider: opt.value }))
                              setShowProviderDropdown(false)
                            }}
                          >
                            <span>{opt.label}</span>
                            {editForm.provider === opt.value && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Model ID & Key Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground ml-1">模型 ID (API 識別項)</label>
                  <input
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm font-mono"
                    value={editForm.model_id || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, model_id: e.target.value }))}
                    placeholder="例如: gemini-1.5-pro"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground ml-1">API Key 變數名稱 (Secrets)</label>
                  <input
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm font-mono"
                    value={editForm.api_key_name || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, api_key_name: e.target.value.toUpperCase() }))}
                    placeholder="例如: GEMINI"
                  />
                </div>
              </div>

              {/* Row 3: Base URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground ml-1">客製化 Base URL (可留空)</label>
                <input
                  className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm font-mono"
                  value={editForm.base_url || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, base_url: e.target.value }))}
                  placeholder="例如: https://your-proxy.com/v1"
                />
              </div>

              {/* Row 4: Category & Icon */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-muted-foreground ml-1">大分類 (如: Gemini, GPT)</label>
                  <div className="relative group">
                    <input
                      autoComplete="off"
                      className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm pr-10 focus:ring-2 focus:ring-primary/20 transition-all"
                      value={editForm.category || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                      onFocus={() => setShowCategoryDropdown(true)}
                      onBlur={() => {
                        // Delay hide to allow clicks on options
                        setTimeout(() => setShowCategoryDropdown(false), 200)
                      }}
                      placeholder="例如: Gemini"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                    >
                      <ChevronDown className={cn("w-4 h-4 transition-transform", showCategoryDropdown && "rotate-180")} />
                    </button>

                    {showCategoryDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 z-[999] bg-[#111318] border border-primary/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                          {Array.from(new Set(models.map(m => m.category)))
                            .filter(cat => cat && cat.toLowerCase().includes((editForm.category || '').toLowerCase()))
                            .length > 0 ? (
                              Array.from(new Set(models.map(m => m.category)))
                                .filter(cat => cat && cat.toLowerCase().includes((editForm.category || '').toLowerCase()))
                                .map(cat => (
                                  <button
                                    key={cat}
                                    type="button"
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors flex items-center justify-between"
                                    onClick={() => {
                                      setEditForm(prev => ({ ...prev, category: cat }))
                                      setShowCategoryDropdown(false)
                                    }}
                                  >
                                    <span>{cat}</span>
                                    {editForm.category === cat && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                                  </button>
                                ))
                            ) : (
                              <div className="px-4 py-2 text-xs text-muted-foreground italic flex items-center gap-2">
                                <Plus className="w-3 h-3" />
                                新增此分類: "{editForm.category}"
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground ml-1">圖示 URL (可不填)</label>
                  <input
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm"
                    value={editForm.icon_url || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, icon_url: e.target.value }))}
                    placeholder="圖片網址..."
                  />
                </div>
              </div>

              {/* Row 5: Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground ml-1">標籤 (以逗號分隔)</label>
                <input
                  className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm"
                  value={Array.isArray(editForm.tags) ? editForm.tags.join(', ') : editForm.tags || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, tags: e.target.value as any }))}
                  placeholder="例如: Free, Fast, Stable"
                />
              </div>

              {/* Row 6: Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground ml-1">模型介紹 (顯示在切換選單中)</label>
                <textarea
                  className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm min-h-[80px]"
                  value={editForm.description || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="簡單介紹模型的特性..."
                />
              </div>
            </div>

            <div className="px-6 py-5 border-t border-border bg-muted/30 flex gap-3">
              <button
                onClick={() => setIsEditingModel(null)}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-all"
              >
                取消
              </button>
              <button
                onClick={saveModel}
                className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                儲存設定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
