import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
import RoomChat from '../components/RoomChat'
import { useTheme } from '../context/ThemeContext'
import type { GameSettings, RuleId } from '../types'

const RULE_DEFS = [
  { id:'free',     name:'Free',         params:[] },
  { id:'mon',      name:'m◯n×',         params:[{key:'m',label:'勝ち抜け正解数',def:5},{key:'n',label:'失格誤答数',def:2}] },
  { id:'newyork',  name:'NewYork',      params:[{key:'m',label:'正解加点',def:1},{key:'n',label:'誤答減点',def:1},{key:'x',label:'勝ち抜けPt',def:10},{key:'y',label:'失格Pt',def:-10}] },
  { id:'updown',   name:'Up-Down',      params:[{key:'m',label:'勝ち抜けPt',def:5},{key:'n',label:'失格誤答数',def:2}] },
  { id:'by',       name:'by',           params:[{key:'m',label:'基準値',def:5},{key:'n',label:'失格誤答数',def:3}] },
  { id:'freeze',   name:'Freeze',       params:[{key:'m',label:'勝ち抜け正解数',def:5}] },
  { id:'mon_rest', name:'m◯n休',        params:[{key:'m',label:'勝ち抜け正解数',def:5},{key:'n',label:'誤答休み数',def:3}] },
  { id:'swedish',  name:'Swedish',      params:[{key:'m',label:'勝ち抜け/失格基準',def:10}] },
  { id:'divide',   name:'Divide',       params:[{key:'m',label:'初期Pt',def:10},{key:'n',label:'正解加点',def:10},{key:'x',label:'勝ち抜けPt',def:100}] },
  { id:'lucky',    name:'Lucky Shot',   params:[{key:'m',label:'正解最大加点',def:10},{key:'n',label:'誤答最大減点',def:10},{key:'x',label:'勝ち抜けPt',def:100},{key:'y',label:'失格Pt',def:-20}] },
  { id:'rensei',   name:'連答付き',     params:[{key:'m',label:'勝ち抜けPt',def:5},{key:'n',label:'失格誤答数',def:2}] },
  { id:'rengou',   name:'連誤答付き',   params:[{key:'m',label:'勝ち抜け正解数',def:5},{key:'n',label:'失格誤答数',def:3}] },
  { id:'combo',    name:'m hits Combo', params:[{key:'m',label:'勝ち抜けPt',def:6},{key:'n',label:'失格誤答数',def:2}] },
]

function buildDefaultParams(ruleId: RuleId) {
  const rule = RULE_DEFS.find(r => r.id === ruleId)
  const p: Record<string,number> = {}
  rule?.params.forEach(q => { p[q.key] = q.def })
  return p
}

export default function LobbyPage() {
  const { roomId } = useParams<{ roomId:string }>()
  const { roomState, myId, startGame, updateSettings } = useSocketContext()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [local, setLocal] = useState<GameSettings>({ ruleId:'mon', ruleParams:{m:5,n:2}, questionCount:10, winnerCount:1, loserCount:0, isPublic:false, questionSetId:null })
  const [synced, setSynced] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (roomState?.settings && !synced) { setLocal(roomState.settings); setSynced(true) }
  }, [roomState?.settings, synced])

  useEffect(() => {
    if (roomState?.phase==='question'||roomState?.phase==='answering'||roomState?.phase==='result')
      navigate('/room/'+roomId+'/game',{replace:true})
  }, [roomState?.phase, roomId, navigate])

  const copyId = useCallback(() => {
    navigator.clipboard.writeText(roomState?.id ?? '').then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }, [roomState?.id])

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/?join=${roomState?.id ?? ''}` : ''
  const shareText = `QuizSparkで早押しクイズ対戦！ルームID: ${roomState?.id ?? ''}`

  function shareTwitter() { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`) }
  function shareLine() { window.open(`https://line.me/R/msg/text/?${encodeURIComponent(shareText + '\n' + shareUrl)}`) }
  function shareNative() {
    if (navigator.share) navigator.share({ title: 'QuizSpark', text: shareText, url: shareUrl })
    else copyId()
  }

  if (!roomState) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)' }}>接続中...</div>
  )

  const isHost = roomState.hostId === myId
  const currentRule = RULE_DEFS.find(r => r.id === local.ruleId)!

  function emit(next: GameSettings) { setLocal(next); if (isHost) updateSettings(next) }
  function onRule(id: RuleId) { emit({...local, ruleId:id, ruleParams:buildDefaultParams(id)}) }
  function onParam(key: string, val: number) { emit({...local, ruleParams:{...local.ruleParams,[key]:val}}) }
  function onField(f: keyof GameSettings, val: number) { emit({...local,[f]:val}) }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      {/* ヘッダー */}
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
        <button onClick={() => navigate('/')} style={{ background:'none', color:'var(--muted)', fontSize:13, padding:0 }}>← 戻る</button>
        <span style={{ fontFamily:'Orbitron,sans-serif', fontWeight:900, fontSize:15, color:'var(--accent)' }}>QuizSpark</span>
        <button onClick={toggleTheme} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'5px 9px', fontSize:14, color:'var(--sub)' }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px 100px' }}>
        {/* PC: 2カラム / SP: 1カラム */}
        <div style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:16, alignItems:'start' }}>

          {/* 左カラム */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* ルームID */}
            <div style={{ background:'var(--surface)', borderRadius:16, padding:'24px 20px', border:'1px solid var(--border)', textAlign:'center' }}>
              <p style={lbl}>ROOM ID</p>
              {/* 視認性重視: 大きく・等幅・スペース区切り */}
              <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:48, fontWeight:900, letterSpacing:12,
                color:'var(--accent)', marginTop:8, lineHeight:1,
                textShadow:'0 0 24px rgba(56,189,248,0.4)' }}>
                {(roomState.id ?? '').slice(0,3)}<span style={{ opacity:0.3 }}> </span>{(roomState.id ?? '').slice(3)}
              </p>
              <p style={{ color:'var(--muted)', fontSize:11, marginTop:8, letterSpacing:1 }}>
                ※ 0・O・1・I・L は使用していません
              </p>

              {/* コピー・共有ボタン */}
              <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'center', flexWrap:'wrap' }}>
                <button onClick={copyId}
                  style={{ padding:'9px 18px', borderRadius:9, fontSize:13, fontWeight:700,
                    background: copied ? 'var(--correct)' : 'var(--surface2)',
                    color: copied ? '#fff' : 'var(--text)',
                    border:'1px solid var(--border)', transition:'all .2s' }}>
                  {copied ? '✓ コピー済み' : '📋 IDをコピー'}
                </button>
                <button onClick={shareTwitter}
                  style={{ padding:'9px 16px', borderRadius:9, fontSize:13, fontWeight:700,
                    background:'#1da1f2', color:'#fff' }}>
                  𝕏 シェア
                </button>
                <button onClick={shareLine}
                  style={{ padding:'9px 16px', borderRadius:9, fontSize:13, fontWeight:700,
                    background:'#06c755', color:'#fff' }}>
                  LINE
                </button>
                {'share' in navigator && (
                  <button onClick={shareNative}
                    style={{ padding:'9px 16px', borderRadius:9, fontSize:13, fontWeight:700,
                      background:'var(--surface2)', color:'var(--text)', border:'1px solid var(--border)' }}>
                    ↗ その他
                  </button>
                )}
              </div>

              {/* URL表示 */}
              <div style={{ marginTop:12, padding:'8px 12px', background:'var(--surface2)', borderRadius:8, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, color:'var(--muted)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'left' }}>
                  {shareUrl}
                </span>
                <button onClick={copyId} style={{ fontSize:11, color:'var(--accent)', background:'none', padding:0, flexShrink:0, fontWeight:700 }}>コピー</button>
              </div>
            </div>

            {/* 参加者 */}
            <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 18px 8px', border:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <span style={{ fontWeight:800, fontSize:14 }}>参加者</span>
                <span style={{ fontSize:12, color:'var(--muted)', fontFamily:'Orbitron,sans-serif' }}>{roomState.players.length}人</span>
              </div>
              {roomState.players.map(p => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderTop:'1px solid var(--border)' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%',
                    background: p.id===myId ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : 'var(--surface2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color: p.id===myId ? '#fff' : 'var(--sub)', fontWeight:900, fontSize:13, flexShrink:0 }}>
                    {p.name[0]}
                  </div>
                  <span style={{ flex:1, fontSize:14, fontWeight:p.id===myId?700:400, color:p.id===myId?'var(--text)':'var(--sub)' }}>{p.name}</span>
                  {p.isHost && <Badge color="var(--gold)" bg="rgba(245,158,11,0.12)">HOST</Badge>}
                  {p.id===myId&&!p.isHost && <Badge color="var(--accent)" bg="rgba(56,189,248,0.12)">YOU</Badge>}
                </div>
              ))}
            </div>
          </div>

          {/* 右カラム */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* 設定 */}
            <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 18px 8px', border:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <span style={{ fontWeight:800, fontSize:14 }}>ゲーム設定</span>
                {!isHost && <span style={{ fontSize:11, color:'var(--muted)' }}>ホストのみ変更可</span>}
              </div>

              <Row label="ルール">
                <select disabled={!isHost} value={local.ruleId} onChange={e=>onRule(e.target.value as RuleId)} style={sel}>
                  {RULE_DEFS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </Row>
              {currentRule.params.map(param=>(
                <Row key={param.key} label={param.label}>
                  <input type="number" disabled={!isHost}
                    value={local.ruleParams[param.key]??param.def}
                    onChange={e=>onParam(param.key,Number(e.target.value))}
                    onKeyDown={e=>e.key==='Enter'&&isHost&&startGame()}
                    style={sel} />
                </Row>
              ))}
              <Row label="問題数">
                <select disabled={!isHost} value={local.questionCount} onChange={e=>onField('questionCount',Number(e.target.value))} style={sel}>
                  {Array.from({length:10},(_,i)=>(i+1)*10).map(n=><option key={n} value={n}>{n}問</option>)}
                </select>
              </Row>
              <Row label="勝ち抜け人数で終了">
                <select disabled={!isHost} value={local.winnerCount} onChange={e=>onField('winnerCount',Number(e.target.value))} style={sel}>
                  <option value={0}>なし</option>
                  {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}人</option>)}
                </select>
              </Row>
              <Row label="公開ルーム">
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor: isHost?'pointer':'default' }}>
                  <input type="checkbox" disabled={!isHost} checked={!!local.isPublic}
                    onChange={e => emit({...local, isPublic: e.target.checked})} />
                  <span style={{ fontSize:13, color:'var(--sub)' }}>誰でも参加可能にする</span>
                </label>
              </Row>
              <Row label="失格人数で終了">
                <select disabled={!isHost} value={local.loserCount} onChange={e=>onField('loserCount',Number(e.target.value))} style={sel}>
                  <option value={0}>なし</option>
                  {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}人</option>)}
                </select>
              </Row>
            </div>


          </div>
        </div>
      </div>
      {/* 固定スタートバー */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100,
        padding:'10px 16px', paddingBottom:'calc(10px + env(safe-area-inset-bottom))',
        background:'var(--surface)', borderTop:'1px solid var(--border)',
        display:'flex', gap:10, alignItems:'center' }}>
        {isHost ? (
          <button onClick={startGame}
            style={{ flex:1, padding:'16px', background:'linear-gradient(135deg,var(--buzz),var(--buzz2))',
              color:'#fff', borderRadius:14, fontSize:17, fontWeight:900,
              boxShadow:'0 4px 20px rgba(239,68,68,0.35)', letterSpacing:1 }}>
            ▶ ゲームスタート
          </button>
        ) : (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            padding:'14px', background:'var(--surface2)', borderRadius:14,
            color:'var(--muted)', fontSize:14, border:'1px solid var(--border)' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--correct)',
              boxShadow:'0 0 8px var(--correct)', display:'inline-block', animation:'pulse 1.5s ease infinite' }}/>
            ホストの開始を待っています
          </div>
        )}
      </div>
      {roomState && <RoomChat myId={myId} />}
    </div>
  )
}

function Row({label,children}: {label:string;children:React.ReactNode}) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'10px 0', borderTop:'1px solid var(--border)' }}>
      <span style={{ fontSize:13, color:'var(--sub)', flexShrink:0 }}>{label}</span>
      <div style={{ minWidth:120 }}>{children}</div>
    </div>
  )
}
function Badge({color,bg,children}: {color:string;bg:string;children:React.ReactNode}) {
  return <span style={{ fontSize:10, fontWeight:700, color, background:bg, borderRadius:4, padding:'2px 7px' }}>{children}</span>
}

const lbl: React.CSSProperties = { fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:3, textTransform:'uppercase' }
const sel: React.CSSProperties = { width:'100%', padding:'8px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, fontSize:14, color:'var(--text)' }
