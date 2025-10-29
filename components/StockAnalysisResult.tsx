import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { toPng } from 'html-to-image';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { StockAnalysisReport, InvestmentScore, SWOT } from '../types';
import { DownloadIcon, SparklesIcon, CheckCircleIcon, DocumentArrowDownIcon, TagIcon, XCircleIcon } from './icons/Icons';
import TextRenderer from './TextRenderer';
import { useI18n } from '../hooks/useI18n';
import ResearchConsensus from './ResearchConsensus';

// --- SVG Icons (defined locally to minimize file changes) ---
const BuildingOfficeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6M9 11.25h6M9 15.75h6M4.5 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0-3.375v-3.375m0 0h3.75m-3.75 0h3.75m-3.75 0V21m0-6.375v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m-3.75-6.375h3.75" />
    </svg>
);
const ChartBarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);
const LightBulbIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.184m-1.5.184a6.01 6.01 0 01.316-1.532m-.316 1.532l2.648-5.302A6.002 6.002 0 005.501 6.25a6 6 0 00-4.032 9.688 6 6 0 0010.533-3.611m-1.032 3.611a6 6 0 01-.316-1.532m0 0l2.648-5.302m-2.648 5.302a6.002 6.002 0 001.5-.184m-1.5.184a6.001 6.001 0 01.316-1.532m0 0l-2.648-5.302m.001-4.182a5.962 5.962 0 01-3.36 1.018 5.962 5.962 0 01-3.36-1.018" />
    </svg>
);

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
  <div className={`bg-white border border-gray-200 rounded-2xl p-6 shadow-soft h-full ${className}`}>
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
  const getScoreStyle = (score: number) => {
    if (score >= 75) return { text: 'text-black', font: 'font-bold' };
    if (score >= 50) return { text: 'text-black', font: 'font-medium' };
    return { text: 'text-gray-600', font: 'font-normal' };
  };

  const { score, reason } = scoreData;
  const { text, font } = getScoreStyle(score);

  return (
    <div className={`bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-elevated transition-all duration-300`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center mb-4 sm:mb-0">
          <div className={`p-2 bg-black rounded-xl shadow-lg mr-3`}>
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-2xl font-light text-black">{t('scoreDisplay.title')}</h3>
        </div>
        <div className="text-center sm:text-right">
          <div className="relative">
            <p className={`text-5xl tracking-tight ${text} ${font}`}>
              {score}
              <span className="text-2xl font-medium opacity-70">/100</span>
            </p>
            <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-black rounded-full opacity-60`}></div>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200/60">
        <p className="text-sm text-gray-600 leading-relaxed"><TextRenderer text={reason} /></p>
      </div>
    </div>
  );
};

const KeyTakeaways: React.FC<{ takeaways: string[] }> = ({ takeaways }) => {
    const { t } = useI18n();
    return (
        <Card title={t('stockAnalysisResult.takeawaysTitle')} icon={<CheckCircleIcon className="w-5 h-5"/>}>
            <ul className="space-y-3">
                {takeaways.map((item, index) => (
                    <li key={index} className="flex items-start">
                        <div className="mt-1 mr-3 w-1.5 h-1.5 bg-black rounded-full flex-shrink-0"></div>
                        <span className="text-gray-700"><TextRenderer text={item} /></span>
                    </li>
                ))}
            </ul>
        </Card>
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

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="year" stroke="#64748b" />
        <YAxis yAxisId="left" stroke="#111111" tickFormatter={formatNumber} />
        <YAxis yAxisId="right" orientation="right" stroke="#6b7280" tickFormatter={formatNumber} />
        <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(5px)', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }} formatter={(value: number, name: string) => [formatNumber(value), t(`stockAnalysisResult.${name}`)]} />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#111111" strokeWidth={2} name={t('stockAnalysisResult.revenue')} />
        <Line yAxisId="right" type="monotone" dataKey="netIncome" stroke="#6b7280" strokeWidth={2} name={t('stockAnalysisResult.netIncome')} />
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
    { title: t('stockAnalysisResult.swot.threats'), items: threats, icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0 text-black"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg> },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map(section => (
        section.items.length > 0 && (
          <div key={section.title}>
            <h4 className="font-semibold text-black mb-2 flex items-center gap-2">{section.icon} {section.title}</h4>
            <ul className="space-y-2 text-sm">
              {section.items.map((item, index) => <li key={index} className="flex items-start"><span className="mr-2 mt-1 text-gray-400">&bull;</span><TextRenderer text={item} /></li>)}
            </ul>
          </div>
        )
      ))}
    </div>
  );
};

interface StockAnalysisResultProps {
  report: StockAnalysisReport;
}

const StockAnalysisResult: React.FC<StockAnalysisResultProps> = ({ report }) => {
  const { t } = useI18n();
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);

  const keywords = useMemo(() => {
    if (!report) return [];
    return [report.companyProfile?.name].filter(Boolean);
  }, [report]);

  const handleExportImage = useCallback(() => {
    if (exportRef.current === null) return;
    setIsExporting(true);
    setExportError(null);
    toPng(exportRef.current, { cacheBust: true, pixelRatio: 2 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        const topic = report.companyProfile?.name.replace(/\s+/g, '_').replace(/[^\w-]/g, '') || 'stock';
        link.download = `Stock_Analysis_${topic}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Failed to export image:', err);
        setExportError(t('analysisResult.exportError'));
      })
      .finally(() => setIsExporting(false));
  }, [report, t]);

  const handlePrint = useCallback(() => {
    setIsPreparingPdf(true);
    setTimeout(() => window.print(), 50);
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => setIsPreparingPdf(false);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);
  
  const FallbackContent = <p className="text-gray-500 text-sm">{t('stockAnalysisResult.noDataAvailable')}</p>;

  return (
    <div className="space-y-6 animate-reveal-scale">
      {isPreparingPdf && (
        <div className="no-print fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 shadow-floating text-center">
             <svg className="animate-spin h-10 w-10 text-black mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="text-xl font-semibold text-gray-800">{t('analysisResult.preparingPDF')}</p>
            <p className="text-sm text-gray-600 mt-1">{t('analysisResult.pdfSubtext')}</p>
          </div>
        </div>
      )}

      <div className="no-print relative flex justify-end gap-x-2">
        <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-black text-sm font-medium rounded-xl shadow-soft hover:bg-gray-100 hover:border-gray-300 hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5" aria-label={t('analysisResult.exportPDF')}><DocumentArrowDownIcon className="h-5 w-5" /><span>{t('analysisResult.exportPDF')}</span></button>
        <button onClick={handleExportImage} disabled={isExporting} className="relative inline-flex items-center gap-2 px-4 py-2 btn-premium text-white text-sm font-medium rounded-xl group overflow-hidden shadow-lg hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed" aria-label={t('analysisResult.exportImage')}><div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div><DownloadIcon className="h-5 w-5" /><span className="relative z-10">{isExporting ? t('analysisResult.exporting') : t('analysisResult.exportImage')}</span></button>
      </div>

      {exportError && <div role="alert" className="bg-gray-100 border-2 border-gray-200 text-black px-6 py-4 text-center"><p>{exportError}</p></div>}
      
      <div ref={exportRef} className="printable-area p-4 sm:p-8 bg-white rounded-3xl shadow-floating border border-gray-200">
        <header className="text-center mb-8 pb-6 border-b border-gray-200">
          <h2 className="text-4xl font-light text-black mb-2">{t('stockAnalysisResult.reportTitle')}</h2>
          <p className="text-2xl font-semibold text-gray-800">{report.companyProfile?.name}</p>
        </header>

        <div className="space-y-6">
            {report.investmentScore && <ScoreDisplay scoreData={report.investmentScore} />}
            {report.keyTakeaways && report.keyTakeaways.length > 0 && <KeyTakeaways takeaways={report.keyTakeaways} />}
            {report.researchReportConsensus && <ResearchConsensus consensus={report.researchReportConsensus} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title={t('stockAnalysisResult.companyProfile')} icon={<BuildingOfficeIcon className="w-5 h-5" />} className="md:col-span-2">
                    {report.companyProfile ? (
                        <>
                            <p className="font-semibold">{report.companyProfile.sector} / {report.companyProfile.industry}</p>
                            <TextRenderer text={report.companyProfile.summary} keywords={keywords} />
                        </>
                    ) : FallbackContent}
                </Card>
                
                <Card title={t('stockAnalysisResult.financialTrends')} icon={<ChartBarIcon className="w-5 h-5" />} className="md:col-span-2">
                    <FinancialTrendsChart data={report.financialTrends} />
                </Card>

                <Card title={t('stockAnalysisResult.valuation.title')} icon={<TagIcon className="w-5 h-5"/>}>
                  {report.valuationAnalysis ? (
                      <>
                        <p className='text-center text-3xl font-bold text-black'>{report.valuationAnalysis.targetPriceRange}</p>
                        <p className='text-center text-sm text-gray-500 -mt-2 mb-2'>{t('stockAnalysisResult.valuation.targetPrice')}</p>
                        <TextRenderer text={report.valuationAnalysis.reasoning} keywords={keywords} />
                      </>
                  ) : FallbackContent}
                </Card>

                <Card title={t('stockAnalysisResult.investmentThesis.title')} icon={<LightBulbIcon className="w-5 h-5"/>}>
                  {report.investmentThesis ? (
                      <>
                        <div>
                          <h4 className="font-semibold text-black">{t('stockAnalysisResult.investmentThesis.bull')}</h4>
                          <p className="text-sm"><TextRenderer text={report.investmentThesis.bull} keywords={keywords} /></p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-black">{t('stockAnalysisResult.investmentThesis.bear')}</h4>
                          <p className="text-sm"><TextRenderer text={report.investmentThesis.bear} keywords={keywords} /></p>
                        </div>
                      </>
                  ) : FallbackContent}
                </Card>
                
                <Card title={t('stockAnalysisResult.swot.title')} icon={<SparklesIcon className="w-5 h-5" />} className="md:col-span-2">
                    <SwotDisplay swot={report.swotAnalysis} />
                </Card>

                <Card title={t('stockAnalysisResult.peerComparison.title')} icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.28a4.5 4.5 0 00-1.883-2.384-4.5 4.5 0 00-6.42 6.42a4.5 4.5 0 006.42 1.883A4.5 4.5 0 0010.5 18.72m-7.5-2.28a4.5 4.5 0 001.883-2.384m6.214 4.764a4.5 4.5 0 01-1.883 2.384m1.883-2.384a4.5 4.5 0 016.42-6.42 4.5 4.5 0 01-6.42-1.883a4.5 4.5 0 01-1.883 2.384m6.214-4.764a4.5 4.5 0 001.883 2.384m-1.883-2.384a4.5 4.5 0 00-6.42 6.42 4.5 4.5 0 006.42 1.883M10.5 18.72a9.094 9.094 0 013.741-.479 3 3 0 014.682-2.72m-7.5-2.28a4.5 4.5 0 011.883 2.384m-1.883 2.384a4.5 4.5 0 01-6.42-6.42 4.5 4.5 0 016.42-1.883m-1.883 2.384A4.5 4.5 0 015.25 10.5m1.883-2.384a4.5 4.5 0 016.42 6.42" /></svg>} className="md:col-span-2">
                    {report.peerComparison && report.peerComparison.length > 0 ? (
                      <div className="overflow-x-auto -mx-4">
                          <table className="w-full text-sm text-left">
                              <thead className="text-xs text-gray-700 uppercase bg-gray-200/50"><tr><th className="px-4 py-2">{t('stockAnalysisResult.peerComparison.company')}</th><th className="px-4 py-2">{t('stockAnalysisResult.peerComparison.marketCap')}</th><th className="px-4 py-2">{t('stockAnalysisResult.peerComparison.peRatio')}</th><th className="px-4 py-2">{t('stockAnalysisResult.peerComparison.revenueGrowth')}</th></tr></thead>
                              <tbody>{report.peerComparison.map(p => <tr key={p.ticker} className="border-b border-gray-200/60">
                                  <td className="px-4 py-2 font-medium">{p.name}</td><td className="px-4 py-2">{p.marketCap}</td><td className="px-4 py-2">{p.peRatio}</td><td className="px-4 py-2">{p.revenueGrowth}</td>
                              </tr>)}</tbody>
                          </table>
                      </div>
                    ) : FallbackContent}
                </Card>
                
                 {report.sources && report.sources.length > 0 && (
                  <Card title={t('stockAnalysisResult.sourcesTitle')} icon={<DocumentArrowDownIcon className="w-5 h-5"/>} className="md:col-span-2">
                      <ul className="list-disc list-inside space-y-2 text-sm">
                          {report.sources.map((source, index) => <li key={index}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-black hover:text-gray-700 animated-underline transition-colors" title={source.title}>{source.title}</a></li>)}
                      </ul>
                  </Card>
                 )}
            </div>
        </div>
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {t('stockAnalysisResult.footer')}<br />{t('stockAnalysisResult.footerFollow')}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default StockAnalysisResult;