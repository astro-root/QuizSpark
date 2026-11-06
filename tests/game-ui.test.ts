import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { scoreParts, scoreText } from '../src/utils/scoreLabel'
import { STAMPS, isValidStamp, resolveStamp } from '../src/lib/stamps'
import { ICONS } from '../src/components/ui/iconPaths'
import type { Player } from '../src/types'

const pl = (ruleState: Player['ruleState'], score = 0): Player => ({ id: 'p', name: 'n', score, isHost: false, status: 'ACTIVE', ruleState })

test('scoreText: ルールごとの表示(記号を使わない読み上げ用)', () => {
  assert.equal(scoreText(pl({ correct: 3, wrong: 1 }), 'mon'), '3正解 1誤答')
  assert.equal(scoreText(pl({}), 'free'), '0正解 0誤答')
  assert.equal(scoreText(pl({ score: 7 }), 'newyork'), '7pt')
  assert.equal(scoreText(pl({ correct: 3, wrong: 4 }), 'by'), '積12')
  assert.equal(scoreText(pl({ score: 2, rest: 1 }), 'freeze'), '2正解 休1')
  assert.equal(scoreText(pl({ correct: 5, penalty: 2 }), 'swedish'), '5正解 P2')
  assert.equal(scoreText(pl({ score: 4, hasRight: true }), 'rensei'), '4pt 連答権あり')
  assert.equal(scoreText(pl({ score: 4, combo: 3 }), 'combo'), '4pt コンボ3')
  assert.equal(scoreText(pl({}, 9), 'unknown-rule'), '9')
})
test('scoreParts: 絵文字・記号の文字を含まず、アイコンは実在する', () => {
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u25AA-\u25FE]/u
  for (const rule of ['free', 'mon', 'newyork', 'by', 'freeze', 'mon_rest', 'swedish', 'rensei', 'rengou', 'combo', 'divide', 'lucky', 'updown', 'x'])
    for (const part of scoreParts(pl({ correct: 1, wrong: 1, score: 1, rest: 1, penalty: 1, hasRight: true, combo: 2 }), rule)) {
      if (part.kind === 'text') assert.ok(!EMOJI.test(part.text), `${rule}: 記号が残っている "${part.text}"`)
      else assert.ok(part.icon in ICONS && part.label.length > 0)
    }
})
test('不正な型の ruleState でも落ちない(数値以外は 0 扱い)', () => {
  assert.equal(scoreText(pl({ correct: 'abc' as unknown as number, wrong: null as unknown as number }), 'mon'), '0正解 0誤答')
})

test('スタンプ: 新 ID と旧絵文字を受け付け、任意の文字列・長大な入力は拒否する', () => {
  for (const s of STAMPS) assert.ok(isValidStamp(s.id) && s.icon in ICONS)
  for (const emoji of ['👍', '👏', '🔥', '💪', '😲', '🤔', '😭', '🎉']) assert.ok(isValidStamp(emoji), emoji)
  assert.equal(resolveStamp('👏')?.id, 'smile')
  for (const bad of ['', 'hello', '<script>', 'x'.repeat(1000), 123, null, undefined, {}, ['thumbs-up']]) assert.equal(isValidStamp(bad), false, String(bad))
  assert.equal(new Set(STAMPS.map(s => s.id)).size, STAMPS.length)
  assert.equal(new Set(STAMPS.map(s => s.icon)).size, STAMPS.length, 'スタンプのアイコンが重複している')
})
test('サーバーのスタンプ中継は許可リストで検証している(ソース検査)', () => {
  const h = fs.readFileSync(path.resolve(__dirname, '../server/socket/handlers.ts'), 'utf8')
  assert.match(h, /!isValidStamp\(stamp\)/)
})
