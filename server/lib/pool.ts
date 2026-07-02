import { Pool } from 'pg'
import fs from 'fs'

const caPath = process.env.DATABASE_CA_CERT_PATH ?? '/etc/secrets/supabase-ca.crt'
const caExists = fs.existsSync(caPath)
const caContent = caExists ? fs.readFileSync(caPath, 'utf8') : null

const ssl = process.env.NODE_ENV === 'production'
  ? (caExists && caContent ? { rejectUnauthorized: true, ca: caContent } : { rejectUnauthorized: true })
  : undefined

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: 10,
})
