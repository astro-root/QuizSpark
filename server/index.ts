import http from 'http'
import { createApp } from './app'
import { loadQuizData } from './game/quizData'
import { initSocketIO } from './socket'

const PORT = parseInt(process.env.PORT ?? '3000', 10)

async function main() {
  await loadQuizData()
  const app = createApp()
  const httpServer = http.createServer(app)
  initSocketIO(httpServer)
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] QuizSpark running on http://0.0.0.0:${PORT}`)
  })
}

main().catch(console.error)
