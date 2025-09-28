import React, { useRef, useState, useCallback, useEffect } from 'react';
import { toPng } from 'html-to-image';
import type { PositionalWarfareReport } from '../types';
import TextRenderer from './TextRenderer';
import { ExternalLinkIcon, DownloadIcon, DocumentArrowDownIcon } from './icons/Icons';

const generateStockLink = (ticker: string, market: string): string => {
    if (market.toLowerCase().includes('a-share') || market.toLowerCase().includes('a股')) {
        const prefix = ticker.startsWith('6') ? 'sh' : 'sz';
        return `https://quote.eastmoney.com/${prefix}${ticker}.html`;
    }
    if (market.toLowerCase().includes('hong kong') || market.toLowerCase().includes('港股')) {
        return `https://www.google.com/finance/quote/${ticker}:HKG`;
    }
    if (market.toLowerCase().includes('us') || market.toLowerCase().includes('美股')) {
        return `https://www.google.com/finance/quote/${ticker}`;
    }
    return `https://www.google.com/finance/q=${encodeURIComponent(ticker)}`;
};

const LeaderStockCard: React.FC<{ leader: PositionalWarfareReport['leaderStock'] }> = ({ leader }) => (
    <div className="bg-white/60 p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-2xl font-bold text-gray-800">龙头股基准</h3>
                <p className="text-gray-500 text-sm">作为我们寻找“补涨龙”的参照物</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                龙头 👑
            </span>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-xl font-semibold">{leader.name} <span className="text-gray-500 font-mono text-base">{leader.ticker}</span></h4>
            <p className="text-sm text-gray-600 mb-2">{leader.sector} | {leader.market}</p>
            <p className="text-gray-700 leading-relaxed"><TextRenderer text={leader.analysis} /></p>
        </div>
    </div>
);

const FollowerCandidateCard: React.FC<{ candidate: PositionalWarfareReport['followerCandidates'][0], index: number }> = ({ candidate, index }) => {
    const link = generateStockLink(candidate.ticker, candidate.market);
    return (
        <div className="bg-white/60 p-6 rounded-lg shadow-md border-l-4 border-cyan-500 transition-shadow hover:shadow-xl">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">潜力补涨龙 #{index + 1}</h3>
                    <h4 className="text-lg font-semibold">{candidate.name} <span className="text-gray-500 font-mono text-base">{candidate.ticker}</span></h4>
                    <p className="text-sm text-gray-600">{candidate.market}</p>
                </div>
                <a 
                  href={link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition-colors"
                  aria-label={`查看 ${candidate.name} 的详情`}
                >
                  查看详情
                  <ExternalLinkIcon className="h-3.5 w-3.5 ml-1" />
                </a>
            </div>
            
            <div className="space-y-4 text-sm">
                <div>
                    <h5 className="font-semibold text-gray-800 mb-1">对比分析 (vs 龙头):</h5>
                    <p className="pl-4 border-l-2 border-gray-300 text-gray-700 leading-relaxed"><TextRenderer text={candidate.comparativeAnalysis} /></p>
                </div>
                <div>
                    <h5 className="font-semibold text-green-700 mb-1">投资论点 (卡位逻辑):</h5>
                    <p className="pl-4 border-l-2 border-green-400 text-gray-700 leading-relaxed"><TextRenderer text={candidate.investmentThesis} /></p>
                </div>
                <div>
                    <h5 className="font-semibold text-red-700 mb-1">核心风险:</h5>
                    <p className="pl-4 border-l-2 border-red-400 text-gray-700 leading-relaxed"><TextRenderer text={candidate.risks} /></p>
                </div>
            </div>
        </div>
    );
};

interface PositionalWarfareResultProps {
  report: PositionalWarfareReport;
}

const PositionalWarfareResult: React.FC<PositionalWarfareResultProps> = ({ report }) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);

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
        link.download = `卡位战法报告_${topic || 'report'}.png`;
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

  return (
    <div className="space-y-4 animate-fade-in">
        {isPreparingPdf && (
            <div className="no-print fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-white rounded-lg p-8 shadow-2xl text-center">
                    <svg className="animate-spin h-10 w-10 text-orange-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-xl font-semibold text-gray-800">正在准备导出...</p>
                    <p className="text-sm text-gray-600 mt-1">即将打开打印预览窗口</p>
                </div>
            </div>
        )}

        <div className="no-print relative flex justify-end gap-x-2">
            <button
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all"
                aria-label="导出为 PDF"
            >
                <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" />
                导出 PDF
            </button>
            <button
                onClick={handleExportImage}
                disabled={isExporting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="导出为图片"
            >
                <DownloadIcon className="-ml-1 mr-2 h-5 w-5" />
                {isExporting ? '正在导出...' : '导出图片'}
            </button>
        </div>

        {exportError && <div role="alert" className="bg-red-100 border-red-400 text-red-700 px-4 py-3 rounded text-center"><p>{exportError}</p></div>}

        <div ref={exportRef} className="printable-area p-4 sm:p-6 bg-gray-50 rounded-lg shadow-lg">
            <div className="mb-8 pb-6 border-b border-gray-300">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">卡位战法分析报告 ⚔️</h2>
                <p className="text-gray-600">寻找板块中的下一个机会</p>
            </div>
            <div className="space-y-8">
                <LeaderStockCard leader={report.leaderStock} />
                
                {report.followerCandidates.map((candidate, index) => (
                    <FollowerCandidateCard key={candidate.ticker} candidate={candidate} index={index} />
                ))}
            </div>
            <footer className="text-center mt-8 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                本报告使用超级挖掘机分析生成，<br />欢迎关注“小声读书”公众号获取更多信息
                </p>
            </footer>
        </div>
    </div>
  );
};

export default PositionalWarfareResult;