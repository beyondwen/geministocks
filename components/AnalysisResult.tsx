import React, { useRef, useCallback, useState } from 'react';
import { toPng } from 'html-to-image';
import type { AnalysisReport, StockTicker } from '../types';
import { ChartBarIcon, BeakerIcon, ScaleIcon, SparklesIcon, DocumentTextIcon, ArrowDownTrayIcon } from './icons/Icons';

interface AnalysisResultProps {
  report: AnalysisReport;
}

const InfoCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white/50 border border-gray-200 rounded-lg p-5 shadow-md backdrop-blur-sm">
        <div className="flex items-center mb-3">
            <span className="p-2 bg-gray-200 rounded-full mr-3 text-purple-600">{icon}</span>
            <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        </div>
        <p className="text-gray-600 whitespace-pre-wrap">{children}</p>
    </div>
);

const relevanceMap: Record<StockTicker['relevance'], string> = {
  High: '高',
  Medium: '中',
  Low: '低',
};

const marketMap: Record<StockTicker['market'], string> = {
  'A-Share': 'A股',
  'Hong Kong': '港股',
  'US': '美股',
  'Other': '其他',
};

const getRelevanceBadgeClass = (relevance: StockTicker['relevance']): string => {
  switch (relevance) {
    case 'High':
      return 'bg-green-100 text-green-800';
    case 'Medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'Low':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-gray-200 text-gray-700';
  }
};

const AnalysisResult: React.FC<AnalysisResultProps> = ({ report }) => {
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(() => {
    if (reportContainerRef.current === null || isExporting) {
      return;
    }
    setIsExporting(true);

    toPng(reportContainerRef.current, {
      cacheBust: true,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `股市超级挖掘机-分析报告.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Failed to export image:', err);
        alert('导出图片失败，请稍后再试。');
      })
      .finally(() => {
        setIsExporting(false);
      });
  }, [reportContainerRef, isExporting]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white/50 hover:bg-gray-200/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-purple-500 transition-all disabled:opacity-50 disabled:cursor-wait"
          aria-label="Export Report as Image"
        >
          <ArrowDownTrayIcon />
          <span className="ml-2">{isExporting ? '生成中... 🏃‍♂️' : '导出为图片 🖼️'}</span>
        </button>
      </div>

      <div ref={reportContainerRef} className="space-y-8 p-6 bg-white rounded-lg shadow-inner">
        {/* Summary */}
        <div className="bg-gradient-to-r from-purple-100/50 to-cyan-100/50 border border-purple-200 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-cyan-600">核心事件摘要 📝</h2>
          <p className="text-gray-700">{report.summary}</p>
        </div>

        {/* 4D Analysis */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">四维一体立体化分析 🔬</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard title="宏观与政策面 🏛️" icon={<ScaleIcon />}>{report.analysis.macroPolicy}</InfoCard>
            <InfoCard title="行业与产业链 🏭" icon={<ChartBarIcon />}>{report.analysis.industryChain}</InfoCard>
            <InfoCard title="公司基本面 💼" icon={<DocumentTextIcon />}>{report.analysis.companyFundamentals}</InfoCard>
            <InfoCard title="市场情绪与催化剂 🔥" icon={<SparklesIcon />}>{report.analysis.marketSentiment}</InfoCard>
          </div>
        </div>
        
        {/* Strategy & Risk */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">投资策略与风险 🎯</h2>
          <div className="space-y-6">
            <InfoCard title="投资逻辑 💡" icon={<BeakerIcon />}>{report.investmentStrategy.logic}</InfoCard>
            <InfoCard title="策略建议 🧭" icon={<BeakerIcon />}>{report.investmentStrategy.suggestion}</InfoCard>
            <InfoCard title="潜在风险 ⚠️" icon={<BeakerIcon />}>{report.investmentStrategy.risks}</InfoCard>
          </div>
        </div>

        {/* Recommended Stocks */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">推荐股票标的 📊</h2>
          <div className="overflow-x-auto bg-white/50 border border-gray-200 rounded-lg shadow-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100/80">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">股票</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">推荐理由</th>
                  <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">关联度</th>
                </tr>
              </thead>
              <tbody className="bg-white/70 divide-y divide-gray-200">
                {report.recommendedStocks.map((stock, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{stock.name}</div>
                      <div className="text-sm text-gray-500">{stock.ticker} ({marketMap[stock.market] || stock.market})</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 min-w-[300px] whitespace-normal">{stock.reason}</td>
                    <td className="px-3 py-4 text-center">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getRelevanceBadgeClass(stock.relevance)}`}>
                        {relevanceMap[stock.relevance] || stock.relevance}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Disclaimer */}
        <div className="text-center text-xs text-gray-500 pt-4">
            <p><strong>免責声明 🙏：</strong>本处提供的分析和股票推荐由 AI 模型生成，仅供参考，不构成任何投资建议。在做出任何投资决策之前，请自行研究并咨询合格的财务顾问。投资有风险，入市需谨慎。</p>
        </div>

        {/* Image Footer */}
        <div className="text-center pt-6 mt-4 border-t border-gray-200">
            <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-cyan-500">
                股市超级挖掘机
            </h3>
            <p className="text-sm text-gray-500">
              由僧僧 GO 开发驱动
            </p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResult;