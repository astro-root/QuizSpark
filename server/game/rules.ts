import type { RuleId } from '../../src/types'

export interface RuleParams { [key: string]: number }
export type RuleState = Record<string, number | boolean | string>

export interface RuleResult {
  log: string
  type?: 'wrong' | 'skip'
  combo?: number | boolean
}

export interface RuleDef {
  id: RuleId
  name: string
  params: { key: string; label: string; def: number }[]
  hasSkip?: boolean
  initState(params: RuleParams): RuleState
  onCorrect(state: RuleState, params: RuleParams): RuleResult
  onWrong(state: RuleState, params: RuleParams): RuleResult
  onSkip?(state: RuleState, params: RuleParams): RuleResult | null
  getStatus(state: RuleState, params: RuleParams): 'ACTIVE' | 'WIN' | 'LOSE'
}

function sw(correct: number): number {
  if (correct === 0) return 1
  if (correct <= 2) return 2
  if (correct <= 5) return 3
  if (correct <= 9) return 4
  return 5
}

export const RULES: RuleDef[] = [
  {
    id: 'free', name: 'Free', params: [],
    initState: () => ({ correct: 0, wrong: 0 }),
    onCorrect(s) { (s.correct as number)++; return { log: `正解 +1` } },
    onWrong(s) { (s.wrong as number)++; return { log: `誤答 +1`, type: 'wrong' } },
    getStatus() { return 'ACTIVE' },
  },
  {
    id: 'mon', name: 'm◯n×',
    params: [{ key: 'm', label: '勝ち抜け正解数', def: 5 }, { key: 'n', label: '失格誤答数', def: 2 }],
    initState: () => ({ correct: 0, wrong: 0 }),
    onCorrect(s, p) { (s.correct as number)++; return { log: `正解 ${s.correct}/${p.m}` } },
    onWrong(s, p) { (s.wrong as number)++; return { log: `誤答 ${s.wrong}/${p.n}`, type: 'wrong' } },
    getStatus(s, p) {
      if ((s.correct as number) >= p.m) return 'WIN'
      if ((s.wrong as number) >= p.n) return 'LOSE'
      return 'ACTIVE'
    },
  },
  {
    id: 'newyork', name: 'NewYork',
    params: [{ key: 'm', label: '正解加点', def: 1 }, { key: 'n', label: '誤答減点', def: 1 }, { key: 'x', label: '勝ち抜けPt', def: 10 }, { key: 'y', label: '失格Pt', def: -10 }],
    initState: () => ({ score: 0, correct: 0, wrong: 0 }),
    onCorrect(s, p) { (s.score as number) += p.m; (s.correct as number)++; return { log: `正解 +${p.m} → ${s.score}点` } },
    onWrong(s, p) { (s.score as number) -= p.n; (s.wrong as number)++; return { log: `誤答 −${p.n} → ${s.score}点`, type: 'wrong' } },
    getStatus(s, p) {
      if ((s.score as number) >= p.x) return 'WIN'
      if ((s.score as number) <= p.y) return 'LOSE'
      return 'ACTIVE'
    },
  },
  {
    id: 'updown', name: 'Up-Down',
    params: [{ key: 'm', label: '勝ち抜けPt', def: 5 }, { key: 'n', label: '失格誤答数', def: 2 }],
    initState: () => ({ score: 0, correct: 0, wrong: 0 }),
    onCorrect(s, p) { (s.score as number)++; (s.correct as number)++; return { log: `正解 +1 → ${s.score}点` } },
    onWrong(s, p) { (s.wrong as number)++; const old = s.score; s.score = 0; return { log: `誤答 0リセット (${old}→0) 誤答${s.wrong}/${p.n}`, type: 'wrong' } },
    getStatus(s, p) {
      if ((s.score as number) >= p.m) return 'WIN'
      if ((s.wrong as number) >= p.n) return 'LOSE'
      return 'ACTIVE'
    },
  },
  {
    id: 'by', name: 'by',
    params: [{ key: 'm', label: '基準値', def: 5 }, { key: 'n', label: '失格誤答数', def: 3 }],
    initState: () => ({ correct: 0, wrong: 0 }),
    onCorrect(s, p) {
      (s.correct as number)++
      const cp = s.correct as number, dp = p.m - (s.wrong as number)
      return { log: `正解 正解P=${cp} 誤答P=${dp} 積=${cp * dp}` }
    },
    onWrong(s, p) {
      (s.wrong as number)++
      const cp = s.correct as number, dp = p.m - (s.wrong as number)
      return { log: `誤答 正解P=${cp} 誤答P=${dp} 積=${cp * dp}`, type: 'wrong' }
    },
    getStatus(s, p) {
      const cp = s.correct as number, dp = p.m - (s.wrong as number)
      if (cp * dp >= p.m * p.m) return 'WIN'
      if (dp <= 0 || (s.wrong as number) >= p.n) return 'LOSE'
      return 'ACTIVE'
    },
  },
  {
    id: 'freeze', name: 'Freeze',
    params: [{ key: 'm', label: '勝ち抜け正解数', def: 5 }],
    hasSkip: true,
    initState: () => ({ score: 0, correct: 0, wrong: 0, rest: 0 }),
    onCorrect(s, p) { (s.score as number)++; (s.correct as number)++; return { log: `正解 +1 → ${s.score}点` } },
    onWrong(s, _p) { (s.wrong as number)++; (s.rest as number) += s.wrong as number; return { log: `誤答 通算${s.wrong}回目 休み${s.wrong}回追加 残${s.rest}`, type: 'wrong' } },
    onSkip(s, _p) { if ((s.rest as number) > 0) { (s.rest as number)--; return { log: `スルー 残休み${s.rest}`, type: 'skip' } } return null },
    getStatus(s, p) { return (s.score as number) >= p.m ? 'WIN' : 'ACTIVE' },
  },
  {
    id: 'mon_rest', name: 'm◯n休',
    params: [{ key: 'm', label: '勝ち抜け正解数', def: 5 }, { key: 'n', label: '誤答休み数', def: 3 }],
    hasSkip: true,
    initState: () => ({ score: 0, correct: 0, wrong: 0, rest: 0 }),
    onCorrect(s, p) { (s.score as number)++; (s.correct as number)++; return { log: `正解 +1 → ${s.score}点` } },
    onWrong(s, p) { (s.wrong as number)++; (s.rest as number) += p.n; return { log: `誤答 休み${p.n}回追加 残${s.rest}`, type: 'wrong' } },
    onSkip(s, _p) { if ((s.rest as number) > 0) { (s.rest as number)--; return { log: `スルー 残休み${s.rest}`, type: 'skip' } } return null },
    getStatus(s, p) { return (s.score as number) >= p.m ? 'WIN' : 'ACTIVE' },
  },
  {
    id: 'swedish', name: 'Swedish',
    params: [{ key: 'm', label: '勝ち抜け/失格基準', def: 10 }],
    initState: () => ({ correct: 0, wrong: 0, penalty: 0 }),
    onCorrect(s, _p) { (s.correct as number)++; return { log: `正解 累計${s.correct}問` } },
    onWrong(s, p) {
      const pen = sw(s.correct as number)
      ;(s.wrong as number)++; (s.penalty as number) += pen
      return { log: `誤答 ペナルティ+${pen} 累計${s.penalty}/${p.m}`, type: 'wrong' }
    },
    getStatus(s, p) {
      if ((s.correct as number) >= p.m) return 'WIN'
      if ((s.penalty as number) >= p.m) return 'LOSE'
      return 'ACTIVE'
    },
  },
  {
    id: 'divide', name: 'Divide',
    params: [{ key: 'm', label: '初期Pt', def: 10 }, { key: 'n', label: '正解加点', def: 10 }, { key: 'x', label: '勝ち抜けPt', def: 100 }],
    initState: (p) => ({ score: p.m, correct: 0, wrong: 0 }),
    onCorrect(s, p) { (s.score as number) += p.n; (s.correct as number)++; return { log: `正解 +${p.n} → ${s.score}点` } },
    onWrong(s, _p) {
      (s.wrong as number)++
      const old = s.score as number, raw = old / (s.wrong as number)
      s.score = old === 1 ? Math.floor(raw) : Math.ceil(raw)
      return { log: `誤答 ${old}÷${s.wrong}=${s.score}点`, type: 'wrong' }
    },
    getStatus(s, p) {
      if ((s.score as number) >= p.x) return 'WIN'
      if ((s.score as number) <= 0) return 'LOSE'
      return 'ACTIVE'
    },
  },
  {
    id: 'lucky', name: 'Lucky Shot',
    params: [{ key: 'm', label: '正解最大加点', def: 10 }, { key: 'n', label: '誤答最大減点', def: 10 }, { key: 'x', label: '勝ち抜けPt', def: 100 }, { key: 'y', label: '失格Pt', def: -20 }],
    initState: () => ({ score: 0, correct: 0, wrong: 0 }),
    onCorrect(s, p) {
      const add = Math.floor(Math.random() * (p.m + 1))
      ;(s.score as number) += add; (s.correct as number)++
      return { log: `正解 +${add} → ${s.score}点` }
    },
    onWrong(s, p) {
      const sub = Math.floor(Math.random() * (p.n + 1))
      ;(s.score as number) -= sub; (s.wrong as number)++
      return { log: `誤答 −${sub} → ${s.score}点`, type: 'wrong' }
    },
    getStatus(s, p) {
      if ((s.score as number) >= p.x) return 'WIN'
      if ((s.score as number) <= p.y) return 'LOSE'
      return 'ACTIVE'
    },
  },
  {
    id: 'rensei', name: '連答付き',
    params: [{ key: 'm', label: '勝ち抜けPt', def: 5 }, { key: 'n', label: '失格誤答数', def: 2 }],
    initState: () => ({ score: 0, correct: 0, wrong: 0, hasRight: false }),
    onCorrect(s, _p) {
      let add = 1
      if (s.hasRight) { add = 2; s.hasRight = false } else { s.hasRight = true }
      ;(s.score as number) += add; (s.correct as number)++
      return { log: `正解 +${add} → ${s.score}点${s.hasRight ? ' [連答権]' : ''}`, combo: s.hasRight as boolean }
    },
    onWrong(s, p) { (s.wrong as number)++; s.hasRight = false; return { log: `誤答 連答権消失 誤答${s.wrong}/${p.n}`, type: 'wrong' } },
    getStatus(s, p) {
      if ((s.score as number) >= p.m) return 'WIN'
      if ((s.wrong as number) >= p.n) return 'LOSE'
      return 'ACTIVE'
    },
  },
  {
    id: 'rengou', name: '連誤答付き',
    params: [{ key: 'm', label: '勝ち抜け正解数', def: 5 }, { key: 'n', label: '失格誤答数', def: 3 }],
    initState: () => ({ correct: 0, wrong: 0, disadv: false }),
    onCorrect(s, _p) { (s.correct as number)++; const had = s.disadv; s.disadv = false; return { log: `正解 累計${s.correct}問${had ? ' [ディスアド消失]' : ''}` } },
    onWrong(s, p) {
      const was = s.disadv as boolean
      const add = was ? 2 : 1
      ;(s.wrong as number) += add; s.disadv = true
      return { log: `誤答 ${was ? 'ディスアド発動 ' : ''}−${add}回分 累計${s.wrong}/${p.n}`, type: 'wrong' }
    },
    getStatus(s, p) {
      if ((s.correct as number) >= p.m) return 'WIN'
      if ((s.wrong as number) >= p.n) return 'LOSE'
      return 'ACTIVE'
    },
  },
  {
    id: 'combo', name: 'm hits Combo',
    params: [{ key: 'm', label: '勝ち抜けPt', def: 6 }, { key: 'n', label: '失格誤答数', def: 2 }],
    initState: () => ({ score: 0, correct: 0, wrong: 0, combo: 0 }),
    onCorrect(s, _p) {
      (s.combo as number)++; (s.score as number) += s.combo as number; (s.correct as number)++
      return { log: `正解 コンボ${s.combo} +${s.combo} → ${s.score}点`, combo: s.combo as number }
    },
    onWrong(s, p) { (s.wrong as number)++; s.combo = 0; return { log: `誤答 コンボリセット 誤答${s.wrong}/${p.n}`, type: 'wrong' } },
    getStatus(s, p) {
      if ((s.score as number) >= p.m) return 'WIN'
      if ((s.wrong as number) >= p.n) return 'LOSE'
      return 'ACTIVE'
    },
  },
]

export function getRuleDef(id: RuleId): RuleDef {
  return RULES.find(r => r.id === id) ?? RULES[0]
}

export const DEFAULT_SETTINGS = {
  ruleId: 'mon' as RuleId,
  ruleParams: { m: 5, n: 2 },
  questionCount: 10,
  winnerCount: 1,
  loserCount: 0,
  isPublic: false,
  questionSetId: null as string | null,
}
