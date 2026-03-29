import React, { useEffect, useRef } from 'react'
import { Copy, Trash2, RotateCcw, PenLine, History, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onCopy: () => void
  onDelete: () => void
  onRollback: () => void
  onRemember: () => void
  onRewrite: () => void
  onRegenerate?: () => void
}

export function ChatContextMenu({
  x,
  y,
  onClose,
  onCopy,
  onDelete,
  onRollback,
  onRemember,
  onRewrite,
  onRegenerate,
}: ChatContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    // Use pointerdown to handle both mouse and touch outside
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [onClose])

  // Prevent parent scroll while menu is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Calculate position with screen boundaries
  const [pos, setPos] = React.useState({ left: x, top: y })

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      let left = x
      let top = y

      // Adjust if it goes off screen right
      if (left + rect.width > window.innerWidth) {
        left = window.innerWidth - rect.width - 10
      }
      // Adjust if it goes off screen bottom
      if (top + rect.height > window.innerHeight) {
        top = window.innerHeight - rect.height - 10
      }
      // Ensure it's not off screen left or top
      left = Math.max(10, left)
      top = Math.max(10, top)

      setPos({ left, top })
    }
  }, [x, y])

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-[100] min-w-[180px] bg-[#1E1E1E] border border-white/10 rounded-[16px]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)]",
        "backdrop-blur-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ease-out"
      )}
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="flex flex-col py-1.5 px-1.5">
        <MenuItem 
          icon={<Copy className="w-[18px] h-[18px]" />} 
          label="複製" 
          onClick={() => { onCopy(); onClose(); }} 
        />
        <div className="mx-2 my-1 h-[0.5px] bg-white/10" />
        <MenuItem 
          icon={<PenLine className="w-[18px] h-[18px]" />} 
          label="改寫" 
          onClick={() => { onRewrite(); onClose(); }} 
        />
        {onRegenerate && (
          <MenuItem 
            icon={<RotateCcw className="w-[18px] h-[18px]" />} 
            label="重新生成" 
            onClick={() => { onRegenerate(); onClose(); }} 
          />
        )}
        <MenuItem 
          icon={<History className="w-[18px] h-[18px]" />} 
          label="回溯" 
          onClick={() => { onRollback(); onClose(); }} 
        />
        <MenuItem 
          icon={<Brain className="w-[18px] h-[18px]" />} 
          label="記住" 
          onClick={() => { onRemember(); onClose(); }} 
        />
        <div className="mx-2 my-1 h-[0.5px] bg-white/10" />
        <MenuItem 
          icon={<Trash2 className="w-[18px] h-[18px]" />} 
          label="刪除" 
          onClick={() => { onDelete(); onClose(); }} 
          className="text-red-400 hover:bg-red-500/15 active:bg-red-500/25"
        />
      </div>
    </div>
  )
}

function MenuItem({ 
  icon, 
  label, 
  onClick, 
  className 
}: { 
  icon: React.ReactNode, 
  label: string, 
  onClick: () => void, 
  className?: string 
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex items-center gap-3.5 px-3 py-2.5 w-full rounded-[10px]",
        "text-[16px] font-medium text-white/90 hover:bg-white/10",
        "active:bg-white/20 active:scale-[0.98] transition-all duration-150 text-left",
        className
      )}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      <span>{label}</span>
    </button>
  )
}
