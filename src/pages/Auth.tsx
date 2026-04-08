import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'

type AuthMode = 'login' | 'register'

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Rate Limiting States
  const [failCount, setFailCount] = useState(0)
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === 'login' && cooldownUntil && new Date() < cooldownUntil) {
      const remainSec = Math.ceil((cooldownUntil.getTime() - Date.now()) / 1000)
      setError(`登入失敗次數過多，請等待 ${remainSec} 秒後再試`)
      return
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
            data: { username: username || email.split('@')[0] },
          },
        })
        if (error) throw error
        setSuccess('註冊成功！請等待管理員啟用您的帳號後即可登入。')
        setMode('login')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          const newCount = failCount + 1
          setFailCount(newCount)
          if (newCount >= 5) {
            setCooldownUntil(new Date(Date.now() + 30000)) // 30秒鎖定
            setFailCount(0)
          }
          throw error
        }
        setFailCount(0) // 成功則重置
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '發生錯誤，請再試一次'
      // Translate common Supabase errors
      if (msg.includes('Invalid login credentials')) setError('電子郵件或密碼不正確')
      else if (msg.includes('Email not confirmed')) setError('請先確認您的電子郵件')
      else if (msg.includes('User already registered')) setError('此電子郵件已被註冊')
      else if (msg.includes('Password should be')) setError('密碼至少需要 8 個字元')
      else setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{ background: 'hsl(267, 100%, 72%)' }}
        />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]"
          style={{ background: 'hsl(220, 100%, 65%)' }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, hsl(267, 100%, 72%), hsl(220, 100%, 65%))' }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">Somniloq</span>
          </div>
          <p className="text-muted-foreground text-sm">沉浸式 AI 角色對話平台</p>
        </div>

        {/* Card */}
        <div className="glass-dark bg-black/40 backdrop-blur-3xl rounded-[32px] p-8 md:p-10 shadow-[0_24px_64px_rgba(0,0,0,0.6)] border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          {/* Mode tabs */}
          <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1">
            {(['login', 'register'] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null) }}
                className={cn(
                  'flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200',
                  mode === m
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'login' ? '登入' : '註冊'}
              </button>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/20 border border-destructive/30 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-sm text-green-400">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  使用者名稱
                </label>
                <input
                  id="auth-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="你的暱稱"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl text-sm transition-all duration-300',
                    'bg-muted/60 border border-white/10 text-foreground placeholder:text-muted-foreground/40 shadow-inner',
                    'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 focus:bg-muted/80'
                  )}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                電子郵件
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className={cn(
                  'w-full px-4 py-3 rounded-xl text-sm transition-all duration-300',
                  'bg-muted/60 border border-white/10 text-foreground placeholder:text-muted-foreground/40 shadow-inner',
                  'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 focus:bg-muted/80'
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                密碼
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className={cn(
                    'w-full px-4 py-3 pr-10 rounded-xl text-sm transition-all duration-300',
                    'bg-muted/60 border border-white/10 text-foreground placeholder:text-muted-foreground/40 shadow-inner',
                    'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 focus:bg-muted/80'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="auth-submit"
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full py-4 rounded-full text-sm font-bold transition-all duration-300',
                'text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'hover:brightness-110 hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] active:scale-[0.98]'
              )}
              style={{
                background: 'linear-gradient(135deg, hsl(267, 46%, 35%), hsl(244, 52%, 31%))'
              }}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity rounded-[20px] pointer-events-none" />
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  處理中...
                </span>
              ) : mode === 'login' ? '登入' : '建立帳號'}
            </button>
          </form>

          {/* Footer note */}
          {mode === 'register' && (
            <p className="mt-4 text-xs text-muted-foreground text-center">
              此平台需管理員審核啟用帳號，<br />完成審核後即可正常使用。
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
