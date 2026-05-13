import AppHeader from '../components/AppHeader'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { Users, Plus, Hash } from 'lucide-react'

export default function FreeLobbyPage() {
  const { user } = useAuth()
  const { createRoom, joinRoom, publicRooms } = useSocketContext()
  const navigate = useNavigate()
  const [roomIdInput, setRoomIdInput] = useState('')
  const [joinError, setJoinError] = useState('')
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    if (!user) return
    setCreating(true)
    const roomId = await createRoom(user.name)
    navigate('/room/' + roomId)
  }

  async function handleJoin() {
    if (!user) return
    const id = roomIdInput.trim().toUpperCase()
    if (!id) return
    setJoinError('')
    const err = await joinRoom(id, user.name)
    if (err) { setJoinError(err); return }
    navigate('/room/' + id)
  }

  async function quickJoin(roomId: string) {
    if (!user) return
    const err = await joinRoom(roomId, user.name)
    if (!err) navigate('/room/' + roomId)
  }

  return (
    <div className='page'>
      <AppHeader back title="フリーマッチ" />

      <div className='inner' style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ルーム作成 */}
        <button onClick={handleCreate} disabled={creating}
          style={{ width: '100%', padding: '20px 24px', borderRadius: 18, fontSize: 16, fontWeight: 900,
            background: 'linear-gradient(135deg,#0f766e,#14b8a6)', color: '#fff',
            boxShadow: '0 6px 24px rgba(20,184,166,0.3)',
            display: 'flex', alignItems: 'center', gap: 14, border: 'none', cursor: 'pointer',
            opacity: creating ? 0.7 : 1 }}>
          <Plus size={28} strokeWidth={2.5} />
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 17, fontWeight: 900 }}>ルームを作る</p>
            <p style={{ fontSize: 12, fontWeight: 400, opacity: 0.85, marginTop: 2 }}>設定を自由にカスタマイズ</p>
          </div>
        </button>

        {/* Room ID入力で参加 */}
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Hash size={15} color="var(--muted)" />
            <p style={{ fontWeight: 800, fontSize: 14 }}>Room IDで参加</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={roomIdInput}
              onChange={e => { setRoomIdInput(e.target.value.toUpperCase()); setJoinError('') }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="6桁のRoom ID"
              maxLength={6}
              style={{ flex: 1, padding: '12px 16px', background: 'var(--surface2)',
                border: `1.5px solid ${joinError ? 'var(--wrong)' : 'var(--border)'}`,
                borderRadius: 10, fontSize: 18, color: 'var(--text)',
                fontFamily: 'Orbitron,sans-serif', letterSpacing: 4, textTransform: 'uppercase' }}
            />
            <button onClick={handleJoin}
              style={{ padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              参加
            </button>
          </div>
          {joinError && <p style={{ color: 'var(--wrong)', fontSize: 12, marginTop: 8 }}>{joinError}</p>}
        </div>

        {/* 公開ルーム一覧 */}
        {publicRooms.length > 0 && (
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Users size={15} color="var(--muted)" />
              <p style={{ fontWeight: 800, fontSize: 14 }}>参加できる公開ルーム</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {publicRooms.map(room => (
                <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{room.hostName} のルーム</p>
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {room.ruleId.toUpperCase()} · {room.questionCount}問 · {room.playerCount}人
                    </p>
                  </div>
                  <button onClick={() => quickJoin(room.id)}
                    style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                      background: 'var(--buzz)', color: '#fff', flexShrink: 0, border: 'none', cursor: 'pointer' }}>
                    参加
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {publicRooms.length === 0 && (
          <p style={{ color: 'var(--muted)', textAlign: 'center', fontSize: 13, padding: '20px 0' }}>
            現在参加できる公開ルームはありません
          </p>
        )}
      </div>
    </div>
  )
}
