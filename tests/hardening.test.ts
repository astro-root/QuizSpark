import { test } from 'node:test'
import assert from 'node:assert/strict'
import { csrfGuard, isOriginAllowed, parseAllowedOrigins, DEFAULT_ALLOWED_ORIGINS } from '../server/lib/origin'
import { createEventLimiter } from '../server/lib/eventLimiter'
import { sanitizeSettings } from '../server/game/settings'

// ---- Origin / CSRF ----
const ALLOWED = ['https://quiz.example.com']
function runGuard(method: string, headers: Record<string, string>) {
  let code: number | undefined; let nextCalled = false
  const res = { status(c: number) { code = c; return res }, json() { return res } }
  csrfGuard(ALLOWED)({ method, headers } as never, res as never, () => { nextCalled = true })
  return { code, nextCalled }
}
test('CSRF: 許可外 Origin からの POST は 403', () => assert.deepEqual(runGuard('POST', { origin: 'https://evil.example' }), { code: 403, nextCalled: false }))
test('CSRF: 許可 Origin からの POST は通る', () => assert.equal(runGuard('POST', { origin: 'https://quiz.example.com' }).nextCalled, true))
test('CSRF: GET は Origin に関わらず通る', () => assert.equal(runGuard('GET', { origin: 'https://evil.example' }).nextCalled, true))
test('CSRF: Origin なしでも Sec-Fetch-Site: cross-site は拒否、それ以外は通る', () => {
  assert.equal(runGuard('DELETE', { 'sec-fetch-site': 'cross-site' }).code, 403)
  assert.equal(runGuard('DELETE', {}).nextCalled, true)
})
test('許可オリジン: 未設定なら既定値、ALLOWED_ORIGINS と FRONTEND_URL を正規化して合成', () => {
  assert.deepEqual(parseAllowedOrigins(undefined, undefined), DEFAULT_ALLOWED_ORIGINS)
  assert.deepEqual(parseAllowedOrigins('https://a.example/, https://b.example', 'https://a.example/path'), ['https://a.example', 'https://b.example'])
  assert.equal(isOriginAllowed('https://evil.example', ALLOWED), false)
  assert.equal(isOriginAllowed(undefined, ALLOWED), true)
})

// ---- Socket イベントのレート制限 ----
test('レート制限: 窓内の上限超過を拒否し、窓が過ぎると回復する。未定義イベントは制限しない', () => {
  let t = 0
  const l = createEventLimiter({ buzz: { max: 2, windowMs: 1000 } }, () => t)
  assert.deepEqual([l.allow('buzz'), l.allow('buzz'), l.allow('buzz')], [true, true, false])
  t = 1000
  assert.equal(l.allow('buzz'), true)
  assert.equal(l.allow('unknown-event'), true)
})

// ---- ゲーム設定の検証(以前は null や未知のルール ID でサーバーが落ち得た) ----
test('設定: null / 配列でない / 未知ルールは null を返す(例外にならない)', () => {
  assert.equal(sanitizeSettings(null), null)
  assert.equal(sanitizeSettings(undefined), null)
  assert.equal(sanitizeSettings('x'), null)
  assert.equal(sanitizeSettings({ ruleId: 'no-such-rule' }), null)
})
test('設定: 範囲外の値は丸め、未知のフィールドは捨てる', () => {
  const s = sanitizeSettings({ ruleId: 'mon_rest', ruleParams: { m: 1e9, n: 'x', evil: 1 }, questionCount: -5, winnerCount: 999, loserCount: 2.7, isPublic: 'yes', questionSetId: 123, __proto__: { polluted: 1 } })!
  assert.equal(s.ruleId, 'mon_rest')
  assert.deepEqual(Object.keys(s.ruleParams).sort(), ['m', 'n'])
  assert.equal(s.ruleParams.m, 1000); assert.equal(s.ruleParams.n, 3) // n は数値でないので既定値
  assert.equal(s.questionCount, 1); assert.equal(s.winnerCount, 20); assert.equal(s.loserCount, 2)
  assert.equal(s.isPublic, false); assert.equal(s.questionSetId, null)
  assert.ok(!('polluted' in s))
})
test('設定: 正常値はそのまま通る', () => {
  const s = sanitizeSettings({ ruleId: 'mon', ruleParams: { m: 5, n: 2 }, questionCount: 30, winnerCount: 1, loserCount: 1, isPublic: true, questionSetId: 'abc' })!
  assert.deepEqual(s, { ruleId: 'mon', ruleParams: { m: 5, n: 2 }, questionCount: 30, winnerCount: 1, loserCount: 1, isPublic: true, questionSetId: 'abc' })
})

test('回帰ガード: disconnect 以外の socket.on は safe() 経由で登録される(例外でプロセスが落ちない)', async () => {
  const fs = await import('node:fs'); const path = await import('node:path')
  const src = fs.readFileSync(path.resolve(__dirname, '../server/socket/handlers.ts'), 'utf8')
  const bad = src.split('\n').filter(l => /^\s*socket\.on\('/.test(l) && !l.includes("socket.on('disconnect'") && !l.includes('safe('))
  assert.deepEqual(bad, [])
})
