import { apiFetch } from '../lib/api'
import AppHeader from '../components/AppHeader'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface UserProfile {
  id: string; name: string; username: string | null; avatarUrl: string | null
  bio: string | null; rate: number; isFollowing: boolean
  wins: number; winRate: number
  _count: { followers: number; following: number; battleRecords: number }
}
interface UserEntry { id: string; name: string; username: string | null; avatarUrl: string | null; rate: number }

function getRankLabel(rate: number) {
  if (rate >= 2000) return { label: 'マスター', color: '#a855f7', emoji: '👑' }
  if (rate >= 1500) return { label: 'ダイヤ',   color: '#38bdf8', emoji: '💎' }
  if (rate >= 1200) return { label: 'プラチナ', color: '#94a3b8', emoji: '⚪' }
  if (rate >=  900) return { label: 'ゴールド',  color: '#f59e0b', emoji: '🥇' }
  if (rate >=  600) return { label: 'シルバー',  color: '#cbd5e1', emoji: '🥈' }
  return                    { label: 'ブロンズ',  color: '#b45309', emoji: '🥉' }
}

export default function UserPage() {
  const { id } = useParams<{ id: string }>()
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tab, setTab] = useState<'followers'|'following'>('followers')
  const [list, setList] = useState<UserEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    apiFetch(`/api/follow/user/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setProfile(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    apiFetch(`/api/follow/${id}/${tab}`).then(r => r.ok ? r.json() : []).then(setList).catch(() => {})
  }, [id, tab])

  async function toggleFollow() {
    if (!profile || !me) return
    const method = profile.isFollowing ? 'DELETE' : 'POST'
    await apiFetch(`/api/follow/${id}`, { method })
    setProfile(p => p ? { ...p,
      isFollowing: !p.isFollowing,
      _count: { ...p._count, followers: p._count.followers + (p.isFollowing ? -1 : 1) }
    } : p)
  }

  if (loading) return <div className='page' style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)' }}>読み込み中...</div>
  if (!profile) return <div className='page' style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)' }}>ユーザーが見つかりません</div>

  const rank = getRankLabel(profile.rate)
  const isMe = me?.id === id

  return (
    <div className='page' style={{ display:'flex', flexDirection:'column' }}>
      {/* ヘッダー */}
      <AppHeader back />

      {/* バナー */}
      <div style={{ background:'linear-gradient(135deg,var(--accent),var(--accent2))', padding:'32px 24px 24px', display:'flex', alignItems:'flex-start', gap:20, flexWrap:'wrap' }}>
        <div style={{ width:88, height:88, borderRadius:'50%', border:'3px solid rgba(255,255,255,0.5)', overflow:'hidden', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, fontWeight:900, color:'#fff', flexShrink:0 }}>
          {profile.avatarUrl ? <img src={profile.avatarUrl} style={{ width:88, height:88, objectFit:'cover' }} alt="" /> : profile.name[0]}
        </div>
        <div style={{ flex:1, minWidth:180 }}>
          <p style={{ fontWeight:900, fontSize:22, color:'#fff' }}>{profile.name}</p>
          {profile.username && <p style={{ fontSize:13, color:'rgba(255,255,255,0.75)', marginTop:2 }}>@{profile.username}</p>}
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:8, padding:'4px 12px', background:'rgba(255,255,255,0.15)', borderRadius:20 }}>
            <span style={{ fontSize:14 }}>{rank.emoji}</span>
            <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{rank.label}</span>
            <span style={{ fontSize:13, color:'rgba(255,255,255,0.85)', fontFamily:'Orbitron,sans-serif' }}>{profile.rate}pt</span>
          </div>
          {!isMe && me && (
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button onClick={() => navigate(`/chat/${id}`)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:20, fontSize:13, fontWeight:700,
                  background:'rgba(255,255,255,0.2)', color:'#fff', border:'1px solid rgba(255,255,255,0.4)', cursor:'pointer' }}>
                💬 チャット
              </button>
              <button onClick={toggleFollow}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 20px', borderRadius:20, fontSize:13, fontWeight:700,
                  background: profile.isFollowing ? 'rgba(255,255,255,0.2)' : '#fff',
                  color: profile.isFollowing ? '#fff' : 'var(--accent)',
                  border: profile.isFollowing ? '1px solid rgba(255,255,255,0.4)' : 'none', cursor:'pointer' }}>
                {profile.isFollowing ? '✓ フォロー中' : '+ フォロー'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className='inner profile-inner'>
        {/* Bio */}
        {profile.bio && (
          <div style={{ background:'var(--surface)', borderRadius:14, padding:'14px 16px', border:'1px solid var(--border)', marginBottom:12 }}>
            <p style={{ fontSize:14, color:'var(--text)', lineHeight:1.7 }}>{profile.bio}</p>
          </div>
        )}

        {/* スタッツ */}
        <div style={{ background:'var(--surface)', borderRadius:14, padding:'16px 20px', border:'1px solid var(--border)', marginBottom:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, textAlign:'center' }}>
            {[
              { label:'対戦', value: profile._count.battleRecords },
              { label:'勝利', value: profile.wins },
              { label:'勝率', value: `${profile.winRate}%` },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:20, fontWeight:900, color:'var(--accent)' }}>{s.value}</p>
                <p style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* フォロー/フォロワー */}
        <div style={{ background:'var(--surface)', borderRadius:14, border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ display:'flex' }}>
            {(['followers','following'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex:1, padding:'12px', fontSize:13, fontWeight:700,
                  background: tab===t ? 'var(--accent)' : 'transparent',
                  color: tab===t ? '#fff' : 'var(--muted)',
                  borderBottom: tab===t ? 'none' : '1px solid var(--border)' }}>
                {t==='followers' ? `フォロワー ${profile._count.followers}` : `フォロー中 ${profile._count.following}`}
              </button>
            ))}
          </div>
          <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:8 }}>
            {list.map(u => (
              <div key={u.id} onClick={() => navigate(`/user/${u.id}`)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'var(--surface2)', borderRadius:10, cursor:'pointer' }}>
                <div style={{ width:38, height:38, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,var(--accent),var(--accent2))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:'#fff', flexShrink:0 }}>
                  {u.avatarUrl ? <img src={u.avatarUrl} style={{ width:38, height:38, objectFit:'cover' }} alt="" /> : u.name[0]}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:700, fontSize:14 }}>{u.name}</p>
                  {u.username && <p style={{ fontSize:12, color:'var(--muted)' }}>@{u.username}</p>}
                </div>
                <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:13, color:'var(--accent)', fontWeight:700 }}>{u.rate}pt</p>
              </div>
            ))}
            {list.length === 0 && <p style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:16 }}>まだいません</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
