import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
import RoomChat from '../components/RoomChat'
import Board from '../components/Board'
import { useCountdown } from '../hooks/useCountdown'
import { useTypewriter } from '../hooks/useTypewriter'
import { scoreLabel } from '../utils/scoreLabel'
import type { Player } from '../types'

const SFX = {
  buzz:    () => { playTone(150,'sawtooth',0.05,0.5); playTone(300,'square',0.06,0.35,0.03); playTone(450,'sine',0.08,0.2,0.06) },
  correct: () => { [523,659,784,1047].forEach((f,i) => playTone(f,'sine',0.25,0.35,i*0.09)) },
  wrong:   () => { playTone(200,'sawtooth',0.35,0.4); playTone(140,'sawtooth',0.3,0.3,0.12); playTone(100,'square',0.2,0.2,0.25) },
  skip:    () => { playTone(440,'sine',0.12,0.18); playTone(330,'sine',0.1,0.15,0.13) },
  qstart:  () => { playTone(660,'sine',0.08,0.18); playTone(880,'sine',0.07,0.14,0.09); playTone(1100,'sine',0.06,0.1,0.18) },
  tick:    () => playTone(880,'sine',0.04,0.07),
  urgent:  () => { playTone(960,'square',0.1,0.07); playTone(720,'square',0.08,0.06,0.06) },
  win:     () => { [523,659,784,880,1047,1319,1568].forEach((f,i) => playTone(f,'sine',0.6,0.4,i*0.07)) },
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




function playTone(freq: number, type: OscillatorType = 'sine', gain = 0.2, duration = 0.3, delay = 0) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.connect(g); g.connect(ctx.destination)
    osc.type = type; osc.frequency.value = freq
    g.gain.setValueAtTime(0, ctx.currentTime + delay)
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration)
    osc.start(ctx.currentTime + delay)
    osc.stop(ctx.currentTime + delay + duration)
  } catch {}
}

export default function GamePage() {
  const { roomId } = useParams<{ roomId:string }>()
  const { roomState, myId, buzz, submitAnswer, resetGame, isHost, syncState, prematchInfo, rateResult, setPrematchInfo, setRateResult } = useSocketContext()
  const navigate = useNavigate()
  const [answer, setAnswer] = useState('')
  const [prematchCountdown, setPrematchCountdown] = useState(5)
  const isComposing = useRef(false)
  useEffect(() => { if (roomId) syncState(roomId) }, [roomId])
  useEffect(() => {
    if (!prematchInfo) return
    setPrematchCountdown(Math.ceil(prematchInfo.startsIn / 1000))
    const iv = setInterval(() => {
      setPrematchCountdown(n => {
        if (n <= 1) { clearInterval(iv); return 0 }
        return n - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [prematchInfo])
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
  const { displayed: qText, done: twDone } = useTypewriter(roomState?.currentQuestion?.text ?? '', twActive, 120)

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

  useEffect(() => { if (roomState?.phase==='lobby' && !prematchInfo) navigate('/room/'+roomId,{replace:true}) }, [roomState?.phase, roomId, navigate, prematchInfo])
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

  if (!roomState) return <div style={{ minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',maxWidth:'var(--w)',margin:'0 auto' }}>接続中...</div>

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
    <div style={{ minHeight:'100dvh',background:'var(--bg)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:40,padding:24,maxWidth:'var(--w)',margin:'0 auto' }}>
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

  // プレマッチ画面
  if (prematchInfo) {
    const { myPlayer, opponent } = prematchInfo
    const myResult = roomState?.players.find(p => p.id === myId)?.status
    if (roomState?.phase !== 'lobby' && roomState?.phase !== 'question') {
      // ゲーム開始したらprematch非表示
    } else return (
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center',
        background:'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', padding:'24px' }}>
        <div style={{ width:'100%', maxWidth:480 }}>
          {/* カウントダウン */}
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, fontWeight:700, letterSpacing:3, textTransform:'uppercase', marginBottom:8 }}>
              MATCH FOUND
            </p>
            <p style={{ color:'#fff', fontSize:16, fontWeight:700 }}>
              {prematchCountdown > 0 ? `${prematchCountdown}秒後にスタート` : 'スタート！'}
            </p>
          </div>
          {/* VS */}
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            {[myPlayer, opponent].map((pl, i) => (
              <div key={pl.id} style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:16, padding:'20px 16px', textAlign:'center',
                border: i===0 ? '1.5px solid rgba(99,102,241,0.5)' : '1.5px solid rgba(244,63,94,0.4)' }}>
                <div style={{ width:64, height:64, borderRadius:'50%', margin:'0 auto 12px',
                  background:'rgba(255,255,255,0.1)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
                  {pl.avatarUrl
                    ? <img src={pl.avatarUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : '👤'}
                </div>
                <p style={{ color:'#fff', fontWeight:800, fontSize:15, marginBottom:4 }}>{pl.name}</p>
                <p style={{ color:'rgba(255,255,255,0.6)', fontSize:22, fontWeight:900, marginBottom:8 }}>{pl.rate}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {pl.winStreak > 0 && (
                    <span style={{ background:'rgba(251,191,36,0.15)', color:'#fbbf24', borderRadius:6, fontSize:12, fontWeight:700, padding:'3px 8px' }}>
                      🔥 {pl.winStreak}連勝中
                    </span>
                  )}
                  <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>
                    {i===0 ? 'あなた' : '相手'}
                  </span>
                </div>
              </div>
            ))}
            <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)',
              background:'linear-gradient(135deg,var(--accent),var(--accent2))', borderRadius:'50%',
              width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center',
              color:'#fff', fontWeight:900, fontSize:14, boxShadow:'0 0 24px rgba(99,102,241,0.5)' }}>
              VS
            </div>
          </div>
          {/* プログレスバー */}
          <div style={{ marginTop:28, height:4, background:'rgba(255,255,255,0.1)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'var(--accent)', borderRadius:2,
              width: `${((prematchInfo.startsIn/1000 - prematchCountdown) / (prematchInfo.startsIn/1000)) * 100}%`,
              transition:'width 1s linear' }} />
          </div>
        </div>
      </div>
    )
  }

  if (phase==='finished') return (
    <div style={{ minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 20px',maxWidth:'var(--w)',margin:'0 auto' }}>
      <div style={{ width:'100%',maxWidth:400 }}>
        <div style={{ textAlign:'center',marginBottom:32,animation:'winStar 0.6s cubic-bezier(.34,1.56,.64,1) both' }}>
          <div style={{ fontSize:72 }}>🏆</div>
          <p style={{ fontFamily:'Orbitron,sans-serif',fontSize:22,fontWeight:900,color:'var(--gold)',marginTop:8,
            textShadow:'0 0 20px rgba(251,191,36,0.6)' }}>GAME OVER</p>

      {/* レートResult オーバーレイ */}
      {rateResult && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:24 }}>
          <div style={{ background:'var(--surface)', borderRadius:20, padding:'36px 32px', textAlign:'center', maxWidth:320, width:'100%',
            boxShadow:'0 0 60px rgba(99,102,241,0.3)', animation:'slideUp 0.5s ease' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--muted)', letterSpacing:2, textTransform:'uppercase', marginBottom:12 }}>RESULT</p>
            <p style={{ fontSize:52, fontWeight:900, marginBottom:4,
              color: rateResult.result==='WIN' ? 'var(--correct)' : 'var(--wrong)',
              textShadow: rateResult.result==='WIN' ? '0 0 30px rgba(16,185,129,0.5)' : '0 0 30px rgba(244,63,94,0.5)' }}>
              {rateResult.result==='WIN' ? '勝利' : '敗北'}
            </p>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, margin:'20px 0' }}>
              <span style={{ fontSize:28, fontWeight:900, color:'var(--muted)' }}>{rateResult.oldRate}</span>
              <span style={{ fontSize:18, color:'var(--muted)' }}>→</span>
              <span style={{ fontSize:36, fontWeight:900, color:'var(--text)' }}>{rateResult.newRate}</span>
            </div>
            <p style={{ fontSize:22, fontWeight:900, marginBottom:24,
              color: rateResult.delta > 0 ? 'var(--correct)' : 'var(--wrong)' }}>
              {rateResult.delta > 0 ? `+${rateResult.delta}` : rateResult.delta}
            </p>
            <button onClick={() => { setRateResult(null); setPrematchInfo(null) }}
              style={{ width:'100%', padding:'13px', borderRadius:12, fontSize:15, fontWeight:800,
                background:'linear-gradient(135deg,var(--accent),var(--accent2))', color:'#fff', border:'none', cursor:'pointer' }}>
              結果を見る
            </button>
          </div>
        </div>
      )}

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
    <>
    <div style={{ minHeight:'100dvh',display:'flex',flexDirection:'column',maxWidth:'var(--w)',margin:'0 auto',
      animation: screenFlash ? `${screenFlash==='correct'?'correctFlash':'wrongFlash'} 0.6s ease` : undefined,
      paddingBottom: phase==='question' ? 160 : 0 }}>
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

      <div style={{ flex:1,width:'100%',padding:'16px 20px 40px',display:'flex',flexDirection:'column',gap:12 }}>

        {/* 問題文 */}
        <div style={{ background:'var(--surface)',borderRadius:14,padding:'22px 20px',minHeight:96,
          boxShadow: phase==='question' ? '0 0 0 1px var(--border)' : undefined }}>
          <p style={{ fontSize:20,lineHeight:1.8,fontWeight:500 }}>{shownText||'\u00A0'}</p>
        </div>

        {/* 早押し：画面下部固定 */}
        {phase==='question' && (
          <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:'12px 16px',
            paddingBottom:'calc(12px + env(safe-area-inset-bottom))',
            background:'linear-gradient(to top, var(--bg) 80%, transparent)',
            zIndex:100 }}>
            <button onClick={handleBuzz}
              style={{ width:'100%', height:120,
                background:'linear-gradient(135deg,var(--buzz),#f97316)',
                color:'#fff',borderRadius:20,fontSize:28,fontWeight:900,
                boxShadow:'0 8px 32px rgba(244,63,94,0.5)',
                letterSpacing:2,
                animation: buzzAnim ? 'buzzPop 0.35s cubic-bezier(.34,1.56,.64,1)' : undefined,
                transition:'box-shadow 0.15s,transform 0.1s',
                WebkitTapHighlightColor:'transparent',
                userSelect:'none',
              }}>
              ⚡ 早押し！
            </button>
          </div>
        )}

        {/* 回答 */}
        {phase==='answering' && (
          <div style={{ background:'var(--surface)',borderRadius:14,padding:'18px 20px',
            animation:'slideUp 0.3s ease both',
            border: isBuzzed ? '2px solid var(--accent)' : '1px solid var(--border)',
            boxShadow: isBuzzed ? '0 0 20px rgba(99,102,241,0.25)' : undefined,
            position: isBuzzed ? 'sticky' : undefined,
            bottom: isBuzzed ? 8 : undefined }}>
            <p style={{ fontWeight:700,fontSize:15,marginBottom:isBuzzed?14:0,color:isBuzzed?'var(--accent)':'var(--muted)' }}>
              {isBuzzed?'⚡ あなたの番！':`⏳ ${buzzedPlayerName} が回答中...`}
            </p>
            {isBuzzed && (
              <div style={{ display:'flex',flexDirection:'column',gap:10,animation:'shake 0.3s ease' }}>
                <input ref={inputRef} value={answer} onChange={e=>setAnswer(e.target.value)}
                  onCompositionStart={()=>{ isComposing.current=true }}
                  onCompositionEnd={e=>{ isComposing.current=false; setAnswer((e.target as HTMLInputElement).value) }}
                  onKeyDown={e=>{ if(e.key==='Enter'&&!e.nativeEvent.isComposing) submit() }}
                  placeholder="ひらがなで入力"
                  autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                  style={{ width:'100%',padding:'14px 16px',background:'var(--surface2)',border:'2px solid var(--accent)',borderRadius:12,fontSize:18,color:'var(--text)',boxSizing:'border-box' }}/>
                <button onClick={submit}
                  style={{ width:'100%',padding:'16px',background:'linear-gradient(135deg,var(--accent),var(--accent2))',
                    color:'#fff',borderRadius:12,fontSize:18,fontWeight:900,
                    boxShadow:'0 4px 20px rgba(99,102,241,0.4)',
                    WebkitTapHighlightColor:'transparent' }}>
                  送信 →
                </button>
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
    <RoomChat myId={myId} />
    </>
  )
}

