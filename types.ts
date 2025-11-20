
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

export interface PolymarketData {
  question: string;
  yesOdds: number;
  noOdds: number;
  totalVolume: string;
}

// --- New Types for Deepened Analysis ---

export interface TAM_SAM_SOM {
  TAM: string;
  SAM: string;
  SOM: string;
  sourceOrMethodology: string;
}

export interface Scenario {
  scenario: 'Bull Case' | 'Base Case' | 'Bear Case';
  description: string;
  probability: number; // e.g., 0.2 for 20%
  keyDrivers: string[];
}

export interface TimeHorizonStrategy {
  shortTerm: string; // 1-3 months
  mediumTerm: string; // 3-12 months
  longTerm: string; // >1 year
}

// --- New Types for Topic Analysis Enhancement ---
export interface KeyPlayer {
  name: string;
  marketShare: string;
  techAdvantage: string;
  revenueGrowth: string;
  grossMargin: string;
  stockPerformance: string;
}

export interface CompetitiveLandscape {
  keyPlayers: KeyPlayer[];
  summary: string;
}

export interface RecentEvent {
  date: string; // "YYYY-MM-DD"
  description: string;
  impact: 'Positive' | 'Negative' | 'Neutral';
}

export interface UpcomingCatalyst {
  date: string; // "YYYY-MM-DD" or "Q3 2024"
  event: string;
}

export interface CatalystTracker {
  recentNews: RecentEvent[];
  upcomingCatalysts: UpcomingCatalyst[];
}

export interface PolicyAnalysis {
  keyBodies: string[];
  currentPolicies: string;
  assessment: 'Headwind' | 'Tailwind' | 'Neutral';
  potentialChanges: string;
}

export interface TechTrajectory {
  coreTech: string;
  maturity: 'Emerging' | 'Maturing' | 'Mainstream';
  innovationTrends: string[];
  moatAnalysis: string;
}


export interface AnalysisReport {
  modelUsed?: string;
  summary: string;
  investmentScore: InvestmentScore;
  analysis: {
    macroPolicy?: string; // Deprecated: Moved to policyAnalysis
    industryChain: IndustryChain | string;
    companyFundamentals?: string; // Deprecated: Covered by competitiveLandscape/techTrajectory
    marketSentiment?: MarketSentiment;
  };
  marketSizeAndOutlook: {
    narrative: string;
    tamSamSom: TAM_SAM_SOM;
  };
  // New Enhanced Modules
  competitiveLandscape?: CompetitiveLandscape;
  catalystTracker?: CatalystTracker;
  policyAnalysis?: PolicyAnalysis;
  techTrajectory?: TechTrajectory;
  // ---
  scenarioAnalysis: Scenario[];
  investmentStrategy: {
    logic: string;
    suggestion: string;
    timeHorizons: TimeHorizonStrategy;
  };
  tieredSuggestions: TieredSuggestions;
  sources?: GroundingSource[];
  polymarketData?: PolymarketData;
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

// --- New Types for Institutional Research Consensus ---
export interface EpsForecast {
  year: string; // e.g., "2024E", "2025E", "2026E"
  consensusEps: number | null;
  growthRate: number | null; // as a percentage, e.g., 15.5 for 15.5%
}

export interface TargetPriceSummary {
  high: number | null;
  low: number | null;
  average: number | null;
}

export interface RecentReport {
  title: string;
  institution: string;
  rating: string;
  publishDate: string; // "YYYY-MM-DD"
  pdfUrl: string;
}

export interface ResearchReportConsensus {
  currentPrice: number | null;
  epsForecasts: EpsForecast[];
  targetPriceSummary: TargetPriceSummary;
  recentReports: RecentReport[];
}

export interface MarketSentimentAnalysis {
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  description: string;
  strategyImpact: string;
}

// --- New Types for Professional-Grade Stock Analysis ---
export interface KeyExecutive {
  name: string;
  title: string;
  summary: string;
}

export interface ManagementAnalysis {
  keyExecutives: KeyExecutive[];
  insiderTradingSummary: string;
}

export interface TechnicalAnalysis {
  summary: string;
  rsi: {
    value: number;
    interpretation: 'Overbought' | 'Oversold' | 'Neutral';
  };
  movingAverages: {
    '50-day': 'Above' | 'Below';
    '200-day': 'Above' | 'Below';
  };
}

export interface FinancialRatio {
  value: string;
  industryAverage: string;
}

export interface FinancialHealthAnalysis {
  solvency: FinancialRatio; // Debt-to-Equity
  efficiency: FinancialRatio; // ROE
  liquidity: FinancialRatio; // Current Ratio
}

export interface EarningsCallHighlight {
  question: string;
  answer: string;
}

export interface EarningsCallAnalysis {
  managementTone: 'Optimistic' | 'Cautious' | 'Pessimistic' | 'Neutral';
  keyHighlights: EarningsCallHighlight[];
  futureGuidance: string;
}


export interface StockAnalysisReport {
  companyProfile: CompanyProfile;
  investmentScore: InvestmentScore;
  marketSentimentAnalysis: MarketSentimentAnalysis;
  financialTrends: FinancialTrend[];
  valuationAnalysis: ValuationAnalysis;
  peerComparison: PeerCompetitor[];
  swotAnalysis: SWOT;
  investmentThesis: InvestmentThesis;
  riskAnalysis: RiskAnalysis;
  // Professional-Grade Modules
  managementAnalysis: ManagementAnalysis;
  technicalAnalysis: TechnicalAnalysis;
  financialHealth: FinancialHealthAnalysis;
  earningsCallAnalysis: EarningsCallAnalysis;
  // ---
  sources?: GroundingSource[];
  researchReportConsensus?: ResearchReportConsensus;
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

// --- Association Analysis Types ---

export interface AssociationStockNode {
  name: string;
  reason: string;
}

export interface AssociationTopicNode {
  name: string;
  reason: string;
}

export interface AssociationAnalysis {
  relatedStocks: AssociationStockNode[];
  relatedTopics: AssociationTopicNode[];
}

// --- Deprecated Types (Kept for reference, can be removed later) ---
/** @deprecated Use TopicHistoryEntry instead */
export type HistoryEntry = TopicHistoryEntry;
