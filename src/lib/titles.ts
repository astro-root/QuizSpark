export interface TitleDef {
  id: string
  label: string
  description: string
  category: 'rank' | 'achievement' | 'fun'
  // 解放条件（フロント側で判定）
  unlock: (stats: { rate: number; total: number; wins: number; correct: number }) => boolean
}

export const TITLES: TitleDef[] = [
  // 段位連動
  { id: 'newcomer',   label: '新米クイズマン',     description: '登録したばかり',                    category: 'rank',        unlock: () => true },
  { id: 'bronze',     label: '駆け出しの挑戦者',   description: 'ブロンズ到達',                      category: 'rank',        unlock: s => s.rate >= 0 },
  { id: 'silver',     label: '早押しの使い手',      description: 'シルバー到達（600pt）',             category: 'rank',        unlock: s => s.rate >= 600 },
  { id: 'gold',       label: '解答席の猛者',        description: 'ゴールド到達（900pt）',             category: 'rank',        unlock: s => s.rate >= 900 },
  { id: 'platinum',   label: '知識の求道者',        description: 'プラチナ到達（1200pt）',            category: 'rank',        unlock: s => s.rate >= 1200 },
  { id: 'diamond',    label: '早押し界の賢将',      description: 'ダイヤ到達（1500pt）',              category: 'rank',        unlock: s => s.rate >= 1500 },
  { id: 'master',     label: 'クイズの覇者',        description: 'マスター到達（2000pt）',            category: 'rank',        unlock: s => s.rate >= 2000 },
  // 実績系
  { id: 'battle10',   label: '初陣',                description: '10戦以上こなした',                  category: 'achievement', unlock: s => s.total >= 10 },
  { id: 'battle50',   label: '歴戦の強者',          description: '50戦以上こなした',                  category: 'achievement', unlock: s => s.total >= 50 },
  { id: 'battle100',  label: '百戦錬磨',            description: '100戦以上こなした',                 category: 'achievement', unlock: s => s.total >= 100 },
  { id: 'win10',      label: '勝利の味を知る者',    description: '10勝以上',                          category: 'achievement', unlock: s => s.wins >= 10 },
  { id: 'win50',      label: '常勝将軍',            description: '50勝以上',                          category: 'achievement', unlock: s => s.wins >= 50 },
  { id: 'correct100', label: '百問百答',            description: '累計正解100問以上',                 category: 'achievement', unlock: s => s.correct >= 100 },
  { id: 'correct500', label: '解答の鬼',            description: '累計正解500問以上',                 category: 'achievement', unlock: s => s.correct >= 500 },
  // ネタ系
  { id: 'fun1',       label: 'ただのクイズ好き',    description: '特に理由はない',                    category: 'fun',         unlock: () => true },
  { id: 'fun2',       label: '押し間違え常習犯',    description: '誰でも選べる称号',                  category: 'fun',         unlock: () => true },
  { id: 'fun3',       label: '早押し研究家',        description: '誰でも選べる称号',                  category: 'fun',         unlock: () => true },
  { id: 'fun4',       label: 'なんとなく参加勢',    description: '誰でも選べる称号',                  category: 'fun',         unlock: () => true },
]

export function getUnlockedTitles(stats: { rate: number; total: number; wins: number; correct: number }) {
  return TITLES.filter(t => t.unlock(stats))
}

export function getTitleById(id: string | null | undefined) {
  return TITLES.find(t => t.id === id) ?? TITLES[0]
}
