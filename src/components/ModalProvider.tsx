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
  
  const getIcon = () => {
    if (isDestructive) return <Trash2 className="w-6 h-6 text-red-500" />
    if (type === 'alert' && options.title?.includes('失敗')) return <AlertTriangle className="w-6 h-6 text-yellow-500" />
    if (type === 'alert' && options.title?.includes('完成') || options.title?.includes('成功')) return <CheckCircle2 className="w-6 h-6 text-green-500" />
    if (type === 'confirm') return <AlertCircle className="w-6 h-6 text-primary" />
    return <Info className="w-6 h-6 text-primary" />
  }

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && close()}>
      <ModalContent className="sm:max-w-md border-none ring-1 ring-white/10">
        <ModalHeader className="flex flex-row items-center gap-4 text-left space-y-0">
          <div className={cn(
            "p-3 rounded-2xl flex-shrink-0",
            isDestructive ? "bg-red-500/10" : "bg-primary/10"
          )}>
            {getIcon()}
          </div>
          <div className="flex flex-col gap-1">
            <ModalTitle className="text-xl font-bold tracking-tight">
              {options.title || (type === 'confirm' ? '請確認' : '提醒')}
            </ModalTitle>
            <ModalDescription className="text-white/60 font-medium">
              {options.message}
            </ModalDescription>
          </div>
        </ModalHeader>
        
        <ModalFooter className="mt-4 gap-3 sm:gap-0">
          {type === 'confirm' && (
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-semibold transition-all active:scale-95"
            >
              {options.cancelText || '取消'}
            </button>
          )}
          <button
            onClick={handleConfirm}
            autoFocus
            className={cn(
              "flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-xl",
              isDestructive 
                ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20" 
                : "bg-primary text-white hover:brightness-110 shadow-primary/20"
            )}
          >
            {options.confirmText || (type === 'confirm' ? '確定' : '確認')}
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
