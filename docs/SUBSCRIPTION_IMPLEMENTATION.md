# 订阅制实现文档

**完成日期**: 2024-04-02
**版本**: 1.0
**状态**: ✅ 生产就绪

---

## 概述

Gemini Stocks 已实现完整的按月订阅系统，取消了一次性积分购买，用户现在必须订阅才能使用分析功能。系统提供三档订阅计划，每档提供不同的功能和定价。

---

## 订阅计划详情

### 1. Lite 计划 - $4.9/月

- **分析次数**: 100 次/月（到期自动重置）
- **每月积分**: 30 积分
- **特权**: 基础功能
- **适用**: 轻度用户

### 2. Pro 计划 - $9.9/月（推荐）

- **分析次数**: 无限
- **每月积分**: 50 积分
- **特权**: 优先处理队列
- **适用**: 中度用户

### 3. Premium 计划 - $19.9/月

- **分析次数**: 无限
- **每月积分**: 100 积分
- **特权**: 优先处理队列 + 解锁高级 AI 模型
- **适用**: 重度用户

---

## 数据库表结构

### subscription_plans (订阅计划表)

存储所有可用的订阅计划信息。

```sql
CREATE TABLE subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,        -- 计划名称
  slug VARCHAR(50) NOT NULL UNIQUE,        -- URL 标识
  description TEXT,                         -- 描述
  price_cents INTEGER NOT NULL,             -- 价格（美分）
  currency VARCHAR(3) DEFAULT 'USD',
  billing_cycle VARCHAR(20) NOT NULL,       -- 计费周期
  stripe_price_id VARCHAR(255) UNIQUE,      -- Stripe 价格 ID
  analysis_limit_per_month INTEGER,         -- 月度分析限额
  monthly_bonus_credits INTEGER DEFAULT 0,  -- 每月赠送积分
  unlock_premium_models BOOLEAN DEFAULT FALSE,
  priority_queue BOOLEAN DEFAULT FALSE,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### user_subscriptions (用户订阅表)

存储用户订阅信息和状态。

```sql
CREATE TABLE user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,            -- 用户 ID
  plan_id INTEGER NOT NULL,                 -- 订阅计划 ID
  stripe_subscription_id VARCHAR(255),      -- Stripe 订阅 ID
  stripe_customer_id VARCHAR(255),          -- Stripe 客户 ID
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 订阅状态
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  renews_at TIMESTAMP NOT NULL,             -- 续约日期
  canceled_at TIMESTAMP,
  current_month_analyses INTEGER DEFAULT 0, -- 本月分析次数
  current_month_reset_at TIMESTAMP,         -- 本月重置日期
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### subscription_transactions (订阅交易表)

记录所有支付交易。

```sql
CREATE TABLE subscription_transactions (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL,
  stripe_invoice_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL,              -- 'pending', 'succeeded', 'failed'
  payment_method VARCHAR(50),
  billing_date TIMESTAMP NOT NULL,
  paid_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### subscription_events (订阅事件日志表)

审计日志，记录所有订阅变化。

```sql
CREATE TABLE subscription_events (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL,
  event_type VARCHAR(50) NOT NULL,          -- 'created', 'upgraded', 'downgraded', 'canceled', etc.
  previous_plan_id INTEGER,
  new_plan_id INTEGER,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### credit_grants (积分赠送表)

记录所有的积分赠送（订阅、推荐、促销等）。

```sql
CREATE TABLE credit_grants (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  credits INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,             -- 'subscription_bonus', 'referral', etc.
  source_id VARCHAR(255),                   -- subscription_id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 核心服务 (subscriptionService.ts)

### 主要函数

#### 获取订阅计划

```typescript
getSubscriptionPlans(): Promise<SubscriptionPlan[]>
```

获取所有活跃的订阅计划。

#### 用户订阅管理

```typescript
getUserSubscription(userId: string): Promise<UserSubscription | null>
hasActiveSubscription(userId: string): Promise<boolean>
```

获取用户的活跃订阅或检查是否有订阅。

#### 创建/修改订阅

```typescript
createSubscription(userId, planId, stripeSubscriptionId?, stripeCustomerId?)
updateSubscriptionPlan(userId, newPlanId, stripeSubscriptionId?)
cancelSubscription(userId)
pauseSubscription(userId)
resumeSubscription(userId)
```

#### 分析权限控制

```typescript
canPerformAnalysis(userId): Promise<{
  allowed: boolean;
  reason?: string;
  chargeCredits: boolean;
}>
```

检查用户是否可以执行分析（考虑限额、订阅状态等）。

#### 使用记录

```typescript
recordAnalysisUsage(userId)
```

记录用户的分析使用情况，用于 Lite 计划的限额追踪。

---

## Stripe 集成 (stripeService.ts)

### Webhook 事件处理

系统支持以下 Stripe Webhook 事件：

| 事件 | 处理 |
|-----|------|
| `checkout.session.completed` | 创建本地订阅记录 |
| `customer.subscription.created` | 记录订阅创建 |
| `customer.subscription.updated` | 处理计划变更 |
| `customer.subscription.deleted` | 处理取消 |
| `invoice.payment_succeeded` | 续约并发放积分 |
| `invoice.payment_failed` | 标记为逾期 |

### 主要函数

```typescript
createStripeCustomer(userId, email)
createSubscriptionCheckoutSession(userId, email, planId, stripePriceId, returnUrl)
handleStripeWebhook(event)
verifyWebhookSignature(rawBody, signature, secret)
```

---

## UI 组件

### PricingTable.tsx

展示所有订阅计划的定价表。

**Props**:
- `plans`: 订阅计划数组
- `currentPlanId`: 当前订阅计划 ID
- `onSelectPlan`: 选择计划回调
- `loading`: 加载状态

### SubscriptionStatus.tsx

显示用户当前的订阅状态和特权。

**Props**:
- `subscription`: 用户订阅信息
- `onManageClick`: 管理订阅回调
- `onUpgradeClick`: 升级计划回调

### SubscriptionModal.tsx

订阅管理模态框，允许用户升级、降级或取消订阅。

**Props**:
- `isOpen`: 模态框是否打开
- `currentPlanId`: 当前计划 ID
- `userId`: 用户 ID
- `onClose`: 关闭回调
- `onSuccess`: 成功回调

---

## Hook (useSubscription.ts)

```typescript
useSubscription(userId: string): UseSubscriptionReturn
```

**返回值**:
```typescript
{
  subscription: UserSubscription | null,
  plans: SubscriptionPlan[],
  loading: boolean,
  error: string | null,
  canPerformAnalysis: boolean,
  analysisLimitReached: boolean,
  analysisMessage: string,
  refreshSubscription: () => Promise<void>,
  recordUsage: () => Promise<void>
}
```

---

## API 端点

### POST /api/subscriptions/checkout

创建 Stripe Checkout Session。

**请求**:
```json
{
  "userId": "user123",
  "email": "user@example.com",
  "planId": 1,
  "stripePriceId": "price_xxx",
  "returnUrl": "https://app.com/subscription"
}
```

**响应**:
```json
{
  "sessionId": "cs_xxx",
  "clientSecret": "xxx",
  "url": "https://checkout.stripe.com/..."
}
```

### POST /api/webhooks/stripe

Stripe Webhook 端点。使用 Stripe 的验证签名方法。

**配置**:
- 在 Stripe 仪表板配置 Webhook URL
- 设置事件类型（见上面的 Webhook 事件处理）

---

## 应用集成

### 分析前检查

在执行任何分析前，应用应该：

1. 调用 `useSubscription(userId)` 获取订阅状态
2. 检查 `canPerformAnalysis` 权限
3. 如果无权限，显示适当的消息或提示订阅
4. 分析完成后调用 `recordUsage()` 更新使用情况

### 示例集成

```typescript
const { subscription, canPerformAnalysis, recordUsage } = useSubscription(userId);

const handleAnalyze = async () => {
  if (!canPerformAnalysis) {
    // 显示订阅提示
    showSubscriptionModal();
    return;
  }

  // 执行分析
  const result = await performAnalysis();

  // 记录使用
  await recordUsage();

  return result;
};
```

---

## 环境变量配置

### 必需变量

```bash
# Stripe 密钥
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Webhook
STRIPE_WEBHOOK_SECRET=whsec_xxx

# 数据库
DATABASE_URL=postgresql://user:pass@host/db
```

### 可选变量

```bash
# 支付页面配置
VITE_APP_NAME=Gemini Stocks
VITE_APP_URL=https://app.example.com
```

---

## 部署清单

### 数据库准备

```bash
# 运行迁移脚本
psql -U user -d database -f scripts/01_create_subscription_tables.sql
```

### 环境变量设置

1. 获取 Stripe API 密钥（https://dashboard.stripe.com/apikeys）
2. 生成 Webhook 密钥
3. 配置环保变量

### Stripe 配置

1. 创建三个产品和价格：
   - Lite: $4.99/月
   - Pro: $9.99/月
   - Premium: $19.99/月

2. 配置 Webhook：
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - 事件: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

### 生产验证

- [ ] 创建测试订阅
- [ ] 验证积分发放
- [ ] 测试升级/降级
- [ ] 测试取消
- [ ] 验证 Webhook 处理
- [ ] 检查日志

---

## 故障排除

### 订阅创建失败

**原因**: Stripe 密钥配置错误或客户创建失败
**解决**: 检查 Stripe 密钥，查看错误日志

### 无限循环的积分赠送

**原因**: Webhook 重试导致重复处理
**解决**: 确保使用幂等性密钥

### 分析限额计数错误

**原因**: 时区问题或月度重置逻辑错误
**解决**: 检查 `current_month_reset_at` 时间戳

---

## 性能优化

### 索引

所有外键和查询条件都已添加索引：
- `user_subscriptions(user_id)`
- `user_subscriptions(status)`
- `subscription_transactions(subscription_id)`

### 缓存

建议在应用层缓存用户订阅信息，TTL 为 5 分钟。

---

## 安全考虑

1. **签名验证**: 所有 Stripe Webhook 都进行签名验证
2. **幂等性**: 使用 Stripe 幂等性密钥防止重复处理
3. **数据隐私**: 不存储信用卡信息
4. **速率限制**: 对 API 端点进行速率限制

---

## 监控和告警

建议设置以下告警：

- 支付失败率 > 5%
- Webhook 处理失败
- 积分赠送异常
- 订阅状态不同步

---

## 扩展计划

### 短期（1 个月）

- [ ] 团队/企业计划
- [ ] 年度折扣
- [ ] 推荐计划

### 中期（3 个月）

- [ ] 使用量追踪仪表板
- [ ] 自定义配额
- [ ] API 配额管理

### 长期（6 个月）

- [ ] 多货币支持
- [ ] 本地支付方法
- [ ] 订阅分析报告

---

**文档版本**: 1.0
**最后更新**: 2024-04-02
