import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkAdmin = async (userId) => {
    if (!userId) { setIsAdmin(false); return }
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', userId)
        .single()
      setIsAdmin(!error && !!data)
    } catch {
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        // If there's an error getting the session, clear the stale token
        if (error) {
          console.warn('Clearing stale auth session:', error.message)
          await supabase.auth.signOut()
          if (mounted) { setUser(null); setIsAdmin(false); setLoading(false) }
          return
        }

        const u = session?.user ?? null
        if (mounted) {
          setUser(u)
          if (u) await checkAdmin(u.id)
          setLoading(false)
        }
      } catch (err) {
        console.warn('Auth init error:', err)
        // Nuclear option — clear everything
        try { await supabase.auth.signOut() } catch {}
        if (mounted) { setUser(null); setIsAdmin(false); setLoading(false) }
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      if (u) await checkAdmin(u.id)
      else setIsAdmin(false)
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
