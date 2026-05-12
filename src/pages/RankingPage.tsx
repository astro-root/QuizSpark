import { apiFetch } from '../lib/api'
import AppHeader from '../components/AppHeader'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Entry {
  rank: number; id: string; name: string; username: string | null
  avatarUrl: string | null; rate: number; total: number; wins: number
  winRate: number; label: string; color: string; emoji: string
}

export default function RankingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [list, setList] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/ranking').then(r => r.json()).then(d => { setList(d); setLoading(false) })
  }, [])

  const myEntry = list.find(e => e.id === user?.id)

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', paddingBottom:80 }}>
      <AppHeader title="ランキング" />

      <div style={{ flex:1, maxWidth:600, width:'100%', margin:'0 auto', padding:'16px' }}>

        {/* 自分のランク */}
        {myEntry && (
          <div style={{ background:'linear-gradient(135deg,var(--accent),var(--accent2))', borderRadius:16,
            padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontFamily:'Orbitron,sans-serif', fontSize:28, fontWeight:900, color:'#fff', width:40, textAlign:'center' }}>
              {myEntry.rank}
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontWeight:900, fontSize:16, color:'#fff' }}>あなたの順位</p>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.75)', marginTop:2 }}>
                {myEntry.emoji} {myEntry.label} · {myEntry.rate} pt · {myEntry.winRate}% 勝率
              </p>
            </div>
          </div>
        )}

        {/* ランク説明 */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {[
            { label:'ブロンズ', emoji:'🥉', range:'0-599' },
            { label:'シルバー', emoji:'🥈', range:'600-899' },
            { label:'ゴールド', emoji:'🥇', range:'900-1199' },
            { label:'プラチナ', emoji:'⚪', range:'1200-1499' },
            { label:'ダイヤ',   emoji:'💎', range:'1500-1999' },
            { label:'マスター', emoji:'👑', range:'2000+' },
          ].map(r => (
            <div key={r.label} style={{ padding:'4px 10px', background:'var(--surface)', borderRadius:20,
              border:'1px solid var(--border)', fontSize:11, color:'var(--muted)' }}>
              {r.emoji} {r.label} {r.range}
            </div>
          ))}
        </div>

        {/* ランキングリスト */}
        {loading ? (
          <p style={{ color:'var(--muted)', textAlign:'center', padding:40 }}>読み込み中...</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {list.map(e => {
              const isMe = e.id === user?.id
              return (
                <div key={e.id} onClick={() => navigate(`/user/${e.id}`)} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
                  background: isMe ? 'rgba(56,189,248,0.1)' : 'var(--surface)',
                  borderRadius:12,
                  border: `1px solid ${isMe ? 'var(--accent)' : 'var(--border)'}` }}>
                  {/* 順位 */}
                  <div style={{ width:32, textAlign:'center', fontFamily:'Orbitron,sans-serif', fontWeight:900, fontSize:14,
                    color: e.rank===1?'#f59e0b':e.rank===2?'#94a3b8':e.rank===3?'#b45309':'var(--muted)' }}>
                    {e.rank <= 3 ? ['🥇','🥈','🥉'][e.rank-1] : e.rank}
                  </div>
                  {/* アバター */}
                  <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, overflow:'hidden',
                    background:'linear-gradient(135deg,var(--accent),var(--accent2))',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:16, fontWeight:900, color:'#fff' }}>
                    {e.avatarUrl
                      ? <img src={e.avatarUrl} style={{ width:36, height:36, objectFit:'cover' }} alt="" />
                      : e.name[0]}
                  </div>
                  {/* 名前・ランク */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <p style={{ fontWeight: isMe ? 800 : 600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {e.name}
                      </p>
                      <span style={{ fontSize:11, fontWeight:700, color:e.color, background:`${e.color}18`,
                        padding:'1px 7px', borderRadius:10, flexShrink:0 }}>
                        {e.emoji} {e.label}
                      </span>
                    </div>
                    <p style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                      {e.total}戦 {e.wins}勝 · 勝率{e.winRate}%
                    </p>
                  </div>
                  {/* レート */}
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:16, fontWeight:900, color:'var(--accent)' }}>
                      {e.rate}
                    </p>
                    <p style={{ fontSize:10, color:'var(--muted)' }}>pt</p>
                  </div>
                </div>
              )
            })}
            {list.length === 0 && <p style={{ color:'var(--muted)', textAlign:'center', padding:40 }}>まだランキングデータがありません</p>}
          </div>
        )}
      </div>
    </div>
  )
}
