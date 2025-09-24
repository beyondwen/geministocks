import React, { useRef, useState, useCallback, useMemo } from 'react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import type { AnalysisReport, InvestmentScore } from '../types';
import { DownloadIcon, DocumentArrowDownIcon, SparklesIcon, CheckCircleIcon } from './icons/Icons';
import StockRecommendations from './StockRelevanceChart';
import IndustryChainViz from './IndustryChainViz';
import TextRenderer from './TextRenderer';

const SentimentIndicator: React.FC<{ sentiment: 'Positive' | 'Neutral' | 'Negative' }> = ({ sentiment }) => {
    const sentimentConfig = {
      Positive: {
        label: '乐观',
        color: 'text-green-800 bg-green-100',
        icon: '😊',
      },
      Neutral: {
        label: '中性',
        color: 'text-yellow-800 bg-yellow-100',
        icon: '😐',
      },
      Negative: {
        label: '悲观',
        color: 'text-red-800 bg-red-100',
        icon: '😟',
      },
    };
  
    const config = sentimentConfig[sentiment] || sentimentConfig.Neutral;
  
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${config.color}`}>
        {config.icon} <span className="ml-1.5">{config.label}</span>
      </div>
    );
};

const InfoCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white/60 p-6 rounded-lg shadow-md border border-gray-200">
    <h3 className="text-2xl font-bold text-gray-800 mb-4">{title}</h3>
    <div className="text-gray-700 space-y-4">{children}</div>
  </div>
);

const ScoreDisplay: React.FC<{ scoreData: InvestmentScore }> = ({ scoreData }) => {
  const getScoreColor = (score: number) => {
    if (score >= 75) return { text: 'text-green-600', bg: 'bg-green-100', border: 'border-green-500' };
    if (score >= 50) return { text: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-500' };
    return { text: 'text-red-600', bg: 'bg-red-100', border: 'border-red-500' };
  };

  const { score, reason } = scoreData;
  const { text, bg, border } = getScoreColor(score);

  return (
    <div className={`p-4 rounded-lg shadow-sm border-l-4 ${border} ${bg} mb-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center mb-2 sm:mb-0">
          <SparklesIcon className={`w-6 h-6 mr-2 ${text}`} />
          <h3 className="text-lg font-bold text-gray-800">投资吸引力评分</h3>
        </div>
        <div className="text-center sm:text-right">
          <p className={`text-4xl font-extrabold ${text}`}>{score}<span className="text-xl font-medium">/100</span></p>
        </div>
      </div>
      <p className="text-sm text-gray-700 mt-2 pl-1"><TextRenderer text={reason} /></p>
    </div>
  );
};

const KeyTakeaways: React.FC<{ takeaways: string[] }> = ({ takeaways }) => (
    <div className="bg-white/60 p-6 rounded-lg shadow-md border border-gray-200 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">核心摘要</h3>
        <ul className="space-y-2">
            {takeaways.map((item, index) => (
                <li key={index} className="flex items-start">
                    <CheckCircleIcon className="w-5 h-5 text-cyan-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700"><TextRenderer text={item} /></span>
                </li>
            ))}
        </ul>
    </div>
);

interface AnalysisResultProps {
  report: AnalysisReport;
  userInput: string;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ report, userInput }) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const keywords = useMemo(() => {
    if (!report || !userInput) return [];

    const stockKeywords = report.recommendedStocks.flatMap(stock => [stock.name, stock.ticker]);
    // Split user input into potential keywords
    const inputKeywords = userInput
      .toLowerCase()
      .split(/[\s,.;:!?()"“”—-]+/) // More comprehensive delimiters
      .filter(word => word.length > 2); // Filter out short/common words

    // Combine, make unique, filter empty strings, and sort by length to match longer phrases first
    return [...new Set([...stockKeywords, ...inputKeywords])]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
  }, [report, userInput]);

  const handleExport = useCallback(() => {
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

  const handleExportPdf = useCallback(() => {
    if (exportRef.current === null) {
      return;
    }
    setIsExportingPdf(true);
    setExportError(null);

    const doc = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4',
    });

    doc.html(exportRef.current, {
        callback: function (pdf) {
            const date = new Date().toISOString().split('T')[0];
            const topic = report.summary.substring(0, 30).replace(/\s+/g, '_').replace(/[^\w-]/g, '');
            const fileName = `投资分析报告_${topic || 'report'}_${date}.pdf`;
            pdf.save(fileName);
            setIsExportingPdf(false);
        },
        html2canvas: {
            scale: 0.5, // Adjust scale to fit content on A4 page
            useCORS: true,
        },
        x: 15,
        y: 15,
        width: 416, // A4 width in px at 72dpi is ~446, leaving some margin
        windowWidth: exportRef.current.scrollWidth,
    }).catch((err) => {
        console.error('Failed to export PDF:', err);
        setExportError('导出 PDF 失败。请稍后再试。');
        setIsExportingPdf(false);
    });
  }, [report]);

  const truncateText = (text: string, length: number): string => {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="relative flex justify-end gap-x-2">
        <button
          onClick={handleExport}
          disabled={isExporting || isExportingPdf}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="导出为图片"
        >
          <DownloadIcon className="-ml-1 mr-2 h-5 w-5" />
          {isExporting ? '正在导出...' : '导出图片'}
        </button>
        <button
          onClick={handleExportPdf}
          disabled={isExportingPdf || isExporting}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="导出为PDF"
        >
          <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" />
          {isExportingPdf ? '正在导出...' : '导出 PDF'}
        </button>
      </div>

      {exportError && <div role="alert" className="bg-red-100 border-red-400 text-red-700 px-4 py-3 rounded text-center"><p>{exportError}</p></div>}

      <div ref={exportRef} className="p-4 sm:p-6 bg-gray-50 rounded-lg shadow-lg">
        <div className="mb-8 pb-6 border-b border-gray-300">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">多纬度投资分析报告 💡</h2>
          <p className="text-sm text-gray-500">
            分析来源: <span className="font-mono bg-gray-200/60 px-2 py-1 rounded text-xs">
              {truncateText(userInput, 80)}
            </span>
          </p>
        </div>
        
        {report.investmentScore && <ScoreDisplay scoreData={report.investmentScore} />}
        
        {report.keyTakeaways && report.keyTakeaways.length > 0 && <KeyTakeaways takeaways={report.keyTakeaways} />}

        <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-3">总体概述</h3>
             <p className="text-gray-800 font-medium italic border-l-4 border-cyan-400 pl-4 py-1 bg-cyan-50/50 rounded-r-md">
                <TextRenderer text={report.summary} keywords={keywords} />
             </p>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <InfoCard title="宏观与政策面">
            <TextRenderer text={report.analysis.macroPolicy} keywords={keywords} />
          </InfoCard>
          
          <InfoCard title="市场情绪与催化剂">
            <div className="flex items-center space-x-4 mb-2">
              <span className="font-semibold">情绪评估:</span>
              <SentimentIndicator sentiment={report.analysis.marketSentiment.sentiment} />
            </div>
            <TextRenderer text={report.analysis.marketSentiment.description} keywords={keywords} />
          </InfoCard>

          <div className="md:col-span-2">
            <InfoCard title="行业与产业链">
              {typeof report.analysis.industryChain === 'string' ? (
                <TextRenderer text={report.analysis.industryChain} keywords={keywords} />
              ) : (
                <IndustryChainViz chain={report.analysis.industryChain} />
              )}
            </InfoCard>
          </div>

          <div className="md:col-span-2">
            <InfoCard title="公司基本面">
              <TextRenderer text={report.analysis.companyFundamentals} keywords={keywords} />
            </InfoCard>
          </div>
          
          <div className="md:col-span-2">
            <InfoCard title="投资策略">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">核心投资逻辑:</h4>
                <p className="pl-4 border-l-4 border-cyan-400"><TextRenderer text={report.investmentStrategy.logic} keywords={keywords} /></p>
              </div>
              <div className="mt-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">策略建议:</h4>
                <p className="pl-4 border-l-4 border-green-400"><TextRenderer text={report.investmentStrategy.suggestion} keywords={keywords} /></p>
              </div>
              <div className="mt-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">潜在风险:</h4>
                <p className="pl-4 border-l-4 border-red-400"><TextRenderer text={report.investmentStrategy.risks} keywords={keywords} /></p>
              </div>
            </InfoCard>
          </div>

          <div className="md:col-span-2">
            <InfoCard title="相关标的推荐">
              <StockRecommendations stocks={report.recommendedStocks} keywords={keywords} />
            </InfoCard>
          </div>

          {report.sources && report.sources.length > 0 && (
            <div className="md:col-span-2">
                <InfoCard title="参考来源">
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        {report.sources.map((source, index) => (
                            <li key={index}>
                                <a
                                    href={source.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyan-600 hover:text-cyan-800 hover:underline transition-colors"
                                    title={source.title}
                                >
                                    {source.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </InfoCard>
            </div>
          )}
        </div>
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            本报告使用股市超级挖掘机分析生成，<br />欢迎关注“小声读书”公众号获取更多信息
          </p>
        </footer>
      </div>
    </div>
  );
};

export default AnalysisResult;