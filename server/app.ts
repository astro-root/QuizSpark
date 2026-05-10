import express from 'express'
import session from 'express-session'
import ConnectPgSimple from 'connect-pg-simple'
import { Pool } from 'pg'
import passport from './auth/passport'
import authRouter from './auth/router'
import localAuthRouter from './auth/local'
import adminRouter from './routes/admin'
import questionSetsRouter from './routes/questionSets'
import recordsRouter from './routes/records'
import questionsRouter from './routes/questions'
import path from 'path'

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.use(express.json())

  // Session
  const PgSession = ConnectPgSimple(session)
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  app.use(session({
    store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET ?? 'quizspark-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 60 * 60 * 1000 },
  }))

  app.use(passport.initialize())
  app.use(passport.session())

  app.use('/auth', authRouter)
  app.use('/auth', localAuthRouter)
  app.use('/api/questions', questionsRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/question-sets', questionSetsRouter)
  app.use('/api/records', recordsRouter)
  app.get('/api/announcements', async (_req, res) => { const { prisma } = await import('./lib/prisma'); res.json(await prisma.announcement.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } })) })

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist')
    app.use(express.static(distPath))
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }
  return app
}
