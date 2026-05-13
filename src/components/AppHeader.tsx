import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { ChevronLeft, Sun, Moon } from 'lucide-react'

interface Props {
  title?: string
  back?: boolean | string
  right?: React.ReactNode
  left?: React.ReactNode
}

export default function AppHeader({ title, back, right, left }: Props) {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

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
          <button onClick={toggle}
            style={{ background: 'none', border: 'none', padding: 8, color: 'var(--muted)', display: 'flex', cursor: 'pointer' }}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}
      </div>
    </header>
  )
}
