import type { IconName } from '../components/ui/iconPaths'

/**
 * ランク帯の表示用定義。基準値は server/routes/ranking.ts の getRankLabel が正で、
 * tests/pages.test.ts が両者の一致を検査する。
 */
export interface RankBand { label: string; min: number; max: number | null; color: string; icon: IconName }

export const RANK_BANDS: readonly RankBand[] = [
  { label: 'ブロンズ', min: 0,    max: 599,  color: '#b45309', icon: 'medal' },
  { label: 'シルバー', min: 600,  max: 899,  color: '#cbd5e1', icon: 'medal' },
  { label: 'ゴールド', min: 900,  max: 1199, color: '#f59e0b', icon: 'medal' },
  { label: 'プラチナ', min: 1200, max: 1499, color: '#94a3b8', icon: 'circle' },
  { label: 'ダイヤ',   min: 1500, max: 1999, color: '#38bdf8', icon: 'gem' },
  { label: 'マスター', min: 2000, max: null, color: '#a855f7', icon: 'crown' },
]

export const bandRange = (b: RankBand) => (b.max == null ? `${b.min}〜` : `${b.min}〜${b.max}`)

export function bandForRate(rate: number): RankBand {
  for (let i = RANK_BANDS.length - 1; i >= 0; i--) if (rate >= RANK_BANDS[i].min) return RANK_BANDS[i]
  return RANK_BANDS[0]
}

export function bandForLabel(label: string): RankBand {
  return RANK_BANDS.find(b => b.label === label) ?? RANK_BANDS[0]
}
