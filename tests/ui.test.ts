import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { EMOJI_TO_ICON, ICONS } from '../src/components/ui/iconPaths'

const SRC = path.resolve(__dirname, '../src')
// 絵文字・絵文字的な記号(装飾として使われているもの)。UI を SVG に統一するための検査用。
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u2600-\u27BF\u2B50\u23E9-\u23FF\u231A\u231B\u2190-\u2199\u25AA-\u25FE\u2139\u2122]\uFE0F?/gu

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(tsx?|css)$/.test(e.name)) out.push(p)
  }
  return out
}
function emojiInSource(): Array<{ file: string; glyph: string }> {
  const found: Array<{ file: string; glyph: string }> = []
  for (const f of walk(SRC)) {
    // 対応表そのもの(移行用の辞書)は検査対象外
    if (f.endsWith(path.join('ui', 'iconPaths.ts'))) continue
    for (const m of fs.readFileSync(f, 'utf8').matchAll(EMOJI)) found.push({ file: path.relative(SRC, f), glyph: m[0].replace(/\uFE0F/g, '') })
  }
  return found
}

test('アイコン定義: すべて空でなく、SVG パスに使える文字だけで書かれている', () => {
  for (const [name, nodes] of Object.entries(ICONS)) {
    assert.ok(nodes.length > 0, `${name} が空`)
    for (const n of nodes) if (n[0] === 'path') assert.match(n[1], /^[MmLlHhVvCcSsQqTtAaZz0-9 .,\-]+$/, `${name} のパスに不正な文字`)
  }
})

test('絵文字の対応表: 行き先のアイコンがすべて存在する', () => {
  for (const [glyph, icon] of Object.entries(EMOJI_TO_ICON)) assert.ok(icon in ICONS, `${glyph} → ${icon} が未定義`)
})

test('移行の網羅性: ソース内の絵文字がすべて対応表に載っている(置き換え先が決まっている)', () => {
  const missing = [...new Set(emojiInSource().map(e => e.glyph).filter(g => !(g in EMOJI_TO_ICON)))]
  assert.deepEqual(missing, [], '対応表に無い絵文字: ' + missing.join(' '))
})

// ラチェット: 絵文字は増やさない。ページを移行するたびに、この値を下げる(最終的に 0)。
const EMOJI_BASELINE = Number(process.env.EMOJI_BASELINE ?? 0) || 167
test(`絵文字の残数は ${EMOJI_BASELINE} 以下(移行が進むたびに下げる)`, () => {
  const found = emojiInSource()
  assert.ok(found.length <= EMOJI_BASELINE, `絵文字が増えています: ${found.length} > ${EMOJI_BASELINE}`)
})

test('共通ナビは絵文字を使わず、現在地を aria-current で示す', () => {
  for (const f of ['BottomNav.tsx', 'PCNav.tsx', 'AppHeader.tsx']) {
    const s = fs.readFileSync(path.join(SRC, 'components', f), 'utf8')
    assert.equal([...s.matchAll(EMOJI)].length, 0, `${f} に絵文字`)
  }
  for (const f of ['BottomNav.tsx', 'PCNav.tsx']) assert.match(fs.readFileSync(path.join(SRC, 'components', f), 'utf8'), /aria-current/)
})

test('アイコンだけのボタンは読み上げ用の名前を必須にしている(IconButton の型)', () => {
  const s = fs.readFileSync(path.join(SRC, 'components/ui/index.tsx'), 'utf8')
  assert.match(s, /label: string/)
  assert.match(s, /aria-label=\{label\}/)
})
