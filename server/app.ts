import express from 'express'
import rateLimit from 'express-rate-limit'
import passport from './auth/passport'
import { sessionMiddleware } from './lib/sessionMiddleware'
import authRouter from './auth/router'
import localAuthRouter from './auth/local'
import adminRouter from './routes/admin'
import questionSetsRouter from './routes/questionSets'
import recordsRouter from './routes/records'
import rankingRouter from './routes/ranking'
import followRouter from './routes/follow'
import roomsRouter from './routes/rooms'
import contactRouter from './routes/contact'
import messagesRouter from './routes/messages'
import notificationsRouter from './routes/notifications'
import searchRouter from './routes/search'
import questionsRouter from './routes/questions'
import path from 'path'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: '試行回数が多すぎます。15分後に再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false,
})

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.use(express.json())
  app.use(sessionMiddleware)
  app.use(passport.initialize())
  app.use(passport.session())

  app.use('/auth', authRouter)
  app.use('/auth', authLimiter, localAuthRouter)
  app.use('/api/questions', questionsRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/question-sets', questionSetsRouter)
  app.use('/api/records', recordsRouter)
  app.use('/api/ranking', rankingRouter)
  app.use('/api/follow', followRouter)
  app.use('/api/rooms', roomsRouter)
  app.use('/api/contact', contactRouter)
  app.use('/api/messages', messagesRouter)
  app.use('/api/notifications', notificationsRouter)
  app.use('/api/search', searchRouter)
  app.get('/api/announcements', async (_req, res) => {
    const { prisma } = await import('./lib/prisma')
    res.json(await prisma.announcement.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } }))
  })

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist')
    app.use(express.static(distPath))
    app.use('/avatars', express.static(path.join(process.cwd(), 'public/avatars')))
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }
  return app
}
