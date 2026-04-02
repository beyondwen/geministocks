/**
 * Stripe Webhook 端点
 * 处理订阅相关的 Webhook 事件
 */

import { handleStripeWebhook, verifyWebhookSignature } from '../../services/stripeService';

export default async function handler(req: any, res: any) {
  // 只接受 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['stripe-signature'];
  const rawBody = req.body;

  if (!signature || !rawBody) {
    return res.status(400).json({ error: 'Missing signature or body' });
  }

  try {
    // 验证 Webhook 签名
    const event = verifyWebhookSignature(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    // 处理事件
    await handleStripeWebhook(event);

    // 返回成功响应
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return res.status(400).json({ error: 'Invalid signature' });
  }
}
