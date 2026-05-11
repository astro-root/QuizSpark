import session from 'express-session'
import ConnectPgSimple from 'connect-pg-simple'
import { Pool } from 'pg'

const PgSession = ConnectPgSimple(session)
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

// db push で session テーブルが消される問題への対策：起動時に必ず作成
pool.query(`
  CREATE TABLE IF NOT EXISTS "session" (
    "sid"    varchar      NOT NULL COLLATE "default",
    "sess"   json         NOT NULL,
    "expire" timestamp(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
  )
`).then(() =>
  pool.query('CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")')
).catch(e => console.error('[Session] table init failed:', e))

export const sessionMiddleware = session({
  store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET ?? 'quizspark-dev-secret',
  resave: true,
  saveUninitialized: false,
  rolling: true,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 60 * 60 * 1000 },
})
