import { runSkillPrompt } from './geminiService';
import type { Locale } from '../hooks/useI18n';
import type {
    SkillReport,
    DCFValuationReport,
    EarningsPreviewReport,
    EarningsRecapReport,
    SEPAStrategyReport,
    StartupAnalysisReport,
    EstimateAnalysisReport,
    SkillType,
} from '../types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const langRule = (locale: Locale): string =>
    locale === 'zh'
        ? '所有文本内容必须使用简体中文。数字字段必须是 number 类型（不能是字符串）。'
        : 'All text content must be in English. Numeric fields must be numbers, not strings.';

const jsonRule =
    'You MUST respond with strict, valid JSON only — no markdown fences, no extra commentary. All data MUST come from real-time web search, never from stale memory.';

const withFreshness = <T extends SkillReport>(report: T, skillType: SkillType): T => ({
    ...report,
    skillType,
    dataFreshness: {
        generatedAt: new Date().toISOString(),
        dataAsOf: new Date().toISOString().split('T')[0],
        isRealTimeEnabled: true,
    },
});

// ---------------------------------------------------------------------------
// 1. DCF Valuation (finance-skills/company-valuation)
// ---------------------------------------------------------------------------

const dcfSchema = `{
  "skillType": "dcf-valuation",
  "ticker": "string",
  "companyName": "string",
  "currentPrice": number,
  "dcfImpliedPrice": number,
  "relativeImpliedPrice": number,
  "sotpImpliedPrice": number | null,
  "blendedImpliedPrice": number,
  "upsideDownside": number (percent, e.g. 12.5 means +12.5%),
  "dcfDetails": {
    "assumptions": { "projectionYears": number, "terminalGrowth": number (percent), "wacc": number (percent), "riskFreeRate": number (percent), "beta": number },
    "fcffProjection": [ { "year": "string (e.g. '2026E')", "revenue": number (USD millions), "ebit": number (millions), "fcff": number (millions) } ],
    "terminalValue": number (millions),
    "presentValue": number (millions, enterprise value),
    "equityValue": number (millions)
  },
  "sensitivityMatrix": {
    "waccRange": [number] (5 percent values, e.g. [7.0, 7.5, 8.0, 8.5, 9.0]),
    "gRange": [number] (5 percent values, e.g. [1.5, 2.0, 2.5, 3.0, 3.5]),
    "priceMatrix": [[number]] (5x5: priceMatrix[i][j] = implied price at waccRange[i] x gRange[j])
  },
  "scenarios": {
    "bull": { "price": number, "assumptions": "string" },
    "base": { "price": number, "assumptions": "string" },
    "bear": { "price": number, "assumptions": "string" }
  },
  "relativeValuation": {
    "impliedPrice": number,
    "peers": [ { "ticker": "string", "name": "string", "pe": number, "evRevenue": number, "evEbitda": number } ] (4-6 peers),
    "medianPE": number,
    "medianEVRevenue": number,
    "medianEVEBITDA": number
  },
  "keyRisks": ["string"] (3-5 risks)
}`;

const getDCFSystemInstruction = (locale: Locale): string => `
You are a professional equity valuation analyst, expert in DCF, relative valuation, and SOTP methods, following the finance-skills/company-valuation methodology.

**Core Steps**:
1. Data Collection: Use real-time web search for latest financials (revenue, EBIT, FCF, cash, debt, shares outstanding) and current stock price.
2. DCF Build: 5-year FCFF projection (revenue growth fades from consensus/historical CAGR toward terminal growth). WACC from live 10Y UST risk-free rate, ERP = 5.5%, beta from market data. Terminal value = midpoint of Gordon Growth and exit-multiple methods. Discount to PV, add cash, subtract debt, divide by shares.
3. Relative Valuation: 4-6 same-industry peers; use MEDIAN (not mean) P/E, EV/Revenue, EV/EBITDA; apply to target.
4. SOTP: only for multi-segment companies; otherwise set sotpImpliedPrice to null.
5. Sensitivity: 5x5 matrix of WACC (base ±1%) x terminal growth (1.5%-3.5%).
6. Scenarios: Bull (revenue +3%, margin +2%, WACC -1%, g=3.0%), Base (current), Bear (revenue -3%, margin -2%, WACC +1%, g=1.5%).
7. Blended price: weight DCF 50%, relative 50% (or 40/40/20 if SOTP applies).

**Validation Rules**:
- WACC MUST be greater than terminal growth.
- Terminal value should be 45%-85% of enterprise value; flag in keyRisks if outside.
- If the target has materially higher growth/margins than peers, adjust peer multiples +10-30%.

${jsonRule}
${langRule(locale)}

JSON schema:
${dcfSchema}
`;

export const getDCFValuationAnalysis = async (ticker: string, locale: Locale): Promise<DCFValuationReport> => {
    const prompt = `Perform a comprehensive three-way valuation (DCF + relative + SOTP if applicable) for the stock: ${ticker}. Use the latest real-time market and financial data.`;
    const report = await runSkillPrompt(prompt, getDCFSystemInstruction(locale));
    return withFreshness(report, 'dcf-valuation');
};

// ---------------------------------------------------------------------------
// 2. Earnings Preview (finance-skills/earnings-preview)
// ---------------------------------------------------------------------------

const earningsPreviewSchema = `{
  "skillType": "earnings-preview",
  "ticker": "string",
  "companyName": "string",
  "earningsDate": "string (e.g. '2026-06-25 After Market Close')",
  "consensusEstimates": { "epsEstimate": number, "revenueEstimate": "string (e.g. '$24.5B')" },
  "beatMissHistory": [ { "quarter": "string (e.g. 'Q1 FY26')", "actualEPS": number, "estimatedEPS": number, "surprise": number (percent), "priceReaction": number (1-day percent move) } ] (last 4-8 quarters),
  "analystSentiment": { "upgrades": number, "downgrades": number, "reiterations": number, "netSentiment": "bullish" | "neutral" | "bearish" } (last 30 days),
  "keyMetricsToWatch": ["string"] (4-6 items),
  "catalysts": ["string"] (3-5 items)
}`;

const getEarningsPreviewSystemInstruction = (locale: Locale): string => `
You are an earnings analyst following the finance-skills/earnings-preview methodology.

**Core Steps**:
1. Find the next confirmed (or expected) earnings date via real-time search.
2. Pull current consensus EPS and revenue estimates.
3. Compile the last 4-8 quarters of beat/miss history with the 1-day price reaction after each report.
4. Track analyst rating changes over the last 30 days (upgrades/downgrades/reiterations).
5. Identify the key metrics investors will focus on (guidance, margins, segment growth, user/unit metrics).
6. List the potential catalysts into and out of the print.

${jsonRule}
${langRule(locale)}

JSON schema:
${earningsPreviewSchema}
`;

export const getEarningsPreviewAnalysis = async (ticker: string, locale: Locale): Promise<EarningsPreviewReport> => {
    const prompt = `Generate an earnings preview for the stock: ${ticker}. Use the latest real-time data on its upcoming earnings report.`;
    const report = await runSkillPrompt(prompt, getEarningsPreviewSystemInstruction(locale));
    return withFreshness(report, 'earnings-preview');
};

// ---------------------------------------------------------------------------
// 3. Earnings Recap (finance-skills/earnings-recap)
// ---------------------------------------------------------------------------

const earningsRecapSchema = `{
  "skillType": "earnings-recap",
  "ticker": "string",
  "companyName": "string",
  "quarter": "string (e.g. 'Q1 FY2026')",
  "results": {
    "actualEPS": number, "estimatedEPS": number, "epsSurprise": number (percent),
    "actualRevenue": "string (e.g. '$24.9B')", "estimatedRevenue": "string", "revenueSurprise": number (percent)
  },
  "priceReaction": { "oneDayChange": number (percent), "fiveDayChange": number (percent), "volumeRatio": number (vs 20-day average, e.g. 2.3) },
  "marginTrends": {
    "grossMargin": { "current": number (percent), "prior": number, "yoyChange": number (pct points) },
    "operatingMargin": { "current": number, "prior": number, "yoyChange": number },
    "netMargin": { "current": number, "prior": number, "yoyChange": number }
  },
  "guidance": { "provided": boolean, "summary": "string", "vsConsensus": "above" | "inline" | "below" | "n/a" },
  "managementCommentary": ["string"] (3-5 key quotes/points from the call),
  "analystReactions": [ { "firm": "string", "action": "upgrade" | "downgrade" | "reiterate", "newRating": "string", "newTarget": number } ] (3-6 reactions)
}`;

const getEarningsRecapSystemInstruction = (locale: Locale): string => `
You are an earnings analyst following the finance-skills/earnings-recap methodology.

**Core Steps**:
1. Pull the actual vs estimated EPS and revenue for the specified (or most recent) quarter via real-time search.
2. Calculate surprise percentages.
3. Measure the 1-day and 5-day stock price reaction and volume vs the 20-day average.
4. Compare gross/operating/net margins vs the prior-year quarter.
5. Extract forward guidance and judge it vs consensus.
6. Summarize the most important management commentary from the earnings call.
7. Compile post-earnings analyst reactions (rating/target changes).

${jsonRule}
${langRule(locale)}

JSON schema:
${earningsRecapSchema}
`;

export const getEarningsRecapAnalysis = async (ticker: string, quarter: string, locale: Locale): Promise<EarningsRecapReport> => {
    const quarterText = quarter.trim() ? `for quarter "${quarter}"` : 'for the MOST RECENT reported quarter';
    const prompt = `Generate an earnings recap for the stock: ${ticker}, ${quarterText}. Use the latest real-time data.`;
    const report = await runSkillPrompt(prompt, getEarningsRecapSystemInstruction(locale));
    return withFreshness(report, 'earnings-recap');
};

// ---------------------------------------------------------------------------
// 4. SEPA Strategy (finance-skills/sepa-strategy, Minervini)
// ---------------------------------------------------------------------------

const sepaSchema = `{
  "skillType": "sepa-strategy",
  "ticker": "string",
  "companyName": "string",
  "stageAnalysis": { "currentStage": 1 | 2 | 3 | 4, "stageDescription": "string", "baseCount": number },
  "trendTemplate": {
    "conditions": [
      { "name": "string (condition description)", "pass": boolean, "value": "string (actual reading)" }
    ] (exactly 8 conditions: 1. Price > 150MA & 200MA; 2. 150MA > 200MA; 3. 200MA trending up >= 1 month; 4. 50MA > 150MA & 200MA; 5. Price > 50MA; 6. Price >= 30% above 52w low; 7. Price within 25% of 52w high; 8. RS rating > 70),
    "allPass": boolean
  },
  "fundamentalGrade": "A" | "B" | "C" | "D",
  "fundamentalDetails": { "epsGrowth": number (percent YoY), "epsAcceleration": boolean, "revenueGrowth": number (percent), "marginTrend": "expanding" | "stable" | "contracting", "catalyst": "string" },
  "patternIdentified": { "type": "VCP" | "cup-with-handle" | "flat-base" | "bull-flag" | "high-tight-flag" | "none", "description": "string" },
  "entryPlan": { "pivotPrice": number, "buyZoneLow": number, "buyZoneHigh": number, "stopLoss": number, "firstTarget": number, "rewardRiskRatio": number } | null (null if verdict is pass),
  "positionSizing": null,
  "marketEnvironment": "bull" | "choppy" | "bear",
  "overallVerdict": "strong-buy-setup" | "watch-list" | "pass",
  "verdictReasoning": "string"
}`;

const getSEPASystemInstruction = (locale: Locale): string => `
You are a growth-stock trader applying Mark Minervini's SEPA (Specific Entry Point Analysis) methodology, following finance-skills/sepa-strategy.

**Core Steps** (use real-time price/MA/volume data via web search):
1. Stage Analysis: Identify the Weinstein/Minervini stage (1 basing, 2 advancing, 3 topping, 4 declining) and base count within the current trend.
2. Trend Template: Check ALL 8 conditions strictly; a single failure means allPass = false.
3. Fundamental Check: EPS growth and acceleration, revenue growth, margin trend, catalyst. Grade A-D.
4. Pattern Recognition: VCP, cup-with-handle, flat base, bull flag, high-tight flag, or none.
5. Entry Plan: pivot price, buy zone (pivot to +5%), stop loss (max 7-8% below entry), first target, reward/risk (must be >= 2:1 for a buy setup).
6. Market Environment: bull / choppy / bear based on index trends and breadth.
7. Verdict: strong-buy-setup ONLY if trend template passes, fundamentals A/B, a valid pattern exists, and market is not bear. Otherwise watch-list or pass.

${jsonRule}
${langRule(locale)}

JSON schema:
${sepaSchema}
`;

export const getSEPAStrategyAnalysis = async (ticker: string, locale: Locale): Promise<SEPAStrategyReport> => {
    const prompt = `Perform a SEPA (Specific Entry Point Analysis) for the stock: ${ticker}. Use the latest real-time price, moving average, volume, and fundamental data.`;
    const report = await runSkillPrompt(prompt, getSEPASystemInstruction(locale));
    return withFreshness(report, 'sepa-strategy');
};

// ---------------------------------------------------------------------------
// 5. Startup Analysis (finance-skills/startup-analysis)
// ---------------------------------------------------------------------------

const startupSchema = `{
  "skillType": "startup-analysis",
  "companyName": "string",
  "companyOverview": "string (2-3 sentence overview: what it does, founding year, funding raised)",
  "vcInvestorPerspective": {
    "marketSize": { "tam": "string (e.g. '$50B')", "sam": "string", "som": "string" },
    "productMarketFit": "string",
    "teamQuality": "string",
    "traction": "string",
    "competitiveAdvantage": "string",
    "investmentThesis": "string",
    "risks": ["string"] (3-5),
    "verdict": "pass" | "maybe" | "invest"
  },
  "jobApplicantPerspective": {
    "companyStage": "string (e.g. 'Series B')",
    "growthTrajectory": "string",
    "learningOpportunities": ["string"] (2-4),
    "compensationStructure": "string",
    "careerRisk": "string",
    "verdict": "avoid" | "consider" | "strong-fit"
  },
  "founderPerspective": {
    "competitiveLandscape": "string",
    "goToMarketStrategy": "string",
    "fundingStrategy": "string",
    "keyMilestones": ["string"] (3-5),
    "exitScenarios": ["string"] (2-4)
  }
}`;

const getStartupSystemInstruction = (locale: Locale): string => `
You are a multi-perspective startup analyst following the finance-skills/startup-analysis methodology. Analyze the given startup from THREE distinct viewpoints, using real-time web search for funding history, team background, product reviews, and market data:

1. **VC Investor**: TAM/SAM/SOM, product-market fit, team quality, traction, moat, investment thesis, risks, and a clear verdict.
2. **Job Applicant**: company stage, growth trajectory, learning opportunities, compensation structure (cash vs equity), career risk, verdict.
3. **Founder/CEO**: competitive landscape, go-to-market strategy, funding strategy, key milestones for the next 18 months, plausible exit scenarios.

Be honest and balanced — highlight red flags as prominently as strengths.

${jsonRule}
${langRule(locale)}

JSON schema:
${startupSchema}
`;

export const getStartupAnalysis = async (companyNameOrUrl: string, locale: Locale): Promise<StartupAnalysisReport> => {
    const prompt = `Analyze this startup from VC investor, job applicant, and founder perspectives: ${companyNameOrUrl}. Use the latest real-time information.`;
    const report = await runSkillPrompt(prompt, getStartupSystemInstruction(locale));
    return withFreshness(report, 'startup-analysis');
};

// ---------------------------------------------------------------------------
// 6. Estimate Analysis (finance-skills/estimate-analysis)
// ---------------------------------------------------------------------------

const estimateSchema = `{
  "skillType": "estimate-analysis",
  "ticker": "string",
  "companyName": "string",
  "revisionTrends": {
    "last30Days": { "up": number, "down": number, "net": number },
    "last90Days": { "up": number, "down": number, "net": number },
    "momentum": "positive" | "neutral" | "negative"
  },
  "growthProjections": {
    "currentYear": { "eps": number, "growth": number (percent) },
    "nextYear": { "eps": number, "growth": number (percent) },
    "longTermGrowth": number (percent CAGR)
  },
  "historicalAccuracy": {
    "avgBeatMiss": number (avg percent surprise over last 8 quarters),
    "consistency": "high" | "medium" | "low",
    "direction": "consistently-beats" | "mixed" | "consistently-misses"
  },
  "analystCoverage": {
    "totalAnalysts": number, "buyRatings": number, "holdRatings": number, "sellRatings": number,
    "avgTargetPrice": number, "highTarget": number, "lowTarget": number, "currentPrice": number
  },
  "interpretation": "string (3-5 sentence synthesis of what the estimate data implies for investors)"
}`;

const getEstimateSystemInstruction = (locale: Locale): string => `
You are a sell-side estimate analyst following the finance-skills/estimate-analysis methodology. Use real-time web search to deep-dive into Wall Street consensus for the given stock:

1. **Revision Trends**: count of upward vs downward EPS estimate revisions over the last 30 and 90 days; classify momentum.
2. **Growth Projections**: consensus EPS and growth for current year, next year, and long-term CAGR.
3. **Historical Accuracy**: average earnings surprise over the last 8 quarters; classify consistency and direction.
4. **Analyst Coverage**: total analysts, buy/hold/sell distribution, average/high/low target price vs current price.
5. **Interpretation**: synthesize what this means — is the consensus rising or falling, is the stock priced for beats, where is the risk?

${jsonRule}
${langRule(locale)}

JSON schema:
${estimateSchema}
`;

export const getEstimateAnalysis = async (ticker: string, locale: Locale): Promise<EstimateAnalysisReport> => {
    const prompt = `Deep-dive into Wall Street analyst estimates for the stock: ${ticker}. Use the latest real-time consensus data.`;
    const report = await runSkillPrompt(prompt, getEstimateSystemInstruction(locale));
    return withFreshness(report, 'estimate-analysis');
};
