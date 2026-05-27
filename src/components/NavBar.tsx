import { NavLink, useLocation } from 'react-router-dom'
import { MessageSquare, Compass, PlusCircle, User, Sparkles, Shield, LogIn, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const getNavItems = (isAdmin: boolean, isDesktop = false) => {
  const items = [
    { to: '/chat', icon: MessageSquare, label: '對話', end: false, protected: true },
    { to: '/', icon: Compass, label: '大廳', end: true, protected: false },
    { to: '/create', icon: PlusCircle, label: '創造', end: false, protected: true },
    { to: '/profile', icon: User, label: '我的', end: false, protected: true },
  ]

  let sortedItems = [...items]
  
  if (isDesktop) {
    // Desktop order: 大廳 (Compass), 創造 (PlusCircle), 對話 (MessageSquare), 我的 (User)
    const desktopOrder = ['大廳', '創造', '對話', '我的']
    sortedItems = desktopOrder.map(label => items.find(i => i.label === label)!)
  }

  if (isAdmin) {
    sortedItems.push({ to: '/admin', icon: Shield, label: '管理', end: false, protected: true })
  }

  return sortedItems
}

// ── Mobile bottom tab bar ──────────────────────────────────────
export function MobileNav() {
  const { isAdmin } = useAuth()
  const location = useLocation()
  const navItems = getNavItems(isAdmin)

  if (location.pathname.startsWith('/room')) return null

  return (
    <nav 
      className="fixed left-1/2 -translate-x-1/2 z-[100] lg:hidden w-[94%] max-w-[400px]"
      style={{ bottom: 'calc(max(env(safe-area-inset-bottom), 0px) + 8px)' }}
    >
      <div className="glass-pill flex items-center justify-around px-1.5 py-1.5 relative overflow-hidden rounded-[32px]">
        {/* Glow effect at the bottom of the pill */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-1/2 h-8 bg-primary/20 blur-xl rounded-full pointer-events-none" />
        {navItems.map(({ to, icon: Icon, label, end }) => {
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              id={`mobile-nav-${label}`}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 px-3.5 rounded-2xl transition-all duration-300 relative z-10',
                  isActive ? 'text-primary bg-primary/10 border border-primary/20 shadow-lg' : 'text-muted-foreground hover:text-foreground'
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
  const { isAuthenticated, isLoading, isAdmin, user, profile, signOut } = useAuth()
  const location = useLocation()
  const navItems = getNavItems(isAdmin, true)

  if (location.pathname.startsWith('/room')) return null

  return (
    <nav className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-50 w-[80px] hover:w-[240px] bg-background/90 backdrop-blur-3xl border-r border-border transition-all duration-500 ease-[cubic-bezier(0.2,1,0.2,1)] overflow-hidden group shadow-2xl">
      {/* Logo */}
      <div className="flex items-center gap-4 px-5 py-8 mb-4">
        <div
          className="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20"
          style={{ background: 'linear-gradient(135deg, hsl(267, 100%, 72%), hsl(220, 100%, 65%))' }}
        >
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold text-foreground tracking-tight whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
          Somniloq
        </span>
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-1 px-2 flex-1">
        {navItems.map(({ to, icon: Icon, label, end }) => {
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              id={`desktop-nav-${label}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 min-w-0 mx-2',
                  isActive
                    ? 'glass-sm text-primary shadow-lg border border-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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

      {/* Desktop sidebar bottom auth area */}
      <div className="mt-auto border-t border-border/60 py-4 flex flex-col items-center gap-2 shrink-0">
        {!isLoading && (
          isAuthenticated ? (
            <div className="w-full flex flex-col gap-1">
              {/* Profile info */}
              <NavLink
                to="/profile"
                className="flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 min-w-0 mx-2 hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <div className="w-6 h-6 rounded-lg overflow-hidden shrink-0 bg-muted border border-border flex items-center justify-center shadow-inner">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                  <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                    {profile?.username || user?.email?.split('@')[0] || '使用者'}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                    {user?.email}
                  </span>
                </div>
              </NavLink>
              {/* Logout button */}
              <button
                onClick={() => signOut()}
                className="flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 min-w-0 mx-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 w-[calc(100%-16px)] cursor-pointer"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="text-xs font-bold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                  安全登出
                </span>
              </button>
            </div>
          ) : (
            <NavLink
              to="/auth"
              className="flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 min-w-0 mx-2 text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 w-[calc(100%-16px)]"
            >
              <LogIn className="w-5 h-5 shrink-0" />
              <span className="text-sm font-bold tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                會員登入
              </span>
            </NavLink>
          )
        )}
      </div>
    </nav>
  )
}
