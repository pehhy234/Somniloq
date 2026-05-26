import { Plus, Database, Edit, Trash2, ChevronDown, CheckCircle, X } from 'lucide-react'
import type { Model } from '@/types'
import { cn } from '@/lib/utils'

interface ModelManagementProps {
  models: Model[]
  modelSearch: string
  setModelSearch: (s: string) => void
  providerFilter: string
  setProviderFilter: (s: string) => void
  categoryFilter: string
  setCategoryFilter: (s: string) => void
  showProviderFilterDropdown: boolean
  setShowProviderFilterDropdown: (b: boolean) => void
  showCategoryFilterDropdown: boolean
  setShowCategoryFilterDropdown: (b: boolean) => void
  toggleModelActive: (id: string, currentStatus: boolean) => Promise<void>
  deleteModel: (id: string) => Promise<void>
  setIsEditingModel: (id: string | null) => void
  setEditForm: (form: Partial<Model>) => void
  onManageProviders?: () => void
}

export function ModelManagement({
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
  toggleModelActive,
  deleteModel,
  setIsEditingModel,
  setEditForm,
  onManageProviders
}: ModelManagementProps) {
  // Filter logic
  const filteredModels = models.filter(m => {
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
  });

  const providers = Array.from(new Set(models.map(m => m.provider))).sort();
  const categories = Array.from(new Set(models.map(m => m.category))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black whitespace-nowrap">AI 模型列表</h2>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5 font-medium">管理可用的 AI 對話模型</p>
          </div>
          <div className="flex items-center gap-2">
            {onManageProviders && (
              <button
                onClick={onManageProviders}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-muted border border-border text-foreground hover:bg-muted/80 font-bold text-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <Database className="w-4 h-4 text-primary" />
                管理供應商
              </button>
            )}
            <button
              onClick={() => {
                setEditForm({ 
                  name: '', 
                  provider: '', 
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
        </div>

        {/* Advanced Filter Row */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 rounded-[28px] bg-muted/50 border border-border relative">
          {/* Search */}
          <div className="flex-1 relative">
            <input 
              type="text"
              placeholder="搜尋模型名稱或 ID..."
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/40 text-foreground"
            />
            {modelSearch && (
              <button onClick={() => setModelSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Provider Filter */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap hidden sm:inline">供應商:</span>
              <div className="relative flex-1 sm:flex-none">
                <button
                  onClick={() => setShowProviderFilterDropdown(!showProviderFilterDropdown)}
                  onBlur={() => setTimeout(() => setShowProviderFilterDropdown(false), 200)}
                  className="w-full sm:min-w-[120px] bg-muted border border-border rounded-xl px-4 py-2 text-sm text-foreground flex items-center justify-between hover:border-primary/40 transition-all"
                >
                  <span className="capitalize">{providerFilter === 'all' ? '全部供應商' : providerFilter}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform ml-2", showProviderFilterDropdown && "rotate-180")} />
                </button>
                
                {showProviderFilterDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border border-border rounded-2xl shadow-2xl py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                      onClick={() => { setProviderFilter('all'); setShowProviderFilterDropdown(false); }}
                    >
                      <span>全部</span>
                      {providerFilter === 'all' && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                    </button>
                    {providers.map(p => (
                      <button
                        key={p}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between"
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
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap hidden sm:inline">分類:</span>
              <div className="relative flex-1 sm:flex-none">
                <button
                  onClick={() => setShowCategoryFilterDropdown(!showCategoryFilterDropdown)}
                  onBlur={() => setTimeout(() => setShowCategoryFilterDropdown(false), 200)}
                  className="w-full sm:min-w-[120px] bg-muted border border-border rounded-xl px-4 py-2 text-sm text-foreground flex items-center justify-between hover:border-primary/40 transition-all"
                >
                  <span>{categoryFilter === 'all' ? '全部分類' : categoryFilter}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform ml-2", showCategoryFilterDropdown && "rotate-180")} />
                </button>
                
                {showCategoryFilterDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border border-border rounded-2xl shadow-2xl py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                      onClick={() => { setCategoryFilter('all'); setShowCategoryFilterDropdown(false); }}
                    >
                      <span>全部</span>
                      {categoryFilter === 'all' && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                    </button>
                    {categories.map(c => (
                      <button
                        key={c}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between"
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
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest">Model Name</th>
                <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest">Model ID</th>
                <th className="p-5 text-xs font-black text-muted-foreground uppercase tracking-widest">Category & Tags</th>
                <th className="p-5 text-center text-xs font-black text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="p-5 text-right text-xs font-black text-muted-foreground uppercase tracking-widest">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredModels.map(m => (
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
                        <p className="font-bold text-sm text-foreground">{m.name}</p>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-mono text-muted-foreground border border-border uppercase mt-0.5 font-bold">
                          {m.provider}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs text-muted-foreground">
                    {m.model_id}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {m.category && (
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] uppercase font-bold border border-primary/20">
                          {m.category}
                        </span>
                      )}
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

        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredModels.map(m => (
            <div key={m.id} className="glass-md p-5 rounded-[28px] border border-border space-y-4">
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
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono truncate block">{m.provider}</span>
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
                <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-muted/50 border border-border">
                   <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] uppercase font-black border border-primary/20">
                      {m.category}
                    </span>
                    {m.tags && m.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-muted/50 text-[10px] font-bold text-muted-foreground border border-border">
                        {tag}
                      </span>
                    ))}
                </div>
                <p className="text-[10px] text-muted-foreground font-mono pl-1 uppercase tracking-tighter truncate">ID: {m.model_id}</p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => {
                    setEditForm({ ...m, tags: m.tags || [] })
                    setIsEditingModel(m.id)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted font-bold text-sm text-foreground hover:bg-muted/80 border border-border transition-colors"
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
  )
}
