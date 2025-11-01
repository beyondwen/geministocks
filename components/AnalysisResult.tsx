import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { toPng } from 'html-to-image';
import type { AnalysisReport, InvestmentScore, PolymarketData, Scenario, TimeHorizonStrategy, RiskFactor, TAM_SAM_SOM, CompetitiveLandscape, CatalystTracker, PolicyAnalysis, TechTrajectory } from '../types';
import { DownloadIcon, SparklesIcon, CheckCircleIcon, DocumentArrowDownIcon, LinkIcon, BuildingStorefrontIcon, ChartTrendingUpIcon, LightBulbIcon, ExclamationTriangleIcon, MarkdownIcon, ChartTrendingUpIcon as TrendingUpIcon, TrendingDownIcon, ScaleIcon, ShieldCheckIcon, CalendarIcon, TrophyIcon, MegaphoneIcon, BeakerIcon } from './icons/Icons';
import TieredSuggestionsDisplay from './TieredSuggestionsDisplay';
import IndustryChainViz from './IndustryChainViz';
import TextRenderer from './TextRenderer';
import AssociationAnalysisGraph from './AssociationAnalysisGraph';
import { useI18n } from '../hooks/useI18n';
import { analysisReportToMarkdown } from '../services/markdownService';

const GlobeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.25 9.75h17.5M9 3.25c.75-1.5 2.5-2.25 4.5-2.25 2.5 0 4.5 1.5 4.5 3.75 0 1.95-1.25 3.5-3.25 3.5-.75 0-1.5-.25-2.25-.75" />
  </svg>
);

const DiagramIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
  </svg>
);

const ChartPieIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 100 15 7.5 7.5 0 000-15z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
    </svg>
);

const StrategyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 2.44A14.98 14.98 0 002.44 14.37a14.98 14.98 0 007.75 8.22m0 0v-4.8m-7.75 4.8l-3.3-3.3m0 0a14.98 14.98 0 011.55-5.99m2.08 7.54l-2.08-2.08m0 0l-2.08 2.08m2.08-2.08l2.08 2.08m-2.08-2.08l2.08-2.08" />
    </svg>
);

const SentimentIndicator: React.FC<{ sentiment: 'Positive' | 'Neutral' | 'Negative' }> = ({ sentiment }) => {
    const { t } = useI18n();
    const sentimentConfig = {
      Positive: {
        label: t('sentiments.Positive'),
        icon: '😊',
      },
      Neutral: {
        label: t('sentiments.Neutral'),
        icon: '😐',
      },
      Negative: {
        label: t('sentiments.Negative'),
        icon: '😟',
      },
    };
  
    const config = sentimentConfig[sentiment] || sentimentConfig.Neutral;
  
    return (
       <div className={`border border-gray-200 bg-white rounded-xl px-4 py-3 shadow-sm inline-flex items-center gap-3 font-medium transition-all duration-300`}>
            <div className={`w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center`}>
                <span className="text-sm">{config.icon}</span>
            </div>
            <span className="whitespace-nowrap text-black">{config.label}</span>
        </div>
    );
};

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
  <div className={`bg-white border border-stone-200/90 rounded-2xl p-6 shadow-sm ${className}`}>
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-black rounded-xl shadow-lg">
        <span className="w-5 h-5 text-white block">{icon}</span>
      </div>
      <h3 className="text-xl font-semibold text-black">{title}</h3>
    </div>
    <div className="text-gray-700 space-y-4 leading-relaxed">{children}</div>
  </div>
);

const ScoreDisplay: React.FC<{ scoreData: InvestmentScore }> = ({ scoreData }) => {
  const { t } = useI18n();
  const { score, reason } = scoreData;

  return (
    <div className={`bg-white border-2 border-stone-200/90 rounded-2xl p-6 shadow-sm hover:shadow-elevated transition-all duration-300`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center mb-4 sm:mb-0">
          <div className={`p-2 bg-black rounded-xl shadow-lg mr-3`}>
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-2xl font-light text-black">{t('scoreDisplay.title')}</h3>
        </div>
        <div className="text-center sm:text-right">
          <div className="relative">
            <p className={`text-5xl tracking-tight font-bold`} style={{ color: '#ED702E' }}>
              {score}
              <span className="text-2xl font-medium opacity-70 text-gray-500">/100</span>
            </p>
            <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-1 rounded-full opacity-60`} style={{ backgroundColor: '#ED702E' }}></div>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200/60">
        <p className="text-sm text-gray-600 leading-relaxed"><TextRenderer text={reason} /></p>
      </div>
    </div>
  );
};

const PolymarketInfoCard: React.FC<{ data: PolymarketData }> = ({ data }) => {
  const { t } = useI18n();
  const yesPercentage = (data.yesOdds * 100).toFixed(0);
  const noPercentage = (data.noOdds * 100).toFixed(0);

  return (
    <Card title={t('polymarketCard.title')} icon={<ChartTrendingUpIcon className="w-5 h-5"/>}>
      <div className="space-y-4">
        <blockquote className="text-black font-semibold text-lg border-l-4 border-gray-400 pl-4 py-2 bg-gray-100 rounded-r-lg">
          {data.question}
        </blockquote>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {/* Yes Odds */}
          <div className="p-4 bg-gray-100 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-black mb-1">{t('polymarketCard.yesOdds')}</p>
            <p className="text-4xl font-bold" style={{ color: '#ED702E' }}>{yesPercentage}%</p>
          </div>
          {/* No Odds */}
          <div className="p-4 bg-gray-100 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-black mb-1">{t('polymarketCard.noOdds')}</p>
            <p className="text-4xl font-bold text-black">{noPercentage}%</p>
          </div>
          {/* Total Volume */}
          <div className="p-4 bg-gray-100 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-black mb-1">{t('polymarketCard.volume')}</p>
            <p className="text-4xl font-bold text-gray-600">{data.totalVolume}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

// --- New Deepened Analysis Components ---

const MarketSizeCard: React.FC<{ narrative: string; tamSamSom: TAM_SAM_SOM }> = ({ narrative, tamSamSom }) => {
    const { t } = useI18n();
    return (
        <Card title={t('analysisResult.marketSizeTitle')} className="md:col-span-2" icon={<ChartPieIcon className="w-5 h-5"/>}>
            <TextRenderer text={narrative} />
            {tamSamSom && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-gray-100 rounded-lg"><p className="text-sm font-semibold text-black">TAM</p><p className="text-lg font-bold text-black">{tamSamSom.TAM}</p></div>
                        <div className="p-3 bg-gray-100 rounded-lg"><p className="text-sm font-semibold text-black">SAM</p><p className="text-lg font-bold text-black">{tamSamSom.SAM}</p></div>
                        <div className="p-3 bg-gray-100 rounded-lg"><p className="text-sm font-semibold text-black">SOM</p><p className="text-lg font-bold text-black">{tamSamSom.SOM}</p></div>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-2 italic">{t('analysisResult.source')}: {tamSamSom.sourceOrMethodology}</p>
                </div>
            )}
        </Card>
    );
};

const ScenarioAnalysisCard: React.FC<{ scenarios: Scenario[] }> = ({ scenarios }) => {
    const { t } = useI18n();
    const scenarioConfig = {
        'Bull Case': { icon: <TrendingUpIcon className="w-5 h-5 text-green-600"/>, title: t('scenarioAnalysis.bull'), color: 'border-green-500' },
        'Base Case': { icon: <ScaleIcon className="w-5 h-5 text-gray-600"/>, title: t('scenarioAnalysis.base'), color: 'border-gray-500' },
        'Bear Case': { icon: <TrendingDownIcon className="w-5 h-5 text-red-600"/>, title: t('scenarioAnalysis.bear'), color: 'border-red-500' },
    };
    return (
        <Card title={t('scenarioAnalysis.title')} icon={<SparklesIcon className="w-5 h-5"/>} className="md:col-span-2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {scenarios.map((s, i) => {
                    const config = scenarioConfig[s.scenario];
                    return (
                        <div key={i} className={`flex flex-col p-4 border-l-4 rounded-r-lg bg-gray-100/50 ${config.color}`}>
                           <div className="flex justify-between items-center mb-2">
                               <h4 className="font-bold text-lg text-black flex items-center gap-2">{config.icon}{config.title}</h4>
                               <span className="text-sm font-semibold text-black bg-gray-200 px-2 py-0.5 rounded-full">{(s.probability * 100).toFixed(0)}%</span>
                           </div>
                           <p className="text-sm text-gray-700 flex-grow"><TextRenderer text={s.description} /></p>
                           <div className="mt-3 pt-3 border-t border-gray-200">
                               <h5 className="text-xs font-semibold text-black mb-1">{t('scenarioAnalysis.drivers')}</h5>
                               <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                                   {s.keyDrivers.map((d, j) => <li key={j}>{d}</li>)}
                               </ul>
                           </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

const TimeHorizonStrategyCard: React.FC<{ horizons: TimeHorizonStrategy }> = ({ horizons }) => {
    const { t } = useI18n();
    return (
        <Card title={t('timeHorizon.title')} icon={<CalendarIcon className="w-5 h-5"/>} className="md:col-span-2">
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-black">{t('timeHorizon.shortTerm')}</h4>
                    <p className="text-sm text-gray-700 pl-4 border-l-2 border-gray-300 ml-1 mt-1"><TextRenderer text={horizons.shortTerm}/></p>
                </div>
                 <div>
                    <h4 className="font-semibold text-black">{t('timeHorizon.mediumTerm')}</h4>
                    <p className="text-sm text-gray-700 pl-4 border-l-2 border-gray-300 ml-1 mt-1"><TextRenderer text={horizons.mediumTerm}/></p>
                </div>
                 <div>
                    <h4 className="font-semibold text-black">{t('timeHorizon.longTerm')}</h4>
                    <p className="text-sm text-gray-700 pl-4 border-l-2 border-gray-300 ml-1 mt-1"><TextRenderer text={horizons.longTerm}/></p>
                </div>
            </div>
        </Card>
    );
};

const RiskMatrixCard: React.FC<{ risks: RiskFactor[] }> = ({ risks }) => {
    const { t } = useI18n();
    const levelColors = {
        'High': 'bg-red-100 text-red-800',
        'Medium': 'bg-yellow-100 text-yellow-800',
        'Low': 'bg-green-100 text-green-800',
    };
    return (
        <Card title={t('riskMatrix.title')} icon={<ShieldCheckIcon className="w-5 h-5"/>} className="md:col-span-2">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="text-left font-semibold text-black p-3 w-1/3">{t('riskMatrix.risk')}</th>
                            <th className="text-center font-semibold text-black p-3">{t('riskMatrix.probability')}</th>
                            <th className="text-center font-semibold text-black p-3">{t('riskMatrix.impact')}</th>
                            <th className="text-left font-semibold text-black p-3 w-1/2">{t('riskMatrix.mitigation')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {risks.map((r, i) => (
                            <tr key={i} className="border-b border-gray-200 last:border-b-0">
                                <td className="p-3 font-medium text-black">{r.risk}</td>
                                <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${levelColors[r.probability]}`}>{r.probability}</span></td>
                                <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${levelColors[r.impact]}`}>{r.impact}</span></td>
                                <td className="p-3 text-gray-700">{r.mitigation}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

// --- New Professional-Grade Topic Analysis Components ---

const CompetitiveLandscapeCard: React.FC<{ landscape: CompetitiveLandscape }> = ({ landscape }) => {
    const { t } = useI18n();
    return (
        <Card title={t('competitiveLandscape.title')} icon={<TrophyIcon className="w-5 h-5"/>} className="md:col-span-2">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="text-left font-semibold text-black p-3">{t('competitiveLandscape.player')}</th>
                            <th className="text-left font-semibold text-black p-3">{t('competitiveLandscape.marketShare')}</th>
                            <th className="text-left font-semibold text-black p-3">{t('competitiveLandscape.techAdvantage')}</th>
                            <th className="text-right font-semibold text-black p-3">{t('competitiveLandscape.revenueGrowth')}</th>
                            <th className="text-right font-semibold text-black p-3">{t('competitiveLandscape.grossMargin')}</th>
                            <th className="text-right font-semibold text-black p-3">{t('competitiveLandscape.stockPerformance')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {landscape.keyPlayers.map((p, i) => (
                            <tr key={i} className="border-b border-gray-200 last:border-b-0">
                                <td className="p-3 font-medium text-black">{p.name}</td>
                                <td className="p-3">{p.marketShare}</td>
                                <td className="p-3">{p.techAdvantage}</td>
                                <td className="p-3 text-right font-mono">{p.revenueGrowth}</td>
                                <td className="p-3 text-right font-mono">{p.grossMargin}</td>
                                <td className="p-3 text-right font-mono">{p.stockPerformance}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-4">
                <h4 className="font-semibold text-black mb-1">{t('competitiveLandscape.summary')}</h4>
                <p className="text-sm italic">"{landscape.summary}"</p>
            </div>
        </Card>
    );
};

const CatalystTrackerCard: React.FC<{ tracker: CatalystTracker }> = ({ tracker }) => {
    const { t } = useI18n();
    const impactColors = {
        Positive: 'bg-green-100 text-green-800',
        Negative: 'bg-red-100 text-red-800',
        Neutral: 'bg-gray-100 text-gray-800',
    };
    return (
        <Card title={t('catalystTracker.title')} icon={<MegaphoneIcon className="w-5 h-5"/>} className="md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-black mb-3">{t('catalystTracker.recentNews')}</h4>
                    <div className="space-y-3">
                        {tracker.recentNews.map((news, i) => (
                            <div key={i} className="p-3 bg-gray-100/50 rounded-lg">
                                <div className="flex justify-between items-start text-xs mb-1">
                                    <span className="font-mono text-gray-500">{news.date}</span>
                                    <span className={`font-semibold px-2 py-0.5 rounded-full ${impactColors[news.impact]}`}>{news.impact}</span>
                                </div>
                                <p className="text-sm text-gray-800">{news.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-black mb-3">{t('catalystTracker.upcomingCatalysts')}</h4>
                    <div className="space-y-3">
                        {tracker.upcomingCatalysts.map((catalyst, i) => (
                             <div key={i} className="p-3 bg-gray-100/50 rounded-lg">
                                <p className="font-mono text-xs text-gray-500">{catalyst.date}</p>
                                <p className="text-sm font-semibold text-gray-800">{catalyst.event}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
};

const PolicyAnalysisCard: React.FC<{ analysis: PolicyAnalysis }> = ({ analysis }) => {
    const { t } = useI18n();
    const assessmentConfig = {
        Tailwind: { label: t('policyAnalysis.tailwind'), color: 'text-green-600', icon: '💨' },
        Headwind: { label: t('policyAnalysis.headwind'), color: 'text-red-600', icon: '🌬️' },
        Neutral: { label: t('policyAnalysis.neutral'), color: 'text-gray-600', icon: '〰️' },
    };
    const config = assessmentConfig[analysis.assessment];

    return (
        <Card title={t('policyAnalysis.title')} icon={<ScaleIcon className="w-5 h-5"/>} className="md:col-span-2">
            <div className="flex items-center justify-center p-4 bg-gray-100/50 rounded-lg mb-4">
                <span className={`text-2xl mr-3`}>{config.icon}</span>
                <span className={`text-lg font-bold ${config.color}`}>{config.label}</span>
            </div>
            <div>
                <h4 className="font-semibold text-black mb-1">{t('policyAnalysis.currentPolicies')}</h4>
                <p className="text-sm">{analysis.currentPolicies}</p>
            </div>
            <div className="mt-4">
                <h4 className="font-semibold text-black mb-1">{t('policyAnalysis.potentialChanges')}</h4>
                <p className="text-sm">{analysis.potentialChanges}</p>
            </div>
             <div className="mt-4">
                <h4 className="font-semibold text-black mb-1">{t('policyAnalysis.keyBodies')}</h4>
                <p className="text-sm italic text-gray-600">{analysis.keyBodies.join(', ')}</p>
            </div>
        </Card>
    );
};

const TechTrajectoryCard: React.FC<{ trajectory: TechTrajectory }> = ({ trajectory }) => {
    const { t } = useI18n();
    const maturityConfig = {
        Emerging: { label: t('techTrajectory.emerging'), position: '25%' },
        Maturing: { label: t('techTrajectory.maturing'), position: '60%' },
        Mainstream: { label: t('techTrajectory.mainstream'), position: '90%' },
    };
    const config = maturityConfig[trajectory.maturity];

    return (
        <Card title={t('techTrajectory.title')} icon={<BeakerIcon className="w-5 h-5"/>} className="md:col-span-2">
            <div>
                <h4 className="font-semibold text-black mb-1">{t('techTrajectory.maturity')}</h4>
                <div className="relative pt-6">
                    <div className="h-2 w-full bg-gradient-to-r from-blue-200 via-green-200 to-gray-200 rounded-full"></div>
                    <div className="absolute top-0" style={{ left: config.position, transform: 'translateX(-50%)' }}>
                        <div className="relative">
                            <div className="w-4 h-4 bg-black rounded-full"></div>
                            <div className="absolute top-full mt-1 whitespace-nowrap text-xs font-bold text-black">{config.label}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-8">
                <h4 className="font-semibold text-black mb-1">{t('techTrajectory.coreTech')}</h4>
                <p className="text-sm">{trajectory.coreTech}</p>
            </div>
            <div className="mt-4">
                <h4 className="font-semibold text-black mb-1">{t('techTrajectory.innovationTrends')}</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                    {trajectory.innovationTrends.map((trend, i) => <li key={i}>{trend}</li>)}
                </ul>
            </div>
            <div className="mt-4">
                <h4 className="font-semibold text-black mb-1">{t('techTrajectory.moatAnalysis')}</h4>
                <p className="text-sm">{trajectory.moatAnalysis}</p>
            </div>
        </Card>
    );
};


// --- Main Component ---

interface AnalysisResultProps {
  report: AnalysisReport;
  userInput: string;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ report, userInput }) => {
  const { t } = useI18n();
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);

  const keywords = useMemo(() => {
    if (!report || !userInput) return [];

    const stockKeywords = [
        ...(report.tieredSuggestions?.coreHoldings || []),
        ...(report.tieredSuggestions?.strategicSatellites || []),
        ...(report.tieredSuggestions?.watchlist || []),
    ].flatMap(stock => [stock.name, stock.ticker]);

    const inputKeywords = userInput
      .toLowerCase()
      .split(/[\s,.;:!?()"“”—-]+/) 
      .filter(word => word.length > 2);

    return [...new Set([...stockKeywords, ...inputKeywords])]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
  }, [report, userInput]);

  const handleExportImage = useCallback(() => {
    if (exportRef.current === null) {
      return;
    }
    setIsExporting(true);
    setExportError(null);

    toPng(exportRef.current, {
      cacheBust: true,
      pixelRatio: 2, // For higher resolution images
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        const topic = report.summary?.substring(0, 30).replace(/\s+/g, '_').replace(/[^\w-]/g, '') || 'report';
        link.download = `Investment_Analysis_Report_${topic}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((err) => {
        console.error('Failed to export image:', err);
        setExportError(t('analysisResult.exportError'));
      })
      .finally(() => {
        setIsExporting(false);
      });
  }, [report, t]);
  
  const handlePrint = useCallback(() => {
    setIsPreparingPdf(true);
    setTimeout(() => {
      window.print();
    }, 50);
  }, []);
  
  const handleExportMarkdown = useCallback(() => {
    const markdownContent = analysisReportToMarkdown(report, userInput);
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    const topic = report.summary?.substring(0, 30).replace(/\s+/g, '_').replace(/[^\w-]/g, '') || 'report';
    link.download = `Investment_Analysis_Report_${topic}.md`;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, [report, userInput]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPreparingPdf(false);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const truncateText = (text: string, length: number): string => {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  const FallbackContent = <p className="text-gray-500 text-sm">{t('analysisResult.noDataAvailable')}</p>;

  return (
    <div className="space-y-6 animate-reveal-scale">
      {isPreparingPdf && (
        <div className="no-print fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 shadow-floating text-center">
            <svg className="animate-spin h-10 w-10 text-black mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-xl font-semibold text-gray-800">{t('analysisResult.preparingPDF')}</p>
            <p className="text-sm text-gray-600 mt-1">{t('analysisResult.pdfSubtext')}</p>
          </div>
        </div>
      )}

      <div className="no-print relative flex justify-end gap-x-2">
        <button
          onClick={handleExportMarkdown}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-black text-sm font-medium rounded-xl shadow-sm hover:bg-gray-100 hover:border-gray-300 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
          aria-label={t('analysisResult.exportMarkdown')}
        >
          <MarkdownIcon className="h-5 w-5" />
          <span>{t('analysisResult.exportMarkdown')}</span>
        </button>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-black text-sm font-medium rounded-xl shadow-sm hover:bg-gray-100 hover:border-gray-300 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
          aria-label={t('analysisResult.exportPDF')}
        >
          <DocumentArrowDownIcon className="h-5 w-5" />
          <span>{t('analysisResult.exportPDF')}</span>
        </button>
        <button
          onClick={handleExportImage}
          disabled={isExporting}
          className="relative inline-flex items-center gap-2 px-4 py-2 btn-premium text-white text-sm font-medium rounded-xl group overflow-hidden shadow-lg hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t('analysisResult.exportImage')}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
          <DownloadIcon className="h-5 w-5" />
          <span className="relative z-10">{isExporting ? t('analysisResult.exporting') : t('analysisResult.exportImage')}</span>
        </button>
      </div>

      {exportError && <div role="alert" className="bg-gray-100 border-2 border-gray-200 text-black px-6 py-4 text-center"><p>{exportError}</p></div>}

      <div ref={exportRef} className="printable-area p-4 sm:p-8 bg-white rounded-3xl shadow-lg border border-stone-200/90">
        <div className="text-center mb-8 pb-6 border-b border-gray-200">
          <h2 className="text-4xl font-light text-black mb-2">{t('analysisResult.reportTitle')}</h2>
          <p className="text-sm text-gray-600">
            {t('analysisResult.source')}: <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs text-gray-700">
              {truncateText(userInput, 80)}
            </span>
          </p>
        </div>
        
        <div className="space-y-6">
            {report.polymarketData && <PolymarketInfoCard data={report.polymarketData} />}
            {report.investmentScore && <ScoreDisplay scoreData={report.investmentScore} />}
            
            {report.summary && (
              <div className="mb-6">
                  <h3 className="text-xl font-semibold text-black mb-3 pl-2">{t('analysisResult.summaryTitle')}</h3>
                   <blockquote className="text-gray-800 font-medium italic border-l-4 border-gray-400 pl-4 py-2 bg-gray-100 rounded-r-lg">
                      <TextRenderer text={report.summary} keywords={keywords} />
                   </blockquote>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title={t('analysisResult.macroTitle')} icon={<GlobeIcon className="w-5 h-5"/>}>
                    {report.analysis?.macroPolicy ? <TextRenderer text={report.analysis.macroPolicy} keywords={keywords} /> : FallbackContent}
                </Card>
              
                <Card title={t('analysisResult.sentimentTitle')} icon={<SparklesIcon className="w-5 h-5"/>}>
                    {report.analysis?.marketSentiment ? (
                        <>
                            <div className="flex items-center space-x-4 mb-2">
                              <span className="font-semibold text-black">{t('analysisResult.sentimentLabel')}</span>
                              <SentimentIndicator sentiment={report.analysis.marketSentiment.sentiment} />
                            </div>
                            <TextRenderer text={report.analysis.marketSentiment.description} keywords={keywords} />
                        </>
                    ) : FallbackContent}
                </Card>

                <Card title={t('analysisResult.industryChainTitle')} className="md:col-span-2" icon={<DiagramIcon className="w-5 h-5"/>}>
                    {report.analysis?.industryChain ? (
                        typeof report.analysis.industryChain === 'string' ? (
                            <TextRenderer text={report.analysis.industryChain} keywords={keywords} />
                        ) : (
                            <IndustryChainViz chain={report.analysis.industryChain} />
                        )
                    ) : FallbackContent}
                </Card>

                <Card title={t('analysisResult.fundamentalsTitle')} className="md:col-span-2" icon={<BuildingStorefrontIcon className="w-5 h-5"/>}>
                    {report.analysis?.companyFundamentals ? <TextRenderer text={report.analysis.companyFundamentals} keywords={keywords} /> : FallbackContent}
                </Card>
              
                {report.marketSizeAndOutlook && (
                    <MarketSizeCard 
                        narrative={report.marketSizeAndOutlook.narrative}
                        tamSamSom={report.marketSizeAndOutlook.tamSamSom}
                    />
                )}
                
                {report.competitiveLandscape && <CompetitiveLandscapeCard landscape={report.competitiveLandscape} />}
                {report.catalystTracker && <CatalystTrackerCard tracker={report.catalystTracker} />}
                {report.policyAnalysis && <PolicyAnalysisCard analysis={report.policyAnalysis} />}
                {report.techTrajectory && <TechTrajectoryCard trajectory={report.techTrajectory} />}

                {report.scenarioAnalysis && <ScenarioAnalysisCard scenarios={report.scenarioAnalysis} />}

                <Card title={t('analysisResult.strategyTitle')} className="md:col-span-2" icon={<StrategyIcon className="w-5 h-5"/>}>
                    {report.investmentStrategy ? (
                        <>
                            <div>
                                <h4 className="text-lg font-semibold text-black mb-2 flex items-center gap-2">
                                    <LightBulbIcon className="w-5 h-5" />
                                    {t('analysisResult.strategyLogic')}
                                </h4>
                                <div className="pl-4 border-l-2 border-gray-300 ml-2.5">
                                    <TextRenderer text={report.investmentStrategy.logic} keywords={keywords} />
                                </div>
                            </div>
                            <div className="mt-6">
                                <h4 className="text-lg font-semibold text-black mb-2 flex items-center gap-2">
                                    <CheckCircleIcon className="w-5 h-5" />
                                    {t('analysisResult.strategySuggestion')}
                                </h4>
                                <div className="pl-4 border-l-2 border-gray-300 ml-2.5">
                                    <TextRenderer text={report.investmentStrategy.suggestion} keywords={keywords} />
                                </div>
                            </div>
                        </>
                    ) : FallbackContent}
                </Card>
                
                {report.investmentStrategy?.timeHorizons && <TimeHorizonStrategyCard horizons={report.investmentStrategy.timeHorizons} />}

                {report.riskMatrix && <RiskMatrixCard risks={report.riskMatrix} />}
              
                {report.allocationCadenceAndOutlook && (
                    <Card title={t('analysisResult.allocationTitle')} className="md:col-span-2" icon={<CalendarIcon className="w-5 h-5"/>}>
                        <TextRenderer text={report.allocationCadenceAndOutlook} keywords={keywords} />
                    </Card>
                )}

                {report.associationAnalysis && (
                    <Card title={t('analysisResult.associationTitle')} className="md:col-span-2" icon={<LinkIcon className="w-5 h-5"/>}>
                        <AssociationAnalysisGraph 
                          analysis={report.associationAnalysis}
                          originalTopic={userInput}
                        />
                    </Card>
                )}
            </div>
            
            {report.tieredSuggestions && <TieredSuggestionsDisplay suggestions={report.tieredSuggestions} keywords={keywords} />}

            {report.sources && report.sources.length > 0 && (
                <Card title={t('analysisResult.sourcesTitle')} icon={<DocumentArrowDownIcon className="w-5 h-5"/>}>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        {report.sources.map((source, index) => (
                            <li key={index}>
                                <a
                                    href={source.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-black hover:text-gray-700 animated-underline transition-colors"
                                    title={source.title}
                                >
                                    {source.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {t('analysisResult.footer')}<br />{t('analysisResult.disclaimer')}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default AnalysisResult;