import type { Question } from '../../src/types'

let cache: Question[] = []

export async function loadQuizData(): Promise<void> {
  // prisma は遅延読み込み(ゲームロジックのテストが DB 依存を引き込まないようにするため)
  const { prisma } = await import('../lib/prisma')
  const rows = await prisma.question.findMany({ where: { approved: true } })
  cache = rows.map(r => ({
    id: r.id,
    text: r.text,
    answer: r.answer,
    answers: r.answers,
    displayAnswer: r.displayAnswer,
    genre: r.genre,
  }))
  console.log(`[QuizData] ${cache.length}問をDBから読み込みました`)
}

export function getQuizData(): Question[] {
  return cache
}

export function startAutoReload(intervalMs = 5 * 60 * 1000): void {
  setInterval(async () => {
    await loadQuizData()
  }, intervalMs)
  console.log(`[QuizData] ${intervalMs / 1000}秒おきに自動リロードを開始`)
}
