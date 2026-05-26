import { useState } from 'react'
import { X, Plus, Edit, Trash2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProviderManagementModalProps {
  isOpen: boolean
  onClose: () => void
  providers: any[]
  saveProviders: (newProviders: any[]) => Promise<boolean>
}

export function ProviderManagementModal({
  isOpen,
  onClose,
  providers,
  saveProviders
}: ProviderManagementModalProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [form, setForm] = useState({
    key: '',
    name: '',
    base_url: '',
    api_key_name: ''
  })
  const [isAdding, setIsAdding] = useState(false)

  if (!isOpen) return null

  const handleEdit = (provider: any) => {
    setForm({
      key: provider.key,
      name: provider.name,
      base_url: provider.base_url || '',
      api_key_name: provider.api_key_name || ''
    })
    setEditingKey(provider.key)
    setIsAdding(true) // Open the form view for editing
  }

  const handleDelete = async (key: string) => {
    if (confirm('確定要刪除此供應商嗎？這將導致使用此供應商的模型失去底層配置。')) {
      const filtered = providers.filter(p => p.key !== key)
      await saveProviders(filtered)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.key.trim() || !form.name.trim()) return

    const keyLower = form.key.toLowerCase().trim()
    let apiKey = form.api_key_name.toUpperCase().trim()
    if (apiKey && !apiKey.endsWith('_API_KEY')) {
      apiKey = `${apiKey}_API_KEY`
    }

    const payload = {
      key: keyLower,
      name: form.name.trim(),
      base_url: form.base_url.trim(),
      api_key_name: apiKey
    }

    let updatedList = []
    if (editingKey) {
      updatedList = providers.map(p => p.key === editingKey ? payload : p)
    } else {
      if (providers.some(p => p.key === keyLower)) {
        alert('此供應商識別代碼已存在！')
        return
      }
      updatedList = [...providers, payload]
    }

    const success = await saveProviders(updatedList)
    if (success) {
      handleCancel()
    }
  }

  const handleCancel = () => {
    setEditingKey(null)
    setForm({ key: '', name: '', base_url: '', api_key_name: '' })
    setIsAdding(false)
  }

  const handleClose = () => {
    handleCancel()
    onClose()
  }

  const inputClass = "w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-all font-mono"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-lg w-full max-w-2xl rounded-[32px] overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 bg-background/95 border border-border">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">供應商配置管理</h3>
            <p className="text-xs text-muted-foreground/60 mt-0.5">配置全站 AI 供應商的 API 端點與安全金鑰名稱</p>
          </div>
          <button 
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-6">
          {isAdding ? (
            /* Add/Edit Form */
            <form onSubmit={handleSave} className="space-y-4 p-5 rounded-2xl bg-muted/30 border border-border animate-in fade-in slide-in-from-top-2 duration-200">
              <h4 className="text-sm font-bold text-foreground">
                {editingKey ? '編輯供應商參數' : '新增自訂供應商'}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground ml-1">供應商代碼 (Key ID)</label>
                  <input
                    required
                    disabled={!!editingKey}
                    className={cn(inputClass, editingKey && "opacity-50 cursor-not-allowed")}
                    value={form.key}
                    onChange={e => setForm(prev => ({ ...prev, key: e.target.value }))}
                    placeholder="例如: deepseek (小寫標識)"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground ml-1">顯示名稱 (Name)</label>
                  <input
                    required
                    className={inputClass}
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例如: DeepSeek (官方)"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground ml-1">客製化 Base URL (可留空，使用 SDK 預設)</label>
                <input
                  className={inputClass}
                  value={form.base_url}
                  onChange={e => setForm(prev => ({ ...prev, base_url: e.target.value }))}
                  placeholder="例如: https://api.deepseek.com/v1"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground ml-1">API Key 變數名稱 (與環境變數對接)</label>
                <input
                  className={inputClass}
                  value={form.api_key_name}
                  onChange={e => setForm(prev => ({ ...prev, api_key_name: e.target.value }))}
                  placeholder="例如: DEEPSEEK (系統會自動補上 _API_KEY)"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted text-foreground transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  儲存配置
                </button>
              </div>
            </form>
          ) : (
            /* Providers List View */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">配置清單 ({providers.length})</span>
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 text-xs font-bold text-primary transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  新增供應商
                </button>
              </div>

              <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-muted/10">
                {providers.map(p => (
                  <div key={p.key} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-[15px]">{p.name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono text-muted-foreground border border-border uppercase">
                          {p.key}
                        </span>
                      </div>
                      <div className="space-y-0.5 text-xs text-muted-foreground/80 font-mono">
                        <p className="truncate"><span className="text-[10px] text-muted-foreground/40 font-bold uppercase mr-1">Base URL:</span> {p.base_url || '使用官方 SDK 預設'}</p>
                        <p className="truncate"><span className="text-[10px] text-muted-foreground/40 font-bold uppercase mr-1">Key Env:</span> {p.api_key_name || '無'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => handleEdit(p)}
                        className="p-2 rounded-lg bg-muted border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.key)}
                        className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 rounded-xl bg-muted text-sm font-semibold text-foreground hover:bg-muted/80 transition-all"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}
