import AppHeader from '../components/AppHeader'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { Plus, Hash, Clock, Swords } from 'lucide-react'

const RULE_LABELS: Record<string, string> = {
  free: 'フリー', mon: 'm○n×', newyork: 'ニューヨーク',
  updown: 'アップダウン', by: 'by', freeze: 'フリーズ',
  mon_rest: 'm○n休', swedish: 'スウェーデン', divide: 'ディバイド',
  lucky: 'ラッキーショット', rensei: '連答付き', rengou: '連誤答付き', combo: 'コンボ'
}

export default function FreeLobbyPage() {
  const { user } = useAuth()
  const { createRoom, joinRoom, publicRooms } = useSocketContext()
  const navigate = useNavigate()
  const [roomIdInput, setRoomIdInput] = useState('')
  const [joinError, setJoinError] = useState('')
  const [creating, setCreating] = useState(false)

  const waitingRooms = publicRooms.filter(r => !r.phase || r.phase === 'lobby')
  const activeRooms = publicRooms.filter(r => r.phase && r.phase !== 'lobby' && r.phase !== 'finished')

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
      <div className='inner' style={{ display:'flex', flexDirection:'column', gap:16 }}>

        <button onClick={handleCreate} disabled={creating}
          style={{ width:'100%', padding:'20px 24px', borderRadius:18, fontSize:16, fontWeight:900,
            background:'linear-gradient(135deg,#0f766e,#14b8a6)', color:'#fff',
            boxShadow:'0 6px 24px rgba(20,184,166,0.3)',
            display:'flex', alignItems:'center', gap:14, border:'none', cursor:'pointer', opacity:creating?0.7:1 }}>
          <Plus size={26} strokeWidth={2.5} />
          <div style={{ textAlign:'left' }}>
            <p style={{ fontSize:17, fontWeight:900 }}>ルームを作る</p>
            <p style={{ fontSize:12, opacity:0.85, marginTop:2 }}>設定はロビーで変更できます</p>
          </div>
        </button>

        <div style={{ background:'var(--surface)', borderRadius:16, padding:'16px', border:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <Hash size={14} color="var(--muted)" />
            <p style={{ fontWeight:800, fontSize:14 }}>Room IDで参加</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={roomIdInput}
              onChange={e => { setRoomIdInput(e.target.value.toUpperCase()); setJoinError('') }}
              onKeyDown={e => e.key==='Enter' && handleJoin()}
              placeholder="6桁のRoom ID" maxLength={6}
              style={{ flex:1, minWidth:0, padding:'12px 16px', background:'var(--surface2)',
                border:`1.5px solid ${joinError ? 'var(--wrong)' : 'var(--border)'}`,
                borderRadius:10, fontSize:16, color:'var(--text)',
                fontFamily:'Orbitron,sans-serif', letterSpacing:4, textTransform:'uppercase' }} />
            <button onClick={handleJoin}
              style={{ padding:'12px 20px', borderRadius:10, fontSize:14, fontWeight:700,
                background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer', flexShrink:0 }}>
              参加
            </button>
          </div>
          {joinError && <p style={{ fontSize:12, color:'var(--wrong)', marginTop:8 }}>{joinError}</p>}
        </div>

        {waitingRooms.length > 0 && (
          <div style={{ background:'var(--surface)', borderRadius:16, padding:'16px', border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <Clock size={14} color="var(--correct)" />
              <p style={{ fontWeight:800, fontSize:14 }}>待機中のルーム</p>
              <span style={{ fontSize:11, color:'var(--correct)', background:'rgba(16,185,129,0.1)', padding:'1px 8px', borderRadius:10, fontWeight:700 }}>{waitingRooms.length}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {waitingRooms.map(room => (
                <div key={room.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--surface2)', borderRadius:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:700 }}>{room.hostName}のルーム</p>
                    <p style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                      {RULE_LABELS[room.ruleId] ?? room.ruleId} · {room.playerCount}人 · {room.questionCount}問
                    </p>
                  </div>
                  <button onClick={() => quickJoin(room.id)}
                    style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:700,
                      background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer', flexShrink:0 }}>
                    参加
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeRooms.length > 0 && (
          <div style={{ background:'var(--surface)', borderRadius:16, padding:'16px', border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <Swords size={14} color="var(--buzz)" />
              <p style={{ fontWeight:800, fontSize:14 }}>対戦中のルーム</p>
              <span style={{ fontSize:11, color:'var(--buzz)', background:'rgba(244,63,94,0.1)', padding:'1px 8px', borderRadius:10, fontWeight:700 }}>{activeRooms.length}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {activeRooms.map(room => (
                <div key={room.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--surface2)', borderRadius:10, opacity:0.75 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:700 }}>{room.hostName}のルーム</p>
                    <p style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                      {RULE_LABELS[room.ruleId] ?? room.ruleId} · {room.playerCount}人 · 対戦中
                    </p>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--buzz)', background:'rgba(244,63,94,0.1)', padding:'4px 10px', borderRadius:8 }}>観戦不可</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
