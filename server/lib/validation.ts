// 入力検証(純粋関数)。ルートはここを通した値だけを DB へ渡す。

export const GENRES = ['文学','歴史','地理','公民','自然科学','言葉','芸能','スポーツ','漫アゲ','音楽','生活','ノンジャンル'] as const
export const MAX_TEXT = 500
export const MAX_ANSWER = 100
export const MAX_ALTERNATIVE_ANSWERS = 10

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

export interface QuestionInput {
  text: string
  answer: string
  answers: string[]
  displayAnswer: string
  genre: string
}

function str(v: unknown): string | null {
  return typeof v === 'string' ? v.trim() : null
}

/** 別解リスト。answer を先頭に含め、重複を除去する。 */
export function parseAnswers(raw: unknown, answer: string): Parsed<string[]> {
  if (raw === undefined || raw === null) return { ok: true, value: [answer] }
  if (!Array.isArray(raw)) return { ok: false, error: '別解の形式が不正です' }
  if (raw.length > MAX_ALTERNATIVE_ANSWERS) return { ok: false, error: `別解は${MAX_ALTERNATIVE_ANSWERS}件までです` }
  const out = [answer]
  for (const item of raw) {
    const s = str(item)
    if (s === null) return { ok: false, error: '別解は文字列で指定してください' }
    if (s === '') continue
    if (s.length > MAX_ANSWER) return { ok: false, error: `別解は${MAX_ANSWER}文字以内です` }
    if (!out.includes(s)) out.push(s)
  }
  return { ok: true, value: out }
}

export function validateQuestionInput(body: unknown): Parsed<QuestionInput> {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const text = str(b.text)
  if (!text || text.length > MAX_TEXT) return { ok: false, error: `問題文は1〜${MAX_TEXT}文字で入力してください` }
  const answer = str(b.answer)
  if (!answer || answer.length > MAX_ANSWER) return { ok: false, error: `答えは1〜${MAX_ANSWER}文字で入力してください` }
  let displayAnswer = answer
  if (b.displayAnswer !== undefined && b.displayAnswer !== null) {
    const d = str(b.displayAnswer)
    if (d === null) return { ok: false, error: '表示用の答えの形式が不正です' }
    if (d.length > MAX_ANSWER) return { ok: false, error: `表示用の答えは${MAX_ANSWER}文字以内です` }
    if (d) displayAnswer = d
  }
  const answers = parseAnswers(b.answers, answer)
  if (!answers.ok) return answers
  const g = str(b.genre)
  const genre = g && (GENRES as readonly string[]).includes(g) ? g : 'ノンジャンル'
  return { ok: true, value: { text, answer, answers: answers.value, displayAnswer, genre } }
}

/**
 * ユーザー投稿問題の保存データ。
 * 承認制(README 記載)のため、リクエストの内容に関わらず approved は常に false。
 */
export function buildSubmittedQuestionData(input: QuestionInput, authorId: string) {
  return { ...input, authorId, approved: false as const }
}

export function validateReportInput(body: unknown): Parsed<{ questionId: number; reason: string }> {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const questionId = Number(b.questionId)
  if (!Number.isInteger(questionId) || questionId <= 0) return { ok: false, error: 'invalid' }
  const reason = str(b.reason)
  if (!reason || reason.length > 500) return { ok: false, error: 'invalid' }
  return { ok: true, value: { questionId, reason } }
}

export function validateAnnouncementActive(body: unknown): Parsed<boolean> {
  const v = (body as Record<string, unknown> | null | undefined)?.active
  return typeof v === 'boolean' ? { ok: true, value: v } : { ok: false, error: 'active は true/false で指定してください' }
}

const NOTIFICATION_TYPES = ['admin', 'info'] as const
export function validateAdminNotification(body: unknown): Parsed<{ userIds: 'all' | string[]; title: string; body: string; type: string }> {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const title = str(b.title), text = str(b.body)
  if (!title || !text) return { ok: false, error: '必須項目不足' }
  if (title.length > 100 || text.length > 1000) return { ok: false, error: '入力が長すぎます' }
  let userIds: 'all' | string[]
  if (b.userIds === 'all') userIds = 'all'
  else if (Array.isArray(b.userIds) && b.userIds.length <= 1000 && b.userIds.every(x => typeof x === 'string' && x.length > 0 && x.length <= 64)) userIds = b.userIds as string[]
  else return { ok: false, error: '送信先の指定が不正です' }
  const type = typeof b.type === 'string' && (NOTIFICATION_TYPES as readonly string[]).includes(b.type) ? b.type : 'admin'
  return { ok: true, value: { userIds, title, body: text, type } }
}
