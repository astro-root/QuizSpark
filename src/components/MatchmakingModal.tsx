import { useEffect, useState } from 'react'
import { useSocketContext } from '../context/SocketContext'
import { useNavigate } from 'react-router-dom'
import type { RuleId } from '../types'

const RULES: { id: RuleId; label: string; desc: string }[] = [
  { id: 'free',     label: 'フリー',       desc: '正答数で競う基本ルール' },
  { id: 'mon',      label: '○○問×失格',   desc: 'M問正解でWIN、N問誤答で失格' },
  { id: 'newyork',  label: 'NY式',         desc: '誤答するとスコアがリセット' },
  { id: 'updown',   label: 'UpDown',       desc: '正答で+1、誤答で-1' },
  { id: 'swedish',  label: 'スウェーデン', desc: '正答は全員にカウント' },
]

interface Props { onClose: () => void }

export default function MatchmakingModal({ onClose }: Props) {
  const { socket, joinQueue, leaveQueue } = useSocketContext()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'select' | 'waiting'>('select')
  const [ruleId, setRuleId] = useState<RuleId>('mon')
  const [questionCount, setQuestionCount] = useState(10)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!socket) return
    const onMatchFound = (roomId: string) => { onClose(); navigate(`/lobby/${roomId}`) }
    socket.on('match-found', onMatchFound)
    return () => { socket.off('match-found', onMatchFound) }
  }, [socket])

  useEffect(() => {
    if (phase !== 'waiting') return
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  function startSearch() {
    joinQueue(ruleId, questionCount)
    setPhase('waiting')
    setElapsed(0)
  }

  function cancelSearch() {
    leaveQueue()
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'var(--surface)', borderRadius:20, padding:'28px 24px', width:'100%', maxWidth:420, border:'1px solid var(--border)' }}>
        {phase === 'select' ? (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <p style={{ fontWeight:900, fontSize:18 }}>🎲 ランダムマッチ</p>
              <button onClick={onClose} style={{ background:'none', color:'var(--muted)', fontSize:20, padding:0 }}>✕</button>
            </div>

            <p style={{ fontSize:12, fontWeight:700, color:'var(--muted)', letterSpacing:1, marginBottom:10 }}>ルール</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
              {RULES.map(r => (
                <button key={r.id} onClick={() => setRuleId(r.id)}
                  style={{ padding:'12px 14px', borderRadius:10, textAlign:'left',
                    border:`1.5px solid ${ruleId === r.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: ruleId === r.id ? 'rgba(56,189,248,0.08)' : 'var(--surface2)' }}>
                  <p style={{ fontWeight:700, fontSize:14, color: ruleId === r.id ? 'var(--accent)' : 'var(--text)' }}>{r.label}</p>
                  <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{r.desc}</p>
                </button>
              ))}
            </div>

            <p style={{ fontSize:12, fontWeight:700, color:'var(--muted)', letterSpacing:1, marginBottom:8 }}>問題数: {questionCount}問</p>
            <input type="range" min={5} max={30} step={5} value={questionCount}
              onChange={e => setQuestionCount(Number(e.target.value))}
              style={{ width:'100%', accentColor:'var(--accent)', marginBottom:4 }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--muted)', marginBottom:20 }}>
              {[5,10,15,20,25,30].map(n => <span key={n}>{n}</span>)}
            </div>

            <button onClick={startSearch}
              style={{ width:'100%', padding:'15px', borderRadius:12, fontSize:15, fontWeight:900,
                background:'linear-gradient(135deg,var(--accent),var(--accent2))', color:'#fff',
                boxShadow:'0 4px 16px rgba(56,189,248,0.3)' }}>
              マッチングを開始
            </button>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:56, marginBottom:16, display:'inline-block', animation:'spin 2s linear infinite' }}>⚡</div>
            <p style={{ fontWeight:900, fontSize:20, marginBottom:8 }}>対戦相手を探しています</p>
            <p style={{ color:'var(--muted)', fontSize:14, marginBottom:4 }}>
              {RULES.find(r => r.id === ruleId)?.label} · {questionCount}問
            </p>
            <p style={{ color:'var(--accent)', fontSize:28, fontWeight:900, fontFamily:'Orbitron,sans-serif', margin:'20px 0' }}>
              {String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}
            </p>
            <button onClick={cancelSearch}
              style={{ padding:'12px 28px', borderRadius:10, fontSize:14, fontWeight:700,
                background:'rgba(239,68,68,0.1)', color:'var(--wrong)', border:'1px solid rgba(239,68,68,0.2)' }}>
              キャンセル
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
