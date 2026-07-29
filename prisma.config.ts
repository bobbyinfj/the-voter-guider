import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// `prisma generate` (run in CI without a real DB) doesn't need a working
// connection string, just a defined one - the env() helper throws if
// DATABASE_URL is unset at all, so fall back to a placeholder here.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://placeholder/placeholder',
  },
})
