import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/**
 * 統一的 Auth 初始化 hook，只在 App 根層呼叫一次。
 * 負責：① 還原已有 session ② 監聽登入/登出事件
 */
export function useAuthInit() {
  const { setUser, setLoading, loadProfile } = useAuthStore()

  useEffect(() => {
    let mounted = true

    // 1. 還原已有 session（頁面重整後）
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    // 2. 監聽登入/登出事件（只設置一次）
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadProfile(session.user.id)
        }
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
