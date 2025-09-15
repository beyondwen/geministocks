

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

export interface IndustryChainNode {
  name: string;
  description: string;
}

export interface IndustryChain {
  upstream: IndustryChainNode[];
  midstream: IndustryChainNode[];
  downstream: IndustryChainNode[];
}

export interface AnalysisReport {
  summary: string;
  analysis: {
    macroPolicy: string;
    industryChain: IndustryChain | string;
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
}