import { prisma } from '../lib/prisma'
import type { Question } from '../../src/types'

let cache: Question[] = []

export async function loadQuizData(): Promise<void> {
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
