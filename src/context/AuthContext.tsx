import { apiFetch } from '../lib/api'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface User { id: string; name: string; avatarUrl: string | null; isAdmin?: boolean; bio?: string; username?: string }

interface AuthCtx {
  user: User | null
  loading: boolean
  loginWithGoogle: () => void
  loginWithPassword: (email: string, password: string) => Promise<string | null>
  register: (name: string, email: string, password: string, username?: string) => Promise<string | null>
  updateProfile: (name: string, bio?: string, username?: string) => Promise<string | null>
  updateAvatar: (file: File) => Promise<string | null>
  deleteAvatar: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(u => { setUser(u); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const loginWithGoogle = () => { window.location.href = `${import.meta.env.VITE_API_URL}/auth/google` }

  const loginWithPassword = async (email: string, password: string) => {
    const r = await apiFetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const data = await r.json()
    if (!r.ok) return data.error as string
    setUser(data); return null
  }

  const register = async (name: string, email: string, password: string, username?: string) => {
    const r = await apiFetch('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, username }) })
    const data = await r.json()
    if (!r.ok) return data.error as string
    setUser(data); return null
  }

  const updateProfile = async (name: string, bio?: string, username?: string) => {
    const r = await apiFetch('/auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, bio, username }) })
    const data = await r.json()
    if (!r.ok) return data.error as string
    setUser(data); return null
  }

  const updateAvatar = async (file: File) => {
    const form = new FormData()
    form.append('avatar', file)
    const r = await apiFetch('/auth/avatar', { method: 'POST', body: form })
    const data = await r.json()
    if (!r.ok) return data.error as string
    setUser(data); return null
  }
  const logout = () => apiFetch('/auth/logout', { method: 'POST' }).then(() => setUser(null))

  const deleteAvatar = async () => {
    const r = await apiFetch('/auth/avatar', { method: 'DELETE' })
    if (r.ok) { const u = await r.json(); setUser(u) }
  }

  return <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithPassword, register, updateProfile, updateAvatar, deleteAvatar, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
