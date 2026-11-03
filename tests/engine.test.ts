import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { gameManager } from '../server/game/GameManager'
import { InMemoryScheduler } from '../server/game/scheduler'
import { buildBattleRecords, resolveResults } from '../server/game/settlement'
import { DEFAULT_SETTINGS } from '../server/game/rules'
import type { Question, RoomState } from '../src/types'

const Q = (n: number): Question[] => Array.from({ length: n }, (_, i) => ({ id: i + 1, text: `問題${i}`, answer: 'x', answers: ['x'], displayAnswer: 'x', genre: 'g' }))
type Internals = { commit(roomId: string, s: RoomState): RoomState }
const internals = gameManager as unknown as Internals

function setupRoom(tokenA: string, tokenB: string, questionCount: number) {
  const roomId = gameManager.createRoom(tokenA, 'A', 's' + tokenA)
  gameManager.joinRoom(roomId, tokenB, 'B', 's' + tokenB)
  gameManager.updateSettings(roomId, tokenA, { ...DEFAULT_SETTINGS, winnerCount: 1, loserCount: 1, questionCount })
  gameManager.setCustomQuestions(roomId, Q(questionCount))
  gameManager.setBroadcast(() => {})
  return roomId
}

test('gameId: 試合ごとに採番され、再戦(同じルーム)でも別の戦績 ID になる', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    const roomId = setupRoom('G_A', 'G_B', 1)
    const finished: RoomState[] = []
    gameManager.setOnFinish(st => { finished.push(st) })
    const playOne = () => {
      assert.equal(gameManager.startGame(roomId), true)
      assert.equal(gameManager.buzz(roomId, 'G_A'), true)
      gameManager.submitAnswer(roomId, 'G_A', 'x')
      mock.timers.tick(10_000)                       // 結果表示 → 次の問題なし → finished
      assert.equal(gameManager.getRoom(roomId)!.phase, 'finished')
    }
    playOne()
    assert.equal(gameManager.resetGame(roomId, 'G_A'), true)
    assert.equal(gameManager.getRoom(roomId)!.gameId, null)
    gameManager.setCustomQuestions(roomId, Q(1))
    playOne()

    assert.equal(finished.length, 2, '再戦でも終了通知が届く')
    assert.ok(finished[0].gameId && finished[1].gameId && finished[0].gameId !== finished[1].gameId)
    const ids = finished.map(st => buildBattleRecords(st, t => 'user-' + t, resolveResults(st))[0].id)
    assert.notEqual(ids[0], ids[1], '以前は `${roomId}-${userId}` で衝突し、2 試合目の戦績が捨てられていた')
  } finally { mock.timers.reset() }
})

test('phaseSeq: 遷移のたびに単調増加し、設定変更など遷移を伴わない更新では変わらない', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    const roomId = setupRoom('S_A', 'S_B', 3)
    gameManager.setOnFinish(() => {})
    const seq = () => gameManager.getRoom(roomId)!.phaseSeq!
    const s0 = seq()
    gameManager.setMatchmaking(roomId)               // 遷移なし
    assert.equal(seq(), s0)
    gameManager.startGame(roomId); const s1 = seq()
    gameManager.buzz(roomId, 'S_A');  const s2 = seq()
    gameManager.submitAnswer(roomId, 'S_A', 'x'); const s3 = seq()
    mock.timers.tick(10_000);         const s4 = seq()
    assert.ok(s0 < s1 && s1 < s2 && s2 < s3 && s3 < s4, `seq: ${[s0, s1, s2, s3, s4]}`)
  } finally { mock.timers.reset() }
})

test('advanceIfDue: 期限前・重複呼び出しは何もせず(冪等)、期限後に 1 段階だけ進む', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  gameManager.setScheduler({ schedule: () => {}, cancel: () => {} })   // 時計を進めても自動では進まない(tick 経由のみ)
  try {
    const room = setupRoom('D_A', 'D_B', 3)
    gameManager.setOnFinish(() => {})
    gameManager.startGame(room)
    const toDeadline = () => mock.timers.tick(Math.max(0, gameManager.getRoom(room)!.timerEndsAt! - Date.now()))

    assert.equal(gameManager.advanceIfDue(room), false, '期限前は進めない')
    assert.equal(gameManager.getRoom(room)!.phase, 'question')
    toDeadline()
    assert.equal(gameManager.advanceIfDue(room), true)
    assert.equal(gameManager.getRoom(room)!.phase, 'result')
    assert.equal(gameManager.getRoom(room)!.lastJudgement, 'skip')
    // 別プレイヤーの tick・古いタイマーなど、同時刻の重複呼び出しでは二重に進まない
    assert.equal(gameManager.advanceIfDue(room), false)
    assert.equal(gameManager.advanceIfDue(room), false)
    assert.equal(gameManager.getRoom(room)!.phase, 'result')

    toDeadline()
    assert.equal(gameManager.advanceIfDue(room), true)
    assert.equal(gameManager.getRoom(room)!.currentQuestionIndex, 1)
    assert.equal(gameManager.advanceIfDue(room), false)
    assert.equal(gameManager.getRoom(room)!.currentQuestionIndex, 1, '問題が飛ばされていない')
  } finally {
    gameManager.setScheduler(new InMemoryScheduler(id => { gameManager.advanceIfDue(id) }))
    mock.timers.reset()
  }
})

test('サーバーレス相当: スケジューラ無し(tick のみ)でも 1 試合を最後まで進められ、終了通知は 1 回', () => {
  const armed: Array<[string, number]> = []
  gameManager.setScheduler({ schedule: (r, at) => { armed.push([r, at]) }, cancel: () => {} })
  try {
    const room = setupRoom('V_A', 'V_B', 3)
    const finished: RoomState[] = []
    gameManager.setOnFinish(st => { finished.push(st) })
    gameManager.startGame(room)
    let guard = 0
    while (gameManager.getRoom(room)!.phase !== 'finished' && guard++ < 50) {
      const st = gameManager.getRoom(room)!
      if (st.phase === 'question' && guard === 2) { gameManager.buzz(room, 'V_A'); gameManager.submitAnswer(room, 'V_A', 'x'); continue }
      gameManager.advanceIfDue(room, st.timerEndsAt!)           // クライアントの「期限が来た」リクエスト相当
      gameManager.advanceIfDue(room, st.timerEndsAt!)           // 別プレイヤーからの重複リクエスト
    }
    assert.equal(gameManager.getRoom(room)!.phase, 'finished')
    assert.equal(finished.length, 1)
    assert.ok(armed.length >= 6, '各フェーズで期限が予約されている(外部スケジューラへ渡せる)')
    assert.ok(armed.every(([r, at]) => r === room && Number.isFinite(at)))
  } finally {
    gameManager.setScheduler(new InMemoryScheduler(id => { gameManager.advanceIfDue(id) }))
  }
})
