import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

interface Props {
  title: string
  backTo?: string
}

export default function AppHeader({ title, backTo = '/' }: Props) {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { user } = useAuth()

  return (
    <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 24px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
      <button onClick={() => navigate(backTo)} style={{ background:'none', color:'var(--muted)', fontSize:13, padding:0, minWidth:60 }}>
        ← 戻る
      </button>
      <span style={{ fontFamily:'Orbitron,sans-serif', fontWeight:900, fontSize:15, color:'var(--accent)' }}>
        {title}
      </span>
      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:60, justifyContent:'flex-end' }}>
        <button onClick={toggle} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'5px 9px', fontSize:14 }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {user && (
          <button onClick={() => navigate('/profile')}
            style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--accent),var(--accent2))', border:'none', color:'#fff', fontWeight:900, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {user.name[0]}
          </button>
        )}
      </div>
    </header>
  )
}
