import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

interface Row {
  text: string
  answer: string
  answers: string
  displayAnswer: string
  genre: string
}

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error('使い方: npx ts-node prisma/import-csv.ts <csvファイルのパス>')
    process.exit(1)
  }

  const content = readFileSync(file, 'utf-8')
  const records = parse(content, { columns: true, skip_empty_lines: true }) as Row[]

  let success = 0
  let skip = 0

  for (const row of records) {
    const answers = row.answers ? row.answers.split('|').map((s) => s.trim()).filter(Boolean) : []
    try {
      await prisma.question.create({
        data: {
          text: row.text.trim(),
          answer: row.answer.trim(),
          answers,
          displayAnswer: row.displayAnswer.trim(),
          genre: row.genre?.trim() || 'ノンジャンル',
          approved: true,
        }
      })
      success++
    } catch (e) {
      console.error('スキップ:', row.text, e)
      skip++
    }
  }

  console.log(`完了: ${success}件追加, ${skip}件スキップ`)
}

main().finally(async () => {
  await prisma.$disconnect()
  await pool.end()
})
