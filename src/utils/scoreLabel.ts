import type { Player } from '../types'
import type { IconName } from '../components/ui/iconPaths'

/**
 * スコア表示の部品。絵文字や記号を文字列に埋め込まず、アイコンは SVG で描くために構造化する。
 *  - text: そのまま表示する文字
 *  - icon: SVG アイコン(label は読み上げ用の意味)
 */
export type ScorePart =
  | { kind: 'text'; text: string }
  | { kind: 'icon'; icon: IconName; label: string }

const t = (text: string): ScorePart => ({ kind: 'text', text })
const ok = (): ScorePart => ({ kind: 'icon', icon: 'circle', label: '正解' })
const ng = (): ScorePart => ({ kind: 'icon', icon: 'x', label: '誤答' })

export function scoreParts(p: Player, ruleId: string): ScorePart[] {
  const s = p.ruleState
  const n = (v: unknown) => (typeof v === 'number' ? v : 0)
  switch (ruleId) {
    case 'free':
    case 'mon':
    case 'rengou':   return [t(String(n(s.correct))), ok(), t(' ' + n(s.wrong)), ng()]
    case 'newyork':
    case 'updown':
    case 'divide':
    case 'lucky':    return [t(`${n(s.score)}pt`)]
    case 'by':       return [t(`積${n(s.correct) * n(s.wrong)}`)]
    case 'freeze':
    case 'mon_rest': return [t(String(n(s.score))), ok(), t(` 休${n(s.rest)}`)]
    case 'swedish':  return [t(String(n(s.correct))), ok(), t(` P${n(s.penalty)}`)]
    case 'rensei':   return s.hasRight
      ? [t(`${n(s.score)}pt `), { kind: 'icon', icon: 'zap', label: '連答権あり' }]
      : [t(`${n(s.score)}pt`)]
    case 'combo':    return [t(`${n(s.score)}pt `), { kind: 'icon', icon: 'flame', label: 'コンボ' }, t(String(n(s.combo)))]
    default:         return [t(String(p.score))]
  }
}

/** 読み上げ・テキスト用(記号を使わない)。例: "3正解 1誤答" */
export function scoreText(p: Player, ruleId: string): string {
  return scoreParts(p, ruleId).map(x => (x.kind === 'text' ? x.text : x.label)).join('').replace(/\s+/g, ' ').trim()
}
