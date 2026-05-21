import { Settings, ChevronDown, Save, CheckCircle } from 'lucide-react'
import type { Model } from '@/types'

interface SystemSettingsProps {
  models: Model[]
  pendingDefaultChatModelId: string
  setPendingDefaultChatModelId: (s: string) => void
  defaultChatModelId: string
  pendingModelId: string
  setPendingModelId: (s: string) => void
  suggestionModelId: string
  handleSaveDefaultChatModel: () => Promise<void>
  handleSaveSettings: () => Promise<void>
}

export function SystemSettings({
  models,
  pendingDefaultChatModelId,
  setPendingDefaultChatModelId,
  defaultChatModelId,
  pendingModelId,
  setPendingModelId,
  suggestionModelId,
  handleSaveDefaultChatModel,
  handleSaveSettings
}: SystemSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          系統全域設定
        </h2>
        <p className="text-[11px] text-muted-foreground/50 mt-1 font-medium">配置全站 AI 設定與預設行為</p>
      </div>
      
      <div className="md:glass-md p-6 rounded-[28px] border border-border space-y-6 max-w-2xl">
        {/* Default Chat Model */}
        <div className="space-y-4 pb-6 border-b border-white/5 pl-4 border-l-2 border-l-primary/40">
          <div>
            <h3 className="text-sm font-black text-foreground">【聊天室首推】預設對話模型</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
              選擇當使用者開啟**新聊天室**時，系統預設帶入的 AI 說話模型。若使用者後續自行切換，該聊天室將以使用者的選擇為主。
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <select
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground appearance-none focus:outline-none focus:border-primary/50 transition-all font-mono"
                value={pendingDefaultChatModelId || ''}
                onChange={(e) => setPendingDefaultChatModelId(e.target.value)}
              >
                <option value="" disabled className="bg-card text-foreground">-- 選擇一個預設模型 --</option>
                {models.map(m => (
                  <option key={m.id} value={m.model_id} className="bg-card text-foreground border-b border-border py-2">
                    {m.name} ({m.model_id})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            
            <button
              onClick={handleSaveDefaultChatModel}
              disabled={!pendingDefaultChatModelId || pendingDefaultChatModelId === defaultChatModelId}
              className="shrink-0 px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:bg-muted disabled:text-muted-foreground/50 disabled:border disabled:border-border disabled:shadow-none disabled:cursor-not-allowed hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
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

        {/* Suggestion Model */}
        <div className="space-y-4 pl-4 border-l-2 border-l-blue-400/40">
          <div>
            <h3 className="text-sm font-black text-foreground">【聊天室燈泡】AI 建議模型</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
              選擇當使用者點擊聊天室「燈泡」時，負責產生三個劇情建議的模型。建議選擇速度快、成本低的模型（如 Flash 或是 Mini）。
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <select
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground appearance-none focus:outline-none focus:border-primary/50 transition-all font-mono"
                value={pendingModelId || ''}
                onChange={(e) => setPendingModelId(e.target.value)}
              >
                <option value="" disabled className="bg-card text-foreground">-- 選擇一個模型 --</option>
                {models.map(m => (
                  <option key={m.id} value={m.model_id} className="bg-card text-foreground border-b border-border py-2">
                    {m.name} ({m.model_id})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            
            <button
              onClick={handleSaveSettings}
              disabled={!pendingModelId || pendingModelId === suggestionModelId}
              className="shrink-0 px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:bg-muted disabled:text-muted-foreground/50 disabled:border disabled:border-border disabled:shadow-none disabled:cursor-not-allowed hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
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
  )
}
