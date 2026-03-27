import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  profileError: string | null
  isLoading: boolean
  isAuthenticated: boolean
  isActive: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        // If it's a "No rows found" error, we handle it as profile=null rather than a failure
        if (error.code === 'PGRST116') {
          console.warn('Profile not found for user:', userId)
          setProfile(null)
          setProfileError(null)
        } else {
          console.error('Error loading profile:', error)
          setProfileError(error.message)
          setProfile(null)
        }
      } else {
        setProfileError(null)
        setProfile(data)
      }
    } catch (err: any) {
      console.error('Profile load exception:', err)
      setProfileError(err.message || 'Unknown error')
      setProfile(null)
    }
  }

  const refreshProfile = async () => {
    if (!user) return
    setIsLoading(true)
    await loadProfile(user.id)
    setIsLoading(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    setProfileError(null)
  }

  useEffect(() => {
    let mounted = true

    // Safety timeout for the loading state
    const timeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        setIsLoading(false)
        setProfileError(prev => prev || '連線逾時 (Timeout)')
      }
    }, 15000)

    const handleAuthEvent = async (event: string, currentSession: Session | null) => {
      if (!mounted) return

      // Handle events that set or update the user session
      switch (event) {
        case 'INITIAL_SESSION':
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          setSession(currentSession)
          setUser(currentSession?.user ?? null)
          if (currentSession?.user) {
            await loadProfile(currentSession.user.id)
          } else {
            setProfile(null)
          }
          break
        case 'SIGNED_OUT':
          setSession(null)
          setUser(null)
          setProfile(null)
          setProfileError(null)
          break
      }

      if (mounted) {
        setIsLoading(false)
        clearTimeout(timeoutId)
      }
    }

    // Relying on onAuthStateChange INITIAL_SESSION event to establish early state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthEvent(event as any, session)
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const value: AuthContextValue = {
    user,
    session,
    profile,
    profileError,
    isLoading,
    isAuthenticated: !!user,
    isActive: profile?.is_active ?? false,
    isAdmin: profile?.is_admin ?? false,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
