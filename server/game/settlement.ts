import type { Player, RoomState } from '../../src/types'

export type MatchResult = 'WIN' | 'LOSE' | 'ACTIVE'
export const RATE_WIN_DELTA = 30
export const RATE_LOSE_DELTA = -20

/**
 * 試合終了時の各プレイヤーの結果(token → 結果)を決める。純粋関数。
 *
 * ランダムマッチ(1対1)では、片方だけ勝敗が確定して終了した場合に
 * 残った側を相手の結果の反対(勝ち/負け)として扱う。
 * 例: 相手が切断で失格 → 残った側は WIN。
 * 両者とも未確定なら得点で決める。同点は引き分け(両者 ACTIVE、レート変動なし)。
 */
export function resolveResults(state: RoomState): Map<string, MatchResult> {
  const out = new Map<string, MatchResult>()
  for (const p of state.players) {
    out.set(p.id, p.status === 'WIN' ? 'WIN' : p.status === 'LOSE' ? 'LOSE' : 'ACTIVE')
  }
  if (!state.isMatchmaking || state.players.length !== 2) return out

  const [a, b] = state.players
  const ra = out.get(a.id)!
  const rb = out.get(b.id)!
  if (ra === 'ACTIVE' && rb === 'ACTIVE') {
    if (a.score > b.score) { out.set(a.id, 'WIN'); out.set(b.id, 'LOSE') }
    else if (b.score > a.score) { out.set(b.id, 'WIN'); out.set(a.id, 'LOSE') }
  } else if (ra === 'ACTIVE') {
    out.set(a.id, rb === 'WIN' ? 'LOSE' : 'WIN')
  } else if (rb === 'ACTIVE') {
    out.set(b.id, ra === 'WIN' ? 'LOSE' : 'WIN')
  }
  return out
}

export interface BattleRecordRow {
  id: string
  userId: string
  roomId: string
  ruleId: string
  isMatchmaking: boolean
  result: MatchResult
  correct: number
  wrong: number
  score: number
  playerCount: number
}

function num(v: unknown): number { return typeof v === 'number' && Number.isFinite(v) ? v : 0 }

/**
 * 戦績レコードを組み立てる。userId が分からない(ゲスト)プレイヤーは除外し、
 * 同一アカウントが複数枠で参加していても 1 レコードだけにする(レートの二重加算防止)。
 */
export function buildBattleRecords(
  state: RoomState,
  userIdOf: (token: string) => string | null,
  results: Map<string, MatchResult>,
): BattleRecordRow[] {
  const seen = new Set<string>()
  const rows: BattleRecordRow[] = []
  for (const p of state.players as Player[]) {
    const userId = userIdOf(p.id)
    if (!userId || seen.has(userId)) continue
    seen.add(userId)
    rows.push({
      // 試合ごとの gameId をキーにする(同じルームで再戦しても戦績が重複扱いで捨てられない)
      id: `${state.gameId ?? state.id}-${userId}`,
      userId,
      roomId: state.id,
      ruleId: state.settings?.ruleId ?? 'free',
      isMatchmaking: !!state.isMatchmaking,
      result: results.get(p.id) ?? 'ACTIVE',
      correct: num(p.ruleState?.correct),
      wrong: num(p.ruleState?.wrong),
      score: p.score,
      playerCount: state.players.length,
    })
  }
  return rows
}

export function rateDelta(result: MatchResult): number {
  return result === 'WIN' ? RATE_WIN_DELTA : result === 'LOSE' ? RATE_LOSE_DELTA : 0
}
