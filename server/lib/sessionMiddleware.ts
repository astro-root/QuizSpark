import session from 'express-session'
import ConnectPgSimple from 'connect-pg-simple'
import { pool } from './pool'

const PgSession = ConnectPgSimple(session)

const secret = process.env.SESSION_SECRET
if (!secret) {
  throw new Error('SESSION_SECRET is not set')
}

export const sessionMiddleware = session({
  store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 },
})
