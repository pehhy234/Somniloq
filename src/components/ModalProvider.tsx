import { useModalStore } from '@/stores/modalStore'
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal'
import { AlertCircle, Trash2, Info, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ModalProvider() {
  const { isOpen, type, options, close } = useModalStore()

  if (!options) return null

  const handleConfirm = async () => {
    if (options.onConfirm) {
      await options.onConfirm()
    }
    close()
  }

  const handleCancel = () => {
    if (options.onCancel) {
      options.onCancel()
    }
    close()
  }

  const isDestructive = options.destructive || type === 'confirm' && options.confirmText?.includes('刪除')

  // Icon + accent color logic
  const getVariant = (): 'destructive' | 'success' | 'warning' | 'info' => {
    if (isDestructive) return 'destructive'
    const title = options.title ?? ''
    if (title.includes('失敗') || title.includes('錯誤')) return 'warning'
    if (title.includes('完成') || title.includes('成功') || title.includes('更新')) return 'success'
    return 'info'
  }

  const variant = getVariant()

  const variantConfig = {
    destructive: {
      icon: <Trash2 className="w-5 h-5" />,
      iconBg: 'bg-red-500/15 border border-red-500/20',
      iconColor: 'text-red-400',
      confirmBg: 'bg-red-500 hover:bg-red-400 shadow-red-500/30',
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      iconBg: 'bg-yellow-500/15 border border-yellow-500/20',
      iconColor: 'text-yellow-400',
      confirmBg: 'bg-yellow-500 hover:bg-yellow-400 shadow-yellow-500/30 text-black',
    },
    success: {
      icon: <CheckCircle2 className="w-5 h-5" />,
      iconBg: 'bg-green-500/15 border border-green-500/20',
      iconColor: 'text-green-400',
      confirmBg: 'bg-green-500 hover:bg-green-400 shadow-green-500/30',
    },
    info: {
      icon: type === 'confirm' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />,
      iconBg: 'bg-primary/15 border border-primary/20',
      iconColor: 'text-primary',
      confirmBg: 'bg-primary hover:brightness-110 shadow-primary/30',
    },
  }

  const cfg = variantConfig[variant]

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && close()}>
      <ModalContent className="sm:max-w-[400px]">
        <ModalHeader className="flex flex-row items-start gap-4 text-left space-y-0 pr-6">
          {/* Icon badge */}
          <div className={cn(
            'w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5',
            cfg.iconBg, cfg.iconColor
          )}>
            {cfg.icon}
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <ModalTitle className="text-base font-bold tracking-tight text-foreground leading-snug">
              {options.title || (type === 'confirm' ? '請確認' : '提醒')}
            </ModalTitle>
            <ModalDescription className="text-sm text-muted-foreground leading-relaxed">
              {options.message}
            </ModalDescription>
          </div>
        </ModalHeader>

        {/* Divider */}
        <div className="h-px bg-white/[0.06] mx-0 my-1" />

        <ModalFooter className="flex flex-row gap-2 pt-1">
          {type === 'confirm' && (
            <button
              onClick={handleCancel}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                'border border-white/10 bg-white/5 text-muted-foreground',
                'hover:bg-white/10 hover:text-foreground hover:border-white/20',
                'active:scale-[0.97]'
              )}
            >
              {options.cancelText || '取消'}
            </button>
          )}
          <button
            onClick={handleConfirm}
            autoFocus
            className={cn(
              'flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200',
              'text-white shadow-lg active:scale-[0.97]',
              cfg.confirmBg,
              variant === 'warning' && 'text-black'
            )}
          >
            {options.confirmText || (type === 'confirm' ? '確定' : '確認')}
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
