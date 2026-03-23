import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/stores/uiStore'
import { Moon, Sun, LogOut, User } from 'lucide-react'

export default function ProfilePage() {
  const { profile, signOut } = useAuth()
  const { darkMode, toggleDarkMode } = useUIStore()

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      {/* Profile card */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, hsl(267, 100%, 72%), hsl(240, 100%, 65%))' }}
          >
            {profile?.username?.charAt(0)?.toUpperCase() ?? <User className="w-7 h-7" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{profile?.username ?? '使用者'}</h2>
            <p className="text-sm text-muted-foreground">{profile?.id?.slice(0, 8)}...</p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">系統設定</h3>
        </div>
        <div className="p-1">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
              <span className="text-sm text-foreground">深色模式</span>
            </div>
            <button
              id="dark-mode-toggle"
              onClick={toggleDarkMode}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${darkMode ? 'bg-primary' : 'bg-muted'}`}
              aria-label="切換深色模式"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${darkMode ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="glass rounded-2xl overflow-hidden">
        <button
          id="sign-out-btn"
          onClick={signOut}
          className="w-full flex items-center gap-3 px-5 py-4 text-red-400 hover:bg-red-500/10 transition-colors rounded-2xl"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">登出</span>
        </button>
      </div>
    </div>
  )
}
