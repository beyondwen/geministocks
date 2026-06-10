/**
 * 订阅 Hook
 * 管理用户订阅相关的状态和操作
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getUserSubscription,
  getSubscriptionPlans,
  canPerformAnalysis,
  recordAnalysisUsage,
  UserSubscription,
  SubscriptionPlan,
} from '../services/subscriptionService';

interface UseSubscriptionReturn {
  subscription: UserSubscription | null;
  plans: SubscriptionPlan[];
  loading: boolean;
  error: string | null;
  canPerformAnalysis: boolean;
  analysisLimitReached: boolean;
  analysisMessage: string;
  refreshSubscription: () => Promise<void>;
  recordUsage: () => Promise<void>;
}

export function useSubscription(userId: string): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canAnalyze, setCanAnalyze] = useState(true);
  const [analysisMessage, setAnalysisMessage] = useState('');

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true);
      const [sub, availablePlans] = await Promise.all([
        getUserSubscription(userId),
        getSubscriptionPlans(),
      ]);

      setSubscription(sub);
      setPlans(availablePlans);
      setError(null);

      // 检查是否可以进行分析
      if (sub) {
        const result = await canPerformAnalysis(userId);
        setCanAnalyze(result.allowed);
        setAnalysisMessage(result.reason || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
      console.error('Failed to load subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const recordUsage = useCallback(async () => {
    try {
      await recordAnalysisUsage(userId);
      // 重新加载订阅信息以获取最新的使用情况
      await loadSubscription();
    } catch (err) {
      console.error('Failed to record usage:', err);
    }
  }, [userId, loadSubscription]);

  useEffect(() => {
    if (userId) {
      loadSubscription();
    }
  }, [userId, loadSubscription]);

  return {
    subscription,
    plans,
    loading,
    error,
    canPerformAnalysis: canAnalyze,
    analysisLimitReached: !canAnalyze && subscription?.plan?.analysisLimitPerMonth !== null,
    analysisMessage,
    refreshSubscription: loadSubscription,
    recordUsage,
  };
}

export default useSubscription;
