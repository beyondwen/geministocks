import React, { useState, useEffect } from 'react';
import { SubscriptionPlan, getSubscriptionPlans, createSubscription, updateSubscriptionPlan, cancelSubscription } from '../services/subscriptionService';
import PricingTable from './PricingTable';

interface SubscriptionModalProps {
  isOpen: boolean;
  currentPlanId?: number;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  currentPlanId,
  userId,
  onClose,
  onSuccess,
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const availablePlans = await getSubscriptionPlans();
      setPlans(availablePlans);
      setError(null);
    } catch (err) {
      setError('加载订阅计划失败，请重试');
      console.error('Failed to load subscription plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: number) => {
    try {
      setLoading(true);
      setError(null);

      if (currentPlanId && planId === currentPlanId) {
        onClose();
        return;
      }

      if (currentPlanId) {
        // 升级或降级现有订阅
        await updateSubscriptionPlan(userId, planId);
      } else {
        // 创建新订阅
        await createSubscription(userId, planId);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '订阅失败，请重试');
      console.error('Failed to update subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentPlanId || !confirm('确定要取消订阅吗？')) return;

    try {
      setLoading(true);
      await cancelSubscription(userId);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消订阅失败，请重试');
      console.error('Failed to cancel subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-background border-b border-border p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">
            {currentPlanId ? '更改订阅计划' : '选择订阅计划'}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground text-2xl leading-none disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {loading && plans.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin">
                <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full"></div>
              </div>
              <p className="mt-4 text-muted-foreground">加载中...</p>
            </div>
          ) : (
            <>
              <PricingTable
                plans={plans}
                currentPlanId={currentPlanId}
                onSelectPlan={handleSelectPlan}
                loading={loading}
              />

              {/* 底部操作栏 */}
              <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
                {currentPlanId && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={loading}
                    className="px-6 py-2 text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    取消订阅
                  </button>
                )}
                <div className="flex-1"></div>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-6 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 font-medium disabled:opacity-50"
                >
                  关闭
                </button>
              </div>

              {/* 隐私提示 */}
              <div className="mt-6 p-4 bg-secondary/50 rounded-lg text-xs text-muted-foreground">
                <p className="mb-2">
                  订阅支付由 Stripe 处理，我们使用行业标准的安全协议保护您的支付信息。
                </p>
                <p>
                  订阅会在每月自动续期。您可以随时取消订阅。
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
