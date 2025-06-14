import type { Config } from 'drizzle-kit';

export default {
  schema: './app/db/schema.ts',
  out: './drizzle', // マイグレーションファイルの出力先
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  } as const,
};
