import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { toPng } from 'html-to-image';
import type { AnalysisReport, InvestmentScore } from '../types';
import { DownloadIcon, SparklesIcon, CheckCircleIcon, DocumentArrowDownIcon, LinkIcon, BuildingStorefrontIcon } from './icons/Icons';
import TieredSuggestionsDisplay from './TieredSuggestionsDisplay';
import IndustryChainViz from './IndustryChainViz';
import TextRenderer from './TextRenderer';
import AssociationAnalysisGraph from './AssociationAnalysisGraph';

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
    const sentimentConfig = {
      Positive: {
        label: '乐观',
        icon: '😊',
        colors: 'border-green-300/80 text-green-700',
        gradient: 'from-green-500 to-emerald-500',
      },
      Neutral: {
        label: '中性',
        icon: '😐',
        colors: 'border-yellow-300/80 text-yellow-700',
        gradient: 'from-yellow-500 to-orange-500',
      },
      Negative: {
        label: '悲观',
        icon: '😟',
        colors: 'border-red-300/80 text-red-700',
        gradient: 'from-red-500 to-pink-500',
      },
    };
  
    const config = sentimentConfig[sentiment] || sentimentConfig.Neutral;
  
    return (
       <div className={`glass-refined backdrop-blur-sm border-2 ${config.colors} rounded-xl px-4 py-3 shadow-soft inline-flex items-center gap-3 font-medium transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5`}>
            <div className={`w-8 h-8 bg-gradient-to-r ${config.gradient} rounded-full flex items-center justify-center shadow-lg`}>
                <span className="text-white text-sm">{config.icon}</span>
            </div>
            <span className="whitespace-nowrap">{config.label}</span>
        </div>
    );
};

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
  <div className={`glass-refined bg-white/40 backdrop-blur-md border border-slate-200/40 rounded-2xl p-6 shadow-soft h-full ${className}`}>
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
        <span className="w-5 h-5 text-white block">{icon}</span>
      </div>
      <h3 className="text-xl font-semibold text-gradient-primary">{title}</h3>
    </div>
    <div className="text-slate-700 space-y-4 leading-relaxed">{children}</div>
  </div>
);

const ScoreDisplay: React.FC<{ scoreData: InvestmentScore }> = ({ scoreData }) => {
  const getScoreColor = (score: number) => {
    if (score >= 75) return { text: 'text-green-600', bg: 'bg-green-50/80', border: 'border-green-200', accent: 'from-green-500 to-emerald-500' };
    if (score >= 50) return { text: 'text-yellow-600', bg: 'bg-yellow-50/80', border: 'border-yellow-200', accent: 'from-yellow-500 to-orange-500' };
    return { text: 'text-red-600', bg: 'bg-red-50/80', border: 'border-red-200', accent: 'from-red-500 to-red-600' };
  };

  const { score, reason } = scoreData;
  const { text, bg, border, accent } = getScoreColor(score);

  return (
    <div className={`glass-refined backdrop-blur-sm border-2 ${border} ${bg} rounded-2xl p-6 shadow-soft hover:shadow-elevated transition-all duration-300`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center mb-4 sm:mb-0">
          <div className={`p-2 bg-gradient-to-r ${accent} rounded-xl shadow-lg mr-3`}>
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-2xl font-light text-gradient-primary">投资吸引力评分</h3>
        </div>
        <div className="text-center sm:text-right">
          <div className="relative">
            <p className={`text-5xl font-bold ${text} tracking-tight`}>
              {score}
              <span className="text-2xl font-medium opacity-70">/100</span>
            </p>
            <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gradient-to-r ${accent} rounded-full opacity-60`}></div>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200/60">
        <p className="text-sm text-slate-600 leading-relaxed"><TextRenderer text={reason} /></p>
      </div>
    </div>
  );
};

const KeyTakeaways: React.FC<{ takeaways: string[] }> = ({ takeaways }) => (
    <Card title="核心摘要" icon={<CheckCircleIcon className="w-5 h-5"/>}>
        <ul className="space-y-3">
            {takeaways.map((item, index) => (
                <li key={index} className="flex items-start">
                    <div className="mt-1 mr-3 w-1.5 h-1.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex-shrink-0"></div>
                    <span className="text-slate-700"><TextRenderer text={item} /></span>
                </li>
            ))}
        </ul>
    </Card>
);

interface AnalysisResultProps {
  report: AnalysisReport;
  userInput: string;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ report, userInput }) => {
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
        const topic = report.summary.substring(0, 30).replace(/\s+/g, '_').replace(/[^\w-]/g, '');
        link.download = `投资分析报告_${topic || 'report'}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((err) => {
        console.error('Failed to export image:', err);
        setExportError('导出图片失败。请稍后再试。');
      })
      .finally(() => {
        setIsExporting(false);
      });
  }, [report]);
  
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

  return (
    <div className="space-y-6 animate-reveal-scale">
      {isPreparingPdf && (
        <div className="no-print fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 shadow-floating text-center">
            <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-xl font-semibold text-slate-800">正在准备导出...</p>
            <p className="text-sm text-slate-600 mt-1">即将打开打印预览窗口</p>
          </div>
        </div>
      )}

      <div className="no-print relative flex justify-end gap-x-2">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 glass-refined bg-white/90 backdrop-blur-sm border-2 border-slate-200/60 text-slate-700 text-sm font-medium rounded-xl shadow-soft hover:bg-white hover:border-slate-300/80 hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5"
          aria-label="导出为 PDF"
        >
          <DocumentArrowDownIcon className="h-5 w-5" />
          <span>导出 PDF</span>
        </button>
        <button
          onClick={handleExportImage}
          disabled={isExporting}
          className="relative inline-flex items-center gap-2 px-4 py-2 btn-premium text-white text-sm font-medium rounded-xl group overflow-hidden shadow-lg hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="导出为图片"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
          <DownloadIcon className="h-5 w-5" />
          <span className="relative z-10">{isExporting ? '正在导出...' : '导出图片'}</span>
        </button>
      </div>

      {exportError && <div role="alert" className="glass-refined bg-red-50/80 border-2 border-red-200 text-red-700 px-6 py-4 text-center"><p>{exportError}</p></div>}

      <div ref={exportRef} className="printable-area p-4 sm:p-8 bg-gradient-to-br from-slate-50/80 to-slate-100/80 rounded-3xl shadow-floating border border-white/80">
        <div className="text-center mb-8 pb-6 border-b border-slate-200/60">
          <h2 className="text-4xl font-light text-gradient-primary mb-2">多维度投资分析报告</h2>
          <p className="text-sm text-slate-600">
            分析来源: <span className="font-mono bg-slate-200/60 px-2 py-1 rounded text-xs text-slate-700">
              {truncateText(userInput, 80)}
            </span>
          </p>
        </div>
        
        <div className="space-y-6">
            {report.investmentScore && <ScoreDisplay scoreData={report.investmentScore} />}
            
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gradient-primary mb-3 pl-2">总体概述</h3>
                 <blockquote className="text-slate-800 font-medium italic border-l-4 border-blue-400 pl-4 py-2 bg-blue-50/80 rounded-r-lg">
                    <TextRenderer text={report.summary} keywords={keywords} />
                 </blockquote>
            </div>

            {report.keyTakeaways && report.keyTakeaways.length > 0 && <KeyTakeaways takeaways={report.keyTakeaways} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="宏观与政策面" icon={<GlobeIcon className="w-5 h-5"/>}>
                    <TextRenderer text={report.analysis.macroPolicy} keywords={keywords} />
                </Card>
              
                <Card title="市场情绪与催化剂" icon={<SparklesIcon className="w-5 h-5"/>}>
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="font-semibold text-slate-800">情绪评估:</span>
                      <SentimentIndicator sentiment={report.analysis.marketSentiment.sentiment} />
                    </div>
                    <TextRenderer text={report.analysis.marketSentiment.description} keywords={keywords} />
                </Card>

                <Card title="行业与产业链" className="md:col-span-2" icon={<DiagramIcon className="w-5 h-5"/>}>
                    {typeof report.analysis.industryChain === 'string' ? (
                        <TextRenderer text={report.analysis.industryChain} keywords={keywords} />
                    ) : (
                        <IndustryChainViz chain={report.analysis.industryChain} />
                    )}
                </Card>

                <Card title="公司基本面" className="md:col-span-2" icon={<BuildingStorefrontIcon className="w-5 h-5"/>}>
                    <TextRenderer text={report.analysis.companyFundamentals} keywords={keywords} />
                </Card>
              
                {report.marketSizeAndOutlook && (
                    <Card title="市场规模与应用前景预测" className="md:col-span-2" icon={<ChartPieIcon className="w-5 h-5"/>}>
                        <TextRenderer text={report.marketSizeAndOutlook} keywords={keywords} />
                    </Card>
                )}

                <Card title="投资策略" className="md:col-span-2" icon={<StrategyIcon className="w-5 h-5"/>}>
                    <div>
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">核心投资逻辑:</h4>
                        <p className="pl-4 border-l-4 border-blue-400"><TextRenderer text={report.investmentStrategy.logic} keywords={keywords} /></p>
                    </div>
                    <div className="mt-4">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">策略建议:</h4>
                        <p className="pl-4 border-l-4 border-green-400"><TextRenderer text={report.investmentStrategy.suggestion} keywords={keywords} /></p>
                    </div>
                    <div className="mt-4">
                        <h4 className="text-lg font-semibold text-slate-900 mb-2">潜在风险:</h4>
                        <p className="pl-4 border-l-4 border-red-400"><TextRenderer text={report.investmentStrategy.risks} keywords={keywords} /></p>
                    </div>
                </Card>
              
                {report.allocationCadenceAndOutlook && (
                    <Card title="配置节奏与展望" className="md:col-span-2" icon={<CalendarIcon className="w-5 h-5"/>}>
                        <TextRenderer text={report.allocationCadenceAndOutlook} keywords={keywords} />
                    </Card>
                )}

                {report.associationAnalysis && (
                    <Card title="关联分析图谱" className="md:col-span-2" icon={<LinkIcon className="w-5 h-5"/>}>
                        <AssociationAnalysisGraph 
                          analysis={report.associationAnalysis}
                          originalTopic={userInput}
                        />
                    </Card>
                )}
            </div>
            
            <TieredSuggestionsDisplay suggestions={report.tieredSuggestions} keywords={keywords} />

            {report.sources && report.sources.length > 0 && (
                <Card title="参考来源" icon={<DocumentArrowDownIcon className="w-5 h-5"/>}>
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        {report.sources.map((source, index) => (
                            <li key={index}>
                                <a
                                    href={source.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-purple-600 hover:underline transition-colors animated-underline"
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
        <footer className="text-center mt-8 pt-4 border-t border-slate-200/60">
          <p className="text-xs text-slate-500">
            本报告由「超级挖掘机」分析生成<br />投资有风险，决策需谨慎
          </p>
        </footer>
      </div>
    </div>
  );
};

export default AnalysisResult;