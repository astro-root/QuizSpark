// アイコンの定義(24x24・線画)。React に依存しない純粋なデータなので、テストで網羅性を検証できる。
// 絵文字は OS ごとに見た目が違い、色や大きさも制御できないため、すべてここの SVG に置き換える。
export type IconNode =
  | readonly ['path', string]
  | readonly ['circle', number, number, number]
  | readonly ['rect', number, number, number, number, number]

const p = (d: string): IconNode => ['path', d]
const c = (cx: number, cy: number, r: number): IconNode => ['circle', cx, cy, r]
const r = (x: number, y: number, w: number, h: number, rx: number): IconNode => ['rect', x, y, w, h, rx]
const dot = (x: number, y: number) => p(`M${x} ${y}h.01`)

export const ICONS = {
  zap: [p('M13 2 3 14h9l-1 8 10-12h-9z')],
  check: [p('M20 6 9 17l-5-5')],
  x: [p('M18 6 6 18M6 6l12 12')],
  circle: [c(12, 12, 8)],
  'arrow-left': [p('M19 12H5M12 19l-7-7 7-7')],
  'arrow-right': [p('M5 12h14M12 5l7 7-7 7')],
  'chevron-up': [p('m18 15-6-6-6 6')],
  'chevron-down': [p('m6 9 6 6 6-6')],
  'chevron-left': [p('m15 18-6-6 6-6')],
  'chevron-right': [p('m9 18 6-6-6-6')],
  external: [p('M7 17 17 7M8 7h9v9')],
  play: [p('M6 4v16l14-8z')],
  skip: [p('M5 4v16l10-8zM19 5v14')],
  message: [p('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z')],
  trophy: [p('M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3')],
  medal: [c(12, 15, 6), p('M8.5 9.5 6 3h4l2 4 2-4h4l-2.5 6.5')],
  crown: [p('m2 18 2-11 5 5 3-7 3 7 5-5 2 11zM3 21h18')],
  flame: [p('M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-4-8 0 4-4 6-4 12 0 4 3 7 7 7z')],
  sparkles: [p('m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z')],
  gem: [p('M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l-2 6 5 12 5-12-2-6')],
  megaphone: [p('m3 11 18-6v14L3 13zM7 14l1 6h3l-1-5')],
  skull: [c(9, 12, 1), c(15, 12, 1), p('M8 20v2h8v-2M12.5 17l-.5-1-.5 1M16 20a2 2 0 0 0 1.6-3.2A8 8 0 1 0 6.4 16.8 2 2 0 0 0 8 20')],
  flag: [p('M4 22V4M4 4h14l-2 4 2 4H4')],
  user: [c(12, 8, 4), p('M4 21a8 8 0 0 1 16 0')],
  users: [c(9, 8, 3.5), p('M2 21a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 21a7 7 0 0 0-4-6.3')],
  swords: [p('M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2')],
  alert: [p('M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01')],
  gamepad: [p('M6 12h4M8 10v4M15 13h.01M18 11h.01M17.3 5H6.7a4 4 0 0 0-3.9 3.1l-1.6 7A3 3 0 0 0 4.1 19c1 0 1.9-.5 2.4-1.3L8 15h8l1.5 2.7c.5.8 1.4 1.3 2.4 1.3a3 3 0 0 0 2.9-3.9l-1.6-7A4 4 0 0 0 17.3 5z')],
  hourglass: [p('M6 2h12M6 22h12M7 2c0 5 3 6 5 10-2 4-5 5-5 10M17 2c0 5-3 6-5 10 2 4 5 5 5 10')],
  clock: [c(12, 12, 9), p('M12 7v5l3 2')],
  'thumbs-up': [p('M7 10v11H3V10zM7 10l4-8a3 3 0 0 1 3 3v4h6a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2H7')],
  smile: [c(12, 12, 10), p('M8 14s1.5 2 4 2 4-2 4-2'), dot(9, 9), dot(15, 9)],
  surprised: [c(12, 12, 10), c(12, 16, 2), dot(9, 9), dot(15, 9)],
  meh: [c(12, 12, 10), p('M8 15h8'), dot(9, 9), dot(15, 9)],
  sad: [c(12, 12, 10), p('M16 16s-1.5-2-4-2-4 2-4 2'), dot(9, 9), dot(15, 9)],
  dumbbell: [p('M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11')],
  clipboard: [r(8, 2, 8, 4, 1), p('M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12h6M9 16h4')],
  pencil: [p('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z')],
  camera: [p('M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z'), c(12, 13, 3)],
  trash: [p('M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6')],
  help: [c(12, 12, 10), p('M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01')],
  mail: [r(2, 4, 20, 16, 2), p('m22 7-10 6L2 7')],
  inbox: [p('M22 12h-6l-2 3h-4l-2-3H2M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z')],
  send: [p('m22 2-7 20-4-9-9-4zM22 2 11 13')],
  download: [p('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3')],
  upload: [p('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12')],
  settings: [c(12, 12, 3), p('M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z')],
  star: [p('m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z')],
  lock: [r(3, 11, 18, 11, 2), p('M7 11V7a5 5 0 0 1 10 0v4')],
  bell: [p('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4')],
  info: [c(12, 12, 10), p('M12 16v-4M12 8h.01')],
  dice: [r(3, 3, 18, 18, 3), p('M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01')],
  home: [p('m3 11 9-8 9 8v10H3z')],
  key: [c(8, 15, 4), p('m11 12 9-9M16 7l3 3')],
  search: [c(11, 11, 7), p('m21 21-4-4')],
  plus: [p('M12 5v14M5 12h14')],
  sun: [c(12, 12, 4), p('M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4')],
  moon: [p('M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z')],
} as const satisfies Record<string, readonly IconNode[]>

export type IconName = keyof typeof ICONS

/**
 * 既存コードの絵文字・記号 → アイコンの対応表(\uFE0F 除去後のキー)。
 * 各ページを移行する際はこの表に従って置き換える。tests/icons.test.ts が、ソース内の絵文字がすべて
 * この表に載っていること、表の行き先が存在することを保証する。
 */
export const EMOJI_TO_ICON: Record<string, IconName> = {
  '⚡': 'zap', '✓': 'check', '✅': 'check', '❌': 'x', '✕': 'x',
  '◯': 'circle', '○': 'circle', '⚪': 'circle',
  '🥇': 'medal', '🥈': 'medal', '🥉': 'medal', '🏆': 'trophy', '👑': 'crown',
  '→': 'arrow-right', '←': 'arrow-left', '↗': 'external', '▲': 'chevron-up', '▼': 'chevron-down',
  '▶': 'play', '⏭': 'skip',
  '💬': 'message', '🔥': 'flame', '🎉': 'sparkles', '👏': 'sparkles', '💎': 'gem', '💠': 'gem',
  '📢': 'megaphone', '💀': 'skull', '🚩': 'flag', '👤': 'user', '⚔': 'swords', '⚠': 'alert',
  '🎮': 'gamepad', '⏳': 'hourglass', '👍': 'thumbs-up', '💪': 'dumbbell',
  '😄': 'smile', '😲': 'surprised', '🤔': 'meh', '😭': 'sad',
  '📋': 'clipboard', '📝': 'pencil', '✏': 'pencil', '📷': 'camera', '🗑': 'trash', '❓': 'help',
  '📩': 'mail', '📬': 'inbox', '📤': 'upload', '📥': 'download', '⚙': 'settings', '⭐': 'star',
  '🔒': 'lock', '🔔': 'bell', 'ℹ': 'info', '🎲': 'dice', '🏠': 'home', '🔑': 'key',
}
