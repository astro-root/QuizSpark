import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface User { id: string; name: string; avatarUrl: string | null }

interface AuthCtx {
  user: User | null
  loading: boolean
  loginWithGoogle: () => void
  loginWithPassword: (email: string, password: string) => Promise<string | null>
  register: (name: string, email: string, password: string) => Promise<string | null>
  logout: () => void
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(u => { setUser(u); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const loginWithGoogle = () => { window.location.href = '/auth/google' }

  const loginWithPassword = async (email: string, password: string) => {
    const r = await fetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const data = await r.json()
    if (!r.ok) return data.error as string
    setUser(data); return null
  }

  const register = async (name: string, email: string, password: string) => {
    const r = await fetch('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) })
    const data = await r.json()
    if (!r.ok) return data.error as string
    setUser(data); return null
  }

  const logout = () => fetch('/auth/logout', { method: 'POST' }).then(() => setUser(null))

  return <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithPassword, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
