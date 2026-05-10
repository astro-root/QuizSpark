import session from 'express-session'
import ConnectPgSimple from 'connect-pg-simple'
import { Pool } from 'pg'

const PgSession = ConnectPgSimple(session)
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

export const sessionMiddleware = session({
  store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET ?? 'quizspark-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 60 * 60 * 1000 },
})
