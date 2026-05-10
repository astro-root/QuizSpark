import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'

export default function HomePage() {
  const { createRoom, joinRoom, connected } = useSocketContext()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [tab, setTab] = useState<'create'|'join'>('create')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) { setError('名前を入力してください'); return }
    setLoading(true); setError('')
    const id = await createRoom(name.trim())
    navigate('/room/' + id)
  }
  async function handleJoin() {
    if (!name.trim()) { setError('名前を入力してください'); return }
    if (!roomId.trim()) { setError('ルームIDを入力してください'); return }
    setLoading(true); setError('')
    const err = await joinRoom(roomId.trim().toUpperCase(), name.trim())
    if (err) { setError(err); setLoading(false); return }
    navigate('/room/' + roomId.trim().toUpperCase())
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 20px' }}>
      <div style={{ width:'100%', maxWidth:360 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontFamily:'Orbitron,sans-serif', fontSize:36, fontWeight:900, letterSpacing:2, marginBottom:6 }}>
            <span style={{ color:'var(--accent)' }}>Quiz</span>
            <span style={{ color:'var(--gold)' }}>Spark</span>
            <span style={{ marginLeft:6 }}>⚡</span>
          </div>
          <p style={{ color:'var(--muted)', fontSize:13, letterSpacing:1 }}>リアルタイム早押しクイズ</p>
        </div>

        {/* Name */}
        <div style={{ marginBottom:20 }}>
          <p style={lbl}>あなたの名前</p>
          <input
            value={name} onChange={e => setName(e.target.value)} maxLength={12}
            placeholder="ニックネーム"
            style={inp}
            onKeyDown={e => e.key==='Enter' && (tab==='create' ? handleCreate() : handleJoin())}
          />
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'var(--surface)', borderRadius:12, padding:4, gap:4, marginBottom:20 }}>
          {(['create','join'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              style={{ flex:1, padding:'10px', borderRadius:9, fontSize:14, fontWeight:700,
                background: tab===t ? 'var(--accent)' : 'transparent',
                color: tab===t ? '#fff' : 'var(--muted)',
                transition:'all .2s' }}>
              {t==='create' ? '+ 作成' : '→ 参加'}
            </button>
          ))}
        </div>

        {tab==='join' && (
          <div style={{ marginBottom:20 }}>
            <p style={lbl}>ルームID</p>
            <input
              value={roomId} onChange={e => setRoomId(e.target.value.toUpperCase())} maxLength={6}
              placeholder="XXXXXX"
              style={{ ...inp, fontFamily:'Orbitron,sans-serif', letterSpacing:6, textAlign:'center', fontSize:20 }}
              onKeyDown={e => e.key==='Enter' && handleJoin()}
            />
          </div>
        )}

        {error && <p style={{ color:'var(--wrong)', fontSize:13, marginBottom:12, padding:'8px 12px', background:'rgba(244,63,94,0.1)', borderRadius:8 }}>{error}</p>}

        <button
          disabled={loading || !connected}
          onClick={tab==='create' ? handleCreate : handleJoin}
          style={{ width:'100%', padding:'16px', borderRadius:12, fontSize:16, fontWeight:900,
            background: tab==='create' ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : 'linear-gradient(135deg,var(--buzz),#f97316)',
            color:'#fff', opacity: loading||!connected ? 0.5 : 1,
            boxShadow: tab==='create' ? '0 4px 20px rgba(99,102,241,0.4)' : '0 4px 20px rgba(244,63,94,0.4)' }}>
          {tab==='create' ? '⚡ ルームを作成' : '→ ルームに参加'}
        </button>

        {!connected && <p style={{ textAlign:'center', color:'var(--muted)', fontSize:12, marginTop:12 }}>接続中...</p>}
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize:12, fontWeight:700, color:'var(--muted)', letterSpacing:1, textTransform:'uppercase', marginBottom:8 }
const inp: React.CSSProperties = { width:'100%', padding:'13px 16px', background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:10, fontSize:16, color:'var(--text)' }
