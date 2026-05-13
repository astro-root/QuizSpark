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
    }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 52,
        maxWidth: 'var(--w)',
        margin: '0 auto',
        padding: '0 4px',
      }}>
        <div style={{ width: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {left ?? (back !== undefined ? (
            <button onClick={handleBack}
              style={{ background: 'none', border: 'none', padding: 8, borderRadius: 8, color: 'var(--text)', display: 'flex' }}>
              <ChevronLeft size={22} />
            </button>
          ) : (
            <button onClick={() => navigate('/')}
              style={{ background: 'none', border: 'none', padding: '4px 8px', fontFamily: 'Orbitron,sans-serif', fontWeight: 900, fontSize: 15, color: 'var(--accent)' }}>
              QS⚡
            </button>
          ))}
        </div>

        <div style={{ flex: 1, textAlign: 'center' }}>
          {title && <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{title}</span>}
        </div>

        <div style={{ width: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {right ?? (
            <button onClick={toggle}
              style={{ background: 'none', border: 'none', padding: 8, borderRadius: 8, color: 'var(--muted)', display: 'flex' }}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
