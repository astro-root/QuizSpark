import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { RANK_BANDS, bandForRate, bandForLabel, bandRange } from '../src/lib/rank'
import { ICONS } from '../src/components/ui/iconPaths'

const SRC = path.resolve(__dirname, '../src')
const read = (f: string) => fs.readFileSync(path.join(SRC, f), 'utf8')
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u2600-\u27BF\u2B50\u23E9-\u23FF\u231A\u231B\u2190-\u2199\u25AA-\u25FE\u2139\u2122]/gu

test('ランク帯: 基準値・名称がサーバー(getRankLabel)の定義と一致する', () => {
  const server = fs.readFileSync(path.resolve(__dirname, '../server/routes/ranking.ts'), 'utf8')
  const found = [...server.matchAll(/rate >=\s*(\d+)\)\s*return\s*\{\s*label:\s*'([^']+)'/g)].map(m => ({ min: Number(m[1]), label: m[2] }))
  assert.equal(found.length, 5)
  for (const f of found) assert.equal(RANK_BANDS.find(b => b.label === f.label)?.min, f.min, f.label)
  assert.equal(RANK_BANDS[0].label, 'ブロンズ') // 最下位は条件なしで返る
  assert.equal(RANK_BANDS[0].min, 0)
})
test('ランク帯: 隙間・重複がなく、境界値が正しい帯に入る', () => {
  for (let i = 0; i < RANK_BANDS.length - 1; i++) assert.equal(RANK_BANDS[i].max! + 1, RANK_BANDS[i + 1].min)
  assert.equal(RANK_BANDS.at(-1)!.max, null)
  const cases: Array<[number, string]> = [[0, 'ブロンズ'], [599, 'ブロンズ'], [600, 'シルバー'], [899, 'シルバー'], [900, 'ゴールド'], [1199, 'ゴールド'], [1200, 'プラチナ'], [1499, 'プラチナ'], [1500, 'ダイヤ'], [1999, 'ダイヤ'], [2000, 'マスター'], [5000, 'マスター'], [-5, 'ブロンズ']]
  for (const [rate, label] of cases) assert.equal(bandForRate(rate).label, label, String(rate))
  assert.equal(bandForLabel('存在しない').label, 'ブロンズ')
  assert.equal(bandRange(RANK_BANDS[5]), '2000〜')
  for (const b of RANK_BANDS) assert.ok(b.icon in ICONS)
})

test('回帰ガード: useAuth() から存在しない authLoading を読んでいない(常に undefined になるバグ)', () => {
  const offenders: string[] = []
  const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(e.name)) {
    const s = fs.readFileSync(p, 'utf8')
    for (const m of s.matchAll(/const \{([^}]*)\}\s*=\s*useAuth\(\)/g)) if (/\bauthLoading\b/.test(m[1]) && !/loading:\s*authLoading/.test(m[1])) offenders.push(path.relative(SRC, p))
  } } }
  walk(SRC)
  assert.deepEqual(offenders, [])
  assert.match(read('context/AuthContext.tsx'), /loading: boolean/)
})

test('ホーム・ランキング・マイページ枠は絵文字を使わず、ログインは role=dialog・ラベル付き', () => {
  for (const f of ['pages/HomePage.tsx', 'pages/RankingPage.tsx', 'pages/ProfilePage.tsx', 'lib/rank.ts'])
    assert.equal([...read(f).matchAll(EMOJI)].length, 0, f)
  const home = read('pages/HomePage.tsx')
  assert.match(home, /role="dialog" aria-modal="true"/)
  assert.match(home, /autoComplete=\{authTab === 'login' \? 'current-password' : 'new-password'\}/)
  assert.match(home, /role="alert"/)
})
test('ランキングの行は、キーボードで操作できる button である', () => {
  assert.match(read('pages/RankingPage.tsx'), /<button className=\{`qr-row/)
})
