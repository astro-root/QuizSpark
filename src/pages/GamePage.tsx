import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
import type { Player } from '../types'

function useCountdown(timerEndsAt: number | null) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!timerEndsAt) { setRemaining(0); return }
    const update = () => setRemaining(Math.max(0, Math.floor((timerEndsAt - Date.now()) / 1000)))
    update()
    const id = setInterval(update, 200)
    return () => clearInterval(id)
  }, [timerEndsAt])
  return remaining
}

function useTypewriter(text: string, active: boolean, speed = 120) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const pos = useRef(0)
  useEffect(() => { setDisplayed(''); setDone(false); pos.current = 0 }, [text])
  useEffect(() => {
    if (!active || !text || pos.current >= text.length) return
    const id = setInterval(() => {
      pos.current++
      setDisplayed(text.slice(0, pos.current))
      if (pos.current >= text.length) { clearInterval(id); setDone(true) }
    }, speed)
    return () => clearInterval(id)
  }, [text, active, speed])
  return { displayed, done }
}

function scoreLabel(p: Player, ruleId: string): string {
  const s = p.ruleState
  switch(ruleId) {
    case 'free':     return `${s.correct??0}◯  ${s.wrong??0}×`
    case 'mon':      return `${s.correct??0}◯  ${s.wrong??0}×`
    case 'newyork':  return `${s.score??0}pt`
    case 'updown':   return `${s.score??0}pt`
    case 'by':       return `積${(s.correct as number??0)*((s.wrong as number??0))}`
    case 'freeze':   return `${s.score??0}◯  休${s.rest??0}`
    case 'mon_rest': return `${s.score??0}◯  休${s.rest??0}`
    case 'swedish':  return `${s.correct??0}◯  P${s.penalty??0}`
    case 'divide':   return `${s.score??0}pt`
    case 'lucky':    return `${s.score??0}pt`
    case 'rensei':   return `${s.score??0}pt${s.hasRight?' ⚡':''}`
    case 'rengou':   return `${s.correct??0}◯  ${s.wrong??0}×`
    case 'combo':    return `${s.score??0}pt 🔥${s.combo??0}`
    default:         return `${p.score}`
  }
}

export default function GamePage() {
  const { roomId } = useParams<{ roomId:string }>()
  const { roomState, myId, buzz, submitAnswer } = useSocketContext()
  const navigate = useNavigate()
  const [answer, setAnswer] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const countdown = useCountdown(roomState?.timerEndsAt ?? null)

  const [showQNum, setShowQNum] = useState(false)
  const prevIdx = useRef(-1)
  const qNumTimer = useRef<ReturnType<typeof setTimeout>|null>(null)

  useEffect(() => {
    if (roomState?.phase==='question' && roomState.currentQuestionIndex !== prevIdx.current) {
      prevIdx.current = roomState.currentQuestionIndex
      if (qNumTimer.current) clearTimeout(qNumTimer.current)
      setShowQNum(true)
      qNumTimer.current = setTimeout(() => setShowQNum(false), 1500)
    }
  }, [roomState?.phase, roomState?.currentQuestionIndex])

  const twActive = !showQNum && roomState?.phase==='question'
  const { displayed: qText, done: twDone } = useTypewriter(roomState?.currentQuestion?.text ?? '', twActive)

  const qTextRef = useRef('')
  const [frozen, setFrozen] = useState('')
  useEffect(() => { qTextRef.current = qText }, [qText])
  const prevPhase = useRef<string|null>(null)
  useEffect(() => {
    const ph = roomState?.phase ?? null
    if (ph==='answering' && prevPhase.current==='question') setFrozen(qTextRef.current)
    else if (ph==='result' && (roomState?.lastJudgement==='skip' || roomState?.lastJudgement==='incorrect')) setFrozen(roomState?.currentQuestion?.text ?? '')
    prevPhase.current = ph
  }, [roomState?.phase, roomState?.lastJudgement, roomState?.currentQuestion?.text])

  useEffect(() => { if (roomState?.phase==='lobby') navigate('/room/'+roomId,{replace:true}) }, [roomState?.phase, roomId, navigate])
  useEffect(() => {
    if (roomState?.phase==='answering' && roomState.buzzedPlayerId===myId) {
      setAnswer(''); setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [roomState?.phase, roomState?.buzzedPlayerId, myId])

  if (!roomState) return <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)' }}>接続中...</div>

  const { phase, currentQuestion, players, buzzedPlayerName, lastJudgement, currentQuestionIndex, totalQuestions, settings } = roomState
  const isBuzzed = roomState.buzzedPlayerId === myId
  const ruleId = settings?.ruleId ?? 'free'
  const sorted = [...players].sort((a,b) => {
    const o = {WIN:0,ACTIVE:1,LOSE:2}
    const d = (o[a.status]??1) - (o[b.status]??1)
    return d !== 0 ? d : b.score - a.score
  })
  const shownText = (phase==='answering'||phase==='result') ? frozen : qText
  const showCD = (phase==='question' && twDone) || phase==='answering'
  const urgent = countdown <= 3

  function submit() { const t=answer.trim(); if(!t) return; submitAnswer(t); setAnswer('') }

  /* Q番号 */
  if (showQNum) return (
    <div style={{ minHeight:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:40,padding:24 }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontFamily:'Orbitron,sans-serif',color:'var(--muted)',fontSize:11,letterSpacing:4,marginBottom:12 }}>QUESTION</p>
        <p style={{ fontFamily:'Orbitron,sans-serif',fontSize:100,fontWeight:900,color:'var(--accent)',lineHeight:1 }}>{currentQuestionIndex+1}</p>
        <p style={{ color:'var(--muted)',fontSize:16,marginTop:8 }}>/ {totalQuestions}</p>
      </div>
      <Board players={sorted} myId={myId} ruleId={ruleId} />
    </div>
  )

  /* 終了 */
  if (phase==='finished') return (
    <div style={{ minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 20px' }}>
      <div style={{ width:'100%',maxWidth:400 }}>
        <div style={{ textAlign:'center',marginBottom:32 }}>
          <div style={{ fontSize:60 }}>🏆</div>
          <p style={{ fontFamily:'Orbitron,sans-serif',fontSize:22,fontWeight:900,color:'var(--gold)',marginTop:8 }}>GAME OVER</p>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:28 }}>
          {sorted.map((p,i) => (
            <div key={p.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'14px 18px',
              background: p.status==='WIN'?'rgba(16,185,129,0.1)':p.status==='LOSE'?'rgba(244,63,94,0.08)':'var(--surface)',
              borderRadius:12,border:`1px solid ${p.status==='WIN'?'rgba(16,185,129,0.3)':p.status==='LOSE'?'rgba(244,63,94,0.2)':'var(--border)'}` }}>
              <span style={{ fontSize:i<3?24:15,width:32,textAlign:'center' }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}</span>
              <span style={{ flex:1,fontWeight:p.id===myId?800:400,color:p.id===myId?'var(--text)':'var(--sub)' }}>{p.name}</span>
              <span style={{ fontSize:13,fontWeight:700,color:p.status==='WIN'?'var(--correct)':p.status==='LOSE'?'var(--wrong)':'var(--muted)' }}>
                {p.status==='WIN'?'勝ち抜け':p.status==='LOSE'?'失格':scoreLabel(p,ruleId)}
              </span>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/')} style={{ width:'100%',padding:'15px',background:'var(--surface)',color:'var(--text)',borderRadius:12,fontSize:15,fontWeight:700,border:'1px solid var(--border)' }}>
          トップに戻る
        </button>
      </div>
    </div>
  )

  const progress = totalQuestions > 0 ? (currentQuestionIndex / totalQuestions) * 100 : 0

  /* ゲーム */
  return (
    <div style={{ minHeight:'100vh',display:'flex',flexDirection:'column' }}>
      {/* ヘッダー */}
      <div style={{ background:'var(--surface)',borderBottom:'1px solid var(--border)' }}>
        <div style={{ height:2,background:'var(--border)' }}>
          <div style={{ height:'100%',width:`${progress}%`,background:'linear-gradient(90deg,var(--accent),var(--gold))',transition:'width .5s' }}/>
        </div>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 20px' }}>
          <span style={{ fontFamily:'Orbitron,sans-serif',fontWeight:700,fontSize:14 }}>
            Q.{currentQuestionIndex+1}<span style={{ color:'var(--muted)',fontWeight:400,fontSize:12 }}> / {totalQuestions}</span>
          </span>
          <span style={{ fontSize:11,color:'var(--muted)',fontWeight:600,letterSpacing:1 }}>{ruleId.toUpperCase()}</span>
          {showCD && (
            <div style={{ fontFamily:'Orbitron,sans-serif',fontSize:20,fontWeight:900,
              color:urgent?'var(--wrong)':'var(--gold)',
              padding:'4px 12px',borderRadius:8,
              background:urgent?'rgba(244,63,94,0.12)':'rgba(251,191,36,0.1)',
              border:`1px solid ${urgent?'rgba(244,63,94,0.3)':'rgba(251,191,36,0.2)'}`,
              transition:'all .3s' }}>
              {countdown}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex:1,maxWidth:480,width:'100%',margin:'0 auto',padding:'16px 20px 40px',display:'flex',flexDirection:'column',gap:12 }}>

        {/* 問題文 */}
        <div style={{ background:'var(--surface)',borderRadius:14,padding:'22px 20px',minHeight:96 }}>
          <p style={{ fontSize:20,lineHeight:1.8,fontWeight:500 }}>{shownText||'\u00A0'}</p>
        </div>

        {/* 早押し */}
        {phase==='question' && (
          <button onClick={buzz} style={{ padding:'28px',background:'linear-gradient(135deg,var(--buzz),#f97316)',color:'#fff',borderRadius:14,fontSize:24,fontWeight:900,boxShadow:'0 6px 28px rgba(244,63,94,0.4)',letterSpacing:2 }}>
            早押し！
          </button>
        )}

        {/* 回答 */}
        {phase==='answering' && (
          <div style={{ background:'var(--surface)',borderRadius:14,padding:'18px 20px' }}>
            <p style={{ fontWeight:700,fontSize:15,marginBottom:isBuzzed?14:0,color:isBuzzed?'var(--accent)':'var(--muted)' }}>
              {isBuzzed?'⚡ あなたの番！':`⏳ ${buzzedPlayerName} が回答中...`}
            </p>
            {isBuzzed && (
              <div style={{ display:'flex',gap:8 }}>
                <input ref={inputRef} value={answer} onChange={e=>setAnswer(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'&&!e.nativeEvent.isComposing) submit() }}
                  placeholder="ひらがなで入力"
                  style={{ flex:1,padding:'12px 14px',background:'var(--surface2)',border:'2px solid var(--accent)',borderRadius:10,fontSize:16,color:'var(--text)' }}/>
                <button onClick={submit} style={{ padding:'12px 18px',background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'#fff',borderRadius:10,fontSize:15,fontWeight:800 }}>送信</button>
              </div>
            )}
          </div>
        )}

        {/* 結果 */}
        {phase==='result' && (()=>{
          const ok=lastJudgement==='correct', sk=lastJudgement==='skip'
          const answerer = players.find(p=>p.id===roomState.lastAnswerPlayerId)
          return (
            <div style={{ background:'var(--surface)',borderRadius:14,padding:'24px 20px',textAlign:'center',
              borderLeft:`4px solid ${ok?'var(--correct)':sk?'var(--muted)':'var(--wrong)'}` }}>
              <div style={{ fontSize:44,marginBottom:8 }}>{ok?'⭕':sk?'⏭':'❌'}</div>
              <p style={{ fontSize:22,fontWeight:900,color:ok?'var(--correct)':sk?'var(--muted)':'var(--wrong)',marginBottom:6 }}>
                {ok?'正解！':sk?'スルー':'不正解'}
              </p>
              {!sk&&answerer&&<p style={{ color:'var(--muted)',fontSize:13,marginBottom:8 }}>{answerer.name}</p>}
              {!sk&&answerer&&answerer.status!=='ACTIVE'&&(
                <p style={{ fontSize:13,fontWeight:700,color:answerer.status==='WIN'?'var(--correct)':'var(--wrong)',marginBottom:8 }}>
                  {answerer.status==='WIN'?'🎉 勝ち抜け！':'💀 失格'}
                </p>
              )}
              <div style={{ background:'var(--surface2)',borderRadius:8,padding:'8px 20px',display:'inline-block',marginTop:4 }}>
                <span style={{ color:'var(--muted)',fontSize:13 }}>答え：</span>
                <span style={{ fontWeight:900,fontSize:18 }}>{currentQuestion?.displayAnswer}</span>
              </div>
            </div>
          )
        })()}

        {/* スコア */}
        <div>
          <p style={{ fontSize:11,fontWeight:700,letterSpacing:2,color:'var(--muted)',marginBottom:10,textTransform:'uppercase' }}>Score</p>
          <Board players={sorted} myId={myId} ruleId={ruleId}/>
        </div>
      </div>
    </div>
  )
}

function Board({players,myId,ruleId}:{players:Player[];myId:string;ruleId:string}) {
  return (
    <div style={{ width:'100%',maxWidth:400,display:'flex',flexDirection:'column',gap:6 }}>
      {players.map((p,i)=>{
        const win=p.status==='WIN', lose=p.status==='LOSE'
        return (
          <div key={p.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'11px 16px',
            background:p.id===myId?'rgba(99,102,241,0.1)':win?'rgba(16,185,129,0.07)':lose?'rgba(244,63,94,0.07)':'var(--surface)',
            borderRadius:12,border:`1px solid ${p.id===myId?'rgba(99,102,241,0.3)':win?'rgba(16,185,129,0.2)':lose?'rgba(244,63,94,0.2)':'var(--border)'}` }}>
            <span style={{ fontFamily:'Orbitron,sans-serif',fontSize:11,color:i===0?'var(--gold)':'var(--muted)',width:18,textAlign:'center' }}>
              {i===0?'▲':`${i+1}`}
            </span>
            <span style={{ flex:1,fontSize:14,fontWeight:p.id===myId?800:400,
              color:win?'var(--correct)':lose?'var(--wrong)':'var(--text)',
              textDecoration:lose?'line-through':undefined }}>
              {p.name}{p.isHost?' 👑':''}
            </span>
            {(win||lose)&&<span style={{ fontSize:11,fontWeight:700,color:win?'var(--correct)':'var(--wrong)' }}>{win?'勝抜':'失格'}</span>}
            <span style={{ fontFamily:'Orbitron,sans-serif',fontSize:12,fontWeight:700,color:'var(--accent)' }}>
              {scoreLabel(p,ruleId)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
