import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { X, PenLine, Upload } from 'lucide-react'
import { ModelSwitcher } from '@/components/ModelSwitcher'
import { useModalStore } from '@/stores/modalStore'
import { cn } from '@/lib/utils'

interface CharacterInfoDialogProps {
  infoMode: 'full' | 'simple'
  onClose: () => void
  character: {
    id: string
    name: string
    avatar_url?: string | null
    description: string
    greeting?: string | null
    author_id?: string | null
  }
  conversationId: string
  modelId?: string
  userId?: string
  updateConversationModel: (conversationId: string, id: string) => Promise<void>
  onOpenBgGallery: () => void
}

export function CharacterInfoDialog({
  infoMode,
  onClose,
  character,
  conversationId,
  modelId,
  userId,
  updateConversationModel,
  onOpenBgGallery,
}: CharacterInfoDialogProps) {
  const navigate = useNavigate()
  const modal = useModalStore()

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      <div className={cn(
        "relative w-full h-auto max-w-lg glass-md border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col rounded-[32px] max-h-[85vh]",
        infoMode === 'simple' ? "transition-all duration-300" : ""
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 shrink-0 px-6 py-4">
          <div className="flex items-center gap-3.5">
            <div className={cn(
              "rounded-xl overflow-hidden border border-white/10 bg-white/[0.03] shrink-0 transition-all duration-300",
              infoMode === 'simple' ? "w-12 h-12 shadow-lg ring-1 ring-white/10" : "w-10 h-10"
            )}>
              {character.avatar_url ? (
                <img src={character.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40 font-bold">{character.name[0]}</div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className={cn("font-bold text-white truncate transition-all duration-300", infoMode === 'simple' ? "text-[19px]" : "text-[17px]")}>
                {character.name}
              </h3>
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">
                {infoMode === 'full' ? 'Management Dashboard' : 'Character Story'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 僅在 Full 模式下顯示的功能按鈕列 */}
        {infoMode === 'full' && (
          <div className="px-5 py-3 border-b border-white/5 shrink-0 bg-white/[0.01] animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  if (character.author_id === userId) {
                    onClose()
                    navigate(`/create/${character.id}`)
                  } else {
                    modal.alert('您不是此角色的創作者，無法進行修改。', { title: '權限不足' })
                  }
                }}
                className="flex flex-col items-center justify-center py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-primary/10 transition-all active:scale-95 group"
              >
                <PenLine className="w-4 h-4 text-primary mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-white/80">修改詳情</span>
              </button>

              <button
                onClick={() => {
                  onClose()
                  onOpenBgGallery()
                }}
                className="flex flex-col items-center justify-center py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-yellow-400/10 transition-all active:scale-95 group"
              >
                <Upload className="w-4 h-4 text-yellow-500 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-white/80">更換背景</span>
              </button>

              <div className="flex flex-col items-center justify-center py-2 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[8px] font-black text-white/30 uppercase mb-0.5 tracking-tighter">對話模型</span>
                <div className="scale-90 origin-center">
                  <ModelSwitcher
                    minimalist={true}
                    conversationId={conversationId}
                    modelId={modelId}
                    onSelect={(id) => updateConversationModel(conversationId, id)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 內容滑動區 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h4 className="text-[10px] font-black text-primary/60 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1 h-1 bg-primary rounded-full" /> 角色描述
            </h4>
            <p className={cn(
              "text-white/70 leading-relaxed transition-all",
              infoMode === 'simple' ? "text-[15px] font-medium text-white/85" : "text-[13px]"
            )}>
              {character.description}
            </p>
          </div>

          {/* 僅在 Full 模式下顯示問候語 */}
          {infoMode === 'full' && character.greeting && (
            <div className="space-y-1 animate-in fade-in duration-500">
              <h4 className="text-[9px] font-black text-primary/60 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 bg-primary rounded-full" /> 角色問候語
              </h4>
              <p className="text-[13px] text-white/50 italic leading-relaxed bg-white/[0.03] p-3.5 rounded-xl border border-white/5">
                「{character.greeting}」
              </p>
            </div>
          )}
        </div>

        {/* 僅在 Full 模式下顯示底部確定按鈕 */}
        {infoMode === 'full' && (
          <div className="px-5 py-3.5 border-t border-white/5 shrink-0 flex justify-center animate-in slide-in-from-bottom-2 duration-300">
            <button
              onClick={onClose}
              className="w-full max-w-xs py-3 rounded-full bg-primary text-white font-bold text-sm transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(79,70,229,0.3)]"
              style={{ background: 'linear-gradient(135deg, hsl(267, 46%, 35%), hsl(244, 52%, 31%))' }}
            >
              確定並返回
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
