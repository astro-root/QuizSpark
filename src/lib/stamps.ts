import type { IconName } from '../components/ui/iconPaths'

/** スタンプ。絵文字そのものではなく ID を送受信する(クライアントとサーバーで共有する唯一の定義)。 */
export const STAMPS = [
  { id: 'thumbs-up', icon: 'thumbs-up', label: 'いいね' },
  { id: 'smile',     icon: 'smile',     label: '笑顔' },
  { id: 'flame',     icon: 'flame',     label: '燃えてる' },
  { id: 'dumbbell',  icon: 'dumbbell',  label: '気合' },
  { id: 'surprised', icon: 'surprised', label: 'びっくり' },
  { id: 'meh',       icon: 'meh',       label: 'うーん' },
  { id: 'sad',       icon: 'sad',       label: '泣き' },
  { id: 'sparkles',  icon: 'sparkles',  label: 'おめでとう' },
] as const satisfies ReadonlyArray<{ id: string; icon: IconName; label: string }>

/** 旧バージョンのクライアントが送る絵文字(デプロイの時間差の間も表示できるように) */
const LEGACY: Record<string, (typeof STAMPS)[number]['id']> = {
  '👍': 'thumbs-up', '👏': 'smile', '🔥': 'flame', '💪': 'dumbbell',
  '😲': 'surprised', '🤔': 'meh', '😭': 'sad', '🎉': 'sparkles',
}

export function resolveStamp(raw: unknown): (typeof STAMPS)[number] | null {
  if (typeof raw !== 'string' || raw.length > 16) return null
  const id = LEGACY[raw] ?? raw
  return STAMPS.find(s => s.id === id) ?? null
}

/** サーバー側の入力検証用。許可したスタンプ(旧絵文字を含む)だけ中継する。 */
export const isValidStamp = (raw: unknown): raw is string => resolveStamp(raw) !== null
