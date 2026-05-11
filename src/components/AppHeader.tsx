import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { ChevronLeft, Sun, Moon, Bell } from 'lucide-react'

interface Props {
  title?: string
  back?: boolean | string
  right?: React.ReactNode
}

export default function AppHeader({ title, back, right }: Props) {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { user } = useAuth()

  function handleBack() {
    if (typeof back === 'string') navigate(back)
    else navigate(-1)
  }

  return (
    <header style={{
      display: 'flex', alignItems: 'center',
      padding: '0 4px', height: 52,
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* 左：戻るorロゴ */}
      <div style={{ width: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {back !== undefined ? (
          <button onClick={handleBack}
            style={{ background: 'none', border: 'none', padding: 8, borderRadius: 8, color: 'var(--text)', display: 'flex' }}>
            <ChevronLeft size={22} />
          </button>
        ) : (
          <button onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', padding: '4px 8px', fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: 15, color: 'var(--accent)' }}>
            QS⚡
          </button>
        )}
      </div>

      {/* 中央：タイトル */}
      <div style={{ flex: 1, textAlign: 'center' }}>
        {title && (
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{title}</span>
        )}
      </div>

      {/* 右：カスタム or デフォルト */}
      <div style={{ width: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, gap: 4 }}>
        {right ?? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={toggle}
              style={{ background: 'none', border: 'none', padding: 8, borderRadius: 8, color: 'var(--muted)', display: 'flex' }}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
