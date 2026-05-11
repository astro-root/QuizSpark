import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { path: '/',        icon: '🏠', label: 'ホーム' },
  { path: '/match',   icon: '⚔️', label: '対戦' },
  { path: '/ranking', icon: '🏆', label: 'ランキング' },
  { path: '/submit',  icon: '✏️', label: '作問' },
  { path: '/profile', icon: '👤', label: 'マイページ' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user } = useAuth()
  if (!user) return null
  // ゲーム中・ロビー中は非表示
  if (pathname.includes('/room/')) return null

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {TABS.map(t => {
        const active = t.path === '/' ? pathname === '/' : pathname.startsWith(t.path)
        return (
          <button key={t.path} onClick={() => navigate(t.path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 0 6px', gap: 3,
              background: 'none',
              borderTop: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
            }}>
            <span style={{ fontSize: 22 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? 'var(--accent)' : 'var(--muted)' }}>
              {t.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
