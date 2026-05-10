import express from 'express'
import questionsRouter from './routes/questions'
import path from 'path'

export function createApp() {
  const app = express()

  app.use(express.json())
  app.use('/api/questions', questionsRouter)

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist')
    app.use(express.static(distPath))
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  return app
}
