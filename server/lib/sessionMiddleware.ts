import session from 'express-session'
import ConnectPgSimple from 'connect-pg-simple'
import { pool } from './pool'

const PgSession = ConnectPgSimple(session)

const secret = process.env.SESSION_SECRET
if (!secret) {
  throw new Error('SESSION_SECRET is not set')
}

// 既定: 本番は別オリジンのフロントと Cookie を共有するため 'none'。
// フロントと API が同一オリジンになったら COOKIE_SAMESITE=lax にする。
const SAMESITES = ['lax', 'strict', 'none'] as const
type SameSite = typeof SAMESITES[number]
const envSameSite = (process.env.COOKIE_SAMESITE ?? '').toLowerCase()
const sameSite: SameSite = (SAMESITES as readonly string[]).includes(envSameSite)
  ? (envSameSite as SameSite)
  : (process.env.NODE_ENV === 'production' ? 'none' : 'lax')
if (sameSite === 'none' && process.env.NODE_ENV !== 'production') {
  console.warn('[session] SameSite=None requires Secure cookies; it will not work over plain http')
}

export const sessionMiddleware = session({
  store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite, maxAge: 30 * 24 * 60 * 60 * 1000 },
})
