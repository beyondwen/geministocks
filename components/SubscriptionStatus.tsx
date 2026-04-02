import React from 'react';
import { UserSubscription } from '../services/subscriptionService';
import { useI18n } from '../hooks/useI18n';

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
  const { t } = useI18n();

  if (!subscription) {
    return (
      <div className="rounded-lg bg-secondary/50 border border-border p-4">
        <p className="text-sm text-muted-foreground">
          {t('subscription.noSubscription')}
        </p>
        <button
          onClick={onUpgradeClick}
          className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm font-medium"
        >
          {t('subscription.viewPlans')}
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

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      active: t('subscription.active'),
      canceled: t('subscription.canceled'),
      paused: t('subscription.paused'),
      past_due: t('subscription.pastDue'),
    };
    return statusMap[status] || status;
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
            {subscription.plan?.name} {t('subscription.plan')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {subscription.plan?.description}
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-semibold border ${
            statusColors[subscription.status as keyof typeof statusColors]
          }`}
        >
          {getStatusLabel(subscription.status)}
        </div>
      </div>

      <div className="space-y-3 mb-6 pb-6 border-b border-border">
        {/* Monthly analyses count */}
        {subscription.plan?.analysisLimitPerMonth && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('subscription.monthlyAnalyses')}</span>
            <span className="text-sm font-medium">
              {subscription.currentMonthAnalyses} / {subscription.plan.analysisLimitPerMonth}
            </span>
          </div>
        )}

        {/* Monthly bonus credits */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('subscription.monthlyBonusCredits')}</span>
          <span className="text-sm font-medium">
            +{subscription.plan?.monthlyBonusCredits}
          </span>
        </div>

        {/* Renewal date */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('subscription.renewsAt')}</span>
          <span className="text-sm font-medium">
            {renewsAtDate.toLocaleDateString('en-US')} ({t('time.daysAgo', { count: daysUntilRenewal })})
          </span>
        </div>

        {/* Special privileges */}
        {(subscription.plan?.priorityQueue || subscription.plan?.unlockPremiumModels) && (
          <div className="flex items-start gap-2">
            <span className="text-sm text-muted-foreground flex-shrink-0">{t('subscription.specialPrivileges')}</span>
            <div className="flex flex-wrap gap-2">
              {subscription.plan.priorityQueue && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  {t('subscription.priorityQueue')}
                </span>
              )}
              {subscription.plan.unlockPremiumModels && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  {t('subscription.premiumModels')}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onUpgradeClick}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm font-medium transition-colors"
        >
          {t('subscription.changeOption')}
        </button>
        <button
          onClick={onManageClick}
          className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 text-sm font-medium transition-colors"
        >
          {t('subscription.managePlan')}
        </button>
      </div>

      {/* Cancellation info */}
      {subscription.status === 'active' && (
        <p className="mt-4 text-xs text-muted-foreground">
          {t('subscription.cancellationInfo')}
        </p>
      )}
    </div>
  );
};

export default SubscriptionStatus;
