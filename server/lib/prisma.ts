import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { pool } from './pool'

const adapter = new PrismaPg(pool)
export const prisma = new PrismaClient({ adapter } as any)

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
