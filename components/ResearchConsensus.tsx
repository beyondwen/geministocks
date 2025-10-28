import React from 'react';
import type { ResearchReportConsensus } from '../types';
import { useI18n } from '../hooks/useI18n';
import { ChartTrendingUpIcon, TagIcon, DocumentTextIcon, ExternalLinkIcon } from './icons/Icons';

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
    <div className={`glass-refined bg-white/40 backdrop-blur-md border border-slate-200/40 rounded-2xl p-6 shadow-soft h-full ${className}`}>
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-cyan-500 to-green-500 rounded-xl shadow-lg">
                <span className="w-5 h-5 text-white block">{icon}</span>
            </div>
            <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-green-600">{title}</h3>
        </div>
        <div className="text-slate-700 space-y-4 leading-relaxed">{children}</div>
    </div>
);

const TargetPriceVisualizer: React.FC<{
    low: number | null;
    average: number | null;
    high: number | null;
    current: number | null;
}> = ({ low, average, high, current }) => {
    const { t } = useI18n();

    if (low === null || high === null || average === null) {
        return <p className="text-center text-slate-500 text-sm">{t('researchConsensus.noTargetPrice')}</p>;
    }

    const range = high - low;
    const avgPosition = range > 0 ? ((average - low) / range) * 100 : 50;
    const currentPosition = current !== null && range > 0 ? Math.max(0, Math.min(100, ((current - low) / range * 100))) : -1;

    return (
        <div className="space-y-4 pt-2">
            <div className="relative h-2 bg-slate-200 rounded-full my-2">
                <div className="absolute h-full bg-gradient-to-r from-green-300 via-yellow-300 to-red-300 rounded-full" style={{ width: '100%' }}></div>
                
                {/* Average Price Marker */}
                <div 
                    className="absolute top-1/2 -translate-y-1/2 h-5 w-1 bg-slate-700 rounded-full" 
                    style={{ left: `calc(${avgPosition}% - 2px)` }}
                    title={`${t('researchConsensus.average')}: ${average.toFixed(2)}`}
                />
                
                 {/* Current Price Marker */}
                 {current !== null && currentPosition >= 0 && (
                    <div 
                        className="absolute top-1/2 -translate-y-1/2" 
                        style={{ left: `${currentPosition}%` }}
                        title={`${t('researchConsensus.current')}: ${current.toFixed(2)}`}
                    >
                         <div className="h-6 w-1 bg-blue-600 rounded-full ring-2 ring-white shadow-md"></div>
                    </div>
                )}
            </div>
            <div className="flex justify-between text-xs sm:text-sm font-semibold">
                <span className="text-green-600">{t('researchConsensus.low')}<br/>{low.toFixed(2)}</span>
                <span className="text-slate-700 text-center">{t('researchConsensus.average')}<br/>{average.toFixed(2)}</span>
                <span className="text-red-600 text-right">{t('researchConsensus.high')}<br/>{high.toFixed(2)}</span>
            </div>
             {current !== null && <p className="text-center text-sm font-bold text-blue-700 pt-2">{t('researchConsensus.current')}: {current.toFixed(2)}</p>}
        </div>
    );
};


interface ResearchConsensusProps {
    consensus: ResearchReportConsensus;
}

const ResearchConsensus: React.FC<ResearchConsensusProps> = ({ consensus }) => {
    const { t } = useI18n();
    const { epsForecasts, targetPriceSummary, recentReports, currentPrice } = consensus;

    const hasEpsData = epsForecasts && epsForecasts.length > 0 && epsForecasts.some(e => e.consensusEps !== null);
    const hasTargetPriceData = targetPriceSummary && (targetPriceSummary.average !== null);
    const hasReportsData = recentReports && recentReports.length > 0;

    if (!hasEpsData && !hasTargetPriceData && !hasReportsData) {
        return null; // Don't render the card if all data is empty
    }

    return (
        <Card title={t('researchConsensus.title')} icon={<ChartTrendingUpIcon className="w-5 h-5" />} className="md:col-span-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {/* EPS Forecast */}
                    <div>
                        <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><ChartTrendingUpIcon className="w-5 h-5 text-cyan-600" /> {t('researchConsensus.epsTitle')}</h4>
                        {hasEpsData ? (
                             <div className="grid grid-cols-3 gap-2 text-center">
                                {epsForecasts.map((eps, index) => (
                                    <div key={index} className="bg-slate-100/70 p-3 rounded-lg">
                                        <p className="text-sm font-bold text-slate-800">{eps.year}</p>
                                        <p className="text-lg font-semibold text-cyan-700">{eps.consensusEps?.toFixed(2) ?? 'N/A'}</p>
                                        <p className={`text-xs font-medium ${eps.growthRate === null ? 'text-slate-500' : eps.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {eps.growthRate !== null ? `YoY ${eps.growthRate >= 0 ? '+' : ''}${eps.growthRate.toFixed(1)}%` : '-'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-slate-500 text-sm">{t('researchConsensus.noEps')}</p>}
                    </div>

                    {/* Target Price */}
                    <div>
                         <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><TagIcon className="w-5 h-5 text-cyan-600" /> {t('researchConsensus.targetPriceTitle')}</h4>
                         {hasTargetPriceData ? (
                            <TargetPriceVisualizer 
                                low={targetPriceSummary.low}
                                average={targetPriceSummary.average}
                                high={targetPriceSummary.high}
                                current={currentPrice}
                            />
                         ) : <p className="text-slate-500 text-sm">{t('researchConsensus.noTargetPrice')}</p>}
                    </div>
                </div>

                {/* Recent Reports */}
                <div>
                     <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><DocumentTextIcon className="w-5 h-5 text-cyan-600" /> {t('researchConsensus.recentReportsTitle')}</h4>
                     {hasReportsData ? (
                        <ul className="space-y-3">
                            {recentReports.slice(0, 3).map((report, index) => (
                                <li key={index} className="p-3 bg-slate-100/70 rounded-lg text-sm group transition-all hover:bg-slate-200/60">
                                     <a href={report.pdfUrl} target="_blank" rel="noopener noreferrer" className="block">
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold text-slate-800 flex-1 pr-2">{report.title}</p>
                                            <ExternalLinkIcon className="w-4 h-4 text-cyan-600 hover:text-cyan-800 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0"/>
                                        </div>
                                        <div className="flex justify-between items-baseline text-xs mt-1">
                                            <p className="text-slate-600 truncate pr-2">{report.institution} - {report.publishDate}</p>
                                            {report.rating && <span className="font-bold text-cyan-700 px-2 py-0.5 bg-cyan-100/80 rounded whitespace-nowrap">{report.rating}</span>}
                                        </div>
                                    </a>
                                </li>
                            ))}
                        </ul>
                     ) : <p className="text-slate-500 text-sm">{t('researchConsensus.noReports')}</p>}
                </div>
            </div>
        </Card>
    );
};

export default ResearchConsensus;
