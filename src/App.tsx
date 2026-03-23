import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/uiStore'
import { MobileNav, DesktopNav } from '@/components/NavBar'
import AuthPage from '@/pages/Auth'
import LobbyPage from '@/pages/Lobby'
import ChatPage from '@/pages/Chat'
import ChatRoomPage from '@/pages/ChatRoom'
import CreatePage from '@/pages/Create'
import ProfilePage from '@/pages/Profile'
import AdminPage from '@/pages/Admin'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
    },
  },
})

// ── Auth guard ────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

// ── Main layout (with nav) ────────────────────────────────────
function AppLayout() {
  const { isAuthenticated, isLoading, isActive, profile, profileError, signOut, refreshProfile } = useAuth()
  const location = useLocation()
  const isRoom = location.pathname.startsWith('/room')

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Profile fetch failed completely (network error etc)
  if (isAuthenticated && profile === null) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-6 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">無法載入個人檔案</h2>
        <p className="text-muted-foreground mt-2 max-w-sm">
          請檢查網路連線後重試。<br/>
          <span className="text-red-400 text-xs mt-2 block break-words">
            錯誤訊息: {profileError || '尚未知曉'}
          </span>
        </p>
        <div className="flex gap-3 mt-4">
          <button onClick={refreshProfile} className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">重試</button>
          <button onClick={signOut} className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-accent transition-all">登出</button>
        </div>
      </div>
    )
  }

  // Blocking inactive accounts (prevents routing loops)
  if (isAuthenticated && !isActive) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-muted border border-border">
          <Loader2 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">帳號尚未啟用</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            您的帳號已經註冊成功，但尚未獲得管理員啟用。請聯繫管理員為您開通權限。
          </p>
        </div>
        <button
          onClick={signOut}
          className="px-4 py-2 mt-4 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-accent transition-all"
        >
          登出
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Nav always visible */}
      <DesktopNav />
      <MobileNav />
      {/* Content area – offset for desktop nav, padding-bottom for mobile nav */}
      <main className={cn(
        "min-h-dvh transition-all duration-300",
        !isRoom && "md:ml-[60px] pb-20 md:pb-0"
      )}>
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/auth" element={
            isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />
          } />
          <Route path="/chat" element={
            <ProtectedRoute><ChatPage /></ProtectedRoute>
          } />
          <Route path="/chat/:conversationId" element={
            <ProtectedRoute><ChatPage /></ProtectedRoute>
          } />
          <Route path="/room/:conversationId" element={
            <ProtectedRoute><ChatRoomPage /></ProtectedRoute>
          } />
          <Route path="/create" element={
            <ProtectedRoute><CreatePage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute><AdminPage /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

// ── App root ──────────────────────────────────────────────────
function AppContent() {
  const { darkMode } = useUIStore()

  // Apply theme class on mount
  useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode)
  }, [darkMode])

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
