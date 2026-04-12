import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Data client — no auth, no session, no locks
export const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Auth client — separate instance for login only
export const authClient = createClient(url, key, {
  auth: {
    storageKey: 'amec-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
