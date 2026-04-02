import React from 'react';
import { UserSubscription } from '../services/subscriptionService';

interface SubscriptionStatusProps {
  subscription: UserSubscription | null;
  onManageClick?: () => void;
  onUpgradeClick?: () => void;
}

export const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  subscription,
  onManageClick,
  onUpgradeClick,
}) => {
  if (!subscription) {
    return (
      <div className="rounded-lg bg-secondary/50 border border-border p-4">
        <p className="text-sm text-muted-foreground">
          您未订阅任何计划。订阅以获得无限分析和每月积分奖励。
        </p>
        <button
          onClick={onUpgradeClick}
          className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm font-medium"
        >
          查看订阅计划
        </button>
      </div>
    );
  }

  const statusColors = {
    active: 'bg-green-500/10 text-green-700 border-green-200',
    canceled: 'bg-red-500/10 text-red-700 border-red-200',
    paused: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
    past_due: 'bg-orange-500/10 text-orange-700 border-orange-200',
  };

  const statusLabels = {
    active: '活跃',
    canceled: '已取消',
    paused: '已暂停',
    past_due: '逾期',
  };

  const renewsAtDate = new Date(subscription.renewsAt);
  const daysUntilRenewal = Math.ceil(
    (renewsAtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="rounded-lg bg-background border border-border p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {subscription.plan?.name} 计划
          </h3>
          <p className="text-sm text-muted-foreground">
            {subscription.plan?.description}
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-semibold border ${
            statusColors[subscription.status]
          }`}
        >
          {statusLabels[subscription.status]}
        </div>
      </div>

      <div className="space-y-3 mb-6 pb-6 border-b border-border">
        {/* 月度分析次数 */}
        {subscription.plan?.analysisLimitPerMonth && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">本月分析次数</span>
            <span className="text-sm font-medium">
              {subscription.currentMonthAnalyses} / {subscription.plan.analysisLimitPerMonth}
            </span>
          </div>
        )}

        {/* 月度奖励积分 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">每月积分奖励</span>
          <span className="text-sm font-medium">
            +{subscription.plan?.monthlyBonusCredits} 积分
          </span>
        </div>

        {/* 续约日期 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">续约日期</span>
          <span className="text-sm font-medium">
            {renewsAtDate.toLocaleDateString('zh-CN')} ({daysUntilRenewal} 天后)
          </span>
        </div>

        {/* 特殊特性 */}
        {(subscription.plan?.priorityQueue || subscription.plan?.unlockPremiumModels) && (
          <div className="flex items-start gap-2">
            <span className="text-sm text-muted-foreground flex-shrink-0">特权特性</span>
            <div className="flex flex-wrap gap-2">
              {subscription.plan.priorityQueue && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  优先队列
                </span>
              )}
              {subscription.plan.unlockPremiumModels && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  高级模型
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={onUpgradeClick}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm font-medium transition-colors"
        >
          更改计划
        </button>
        <button
          onClick={onManageClick}
          className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 text-sm font-medium transition-colors"
        >
          管理订阅
        </button>
      </div>

      {/* 取消订阅信息 */}
      {subscription.status === 'active' && (
        <p className="mt-4 text-xs text-muted-foreground">
          可随时取消订阅。取消后，您仍可继续使用当前订阅周期的所有功能，直到续约日期。
        </p>
      )}
    </div>
  );
};

export default SubscriptionStatus;
