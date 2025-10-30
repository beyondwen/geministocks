import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { toPng } from 'html-to-image';
import type { AnalysisReport, InvestmentScore, PolymarketData } from '../types';
import { DownloadIcon, SparklesIcon, CheckCircleIcon, DocumentArrowDownIcon, LinkIcon, BuildingStorefrontIcon, ChartTrendingUpIcon } from './icons/Icons';
import TieredSuggestionsDisplay from './TieredSuggestionsDisplay';
import IndustryChainViz from './IndustryChainViz';
import TextRenderer from './TextRenderer';
import AssociationAnalysisGraph from './AssociationAnalysisGraph';
import { useI18n } from '../hooks/useI18n';

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

const CalendarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" />
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
  <div className={`bg-white border border-stone-200/90 rounded-2xl p-6 shadow-sm h-full ${className}`}>
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
    <div className={`bg-white border-2 border-stone-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300`}>
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

const KeyTakeaways: React.FC<{ takeaways: string[] }> = ({ takeaways }) => {
    const { t } = useI18n();
    return (
        <Card title={t('analysisResult.takeawaysTitle')} icon={<CheckCircleIcon className="w-5 h-5"/>}>
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

            {report.keyTakeaways && report.keyTakeaways.length > 0 && <KeyTakeaways takeaways={report.keyTakeaways} />}

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
                    <Card title={t('analysisResult.marketSizeTitle')} className="md:col-span-2" icon={<ChartPieIcon className="w-5 h-5"/>}>
                        <TextRenderer text={report.marketSizeAndOutlook} keywords={keywords} />
                    </Card>
                )}

                <Card title={t('analysisResult.strategyTitle')} className="md:col-span-2" icon={<StrategyIcon className="w-5 h-5"/>}>
                    {report.investmentStrategy ? (
                        <>
                            <div>
                                <h4 className="text-lg font-semibold text-black mb-2">{t('analysisResult.strategyLogic')}</h4>
                                <p className="pl-4 border-l-4 border-gray-400"><TextRenderer text={report.investmentStrategy.logic} keywords={keywords} /></p>
                            </div>
                            <div className="mt-4">
                                <h4 className="text-lg font-semibold text-black mb-2">{t('analysisResult.strategySuggestion')}</h4>
                                <p className="pl-4 border-l-4 border-gray-400"><TextRenderer text={report.investmentStrategy.suggestion} keywords={keywords} /></p>
                            </div>
                            <div className="mt-4">
                                <h4 className="text-lg font-semibold text-black mb-2">{t('analysisResult.strategyRisks')}</h4>
                                <p className="pl-4 border-l-4 border-gray-400"><TextRenderer text={report.investmentStrategy.risks} keywords={keywords} /></p>
                            </div>
                        </>
                    ) : FallbackContent}
                </Card>
              
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