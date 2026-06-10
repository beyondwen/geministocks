/**
 * 订阅服务
 * 处理用户订阅、计划管理、积分发放等核心业务逻辑
 */

import { query } from './database';
import { grantCredits } from './authService';

// 定义订阅计划类型
export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: 'lite' | 'pro' | 'premium';
  description: string;
  priceCents: number;
  billingCycle: 'monthly';
  stripePriceId?: string;
  analysisLimitPerMonth?: number;
  monthlyBonusCredits: number;
  unlockPremiumModels: boolean;
  priorityQueue: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface UserSubscription {
  id: number;
  userId: string;
  planId: number;
  plan?: SubscriptionPlan;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  status: 'active' | 'canceled' | 'paused' | 'past_due';
  startedAt: string;
  renewsAt: string;
  canceledAt?: string;
  currentMonthAnalyses: number;
  currentMonthResetAt?: string;
  autoRenew: boolean;
}

export interface SubscriptionTransaction {
  id: number;
  subscriptionId: number;
  stripeInvoiceId?: string;
  stripeChargeId?: string;
  amountCents: number;
  status: 'pending' | 'succeeded' | 'failed';
  paymentMethod?: string;
  billingDate: string;
  paidAt?: string;
}

/**
 * 获取所有可用的订阅计划
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const result = await query(
    `SELECT 
      id, name, slug, description, price_cents as "priceCents", 
      billing_cycle as "billingCycle", stripe_price_id as "stripePriceId",
      analysis_limit_per_month as "analysisLimitPerMonth",
      monthly_bonus_credits as "monthlyBonusCredits",
      unlock_premium_models as "unlockPremiumModels",
      priority_queue as "priorityQueue",
      display_order as "displayOrder", is_active as "isActive"
     FROM subscription_plans 
     WHERE is_active = true 
     ORDER BY display_order ASC`
  );
  
  return result.rows;
}

/**
 * 获取用户当前的活跃订阅
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const result = await query(
    `SELECT us.*, sp.* 
     FROM user_subscriptions us
     LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.user_id = $1 AND us.status = 'active'
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return formatSubscriptionRow(row);
}

/**
 * 获取用户订阅历史（包括已取消）
 */
export async function getUserSubscriptionHistory(userId: string): Promise<UserSubscription[]> {
  const result = await query(
    `SELECT us.*, sp.*
     FROM user_subscriptions us
     LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
     WHERE us.user_id = $1
     ORDER BY us.created_at DESC`,
    [userId]
  );

  return result.rows.map(formatSubscriptionRow);
}

/**
 * 创建订阅
 */
export async function createSubscription(
  userId: string,
  planId: number,
  stripeSubscriptionId?: string,
  stripeCustomerId?: string
): Promise<UserSubscription> {
  const now = new Date();
  const renewsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30天后

  const result = await query(
    `INSERT INTO user_subscriptions (
      user_id, plan_id, stripe_subscription_id, stripe_customer_id, 
      status, renews_at, current_month_reset_at
    ) VALUES ($1, $2, $3, $4, 'active', $5, $6)
    RETURNING *`,
    [userId, planId, stripeSubscriptionId, stripeCustomerId, renewsAt.toISOString(), now.toISOString()]
  );

  const subscription = result.rows[0];

  // 发放初始积分奖励
  const plan = await getSubscriptionPlan(planId);
  if (plan && plan.monthlyBonusCredits > 0) {
    await grantCredits(userId, plan.monthlyBonusCredits, 'subscription_bonus', subscription.id);
  }

  // 记录订阅事件
  await recordSubscriptionEvent(subscription.id, 'created', null, planId);

  return formatSubscriptionRow(subscription);
}

/**
 * 升级或降级订阅
 */
export async function updateSubscriptionPlan(
  userId: string,
  newPlanId: number,
  stripeSubscriptionId?: string
): Promise<UserSubscription> {
  // 获取当前订阅
  const currentSub = await getUserSubscription(userId);
  if (!currentSub) {
    throw new Error('User does not have an active subscription');
  }

  const oldPlanId = currentSub.planId;

  // 更新订阅计划
  const result = await query(
    `UPDATE user_subscriptions
     SET plan_id = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [newPlanId, currentSub.id]
  );

  const updated = result.rows[0];

  // 发放额外的积分奖励（升级和降级都发放月度奖励差价）
  const oldPlan = await getSubscriptionPlan(oldPlanId);
  const newPlan = await getSubscriptionPlan(newPlanId);
  
  if (oldPlan && newPlan) {
    const creditDiff = newPlan.monthlyBonusCredits - oldPlan.monthlyBonusCredits;
    if (creditDiff > 0) {
      await grantCredits(userId, creditDiff, 'subscription_bonus', updated.id);
    }
  }

  // 记录订阅事件
  await recordSubscriptionEvent(updated.id, oldPlanId < newPlanId ? 'upgraded' : 'downgraded', oldPlanId, newPlanId);

  return formatSubscriptionRow(updated);
}

/**
 * 取消订阅
 */
export async function cancelSubscription(userId: string): Promise<UserSubscription> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) {
    throw new Error('User does not have an active subscription');
  }

  const result = await query(
    `UPDATE user_subscriptions
     SET status = 'canceled', canceled_at = NOW(), auto_renew = FALSE, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [subscription.id]
  );

  const updated = result.rows[0];

  // 记录取消事件
  await recordSubscriptionEvent(updated.id, 'canceled', subscription.planId, null);

  return formatSubscriptionRow(updated);
}

/**
 * 暂停订阅
 */
export async function pauseSubscription(userId: string): Promise<UserSubscription> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) {
    throw new Error('User does not have an active subscription');
  }

  const result = await query(
    `UPDATE user_subscriptions
     SET status = 'paused', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [subscription.id]
  );

  return formatSubscriptionRow(result.rows[0]);
}

/**
 * 恢复订阅
 */
export async function resumeSubscription(userId: string): Promise<UserSubscription> {
  const result = await query(
    `SELECT * FROM user_subscriptions 
     WHERE user_id = $1 AND status = 'paused'
     ORDER BY canceled_at DESC
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('No paused subscription found');
  }

  const subscription = result.rows[0];

  const updateResult = await query(
    `UPDATE user_subscriptions
     SET status = 'active', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [subscription.id]
  );

  return formatSubscriptionRow(updateResult.rows[0]);
}

/**
 * 检查用户是否有活跃订阅
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  return subscription !== null && subscription.status === 'active';
}

/**
 * 检查用户是否可以进行分析（基于订阅或积分）
 */
export async function canPerformAnalysis(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  chargeCredits: boolean;
}> {
  const subscription = await getUserSubscription(userId);

  if (!subscription || subscription.status !== 'active') {
    return { allowed: false, reason: 'No active subscription' };
  }

  // 获取计划详情
  const plan = await getSubscriptionPlan(subscription.planId);
  if (!plan) {
    return { allowed: false, reason: 'Invalid subscription plan' };
  }

  // 如果是 Lite 计划，检查月度分析限额
  if (plan.analysisLimitPerMonth !== null) {
    // 检查是否需要重置本月计数
    const now = new Date();
    const resetDate = new Date(subscription.currentMonthResetAt || subscription.startedAt);
    
    if (now.getTime() - resetDate.getTime() > 30 * 24 * 60 * 60 * 1000) {
      // 重置计数
      await query(
        `UPDATE user_subscriptions
         SET current_month_analyses = 0, current_month_reset_at = NOW()
         WHERE id = $1`,
        [subscription.id]
      );
      subscription.currentMonthAnalyses = 0;
    }

    if (subscription.currentMonthAnalyses >= plan.analysisLimitPerMonth) {
      return { 
        allowed: false, 
        reason: `Monthly limit reached (${plan.analysisLimitPerMonth} analyses)`,
        chargeCredits: false
      };
    }
  }

  return { allowed: true, chargeCredits: false };
}

/**
 * 记录分析使用
 */
export async function recordAnalysisUsage(userId: string): Promise<void> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return;

  // 更新月度分析计数
  await query(
    `UPDATE user_subscriptions
     SET current_month_analyses = current_month_analyses + 1
     WHERE id = $1`,
    [subscription.id]
  );
}

/**
 * 续约订阅
 */
export async function renewSubscription(subscriptionId: number): Promise<void> {
  const result = await query(
    `SELECT * FROM user_subscriptions WHERE id = $1`,
    [subscriptionId]
  );

  if (result.rows.length === 0) {
    throw new Error('Subscription not found');
  }

  const subscription = result.rows[0];
  const now = new Date();
  const newRenewsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 更新续约日期和重置月度计数
  await query(
    `UPDATE user_subscriptions
     SET renews_at = $1, current_month_analyses = 0, current_month_reset_at = NOW(), updated_at = NOW()
     WHERE id = $2`,
    [newRenewsAt.toISOString(), subscriptionId]
  );

  // 发放每月奖励积分
  const plan = await getSubscriptionPlan(subscription.plan_id);
  if (plan && plan.monthly_bonus_credits > 0) {
    await grantCredits(subscription.user_id, plan.monthly_bonus_credits, 'subscription_bonus', subscriptionId);
  }

  // 记录续约事件
  await recordSubscriptionEvent(subscriptionId, 'renewed', subscription.plan_id, subscription.plan_id);
}

/**
 * 获取单个订阅计划
 */
async function getSubscriptionPlan(planId: number): Promise<SubscriptionPlan | null> {
  const result = await query(
    `SELECT 
      id, name, slug, description, price_cents as "priceCents",
      billing_cycle as "billingCycle", stripe_price_id as "stripePriceId",
      analysis_limit_per_month as "analysisLimitPerMonth",
      monthly_bonus_credits as "monthlyBonusCredits",
      unlock_premium_models as "unlockPremiumModels",
      priority_queue as "priorityQueue",
      display_order as "displayOrder", is_active as "isActive"
     FROM subscription_plans WHERE id = $1`,
    [planId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * 记录订阅事件
 */
async function recordSubscriptionEvent(
  subscriptionId: number,
  eventType: string,
  previousPlanId: number | null,
  newPlanId: number | null
): Promise<void> {
  await query(
    `INSERT INTO subscription_events (subscription_id, event_type, previous_plan_id, new_plan_id)
     VALUES ($1, $2, $3, $4)`,
    [subscriptionId, eventType, previousPlanId, newPlanId]
  );
}

/**
 * 格式化订阅行数据
 */
function formatSubscriptionRow(row: any): UserSubscription {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripeCustomerId: row.stripe_customer_id,
    status: row.status,
    startedAt: row.started_at,
    renewsAt: row.renews_at,
    canceledAt: row.canceled_at,
    currentMonthAnalyses: row.current_month_analyses,
    currentMonthResetAt: row.current_month_reset_at,
    autoRenew: row.auto_renew,
    plan: row.slug ? {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      priceCents: row.price_cents,
      billingCycle: row.billing_cycle,
      stripePriceId: row.stripe_price_id,
      analysisLimitPerMonth: row.analysis_limit_per_month,
      monthlyBonusCredits: row.monthly_bonus_credits,
      unlockPremiumModels: row.unlock_premium_models,
      priorityQueue: row.priority_queue,
      displayOrder: row.display_order,
      isActive: row.is_active,
    } : undefined,
  };
}

/**
 * 获取订阅交易历史
 */
export async function getSubscriptionTransactions(subscriptionId: number): Promise<SubscriptionTransaction[]> {
  const result = await query(
    `SELECT 
      id, subscription_id as "subscriptionId", stripe_invoice_id as "stripeInvoiceId",
      stripe_charge_id as "stripeChargeId", amount_cents as "amountCents",
      status, payment_method as "paymentMethod", billing_date as "billingDate",
      paid_at as "paidAt"
     FROM subscription_transactions
     WHERE subscription_id = $1
     ORDER BY billing_date DESC`,
    [subscriptionId]
  );

  return result.rows;
}

/**
 * 记录订阅交易
 */
export async function recordSubscriptionTransaction(
  subscriptionId: number,
  amountCents: number,
  status: 'pending' | 'succeeded' | 'failed',
  stripeInvoiceId?: string,
  stripeChargeId?: string,
  paymentMethod?: string
): Promise<SubscriptionTransaction> {
  const result = await query(
    `INSERT INTO subscription_transactions (
      subscription_id, amount_cents, status, stripe_invoice_id, stripe_charge_id,
      payment_method, billing_date
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING 
      id, subscription_id as "subscriptionId", stripe_invoice_id as "stripeInvoiceId",
      stripe_charge_id as "stripeChargeId", amount_cents as "amountCents",
      status, payment_method as "paymentMethod", billing_date as "billingDate",
      paid_at as "paidAt"`,
    [subscriptionId, amountCents, status, stripeInvoiceId, stripeChargeId, paymentMethod]
  );

  return result.rows[0];
}
