import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Loader2, Sparkles, AlertCircle, CheckCircle2, Mail, ArrowLeft, ShieldCheck } from 'lucide-react'

type AuthMode = 'login' | 'register' | 'forgot'
type ValidationState = 'none' | 'error' | 'success'

// ── Hard password requirements (enforced on register submit) ──
const PW_REQS = [
  { test: (pw: string) => pw.length > 8,    text: '長度超過 8 個字元' },
  { test: (pw: string) => /[A-Z]/.test(pw), text: '包含大寫字母（A-Z）' },
  { test: (pw: string) => /[a-z]/.test(pw), text: '包含小寫字母（a-z）' },
]

// ── Password strength helper ──────────────────────────────────
// Criteria (max score = 6):
//  +1 length > 8   +1 length >= 10
//  +1 uppercase    +1 lowercase   +1 digit   +1 special
// 非常強 unlocks at score >= 4
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length > 8)            score++
  if (pw.length >= 10)          score++
  if (/[A-Z]/.test(pw))        score++
  if (/[a-z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: '強度太弱', color: 'bg-red-500' }
  if (score <= 2) return { score, label: '普通',     color: 'bg-yellow-500' }
  if (score <= 3) return { score, label: '不錯',     color: 'bg-blue-400' }
  return               { score, label: '非常強',   color: 'bg-green-500' }  // score >= 4
}

// ── Input field component ─────────────────────────────────────
interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  animDelay?: string
  rightSlot?: React.ReactNode
  validationState?: ValidationState
  hintText?: string
}
function Field({ label, animDelay, rightSlot, className, validationState = 'none', hintText, ...props }: FieldProps) {
  return (
    <div className="auth-field-in" style={{ animationDelay: animDelay ?? '0ms' }}>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          className={cn(
            'w-full px-4 py-3 rounded-xl text-sm transition-all duration-200',
            'bg-white/5 border text-foreground placeholder:text-muted-foreground/30',
            'focus:outline-none focus:ring-2 focus:bg-white/8',
            'hover:border-white/20',
            // Validation-aware border + ring (no overlap)
            validationState === 'error'
              ? 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/30'
              : validationState === 'success'
              ? 'border-green-500/60 focus:border-green-500/60 focus:ring-green-500/30'
              : 'border-white/10 focus:border-primary/40 focus:ring-primary/50',
            rightSlot && 'pr-11',
            className
          )}
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightSlot}
          </div>
        )}
      </div>
      {/* Hint text below field */}
      {hintText && (
        <p className={cn(
          'flex items-center gap-1 text-xs mt-1.5 font-medium',
          validationState === 'error'   ? 'text-red-400'   : 'text-green-400'
        )}>
          {validationState === 'error'
            ? <AlertCircle  className="w-3 h-3 shrink-0" />
            : <CheckCircle2 className="w-3 h-3 shrink-0" />
          }
          {hintText}
        </p>
      )}
    </div>
  )
}

// ── Alert banner component ────────────────────────────────────
function AlertBanner({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
  const isError = type === 'error'
  return (
    <div className={cn(
      'flex items-start gap-2.5 p-3.5 rounded-xl text-sm border mb-4',
      isError
        ? 'bg-red-500/10 border-red-500/20 text-red-400'
        : 'bg-green-500/10 border-green-500/20 text-green-400'
    )}>
      {isError
        ? <AlertCircle  className="w-4 h-4 mt-0.5 shrink-0" />
        : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
      }
      <span>{children}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode]               = useState<AuthMode>('login')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [username, setUsername]       = useState('')
  const [inviteCode, setInviteCode]   = useState('')
  const [inviteCodeStatus, setInviteCodeStatus] = useState<'none' | 'checking' | 'valid' | 'invalid'>('none')
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [isLoading, setIsLoading]     = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState<string | null>(null)
  const [isShaking, setIsShaking]     = useState(false)
  const [isRegisterSuccess, setIsRegisterSuccess] = useState(false)

  // Rate limiting
  const [failCount, setFailCount]         = useState(0)
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null)
  const [cooldownSec, setCooldownSec]     = useState(0)

  // Animated mode key — triggers re-mount of form fields on tab switch
  const [formKey, setFormKey] = useState(0)

  const formRef = useRef<HTMLFormElement>(null)

  // ── Live cooldown countdown ─────────────────────────────────
  useEffect(() => {
    if (!cooldownUntil) return
    const tick = () => {
      const remaining = Math.ceil((cooldownUntil.getTime() - Date.now()) / 1000)
      if (remaining <= 0) { setCooldownUntil(null); setCooldownSec(0) }
      else                { setCooldownSec(remaining) }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [cooldownUntil])

  // ── Debounced real-time invite code check ───────────────────────
  useEffect(() => {
    if (mode !== 'register') return
    const code = inviteCode.trim()
    if (!code) {
      setInviteCodeStatus('none')
      return
    }

    setInviteCodeStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await (supabase
          .from('invite_codes') as any)
          .select('*')
          .eq('code', code.toUpperCase())
          .single()

        if (error || !data) {
          setInviteCodeStatus('invalid')
          return
        }

        const now = new Date()
        const isExpired = data.expires_at && new Date(data.expires_at) < now
        const isMaxed = data.uses_count >= data.max_uses

        if (!data.is_active || isExpired || isMaxed) {
          setInviteCodeStatus('invalid')
        } else {
          setInviteCodeStatus('valid')
        }
      } catch {
        setInviteCodeStatus('invalid')
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [inviteCode, mode])

  // ── Mode switch ─────────────────────────────────────────────
  const switchMode = useCallback((m: AuthMode) => {
    setMode(m)
    setError(null)
    setSuccess(null)
    setPassword('')
    setConfirmPw('')
    setUsername('')
    setInviteCode('')
    setInviteCodeStatus('none')
    setIsRegisterSuccess(false)
    setFormKey(k => k + 1)
  }, [])

  // ── Shake on error ──────────────────────────────────────────
  const triggerShake = useCallback(() => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 450)
  }, [])

  const setErrorWithShake = useCallback((msg: string) => {
    setError(msg)
    triggerShake()
  }, [triggerShake])

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === 'login' && cooldownUntil && new Date() < cooldownUntil) {
      setErrorWithShake(`登入失敗次數過多，請等待 ${cooldownSec} 秒後再試`)
      return
    }

    // ── 自訂欄位驗證（取代瀏覽器原生 popup）──
    if (!email.trim()) {
      setErrorWithShake('請輸入電子郵件')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorWithShake('請輸入有效的電子郵件格式')
      return
    }
    if (mode !== 'forgot' && !password) {
      setErrorWithShake('請輸入密碼')
      return
    }

    if (mode === 'register') {
      // Hard requirement check
      const failedReq = PW_REQS.find(r => !r.test(password))
      if (failedReq) {
        setErrorWithShake(`密碼需符合：${failedReq.text}`)
        return
      }
      if (password !== confirmPw) {
        setErrorWithShake('兩次輸入的密碼不一致')
        return
      }
    }

    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { 
              username: username || email.split('@')[0],
              invite_code: inviteCode.trim()
            } 
          },
        })
        if (error) throw error
        setIsRegisterSuccess(true)

      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        })
        if (error) throw error
        setSuccess('重設密碼連結已寄送至您的信箱，請查收。')

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          const newCount = failCount + 1
          setFailCount(newCount)
          if (newCount >= 5) { setCooldownUntil(new Date(Date.now() + 30000)); setFailCount(0) }
          throw error
        }
        setFailCount(0)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '發生錯誤，請再試一次'
      if (msg.includes('Invalid login credentials'))   setErrorWithShake('電子郵件或密碼不正確')
      else if (msg.includes('Email not confirmed'))    setErrorWithShake('請先確認您的電子郵件')
      else if (msg.includes('User already registered')) setErrorWithShake('此電子郵件已被註冊')
      else if (msg.includes('Password should be'))     setErrorWithShake('密碼至少需要 8 個字元')
      else setErrorWithShake(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const pwStrength = getPasswordStrength(password)

  // Confirm password validation state
  const confirmValidation: ValidationState =
    !confirmPw ? 'none' :
    password !== confirmPw ? 'error' : 'success'

  const confirmHint =
    confirmPw && password !== confirmPw ? '兩次密碼不一致' :
    confirmPw && password === confirmPw ? '密碼一致' : undefined

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4 relative overflow-hidden">

      {/* ── Animated ambient blobs ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="auth-blob-1 absolute top-[-15%] left-[-8%] w-[560px] h-[560px] rounded-full opacity-[0.18] blur-[110px]"
          style={{ background: 'hsl(267, 100%, 72%)' }}
        />
        <div
          className="auth-blob-2 absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.14] blur-[100px]"
          style={{ background: 'hsl(220, 100%, 65%)' }}
        />
        <div
          className="auth-blob-3 absolute top-[40%] right-[20%] w-[260px] h-[260px] rounded-full opacity-[0.08] blur-[80px]"
          style={{ background: 'hsl(300, 80%, 65%)' }}
        />
      </div>

      {/* ── Subtle grid noise ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="w-full max-w-[420px] relative z-10">

        {/* ── Logo ── */}
        <div className="auth-logo-in text-center mb-8">
          <div className="inline-flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, hsl(267, 100%, 65%), hsl(220, 100%, 60%))',
                boxShadow: '0 0 32px rgba(160, 80, 255, 0.4), 0 0 64px rgba(160, 80, 255, 0.15)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              <Sparkles className="w-7 h-7 text-white relative z-10" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-foreground">Somniloq</span>
              <p className="text-muted-foreground text-xs mt-0.5">沉浸式 AI 角色對話平台</p>
            </div>
          </div>
        </div>

        {/* ── Card ── */}
        <div
          className={cn(
            'auth-card-in relative',
            'bg-card/60 backdrop-blur-3xl rounded-[28px] border border-white/10',
            'shadow-[0_32px_80px_rgba(0,0,0,0.35)]',
            'p-7 md:p-8 overflow-hidden'
          )}
        >
          {/* Card inner gradient overlay only — no h-px line */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none rounded-[28px]" />

          {isRegisterSuccess ? (
            /* ── 精緻的信箱驗證專屬畫面 ── */
            <div className="relative z-10 text-center py-4 space-y-6 auth-card-in">
              <div className="w-16 h-16 rounded-[22px] bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shadow-lg shadow-primary/10">
                <Mail className="w-8 h-8 text-primary animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-foreground tracking-tight">已寄送驗證電子郵件</h3>
                <p className="text-xs text-muted-foreground leading-relaxed px-2">
                  我們已發送了一封確認信件至您的信箱：<br />
                  <strong className="text-foreground font-semibold block mt-1 select-all">{email}</strong>
                </p>
                {inviteCode.trim() && inviteCodeStatus === 'valid' ? (
                  <div className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] leading-relaxed text-left">
                    ✨ <strong>邀請碼已成功驗證！</strong> 點擊信中的確認連結後，您的帳號將會**直接啟用**，隨即可正常登入並解鎖所有聊天功能。
                  </div>
                ) : (
                  <div className="mt-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[11px] leading-relaxed text-left">
                    💡 點擊信中的確認連結後即可正常登入。您的帳號預設為待啟用狀態，登入後可隨時補填邀請碼解鎖全站聊天功能。
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-3 rounded-full text-xs font-black text-white hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-primary/25"
                  style={{
                    background: 'linear-gradient(135deg, hsl(267, 70%, 42%), hsl(244, 60%, 38%))',
                  }}
                >
                  我知道了，前往登入
                </button>
              </div>
            </div>
          ) : (
            /* ── 原有登入/註冊/忘記密碼表單 ── */
            <>
              {/* ── Tabs (login / register) ── */}
              {mode !== 'forgot' && (
                <div className="relative z-10 flex gap-1 mb-6 bg-black/20 rounded-xl p-1 border border-white/[0.06]">
                  {(['login', 'register'] as AuthMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => switchMode(m)}
                      className={cn(
                        'flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200',
                        mode === m
                          ? 'bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                      )}
                    >
                      {m === 'login' ? '登入' : '註冊'}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Forgot password header ── */}
              {mode === 'forgot' && (
                <div className="relative z-10 mb-6 auth-field-in">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    返回登入
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-bold text-foreground text-sm">重設密碼</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">輸入您的信箱，我們將發送重設連結</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Alerts ── */}
              {error   && <AlertBanner type="error">{error}</AlertBanner>}
              {success && <AlertBanner type="success">{success}</AlertBanner>}

              {/* ── Cooldown progress bar ── */}
              {cooldownUntil && cooldownSec > 0 && (
                <div className="mb-4 space-y-1.5 auth-field-in">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>冷卻中，請稍候</span>
                    <span className="font-mono text-red-400">{cooldownSec}s</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-red-500/60 rounded-full"
                      style={{ width: `${(cooldownSec / 30) * 100}%`, transition: 'width 1s linear' }}
                    />
                  </div>
                </div>
              )}

              {/* ── Form ── */}
              <form
                key={formKey}
                ref={formRef}
                onSubmit={handleSubmit}
                noValidate
                className={cn('space-y-4 relative z-10', isShaking && 'auth-shake')}
              >
                {/* Username — register only */}
                {mode === 'register' && (
                  <Field
                    id="auth-username"
                    label="使用者名稱"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="你的暱稱"
                    animDelay="0ms"
                  />
                )}

                {/* Email */}
                <Field
                  id="auth-email"
                  label="電子郵件"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  animDelay={mode === 'register' ? '40ms' : '0ms'}
                  rightSlot={
                    <Mail className="w-4 h-4 text-muted-foreground/40 pointer-events-none" />
                  }
                />

                {/* Password — not in forgot mode */}
                {mode !== 'forgot' && (
                  <div className="space-y-2">
                    <Field
                      id="auth-password"
                      label="密碼"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      animDelay={mode === 'register' ? '80ms' : '40ms'}
                      rightSlot={
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />

                    {/* Password strength meter + requirements — register only */}
                    {mode === 'register' && password.length > 0 && (
                      <div className="space-y-2 px-0.5 auth-field-in">
                        {/* 5 bars (score 0-6 mapped to 0-5) */}
                        <div className="flex gap-1.5 w-full">
                          {Array.from({ length: 5 }, (_, i) => i + 1).map(i => (
                            <div
                              key={i}
                              className={cn(
                                'h-1.5 flex-1 rounded-full transition-all duration-300',
                                i <= Math.min(pwStrength.score, 5)
                                  ? pwStrength.color
                                  : 'bg-white/15'
                              )}
                            />
                          ))}
                        </div>
                        {pwStrength.label && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground/50">密碼強度</span>
                            <span className={cn(
                              'text-[10px] font-semibold',
                              pwStrength.score <= 1 ? 'text-red-400' :
                              pwStrength.score <= 2 ? 'text-yellow-400' :
                              pwStrength.score <= 3 ? 'text-blue-400' : 'text-green-400'
                            )}>
                              {pwStrength.label}
                            </span>
                          </div>
                        )}
                        {/* Hard requirements checklist */}
                        <div className="space-y-1 pt-0.5">
                          {PW_REQS.map(({ test, text }) => {
                            const ok = test(password)
                            return (
                              <div key={text} className={cn(
                                'flex items-center gap-1.5 text-[11px] transition-colors duration-200',
                                ok ? 'text-green-400' : 'text-muted-foreground/50'
                              )}>
                                {ok
                                  ? <CheckCircle2 className="w-3 h-3 shrink-0" />
                                  : <div className="w-3 h-3 rounded-full border border-white/25 shrink-0" />
                                }
                                {text}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Confirm password — register only */}
                {mode === 'register' && (
                  <Field
                    id="auth-confirm-password"
                    label="確認密碼"
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    animDelay="120ms"
                    validationState={confirmValidation}
                    hintText={confirmHint}
                    rightSlot={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(v => !v)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showConfirmPw ? '隱藏密碼' : '顯示密碼'}
                      >
                        {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                )}

                {/* Invite code — register only */}
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <Field
                      id="auth-invite-code"
                      label="邀請碼 (選填)"
                      type="text"
                      value={inviteCode}
                      onChange={e => setInviteCode(e.target.value)}
                      placeholder="輸入邀請碼以直接啟用帳號"
                      animDelay="140ms"
                      validationState={
                        inviteCodeStatus === 'valid' ? 'success' :
                        inviteCodeStatus === 'invalid' ? 'error' : 'none'
                      }
                      hintText={
                        inviteCodeStatus === 'checking' ? '正在驗證邀請碼...' :
                        inviteCodeStatus === 'valid' ? '此邀請碼有效，註冊後將直接啟用！' :
                        inviteCodeStatus === 'invalid' ? '邀請碼無效、已過期或已達次數上限' : undefined
                      }
                    />
                  </div>
                )}

                {/* Forgot password link — login mode only */}
                {mode === 'login' && (
                  <div className="text-right -mt-2">
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      忘記密碼？
                    </button>
                  </div>
                )}

                {/* Submit button */}
                <button
                  id="auth-submit"
                  type="submit"
                  disabled={isLoading || (!!cooldownUntil && cooldownSec > 0)}
                  className={cn(
                    'relative w-full py-3.5 rounded-full text-sm font-bold transition-all duration-300 overflow-hidden',
                    'text-white',
                    'hover:scale-[1.01] active:scale-[0.98]',
                    'disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100',
                  )}
                  style={{
                    background: 'linear-gradient(135deg, hsl(267, 70%, 42%), hsl(244, 60%, 38%))',
                    boxShadow: '0 0 24px rgba(120, 60, 220, 0.35)',
                  }}
                >
                  {/* Hover shimmer — no visible line at rest */}
                  <span
                    className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(135deg, hsl(267, 80%, 50%), hsl(244, 70%, 44%))' }}
                  />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> 處理中...</>
                      : mode === 'login'    ? '登入'
                      : mode === 'register' ? '建立帳號'
                      : '發送重設連結'
                    }
                  </span>
                </button>
              </form>

              {/* ── Footer note ── */}
              {mode === 'register' && (
                <p className="relative z-10 mt-5 text-[11px] text-muted-foreground/40 text-center leading-relaxed">
                  若無邀請碼亦可直接註冊，<br />登入後可隨時填寫代碼或由管理員啟用。
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Bottom label ── */}
        <div className="mt-6 text-center">
          <p className="text-[10px] text-muted-foreground/25 tracking-widest uppercase">
            Powered by Somniloq AI
          </p>
        </div>
      </div>
    </div>
  )
}
