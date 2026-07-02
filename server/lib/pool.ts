import { Pool } from 'pg'
import fs from 'fs'

const caPath = process.env.DATABASE_CA_CERT_PATH ?? '/etc/secrets/supabase-ca.crt'
const caExists = fs.existsSync(caPath)
const caContent = caExists ? fs.readFileSync(caPath, 'utf8') : null

console.log('[TLS-DEBUG] caPath =', caPath)
console.log('[TLS-DEBUG] caExists =', caExists)
console.log('[TLS-DEBUG] caContent length =', caContent ? caContent.length : 0)
console.log('[TLS-DEBUG] caContent starts with BEGIN CERTIFICATE =', caContent ? caContent.trim().startsWith('-----BEGIN CERTIFICATE-----') : false)
console.log('[TLS-DEBUG] caContent ends with END CERTIFICATE =', caContent ? caContent.trim().endsWith('-----END CERTIFICATE-----') : false)

const ssl = process.env.NODE_ENV === 'production'
  ? (caExists && caContent ? { rejectUnauthorized: true, ca: caContent } : { rejectUnauthorized: true })
  : undefined

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: 10,
})
