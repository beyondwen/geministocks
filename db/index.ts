// db/index.ts
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// 配置 Neon
neonConfig.fetchConnectionCache = true;

// 获取数据库 URL
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

// 创建连接
const sql = neon(databaseUrl);

// 创建 Drizzle 实例
export const db = drizzle(sql, { schema });

// 导出 schema
export * from './schema';
