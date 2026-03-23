import { NavLink, useLocation } from 'react-router-dom'
import { MessageSquare, Compass, PlusCircle, User, Sparkles, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const getNavItems = (isAdmin: boolean) => [
  { to: '/chat', icon: MessageSquare, label: '對話', end: false, protected: true },
  { to: '/', icon: Compass, label: '大廳', end: true, protected: false },
  { to: '/create', icon: PlusCircle, label: '創造', end: false, protected: true },
  { to: '/profile', icon: User, label: '我的', end: false, protected: true },
  ...(isAdmin ? [{ to: '/admin', icon: Shield, label: '管理', end: false, protected: true }] : [])
]

// ── Mobile bottom tab bar ──────────────────────────────────────
export function MobileNav() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth()
  const location = useLocation()
  const navItems = getNavItems(isAdmin)

  if (location.pathname.startsWith('/room')) return null

  return (
    <nav 
      className="fixed left-1/2 -translate-x-1/2 z-[100] md:hidden w-[96%] max-w-[400px]"
      style={{ bottom: 'calc(max(env(safe-area-inset-bottom), 0px) + 2px)' }}
    >
      <div className="glass-dark bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[28px] shadow-2xl shadow-primary/10 flex items-center justify-around px-1 py-1 relative overflow-hidden">
        {/* Glow effect at the bottom of the pill */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-1/2 h-8 bg-primary/20 blur-xl rounded-full pointer-events-none" />
        {navItems.map(({ to, icon: Icon, label, end, protected: isProtected }) => {
          const dest = isProtected && !isAuthenticated && !isLoading ? '/auth' : to
          return (
            <NavLink
              key={to}
              to={dest}
              end={end}
              id={`mobile-nav-${label}`}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-[20px] transition-all duration-300 relative z-10',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn('w-5 h-5 transition-transform duration-200', isActive && 'scale-110')}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className="text-[10px] font-bold tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

// ── Desktop side navigation ───────────────────────────────────
export function DesktopNav() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth()
  const location = useLocation()
  const navItems = getNavItems(isAdmin)

  if (location.pathname.startsWith('/room')) return null

  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-50 w-[72px] hover:w-[220px] bg-background/95 backdrop-blur-3xl border-r border-border/50 transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden group shadow-[4px_0_32px_-12px_rgba(0,0,0,0.7)]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3.5 py-5 mb-2">
        <div
          className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, hsl(267, 100%, 72%), hsl(220, 100%, 65%))' }}
        >
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-75">
          Somniloq
        </span>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-1 px-2 flex-1">
        {navItems.map(({ to, icon: Icon, label, end, protected: isProtected }) => {
          const dest = isProtected && !isAuthenticated && !isLoading ? '/auth' : to
          return (
            <NavLink
              key={to}
              to={dest}
              end={end}
              id={`desktop-nav-${label}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-4 px-3 py-3 rounded-[18px] transition-all duration-300 min-w-0 mx-1',
                  isActive
                    ? 'bg-primary/15 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                    : 'text-foreground/70 hover:bg-accent/50 hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn('w-5 h-5 shrink-0 transition-all duration-300', isActive && 'drop-shadow-[0_0_8px_rgba(168,85,247,0.4)] scale-110')}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className="text-sm font-bold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
