import AppHeader from '../components/AppHeader'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { Users, Plus, Hash, X, AlertTriangle } from 'lucide-react'

const RULES = [
  { id:'mon',   name:'m◯n×' },
  { id:'free',  name:'Free' },
  { id:'newyork',name:'NewYork' },
  { id:'updown',name:'Up-Down' },
  { id:'freeze',name:'Freeze' },
  { id:'lucky', name:'Lucky Shot' },
]

export default function FreeLobbyPage() {
  const { user } = useAuth()
  const { createRoom, joinRoom, publicRooms } = useSocketContext()
  const navigate = useNavigate()
  const [roomIdInput, setRoomIdInput] = useState('')
  const [joinError, setJoinError] = useState('')
  const [creating, setCreating] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [ruleId, setRuleId] = useState('mon')
  const [questionCount, setQuestionCount] = useState(10)
  const [isPublic, setIsPublic] = useState(false)
  const [showPublicWarn, setShowPublicWarn] = useState(false)

  async function handleCreate() {
    if (!user) return
    setCreating(true)
    const roomId = await createRoom(user.name)
    sessionStorage.setItem('pendingRoomSettings', JSON.stringify({ ruleId, questionCount, isPublic }))
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

        <button onClick={() => setShowPopup(true)}
          style={{ width: '100%', padding: '20px 24px', borderRadius: 18, fontSize: 16, fontWeight: 900,
            background: 'linear-gradient(135deg,#0f766e,#14b8a6)', color: '#fff',
            boxShadow: '0 6px 24px rgba(20,184,166,0.3)',
            display: 'flex', alignItems: 'center', gap: 14, border: 'none', cursor: 'pointer' }}>
          <Plus size={28} strokeWidth={2.5} />
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 17, fontWeight: 900 }}>ルームを作る</p>
            <p style={{ fontSize: 12, fontWeight: 400, opacity: 0.85, marginTop: 2 }}>設定を自由にカスタマイズ</p>
          </div>
        </button>

        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Hash size={15} color="var(--muted)" />
            <p style={{ fontWeight: 800, fontSize: 14 }}>Room IDで参加</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={roomIdInput}
              onChange={e => { setRoomIdInput(e.target.value.toUpperCase()); setJoinError('') }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="6桁のRoom ID" maxLength={6}
              style={{ flex: 1, minWidth: 0, padding: '12px 16px', background: 'var(--surface2)',
                border: `1.5px solid ${joinError ? 'var(--wrong)' : 'var(--border)'}`,
                borderRadius: 10, fontSize: 16, color: 'var(--text)',
                fontFamily: 'Orbitron,sans-serif', letterSpacing: 4, textTransform: 'uppercase' }} />
            <button onClick={handleJoin}
              style={{ padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              参加
            </button>
          </div>
          {joinError && <p style={{ fontSize: 12, color: 'var(--wrong)', marginTop: 8 }}>{joinError}</p>}
        </div>

        {publicRooms.length > 0 && (
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Users size={15} color="var(--muted)" />
              <p style={{ fontWeight: 800, fontSize: 14 }}>参加できる公開ルーム</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {publicRooms.map(room => (
                <div key={room.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{room.hostName}のルーム</p>
                    <p style={{ fontSize: 11, color: 'var(--muted)' }}>{room.ruleId.toUpperCase()} · {room.playerCount}人 · {room.questionCount}問</p>
                  </div>
                  <button onClick={() => quickJoin(room.id)}
                    style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                      background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                    参加
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ルーム作成ポップアップ */}
      {showPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowPopup(false) }}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 'var(--w)',
            padding: '24px 20px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
            display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontWeight: 900, fontSize: 17 }}>ルーム設定</p>
              <button onClick={() => setShowPopup(false)}
                style={{ background: 'none', border: 'none', padding: 6, color: 'var(--muted)', display: 'flex', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* ルール選択 */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>ルール</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {RULES.map(r => (
                  <button key={r.id} onClick={() => setRuleId(r.id)}
                    style={{ padding: '10px 6px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                      background: ruleId === r.id ? 'var(--accent)' : 'var(--surface2)',
                      color: ruleId === r.id ? '#fff' : 'var(--text)' }}>
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 問題数 */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>問題数：{questionCount}問</p>
              <input type="range" min={5} max={30} step={5} value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                <span>5問</span><span>30問</span>
              </div>
            </div>

            {/* 公開設定 */}
            <div>
              <button onClick={() => { if (!isPublic) setShowPublicWarn(true); else setIsPublic(false) }}
                style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${isPublic ? 'var(--accent)' : 'var(--border)'}`,
                  background: isPublic ? 'rgba(56,189,248,0.08)' : 'var(--surface2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: isPublic ? 'var(--accent)' : 'var(--text)' }}>公開ルーム</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>誰でも参加できます</p>
                </div>
                <div style={{ width: 44, height: 26, borderRadius: 13, background: isPublic ? 'var(--accent)' : 'var(--surface2)',
                  border: '1.5px solid var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: isPublic ? 18 : 2, width: 18, height: 18,
                    borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                </div>
              </button>
            </div>

            {/* 公開設定の警告ダイアログ */}
            {showPublicWarn && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                  <AlertTriangle size={18} color="var(--wrong)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--wrong)', marginBottom: 4 }}>公開ルームにしますか？</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                      誰でも参加できる状態になります。見知らぬユーザーが参加する可能性があります。
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowPublicWarn(false)}
                    style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                      background: 'var(--surface2)', color: 'var(--text)', border: 'none', cursor: 'pointer' }}>
                    キャンセル
                  </button>
                  <button onClick={() => { setIsPublic(true); setShowPublicWarn(false) }}
                    style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                      background: 'var(--wrong)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    公開にする
                  </button>
                </div>
              </div>
            )}

            <button onClick={handleCreate} disabled={creating}
              style={{ width: '100%', padding: '16px', borderRadius: 14, fontSize: 16, fontWeight: 900,
                background: 'linear-gradient(135deg,#0f766e,#14b8a6)', color: '#fff',
                border: 'none', cursor: 'pointer', opacity: creating ? 0.7 : 1 }}>
              {creating ? '作成中...' : 'ルームを作成する'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
