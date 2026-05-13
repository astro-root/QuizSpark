import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import AppHeader from '../components/AppHeader'
import { User, Trophy } from 'lucide-react'
import ProfileTab from '../components/profile/ProfileTab'
import RecordsTab from '../components/profile/RecordsTab'
import { useState } from 'react'

type Tab = 'profile' | 'records'

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

  const tabs = [
    { key: 'profile' as Tab, Icon: User,   label: 'プロフィール' },
    { key: 'records' as Tab, Icon: Trophy, label: '戦績' },
  ]

  return (
    <div className='page' style={{ display:'flex', flexDirection:'column' }}>
      <AppHeader title="マイページ" />

      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:'linear-gradient(135deg,var(--accent),var(--accent2))',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:20, fontWeight:900, color:'#fff', overflow:'hidden', flexShrink:0 }}>
          {user.avatarUrl
            ? <img src={user.avatarUrl} style={{ width:48, height:48, objectFit:'cover' }} alt="" />
            : user.name[0]}
        </div>
        <div>
          <p style={{ fontWeight:900, fontSize:16 }}>{user.name}</p>
          {(user as any).username && <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>@{(user as any).username}</p>}
          {!(user as any).username && <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{user.email}</p>}
        </div>
      </div>

      <div style={{ display:'flex', background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex:1, padding:'12px 8px', fontSize:13, fontWeight:700, background:'none', border:'none', cursor:'pointer',
              color: tab===t.key ? 'var(--accent)' : 'var(--muted)',
              borderBottom: `2px solid ${tab===t.key ? 'var(--accent)' : 'transparent'}`,
              transition:'all .2s', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <t.Icon size={18} strokeWidth={tab===t.key ? 2.5 : 1.8} />
            <span style={{ fontSize:11 }}>{t.label}</span>
          </button>
        ))}
      </div>

      <div className='inner'>
        {tab === 'profile' && <ProfileTab />}
        {tab === 'records' && <RecordsTab />}
      </div>
    </div>
  )
}
