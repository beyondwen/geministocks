// src/services/syncService.ts
import type { AnalysisReport, StockAnalysisReport, PositionalWarfareReport } from '../types';
import type { AnalysisModel } from '../api/analyze';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export class SyncService {
  private baseUrl: string;
  private getToken: () => Promise<string | null>;

  constructor(baseUrl: string, getToken: () => Promise<string | null>) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  private async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Request failed');
    }

    return data.data as T;
  }

  async getProfile() {
    return this.fetchWithAuth<{
      id: string; email: string; username?: string; avatarUrl?: string; createdAt: string; totalAnalysesCount: number; migratedFromLocal: boolean;
    }>('/api/user/profile');
  }

  async getCredits() {
    return this.fetchWithAuth<{
      balance: number; dailyFreeCredits: number; dailyFreeUsed: number; dailyFreeRemaining: number; lastFreeAwardDate: string | null; awarded: number;
    }>('/api/credits/balance');
  }

  async useCredits(amount: number, model: string, analysisId?: number, isDailyFreeUse: boolean = false) {
    return this.fetchWithAuth<{
      newBalance: number; transactionId: number; usedDailyFree: boolean; newDailyFreeUsed: number;
    }>('/api/credits/use', {
      method: 'POST',
      body: JSON.stringify({ amount, model, analysisId, isDailyFreeUse }),
    });
  }

  async refundLastTx() {
    try {
      return await this.fetchWithAuth<any>('/api/credits/refund', { method: 'POST' });
    } catch(e) {
      console.error("Refund failed:", e);
    }
  }

  async saveAnalysis(analysis: {
    analysisType: 'topic' | 'stock' | 'positional_warfare';
    inputQuery: string;
    model: AnalysisModel;
    creditCost: number;
    result: AnalysisReport | StockAnalysisReport | PositionalWarfareReport;
    executionTimeMs?: number;
  }) {
    return this.fetchWithAuth<{ id: number; createdAt: string; }>('/api/analysis/save', {
      method: 'POST',
      body: JSON.stringify(analysis),
    });
  }

  async getHistory(type: 'topic' | 'stock' | 'positional_warfare' | 'all' = 'all', limit: number = 50, offset: number = 0) {
    return this.fetchWithAuth<{
      items: Array<{ id: number; analysisType: string; inputQuery: string; model: string; creditCost: number; result: any; createdAt: string; }>;
      total: number;
      hasMore: boolean;
    }>(`/api/analysis/list?type=${type}&limit=${limit}&offset=${offset}`);
  }

  async deleteAnalysis(id: number) {
    return this.fetchWithAuth<{ deleted: boolean }>(`/api/analysis/${id}`, {
      method: 'DELETE',
    });
  }

  async migrateLocalData(localData: {
    credits?: number;
    topicHistory?: any[];
    stockHistory?: any[];
    positionalWarfareHistory?: any[];
  }) {
    return this.fetchWithAuth<{
      migratedCredits: number;
      migratedAnalyses: number;
      message: string;
    }>('/api/user/migrate', {
      method: 'POST',
      body: JSON.stringify({ localData }),
    });
  }
}
