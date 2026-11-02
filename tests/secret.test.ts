import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { gameManager } from '../server/game/GameManager'
import { joinState, splitState } from '../server/game/secret'
import { addPlayer, advanceQuestion, acceptBuzz, applyAnswer, createRoom } from '../server/game/RoomState'
import { DEFAULT_SETTINGS } from '../server/game/rules'
import type { Question, RoomState } from '../src/types'

const SECRET_Q: Question = { id: 7, text: '日本の首都は?', answer: 'とうきょう', answers: ['とうきょう', 'TOKYO_ALT'], displayAnswer: 'DISPLAY_TOKYO', genre: '地理' }
const hasSecret = (o: unknown) => /とうきょう|TOKYO_ALT|DISPLAY_TOKYO/.test(JSON.stringify(o))

function fullStates(): { question: RoomState; answering: RoomState; result: RoomState } {
  let s = addPlayer(createRoom('R1', 'p1', 'A'), 'p2', 'B')
  s = advanceQuestion(s, [SECRET_Q])
  const question = s
  const answering = acceptBuzz(s, 'p1')
  const result = applyAnswer(answering, 'p1', 'とうきょう').nextState
  return { question, answering, result }
}

test('splitState: 出題中・回答中の公開状態に答えはなく、秘密側に完全な問題が残る', () => {
  const { question, answering } = fullStates()
  for (const full of [question, answering]) {
    const { pub, secret } = splitState(full)
    assert.ok(!hasSecret(pub), '公開状態に答えが含まれている')
    assert.deepEqual(pub.questionOrder, [])
    assert.equal(pub.currentQuestion?.text, SECRET_Q.text)
    assert.deepEqual(secret.question, SECRET_Q)
    assert.deepEqual(secret.questionOrder, full.questionOrder)
  }
})
test('splitState: 結果表示では答えが公開される', () => {
  const { pub } = splitState(fullStates().result)
  assert.equal(pub.currentQuestion?.displayAnswer, 'DISPLAY_TOKYO')
})
test('split → join で完全な状態に戻る(往復で情報が失われない)', () => {
  for (const full of Object.values(fullStates())) {
    const { pub, secret } = splitState(full)
    assert.deepEqual(joinState(pub, secret), full)
  }
})

function startMatch(tokA: string, tokB: string, qs: Question[], onWire: (json: string) => void) {
  const roomId = gameManager.createRoom(tokA, 'A', 's' + tokA)
  gameManager.joinRoom(roomId, tokB, 'B', 's' + tokB)
  gameManager.updateSettings(roomId, tokA, { ...DEFAULT_SETTINGS, winnerCount: 0, loserCount: 0, questionCount: qs.length })
  gameManager.setCustomQuestions(roomId, qs)
  // toPublicState を通さず「GameManager が渡す状態そのもの」を記録する(構造的に安全かを検証)
  gameManager.setBroadcast((_id, st) => onWire(JSON.stringify(st)))
  gameManager.setOnFinish(() => {})
  assert.equal(gameManager.startGame(roomId), true)
  return roomId
}

test('GameManager が保持・配信する状態そのものに、結果表示以外では答えが含まれない', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    const wire: string[] = []
    const room = startMatch('SEC_A', 'SEC_B', [SECRET_Q, { ...SECRET_Q, id: 8 }], j => wire.push(j))
    assert.ok(!hasSecret(gameManager.getRoom(room)), '出題中の getRoom に答えがある')
    gameManager.buzz(room, 'SEC_A')
    assert.equal(gameManager.getRoom(room)!.phase, 'answering')
    assert.ok(!hasSecret(gameManager.getRoom(room)), '回答中の getRoom に答えがある')
    gameManager.submitAnswer(room, 'SEC_A', 'まちがい')
    assert.equal(gameManager.getRoom(room)!.phase, 'result')
    assert.equal(gameManager.getRoom(room)!.currentQuestion?.displayAnswer, 'DISPLAY_TOKYO')
    mock.timers.tick(12_000)                       // 次の問題へ(タイマー経路でも配信される)
    // 配信: 開始 / 回答結果 / 次の問題(以降はタイマー経路)。早押しの配信はハンドラ側の責務
    assert.ok(wire.length >= 3, `配信回数 ${wire.length}`)
    assert.ok(wire.some(j => j.includes('"phase":"question"') && j.includes('"currentQuestionIndex":1')), '2問目の出題が配信されていること')
    for (const j of wire) if (!j.includes('"phase":"result"')) assert.ok(!hasSecret(j), '配信に答えが含まれた')
  } finally { mock.timers.reset() }
})

test('判定は秘密側の答えで行われる(正解・別解・誤答・時間切れ)', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    const judge = (answer: string | null) => {
      const room = startMatch('J_A' + Math.random(), 'J_B' + Math.random(), [SECRET_Q], () => {})
      const a = gameManager.getRoom(room)!.players[0].id
      gameManager.buzz(room, a)
      if (answer === null) mock.timers.tick(9_000)  // 回答時間切れ
      else gameManager.submitAnswer(room, a, answer)
      return gameManager.getRoom(room)!.lastJudgement
    }
    assert.equal(judge('とうきょう'), 'correct')
    assert.equal(judge('TOKYO_ALT'), 'correct')
    assert.equal(judge('おおさか'), 'incorrect')
    assert.equal(judge(null), 'incorrect')
  } finally { mock.timers.reset() }
})

test('回答履歴(自分の履歴)には正しい答えが残る', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    const room = startMatch('H_A', 'H_B', [SECRET_Q], () => {})
    gameManager.buzz(room, 'H_A'); gameManager.submitAnswer(room, 'H_A', 'とうきょう')
    const log = gameManager.getAnswerLogs(room)!.get('H_A')![0]
    assert.equal(log.answer, 'DISPLAY_TOKYO'); assert.equal(log.isCorrect, true); assert.equal(log.questionId, 7)
  } finally { mock.timers.reset() }
})
