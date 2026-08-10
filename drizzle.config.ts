import { defineConfig } from 'drizzle-kit'

try {
  process.loadEnvFile?.('.env.local')
} catch {}

if (!process.env.NEON_DATABASE_URL) {
  throw new Error('NEON_DATABASE_URL is required for drizzle-kit')
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL,
  },
  // Strict mode: warn on destructive changes (never DROP or rename in place — §3.2 rule 3)
  strict: true,
  verbose: true,
})
