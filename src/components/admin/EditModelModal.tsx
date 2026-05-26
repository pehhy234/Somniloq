import { useState, useEffect } from 'react'
import { X, ChevronDown, CheckCircle, Save, Loader2 } from 'lucide-react'
import type { Model } from '@/types'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface EditModelModalProps {
  models: Model[]
  isEditingModel: string | null
  setIsEditingModel: (id: string | null) => void
  editForm: Partial<Model>
  setEditForm: (form: any) => void
  showCategoryDropdown: boolean
  setShowCategoryDropdown: (b: boolean) => void
  showProviderDropdown: boolean
  setShowProviderDropdown: (b: boolean) => void
  saveModel: () => Promise<void>
  providers?: any[]
}

export function EditModelModal({
  models,
  isEditingModel,
  setIsEditingModel,
  editForm,
  setEditForm,
  showCategoryDropdown,
  setShowCategoryDropdown,
  showProviderDropdown,
  setShowProviderDropdown,
  saveModel,
  providers = []
}: EditModelModalProps) {
  const [showPresetDropdown, setShowPresetDropdown] = useState(false)
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null)
  const [presetSearchText, setPresetSearchText] = useState('')
  
  // Dynamic models state
  const [fetchedModels, setFetchedModels] = useState<Array<{
    name: string
    model_id: string
    category: string
    tags: string[]
    description: string
  }>>([])
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  
  const inputClass = "w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all font-mono"

  // Reset local helpers when editing target changes
  useEffect(() => {
    setShowPresetDropdown(false)
    setSelectedPresetIndex(null)
    setPresetSearchText('')
    setFetchedModels([])
    setFetchError(null)
  }, [isEditingModel])

  // Filter fetched models by search input and deduplicate
  const filteredPresets = fetchedModels
    .filter((m, idx, self) => self.findIndex(t => t.model_id === m.model_id) === idx)
    .filter(m => {
      if (!presetSearchText) return true
      const term = presetSearchText.toLowerCase()
      return m.name.toLowerCase().includes(term) || m.model_id.toLowerCase().includes(term)
    })

  // Fetch models dynamically when provider changes
  useEffect(() => {
    if (!editForm.provider || isEditingModel !== 'new') return

    const fetchProviderModels = async () => {
      setIsFetchingModels(true)
      setFetchError(null)
      setFetchedModels([])
      setSelectedPresetIndex(null)

      try {
        const selectedProvider = providers.find(p => p.key === editForm.provider)
        if (!selectedProvider) return

        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-provider-models`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            provider: editForm.provider,
            base_url: selectedProvider.base_url,
            api_key_name: selectedProvider.api_key_name
          })
        })

        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.error || '無法取得供應商模型清單')
        }

        const data = await response.json()
        if (data.models && Array.isArray(data.models)) {
          setFetchedModels(data.models)
        }
      } catch (err: any) {
        console.error('Failed to fetch provider models:', err)
        setFetchError(err.message || '擷取模型清單時出錯，請確認 API 金鑰是否配置。')
      } finally {
        setIsFetchingModels(false)
      }
    }

    fetchProviderModels()
  }, [editForm.provider, isEditingModel, providers])

  if (!isEditingModel) return null;

  const handleSelectPreset = (preset: typeof fetchedModels[0], index: number) => {
    setEditForm((prev: any) => ({
      ...prev,
      name: preset.name,
      model_id: preset.model_id,
      category: preset.category,
      tags: preset.tags,
      description: preset.description
    }))
    setSelectedPresetIndex(index)
    setPresetSearchText(`${preset.name} (${preset.model_id})`)
    setShowPresetDropdown(false)
  }

  const handleCustomInput = () => {
    setSelectedPresetIndex(-1)
    setPresetSearchText('🔧 使用自訂欄位 (手動填寫欄位)')
    setShowPresetDropdown(false)
  }

  const currentProviderObj = providers.find(p => p.key === editForm.provider)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-lg w-full max-w-2xl rounded-[32px] overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.8)] bg-background/95 border border-border animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              {isEditingModel === 'new' ? '新增 AI 模型' : '編輯 AI 模型'}
            </h3>
            <p className="text-xs text-muted-foreground/60 mt-0.5">新增對話角色所使用的底層大型語言模型</p>
          </div>
          <button 
            onClick={() => setIsEditingModel(null)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {/* Row 1: Provider selection */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-bold text-muted-foreground ml-1">選擇供應商</label>
            <div className="relative group">
              <button
                type="button"
                onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                onBlur={() => setTimeout(() => setShowProviderDropdown(false), 200)}
                className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm flex items-center justify-between hover:border-primary/40 transition-all text-left"
              >
                <span className="capitalize">
                  {currentProviderObj ? currentProviderObj.name : (editForm.provider || '請選擇供應商')}
                </span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showProviderDropdown && "rotate-180")} />
              </button>
              
              {showProviderDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 z-[999] bg-popover border border-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                    {providers.map((prov) => (
                      <button
                        key={prov.key}
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-between"
                        onClick={() => {
                          setEditForm((prev: any) => ({ 
                            ...prev, 
                            provider: prov.key,
                            name: '',
                            model_id: '',
                            category: prov.category || prev.category || ''
                          }))
                          setSelectedPresetIndex(null)
                          setShowProviderDropdown(false)
                        }}
                      >
                        <span>{prov.name} ({prov.key})</span>
                        {editForm.provider === prov.key && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    ))}
                    {providers.length === 0 && (
                      <div className="px-4 py-2 text-xs text-muted-foreground italic">無可用供應商，請先在「管理供應商」中配置。</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Searchable Preset selector (shown only for new models with provider chosen) */}
          {isEditingModel === 'new' && editForm.provider && (
            <div className="space-y-1.5 relative p-4 rounded-2xl bg-primary/5 border border-primary/10 animate-in fade-in duration-300">
              <div className="flex items-center justify-between ml-1 mb-1">
                <label className="text-xs font-black text-primary uppercase tracking-wider">🌟 搜尋並選擇可用模型 (一鍵自動填裝)</label>
                {isFetchingModels && (
                  <span className="flex items-center gap-1 text-[10px] text-primary/70 font-semibold animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> 連線抓取中...
                  </span>
                )}
              </div>
              <div className="relative">
                {/* ComboBox Input style */}
                <input
                  type="text"
                  disabled={isFetchingModels}
                  className="w-full bg-background border border-primary/30 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-all font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder={isFetchingModels ? '正在從供應商 API 擷取模型清單...' : '🔍 輸入文字搜尋模型 (例如: gemini, 1.5, o1, r1...)'}
                  value={presetSearchText}
                  onChange={(e) => {
                    setPresetSearchText(e.target.value)
                    setShowPresetDropdown(true)
                  }}
                  onFocus={() => setShowPresetDropdown(true)}
                  onBlur={() => setTimeout(() => setShowPresetDropdown(false), 250)}
                />
                
                <ChevronDown 
                  className={cn("w-4 h-4 text-primary absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer transition-transform pointer-events-none", showPresetDropdown && "rotate-180")} 
                />

                {showPresetDropdown && !isFetchingModels && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-[999] bg-popover border border-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                      {/* Popular models matched */}
                      {filteredPresets.map((preset) => {
                        const originalIdx = fetchedModels.findIndex(m => m.model_id === preset.model_id)
                        return (
                          <button
                            key={preset.model_id}
                            type="button"
                            className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-between font-mono"
                            onClick={() => handleSelectPreset(preset, originalIdx)}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-bold truncate text-foreground">{preset.name}</p>
                              <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">ID: {preset.model_id}</p>
                              {preset.description && (
                                <p className="text-[11px] text-muted-foreground/75 truncate mt-0.5 leading-normal">{preset.description}</p>
                              )}
                            </div>
                            {selectedPresetIndex === originalIdx && <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
                          </button>
                        )
                      })}

                      {filteredPresets.length === 0 && fetchedModels.length > 0 && (
                        <div className="px-4 py-3 text-xs text-muted-foreground italic text-center">沒有符合 "{presetSearchText}" 的模型</div>
                      )}

                      {fetchedModels.length === 0 && (
                        <div className="px-4 py-3 text-xs text-muted-foreground italic text-center">
                          {fetchError ? '❌ 擷取失敗' : '⚠️ 該供應商未回傳任何模型'}
                        </div>
                      )}

                      <div className="border-t border-border mt-1">
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-muted font-bold transition-colors flex items-center justify-between"
                          onClick={handleCustomInput}
                        >
                          <span>🔧 使用自訂欄位 (直接在下方手動填寫)</span>
                          {selectedPresetIndex === -1 && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {fetchError && (
                <p className="text-[11px] text-red-500 font-medium mt-1.5 ml-1 leading-normal">
                  {fetchError}
                </p>
              )}
            </div>
          )}

          {/* Row 3: Model Name & Model ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground ml-1">名稱 (顯示用)</label>
              <input
                required
                className={inputClass}
                value={editForm.name || ''}
                onChange={e => setEditForm((prev: any) => ({ ...prev, name: e.target.value }))}
                placeholder="例如: Gemini 1.5 Pro"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground ml-1">模型 ID (API 識別項)</label>
              <input
                required
                className={inputClass}
                value={editForm.model_id || ''}
                onChange={e => setEditForm((prev: any) => ({ ...prev, model_id: e.target.value }))}
                placeholder="例如: gemini-1.5-pro"
              />
            </div>
          </div>

          {/* Row 4: Category & Icon */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-muted-foreground ml-1">大分類 (如: Gemini, GPT) 👈</label>
              <div className="relative group">
                <input
                  autoComplete="off"
                  className={inputClass}
                  value={editForm.category || ''}
                  onChange={e => setEditForm((prev: any) => ({ ...prev, category: e.target.value }))}
                  onFocus={() => setShowCategoryDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                  placeholder="例如: Gemini"
                />
                <button 
                  type="button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showCategoryDropdown && "rotate-180")} />
                </button>

                {showCategoryDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-[999] bg-popover border border-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] py-2 overflow-hidden animate-in fade-in duration-200">
                    <div className="max-h-[160px] overflow-y-auto custom-scrollbar">
                      {Array.from(new Set(models.map(m => m.category)))
                        .filter(cat => cat && cat.toLowerCase().includes((editForm.category || '').toLowerCase()))
                        .length > 0 ? (
                          Array.from(new Set(models.map(m => m.category)))
                            .filter(cat => cat && cat.toLowerCase().includes((editForm.category || '').toLowerCase()))
                            .map(cat => (
                              <button
                                key={cat}
                                type="button"
                                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors flex items-center justify-between"
                                onClick={() => {
                                  setEditForm((prev: any) => ({ ...prev, category: cat }))
                                  setShowCategoryDropdown(false)
                                }}
                              >
                                <span>{cat}</span>
                                {editForm.category === cat && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                              </button>
                            ))
                        ) : (
                          <div className="px-4 py-2 text-xs text-muted-foreground italic">
                            按 Enter 可直接自訂此分類: "{editForm.category}"
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
                className={inputClass}
                value={editForm.icon_url || ''}
                onChange={e => setEditForm((prev: any) => ({ ...prev, icon_url: e.target.value }))}
                placeholder="圖片網址..."
              />
            </div>
          </div>

          {/* Row 5: Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground ml-1">標籤 (以半型逗號分隔)</label>
            <input
              className={inputClass}
              value={Array.isArray(editForm.tags) ? editForm.tags.join(', ') : editForm.tags || ''}
              onChange={e => setEditForm((prev: any) => ({ ...prev, tags: e.target.value }))}
              placeholder="例如: Free, Fast, Reasoning"
            />
          </div>

          {/* Row 6: Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground ml-1">模型介紹 (顯示在切換選單中)</label>
            <textarea
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm min-h-[70px] text-foreground focus:outline-none focus:border-primary/50 transition-all font-mono"
              value={editForm.description || ''}
              onChange={e => setEditForm((prev: any) => ({ ...prev, description: e.target.value }))}
              placeholder="簡單介紹模型的特性..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-border bg-muted/20 flex gap-3">
          <button
            onClick={() => setIsEditingModel(null)}
            className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted text-foreground transition-all"
          >
            取消
          </button>
          <button
            onClick={saveModel}
            disabled={!editForm.name || !editForm.provider || !editForm.model_id}
            className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:bg-muted disabled:text-muted-foreground/50 disabled:border disabled:border-border disabled:shadow-none disabled:cursor-not-allowed hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            儲存設定
          </button>
        </div>
      </div>
    </div>
  )
}
