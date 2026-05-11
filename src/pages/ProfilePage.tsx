import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import AppHeader from '../components/AppHeader'
import ProfileTab from '../components/profile/ProfileTab'
import SetsTab from '../components/profile/SetsTab'
import RecordsTab from '../components/profile/RecordsTab'
import { useState } from 'react'

type Tab = 'profile' | 'sets' | 'records'

export default function ProfilePage() {
  const { user, authLoading } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('profile')

  useEffect(() => {
    if (authLoading) return
    if (!user) navigate('/')
  }, [authLoading, user, navigate])

  if (!user) return null

  const tabs: { key: Tab; icon: string; label: string }[] = [
    { key: 'profile', icon: '👤', label: 'プロフィール' },
    { key: 'sets',    icon: '📚', label: '問題セット' },
    { key: 'records', icon: '🏆', label: '戦績' },
  ]

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', paddingBottom:80 }}>
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
        <p style={{ fontWeight:900, fontSize:18 }}>マイページ</p>
        <button onClick={toggleTheme}
          style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px', fontSize:15 }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <div style={{ background:'linear-gradient(135deg,var(--accent),var(--accent2))', padding:'20px', display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:52, height:52, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.4)',
          background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:22, fontWeight:900, color:'#fff', overflow:'hidden', flexShrink:0 }}>
          {user.avatarUrl
            ? <img src={user.avatarUrl} style={{ width:52, height:52, objectFit:'cover' }} alt="" />
            : user.name[0]}
        </div>
        <div>
          <p style={{ fontWeight:900, fontSize:18, color:'#fff' }}>{user.name}</p>
          {(user as any).username && <p style={{ fontSize:12, color:'rgba(255,255,255,0.75)', marginTop:2 }}>@{(user as any).username}</p>}
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginTop:2 }}>{user.email}</p>
        </div>
      </div>

      <div style={{ display:'flex', background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex:1, padding:'12px 8px', fontSize:13, fontWeight:700, background:'none',
              color: tab===t.key ? 'var(--accent)' : 'var(--muted)',
              borderBottom: `2px solid ${tab===t.key ? 'var(--accent)' : 'transparent'}`,
              transition:'all .2s', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <span style={{ fontSize:18 }}>{t.icon}</span>
            <span style={{ fontSize:11 }}>{t.label}</span>
          </button>
        ))}
      </div>

      <div style={{ flex:1, maxWidth:640, width:'100%', margin:'0 auto', padding:'16px' }}>
        {tab === 'profile' && <ProfileTab />}
        {tab === 'sets'    && <SetsTab />}
        {tab === 'records' && <RecordsTab />}
      </div>
    </div>
  )
}
