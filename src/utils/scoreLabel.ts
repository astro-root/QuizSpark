import type { Player } from "../types"
export function scoreLabel(p: Player, ruleId: string): string {
  const s = p.ruleState
  switch(ruleId) {
    case "free":     return `${s.correct??0}◯  ${s.wrong??0}×`
    case "mon":      return `${s.correct??0}◯  ${s.wrong??0}×`
    case "newyork":  return `${s.score??0}pt`
    case "updown":   return `${s.score??0}pt`
    case "by":       return `積${(s.correct as number??0)*((s.wrong as number??0))}`
    case "freeze":   return `${s.score??0}◯  休${s.rest??0}`
    case "mon_rest": return `${s.score??0}◯  休${s.rest??0}`
    case "swedish":  return `${s.correct??0}◯  P${s.penalty??0}`
    case "divide":   return `${s.score??0}pt`
    case "lucky":    return `${s.score??0}pt`
    case "rensei":   return `${s.score??0}pt${s.hasRight?" ⚡":""}`
    case "rengou":   return `${s.correct??0}◯  ${s.wrong??0}×`
    case "combo":    return `${s.score??0}pt 🔥${s.combo??0}`
    default:         return `${p.score}`
  }
}
