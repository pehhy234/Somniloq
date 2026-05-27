import { useState } from 'react'
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal'
import { Sparkles, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface InviteActivationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function InviteActivationModal({ isOpen, onClose, onSuccess }: InviteActivationModalProps) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: rpcErr } = await (supabase.rpc as any)('activate_user_with_invite', {
        invite_code_input: code.trim()
      })

      if (rpcErr) throw rpcErr

      if (data) {
        onSuccess()
        onClose()
      } else {
        throw new Error('啟用失敗，請確認代碼是否正確。')
      }
    } catch (err: any) {
      setError(err.message || '邀請碼無效或已過期。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <ModalContent className="sm:max-w-[400px]">
        <form onSubmit={handleActivate} className="space-y-4">
          <ModalHeader className="flex flex-row items-start gap-4 text-left space-y-0 pr-6">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 bg-primary/15 border border-primary/20 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <ModalTitle className="text-base font-bold tracking-tight text-foreground leading-snug">
                輸入邀請碼解鎖
              </ModalTitle>
              <ModalDescription className="text-sm text-muted-foreground leading-relaxed">
                輸入有效的混合式邀請碼，即可立刻啟用您的帳號並開啟聊天功能。
              </ModalDescription>
            </div>
          </ModalHeader>

          {/* Divider */}
          <div className="h-px bg-white/[0.06] mx-0 my-1" />

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Input field */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              邀請碼 (Invite Code)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isLoading}
              placeholder="例如: SLQ-XXXX-XXXX"
              className={cn(
                'w-full px-4 py-3 rounded-xl text-sm transition-all duration-200',
                'bg-white/5 border text-foreground placeholder:text-muted-foreground/30',
                'focus:outline-none focus:ring-2 focus:bg-white/8',
                'hover:border-white/20 border-white/10 focus:border-primary/40 focus:ring-primary/50'
              )}
              required
            />
          </div>

          <ModalFooter className="flex flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                'border border-white/10 bg-white/5 text-muted-foreground',
                'hover:bg-white/10 hover:text-foreground hover:border-white/20',
                'disabled:opacity-40 active:scale-[0.97]'
              )}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200',
                'text-white shadow-lg active:scale-[0.97] bg-primary hover:brightness-110 shadow-primary/30',
                'disabled:opacity-40 disabled:scale-100'
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  驗證中
                </span>
              ) : (
                '確認啟用'
              )}
            </button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
