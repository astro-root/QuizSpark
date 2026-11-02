import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { toPublicState } from '../server/game/publicState'
import { createRoom, addPlayer, advanceQuestion, acceptBuzz, applyAnswer } from '../server/game/RoomState'
import type { Question, RoomState } from '../src/types'

const SECRET = { answer: 'SECRET_ANSWER', alt: 'SECRET_ALT', display: 'SECRET_DISPLAY' }
const questions: Question[] = [
  { id: 1, text: '問題文1', answer: SECRET.answer, answers: [SECRET.answer, SECRET.alt], displayAnswer: SECRET.display, genre: '歴史' },
  { id: 2, text: '問題文2', answer: 'b', answers: ['b'], displayAnswer: 'B', genre: '地理' },
]

function roomInQuestionPhase(): RoomState {
  let s = createRoom('ROOM01', 'host', 'ホスト')
  s = addPlayer(s, 'guest', 'ゲスト')
  // 出題順はシャッフルされるため、決定的にするため 1 問だけ渡す
  return advanceQuestion(s, [questions[0]])
}

function assertNoSecret(state: RoomState) {
  const json = JSON.stringify(state)
  for (const v of Object.values(SECRET)) assert.ok(!json.includes(v), `leaked: ${v}`)
}

test('question フェーズでは答えが一切含まれない', () => {
  const s = roomInQuestionPhase()
  assert.equal(s.phase, 'question')
  assertNoSecret(toPublicState(s))
  assert.equal(toPublicState(s).currentQuestion?.text, '問題文1')
})

test('answering フェーズでも答えが含まれない', () => {
  const s = acceptBuzz(roomInQuestionPhase(), 'host')
  assert.equal(s.phase, 'answering')
  assertNoSecret(toPublicState(s))
})

test('result フェーズでは表示用の答えが公開される', () => {
  const s = acceptBuzz(roomInQuestionPhase(), 'host')
  const { nextState } = applyAnswer(s, 'host', SECRET.answer)
  assert.equal(nextState.phase, 'result')
  assert.equal(toPublicState(nextState).currentQuestion?.displayAnswer, SECRET.display)
})

test('元の state を破壊しない(サーバー側の判定用データが残る)', () => {
  const s = roomInQuestionPhase()
  toPublicState(s)
  assert.equal(s.currentQuestion?.answer, SECRET.answer)
})

test('currentQuestion が null の状態でも例外にならず、問題は null のまま', () => {
  const s = createRoom('ROOM02', 'host', 'ホスト')
  assert.equal(toPublicState(s).currentQuestion, null)
})

test('許可リスト方式: Question に未知のフィールドがあっても漏れない', () => {
  const s = roomInQuestionPhase()
  const q = s.currentQuestion as unknown as Record<string, unknown>
  q.explanation = 'SECRET_EXPLANATION'
  const json = JSON.stringify(toPublicState(s))
  assert.ok(!json.includes('SECRET_EXPLANATION'))
})

test('回帰ガード: room-update を emit する行は必ず toPublicState を経由する', () => {
  const root = path.resolve(__dirname, '../server')
  const files: string[] = []
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (p.endsWith('.ts')) files.push(p)
    }
  }
  walk(root)
  const offenders: string[] = []
  for (const f of files) {
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (/emit\(\s*['"]room-update['"]/.test(line) && !line.includes('toPublicState')) {
        offenders.push(`${path.relative(root, f)}:${i + 1}`)
      }
    })
  }
  assert.deepEqual(offenders, [])
})
