import React, { useState, useEffect } from 'react';
import { SubscriptionPlan } from '../services/subscriptionService';
import { useI18n } from '../hooks/useI18n';

interface PricingTableProps {
  plans: SubscriptionPlan[];
  currentPlanId?: number;
  onSelectPlan: (planId: number) => void;
  loading?: boolean;
}

export const PricingTable: React.FC<PricingTableProps> = ({
  plans,
  currentPlanId,
  onSelectPlan,
  loading = false,
}) => {
  const { t } = useI18n();

  const getFeatures = (plan: SubscriptionPlan) => {
    const features: string[] = [];

    if (plan.analysisLimitPerMonth !== null) {
      features.push(t('subscription.analysisPerMonth', { count: plan.analysisLimitPerMonth }));
    } else {
      features.push(t('subscription.unlimitedAnalysis'));
    }

    features.push(t('subscription.creditsPerMonth', { count: plan.monthlyBonusCredits }));

    if (plan.priorityQueue) {
      features.push(t('subscription.priorityQueue'));
    }

    if (plan.unlockPremiumModels) {
      features.push(t('subscription.premiumModels'));
    }

    return features;
  };

  return (
    <div className="w-full py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {t('subscription.plans')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('subscription.selectPlan')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlanId;
            const isFeatured = plan.slug === 'pro';

            return (
              <div
                key={plan.id}
                className={`relative rounded-lg border transition-all ${
                  isFeatured
                    ? 'border-primary shadow-lg scale-105'
                    : 'border-border hover:border-primary/50'
                } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
              >
                {/* Recommended badge */}
                {isFeatured && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                      {t('subscription.recommended')}
                    </span>
                  </div>
                )}

                {/* Current plan badge */}
                {isCurrentPlan && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-green-500/20 text-green-700 px-3 py-1 rounded text-xs font-semibold">
                      {t('subscription.currentPlan')}
                    </span>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan name */}
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-foreground">
                        ${(plan.priceCents / 100).toFixed(2)}
                      </span>
                      <span className="ml-2 text-muted-foreground">{t('subscription.perMonth')}</span>
                    </div>
                  </div>

                  {/* Button */}
                  <button
                    onClick={() => onSelectPlan(plan.id)}
                    disabled={loading || isCurrentPlan}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all mb-8 ${
                      isCurrentPlan
                        ? 'bg-secondary text-secondary-foreground cursor-default opacity-50'
                        : isFeatured
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50'
                    }`}
                  >
                    {loading ? t('error.processing') : isCurrentPlan ? t('subscription.currentPlan') : t('subscription.selectPlan')}
                  </button>

                  {/* Features list */}
                  <div className="space-y-4">
                    {getFeatures(plan).map((feature, index) => (
                      <div key={index} className="flex items-start">
                        <span className="text-primary mr-3 mt-1">✓</span>
                        <span className="text-sm text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Additional info */}
                  {plan.slug === 'lite' && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        {t('subscription.liteInfo', { count: plan.analysisLimitPerMonth })}
                      </p>
                    </div>
                  )}

                  {(plan.slug === 'pro' || plan.slug === 'premium') && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        {t('subscription.proInfo')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 对比表格 */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-foreground mb-8 text-center">
            功能对比
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold text-foreground">
                    功能
                  </th>
                  {plans.map((plan) => (
                    <th
                      key={plan.id}
                      className="text-center py-4 px-4 font-semibold text-foreground"
                    >
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-4 px-4 text-muted-foreground">每月分析次数</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      {plan.analysisLimitPerMonth || '无限'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="py-4 px-4 text-muted-foreground">每月积分奖励</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      {plan.monthlyBonusCredits}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="py-4 px-4 text-muted-foreground">优先处理队列</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      {plan.priorityQueue ? '✓' : '✕'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-4 px-4 text-muted-foreground">高级 AI 模型</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="text-center py-4 px-4">
                      {plan.unlockPremiumModels ? '✓' : '✕'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingTable;
