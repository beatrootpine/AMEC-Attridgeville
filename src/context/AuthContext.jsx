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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) await checkAdmin(u.id)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) await checkAdmin(u.id)
      else setIsAdmin(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
