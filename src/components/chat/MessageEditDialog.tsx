import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageEditDialogProps {
  isOpen: boolean
  onClose: () => void
  initialContent: string
  onSave: (content: string) => Promise<void>
}

export function MessageEditDialog({
  isOpen,
  onClose,
  initialContent,
  onSave,
}: MessageEditDialogProps) {
  const [editContent, setEditContent] = useState(initialContent)

  useEffect(() => {
    if (isOpen) {
      setEditContent(initialContent)
    }
  }, [isOpen, initialContent])

  if (!isOpen) return null

  const handleSave = async () => {
    await onSave(editContent)
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* 彈窗內容 */}
      <div className={cn(
        "relative w-full h-full sm:h-[660px] sm:max-w-xl glass-lg flex flex-col",
        "border border-white/20 sm:border-white/25",
        "rounded-none sm:rounded-[28px] overflow-hidden",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_8px_40px_rgba(0,0,0,0.6)] sm:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_60px_rgba(0,0,0,0.8)]",
        "animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-250"
      )}>
        {/* Header */}
        <div className="px-7 py-4 flex items-center justify-between shrink-0 p-safe-top">
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full bg-primary/60" />
            <span className="text-[13px] font-semibold text-white/40 tracking-wide">編輯回覆</span>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 flex items-center justify-center rounded-full text-white/15 hover:text-white/50 hover:bg-white/5 transition-all active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* 分隔線 */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent mx-6 shrink-0" />

        {/* 編輯區 */}
        <div className="flex-1 overflow-hidden px-7 py-5 flex flex-col">
          <textarea
            className="flex-1 w-full bg-transparent text-[15px] sm:text-[16px] text-white/85 outline-none resize-none leading-[1.85] custom-scrollbar placeholder:text-white/15 font-normal"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="在此修改內容..."
            autoFocus
          />
        </div>
        {/* 分隔線 */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent mx-6 shrink-0" />

        {/* Footer */}
        <div className="px-7 py-6 flex items-center gap-3 shrink-0 p-safe-bottom">
          {/* 取消 */}
          <button
            onClick={onClose}
            className="h-[52px] px-7 rounded-2xl text-white/40 font-semibold text-[14px] transition-all hover:text-white/70 hover:bg-white/5 active:scale-95 border border-white/10 shrink-0"
          >
            取消
          </button>
          {/* 確認 */}
          <button
            onClick={handleSave}
            className="flex-1 h-[52px] rounded-2xl bg-primary font-bold text-[14px] text-white flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] hover:brightness-110"
            style={{ boxShadow: '0 4px 24px rgba(139,92,246,0.45), 0 1px 0 rgba(255,255,255,0.12) inset' }}
          >
            <Send className="w-3.5 h-3.5 opacity-80" />
            保存新版本
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
