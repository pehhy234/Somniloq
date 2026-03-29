import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { 
  Shield, CheckCircle, XCircle, Loader2, Users, 
  Database, Plus, Trash2, Edit, Save, X, ChevronDown
} from 'lucide-react'
import type { Profile, Model } from '@/types'
import { cn } from '@/lib/utils'


export default function AdminPage() {
  const { isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<'users' | 'models'>('users')
  
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
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    if (activeTab === 'users') {
      loadProfiles()
    } else {
      loadModels()
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
      console.error(err)
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
      console.error(err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUserActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus } as any)
        .eq('id', id)
      
      if (error) throw error
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p))
    } catch (err: any) {
      console.error(err)
      alert(`更新失敗: ${err.message}`)
    }
  }

  const toggleModelActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('models')
        .update({ is_active: !currentStatus } as any)
        .eq('id', id)
      
      if (error) throw error
      setModels(prev => prev.map(m => m.id === id ? { ...m, is_active: !currentStatus } : m))
    } catch (err: any) {
      console.error(err)
      alert(`更新失敗: ${err.message}`)
    }
  }

  const deleteModel = async (id: string) => {
    if (!confirm('確定要刪除此模型嗎？')) return
    try {
      const { error } = await supabase.from('models').delete().eq('id', id)
      if (error) throw error
      setModels(prev => prev.filter(m => m.id !== id))
    } catch (err: any) {
      alert(`刪除失敗: ${err.message}`)
    }
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
        : editForm.tags;

      // Format name and category
      const formattedName = toTitleCase(editForm.name || '');
      const formattedCategory = toTitleCase(editForm.category || '');

      // Handle api_key_name: convert to uppercase and append _API_KEY if missing
      let apiKeyName = (editForm.api_key_name || '').toUpperCase().trim();
      if (apiKeyName && !apiKeyName.endsWith('_API_KEY')) {
        apiKeyName = `${apiKeyName}_API_KEY`;
      }

      const payload = { 
        ...editForm, 
        name: formattedName,
        category: formattedCategory,
        tags: tagsArray, 
        api_key_name: apiKeyName 
      };

      if (isEditingModel === 'new') {
        const { data, error } = await supabase
          .from('models')
          .insert(payload as any)
          .select()
          .single()
        if (error) throw error
        setModels(prev => [data, ...prev])
      } else {
        const { error } = await supabase
          .from('models')
          .update(payload as any)
          .eq('id', isEditingModel)
        if (error) throw error
        setModels(prev => prev.map(m => m.id === isEditingModel ? { ...m, ...payload } : m))
      }
      setIsEditingModel(null)
    } catch (err: any) {
      alert(`儲存失敗: ${err.message}`)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-dvh">
        <Shield className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-bold">權限不足</h2>
        <p className="text-muted-foreground mt-2">您不是管理員，無法存取此頁面。</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">System Admin</h1>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                使用者審核
                {profiles.filter(p => !p.is_active).length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-lg shadow-red-500/20">
                    {profiles.filter(p => !p.is_active).length} 待審核
                  </span>
                )}
              </h2>

              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start sm:self-auto">
                {[
                  { id: 'all', label: '全部', icon: Users },
                  { id: 'active', label: '已啟用', icon: CheckCircle },
                  { id: 'inactive', label: '未啟用', icon: XCircle }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setUserFilter(f.id as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
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
            
            <div className="glass-md rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="p-5 text-[11px] font-bold text-white/30 uppercase tracking-widest">User</th>
                      <th className="p-5 text-[11px] font-bold text-white/30 uppercase tracking-widest">Joined</th>
                      <th className="p-5 text-center text-[11px] font-bold text-white/30 uppercase tracking-widest">Status</th>
                      <th className="p-5 text-right text-[11px] font-bold text-white/30 uppercase tracking-widest">Actions</th>
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
                            {profile.is_active ? '啟用中' : '審核中'}
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
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-lg font-semibold whitespace-nowrap">AI 模型列表</h2>
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
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white font-bold text-sm hover:brightness-110 transition-all shadow-xl shadow-primary/20"
                >
                  <Plus className="w-4 h-4" />
                  Add Model
                </button>
              </div>

              {/* Advanced Filter Row */}
              <div className="flex flex-wrap items-center gap-3 p-4 rounded-3xl bg-white/[0.02] border border-white/5 relative">
                {/* Search */}
                <div className="flex-1 min-w-[200px] relative">
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

                {/* Provider Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/30 uppercase tracking-wider whitespace-nowrap">供應商:</span>
                  <div className="relative">
                    <button
                      onClick={() => setShowProviderFilterDropdown(!showProviderFilterDropdown)}
                      onBlur={() => setTimeout(() => setShowProviderFilterDropdown(false), 200)}
                      className="min-w-[120px] bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white flex items-center justify-between hover:border-white/20 transition-all"
                    >
                      <span className="capitalize">{providerFilter === 'all' ? '全部' : providerFilter}</span>
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/30 uppercase tracking-wider whitespace-nowrap">分類:</span>
                  <div className="relative">
                    <button
                      onClick={() => setShowCategoryFilterDropdown(!showCategoryFilterDropdown)}
                      onBlur={() => setTimeout(() => setShowCategoryFilterDropdown(false), 200)}
                      className="min-w-[120px] bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white flex items-center justify-between hover:border-white/20 transition-all"
                    >
                      <span>{categoryFilter === 'all' ? '全部' : categoryFilter}</span>
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

            <div className="glass-md rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="p-5 text-xs font-bold text-white/30 uppercase tracking-widest">Provider / Name</th>
                      <th className="p-5 text-xs font-bold text-white/30 uppercase tracking-widest">Model ID</th>
                      <th className="p-5 text-xs font-bold text-white/30 uppercase tracking-widest">Categories</th>
                      <th className="p-5 text-center text-xs font-bold text-white/30 uppercase tracking-widest">Status</th>
                      <th className="p-5 text-right text-xs font-bold text-white/30 uppercase tracking-widest">Options</th>
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
            </div>
          </div>
        )}
      </div>

      {/* Edit Model Overlay */}
      {isEditingModel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-lg w-full max-w-2xl rounded-[32px] overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight">{isEditingModel === 'new' ? 'Create Model' : 'Edit Model'}</h3>
              <button 
                onClick={() => setIsEditingModel(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Row 1: Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground ml-1">名稱 (顯示用)</label>
                  <input
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm"
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
                      className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm flex items-center justify-between hover:border-white/20 transition-all text-left"
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground ml-1">模型 ID (API 識別項)</label>
                  <input
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm font-mono"
                    value={editForm.model_id || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, model_id: e.target.value }))}
                    placeholder="例如: gemini-1.5-pro"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground ml-1">API Key 變數名稱 (Secrets)</label>
                  <input
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm font-mono"
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
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm font-mono"
                  value={editForm.base_url || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, base_url: e.target.value }))}
                  placeholder="例如: https://your-proxy.com/v1"
                />
              </div>

              {/* Row 4: Category & Icon */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-muted-foreground ml-1">大分類 (如: Gemini, GPT)</label>
                  <div className="relative group">
                    <input
                      autoComplete="off"
                      className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm pr-10 focus:ring-2 focus:ring-primary/20 transition-all"
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
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm"
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
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm"
                  value={Array.isArray(editForm.tags) ? editForm.tags.join(', ') : editForm.tags || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, tags: e.target.value as any }))}
                  placeholder="例如: Free, Fast, Stable"
                />
              </div>

              {/* Row 6: Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground ml-1">模型介紹 (顯示在切換選單中)</label>
                <textarea
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm min-h-[80px]"
                  value={editForm.description || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="簡單介紹模型的特性..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/30 flex gap-3">
              <button
                onClick={() => setIsEditingModel(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-all"
              >
                取消
              </button>
              <button
                onClick={saveModel}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
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
