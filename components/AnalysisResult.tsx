import React from 'react';
import type { AnalysisReport, StockTicker } from '../types';

const InfoCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white/60 p-6 rounded-lg shadow-md border border-gray-200">
    <h3 className="text-2xl font-bold text-gray-800 mb-4">{title}</h3>
    <div className="text-gray-700 space-y-2">{children}</div>
  </div>
);

const StockTable: React.FC<{ stocks: StockTicker[] }> = ({ stocks }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm text-left text-gray-600">
      <thead className="text-xs text-gray-700 uppercase bg-gray-100">
        <tr>
          <th scope="col" className="px-4 py-3">名称</th>
          <th scope="col" className="px-4 py-3">代码</th>
          <th scope="col" className="px-4 py-3">市场</th>
          <th scope="col" className="px-4 py-3">推荐理由</th>
          <th scope="col" className="px-4 py-3">关联度</th>
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock, index) => (
          <tr key={index} className="bg-white border-b hover:bg-gray-50">
            <td className="px-4 py-3 font-medium text-gray-900">{stock.name}</td>
            <td className="px-4 py-3">{stock.ticker}</td>
            <td className="px-4 py-3">{stock.market}</td>
            <td className="px-4 py-3">{stock.reason}</td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                stock.relevance === 'High' ? 'bg-green-100 text-green-800' :
                stock.relevance === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {stock.relevance}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);


const AnalysisResult: React.FC<{ report: AnalysisReport }> = ({ report }) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-lg">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          投资分析报告 📝
        </h2>
        <p className="text-gray-700">{report.summary}</p>
      </div>

      <InfoCard title="四维一体立体化分析 🔬">
        <p><strong>宏观与政策面：</strong> {report.analysis.macroPolicy}</p>
        <p><strong>行业与产业链：</strong> {report.analysis.industryChain}</p>
        <p><strong>公司基本面：</strong> {report.analysis.companyFundamentals}</p>
        <p><strong>市场情绪与催化剂：</strong> {report.analysis.marketSentiment}</p>
      </InfoCard>

      <InfoCard title="投资策略与风险提示 💡">
        <p><strong>核心投资逻辑：</strong> {report.investmentStrategy.logic}</p>
        <p><strong>操作建议：</strong> {report.investmentStrategy.suggestion}</p>
        <p><strong>风险提示：</strong> {report.investmentStrategy.risks}</p>
      </InfoCard>

      <InfoCard title="相关标的推荐 🎯">
        {report.recommendedStocks && report.recommendedStocks.length > 0 ? (
          <StockTable stocks={report.recommendedStocks} />
        ) : (
          <p className="text-gray-500">未找到相关的股票标的。</p>
        )}
      </InfoCard>
    </div>
  );
};

export default AnalysisResult;
