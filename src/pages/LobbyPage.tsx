import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
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
  const [local, setLocal] = useState<GameSettings>({ ruleId:'mon', ruleParams:{m:5,n:2}, questionCount:10, winnerCount:1, loserCount:0 })
  const [synced, setSynced] = useState(false)

  useEffect(() => {
    if (roomState?.settings && !synced) { setLocal(roomState.settings); setSynced(true) }
  }, [roomState?.settings, synced])

  useEffect(() => {
    if (roomState?.phase==='question'||roomState?.phase==='answering'||roomState?.phase==='result')
      navigate('/room/'+roomId+'/game',{replace:true})
  }, [roomState?.phase, roomId, navigate])

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
        <div style={{ fontFamily:'Orbitron,sans-serif', fontWeight:900, fontSize:15, letterSpacing:1 }}>
          <span style={{ color:'var(--accent)' }}>Quiz</span><span>Spark</span>
        </div>
        <button onClick={toggleTheme} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'5px 9px', fontSize:14, color:'var(--sub)' }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <div style={{ flex:1, overflowY:'auto', padding:'20px 20px 48px' }}>
        <div style={{ maxWidth:420, margin:'0 auto', display:'flex', flexDirection:'column', gap:14 }}>

          {/* ルームID */}
          <div style={{ textAlign:'center', padding:'24px 20px', background:'var(--surface)', borderRadius:16, border:'1px solid var(--border)' }}>
            <p style={lbl}>ROOM ID</p>
            <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:44, fontWeight:900, color:'var(--accent)', letterSpacing:10, marginTop:6,
              textShadow:'0 0 20px rgba(56,189,248,0.4)' }}>{roomState.id}</p>
            <p style={{ color:'var(--muted)', fontSize:12, marginTop:8 }}>このIDを友達に共有しよう</p>
          </div>

          {/* 参加者 */}
          <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 18px 8px', border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontWeight:800, fontSize:14 }}>参加者</span>
              <span style={{ fontSize:12, color:'var(--muted)', fontFamily:'Orbitron,sans-serif' }}>{roomState.players.length} / 人</span>
            </div>
            {roomState.players.map(p => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderTop:'1px solid var(--border)' }}>
                <div style={{ width:32, height:32, borderRadius:'50%',
                  background: p.id===myId ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : 'var(--surface2)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: p.id===myId ? '#fff' : 'var(--sub)', fontWeight:900, fontSize:13, flexShrink:0 }}>
                  {p.name[0]}
                </div>
                <span style={{ flex:1, fontSize:14, fontWeight: p.id===myId ? 700 : 400, color: p.id===myId ? 'var(--text)' : 'var(--sub)' }}>{p.name}</span>
                {p.isHost && <span style={{ fontSize:10, fontWeight:700, color:'var(--gold)', background:'rgba(245,158,11,0.12)', borderRadius:4, padding:'2px 7px' }}>HOST</span>}
                {p.id===myId && !p.isHost && <span style={{ fontSize:10, fontWeight:700, color:'var(--accent)', background:'rgba(56,189,248,0.12)', borderRadius:4, padding:'2px 7px' }}>YOU</span>}
              </div>
            ))}
          </div>

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

            <Row label="失格人数で終了">
              <select disabled={!isHost} value={local.loserCount} onChange={e=>onField('loserCount',Number(e.target.value))} style={sel}>
                <option value={0}>なし</option>
                {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}人</option>)}
              </select>
            </Row>
          </div>

          {/* スタートボタン */}
          {isHost ? (
            <button onClick={startGame}
              style={{ padding:'18px', background:'linear-gradient(135deg,var(--buzz),var(--buzz2))',
                color:'#fff', borderRadius:14, fontSize:17, fontWeight:900,
                boxShadow:'0 4px 24px rgba(239,68,68,0.4)', letterSpacing:1 }}>
              ▶ ゲームスタート
            </button>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'16px',
              background:'var(--surface)', borderRadius:14, color:'var(--muted)', fontSize:14, border:'1px solid var(--border)' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--correct)',
                boxShadow:'0 0 8px var(--correct)', display:'inline-block', animation:'pulse 1.5s ease infinite' }}/>
              ホストの開始を待っています
            </div>
          )}
        </div>
      </div>
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

const lbl: React.CSSProperties = { fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:3, textTransform:'uppercase' }
const sel: React.CSSProperties = { width:'100%', padding:'8px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, fontSize:14, color:'var(--text)' }
