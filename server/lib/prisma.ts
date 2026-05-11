import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter } as any)

// Express User型を拡張
declare global {
  namespace Express {
    interface User {
      id: string
      name: string
      email?: string | null
      avatarUrl?: string | null
      isAdmin?: boolean
      bio?: string | null
      username?: string | null
    }
  }
}
