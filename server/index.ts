import http from 'http'
import { createApp } from './app'
import { loadQuizData } from './game/quizData'
import { initSocketIO } from './socket'
import { Pool } from 'pg'

const PORT = parseInt(process.env.PORT ?? '3000', 10)

async function main() {
  // sessionテーブルをdb pushで消されても起動時に再作成
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid"    varchar      NOT NULL COLLATE "default",
      "sess"   json         NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
    )
  `).catch(() => {})
  await pool.query('CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")').catch(() => {})
  await pool.end()
  await loadQuizData()
  const app = createApp()
  const httpServer = http.createServer(app)
  initSocketIO(httpServer)
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] QuizSpark running on http://0.0.0.0:${PORT}`)
  })
}

main().catch(console.error)
