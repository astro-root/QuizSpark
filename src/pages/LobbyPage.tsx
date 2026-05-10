import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSocketContext } from '../context/SocketContext'
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

  if (!roomState) return <Center>接続中...</Center>

  const isHost = roomState.hostId === myId
  const currentRule = RULE_DEFS.find(r => r.id === local.ruleId)!

  function emit(next: GameSettings) { setLocal(next); if (isHost) updateSettings(next) }
  function onRule(id: RuleId) { emit({...local, ruleId:id, ruleParams:buildDefaultParams(id)}) }
  function onParam(key: string, val: number) { emit({...local, ruleParams:{...local.ruleParams,[key]:val}}) }
  function onField(f: keyof GameSettings, val: number) { emit({...local,[f]:val}) }

  return (
    <div style={{ minHeight:'100vh', display:'flex', justifyContent:'center', padding:'24px 20px 48px', overflowY:'auto' }}>
      <div style={{ width:'100%', maxWidth:420, display:'flex', flexDirection:'column', gap:16 }}>

        {/* Room ID */}
        <div style={{ textAlign:'center', padding:'28px 20px', background:'var(--surface)', borderRadius:16 }}>
          <p style={lbl}>ROOM ID</p>
          <p style={{ fontFamily:'Orbitron,sans-serif', fontSize:40, fontWeight:900, color:'var(--gold)', letterSpacing:10, marginTop:8 }}>{roomState.id}</p>
          <p style={{ color:'var(--muted)', fontSize:12, marginTop:10 }}>このIDを友達に教えよう</p>
        </div>

        {/* Players */}
        <Section title={`参加者 ${roomState.players.length}人`}>
          {roomState.players.map(p => (
            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,var(--accent),var(--accent2))',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:14,flexShrink:0 }}>{p.name[0]}</div>
              <span style={{ flex:1, fontSize:15, fontWeight:p.id===myId?800:400 }}>{p.name}</span>
              {p.isHost && <Tag color="var(--gold)" bg="rgba(251,191,36,0.12)">HOST</Tag>}
              {p.id===myId&&!p.isHost && <Tag color="var(--accent)" bg="rgba(99,102,241,0.12)">YOU</Tag>}
            </div>
          ))}
        </Section>

        {/* Settings */}
        <Section title="ゲーム設定" sub={!isHost ? 'ホストのみ変更可' : undefined}>
          <Field label="ルール">
            <select disabled={!isHost} value={local.ruleId} onChange={e=>onRule(e.target.value as RuleId)} style={sel}>
              {RULE_DEFS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>

          {currentRule.params.map(param=>(
            <Field key={param.key} label={param.label}>
              <input type="number" disabled={!isHost}
                value={local.ruleParams[param.key]??param.def}
                onChange={e=>onParam(param.key,Number(e.target.value))}
                style={sel} />
            </Field>
          ))}

          <Field label="問題数">
            <select disabled={!isHost} value={local.questionCount} onChange={e=>onField('questionCount',Number(e.target.value))} style={sel}>
              {Array.from({length:10},(_,i)=>(i+1)*10).map(n=><option key={n} value={n}>{n}問</option>)}
            </select>
          </Field>

          <Field label="勝ち抜け人数で終了">
            <select disabled={!isHost} value={local.winnerCount} onChange={e=>onField('winnerCount',Number(e.target.value))} style={sel}>
              <option value={0}>なし</option>
              {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}人</option>)}
            </select>
          </Field>

          <Field label="失格人数で終了">
            <select disabled={!isHost} value={local.loserCount} onChange={e=>onField('loserCount',Number(e.target.value))} style={sel}>
              <option value={0}>なし</option>
              {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}人</option>)}
            </select>
          </Field>
        </Section>

        {isHost ? (
          <button onClick={startGame} style={{ padding:'18px',background:'linear-gradient(135deg,var(--buzz),#f97316)',color:'#fff',borderRadius:14,fontSize:17,fontWeight:900,boxShadow:'0 4px 24px rgba(244,63,94,0.35)',letterSpacing:1 }}>
            ゲームスタート ▶
          </button>
        ) : (
          <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'16px',background:'var(--surface)',borderRadius:14,color:'var(--muted)',fontSize:14 }}>
            <span style={{ width:8,height:8,borderRadius:'50%',background:'var(--correct)',boxShadow:'0 0 6px var(--correct)',display:'inline-block' }}/>
            ホストの開始を待っています
          </div>
        )}
      </div>
    </div>
  )
}

function Center({children}: {children: React.ReactNode}) {
  return <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)' }}>{children}</div>
}
function Section({title,sub,children}: {title:string;sub?:string;children:React.ReactNode}) {
  return (
    <div style={{ background:'var(--surface)',borderRadius:16,padding:'20px 20px 4px' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
        <span style={{ fontWeight:800,fontSize:15 }}>{title}</span>
        {sub && <span style={{ fontSize:11,color:'var(--muted)' }}>{sub}</span>}
      </div>
      {children}
    </div>
  )
}
function Field({label,children}: {label:string;children:React.ReactNode}) {
  return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'10px 0',borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:14,color:'var(--sub)',flexShrink:0 }}>{label}</span>
      <div style={{ minWidth:120 }}>{children}</div>
    </div>
  )
}
function Tag({color,bg,children}: {color:string;bg:string;children:React.ReactNode}) {
  return <span style={{ fontSize:10,fontWeight:700,color,background:bg,borderRadius:4,padding:'2px 7px' }}>{children}</span>
}
const lbl: React.CSSProperties = { fontSize:11,fontWeight:700,color:'var(--muted)',letterSpacing:3,textTransform:'uppercase' }
const sel: React.CSSProperties = { width:'100%',padding:'8px 12px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,fontSize:14,color:'var(--text)' }
