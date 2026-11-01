import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { resolveResults, buildBattleRecords } from '../server/game/settlement'
import { settleGame, type AnswerLog, type SettleDb, type SettleTx } from '../server/game/settleGame'
import { gameManager } from '../server/game/GameManager'
import { DEFAULT_SETTINGS } from '../server/game/rules'
import type { Player, Question, RoomState } from '../src/types'

// ---------- ヘルパー ----------
const player = (id: string, over: Partial<Player> = {}): Player =>
  ({ id, name: id, score: 0, isHost: false, status: 'ACTIVE', ruleState: {}, ...over })
const room = (players: Player[], over: Partial<RoomState> = {}): RoomState => ({
  id: 'R1', hostId: players[0].id, players, phase: 'finished', currentQuestionIndex: 0, currentQuestion: null,
  buzzedPlayerId: null, buzzedPlayerName: null, lastJudgement: null, lastAnswerPlayerId: null, timerEndsAt: null,
  totalQuestions: 10, questionOrder: [], settings: { ...DEFAULT_SETTINGS, questionCount: 10 }, isMatchmaking: true, ...over,
})

function fakeDb(rates: Record<string, number>) {
  const records = new Map<string, unknown>()
  const history: Array<{ userId: string }> = []
  let txCalls = 0
  const tx: SettleTx = {
    user: {
      async findUnique({ where }) { return where.id in rates ? { rate: rates[where.id] } : null },
      async update({ where, data }) { rates[where.id] = data.rate },
    },
  }
  const db: SettleDb = {
    battleRecord: {
      async findMany({ where }) { return where.id.in.filter(id => records.has(id)).map(id => ({ id })) },
      async createMany({ data }) { for (const r of data) if (!records.has(r.id)) records.set(r.id, r) },
    },
    questionHistory: {
      async createMany({ data }) { for (const d of data) history.push({ userId: d.userId as string }) },
      async findMany({ where, skip }) { return history.filter(h => h.userId === where.userId).slice(skip).map((_, i) => ({ id: `h${i}` })) },
      async deleteMany({ where }) { for (let i = 0; i < where.id.in.length; i++) history.pop() },
    },
    async $transaction(fn) { txCalls++; return fn(tx) },
  }
  return { db, records, history, rates, get txCalls() { return txCalls } }
}
const ids = (m: Record<string, string | null>) => (t: string) => m[t] ?? null
const logs = (n: number): AnswerLog[] => Array.from({ length: n }, (_, i) => ({ text: `q${i}`, answer: 'a', userAnswer: 'a', isCorrect: true, genre: 'g', questionId: i }))

// ---------- 勝敗判定 ----------
test('1v1: 相手が失格(切断)なら、残った ACTIVE は WIN', () => {
  const r = resolveResults(room([player('a'), player('b', { status: 'LOSE' })]))
  assert.equal(r.get('a'), 'WIN'); assert.equal(r.get('b'), 'LOSE')
})
test('1v1: 一方が勝ち抜け済みなら、残った ACTIVE は LOSE', () => {
  const r = resolveResults(room([player('a', { status: 'WIN' }), player('b')]))
  assert.equal(r.get('a'), 'WIN'); assert.equal(r.get('b'), 'LOSE')
})
test('1v1: 両者 ACTIVE は得点で決め、同点は引き分け', () => {
  let r = resolveResults(room([player('a', { score: 3 }), player('b', { score: 1 })]))
  assert.equal(r.get('a'), 'WIN'); assert.equal(r.get('b'), 'LOSE')
  r = resolveResults(room([player('a', { score: 2 }), player('b', { score: 2 })]))
  assert.equal(r.get('a'), 'ACTIVE'); assert.equal(r.get('b'), 'ACTIVE')
})
test('フリールームでは結果を補完しない', () => {
  const r = resolveResults(room([player('a'), player('b', { status: 'LOSE' })], { isMatchmaking: false }))
  assert.equal(r.get('a'), 'ACTIVE')
})

// ---------- 戦績の組み立て ----------
test('ゲスト(userId なし)は除外し、同一アカウントの重複は 1 件にする', () => {
  const s = room([player('a'), player('b'), player('c')], { isMatchmaking: false })
  const rows = buildBattleRecords(s, ids({ a: 'u1', b: 'u1', c: null }), resolveResults(s))
  assert.equal(rows.length, 1); assert.equal(rows[0].userId, 'u1')
})

// ---------- 永続化(P1: 切断者の戦績・レート) ----------
test('切断で失格したプレイヤーにも戦績と -20 が付き、残った側に +30 が付く', async () => {
  const s = room([player('a'), player('b', { status: 'LOSE' })])
  const f = fakeDb({ u1: 1000, u2: 1000 })
  // 切断済みなので socket は存在しない前提: userId は GameManager に登録済みの値だけを使う
  const out = await settleGame(s, { db: f.db, userIdOf: ids({ a: 'u1', b: 'u2' }), answerLogsOf: () => [] })
  assert.equal(f.rates.u1, 1030); assert.equal(f.rates.u2, 980)
  assert.equal(out.records.find(r => r.userId === 'u2')?.result, 'LOSE')
  assert.equal(out.rateResults.get('u1')?.delta, 30)
})
test('冪等: 同じ試合を 2 回精算してもレート・履歴は 1 回分しか反映されない', async () => {
  const s = room([player('a'), player('b', { status: 'LOSE' })])
  const f = fakeDb({ u1: 1000, u2: 1000 })
  const deps = { db: f.db, userIdOf: ids({ a: 'u1', b: 'u2' }), answerLogsOf: () => logs(3) }
  await settleGame(s, deps)
  const second = await settleGame(s, deps)
  assert.equal(f.rates.u1, 1030); assert.equal(f.rates.u2, 980)
  assert.equal(f.records.size, 2); assert.equal(f.history.length, 6)
  assert.equal(second.rateResults.size, 0)
})
test('レートは 0 未満にならない', async () => {
  const s = room([player('a'), player('b', { status: 'LOSE' })])
  const f = fakeDb({ u1: 0, u2: 10 })
  await settleGame(s, { db: f.db, userIdOf: ids({ a: 'u1', b: 'u2' }), answerLogsOf: () => [] })
  assert.equal(f.rates.u2, 0)
})
test('引き分け・フリールームではレートは変わらず、戦績のみ保存される', async () => {
  const f = fakeDb({ u1: 1000, u2: 1000 })
  const draw = room([player('a', { score: 1 }), player('b', { score: 1 })])
  await settleGame(draw, { db: f.db, userIdOf: ids({ a: 'u1', b: 'u2' }), answerLogsOf: () => [] })
  const free = room([player('a'), player('b', { status: 'LOSE' })], { id: 'R2', isMatchmaking: false })
  await settleGame(free, { db: f.db, userIdOf: ids({ a: 'u1', b: 'u2' }), answerLogsOf: () => [] })
  assert.equal(f.rates.u1, 1000); assert.equal(f.rates.u2, 1000)
  assert.equal(f.records.size, 4); assert.equal(f.txCalls, 0)
})
test('履歴は上限(questionCount×20)を超えた分だけ削除される', async () => {
  const s = room([player('a'), player('b', { status: 'LOSE' })], { settings: { ...DEFAULT_SETTINGS, questionCount: 1 } })
  const f = fakeDb({ u1: 1000, u2: 1000 })
  await settleGame(s, { db: f.db, userIdOf: ids({ a: 'u1', b: 'u2' }), answerLogsOf: (t) => t === 'a' ? logs(25) : [] })
  assert.equal(f.history.length, 20)
})

// ---------- GameManager 結合: 切断 → 猶予 20 秒 → 失格 → 1 回だけ終了通知 ----------
test('切断が猶予を超えると失格になり、終了通知は 1 回だけで userId も保持されている', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    const roomId = gameManager.createRoom('tokA', 'A', 'sockA')
    gameManager.joinRoom(roomId, 'tokB', 'B', 'sockB')
    gameManager.registerSocket('tokA', 'sockA', 'user-A')
    gameManager.registerSocket('tokB', 'sockB', 'user-B')
    gameManager.setMatchmaking(roomId)
    gameManager.updateSettings(roomId, 'tokA', { ...DEFAULT_SETTINGS, winnerCount: 1, loserCount: 1, questionCount: 5 })
    const qs: Question[] = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, text: `問題${i}`, answer: 'x', answers: ['x'], displayAnswer: 'x', genre: 'g' }))
    gameManager.setCustomQuestions(roomId, qs)
    const finished: RoomState[] = []
    gameManager.setOnFinish((st) => { finished.push(st) })
    gameManager.setBroadcast(() => {})

    assert.equal(gameManager.startGame(roomId), true)
    gameManager.handleDisconnect('tokB')            // B が切断(socket は消える)
    assert.equal(gameManager.getSocketId('tokB'), undefined)
    assert.equal(gameManager.getUserId('tokB'), 'user-B') // それでも userId は分かる

    mock.timers.tick(20_000)                       // 猶予切れ → 失格 → 試合終了
    assert.equal(finished.length, 1)
    assert.equal(finished[0].players.find(p => p.id === 'tokB')?.status, 'LOSE')

    // 終了後にもう一度切断猶予が切れても、二重に終了通知されない
    gameManager.handleDisconnect('tokA')
    mock.timers.tick(30_000)
    assert.equal(finished.length, 1)

    // 精算すると A が WIN(+30)、B が LOSE(-20)
    const f = fakeDb({ 'user-A': 1000, 'user-B': 1000 })
    await settleGame(finished[0], { db: f.db, userIdOf: (t) => gameManager.getUserId(t), answerLogsOf: () => [] })
    assert.equal(f.rates['user-A'], 1030); assert.equal(f.rates['user-B'], 980)
  } finally {
    mock.timers.reset()
  }
})
