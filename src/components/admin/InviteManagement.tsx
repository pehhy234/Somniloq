import { useState } from 'react'
import { Ticket, Plus, Trash2, ShieldCheck, ShieldAlert, Key } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InviteManagementProps {
  inviteCodes: any[]
  createInviteCode: (payload: { code: string; max_uses: number; expires_at: string | null }) => Promise<boolean>
  toggleInviteCodeActive: (code: string, currentStatus: boolean) => Promise<void>
  deleteInviteCode: (code: string) => Promise<void>
}

export function InviteManagement({
  inviteCodes,
  createInviteCode,
  toggleInviteCodeActive,
  deleteInviteCode
}: InviteManagementProps) {
  const [newCode, setNewCode] = useState('')
  const [maxUses, setMaxUses] = useState(1)
  const [expiresAt, setExpiresAt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Generate random 10 character code (e.g. SLQ-XXXX-XXXX)
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let part1 = ''
    let part2 = ''
    for (let i = 0; i < 4; i++) {
      part1 += chars.charAt(Math.floor(Math.random() * chars.length))
      part2 += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewCode(`SLQ-${part1}-${part2}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCode.trim()) return

    setIsSubmitting(true)
    const success = await createInviteCode({
      code: newCode.trim().toUpperCase(),
      max_uses: maxUses,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null
    })

    if (success) {
      setNewCode('')
      setMaxUses(1)
      setExpiresAt('')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      {/* Invite Code Generator Card */}
      <div className="p-5 md:p-6 rounded-[28px] bg-muted/40 border border-border/80 space-y-6 shadow-inner relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-foreground">生成混合式邀請碼</h2>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">自訂或隨機生成具備次數限制與時效的安全邀請碼</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end relative z-10">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest pl-1">代碼內容</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="例如: VIP-888"
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all uppercase"
                required
              />
              <button
                type="button"
                onClick={generateRandomCode}
                className="px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-muted-foreground hover:text-foreground transition-all active:scale-95 shrink-0"
              >
                隨機
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest pl-1">使用次數上限</label>
            <input
              type="number"
              min={1}
              max={9999}
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
              placeholder="1"
              className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest pl-1">過期時間 (選填)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !newCode.trim()}
            className={cn(
              "w-full py-3 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5",
              isSubmitting || !newCode.trim() ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary hover:brightness-110 shadow-primary/20"
            )}
          >
            <Plus className="w-4 h-4" /> 建立邀請碼
          </button>
        </form>
      </div>

      {/* List Card */}
      <div className="md:glass-md md:rounded-3xl overflow-hidden md:shadow-2xl">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-5 text-[11px] font-black text-muted-foreground uppercase tracking-widest">代碼</th>
                <th className="p-5 text-[11px] font-black text-muted-foreground uppercase tracking-widest">使用狀態</th>
                <th className="p-5 text-[11px] font-black text-muted-foreground uppercase tracking-widest">過期時間</th>
                <th className="p-5 text-center text-[11px] font-black text-muted-foreground uppercase tracking-widest">狀態</th>
                <th className="p-5 text-right text-[11px] font-black text-muted-foreground uppercase tracking-widest">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {inviteCodes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-muted-foreground/50 font-semibold tracking-wider uppercase">
                    尚無邀請碼資料
                  </td>
                </tr>
              ) : (
                inviteCodes.map((code) => {
                  const isExpired = code.expires_at && new Date(code.expires_at) < new Date()
                  const isMaxed = code.uses_count >= code.max_uses
                  return (
                    <tr key={code.code} className="hover:bg-muted/30 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground">
                            <Ticket className="w-4 h-4 text-purple-400" />
                          </div>
                          <span className="font-bold text-[14px] text-foreground tracking-wider uppercase font-mono">{code.code}</span>
                        </div>
                      </td>
                      <td className="p-5 text-xs font-semibold tabular-nums text-muted-foreground">
                        {code.uses_count} / {code.max_uses} 次使用
                        {isMaxed && <span className="ml-2 text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/10">已滿</span>}
                      </td>
                      <td className="p-5 text-xs text-muted-foreground font-semibold">
                        {code.expires_at ? (
                          <span className={isExpired ? 'text-red-400' : ''}>
                            {new Date(code.expires_at).toLocaleString()}
                            {isExpired && ' (已過期)'}
                          </span>
                        ) : (
                          <span className="opacity-40">無期限</span>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border",
                          code.is_active && !isExpired && !isMaxed
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                          {code.is_active && !isExpired && !isMaxed ? '使用中' : '已停用/失效'}
                        </div>
                      </td>
                      <td className="p-5 text-right space-x-2">
                        <button
                          onClick={() => toggleInviteCodeActive(code.code, code.is_active)}
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border outline-none",
                            code.is_active
                              ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20"
                              : "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
                          )}
                        >
                          {code.is_active ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          {code.is_active ? '停用' : '啟用'}
                        </button>
                        <button
                          onClick={() => deleteInviteCode(code.code)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all outline-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 刪除
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="flex flex-col gap-4 md:hidden">
          {inviteCodes.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground/40 font-bold uppercase tracking-wider bg-card border border-border rounded-[28px]">
              尚無邀請碼資料
            </div>
          ) : (
            inviteCodes.map((code) => {
              const isExpired = code.expires_at && new Date(code.expires_at) < new Date()
              const isMaxed = code.uses_count >= code.max_uses
              return (
                <div key={code.code} className="bg-card p-5 rounded-[28px] border border-border space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Ticket className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-sm tracking-wider uppercase font-mono">{code.code}</span>
                    </div>
                    <div className={cn(
                      "px-2.5 py-0.5 rounded-full text-[9px] font-bold border",
                      code.is_active && !isExpired && !isMaxed
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                    )}>
                      {code.is_active && !isExpired && !isMaxed ? '使用中' : '失效'}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                    <div className="flex justify-between">
                      <span>使用次數:</span>
                      <span className="text-foreground font-mono">{code.uses_count} / {code.max_uses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>過期時間:</span>
                      <span className={cn("text-foreground", isExpired && "text-red-400")}>
                        {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : '無期限'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                    <button
                      onClick={() => toggleInviteCodeActive(code.code, code.is_active)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold transition-all border",
                        code.is_active ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/15" : "bg-green-500/10 text-green-500 border-green-500/15"
                      )}
                    >
                      {code.is_active ? '停用' : '啟用'}
                    </button>
                    <button
                      onClick={() => deleteInviteCode(code.code)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/15 transition-all"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
