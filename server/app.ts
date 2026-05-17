import express from 'express'
import rateLimit from 'express-rate-limit'
import passport from './auth/passport'
import { sessionMiddleware } from './lib/sessionMiddleware'
import authRouter from './auth/router'
import localAuthRouter from './auth/local'
import adminRouter from './routes/admin'
import questionSetsRouter from './routes/questionSets'
import recordsRouter from './routes/records'
import questionHistoryRouter from './routes/questionHistory'
import rankingRouter from './routes/ranking'
import followRouter from './routes/follow'
import roomsRouter from './routes/rooms'
import contactRouter from './routes/contact'
import messagesRouter from './routes/messages'
import notificationsRouter from './routes/notifications'
import searchRouter from './routes/search'
import questionsRouter from './routes/questions'
import reportsRouter from './routes/reports'
import cors from 'cors'
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
  app.use(cors({ origin: ['https://quiz.astro-root.com', 'http://localhost:5173'], credentials: true }))
  app.use(express.json())
  app.use(sessionMiddleware)
  app.use(passport.initialize())
  app.use(passport.session())

  app.use('/auth', authRouter)
  app.use('/auth', authLimiter, localAuthRouter)
  app.use('/api/questions', questionsRouter)
  app.use('/api/reports', reportsRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/question-sets', questionSetsRouter)
  app.use('/api/records', recordsRouter)
  app.use('/api/question-history', questionHistoryRouter)
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

  app.use('/avatars', express.static(path.join(process.cwd(), 'public/avatars')))
  return app
}
