
export interface StockTicker {
  name: string;
  ticker: string;
  market: 'A-Share' | 'Hong Kong' | 'US' | 'Other';
  reason: string;
  relevance: 'High' | 'Medium' | 'Low';
}

export interface MarketSentiment {
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  description: string;
}

export interface AnalysisReport {
  summary: string;
  analysis: {
    macroPolicy: string;
    industryChain: string;
    companyFundamentals: string;
    marketSentiment: MarketSentiment;
  };
  investmentStrategy: {
    logic: string;
    suggestion: string;
    risks: string;
  };
  recommendedStocks: StockTicker[];
}

export interface HistoryEntry {
  id: number;
  topic: string;
  report: AnalysisReport;
  shareId?: string;
}
