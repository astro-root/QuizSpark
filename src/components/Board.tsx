import type { Player } from "../types"
import { scoreLabel } from "../utils/scoreLabel"
export default function Board({ players, myId, ruleId }: { players: Player[]; myId: string; ruleId: string }) {
  return (
    <div style={{ width:"100%",maxWidth:400,display:"flex",flexDirection:"column",gap:6 }}>
      {players.map((p,i)=>{
        const win=p.status==="WIN", lose=p.status==="LOSE"
        return (
          <div key={p.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"11px 16px",
            background:p.id===myId?"rgba(99,102,241,0.1)":win?"rgba(16,185,129,0.07)":lose?"rgba(244,63,94,0.07)":"var(--surface)",
            borderRadius:12,border:`1px solid ${p.id===myId?"rgba(99,102,241,0.3)":win?"rgba(16,185,129,0.2)":lose?"rgba(244,63,94,0.2)":"var(--border)"}`,
            transition:"all 0.3s ease",
            boxShadow: win ? "0 0 12px rgba(16,185,129,0.2)" : undefined }}>
            <span style={{ fontFamily:"Orbitron,sans-serif",fontSize:11,color:i===0?"var(--gold)":"var(--muted)",width:18,textAlign:"center" }}>
              {i===0?"▲":`${i+1}`}
            </span>
            <span style={{ flex:1,fontSize:14,fontWeight:p.id===myId?800:400,
              color:win?"var(--correct)":lose?"var(--wrong)":"var(--text)",
              textDecoration:lose?"line-through":undefined }}>
              {p.name}{p.isHost?" 👑":""}
            </span>
            {(win||lose)&&<span style={{ fontSize:11,fontWeight:700,color:win?"var(--correct)":"var(--wrong)" }}>{win?"勝抜":"失格"}</span>}
            <span style={{ fontFamily:"Orbitron,sans-serif",fontSize:12,fontWeight:700,color:"var(--accent)" }}>
              {scoreLabel(p,ruleId)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
