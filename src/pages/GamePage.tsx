import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
import RoomChat from '../components/RoomChat'
import Board from '../components/Board'
import Score from '../components/Score'
import { Avatar, Button, Icon } from '../components/ui'
import { useCountdown } from '../hooks/useCountdown'
import { useTypewriter } from '../hooks/useTypewriter'
import { STAMPS, resolveStamp } from '../lib/stamps'
import type { Player } from '../types'
import '../styles/game.css'

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



/** 2 人対戦のとき、画面上部に出す自分 vs 相手 */
function VSHud({ players, myId, ruleId }: { players: Player[]; myId: string; ruleId: string }) {
  const me = players.find(p => p.id === myId)
  const opp = players.find(p => p.id !== myId)
  if (!me || !opp) return null
  const tone = (p: Player) => p.status === 'WIN' ? 'is-win' : p.status === 'LOSE' ? 'is-lose' : ''
  return (
    <div className="qg-hud">
      <div className="qg-hud__p">
        <Avatar name={me.name} size={32} />
        <div style={{ minWidth: 0 }}>
          <p className={`qg-hud__name ${tone(me)}`}>{me.name}</p>
          <Score className="qg-hud__score" player={me} ruleId={ruleId} />
        </div>
      </div>
      <div className="qg-hud__vs" aria-hidden="true">VS</div>
      <div className="qg-hud__p qg-hud__p--opp">
        <Avatar name={opp.name} size={32} className="qg-hud__avatar--opp" />
        <div style={{ minWidth: 0 }}>
          <p className={`qg-hud__name ${tone(opp)}`}>{opp.name}</p>
          <Score className="qg-hud__score" player={opp} ruleId={ruleId} />
        </div>
      </div>
    </div>
  )
}

function StampPicker({ onSend }: { onSend: (id: string) => void }) {
  return (
    <div className="qg__stamps" role="group" aria-label="スタンプ">
      {STAMPS.map(s => (
        <button key={s.id} className="qg__stamp" aria-label={s.label} title={s.label} onClick={() => onSend(s.id)}>
          <Icon name={s.icon} size={22} />
        </button>
      ))}
    </div>
  )
}

export default function GamePage() {
  const { roomId } = useParams<{ roomId:string }>()
  const { roomState, myId, buzz, submitAnswer, resetGame, isHost, syncState, prematchInfo, rateResult, setPrematchInfo, setRateResult, stamps, sendStamp } = useSocketContext()
  const navigate = useNavigate()
  const [answer, setAnswer] = useState('')
  const [prematchCountdown, setPrematchCountdown] = useState(5)
  const isComposing = useRef(false)
  const isMatchmakingGame = useRef(false)
  useEffect(() => { if (roomId) syncState(roomId) }, [roomId])
  useEffect(() => {
    if (!prematchInfo) return
    isMatchmakingGame.current = true
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
        if (countdown <= 3) SFX.urgent()
        else SFX.tick()
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

  useEffect(() => {
    if (prematchInfo && roomState?.phase !== 'lobby') setPrematchInfo(null)
  }, [roomState?.phase])
  useEffect(() => {
    if (roomState?.phase==='lobby' && !isMatchmakingGame.current) navigate('/room/'+roomId,{replace:true})
  }, [roomState?.phase, roomId, navigate])
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

  // PC: スペースキーでも早押しできる(入力欄・変換中・修飾キー付きは除く)
  useEffect(() => {
    if (roomState?.phase !== 'question') return
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      e.preventDefault()
      handleBuzz()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [roomState?.phase, handleBuzz])

  if (!roomState) return <div className="qg-center" role="status" style={{ color: 'var(--muted)' }}>接続中...</div>

  const { phase, currentQuestion, players, buzzedPlayerName, lastJudgement, currentQuestionIndex, totalQuestions, settings } = roomState
  const isBuzzed = roomState.buzzedPlayerId === myId
  const ruleId = settings?.ruleId ?? 'free'
  const statusOrder: Record<string, number> = { WIN: 0, ACTIVE: 1, LOSE: 2 }
  const sorted = [...players].sort((a, b) => {
    const d = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1)
    return d !== 0 ? d : b.score - a.score
  })
  const shownText = (phase === 'answering' || phase === 'result') ? frozen : qText
  const showCD = (phase === 'question' && twDone) || phase === 'answering'
  const urgent = countdown <= 3

  function submit() { const t = answer.trim(); if (!t) return; submitAnswer(t); setAnswer('') }

  /* Q番号 */
  if (showQNum) return (
    <div className="qg-center">
      <div className="qg-qnum" role="status">
        <small>QUESTION</small>
        <strong>{currentQuestionIndex + 1}</strong>
        <span>/ {totalQuestions}</span>
      </div>
      <Board players={sorted} myId={myId} ruleId={ruleId} />
    </div>
  )

  // プレマッチ画面
  if (prematchInfo && roomState?.phase === 'lobby') {
    const { myPlayer, opponent } = prematchInfo
    const total = prematchInfo.startsIn / 1000
    return (
      <div className="qg-pre">
        <div className="qg-pre__in">
          <p className="qg-pre__label">MATCH FOUND</p>
          <p className="qg-pre__sub" role="status">{prematchCountdown > 0 ? `${prematchCountdown}秒後にスタート` : '読み込み中...'}</p>
          <div className="qg-pre__vs">
            {[myPlayer, opponent].map((pl, i) => (
              <div key={pl.id} className={`qg-pre__card${i === 1 ? ' qg-pre__card--opp' : ''}`}>
                <Avatar name={pl.name} src={pl.avatarUrl} size={64} />
                <p className="qg-pre__name">{pl.name}</p>
                <p className="qg-pre__rate">{pl.rate}</p>
                {pl.winStreak > 0 && <span className="qg-pre__tag"><Icon name="flame" size={14} />{pl.winStreak}連勝中</span>}
                <span className="qg-pre__who">{i === 0 ? 'あなた' : '相手'}</span>
              </div>
            ))}
            <div className="qg-pre__badge" aria-hidden="true">VS</div>
          </div>
          <div className="qg-pre__bar" role="progressbar" aria-label="開始までの時間" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={Math.round(((total - prematchCountdown) / total) * 100)}>
            <i style={{ width: `${((total - prematchCountdown) / total) * 100}%` }} />
          </div>
        </div>
      </div>
    )
  }

  /* 終了 */
  if (phase === 'finished') return (
    <div className="qg-end">
      <div className="qg-end__in">
        <div className="qg-end__title">
          <Icon name="trophy" size={72} strokeWidth={1.5} />
          <h1>GAME OVER</h1>
        </div>
        <ol className="qg-end__list">
          {sorted.map((p, i) => (
            <li key={p.id} className={`qg-end__row${p.status === 'WIN' ? ' qg-end__row--win' : p.status === 'LOSE' ? ' qg-end__row--lose' : ''}${p.id === myId ? ' qg-end__row--me' : ''}`}
              style={{ animationDelay: `${i * 0.07}s` }}>
              <span className={`qg-end__rank qg-end__rank--${i + 1}`}>
                {i < 3 ? <Icon name="medal" size={26} label={`${i + 1}位`} /> : <span aria-label={`${i + 1}位`}>{i + 1}</span>}
              </span>
              <span className="qg-end__name">{p.name}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }} className={p.status === 'WIN' ? 'is-win' : p.status === 'LOSE' ? 'is-lose' : ''}>
                {p.status === 'WIN' ? '勝ち抜け' : p.status === 'LOSE' ? '失格' : <Score player={p} ruleId={ruleId} />}
              </span>
            </li>
          ))}
        </ol>
        <div className="qg-end__actions">
          {isHost && !isMatchmakingGame.current && (
            <Button variant="primary" size="lg" block onClick={resetGame}>もう一度遊ぶ</Button>
          )}
          <Button size="lg" block onClick={() => navigate('/')}>トップに戻る</Button>
        </div>
      </div>

      {/* レート結果 */}
      {rateResult && (
        <div className="qg-modal" role="dialog" aria-modal="true" aria-labelledby="rate-title">
          <div className="qg-modal__box">
            <p className="qg-modal__label" id="rate-title">RESULT</p>
            <p className={`qg-modal__result ${rateResult.result === 'WIN' ? 'is-win' : 'is-lose'}`}>{rateResult.result === 'WIN' ? '勝利' : '敗北'}</p>
            <div className="qg-modal__rate">
              <span style={{ fontSize: 28, fontWeight: 900 }}>{rateResult.oldRate}</span>
              <Icon name="arrow-right" size={20} label="から" />
              <b>{rateResult.newRate}</b>
            </div>
            <p className={`qg-modal__delta ${rateResult.delta > 0 ? 'is-win' : 'is-lose'}`}>{rateResult.delta > 0 ? `+${rateResult.delta}` : rateResult.delta}</p>
            <Button variant="primary" size="lg" block autoFocus onClick={() => { setRateResult(null); setPrematchInfo(null) }}>結果を見る</Button>
          </div>
        </div>
      )}
    </div>
  )

  const progress = totalQuestions > 0 ? (currentQuestionIndex / totalQuestions) * 100 : 0
  const questionCls = `qg__q${phase === 'answering' ? ' qg__q--answering' : phase === 'result' && lastJudgement === 'correct' ? ' qg__q--ok' : phase === 'result' && lastJudgement === 'incorrect' ? ' qg__q--ng' : ''}`

  /* ゲーム */
  return (
    <>
      <div className={`qg${screenFlash ? ` qg--${screenFlash}` : ''}`}>
        <header className="qg__head">
          <div className="qg__progress"><i style={{ width: `${progress}%` }} /></div>
          <div className="qg__bar">
            <span className="qg__qno">Q.{currentQuestionIndex + 1}<small> / {totalQuestions}</small></span>
            <span className="qg__rule">{ruleId.toUpperCase()}</span>
            {showCD && <div className={`qg__timer${urgent ? ' qg__timer--urgent' : ''}`} role="timer" aria-label="残り秒数">{countdown}</div>}
            <RoomChat myId={myId} inline />
          </div>
        </header>
        {players.length === 2 && <div className="qg-narrow"><VSHud players={players} myId={myId} ruleId={ruleId} /></div>}

        <div className={`qg__body${phase === 'question' ? ' qg__body--buzz' : ''}`}>
          <div className="qg__layout">
            <div className="qg__main">
              {/* 問題文 */}
              <div className={questionCls}>
                <p>{shownText || '\u00A0'}</p>
              </div>

              {/* 早押し: スマホは画面下に固定、PC は問題の下 */}
              {phase === 'question' && (
                <div className="qg__buzzbar">
                  <Button variant="buzz" className={`qg__buzz${buzzAnim ? ' qg__buzz--pop' : ''}`} onClick={handleBuzz} aria-keyshortcuts="Space">
                    <Icon name="zap" size={30} />早押し！
                  </Button>
                  <p className="qg__hint qg-wide">スペースキーでも押せます</p>
                </div>
              )}

              {/* 解答 */}
              {phase === 'answering' && (
                <div className={`qg__answer${isBuzzed ? ' qg__answer--mine' : ''}`} role="status">
                  <h2>
                    {isBuzzed ? <><Icon name="zap" size={18} />あなたの番！</> : <><Icon name="hourglass" size={18} />{buzzedPlayerName} が解答中...</>}
                  </h2>
                  {isBuzzed && (
                    <div className="qg__answerform">
                      <input ref={inputRef} className="qg__input" value={answer} onChange={e => setAnswer(e.target.value)} aria-label="解答"
                        onCompositionStart={() => { isComposing.current = true }}
                        onCompositionEnd={e => { isComposing.current = false; setAnswer((e.target as HTMLInputElement).value) }}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit() }}
                        placeholder="ひらがなで入力"
                        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
                      <Button variant="primary" size="lg" block onClick={submit}>送信<Icon name="arrow-right" size={20} /></Button>
                    </div>
                  )}
                </div>
              )}

              {/* 結果 */}
              {phase === 'result' && (() => {
                const ok = lastJudgement === 'correct', sk = lastJudgement === 'skip'
                const answerer = players.find(p => p.id === roomState.lastAnswerPlayerId)
                return (
                  <div className={`qg__result qg__result--${ok ? 'ok' : sk ? 'skip' : 'ng'}${resultAnim ? ' qg__result--in' : ''}`} role="status">
                    <Icon className="qg__mark" name={ok ? 'circle' : sk ? 'skip' : 'x'} size={56} strokeWidth={2.4} />
                    <h2>{ok ? '正解！' : sk ? 'スルー' : '不正解'}</h2>
                    {!sk && answerer && <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 8 }}>{answerer.name}</p>}
                    {!sk && answerer && answerer.status !== 'ACTIVE' && (
                      <p className={`qg__status ${answerer.status === 'WIN' ? 'is-win' : 'is-lose'}`}>
                        {answerer.status === 'WIN' ? <><Icon name="sparkles" size={16} />勝ち抜け！</> : <><Icon name="skull" size={16} />失格</>}
                      </p>
                    )}
                    <div className="qg__rightans">
                      <span style={{ color: 'var(--muted)', fontSize: 13 }}>答え：</span>
                      <b>{currentQuestion?.displayAnswer}</b>
                    </div>
                  </div>
                )
              })()}

              {/* スマホ: スタンプと、3 人以上のスコア */}
              <div className="qg-narrow">
                <StampPicker onSend={sendStamp} />
                {players.length > 2 && (
                  <div className="qs-panel" style={{ marginTop: 12 }}>
                    <h3>Score</h3>
                    <Board players={sorted} myId={myId} ruleId={ruleId} />
                  </div>
                )}
              </div>
            </div>

            {/* PC: 右カラム */}
            <aside className="qg__side qg-wide" aria-label="対戦者とスタンプ">
              <div className="qs-panel">
                <h3>Players</h3>
                <Board players={sorted} myId={myId} ruleId={ruleId} />
              </div>
              <div className="qs-panel">
                <h3>Stamp</h3>
                <StampPicker onSend={sendStamp} />
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* スタンプ表示 */}
      <div className="qg__stampfx" aria-hidden="true">
        {stamps.map(s => {
          const st = resolveStamp(s.stamp)
          return st ? (
            <div key={s.id}>
              <Icon name={st.icon} size={64} strokeWidth={1.6} />
              <p>{s.fromName}</p>
            </div>
          ) : null
        })}
      </div>
    </>
  )
}
