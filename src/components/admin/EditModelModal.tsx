import { X, ChevronDown, CheckCircle, Plus, Save } from 'lucide-react'
import type { Model } from '@/types'
import { cn } from '@/lib/utils'

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
  saveModel
}: EditModelModalProps) {
  if (!isEditingModel) return null;

  return (
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
                onChange={e => setEditForm((prev: any) => ({ ...prev, name: e.target.value }))}
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
                          setEditForm((prev: any) => ({ ...prev, provider: opt.value }))
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
                onChange={e => setEditForm((prev: any) => ({ ...prev, model_id: e.target.value }))}
                placeholder="例如: gemini-1.5-pro"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground ml-1">API Key 變數名稱 (Secrets)</label>
              <input
                className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm font-mono"
                value={editForm.api_key_name || ''}
                onChange={e => setEditForm((prev: any) => ({ ...prev, api_key_name: e.target.value.toUpperCase() }))}
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
              onChange={e => setEditForm((prev: any) => ({ ...prev, base_url: e.target.value }))}
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
                  onChange={e => setEditForm((prev: any) => ({ ...prev, category: e.target.value }))}
                  onFocus={() => setShowCategoryDropdown(true)}
                  onBlur={() => {
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
                                  setEditForm((prev: any) => ({ ...prev, category: cat }))
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
                onChange={e => setEditForm((prev: any) => ({ ...prev, icon_url: e.target.value }))}
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
              onChange={e => setEditForm((prev: any) => ({ ...prev, tags: e.target.value }))}
              placeholder="例如: Free, Fast, Stable"
            />
          </div>

          {/* Row 6: Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground ml-1">模型介紹 (顯示在切換選單中)</label>
            <textarea
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm min-h-[80px]"
              value={editForm.description || ''}
              onChange={e => setEditForm((prev: any) => ({ ...prev, description: e.target.value }))}
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
  )
}
