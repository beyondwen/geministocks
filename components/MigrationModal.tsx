// src/components/MigrationModal.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { SyncService } from '../services/syncService';
import { useI18n } from '../hooks/useI18n';

interface MigrationModalProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function MigrationModal({ onComplete, onSkip }: MigrationModalProps) {
  const { getToken } = useAuth();
  const { t } = useI18n();
  const [migrating, setMigrating] = useState(false);
  const [localData, setLocalData] = useState<any>(null);

  useEffect(() => {
    const checkLocalData = () => {
      try {
        const credits = parseInt(localStorage.getItem('gemini-claude-credits') || '0', 10);
        const topicHistory = JSON.parse(localStorage.getItem('gemini-analysis-history') || '[]');
        const stockHistory = JSON.parse(localStorage.getItem('gemini-stock-analysis-history') || '[]');
        const positionalWarfareHistory = JSON.parse(localStorage.getItem('gemini-positional-warfare-history') || '[]');

        const totalAnalyses = topicHistory.length + stockHistory.length + positionalWarfareHistory.length;

        if (credits > 0 || totalAnalyses > 0) {
            setLocalData({
              credits,
              topicHistory,
              stockHistory,
              positionalWarfareHistory,
              totalAnalyses,
            });
        }
      } catch (error) {
        console.error('Failed to read local data for migration:', error);
      }
    };

    checkLocalData();
  }, []);

  const handleMigrate = async () => {
    if (!localData) return;
    setMigrating(true);
    try {
      const syncService = new SyncService('', getToken);

      await syncService.migrateLocalData({
        credits: localData.credits,
        topicHistory: localData.topicHistory,
        stockHistory: localData.stockHistory,
        positionalWarfareHistory: localData.positionalWarfareHistory,
      });

      // Migration successful, clear local data
      localStorage.removeItem('gemini-claude-credits');
      localStorage.removeItem('gemini-analysis-history');
      localStorage.removeItem('gemini-stock-analysis-history');
      localStorage.removeItem('gemini-positional-warfare-history');
      localStorage.setItem('migrated-to-cloud', 'true');

      alert('数据迁移成功！您的所有数据已安全保存到云端。');
      onComplete();
    } catch (error) {
      console.error('Migration failed:', error);
      alert('迁移失败：' + (error as Error).message);
    } finally {
      setMigrating(false);
    }
  };

  if (!localData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">🔄 发现本地数据</h2>
        <div className="space-y-3 mb-6">
          <p className="text-gray-700">检测到您的浏览器中有以下数据：</p>
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">信用点:</span><span className="font-semibold text-blue-700">{localData.credits} 💎</span></div>
              <div className="flex justify-between"><span className="text-gray-600">分析记录:</span><span className="font-semibold text-blue-700">{localData.totalAnalyses} 条</span></div>
            </div>
          </div>
          <p className="text-sm text-gray-600">是否将这些数据迁移到您的云端账户？迁移后数据将在所有设备上同步。</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleMigrate} disabled={migrating} className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{migrating ? '迁移中...' : '迁移到云端'}</button>
          <button onClick={onSkip} disabled={migrating} className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors">暂不迁移</button>
        </div>
        <p className="text-xs text-gray-500 mt-4">提示：如果暂不迁移，您的数据将继续保存在本地浏览器中。</p>
      </div>
    </div>
  );
}
