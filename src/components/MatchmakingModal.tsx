import { useEffect, useState } from 'react'
import { useSocketContext } from '../context/SocketContext'
import { useNavigate } from 'react-router-dom'

interface Props { onClose: () => void }

export default function MatchmakingModal({ onClose }: Props) {
  const { socket } = useSocketContext()
  const navigate = useNavigate()
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!socket) return
    socket.emit('join-queue')
    const onMatchFound = (roomId: string) => {
      onClose()
      navigate(`/room/${roomId}/game`)
    }
    socket.on('match-found', onMatchFound)
    return () => {
      socket.off('match-found', onMatchFound)
      socket.emit('leave-queue')
    }
  }, [socket])

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  function cancel() {
    socket?.emit('leave-queue')
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'var(--surface)', borderRadius:20, padding:'36px 28px', width:'100%', maxWidth:360, border:'1px solid var(--border)', textAlign:'center' }}>
        <div style={{ fontSize:60, marginBottom:16, display:'inline-block', animation:'spin 1.8s linear infinite' }}>⚡</div>
        <p style={{ fontWeight:900, fontSize:22, marginBottom:8 }}>対戦相手を探しています</p>
        <p style={{ color:'var(--muted)', fontSize:13, marginBottom:4 }}>○○問形式　5◯2× 10問</p>
        <p style={{ color:'var(--accent)', fontSize:32, fontWeight:900, fontFamily:'Orbitron,sans-serif', margin:'20px 0' }}>
          {String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}
        </p>
        <p style={{ color:'var(--muted)', fontSize:12, marginBottom:28 }}>マッチ成立後、3秒で自動スタート</p>
        <button onClick={cancel}
          style={{ padding:'12px 32px', borderRadius:10, fontSize:14, fontWeight:700,
            background:'rgba(239,68,68,0.1)', color:'var(--wrong)', border:'1px solid rgba(239,68,68,0.2)' }}>
          キャンセル
        </button>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
