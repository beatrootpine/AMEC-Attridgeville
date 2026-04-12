import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    // Hard timeout — never block for more than 3 seconds
    const timeout = setTimeout(() => {
      if (mounted.current && loading) {
        setLoading(false)
      }
    }, 3000)

    // Try to get session — wrapped in Promise.race with timeout
    const sessionPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ data: { session: null }, error: 'timeout' }), 2500))

    Promise.race([sessionPromise, timeoutPromise]).then(async (result) => {
      if (!mounted.current) return
      const session = result?.data?.session
      if (session?.user) {
        setUser(session.user)
        try {
          const { data } = await supabase.from('admins').select('id').eq('user_id', session.user.id).single()
          if (mounted.current) setIsAdmin(!!data)
        } catch {}
      }
      if (mounted.current) setLoading(false)
    }).catch(() => {
      if (mounted.current) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted.current) return
      if (session?.user) {
        setUser(session.user)
        try {
          const { data } = await supabase.from('admins').select('id').eq('user_id', session.user.id).single()
          if (mounted.current) setIsAdmin(!!data)
        } catch {}
      } else {
        setUser(null)
        setIsAdmin(false)
      }
    })

    return () => {
      mounted.current = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signOut = async () => {
    try { await supabase.auth.signOut() } catch {}
    setUser(null)
    setIsAdmin(false)
  }

  // Children always render — loading only blocks ProtectedRoute
  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
