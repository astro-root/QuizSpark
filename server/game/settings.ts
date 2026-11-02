import type { GameSettings } from '../../src/types'
import { DEFAULT_SETTINGS, RULES } from './rules'

const int = (v: unknown, min: number, max: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.trunc(v))) : fallback

/**
 * クライアントから届いたゲーム設定を検証・正規化する。不正な構造なら null。
 * (以前は検証なしでそのまま状態に格納され、null や未知のルール ID でサーバーが落ち得た)
 */
export function sanitizeSettings(raw: unknown): GameSettings | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const rule = RULES.find(x => x.id === r.ruleId)
  if (!rule) return null
  const given = (r.ruleParams && typeof r.ruleParams === 'object' ? r.ruleParams : {}) as Record<string, unknown>
  const ruleParams: Record<string, number> = {}
  for (const p of rule.params) ruleParams[p.key] = int(given[p.key], -1000, 1000, p.def)
  const qs = typeof r.questionSetId === 'string' && r.questionSetId.length > 0 && r.questionSetId.length <= 64 ? r.questionSetId : null
  return {
    ruleId: rule.id,
    ruleParams,
    questionCount: int(r.questionCount, 1, 200, DEFAULT_SETTINGS.questionCount),
    winnerCount: int(r.winnerCount, 0, 20, DEFAULT_SETTINGS.winnerCount),
    loserCount: int(r.loserCount, 0, 20, DEFAULT_SETTINGS.loserCount),
    isPublic: r.isPublic === true,
    questionSetId: qs,
  }
}
