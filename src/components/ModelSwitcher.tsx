import { createPortal } from 'react-dom'
import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, X, Search, Zap, HelpCircle } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface Model {
  id: string
  name: string
  description: string
  model_id: string
  category: string
  tags: string[]
  icon_url?: string
}

export function ModelSwitcher({ 
  minimalist = false, 
  conversationId, 
  modelId, 
  onSelect 
}: { 
  minimalist?: boolean, 
  conversationId?: string, 
  modelId?: string,
  onSelect?: (id: string) => void
}) {
  const { 
    model: globalModelId, 
    conversationModels, 
    setModel, 
    setConversationModel, 
    contextCompression, 
    setContextCompression 
  } = useUIStore()
  
  const rawSelectedId = modelId || (conversationId && conversationModels[conversationId]) || globalModelId
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  // Fetch default chat model setting
  const { data: defaultConfig } = useQuery({
    queryKey: ['default_chat_model'],
    queryFn: async () => {
      const { data } = await supabase.from('configs').select('value').eq('key', 'default_chat_model_id').maybeSingle()
      return (data as any)?.value as string | undefined
    }
  })

  // Fetch models from Supabase
  const { data: models = [], isLoading } = useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('models')
        .select('*')
        .eq('is_active', true)
      if (error) throw error
      return data as Model[]
    }
  })

  const selectedModelId = useMemo(() => {
    if (models.length === 0) return rawSelectedId
    
    // Check if the currently requested model actually exists
    if (models.some(m => m.model_id === rawSelectedId)) {
      return rawSelectedId
    }
    
    // Fallback to database default if it exists
    if (defaultConfig && models.some(m => m.model_id === defaultConfig)) {
      return defaultConfig
    }
    
    // Ultimate fallback
    return models[0]?.model_id || rawSelectedId
  }, [rawSelectedId, models, defaultConfig])

  const [tempSelectedId, setTempSelectedId] = useState(selectedModelId)

  useEffect(() => {
    setTempSelectedId(selectedModelId)
  }, [selectedModelId])

  // Dynamically generate categories based on existing models
  const categories = useMemo(() => {
    const cats = new Set(['All'])
    models.forEach(m => {
      if (m.category) cats.add(m.category)
      // Optional: Add specific tags that we want to filter by, or all tags
      if (m.tags && Array.isArray(m.tags)) {
        m.tags.forEach(tag => cats.add(tag))
      }
    })
    return Array.from(cats)
  }, [models])

  // Filter models based on search and category
  const filteredModels = useMemo(() => {
    return models.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || 
                           m.description.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = activeCategory === 'All' || m.category === activeCategory || m.tags.includes(activeCategory)
      return matchesSearch && matchesCategory
    })
  }, [models, search, activeCategory])

  const currentModel = models.find(m => m.model_id === selectedModelId) || models[0]

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setTempSelectedId(selectedModelId)
    } else {
      document.body.style.overflow = ''
    }
  }, [open, selectedModelId])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 transition-all duration-300 text-white active:scale-95",
          minimalist 
            ? "px-2 py-1 text-[11px] font-extrabold hover:text-primary" 
            : "px-3.5 py-1.5 rounded-full bg-white/5 backdrop-blur-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 text-[12px] font-bold shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]"
        )}
      >
        <div className={cn("rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]", minimalist ? "w-1 h-1" : "w-1.5 h-1.5")} />
        <span className="uppercase tracking-wider md:hidden">{(currentModel?.name || 'Model').slice(0, 6)}</span>
        <span className="uppercase tracking-wider hidden md:block">{(currentModel?.name || 'Model').slice(0, 12)}</span>
        <ChevronDown className={cn("opacity-60", minimalist ? "w-3 h-3" : "w-3.5 h-3.5 ml-0.5")} />
      </button>

      {open && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setOpen(false)}
          />

          {/* Model Selection UI */}
          <div 
            className={cn(
              "fixed z-[1000] transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) flex flex-col",
              // Mobile: Bottom Sheet
              "left-0 right-0 bottom-0 bg-background/95 backdrop-blur-2xl rounded-t-[36px] border-t border-white/5 shadow-[0_-8px_40px_rgba(0,0,0,0.5)] max-h-[90dvh]",
              // Desktop: Centered Modal
              "md:left-1/2 md:right-auto md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-xl md:rounded-[36px] md:border md:border-white/10 md:shadow-[0_24px_60px_rgba(0,0,0,0.6)] md:bg-background/85 md:backdrop-blur-3xl md:max-h-[85vh] md:overflow-hidden",
              open ? "translate-y-0 opacity-100" : "translate-y-full md:-translate-y-[45%] opacity-0 md:scale-95 pointer-events-none"
            )}
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-0">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setOpen(false)} className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-extrabold tracking-tight text-center flex-1 pr-6 drop-shadow-sm">模型選擇</h2>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type="text"
                  placeholder="搜尋模型名稱或描述..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-muted/40 border border-border/50 rounded-2xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/40 focus:bg-muted/60 transition-all outline-none"
                />
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all active:scale-95",
                      activeCategory === cat 
                        ? "bg-primary/10 border-primary/30 text-primary shadow-sm shadow-primary/5" 
                        : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 pt-1 pb-4 space-y-4 no-scrollbar">
              
              {/* Settings Section (Context Compression only) */}
              <div className="px-4 py-3 rounded-[20px] bg-muted/20 border border-border/40 space-y-2 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold tracking-tight">自動上下文壓縮</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-primary/20 text-primary text-[8px] font-black uppercase tracking-wider">Beta</span>
                    <HelpCircle className="w-3 h-3 text-muted-foreground/40 hover:text-muted-foreground cursor-help transition-colors" />
                  </div>
                  <button 
                    onClick={() => setContextCompression(!contextCompression)}
                    className={cn(
                      "w-9 h-5 rounded-full relative transition-all duration-300 ring-offset-background focus:ring-2 focus:ring-primary/20",
                      contextCompression ? "bg-primary" : "bg-muted-foreground/20"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-lg transition-transform duration-300 cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                      contextCompression ? "translate-x-4" : "translate-x-0"
                    )} />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed font-medium">
                  開啟後，將自動壓縮歷史記錄，幫助 AI 專注於當前的核心對話。
                </p>
              </div>

              {/* Model List */}
              <div className="space-y-2.5 pb-2">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center p-12 space-y-3 opacity-40">
                    <Zap className="w-8 h-8 animate-pulse text-primary" />
                    <p className="text-xs font-bold uppercase tracking-widest">Loading Models...</p>
                  </div>
                ) : filteredModels.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground opacity-50">
                    <p className="text-sm font-medium">找不到符合條件的模型</p>
                  </div>
                ) : filteredModels.map((m) => {
                  const isActive = tempSelectedId === m.model_id
                  return (
                    <button
                      key={m.id}
                      onClick={() => setTempSelectedId(m.model_id)}
                      className={cn(
                        "w-full p-5 rounded-[24px] text-left transition-all duration-300 border relative overflow-hidden active:scale-[0.98]",
                        isActive 
                          ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20 shadow-[0_8px_24px_-4px_rgba(168,85,247,0.2)]" 
                          : "bg-muted/10 border-transparent hover:bg-muted/30 hover:border-white/5"
                      )}
                    >
                      <div className="flex gap-4">
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black shadow-inner shrink-0 border border-white/5",
                          m.category === 'DeepSeek' ? "bg-blue-500/10 text-blue-400" :
                          m.category === 'Gemini' ? "bg-primary/10 text-primary" :
                          m.category === 'Gpt' ? "bg-emerald-500/10 text-emerald-400" :
                          "bg-muted/20 text-muted-foreground"
                        )}>
                          {m.name.charAt(0)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-extrabold text-[16px] tracking-tight truncate">{m.name}</span>
                              <div className="flex gap-1 shrink-0">
                                {m.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 rounded-md bg-muted text-[8px] font-black text-muted-foreground uppercase tracking-tight border border-border/30">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />}
                          </div>

                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 font-medium leading-normal opacity-80 group-hover:opacity-100 transition-opacity">
                            {m.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Action Bar */}
            <div className="px-6 py-4 bg-background mt-auto border-t border-border/50 md:rounded-b-[32px] shrink-0">
               <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex flex-col focus:outline-none">
                     <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-0.5 mb-0.5">目前選中</span>
                     <span className="text-[15px] font-extrabold text-yellow-500 truncate tracking-tight">
                        {models.find(m => m.model_id === tempSelectedId)?.name || '請選擇模型'}
                     </span>
                  </div>
                  <button 
                    onClick={() => {
                        if (onSelect) {
                          onSelect(tempSelectedId)
                        } else if (conversationId) {
                          setConversationModel(conversationId, tempSelectedId)
                        } else {
                          setModel(tempSelectedId)
                        }
                        setOpen(false)
                    }}
                    className="flex-1 max-w-[120px] py-2.5 rounded-xl bg-primary text-primary-foreground text-[14px] font-bold transition-all active:scale-95 shadow-sm shadow-primary/20 hover:brightness-110"
                  >
                    立即應用
                  </button>
               </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
