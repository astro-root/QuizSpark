import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import MatchmakingModal from '../components/MatchmakingModal'

export default function MatchPage() {
  const { createRoom, joinRoom, connected } = useSocketContext()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'create'|'join'>('create')
  const [name, setName] = useState(user?.name ?? '')
  const [roomId, setRoomId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showMatchmaking, setShowMatchmaking] = useState(false)

  async function handleCreate() {
    const n = name.trim(); if (!n) { setError('名前を入力してください'); return }
    setLoading(true); setError('')
    const id = await createRoom(n); navigate('/room/' + id)
  }
  async function handleJoin() {
    const n = name.trim(), rid = roomId.trim().toUpperCase()
    if (!n) { setError('名前を入力してください'); return }
    if (!rid) { setError('ルームIDを入力してください'); return }
    setLoading(true); setError('')
    const err = await joinRoom(rid, n)
    if (err) { setError(err); setLoading(false) } else navigate('/room/' + rid)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      <header style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <p style={{ fontWeight: 900, fontSize: 18 }}>⚔️ 対戦</p>
      </header>

      <div style={{ flex: 1, padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480, width: '100%', margin: '0 auto' }}>

        {/* ランダムマッチ */}
        <button onClick={() => setShowMatchmaking(true)}
          style={{ width: '100%', padding: '22px', borderRadius: 18, fontSize: 18, fontWeight: 900,
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff',
            boxShadow: '0 6px 24px rgba(124,58,237,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🎲</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 18, fontWeight: 900 }}>ランダムマッチ</p>
            <p style={{ fontSize: 12, fontWeight: 400, opacity: 0.85, marginTop: 2 }}>5◯2× · 30問 · 自動マッチング</p>
          </div>
        </button>

        {/* フリーマッチ */}
        <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontWeight: 900, fontSize: 16 }}>🏠 フリーマッチ</p>

          <div>
            <p style={lbl}>ニックネーム</p>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={12} placeholder="名前を入力"
              style={inp} onKeyDown={e => e.key === 'Enter' && (tab === 'create' ? handleCreate() : handleJoin())} />
          </div>

          <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 12, padding: 4, gap: 4 }}>
            {(['create', 'join'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError('') }}
                style={{ flex: 1, padding: '11px', borderRadius: 9, fontSize: 14, fontWeight: 700,
                  background: tab === t ? (t === 'create' ? 'var(--accent)' : 'var(--buzz)') : 'transparent',
                  color: tab === t ? '#fff' : 'var(--muted)' }}>
                {t === 'create' ? '+ ルーム作成' : '→ ルーム参加'}
              </button>
            ))}
          </div>

          {tab === 'join' && (
            <div>
              <p style={lbl}>ルームID</p>
              <input value={roomId} onChange={e => setRoomId(e.target.value.toUpperCase())} maxLength={6}
                placeholder="XXXXXX"
                style={{ ...inp, fontFamily: 'Orbitron,sans-serif', letterSpacing: 10, textAlign: 'center', fontSize: 26, fontWeight: 900 }}
                onKeyDown={e => e.key === 'Enter' && handleJoin()} />
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>※ 0・O・1・I・L は使用していません</p>
            </div>
          )}

          {error && (
            <p style={{ color: 'var(--wrong)', fontSize: 13, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>{error}</p>
          )}

          <button disabled={loading || !connected} onClick={tab === 'create' ? handleCreate : handleJoin}
            style={{ padding: '16px', borderRadius: 14, fontSize: 16, fontWeight: 900,
              background: tab === 'create'
                ? 'linear-gradient(135deg,var(--accent),var(--accent2))'
                : 'linear-gradient(135deg,var(--buzz),var(--buzz2))',
              color: '#fff', opacity: loading || !connected ? 0.5 : 1,
              boxShadow: '0 4px 16px rgba(56,189,248,0.3)' }}>
            {tab === 'create' ? '⚡ ルームを作成' : '→ 入室する'}
          </button>
        </div>
      </div>

      {showMatchmaking && <MatchmakingModal onClose={() => setShowMatchmaking(false)} />}
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }
const inp: React.CSSProperties = { width: '100%', padding: '13px 16px', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 16, color: 'var(--text)' }
