/**
 * Stripe 服务
 * 处理订阅支付、Webhook 事件等
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

import { query } from './database';
import { createSubscription, updateSubscriptionPlan, renewSubscription, recordSubscriptionTransaction } from './subscriptionService';

/**
 * 创建 Stripe 客户对象
 */
export async function createStripeCustomer(userId: string, email: string) {
  const existingCustomer = await query(
    'SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = $1 LIMIT 1',
    [userId]
  );

  if (existingCustomer.rows.length > 0 && existingCustomer.rows[0].stripe_customer_id) {
    return existingCustomer.rows[0].stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  return customer.id;
}

/**
 * 创建订阅 Checkout Session
 */
export async function createSubscriptionCheckoutSession(
  userId: string,
  email: string,
  planId: number,
  stripePriceId: string,
  returnUrl: string
) {
  const stripeCustomerId = await createStripeCustomer(userId, email);

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: returnUrl,
    metadata: {
      userId,
      planId,
    },
  });

  return session;
}

/**
 * 检索 Checkout Session
 */
export async function getCheckoutSession(sessionId: string) {
  return await stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * 处理 Stripe Webhook 事件
 */
export async function handleStripeWebhook(event: any) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object);
      break;

    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

/**
 * Checkout Session 完成
 */
async function handleCheckoutSessionCompleted(session: any) {
  const { metadata, customer, subscription } = session;
  const { userId, planId } = metadata;

  try {
    // 创建本地订阅记录
    await createSubscription(
      userId,
      parseInt(planId),
      subscription,
      customer
    );

    console.log(`[Stripe] Subscription created for user ${userId}`);
  } catch (error) {
    console.error(`[Stripe] Error creating subscription for user ${userId}:`, error);
    throw error;
  }
}

/**
 * 订阅创建
 */
async function handleSubscriptionCreated(subscription: any) {
  const { customer, id: stripeSubscriptionId } = subscription;
  
  // 获取客户信息
  const customer_obj = await stripe.customers.retrieve(customer);
  const userId = customer_obj.metadata?.userId;

  if (!userId) {
    console.warn(`[Stripe] Customer ${customer} has no userId metadata`);
    return;
  }

  console.log(`[Stripe] Subscription created: ${stripeSubscriptionId} for user ${userId}`);
}

/**
 * 订阅更新（计划变更）
 */
async function handleSubscriptionUpdated(subscription: any) {
  const { customer, id: stripeSubscriptionId, items } = subscription;

  // 获取客户信息
  const customer_obj = await stripe.customers.retrieve(customer);
  const userId = customer_obj.metadata?.userId;

  if (!userId) {
    console.warn(`[Stripe] Customer ${customer} has no userId metadata`);
    return;
  }

  // 获取新的价格 ID
  const stripePriceId = items.data[0].price.id;

  // 查找对应的本地计划 ID
  const planResult = await query(
    'SELECT id FROM subscription_plans WHERE stripe_price_id = $1',
    [stripePriceId]
  );

  if (planResult.rows.length > 0) {
    const newPlanId = planResult.rows[0].id;
    await updateSubscriptionPlan(userId, newPlanId, stripeSubscriptionId);
    console.log(`[Stripe] Subscription updated for user ${userId}`);
  }
}

/**
 * 订阅取消
 */
async function handleSubscriptionDeleted(subscription: any) {
  const { customer, id: stripeSubscriptionId } = subscription;

  // 获取客户信息
  const customer_obj = await stripe.customers.retrieve(customer);
  const userId = customer_obj.metadata?.userId;

  if (!userId) {
    console.warn(`[Stripe] Customer ${customer} has no userId metadata`);
    return;
  }

  // 更新本地订阅状态
  await query(
    `UPDATE user_subscriptions 
     SET status = 'canceled', canceled_at = NOW(), auto_renew = FALSE 
     WHERE stripe_subscription_id = $1`,
    [stripeSubscriptionId]
  );

  console.log(`[Stripe] Subscription canceled for user ${userId}`);
}

/**
 * 发票支付成功
 */
async function handleInvoicePaymentSucceeded(invoice: any) {
  const { subscription: stripeSubscriptionId, customer, amount_paid, id: invoiceId } = invoice;

  if (!stripeSubscriptionId) return;

  // 获取本地订阅
  const subResult = await query(
    'SELECT id FROM user_subscriptions WHERE stripe_subscription_id = $1',
    [stripeSubscriptionId]
  );

  if (subResult.rows.length === 0) return;

  const subscriptionId = subResult.rows[0].id;

  // 记录交易
  await recordSubscriptionTransaction(
    subscriptionId,
    amount_paid,
    'succeeded',
    invoiceId,
    undefined,
    'stripe'
  );

  // 续约订阅
  await renewSubscription(subscriptionId);

  console.log(`[Stripe] Payment succeeded for subscription ${stripeSubscriptionId}`);
}

/**
 * 发票支付失败
 */
async function handleInvoicePaymentFailed(invoice: any) {
  const { subscription: stripeSubscriptionId, amount_due, id: invoiceId } = invoice;

  if (!stripeSubscriptionId) return;

  // 获取本地订阅
  const subResult = await query(
    'SELECT id, user_id FROM user_subscriptions WHERE stripe_subscription_id = $1',
    [stripeSubscriptionId]
  );

  if (subResult.rows.length === 0) return;

  const { id: subscriptionId, user_id: userId } = subResult.rows[0];

  // 记录失败的交易
  await recordSubscriptionTransaction(
    subscriptionId,
    amount_due,
    'failed',
    invoiceId,
    undefined,
    'stripe'
  );

  // 更新订阅状态为 past_due
  await query(
    `UPDATE user_subscriptions 
     SET status = 'past_due' 
     WHERE stripe_subscription_id = $1`,
    [stripeSubscriptionId]
  );

  console.error(`[Stripe] Payment failed for subscription ${stripeSubscriptionId} (user ${userId})`);
}

/**
 * 验证 Webhook 签名
 */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

/**
 * 获取订阅客户门户 URL
 */
export async function getCustomerPortalUrl(customerId: string, returnUrl: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}
