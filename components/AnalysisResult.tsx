import React, { useRef, useState, useCallback, useMemo } from 'react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import type { AnalysisReport, StockTicker } from '../types';
import { DownloadIcon, DocumentArrowDownIcon } from './icons/Icons';
import StockRecommendations from './StockRelevanceChart';
import IndustryChainViz from './IndustryChainViz';

// Helper component for highlighting text. It wraps keywords in a styled <mark> tag.
const HighlightedText: React.FC<{ text: string; keywords: string[] }> = ({ text, keywords }) => {
  if (!keywords || keywords.length === 0 || !text) {
    return <>{text}</>;
  }

  // Escape special characters for regex and create a single regex for all keywords
  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${keywords.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        const isKeyword = keywords.some(keyword => keyword.toLowerCase() === part.toLowerCase());
        if (isKeyword) {
          return (
            <mark key={index} className="bg-cyan-100 text-cyan-800 rounded-sm px-1 mx-px font-semibold">
              {part}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

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

    toPng(exportRef.current, { cacheBust: true, pixelRatio: 2 })
      .then((dataUrl) => {
        const pdf = new jsPDF('p', 'px', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          const imgWidth = img.width;
          const imgHeight = img.height;
          const ratio = imgHeight / imgWidth;
          const contentHeight = pdfWidth * ratio;

          let position = 0;
          let heightLeft = contentHeight;

          pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, contentHeight);
          heightLeft -= pdfHeight;

          while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, contentHeight);
            heightLeft -= pdfHeight;
          }
          
          const date = new Date().toISOString().split('T')[0];
          const topic = report.summary.substring(0, 30).replace(/\s+/g, '_').replace(/[^\w-]/g, '');
          const fileName = `投资分析报告_${topic || 'report'}_${date}.pdf`;
          pdf.save(fileName);
        }
      })
      .catch((err) => {
        console.error('Failed to export PDF:', err);
        setExportError('导出 PDF 失败。请稍后再试。');
      })
      .finally(() => {
        setIsExportingPdf(false);
      });
  }, [report]);

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
          aria-label="导出为 PDF"
        >
          <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" />
          {isExportingPdf ? '正在导出...' : '导出 PDF'}
        </button>
      </div>

      {exportError && (
        <div role="alert" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-center">
            <p>{exportError}</p>
        </div>
      )}

      {/* This ref wrapper provides a solid background and padding for the exported image. */}
      <div ref={exportRef} className="p-4 sm:p-6 bg-white rounded-lg shadow-lg">
        <div className="space-y-8">
          <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-lg">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              投资分析报告 📝
            </h2>
            <p className="text-gray-700">
              <HighlightedText text={report.summary} keywords={keywords} />
            </p>
          </div>
    
          <InfoCard title="四维一体立体化分析 🔬">
            <div><strong>宏观与政策面：</strong> <HighlightedText text={report.analysis.macroPolicy} keywords={keywords} /></div>
            <div>
                <strong>行业与产业链：</strong>
                {typeof report.analysis.industryChain === 'object' && report.analysis.industryChain !== null ? (
                    <IndustryChainViz chain={report.analysis.industryChain} />
                ) : (
                    <p className='inline'><HighlightedText text={report.analysis.industryChain as string} keywords={keywords} /></p>
                )}
            </div>
            <div><strong>公司基本面：</strong> <HighlightedText text={report.analysis.companyFundamentals} keywords={keywords} /></div>
            <div>
              <div className="flex items-center mb-1">
                  <strong className="mr-2">市场情绪与催化剂：</strong>
                  <SentimentIndicator sentiment={report.analysis.marketSentiment.sentiment} />
              </div>
              <p className="pl-1">
                  <HighlightedText text={report.analysis.marketSentiment.description} keywords={keywords} />
              </p>
            </div>
          </InfoCard>
    
          <InfoCard title="投资策略与风险提示 💡">
            <div><strong>核心投资逻辑：</strong> <HighlightedText text={report.investmentStrategy.logic} keywords={keywords} /></div>
            <div><strong>操作建议：</strong> <HighlightedText text={report.investmentStrategy.suggestion} keywords={keywords} /></div>
            <div><strong>风险提示：</strong> <HighlightedText text={report.investmentStrategy.risks} keywords={keywords} /></div>
          </InfoCard>
    
          <InfoCard title="相关标的推荐 🎯">
            {report.recommendedStocks && report.recommendedStocks.length > 0 ? (
              <StockRecommendations 
                stocks={report.recommendedStocks} 
                keywords={keywords}
              />
            ) : (
              <p className="text-gray-500">未找到相关的股票标的。</p>
            )}
          </InfoCard>
        </div>
        <footer className="text-center mt-8 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
                本报告使用僧僧开发的股市超级挖掘机分析生成，<br />欢迎关注“小声读书”公众号获取更多信息
            </p>
        </footer>
      </div>
    </div>
  );
};

export default AnalysisResult;