import { Pool } from 'pg'
import fs from 'fs'

const caPath = process.env.DATABASE_CA_CERT_PATH ?? '/etc/secrets/supabase-ca.crt'
const caExists = fs.existsSync(caPath)

const ssl = process.env.NODE_ENV === 'production'
  ? (caExists ? { rejectUnauthorized: true, ca: fs.readFileSync(caPath, 'utf8') } : { rejectUnauthorized: true })
  : undefined

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: 10,
})
