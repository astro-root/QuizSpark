import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { gameManager } from '../server/game/GameManager'
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

test('古いタイマー: phaseSeq が進んでいれば、残っていたタイマーが発火しても状態遷移しない', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    // 対照: 何もしなければ、早押し制限時間の経過で問題がスキップされ result になる
    const control = setupRoom('T_A', 'T_B', 3)
    gameManager.setOnFinish(() => {})
    gameManager.startGame(control)
    mock.timers.tick(7_000) /* 表示1.5s + 3文字×0.12s + 制限5s ≈ 6.9s */
    assert.equal(gameManager.getRoom(control)!.phase, 'result')

    // 本番: タイマーを残したまま別の遷移(phaseSeq の更新)が起きた状況を作る
    const room = setupRoom('U_A', 'U_B', 3)
    gameManager.startGame(room)
    const st = gameManager.getRoom(room)!
    internals.commit(room, { ...st, buzzedPlayerId: 'U_A' })   // 早押し者が変わる = 遷移 → phaseSeq が進む
    internals.commit(room, { ...gameManager.getRoom(room)!, buzzedPlayerId: null })
    assert.ok(gameManager.getRoom(room)!.phaseSeq! > st.phaseSeq!)
    mock.timers.tick(7_000) /* 表示1.5s + 3文字×0.12s + 制限5s ≈ 6.9s */                                    // 旧 phaseSeq のタイマーが発火
    assert.equal(gameManager.getRoom(room)!.phase, 'question', '古いタイマーが誤ってスキップさせた')
  } finally { mock.timers.reset() }
})
