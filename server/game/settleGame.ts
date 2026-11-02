import type { RoomState } from '../../src/types'
import { buildBattleRecords, rateDelta, resolveResults, type BattleRecordRow } from './settlement'

export interface AnswerLog {
  text: string; answer: string; userAnswer: string; isCorrect: boolean; genre: string; questionId: number | null
}
export interface RateResultRow { result: 'WIN' | 'LOSE'; oldRate: number; newRate: number; delta: number }

/** Prisma のうち使用する部分だけを表す最小インターフェース(テストで差し替え可能にするため)。 */
export interface SettleTx {
  user: {
    findUnique(args: { where: { id: string }; select: { rate: true } }): Promise<{ rate: number } | null>
    update(args: { where: { id: string }; data: { rate: number } }): Promise<unknown>
  }
}
export interface SettleDb {
  battleRecord: {
    findMany(args: { where: { id: { in: string[] } }; select: { id: true } }): Promise<{ id: string }[]>
    createMany(args: { data: BattleRecordRow[]; skipDuplicates: boolean }): Promise<unknown>
  }
  questionHistory: {
    createMany(args: { data: Array<Record<string, unknown>> }): Promise<unknown>
    findMany(args: { where: { userId: string }; orderBy: { playedAt: 'desc' }; skip: number; select: { id: true } }): Promise<{ id: string }[]>
    deleteMany(args: { where: { id: { in: string[] } } }): Promise<unknown>
  }
  $transaction<T>(fn: (tx: SettleTx) => Promise<T>): Promise<T>
}
export interface SettleDeps {
  db: SettleDb
  userIdOf(token: string): string | null
  answerLogsOf(token: string): AnswerLog[]
}
export interface SettleOutcome {
  records: BattleRecordRow[]
  /** 今回新たにレートを反映したユーザー(userId → 結果) */
  rateResults: Map<string, RateResultRow>
}

/**
 * 試合結果の永続化。
 *  - プレイヤー識別は接続中の socket ではなく、GameManager に登録済みの userId に基づく
 *    (切断・失格したプレイヤーの戦績/レートも処理される)。
 *  - 冪等: 既に保存済みの戦績(同一 id)に対しては、履歴追加もレート反映も行わない。
 */
export async function settleGame(state: RoomState, deps: SettleDeps): Promise<SettleOutcome> {
  const { db } = deps
  const results = resolveResults(state)
  const records = buildBattleRecords(state, deps.userIdOf, results)
  const outcome: SettleOutcome = { records, rateResults: new Map() }
  if (records.length === 0) return outcome

  const existing = new Set((await db.battleRecord.findMany({ where: { id: { in: records.map(r => r.id) } }, select: { id: true } })).map(r => r.id))
  const fresh = records.filter(r => !existing.has(r.id))
  if (fresh.length === 0) return outcome

  // 戦績 → 履歴 → レートの順(レートは戦績の保存に成功した場合のみ反映)
  await db.battleRecord.createMany({ data: fresh, skipDuplicates: true })

  const historyLimit = (state.settings?.questionCount ?? 30) * 20
  for (const p of state.players) {
    const userId = deps.userIdOf(p.id)
    if (!userId || !fresh.some(r => r.userId === userId)) continue
    const logs = deps.answerLogsOf(p.id)
    if (logs.length === 0) continue
    await db.questionHistory.createMany({
      data: logs.map(l => ({ userId, text: l.text, answer: l.answer, userAnswer: l.userAnswer, isCorrect: l.isCorrect, genre: l.genre ?? 'ノンジャンル', questionId: l.questionId ?? null })),
    })
    const overflow = await db.questionHistory.findMany({ where: { userId }, orderBy: { playedAt: 'desc' }, skip: historyLimit, select: { id: true } })
    if (overflow.length > 0) await db.questionHistory.deleteMany({ where: { id: { in: overflow.map(h => h.id) } } })
  }

  const targets = fresh.filter(r => r.isMatchmaking && (r.result === 'WIN' || r.result === 'LOSE'))
  if (targets.length > 0) {
    await db.$transaction(async (tx) => {
      for (const r of targets) {
        const delta = rateDelta(r.result)
        const user = await tx.user.findUnique({ where: { id: r.userId }, select: { rate: true } })
        if (!user) continue
        const newRate = Math.max(0, user.rate + delta)
        await tx.user.update({ where: { id: r.userId }, data: { rate: newRate } })
        outcome.rateResults.set(r.userId, { result: r.result as 'WIN' | 'LOSE', oldRate: user.rate, newRate, delta })
      }
    })
  }
  return outcome
}
