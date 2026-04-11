import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkAdmin = async (userId) => {
    if (!userId) return false
    try {
      const { data } = await supabase.from('admins').select('id').eq('user_id', userId).single()
      return !!data
    } catch { return false }
  }

  useEffect(() => {
    let mounted = true

    // Force loading to end after 5 seconds no matter what
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth timeout — forcing load')
        setLoading(false)
      }
    }, 5000)

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) {
          if (mounted) { setUser(null); setIsAdmin(false); setLoading(false) }
          return
        }
        const admin = await checkAdmin(session.user.id)
        if (mounted) { setUser(session.user); setIsAdmin(admin); setLoading(false) }
      } catch {
        if (mounted) { setUser(null); setIsAdmin(false); setLoading(false) }
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        const admin = await checkAdmin(session.user.id)
        setIsAdmin(admin)
      } else {
        setUser(null)
        setIsAdmin(false)
      }
    })

    return () => { mounted = false; subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setIsAdmin(false) }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
