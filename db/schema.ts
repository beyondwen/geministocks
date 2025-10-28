// db/schema.ts
import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  serial,
  bigserial,
  jsonb,
  date,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ===== Users 表 =====
export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(), // Clerk User ID
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),

  // 迁移标记
  migratedFromLocal: boolean('migrated_from_local').default(false).notNull(),
  migrationDate: timestamp('migration_date'),

  // 统计字段
  totalAnalysesCount: integer('total_analyses_count').default(0).notNull(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
  createdAtIdx: index('idx_users_created_at').on(table.createdAt),
}));

// ===== Credits 表 =====
export const credits = pgTable('credits', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  balance: integer('balance').default(0).notNull(),

  // 每日免费额度
  dailyFreeCredits: integer('daily_free_credits').default(5).notNull(),
  lastFreeCreditDate: date('last_free_credit_date'),
  dailyFreeUsed: integer('daily_free_used').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex('idx_credits_user_id').on(table.userId),
}));

// ===== Credit Transactions 表 =====
export const creditTransactions = pgTable('credit_transactions', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  type: varchar('type', { length: 20 }).notNull(), // 'purchase', 'daily_free', 'analysis_use', 'refund'
  amount: integer('amount').notNull(), // 正数=增加，负数=减少
  balanceAfter: integer('balance_after').notNull(),

  // 关联信息
  relatedAnalysisId: bigserial('related_analysis_id', { mode: 'number' }),
  stripePaymentId: varchar('stripe_payment_id', { length: 255 }),

  description: text('description'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_tx_user_id').on(table.userId),
  createdAtIdx: index('idx_tx_created_at').on(table.createdAt),
  typeIdx: index('idx_tx_type').on(table.type),
}));

// ===== Analyses 表 =====
export const analyses = pgTable('analyses', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  analysisType: varchar('analysis_type', { length: 20 }).notNull(), // 'topic', 'stock', 'positional_warfare'
  inputQuery: text('input_query').notNull(),

  // AI 模型信息
  model: varchar('model', { length: 50 }).notNull(), // 'deepseek', 'gemini', 'claude'
  creditCost: integer('credit_cost').notNull(),

  // 分析结果（存储完整的 JSON）
  result: jsonb('result').notNull().$type<Record<string, any>>(),

  // 元数据
  executionTimeMs: integer('execution_time_ms'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_analyses_user_id').on(table.userId),
  analysisTypeIdx: index('idx_analyses_type').on(table.analysisType),
  createdAtIdx: index('idx_analyses_created_at').on(table.createdAt),
  modelIdx: index('idx_analyses_model').on(table.model),
}));

// ===== User Settings 表 =====
export const userSettings = pgTable('user_settings', {
  userId: varchar('user_id', { length: 255 })
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),

  preferredLanguage: varchar('preferred_language', { length: 10 }).default('zh').notNull(),
  preferredModel: varchar('preferred_model', { length: 50 }).default('deepseek').notNull(),

  // 通知设置
  emailNotifications: boolean('email_notifications').default(true).notNull(),

  // UI 设置
  theme: varchar('theme', { length: 20 }).default('light').notNull(),

  // 其他偏好
  preferences: jsonb('preferences').$type<Record<string, any>>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===== 关联关系 =====
export const usersRelations = relations(users, ({ one, many }) => ({
  credits: one(credits, {
    fields: [users.id],
    references: [credits.userId],
  }),
  analyses: many(analyses),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  transactions: many(creditTransactions),
}));

export const creditsRelations = relations(credits, ({ one }) => ({
  user: one(users, {
    fields: [credits.userId],
    references: [users.id],
  }),
}));

export const analysesRelations = relations(analyses, ({ one }) => ({
  user: one(users, {
    fields: [analyses.userId],
    references: [users.id],
  }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, {
    fields: [creditTransactions.userId],
    references: [users.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [userSettings.userId],
  }),
}));
