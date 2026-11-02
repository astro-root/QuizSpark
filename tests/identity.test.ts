import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { setIdentitySecret, toPublicId } from '../server/game/identity'
import { toPublicState } from '../server/game/publicState'
import { gameManager } from '../server/game/GameManager'
import { DEFAULT_SETTINGS } from '../server/game/rules'
import type { Question } from '../src/types'

setIdentitySecret('test-secret-1')

test('公開 ID: 決定的・トークンごとに異なる・トークンを含まない・秘密鍵が違えば別の値', () => {
  const t = 'abcdefgh-1234-5678-secret-token'
  assert.equal(toPublicId(t), toPublicId(t))
  assert.notEqual(toPublicId(t), toPublicId(t + 'x'))
  assert.equal(toPublicId(t).length, 16)
  assert.ok(!toPublicId(t).includes('secret') && !toPublicId(t).includes('abcdefgh'))
  const a = toPublicId(t)
  setIdentitySecret('test-secret-2')
  assert.notEqual(toPublicId(t), a)
  setIdentitySecret('test-secret-1')
  assert.equal(toPublicId(t), a)
})

test('公開状態: 秘密トークンはどのフィールドにも含まれず、ID は互いに整合する', () => {
  const roomId = gameManager.createRoom('SECRET_TOKEN_HOST', 'ホスト', 'sock1')
  gameManager.joinRoom(roomId, 'SECRET_TOKEN_GUEST', 'ゲスト', 'sock2')
  const state = gameManager.getRoom(roomId)!
  const pub = toPublicState(state)
  assert.ok(!JSON.stringify(pub).includes('SECRET_TOKEN'))
  assert.equal(pub.hostId, toPublicId('SECRET_TOKEN_HOST'))
  assert.equal(pub.hostId, pub.players[0].id)            // 「ホスト判定」がクライアントで成立する
  assert.notEqual(pub.players[0].id, pub.players[1].id)
  assert.equal(state.hostId, 'SECRET_TOKEN_HOST')        // サーバー内部の状態は変更されない
})

test('対戦の全フェーズ(出題→早押し→回答→結果→次の問題→終了)で配信内容にトークンが含まれない', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  try {
    const roomId = gameManager.createRoom('SECRET_TOKEN_A', 'A', 'sA')
    gameManager.joinRoom(roomId, 'SECRET_TOKEN_B', 'B', 'sB')
    gameManager.updateSettings(roomId, 'SECRET_TOKEN_A', { ...DEFAULT_SETTINGS, winnerCount: 1, loserCount: 1, questionCount: 3 })
    const qs: Question[] = Array.from({ length: 3 }, (_, i) => ({ id: i + 1, text: `問題${i}`, answer: 'SECRET_ANSWER', answers: ['SECRET_ANSWER'], displayAnswer: 'SECRET_DISPLAY', genre: 'g' }))
    gameManager.setCustomQuestions(roomId, qs)
    const wire: string[] = []   // クライアントへ実際に送られる JSON
    gameManager.setBroadcast((_id, st) => { wire.push(JSON.stringify(toPublicState(st))) })
    gameManager.setOnFinish(() => {})
    assert.equal(gameManager.startGame(roomId), true)
    for (let i = 0; i < 40; i++) {
      const st = gameManager.getRoom(roomId)!
      if (st.phase === 'finished') break
      if (st.phase === 'question') gameManager.buzz(roomId, 'SECRET_TOKEN_A')
      else if (st.phase === 'answering') gameManager.submitAnswer(roomId, 'SECRET_TOKEN_A', 'SECRET_ANSWER')
      wire.push(JSON.stringify(toPublicState(gameManager.getRoom(roomId)!)))
      mock.timers.tick(15_000)
    }
    assert.ok(wire.length > 5, 'フェーズが進行していること')
    assert.ok(wire.some(w => w.includes('"phase":"result"')), '結果フェーズを通過していること')
    for (const w of wire) assert.ok(!w.includes('SECRET_TOKEN'), 'トークンが配信された')
    // 答えは result フェーズ以外では配信されない
    for (const w of wire) if (!w.includes('"phase":"result"')) assert.ok(!w.includes('SECRET_ANSWER') && !w.includes('SECRET_DISPLAY'))
  } finally { mock.timers.reset() }
})

test('回帰ガード: トークンを配信するイベントは toPublicId を経由する(ソース検査)', () => {
  const root = path.resolve(__dirname, '../server')
  const h = fs.readFileSync(path.join(root, 'socket/handlers.ts'), 'utf8')
  for (const ev of ['buzz-accepted', 'chat-message', 'stamp'])
    for (const line of h.split('\n').filter(l => l.includes(`.emit('${ev}'`)))
      assert.ok(line.includes('toPublicId('), `${ev} が公開 ID を使っていない: ${line.trim()}`)
  assert.ok(!/emit\('(chat-message|stamp)'[^\n]*socket\.id/.test(h), 'socket.id を ID として配信している')
  const m = fs.readFileSync(path.join(root, 'game/MatchmakingManager.ts'), 'utf8')
  assert.match(m, /id: toPublicId\(entry\.playerId\)/)
  assert.match(h, /socket\.emit\('identity', toPublicId\(token\)\)/)
})
