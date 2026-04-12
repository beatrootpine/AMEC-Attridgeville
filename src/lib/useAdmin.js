import { useState, useEffect } from 'react'
import { authClient, supabase } from './supabase'

export function useAdmin() {
  const [state, setState] = useState({ user: null, isAdmin: false, loading: true })

  useEffect(() => {
    let dead = false
    const timer = setTimeout(() => { if (!dead) setState(s => ({ ...s, loading: false })) }, 3000)

    authClient.auth.getSession().then(async ({ data }) => {
      if (dead) return
      const user = data?.session?.user
      if (!user) { setState({ user: null, isAdmin: false, loading: false }); return }
      try {
        const { data: admin } = await supabase.from('admins').select('id').eq('user_id', user.id).maybeSingle()
        if (!dead) setState({ user, isAdmin: !!admin, loading: false })
      } catch {
        if (!dead) setState({ user, isAdmin: false, loading: false })
      }
    }).catch(() => {
      if (!dead) setState({ user: null, isAdmin: false, loading: false })
    })

    return () => { dead = true; clearTimeout(timer) }
  }, [])

  return state
}

export async function adminSignIn(email, password) {
  const { data, error } = await authClient.auth.signInWithPassword({ email, password })
  if (error) throw error
  // Check admin
  const { data: admin } = await supabase.from('admins').select('id').eq('user_id', data.user.id).maybeSingle()
  if (!admin) {
    await authClient.auth.signOut()
    throw new Error('This account is not registered as an admin')
  }
  return data
}

export async function adminSignOut() {
  await authClient.auth.signOut()
}
