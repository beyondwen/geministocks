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

// --- New Types for Stock Analysis Enhancement ---

export interface FinancialTrend {
  year: string;
  revenue: number; // in millions of the reporting currency
  netIncome: number; // in millions of the reporting currency
}

export interface ValuationAnalysis {
  judgment: 'undervalued' | 'fairly valued' | 'overvalued';
  methodology: string;
  targetPriceRange: string;
  reasoning: string;
}

export interface PeerCompetitor {
  name: string;
  ticker: string;
  marketCap: string;
  peRatio: string;
  revenueGrowth: string;
  grossMargin: string;
}

export interface RecentNewsItem {
  title: string;
  summary: string;
  impact: 'Positive' | 'Neutral' | 'Negative';
}

export interface StockAnalysisReport {
  companyProfile: CompanyProfile;
  keyTakeaways: string[];
  investmentScore: InvestmentScore;
  financialTrends: FinancialTrend[];
  valuationAnalysis: ValuationAnalysis;
  peerComparison: PeerCompetitor[];
  recentNews: RecentNewsItem[];
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

// --- Enhanced Types for Positional Warfare Analysis ---
export interface StockFinancialMetrics {
    marketCap: string;        // e.g., "1.2T USD"
    peRatio: string;          // e.g., "25.x"
    revenueGrowth: string;    // e.g., "15% YoY"
    recentPerformance: string; // e.g., "+30% in last 3 months"
}

export interface LeaderStockProfile {
    name: string;
    ticker: string;
    sector: string;
    market: string;
    analysis: string; // The qualitative reason it's a leader
    metrics: StockFinancialMetrics;
}

export interface FollowerCandidate {
    name: string;
    ticker: string;
    market: string;
    metrics: StockFinancialMetrics;
    comparativeAnalysis: string; // How it compares to the leader
    investmentThesis: string;    // The core logic for it to "catch up"
    potentialCatalysts: string[];
    risks: string[];
    positioningScore: {
        score: number; // 1-10
        reasoning: string;
    };
}

export interface PositionalWarfareReport {
    strategistSummary: string; // The final takeaway at the top
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