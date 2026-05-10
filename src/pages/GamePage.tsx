import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
import type { Player } from '../types'

/* ─── サウンド ─── */
function createAudioCtx() {
  return new (window.AudioContext || (window as any).webkitAudioContext)()
}
function playTone(freq: number, type: OscillatorType, duration: number, gain = 0.3, delay = 0) {
  try {
    const ctx = createAudioCtx()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.connect(g); g.connect(ctx.destination)
    osc.type = type; osc.frequency.value = freq
    const t = ctx.currentTime + delay
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + duration)
    osc.start(t); osc.stop(t + duration)
    setTimeout(() => ctx.close(), (delay + duration + 0.2) * 1000)
  } catch {}
}
const SFX = {
  buzz:    () => { playTone(220, 'sawtooth', 0.08, 0.4); playTone(330, 'square', 0.08, 0.2, 0.05) },
  correct: () => { [523,659,784,1047].forEach((f,i) => playTone(f,'sine',0.3,0.3,i*0.1)) },
  wrong:   () => { playTone(180,'sawtooth',0.4,0.3); playTone(120,'sawtooth',0.3,0.25,0.15) },
  skip:    () => { playTone(400,'sine',0.15,0.2); playTone(300,'sine',0.15,0.15,0.15) },
  qstart:  () => { playTone(880,'sine',0.1,0.15); playTone(1100,'sine',0.08,0.1,0.1) },
  tick:    () => playTone(800,'sine',0.06,0.08),
  urgent:  () => { playTone(900,'square',0.12,0.06); playTone(700,'square',0.1,0.05,0.07) },
  win:     () => { [523,659,784,880,1047,1319].forEach((f,i) => playTone(f,'sine',0.5,0.4,i*0.08)) },
}

/* ─── CSS animations ─── */
const STYLES = `
@keyframes buzzPop{0%{transform:scale(1)}30%{transform:scale(0.93)}60%{transform:scale(1.06)}100%{transform:scale(1)}}
@keyframes resultIn{0%{transform:scale(0.7) translateY(20px);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
@keyframes correctFlash{0%,100%{background:rgba(16,185,129,0)}30%{background:rgba(16,185,129,0.25)}}
@keyframes wrongFlash{0%,100%{background:rgba(244,63,94,0)}30%{background:rgba(244,63,94,0.22)}}
@keyframes qnumIn{0%{transform:scale(0.4);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
@keyframes urgentPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
@keyframes slideUp{0%{transform:translateY(16px);opacity:0}100%{transform:translateY(0);opacity:1}}
@keyframes winStar{0%{transform:scale(0) rotate(-20deg);opacity:0}60%{transform:scale(1.2) rotate(5deg)}100%{transform:scale(1) rotate(0);opacity:1}}
@keyframes progressBar{0%{background-position:0% 50%}100%{background-position:200% 50%}}
`

/* ─── hooks ─── */
function useCountdown(timerEndsAt: number | null) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!timerEndsAt) { setRemaining(0); return }
    const update = () => setRemaining(Math.max(0, Math.floor((timerEndsAt - Date.now()) / 1000)))
    update(); const id = setInterval(update, 200); return () => clearInterval(id)
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
      pos.current++; setDisplayed(text.slice(0, pos.current))
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
  const { roomState, myId, buzz, submitAnswer, resetGame, isHost } = useSocketContext()
  const navigate = useNavigate()
  const [answer, setAnswer] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const countdown = useCountdown(roomState?.timerEndsAt ?? null)

  // アニメーション状態
  const [buzzAnim, setBuzzAnim] = useState(false)
  const [resultAnim, setResultAnim] = useState(false)
  const [screenFlash, setScreenFlash] = useState<'correct'|'wrong'|null>(null)
  const prevPhaseRef = useRef<string|null>(null)
  const prevJudgement = useRef<string|null>(null)
  const prevCountdown = useRef(0)

  const [showQNum, setShowQNum] = useState(false)
  const prevIdx = useRef(-1)
  const qNumTimer = useRef<ReturnType<typeof setTimeout>|null>(null)

  // inject styles once
  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = STYLES
    document.head.appendChild(el)
    return () => el.remove()
  }, [])

  // Q番号表示 + qstart音
  useEffect(() => {
    if (roomState?.phase==='question' && roomState.currentQuestionIndex !== prevIdx.current) {
      prevIdx.current = roomState.currentQuestionIndex
      if (qNumTimer.current) clearTimeout(qNumTimer.current)
      setShowQNum(true)
      SFX.qstart()
      qNumTimer.current = setTimeout(() => setShowQNum(false), 1500)
    }
  }, [roomState?.phase, roomState?.currentQuestionIndex])

  // result 演出
  useEffect(() => {
    const ph = roomState?.phase
    const j = roomState?.lastJudgement
    if (ph === 'result' && prevPhaseRef.current !== 'result') {
      setResultAnim(false)
      requestAnimationFrame(() => requestAnimationFrame(() => setResultAnim(true)))
      if (j === 'correct') { SFX.correct(); setScreenFlash('correct') }
      else if (j === 'incorrect') { SFX.wrong(); setScreenFlash('wrong') }
      else { SFX.skip() }
      prevJudgement.current = j ?? null
      setTimeout(() => setScreenFlash(null), 600)
    }
    // win detection
    if (ph === 'result' && j === 'correct') {
      const winner = roomState?.players.find(p => p.id === roomState.lastAnswerPlayerId)
      if (winner?.status === 'WIN') setTimeout(() => SFX.win(), 300)
    }
    prevPhaseRef.current = ph ?? null
  }, [roomState?.phase, roomState?.lastJudgement])

  // カウントダウン音
  useEffect(() => {
    if (countdown !== prevCountdown.current) {
      if (countdown <= 3 && countdown > 0 && (roomState?.phase==='question'||roomState?.phase==='answering')) {
        countdown <= 3 ? SFX.urgent() : SFX.tick()
      }
      prevCountdown.current = countdown
    }
  }, [countdown, roomState?.phase])

  const twActive = !showQNum && roomState?.phase==='question'
  const { displayed: qText, done: twDone } = useTypewriter(roomState?.currentQuestion?.text ?? '', twActive)

  const qTextRef = useRef('')
  const [frozen, setFrozen] = useState('')
  useEffect(() => { qTextRef.current = qText }, [qText])
  const prevPhase2 = useRef<string|null>(null)
  useEffect(() => {
    const ph = roomState?.phase ?? null
    if (ph==='answering' && prevPhase2.current==='question') setFrozen(qTextRef.current)
    else if (ph==='result' && (roomState?.lastJudgement==='skip' || roomState?.lastJudgement==='incorrect')) setFrozen(roomState?.currentQuestion?.text ?? '')
    prevPhase2.current = ph
  }, [roomState?.phase, roomState?.lastJudgement, roomState?.currentQuestion?.text])

  useEffect(() => { if (roomState?.phase==='lobby') navigate('/room/'+roomId,{replace:true}) }, [roomState?.phase, roomId, navigate])
  useEffect(() => {
    if (roomState?.phase==='answering' && roomState.buzzedPlayerId===myId) {
      setAnswer(''); setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [roomState?.phase, roomState?.buzzedPlayerId, myId])

  const handleBuzz = useCallback(() => {
    SFX.buzz()
    setBuzzAnim(true)
    setTimeout(() => setBuzzAnim(false), 400)
    buzz()
  }, [buzz])

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
      <div style={{ textAlign:'center', animation:'qnumIn 0.5s cubic-bezier(.34,1.56,.64,1) both' }}>
        <p style={{ fontFamily:'Orbitron,sans-serif',color:'var(--muted)',fontSize:11,letterSpacing:4,marginBottom:12 }}>QUESTION</p>
        <p style={{ fontFamily:'Orbitron,sans-serif',fontSize:100,fontWeight:900,color:'var(--accent)',lineHeight:1,
          textShadow:'0 0 40px rgba(99,102,241,0.6)' }}>{currentQuestionIndex+1}</p>
        <p style={{ color:'var(--muted)',fontSize:16,marginTop:8 }}>/ {totalQuestions}</p>
      </div>
      <Board players={sorted} myId={myId} ruleId={ruleId} />
    </div>
  )

  /* 終了 */
  if (phase==='finished') return (
    <div style={{ minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 20px' }}>
      <div style={{ width:'100%',maxWidth:400 }}>
        <div style={{ textAlign:'center',marginBottom:32,animation:'winStar 0.6s cubic-bezier(.34,1.56,.64,1) both' }}>
          <div style={{ fontSize:72 }}>🏆</div>
          <p style={{ fontFamily:'Orbitron,sans-serif',fontSize:22,fontWeight:900,color:'var(--gold)',marginTop:8,
            textShadow:'0 0 20px rgba(251,191,36,0.6)' }}>GAME OVER</p>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:28 }}>
          {sorted.map((p,i) => (
            <div key={p.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'14px 18px',
              background: p.status==='WIN'?'rgba(16,185,129,0.1)':p.status==='LOSE'?'rgba(244,63,94,0.08)':'var(--surface)',
              borderRadius:12,border:`1px solid ${p.status==='WIN'?'rgba(16,185,129,0.3)':p.status==='LOSE'?'rgba(244,63,94,0.2)':'var(--border)'}`,
              animation:`slideUp 0.4s ease both`,animationDelay:`${i*0.07}s` }}>
              <span style={{ fontSize:i<3?24:15,width:32,textAlign:'center' }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}</span>
              <span style={{ flex:1,fontWeight:p.id===myId?800:400,color:p.id===myId?'var(--text)':'var(--sub)' }}>{p.name}</span>
              <span style={{ fontSize:13,fontWeight:700,color:p.status==='WIN'?'var(--correct)':p.status==='LOSE'?'var(--wrong)':'var(--muted)' }}>
                {p.status==='WIN'?'勝ち抜け':p.status==='LOSE'?'失格':scoreLabel(p,ruleId)}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {isHost && (
            <button onClick={resetGame} style={{ width:'100%',padding:'15px',background:'linear-gradient(135deg,var(--accent),var(--accent2))',color:'#fff',borderRadius:12,fontSize:15,fontWeight:700,border:'none',boxShadow:'0 4px 16px rgba(99,102,241,0.35)' }}>
              もう一度遊ぶ
            </button>
          )}
          <button onClick={() => navigate('/')} style={{ width:'100%',padding:'15px',background:'var(--surface)',color:'var(--text)',borderRadius:12,fontSize:15,fontWeight:700,border:'1px solid var(--border)' }}>
            トップに戻る
          </button>
        </div>
      </div>
    </div>
  )

  const progress = totalQuestions > 0 ? (currentQuestionIndex / totalQuestions) * 100 : 0

  /* ゲーム */
  return (
    <div style={{ minHeight:'100vh',display:'flex',flexDirection:'column',
      animation: screenFlash ? `${screenFlash==='correct'?'correctFlash':'wrongFlash'} 0.6s ease` : undefined }}>
      {/* ヘッダー */}
      <div style={{ background:'var(--surface)',borderBottom:'1px solid var(--border)' }}>
        <div style={{ height:3,background:'var(--border)',overflow:'hidden' }}>
          <div style={{ height:'100%',width:`${progress}%`,
            background:'linear-gradient(90deg,var(--accent),var(--gold),var(--accent))',
            backgroundSize:'200% 100%',
            animation:'progressBar 2s linear infinite',
            transition:'width .5s ease' }}/>
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
              animation: urgent ? 'urgentPulse 0.4s ease infinite' : undefined,
              transition:'all .3s' }}>
              {countdown}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex:1,maxWidth:480,width:'100%',margin:'0 auto',padding:'16px 20px 40px',display:'flex',flexDirection:'column',gap:12 }}>

        {/* 問題文 */}
        <div style={{ background:'var(--surface)',borderRadius:14,padding:'22px 20px',minHeight:96,
          boxShadow: phase==='question' ? '0 0 0 1px var(--border)' : undefined }}>
          <p style={{ fontSize:20,lineHeight:1.8,fontWeight:500 }}>{shownText||'\u00A0'}</p>
        </div>

        {/* 早押し */}
        {phase==='question' && (
          <button onClick={handleBuzz}
            style={{ padding:'36px 28px',
              background:'linear-gradient(135deg,var(--buzz),#f97316)',
              color:'#fff',borderRadius:16,fontSize:26,fontWeight:900,
              boxShadow:'0 6px 28px rgba(244,63,94,0.45)',
              letterSpacing:2,width:'100%',
              animation: buzzAnim ? 'buzzPop 0.4s ease' : undefined,
              transition:'box-shadow 0.2s,transform 0.1s',
              transform: 'translateZ(0)',
            }}>
            ⚡ 早押し！
          </button>
        )}

        {/* 回答 */}
        {phase==='answering' && (
          <div style={{ background:'var(--surface)',borderRadius:14,padding:'18px 20px',
            animation:'slideUp 0.3s ease both',
            border: isBuzzed ? '2px solid var(--accent)' : '1px solid var(--border)',
            boxShadow: isBuzzed ? '0 0 20px rgba(99,102,241,0.25)' : undefined }}>
            <p style={{ fontWeight:700,fontSize:15,marginBottom:isBuzzed?14:0,color:isBuzzed?'var(--accent)':'var(--muted)' }}>
              {isBuzzed?'⚡ あなたの番！':`⏳ ${buzzedPlayerName} が回答中...`}
            </p>
            {isBuzzed && (
              <div style={{ display:'flex',gap:8,animation:'shake 0.3s ease' }}>
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
              borderLeft:`4px solid ${ok?'var(--correct)':sk?'var(--muted)':'var(--wrong)'}`,
              animation: resultAnim ? 'resultIn 0.45s cubic-bezier(.34,1.56,.64,1) both' : undefined,
              boxShadow: ok ? '0 0 30px rgba(16,185,129,0.2)' : !sk ? '0 0 30px rgba(244,63,94,0.15)' : undefined }}>
              <div style={{ fontSize:52,marginBottom:8,
                filter: ok ? 'drop-shadow(0 0 12px rgba(16,185,129,0.6))' : !sk ? 'drop-shadow(0 0 12px rgba(244,63,94,0.5))' : undefined }}>
                {ok?'⭕':sk?'⏭':'❌'}
              </div>
              <p style={{ fontSize:22,fontWeight:900,color:ok?'var(--correct)':sk?'var(--muted)':'var(--wrong)',marginBottom:6 }}>
                {ok?'正解！':sk?'スルー':'不正解'}
              </p>
              {!sk&&answerer&&<p style={{ color:'var(--muted)',fontSize:13,marginBottom:8 }}>{answerer.name}</p>}
              {!sk&&answerer&&answerer.status!=='ACTIVE'&&(
                <p style={{ fontSize:13,fontWeight:700,color:answerer.status==='WIN'?'var(--correct)':'var(--wrong)',marginBottom:8,
                  animation:'winStar 0.5s cubic-bezier(.34,1.56,.64,1) both' }}>
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
            borderRadius:12,border:`1px solid ${p.id===myId?'rgba(99,102,241,0.3)':win?'rgba(16,185,129,0.2)':lose?'rgba(244,63,94,0.2)':'var(--border)'}`,
            transition:'all 0.3s ease',
            boxShadow: win ? '0 0 12px rgba(16,185,129,0.2)' : undefined }}>
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
