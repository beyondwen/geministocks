

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

// --- New Types for Stock Analysis ---

export interface CompanyProfile {
  name: string;
  ticker: string;
  exchange: string;
  sector: string;
  industry: string;
  summary: string;
}

export interface FinancialMetric {
  metric: string;
  value: string;
  comment: string;
}

export interface FinancialSummary {
  period: string;
  highlights: FinancialMetric[];
}

export interface SWOT {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface InvestmentThesis {
  bull: string;
  bear: string;
  conclusion: string;
}

export interface RiskAnalysis {
  level: 'High' | 'Medium' | 'Low';
  description: string;
  factors: string[];
}

export interface CorporateGovernance {
    summary: string;
}

export interface ESGRating {
    rating: string;
    summary: string;
}

export interface StockAnalysisReport {
  companyProfile: CompanyProfile;
  financialSummary: FinancialSummary;
  swotAnalysis: SWOT;
  investmentThesis: InvestmentThesis;
  riskAnalysis: RiskAnalysis;
  corporateGovernance: CorporateGovernance;
  esgRating: ESGRating;
}