import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';
import type { StockAnalysisReport, InvestmentScore, SWOT, ValuationAnalysis, PeerCompetitor, ManagementAnalysis, TechnicalAnalysis, FinancialHealthAnalysis, EarningsCallAnalysis } from '../types';
import { DownloadIcon, SparklesIcon, CheckCircleIcon, DocumentArrowDownIcon, TagIcon, XCircleIcon, SpeakerWaveIcon, LightBulbIcon, ChartTrendingUpIcon, ShieldCheckIcon, UsersIcon, PresentationChartLineIcon, BanknotesIcon, MicrophoneIcon, PlusIcon } from './icons/Icons';
import TextRenderer from './TextRenderer';
import { useI18n } from '../hooks/useI18n';
import ResearchConsensus from './ResearchConsensus';
import { exportElementAsImage, exportElementAsHtml, generateExportFilename } from '../utils/exportUtils';

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

const FinancialTrendsChart: React.FC<{ data?: StockAnalysisReport['financialTrends'] }> = ({ data }) => {
  const { t } = useI18n();
  if (!data || data.length === 0) return <p className="text-center text-gray-500">{t('stockAnalysisResult.noFinancialData')}</p>;

  const formatNumber = (num: number) => {
    if (Math.abs(num) > 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (Math.abs(num) > 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (Math.abs(num) > 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toString();
  };

  const revenueColor = "#ED702E";
  const netIncomeColor = "#6b7280";

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={revenueColor} stopOpacity={0.4}/>
            <stop offset="95%" stopColor={revenueColor} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="netIncomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={netIncomeColor} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={netIncomeColor} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="year" stroke="#64748b" />
        <YAxis yAxisId="left" stroke={revenueColor} tickFormatter={formatNumber} />
        <YAxis yAxisId="right" orientation="right" stroke={netIncomeColor} tickFormatter={formatNumber} />
        <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(5px)', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }} formatter={(value: number, name: string) => [formatNumber(value), t(`stockAnalysisResult.${name}`)]} />
        <Legend />
        <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="none" fill="url(#revenueGradient)" />
        <Line yAxisId="left" type="monotone" dataKey="revenue" stroke={revenueColor} strokeWidth={2} name={t('stockAnalysisResult.revenue')} dot={false} activeDot={{ r: 6 }} />
        <Area yAxisId="right" type="monotone" dataKey="netIncome" stroke="none" fill="url(#netIncomeGradient)" />
        <Line yAxisId="right" type="monotone" dataKey="netIncome" stroke={netIncomeColor} strokeWidth={2} name={t('stockAnalysisResult.netIncome')} dot={false} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

const SwotDisplay: React.FC<{ swot?: SWOT }> = ({ swot }) => {
  const { t } = useI18n();
  const { strengths = [], weaknesses = [], opportunities = [], threats = [] } = swot || {};

  if (!strengths.length && !weaknesses.length && !opportunities.length && !threats.length) {
    return <p className="text-center text-gray-500">{t('stockAnalysisResult.noDataAvailable')}</p>;
  }

  const sections = [
    { title: t('stockAnalysisResult.swot.strengths'), items: strengths, icon: <CheckCircleIcon className="w-5 h-5 flex-shrink-0 text-black" /> },
    { title: t('stockAnalysisResult.swot.weaknesses'), items: weaknesses, icon: <XCircleIcon className="w-5 h-5 flex-shrink-0 text-black" /> },
    { title: t('stockAnalysisResult.swot.opportunities'), items: opportunities, icon: <SparklesIcon className="w-5 h-5 flex-shrink-0 text-black" /> },
    { title: t('stockAnalysisResult.swot.threats'), items: threats, icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0 text-black"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg> }
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map(section => (
        section.items.length > 0 && (
          <div key={section.title}>
            <h4 className="font-semibold text-black mb-2 flex items-center gap-2">{section.icon} {section.title}</h4>
            <ul className="space-y-2 text-sm">
              {section.items.map((item, index) => <li key={index} className="flex items-start"><span className="mr-2 mt-1.5 w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></span><TextRenderer text={item} /></li>)}
            </ul>
          </div>
        )
      ))}
    </div>
  );
};

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

const ValuationCard: React.FC<{ valuation: ValuationAnalysis }> = ({ valuation }) => {
    const { t } = useI18n();
    const judgmentColors = {
        undervalued: 'bg-green-100 text-green-800',
        'fairly valued': 'bg-gray-100 text-gray-800',
        overvalued: 'bg-red-100 text-red-800',
    };
    return (
        <Card title={t('stockAnalysisResult.valuation.title')} icon={<TagIcon className="w-5 h-5" />}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${judgmentColors[valuation.judgment]}`}>{valuation.judgment}</span>
                    <p className="text-sm text-gray-600 mt-1">{valuation.reasoning}</p>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-500">{t('stockAnalysisResult.valuation.targetPrice')}</p>
                    <p className="text-2xl font-bold text-black">{valuation.targetPriceRange}</p>
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 italic text-center">{t('stockAnalysisResult.valuation.methodology')}: {valuation.methodology}</p>
        </Card>
    );
};

const PeerComparisonTable: React.FC<{ peers: PeerCompetitor[] }> = ({ peers }) => {
    const { t } = useI18n();
    return (
        <Card title={t('stockAnalysisResult.peerComparison.title')} icon={<SparklesIcon className="w-5 h-5" />}>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="text-left font-semibold text-black p-3">{t('stockAnalysisResult.peerComparison.company')}</th>
                            <th className="text-right font-semibold text-black p-3">{t('stockAnalysisResult.peerComparison.marketCap')}</th>
                            <th className="text-right font-semibold text-black p-3">{t('stockAnalysisResult.peerComparison.peRatio')}</th>
                            <th className="text-right font-semibold text-black p-3">{t('stockAnalysisResult.peerComparison.revenueGrowth')}</th>
                            <th className="text-right font-semibold text-black p-3">{t('stockAnalysisResult.peerComparison.grossMargin')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {peers.map((p, i) => (
                            <tr key={i} className="border-b border-gray-200 last:border-b-0">
                                <td className="p-3 font-medium text-black">{p.name} ({p.ticker})</td>
                                <td className="p-3 text-right font-mono">{p.marketCap}</td>
                                <td className="p-3 text-right font-mono">{p.peRatio}</td>
                                <td className="p-3 text-right font-mono">{p.revenueGrowth}</td>
                                <td className="p-3 text-right font-mono">{p.grossMargin}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

// --- New Professional-Grade Components ---
const ManagementCard: React.FC<{ analysis: ManagementAnalysis }> = ({ analysis }) => {
    const { t } = useI18n();
    return (
        <Card title={t('stockAnalysisResult.management.title')} icon={<UsersIcon className="w-5 h-5" />}>
            <div>
                <h4 className="font-semibold text-black mb-2">{t('stockAnalysisResult.management.keyExecs')}</h4>
                <div className="space-y-3">
                    {analysis.keyExecutives.map((exec, i) => (
                        <div key={i} className="text-sm p-2 bg-gray-50 rounded-md">
                            <p><span className="font-bold">{exec.name}</span>, <span className="text-gray-600">{exec.title}</span></p>
                            <p className="text-xs text-gray-500 mt-1">{exec.summary}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-4">
                <h4 className="font-semibold text-black mb-2">{t('stockAnalysisResult.management.insiderTrading')}</h4>
                <p className="text-sm text-gray-700 italic">"{analysis.insiderTradingSummary}"</p>
            </div>
        </Card>
    );
};

const RsiGauge: React.FC<{ value: number, interpretation: string }> = ({ value, interpretation }) => {
    const { t } = useI18n();
    const getRsiColor = (val: number) => {
        if (val > 70) return 'bg-red-500';
        if (val < 30) return 'bg-green-500';
        return 'bg-gray-500';
    };
    const rsiColor = getRsiColor(value);
    const percentage = Math.max(0, Math.min(100, value));
    
    return (
        <div className="text-center">
            <div className="w-full bg-gray-200 rounded-full h-2.5 my-2">
                <div className={`${rsiColor} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
            <p className="text-2xl font-bold">{value.toFixed(1)}</p>
            <p className="text-sm font-semibold">{t(`stockAnalysisResult.technical.rsiStates.${interpretation}`)}</p>
        </div>
    );
};

const TechnicalAnalysisCard: React.FC<{ analysis: TechnicalAnalysis }> = ({ analysis }) => {
    const { t } = useI18n();
    return (
        <Card title={t('stockAnalysisResult.technical.title')} icon={<PresentationChartLineIcon className="w-5 h-5" />}>
            <p className="text-sm italic mb-4">"{analysis.summary}"</p>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h4 className="font-semibold text-black text-center mb-1">{t('stockAnalysisResult.technical.rsi')} (14-D)</h4>
                    <RsiGauge value={analysis.rsi.value} interpretation={analysis.rsi.interpretation} />
                </div>
                <div>
                     <h4 className="font-semibold text-black text-center mb-2">{t('stockAnalysisResult.technical.movingAverages')}</h4>
                     <div className="space-y-2 text-center">
                        <p>{t('stockAnalysisResult.technical.movingAveragesDays.50')}: <span className={`font-bold ${analysis.movingAverages['50-day'] === 'Above' ? 'text-green-600' : 'text-red-600'}`}>{t(`stockAnalysisResult.technical.movingAveragesStates.${analysis.movingAverages['50-day']}`)}</span></p>
                        <p>{t('stockAnalysisResult.technical.movingAveragesDays.200')}: <span className={`font-bold ${analysis.movingAverages['200-day'] === 'Above' ? 'text-green-600' : 'text-red-600'}`}>{t(`stockAnalysisResult.technical.movingAveragesStates.${analysis.movingAverages['200-day']}`)}</span></p>
                     </div>
                </div>
            </div>
        </Card>
    );
};

const FinancialHealthCard: React.FC<{ analysis: FinancialHealthAnalysis }> = ({ analysis }) => {
    const { t } = useI18n();
    const healthMetrics = [
        { name: t('stockAnalysisResult.financialHealth.solvency'), data: analysis.solvency },
        { name: t('stockAnalysisResult.financialHealth.efficiency'), data: analysis.efficiency },
        { name: t('stockAnalysisResult.financialHealth.liquidity'), data: analysis.liquidity },
    ];
    return (
        <Card title={t('stockAnalysisResult.financialHealth.title')} icon={<BanknotesIcon className="w-5 h-5" />}>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b-2 border-gray-200">
                        <th className="text-left font-semibold text-black p-2">{t('stockAnalysisResult.financialHealth.metric')}</th>
                        <th className="text-right font-semibold text-black p-2">{t('stockAnalysisResult.financialHealth.companyValue')}</th>
                        <th className="text-right font-semibold text-black p-2">{t('stockAnalysisResult.financialHealth.industryAvg')}</th>
                    </tr>
                </thead>
                <tbody>
                    {healthMetrics.map((metric, i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-b-0">
                            <td className="p-2 font-medium">{metric.name}</td>
                            <td className="p-2 text-right font-mono font-bold">{metric.data.value}</td>
                            <td className="p-2 text-right font-mono text-gray-600">{metric.data.industryAverage}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
    );
};

const EarningsCallCard: React.FC<{ analysis: EarningsCallAnalysis }> = ({ analysis }) => {
    const { t } = useI18n();
    const toneConfig = {
        Optimistic: 'text-green-600',
        Cautious: 'text-yellow-600',
        Pessimistic: 'text-red-600',
        Neutral: 'text-gray-600',
    };
    return (
        <Card title={t('stockAnalysisResult.earningsCall.title')} icon={<MicrophoneIcon className="w-5 h-5" />}>
             <div>
                <h4 className="font-semibold text-black mb-1">{t('stockAnalysisResult.earningsCall.managementTone')}</h4>
                <p className={`text-lg font-bold ${toneConfig[analysis.managementTone]}`}>{t(`stockAnalysisResult.earningsCall.managementTones.${analysis.managementTone}`)}</p>
            </div>
            <div className="mt-4">
                <h4 className="font-semibold text-black mb-2">{t('stockAnalysisResult.earningsCall.futureGuidance')}</h4>
                <p className="text-sm italic text-gray-700">"{analysis.futureGuidance}"</p>
            </div>
            <div className="mt-4">
                <h4 className="font-semibold text-black mb-2">{t('stockAnalysisResult.earningsCall.keyHighlights')}</h4>
                <div className="space-y-3 text-sm">
                    {analysis.keyHighlights.map((hl, i) => (
                        <div key={i} className="p-2 bg-gray-50 rounded-md">
                            <p className="font-bold text-gray-800">Q: {hl.question}</p>
                            <p className="text-gray-600 mt-1">A: {hl.answer}</p>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};

// --- Main Component ---
interface StockAnalysisResultProps {
  report: StockAnalysisReport;
  onNewAnalysis: () => void;
}

const StockAnalysisResult: React.FC<StockAnalysisResultProps> = ({ report, onNewAnalysis }) => {
  const { t, locale } = useI18n();
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [isExportingReport, setIsExportingReport] = useState(false);

  const keywords = useMemo(() => {
    if (!report?.companyProfile) return [];
    return [report.companyProfile.name, report.companyProfile.ticker].filter(Boolean);
  }, [report]);

  // Auto-dismiss the export success message
  useEffect(() => {
    if (!exportSuccess) return;
    const timer = setTimeout(() => setExportSuccess(null), 5000);
    return () => clearTimeout(timer);
  }, [exportSuccess]);

  const handleExportImage = useCallback(async () => {
    if (exportRef.current === null || isExporting) {
      return;
    }
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      // Generate dynamic filename based on stock name and ticker
      const stockTitle = `${report.companyProfile.name}_${report.companyProfile.ticker}`;
      const filename = generateExportFilename('stock', stockTitle, locale);

      const downloadedFile = await exportElementAsImage({
        element: exportRef.current,
        filename,
        format: 'png',
        backgroundColor: '#ffffff',
      });
      setExportSuccess(t('analysisResult.exportSuccess', { filename: downloadedFile }));
    } catch (err) {
      console.error('Failed to export image:', err);
      setExportError(t('analysisResult.exportError'));
    } finally {
      setIsExporting(false);
    }
  }, [report, locale, t, isExporting]);
  
  const handleExportReport = useCallback(async () => {
    if (exportRef.current === null || isExportingReport) {
      return;
    }
    setIsExportingReport(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      const stockTitle = `${report.companyProfile.name}_${report.companyProfile.ticker}`;
      const filename = generateExportFilename('stock', stockTitle, locale);

      const downloadedFile = await exportElementAsHtml({
        element: exportRef.current,
        filename,
        title: stockTitle,
        locale,
      });
      setExportSuccess(t('analysisResult.exportReportSuccess', { filename: downloadedFile }));
    } catch (err) {
      console.error('Failed to export report:', err);
      setExportError(t('analysisResult.exportReportError'));
    } finally {
      setIsExportingReport(false);
    }
  }, [report, locale, t, isExportingReport]);
  
  if (!report) return null;

  return (
    <div className="space-y-6 animate-reveal-scale">
      <div className="no-print relative flex justify-between items-center gap-x-2">
        <button
          onClick={onNewAnalysis}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-black text-sm font-medium rounded-xl shadow-sm hover:bg-gray-100 hover:border-gray-300 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
          aria-label={t('stockAnalysisResult.newAnalysis')}
        >
          <PlusIcon className="h-5 w-5" />
          <span>{t('stockAnalysisResult.newAnalysis')}</span>
        </button>
        <div className="flex gap-x-2">
          <button
            onClick={handleExportReport}
            disabled={isExportingReport}
            aria-busy={isExportingReport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-black text-sm font-medium rounded-xl shadow-sm hover:bg-gray-100 hover:border-gray-300 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('analysisResult.exportReport')}
          >
            {isExportingReport ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <DocumentArrowDownIcon className="h-5 w-5" />
            )}
            <span>{isExportingReport ? t('analysisResult.exporting') : t('analysisResult.exportReport')}</span>
          </button>
          <button
            onClick={handleExportImage}
            disabled={isExporting}
            aria-busy={isExporting}
            className="relative inline-flex items-center gap-2 px-4 py-2 btn-premium text-white text-sm font-medium rounded-xl group overflow-hidden shadow-lg hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('analysisResult.exportImage')}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
            {isExporting ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <DownloadIcon className="h-5 w-5" />
            )}
            <span className="relative z-10">{isExporting ? t('analysisResult.exporting') : t('analysisResult.exportImage')}</span>
          </button>
        </div>
      </div>

      {exportError && <div role="alert" className="bg-gray-100 border-2 border-gray-200 text-black px-6 py-4 text-center rounded-xl"><p>{exportError}</p></div>}
      {exportSuccess && <div role="status" className="no-print bg-green-50 border-2 border-green-200 text-green-800 px-6 py-3 text-center rounded-xl text-sm animate-fade-in"><p>{exportSuccess}</p></div>}

      <div ref={exportRef} className="printable-area p-4 sm:p-8 bg-white rounded-3xl shadow-lg border border-stone-200/90">
        <header className="text-center mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-4xl font-light text-black mb-2">{report.companyProfile?.name}</h2>
            <p className="text-sm text-gray-600">{report.companyProfile?.ticker} · {report.companyProfile?.sector} / {report.companyProfile?.industry}</p>
        </header>
        
        <div className="space-y-6">
            {report.investmentScore && <ScoreDisplay scoreData={report.investmentScore} />}
            
            {report.marketSentimentAnalysis && (
                <Card title={t('stockAnalysisResult.sentiment.title')} icon={<SpeakerWaveIcon className="w-5 h-5"/>}>
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <span className="font-semibold text-black">{t('stockAnalysisResult.sentiment.assessment')}</span>
                            <SentimentIndicator sentiment={report.marketSentimentAnalysis.sentiment} />
                        </div>
                        <TextRenderer text={report.marketSentimentAnalysis.description} keywords={keywords} />
                        
                        <div>
                            <h4 className="text-lg font-semibold text-black mb-2">{t('stockAnalysisResult.sentiment.strategyImpact')}</h4>
                            <div className="pl-4 border-l-4 border-gray-400">
                                <TextRenderer text={report.marketSentimentAnalysis.strategyImpact} keywords={keywords} />
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            <Card title={t('stockAnalysisResult.financialTrendsTitle')} icon={<ChartTrendingUpIcon className="w-5 h-5" />}>
                <FinancialTrendsChart data={report.financialTrends} />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {report.valuationAnalysis && <ValuationCard valuation={report.valuationAnalysis} />}
                {report.financialHealth && <FinancialHealthCard analysis={report.financialHealth} />}
            </div>

            {report.peerComparison && report.peerComparison.length > 0 && <PeerComparisonTable peers={report.peerComparison} />}
            
            {report.researchReportConsensus && <ResearchConsensus consensus={report.researchReportConsensus} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {report.investmentThesis && (
                    <Card title={t('stockAnalysisResult.investmentThesis.title')} icon={<LightBulbIcon className="w-5 h-5"/>}>
                        <div>
                            <h4 className="text-lg font-semibold text-black mb-2">{t('stockAnalysisResult.investmentThesis.bull')}</h4>
                            <p className="pl-4 border-l-4 border-green-400"><TextRenderer text={report.investmentThesis.bull} keywords={keywords} /></p>
                        </div>
                        <div className="mt-4">
                            <h4 className="text-lg font-semibold text-black mb-2">{t('stockAnalysisResult.investmentThesis.bear')}</h4>
                            <p className="pl-4 border-l-4 border-red-400"><TextRenderer text={report.investmentThesis.bear} keywords={keywords} /></p>
                        </div>
                        <div className="mt-4">
                            <h4 className="text-lg font-semibold text-black mb-2">{t('stockAnalysisResult.investmentThesis.conclusion')}</h4>
                            <p className="pl-4 border-l-4 border-gray-400"><TextRenderer text={report.investmentThesis.conclusion} keywords={keywords} /></p>
                        </div>
                    </Card>
                )}
                 {report.managementAnalysis && <ManagementCard analysis={report.managementAnalysis} />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {report.technicalAnalysis && <TechnicalAnalysisCard analysis={report.technicalAnalysis} />}
                {report.earningsCallAnalysis && <EarningsCallCard analysis={report.earningsCallAnalysis} />}
            </div>
            
            <Card title={t('stockAnalysisResult.swot.title')} icon={<SparklesIcon className="w-5 h-5"/>}>
                <SwotDisplay swot={report.swotAnalysis} />
            </Card>

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

export default StockAnalysisResult;
