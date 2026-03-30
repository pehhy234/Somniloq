import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types'
import { logger } from '@/lib/logger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

logger.log('[Supabase] Initializing client...')

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

logger.log('[Supabase] Client ready.')

export default supabase
