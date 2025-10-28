import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
} satisfies Config;
