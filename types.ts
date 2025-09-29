import { ChartBarIcon, DocumentTextIcon, SparklesIcon } from "./components/icons/Icons";

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface StockTicker {
  name: string;
  ticker: string;
  market: 'A-Share' | 'Hong Kong' | 'US' | 'Crypto' | 'Futures' | 'Other';
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

export interface InvestmentScore {
  score: number;
  reason: string;
}

export interface TieredSuggestions {
  coreHoldings: StockTicker[];
  strategicSatellites: StockTicker[];
  watchlist: StockTicker[];
}

export interface AnalysisReport {
  summary: string;
  keyTakeaways: string[];
  investmentScore: InvestmentScore;
  analysis: {
    macroPolicy: string;
    industryChain: IndustryChain | string;
    companyFundamentals: string;
    marketSentiment: MarketSentiment;
  };
  marketSizeAndOutlook: string;
  investmentStrategy: {
    logic: string;
    suggestion: string;
    risks: string;
  };
  allocationCadenceAndOutlook: string;
  tieredSuggestions: TieredSuggestions;
  sources?: GroundingSource[];
}

export interface TopicHistoryEntry {
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
  keyTakeaways: string[];
  investmentScore: InvestmentScore;
  financialSummary: FinancialSummary;
  swotAnalysis: SWOT;
  investmentThesis: InvestmentThesis;
  riskAnalysis: RiskAnalysis;
  corporateGovernance: CorporateGovernance;
  esgRating: ESGRating;
  sources?: GroundingSource[];
}

export interface StockHistoryEntry {
  id: number;
  query: string;
  report: StockAnalysisReport;
}

// --- New Types for Positional Warfare Analysis ---
export interface LeaderStockProfile {
    name: string;
    ticker: string;
    sector: string;
    market: string;
    analysis: string;
}

export interface FollowerCandidate {
    name: string;
    ticker: string;
    market: string;
    comparativeAnalysis: string;
    investmentThesis: string;
    risks: string;
}

export interface PositionalWarfareReport {
    leaderStock: LeaderStockProfile;
    followerCandidates: FollowerCandidate[];
}

export interface PositionalWarfareHistoryEntry {
  id: number;
  leaderStockQuery: string;
  report: PositionalWarfareReport;
}

// --- Deprecated Types (Kept for reference, can be removed later) ---
/** @deprecated Use TopicHistoryEntry instead */
export type HistoryEntry = TopicHistoryEntry;