import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { Bell } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { ChevronLeft, Sun, Moon } from 'lucide-react'

interface Props {
  title?: string
  back?: boolean | string
  right?: React.ReactNode
  left?: React.ReactNode
}

export default function AppHeader({ title, back, right, left }: Props) {
  const isPC = typeof window !== 'undefined' && window.innerWidth >= 768
  // PCはPCNavがあるのでロゴだけのAppHeaderは非表示
  if (isPC && !title && back === undefined && !left && !right) return null
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    if (!user) return
    apiFetch('/api/notifications/unread').then(r => r.ok ? r.json() : {count:0}).then(d => setUnread(d.count ?? 0)).catch(() => {})
    const t = setInterval(() => {
      apiFetch('/api/notifications/unread').then(r => r.ok ? r.json() : {count:0}).then(d => setUnread(d.count ?? 0)).catch(() => {})
    }, 30000)
    return () => clearInterval(t)
  }, [user])

  function handleBack() {
    if (typeof back === 'string') navigate(back)
    else navigate(-1)
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      height: 56,
      padding: '0 12px',
    }}>
      {/* 左 */}
      <div style={{ width: 120, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {left ?? (back !== undefined ? (
          <button onClick={handleBack}
            style={{ background: 'none', border: 'none', padding: '8px 4px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            <ChevronLeft size={22} />
          </button>
        ) : (
          <button onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: 16, letterSpacing: 1 }}>
              <span style={{ color: 'var(--accent)' }}>Quiz</span><span style={{ color: 'var(--text)' }}>Spark</span>
            </span>
            <span style={{ fontSize: 16 }}>⚡</span>
          </button>
        ))}
      </div>

      {/* 中央 */}
      <div style={{ flex: 1, textAlign: 'center' }}>
        {title && <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{title}</span>}
      </div>

      {/* 右 */}
      <div style={{ width: 120, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
        {right ?? (
          <div style={{ display:'flex', alignItems:'center', gap:2 }}>
            {user && (
              <button onClick={() => navigate('/notifications')}
                style={{ background:'none', border:'none', padding:8, color:'var(--muted)', display:'flex', cursor:'pointer', position:'relative' }}>
                <Bell size={18} />
                {unread > 0 && (
                  <span style={{ position:'absolute', top:4, right:4, width:8, height:8, borderRadius:'50%', background:'var(--buzz)' }} />
                )}
              </button>
            )}
            <button onClick={toggle}
              style={{ background:'none', border:'none', padding:8, color:'var(--muted)', display:'flex', cursor:'pointer' }}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
