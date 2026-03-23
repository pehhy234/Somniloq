import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { 
  Shield, CheckCircle, XCircle, Loader2, Users, 
  Database, Plus, Trash2, Edit, Save, X 
} from 'lucide-react'
import type { Profile } from '@/types'
import { cn } from '@/lib/utils'

interface Model {
  id: string
  name: string
  description: string
  provider: string
  model_id: string
  category: string
  is_active: boolean
  api_key_name: string
  base_url: string
  icon_url: string
  tags: string[]
}

export default function AdminPage() {
  const { isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<'users' | 'models'>('users')
  
  // User Management State
  const [profiles, setProfiles] = useState<Profile[]>([])
  
  // Model Management State
  const [models, setModels] = useState<Model[]>([])
  const [isEditingModel, setIsEditingModel] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Model>>({})
  
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
      // Clean up tags
      const tagsArray = typeof editForm.tags === 'string' 
        ? (editForm.tags as string).split(',').map(t => t.trim()).filter(Boolean)
        : editForm.tags;

      const payload = { ...editForm, tags: tagsArray };

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
    <div className="max-w-6xl mx-auto py-8 px-4 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">系統管理介面</h1>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'users' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="w-4 h-4" />
            使用者管理
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'models' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Database className="w-4 h-4" />
            模型管理
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
            <h2 className="text-lg font-semibold flex items-center gap-2">
              使用者審核
              {profiles.filter(p => !p.is_active).length > 0 && (
                <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                  {profiles.filter(p => !p.is_active).length} 待審核
                </span>
              )}
            </h2>
            
            <div className="bg-muted/30 border border-border rounded-xl overflow-hidden glass">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="p-4 text-sm font-medium text-foreground">用戶名稱</th>
                      <th className="p-4 text-sm font-medium text-foreground">註冊時間</th>
                      <th className="p-4 text-center text-sm font-medium text-foreground">帳號狀態</th>
                      <th className="p-4 text-right text-sm font-medium text-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {profiles.map(profile => (
                      <tr key={profile.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + profile.username} 
                              alt={profile.username}
                              className="w-10 h-10 rounded-full bg-muted object-cover"
                            />
                            <div>
                              <p className="font-semibold text-sm">{profile.username}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 tracking-wider font-mono">
                                {profile.id.split('-')[0]}...
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">AI 模型列表</h2>
              <button
                onClick={() => {
                  setEditForm({ 
                    name: '', 
                    provider: 'google', 
                    model_id: '', 
                    category: 'All', 
                    is_active: true,
                    api_key_name: 'GEMINI_API_KEY',
                    base_url: '',
                    icon_url: '',
                    tags: [],
                    description: ''
                  })
                  setIsEditingModel('new')
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                <Plus className="w-4 h-4" />
                新增模型
              </button>
            </div>

            <div className="bg-muted/30 border border-border rounded-xl overflow-hidden glass">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="p-4 text-sm font-medium text-foreground">名稱 / 供應商</th>
                      <th className="p-4 text-sm font-medium text-foreground">模型 ID</th>
                      <th className="p-4 text-sm font-medium text-foreground">分類 / 標籤</th>
                      <th className="p-4 text-center text-sm font-medium text-foreground">狀態</th>
                      <th className="p-4 text-right text-sm font-medium text-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {models.map(m => (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border w-full max-w-2xl rounded-[28px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold">{isEditingModel === 'new' ? '新增模型' : '編輯模型'}</h3>
              <button onClick={() => setIsEditingModel(null)}><X className="w-5 h-5 opacity-60" /></button>
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
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground ml-1">供應商</label>
                  <select
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm"
                    value={editForm.provider || 'google'}
                    onChange={e => setEditForm(prev => ({ ...prev, provider: e.target.value }))}
                  >
                    <option value="google">Google (Official)</option>
                    <option value="openai">OpenAI (Official)</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
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
                    onChange={e => setEditForm(prev => ({ ...prev, api_key_name: e.target.value }))}
                    placeholder="例如: GEMINI_API_KEY"
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
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground ml-1">大分類 (如: Gemini, GPT)</label>
                  <input
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm"
                    value={editForm.category || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="例如: Gemini"
                  />
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
