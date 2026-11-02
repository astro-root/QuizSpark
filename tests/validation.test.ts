import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSubmittedQuestionData, parseAnswers, validateAdminNotification,
  validateAnnouncementActive, validateQuestionInput, validateReportInput,
} from '../server/lib/validation'
import { requireAdmin, requireAuth } from '../server/lib/guards'

// ---- P1: 投稿問題は常に未承認 ----
test('投稿問題は body に approved:true があっても未承認で保存される', () => {
  const v = validateQuestionInput({ text: 'Q', answer: 'A', approved: true, authorId: 'attacker' })
  assert.ok(v.ok)
  const data = buildSubmittedQuestionData(v.value, 'user-1')
  assert.equal(data.approved, false)
  assert.equal(data.authorId, 'user-1')
  assert.ok(!('isAdmin' in data))
})

test('検証済みデータには許可したフィールドしか含まれない', () => {
  const v = validateQuestionInput({ text: 'Q', answer: 'A', id: 99, createdAt: 'x', approved: true })
  assert.ok(v.ok)
  assert.deepEqual(Object.keys(v.value).sort(), ['answer', 'answers', 'displayAnswer', 'genre', 'text'])
})

// ---- P1: 未認証・一般ユーザーは全問題(正解付き)を取得できない ----
function fakeRes() {
  const r: { code?: number; body?: unknown } = {}
  const res = { status(c: number) { r.code = c; return res }, json(b: unknown) { r.body = b; return res } }
  return { r, res }
}
const run = (guard: (req: object, res: object, next: () => void) => void, user?: object) => {
  const { r, res } = fakeRes(); let nextCalled = false
  guard({ user }, res, () => { nextCalled = true })
  return { ...r, nextCalled }
}
test('requireAdmin: 未認証は 401', () => assert.deepEqual(run(requireAdmin), { code: 401, body: { error: 'ログインが必要です' }, nextCalled: false }))
test('requireAdmin: 一般ユーザーは 403', () => { const o = run(requireAdmin, { id: 'u', isAdmin: false }); assert.equal(o.code, 403); assert.equal(o.nextCalled, false) })
test('requireAdmin: 管理者は通る', () => assert.equal(run(requireAdmin, { id: 'u', isAdmin: true }).nextCalled, true))
test('requireAuth: 未認証は 401 / ログイン済みは通る', () => {
  assert.equal(run(requireAuth).code, 401)
  assert.equal(run(requireAuth, { id: 'u' }).nextCalled, true)
})
test('GET /api/questions は requireAdmin で保護されている(ソース検査)', async () => {
  const fs = await import('node:fs'); const path = await import('node:path')
  const src = fs.readFileSync(path.resolve(__dirname, '../server/routes/questions.ts'), 'utf8')
  assert.match(src, /router\.get\('\/', requireAdmin,/)
})

// ---- P2: 入力検証 ----
test('問題文・答えの長さと型を検証する', () => {
  assert.equal(validateQuestionInput({ text: '', answer: 'A' }).ok, false)
  assert.equal(validateQuestionInput({ text: 'Q', answer: 'a'.repeat(101) }).ok, false)
  assert.equal(validateQuestionInput({ text: 'q'.repeat(501), answer: 'A' }).ok, false)
  assert.equal(validateQuestionInput({ text: 123, answer: 'A' }).ok, false)
  assert.equal(validateQuestionInput(null).ok, false)
})
test('別解は文字列配列のみ・10件まで・重複除去・answer を先頭に含む', () => {
  assert.deepEqual(parseAnswers(undefined, 'A'), { ok: true, value: ['A'] })
  assert.deepEqual(parseAnswers(['B', 'B', ' ', 'A'], 'A'), { ok: true, value: ['A', 'B'] })
  assert.equal(parseAnswers([1, 2], 'A').ok, false)
  assert.equal(parseAnswers('x', 'A').ok, false)
  assert.equal(parseAnswers(Array.from({ length: 11 }, (_, i) => `a${i}`), 'A').ok, false)
  assert.equal(parseAnswers(['x'.repeat(101)], 'A').ok, false)
})
test('未知のジャンルは ノンジャンル になり、displayAnswer は既定で answer', () => {
  const v = validateQuestionInput({ text: 'Q', answer: 'A', genre: '<script>' })
  assert.ok(v.ok); assert.equal(v.value.genre, 'ノンジャンル'); assert.equal(v.value.displayAnswer, 'A')
})
test('報告入力: questionId は正の整数、reason は 1〜500 文字', () => {
  assert.equal(validateReportInput({ questionId: 3, reason: 'x' }).ok, true)
  assert.equal(validateReportInput({ questionId: '3', reason: 'x' }).ok, true)
  assert.equal(validateReportInput({ questionId: 'abc', reason: 'x' }).ok, false)
  assert.equal(validateReportInput({ questionId: -1, reason: 'x' }).ok, false)
  assert.equal(validateReportInput({ questionId: 1, reason: 'x'.repeat(501) }).ok, false)
  assert.equal(validateReportInput({ questionId: 1, reason: { a: 1 } }).ok, false)
})
test('お知らせの active は boolean のみ', () => {
  assert.equal(validateAnnouncementActive({ active: true }).ok, true)
  assert.equal(validateAnnouncementActive({ active: 'yes' }).ok, false)
  assert.equal(validateAnnouncementActive({}).ok, false)
})
test('管理者通知: 宛先・長さ・種別を検証する', () => {
  const ok = validateAdminNotification({ userIds: 'all', title: 't', body: 'b', type: 'evil' })
  assert.ok(ok.ok); assert.equal(ok.value.type, 'admin')
  assert.equal(validateAdminNotification({ userIds: [1], title: 't', body: 'b' }).ok, false)
  assert.equal(validateAdminNotification({ userIds: 'all', title: 't'.repeat(101), body: 'b' }).ok, false)
  assert.equal(validateAdminNotification({ userIds: {}, title: 't', body: 'b' }).ok, false)
})

test('問題セット項目の削除は所有確認済みの setId に限定される(IDOR 回帰ガード・ソース検査)', async () => {
  const fs = await import('node:fs'); const path = await import('node:path')
  const src = fs.readFileSync(path.resolve(__dirname, '../server/routes/questionSets.ts'), 'utf8')
  assert.match(src, /questionSetItem\.deleteMany\(\{ where: \{ id: itemId, setId: req\.params\.id \} \}\)/)
  assert.doesNotMatch(src, /questionSetItem\.delete\(/)
})
