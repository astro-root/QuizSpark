import { apiFetch } from '../lib/api'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface QSet {
  id: string; name: string; description: string | null
  user: { id: string; name: string; avatarUrl: string | null }
  _count: { items: number }
  items: { id: string; question: string; answer: string }[]
  isPublic: boolean; createdAt: string
}

export default function QuestionSetPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [set, setSet] = useState<QSet | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    apiFetch(`/api/question-sets/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setSet(d); setLoading(false) })
  }, [id])

  if (loading) return <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)' }}>読み込み中...</div>
  if (!set) return <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)' }}>見つかりません</div>

  const isOwner = user?.id === set.user.id

  return (
    <div style={{ minHeight:'100dvh', background:'var(--bg)', paddingBottom:80 }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'var(--text)' }}>←</button>
        <span style={{ fontWeight:800, fontSize:17, flex:1 }}>問題セット</span>
        {isOwner && (
          <button onClick={() => navigate(`/submit?edit=${id}`)}
            style={{ background:'none', border:'1px solid var(--border)', borderRadius:12, padding:'6px 12px', fontSize:12, cursor:'pointer', color:'var(--text)' }}>
            編集
          </button>
        )}
      </div>

      <div style={{ maxWidth:600, margin:'0 auto', padding:'20px 16px' }}>
        <h2 style={{ fontWeight:800, fontSize:20, marginBottom:8 }}>{set.name}</h2>
        {set.description && <p style={{ color:'var(--muted)', fontSize:14, marginBottom:12 }}>{set.description}</p>}

        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--surface2)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>
            {set.user.avatarUrl ? <img src={set.user.avatarUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : set.user.name[0]}
          </div>
          <span style={{ fontSize:13, color:'var(--muted)' }}
            onClick={() => navigate(`/user/${set.user.id}`)}
            className="clickable">{set.user.name}</span>
          <span style={{ fontSize:12, color:'var(--muted)', marginLeft:'auto' }}>📝 {set._count.items}問</span>
        </div>

        <button onClick={() => navigate(`/match?setId=${id}`)}
          style={{ width:'100%', padding:'14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:14, fontWeight:800, fontSize:16, cursor:'pointer', marginBottom:24 }}>
          ⚔️ このセットで対戦
        </button>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {set.items.map((item, i) => (
            <div key={item.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 14px' }}>
              <p style={{ fontSize:13, color:'var(--muted)', marginBottom:4 }}>Q{i+1}.</p>
              <p style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>{item.question}</p>
              <p style={{ fontSize:13, color:'var(--accent)' }}>A: {item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
