import session from 'express-session'
import ConnectPgSimple from 'connect-pg-simple'
import { pool } from './pool'

const PgSession = ConnectPgSimple(session)

export const sessionMiddleware = session({
  store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET ?? 'quizspark-dev-secret',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 60 * 60 * 1000 },
})
