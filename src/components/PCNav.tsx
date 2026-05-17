import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Home, Trophy, MessageCircle, User, PenLine, Bell, HelpCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

export default function PCNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    const f = () => apiFetch('/api/messages/unread').then(r => r.json()).then(d => setUnread(d.count ?? 0)).catch(() => {})
    f()
    const t = setInterval(f, 15000)
    return () => clearInterval(t)
  }, [user])

  if (typeof window !== 'undefined' && window.innerWidth < 768) return null
  if (!user) return null
  if (pathname.startsWith('/room/')) return null

  const tabs = [
    { path: '/',        Icon: Home,          label: 'ホーム' },
    { path: '/ranking', Icon: Trophy,        label: 'ランキング' },
    { path: '/create',  Icon: PenLine,       label: '作問' },
    { path: '/chat',    Icon: MessageCircle, label: 'チャット', badge: unread },
    { path: '/profile', Icon: User,          label: 'マイページ' },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      height: 52, display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 4,
    }}>
      <button onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginRight: 16, padding: '4px 8px', borderRadius: 8 }}>
        <span style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: 15, letterSpacing: 1 }}>
          <span style={{ color: 'var(--accent)' }}>Quiz</span><span style={{ color: 'var(--text)' }}>Spark</span>
        </span>
        <span style={{ fontSize: 14 }}>⚡</span>
      </button>
      <div style={{ display: 'flex', gap: 2, flex: 1 }}>
        {tabs.map(t => {
          const active = t.path === '/' ? pathname === '/' : pathname.startsWith(t.path)
          const { Icon } = t
          return (
            <button key={t.path} onClick={() => navigate(t.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
                background: active ? 'var(--surface2)' : 'none', border: 'none', cursor: 'pointer',
                color: active ? 'var(--accent)' : 'var(--muted)', fontWeight: active ? 800 : 500,
                fontSize: 13, position: 'relative' }}>
              <Icon size={16} />
              {t.label}
              {(t.badge ?? 0) > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 8, width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />
              )}
            </button>
          )
        })}
      </div>
      <button onClick={() => navigate('/contact')}
        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 8, display: 'flex' }}>
        <HelpCircle size={18} />
      </button>
      <button onClick={() => navigate('/notifications')}
        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 8, display: 'flex' }}>
        <Bell size={18} />
      </button>
    </nav>
  )
}
