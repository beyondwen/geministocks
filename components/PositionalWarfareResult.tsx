import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { toPng } from 'html-to-image';
import type { PositionalWarfareReport, LeaderStockProfile, FollowerCandidate, StockFinancialMetrics } from '../types';
import TextRenderer from './TextRenderer';
import { ExternalLinkIcon, DownloadIcon, DocumentArrowDownIcon, CheckCircleIcon, XCircleIcon, ChartBarIcon, XIcon } from './icons/Icons';
import { useI18n } from '../hooks/useI18n';

const generateStockLink = (ticker: string, market: string): string => {
    if (!market) return `https://www.google.com/finance/q=${encodeURIComponent(ticker)}`;
    const lowerMarket = market.toLowerCase();
    if (lowerMarket.includes('a-share') || lowerMarket.includes('a股')) {
        const prefix = ticker.startsWith('6') ? 'sh' : 'sz';
        return `https://quote.eastmoney.com/${prefix}${ticker}.html`;
    }
    if (lowerMarket.includes('hong kong') || lowerMarket.includes('港股')) {
        return `https://www.google.com/finance/quote/${ticker}:HKG`;
    }
    if (lowerMarket.includes('us') || lowerMarket.includes('美股')) {
        return `https://www.google.com/finance/quote/${ticker}`;
    }
    return `https://www.google.com/finance/q=${encodeURIComponent(ticker)}`;
};

const StrategistSummaryCard: React.FC<{ summary: string, keywords: string[] }> = ({ summary, keywords }) => {
    const { t } = useI18n();
    return (
        <div className="bg-black p-6 rounded-lg shadow-xl border border-gray-600 text-white">
            <h3 className="text-2xl font-bold mb-3 flex items-center">
                <span className="text-3xl mr-3">✍️</span>
                {t('positionalWarfareResult.summaryTitle')}
            </h3>
            <p className="text-gray-200 leading-relaxed italic"><TextRenderer text={summary} keywords={keywords} /></p>
        </div>
    );
};

const LeaderStockCard: React.FC<{ leader: LeaderStockProfile, keywords: string[] }> = ({ leader, keywords }) => {
    const { t } = useI18n();
    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-2xl font-bold text-black">{t('positionalWarfareResult.leaderTitle')}</h3>
                    <p className="text-gray-500 text-sm">{t('positionalWarfareResult.leaderSubtitle')}</p>
                </div>
                <span className="text-sm font-semibold px-3 py-1 rounded-full bg-gray-100 text-black border border-gray-300">
                    {t('positionalWarfareResult.leaderLabel')}
                </span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-xl font-semibold">{leader.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{leader.sector} | {leader.market}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mb-4 bg-gray-100 p-3 rounded-md">
                    <div>
                        <p className="font-bold text-lg text-black">{leader.metrics.marketCap}</p>
                        <p className="text-xs text-gray-500">{t('positionalWarfareResult.marketCap')}</p>
                    </div>
                    <div>
                        <p className="font-bold text-lg text-black">{leader.metrics.peRatio}</p>
                        <p className="text-xs text-gray-500">{t('positionalWarfareResult.peRatio')}</p>
                    </div>
                    <div>
                        <p className="font-bold text-lg text-black">{leader.metrics.revenueGrowth}</p>
                        <p className="text-xs text-gray-500">{t('positionalWarfareResult.revenueGrowth')}</p>
                    </div>
                    <div>
                        <p className="font-bold text-lg text-black">{leader.metrics.recentPerformance}</p>
                        <p className="text-xs text-gray-500">{t('positionalWarfareResult.recentPerformance')}</p>
                    </div>
                </div>
                <p className="text-gray-700 leading-relaxed text-sm"><TextRenderer text={leader.analysis} keywords={keywords} /></p>
            </div>
        </div>
    );
};

const ComparisonTable: React.FC<{ leaderMetrics: StockFinancialMetrics, followerMetrics: StockFinancialMetrics }> = ({ leaderMetrics, followerMetrics }) => {
    const { t } = useI18n();
    return (
        <div className="overflow-x-auto my-4">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-200/60">
                    <tr>
                        <th scope="col" className="px-3 py-2">{t('positionalWarfareResult.metric')}</th>
                        <th scope="col" className="px-3 py-2">{t('positionalWarfareResult.leader')}</th>
                        <th scope="col" className="px-3 py-2">{t('positionalWarfareResult.follower')}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="bg-white/50 border-b border-gray-200">
                        <th scope="row" className="px-3 py-2 font-medium text-gray-900">{t('positionalWarfareResult.marketCap')}</th>
                        <td className="px-3 py-2 text-gray-600">{leaderMetrics.marketCap}</td>
                        <td className="px-3 py-2 font-semibold text-black">{followerMetrics.marketCap}</td>
                    </tr>
                    <tr className="bg-white/50 border-b border-gray-200">
                        <th scope="row" className="px-3 py-2 font-medium text-gray-900">{t('positionalWarfareResult.peRatio')}</th>
                        <td className="px-3 py-2 text-gray-600">{leaderMetrics.peRatio}</td>
                        <td className="px-3 py-2 font-semibold text-black">{followerMetrics.peRatio}</td>
                    </tr>
                    <tr className="bg-white/50 border-b border-gray-200">
                        <th scope="row" className="px-3 py-2 font-medium text-gray-900">{t('positionalWarfareResult.revenueGrowth')}</th>
                        <td className="px-3 py-2 text-gray-600">{leaderMetrics.revenueGrowth}</td>
                        <td className="px-3 py-2 font-semibold text-black">{followerMetrics.revenueGrowth}</td>
                    </tr>
                    <tr className="bg-white/50">
                        <th scope="row" className="px-3 py-2 font-medium text-gray-900">{t('positionalWarfareResult.recentPerformance')}</th>
                        <td className="px-3 py-2 text-gray-600">{leaderMetrics.recentPerformance}</td>
                        <td className="px-3 py-2 font-semibold text-black">{followerMetrics.recentPerformance}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

const PositioningScore: React.FC<{ score: number, reasoning: string, keywords: string[] }> = ({ score, reasoning, keywords }) => {
    const { t } = useI18n();
    const scoreStyle = score >= 8 ? 'font-extrabold text-black' : score >= 5 ? 'font-bold text-black' : 'font-semibold text-gray-700';
    return (
        <div className="text-center p-3 bg-gray-100/50 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-black mb-1">{t('positionalWarfareResult.scoreTitle')}</p>
            <p className={`text-5xl ${scoreStyle}`}>{score}<span className="text-2xl text-gray-500">/10</span></p>
            <p className="text-xs text-gray-600 mt-1 italic">"<TextRenderer text={reasoning} keywords={keywords} />"</p>
        </div>
    );
};

const FollowerCandidateCard: React.FC<{ 
    candidate: FollowerCandidate; 
    leaderMetrics: StockFinancialMetrics; 
    index: number; 
    keywords: string[];
    onCompare: (candidate: FollowerCandidate) => void;
}> = ({ candidate, leaderMetrics, index, keywords, onCompare }) => {
    const { t } = useI18n();
    const link = generateStockLink(candidate.ticker, candidate.market);
    return (
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-black transition-shadow hover:shadow-xl flex flex-col h-full">
            <div className="flex-grow">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-black">{t('positionalWarfareResult.followerTitle', { index: index + 1 })}</h3>
                        <h4 className="text-lg font-semibold">{candidate.name}</h4>
                        <p className="text-sm text-gray-600">{candidate.market}</p>
                    </div>
                </div>
                
                <div className="space-y-6 text-sm">
                    <PositioningScore score={candidate.positioningScore.score} reasoning={candidate.positioningScore.reasoning} keywords={keywords} />
                    <div>
                        <h5 className="font-semibold text-black mb-2 text-base">{t('positionalWarfareResult.dataPK')}</h5>
                        <ComparisonTable leaderMetrics={leaderMetrics} followerMetrics={candidate.metrics} />
                    </div>
                    <div>
                        <h5 className="font-semibold text-black mb-1 text-base">{t('positionalWarfareResult.compareAnalysis')}</h5>
                        <p className="pl-4 border-l-2 border-gray-300 text-gray-700 leading-relaxed"><TextRenderer text={candidate.comparativeAnalysis} keywords={keywords} /></p>
                    </div>
                    <div>
                        <h5 className="font-semibold text-black mb-1 text-base">{t('positionalWarfareResult.investmentThesis')}</h5>
                        <p className="pl-4 border-l-2 border-gray-400 text-gray-700 leading-relaxed"><TextRenderer text={candidate.investmentThesis} keywords={keywords} /></p>
                    </div>
                    <div>
                        <h5 className="font-semibold text-black mb-2 text-base">{t('positionalWarfareResult.catalysts')}</h5>
                        <ul className="space-y-1.5">
                            {candidate.potentialCatalysts.map((item, i) => (
                               <li key={i} className="flex items-start">
                                    <CheckCircleIcon className="w-4 h-4 text-black mr-2 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-700"><TextRenderer text={item} keywords={keywords} /></span>
                               </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-semibold text-black mb-2 text-base">{t('positionalWarfareResult.risks')}</h5>
                         <ul className="space-y-1.5">
                            {candidate.risks.map((item, i) => (
                               <li key={i} className="flex items-start">
                                   <XCircleIcon className="w-4 h-4 text-black mr-2 mt-0.5 flex-shrink-0" />
                                   <span className="text-gray-700"><TextRenderer text={item} keywords={keywords} /></span>
                               </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-end gap-x-4">
                <button
                    onClick={() => onCompare(candidate)}
                    className="inline-flex items-center text-xs font-semibold text-black hover:text-gray-700 transition-colors"
                    aria-label={`Compare ${candidate.name} with the leader stock`}
                >
                    <ChartBarIcon className="h-4 w-4 mr-1.5" />
                    {t('positionalWarfareResult.compareMetrics')}
                </button>
                <a 
                  href={link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center text-xs font-semibold text-black hover:text-gray-700 transition-colors"
                  aria-label={`View details for ${candidate.name}`}
                >
                  {t('positionalWarfareResult.viewDetails')}
                  <ExternalLinkIcon className="h-3.5 w-3.5 ml-1" />
                </a>
            </div>
        </div>
    );
};

// --- New Comparison Modal Component ---
interface ComparisonModalProps {
    leader: LeaderStockProfile;
    follower: FollowerCandidate;
    onClose: () => void;
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({ leader, follower, onClose }) => {
    const { t } = useI18n();
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const metrics = [
        { name: t('positionalWarfareResult.marketCap'), leader: leader.metrics.marketCap, follower: follower.metrics.marketCap },
        { name: t('positionalWarfareResult.peRatio'), leader: leader.metrics.peRatio, follower: follower.metrics.peRatio },
        { name: t('positionalWarfareResult.revenueGrowth'), leader: leader.metrics.revenueGrowth, follower: follower.metrics.revenueGrowth },
        { name: t('positionalWarfareResult.recentPerformance'), leader: leader.metrics.recentPerformance, follower: follower.metrics.recentPerformance },
    ];

    return (
        <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="comparison-modal-title"
        >
            <div
                className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-2xl w-full mx-4 relative transform transition-all scale-95 opacity-0"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
            >
                <style>{`
                    @keyframes scale-in { to { opacity: 1; transform: scale(1); } }
                `}</style>
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                    aria-label={t('positionalWarfareResult.closeComparison')}
                >
                    <XIcon className="w-6 h-6" />
                </button>

                <h2 id="comparison-modal-title" className="text-2xl font-bold text-black mb-6 text-center">
                    {t('positionalWarfareResult.modalTitle')}
                </h2>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                <th className="py-3 pr-2 text-sm font-semibold text-gray-500">{t('positionalWarfareResult.metric')}</th>
                                <th className="py-3 px-2 text-sm font-semibold text-black text-center">
                                    <span className="block truncate max-w-[150px] mx-auto" title={leader.name}>{leader.name}</span>
                                    <span className="font-normal text-xs text-gray-600">{t('positionalWarfareResult.leader')}</span>
                                </th>
                                <th className="py-3 pl-2 text-sm font-semibold text-black text-center">
                                    <span className="block truncate max-w-[150px] mx-auto" title={follower.name}>{follower.name}</span>
                                    <span className="font-normal text-xs text-gray-600">{t('positionalWarfareResult.follower')}</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {metrics.map((metric, index) => (
                                <tr key={index} className="border-b border-gray-100 last:border-b-0">
                                    <td className="py-4 pr-2 font-medium text-gray-600">{metric.name}</td>
                                    <td className="py-4 px-2 font-mono text-gray-700 text-center">{metric.leader}</td>
                                    <td className="py-4 pl-2 font-mono font-bold text-black text-center bg-gray-100/50">{metric.follower}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


interface PositionalWarfareResultProps {
  report: PositionalWarfareReport;
}

const PositionalWarfareResult: React.FC<PositionalWarfareResultProps> = ({ report }) => {
  const { t } = useI18n();
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [comparisonTarget, setComparisonTarget] = useState<FollowerCandidate | null>(null);

  const keywords = useMemo(() => {
    if (!report) return [];
    const leaderKeywords = [report.leaderStock.name];
    const followerKeywords = report.followerCandidates.flatMap(f => [f.name]);
    return [...new Set([...leaderKeywords, ...followerKeywords])].filter(Boolean);
  }, [report]);

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
        const topic = report.leaderStock.name.replace(/\s+/g, '_').replace(/[^\w-]/g, '');
        link.download = `Positional_Warfare_Report_${topic || 'report'}.png`;
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

  return (
    <div className="space-y-4 animate-fade-in">
        {comparisonTarget && (
            <ComparisonModal
                leader={report.leaderStock}
                follower={comparisonTarget}
                onClose={() => setComparisonTarget(null)}
            />
        )}

        {isPreparingPdf && (
            <div className="no-print fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-white rounded-lg p-8 shadow-2xl text-center">
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
                className="inline-flex items-center px-4 py-2 border-2 border-gray-200 text-sm font-medium rounded-xl shadow-sm text-black bg-white hover:bg-gray-100 transition-all"
                aria-label={t('analysisResult.exportPDF')}
            >
                <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" />
                {t('analysisResult.exportPDF')}
            </button>
            <button
                onClick={handleExportImage}
                disabled={isExporting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-black hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={t('analysisResult.exportImage')}
            >
                <DownloadIcon className="-ml-1 mr-2 h-5 w-5" />
                {isExporting ? t('analysisResult.exporting') : t('analysisResult.exportImage')}
            </button>
        </div>

        {exportError && <div role="alert" className="bg-gray-100 border-gray-400 text-black px-4 py-3 rounded text-center"><p>{exportError}</p></div>}

        <div ref={exportRef} className="printable-area p-4 sm:p-6 bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="mb-8 pb-6 border-b border-gray-300">
                <h2 className="text-3xl font-bold text-black mb-2">{t('positionalWarfareResult.reportTitle')}</h2>
                <p className="text-gray-600">{t('positionalWarfareResult.subtitle')}</p>
            </div>
            <div className="space-y-8">
                {report.strategistSummary && <StrategistSummaryCard summary={report.strategistSummary} keywords={keywords} />}
                <LeaderStockCard leader={report.leaderStock} keywords={keywords} />
                
                {report.followerCandidates.map((candidate, index) => (
                    <FollowerCandidateCard 
                        key={candidate.ticker} 
                        candidate={candidate} 
                        leaderMetrics={report.leaderStock.metrics} 
                        index={index} 
                        keywords={keywords}
                        onCompare={setComparisonTarget}
                    />
                ))}
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

export default PositionalWarfareResult;