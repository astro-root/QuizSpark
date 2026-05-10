import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL!

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  migrate: {
    adapter: async () => {
      const { Pool } = await import('pg')
      const pool = new Pool({ connectionString })
      return new PrismaPg(pool)
    },
  },
})
