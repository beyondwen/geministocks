import React, { useState } from 'react';

interface StockAnalysisInputProps {
  onAnalyze: (stockQuery: string) => void;
  isLoading: boolean;
}

const StockAnalysisInput: React.FC<StockAnalysisInputProps> = ({ onAnalyze, isLoading }) => {
  const [stockQuery, setStockQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyze(stockQuery);
  };

  return (
    <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-lg">
      <form onSubmit={handleSubmit}>
        <label htmlFor="stock-input" className="block text-lg font-medium text-gray-700 mb-3">
          输入股票代码或名称进行综合分析 📈
        </label>
        <p id="stock-input-description" className="text-sm text-gray-600 mb-4">
          例如: "AAPL", "苹果公司", "00700.HK", "腾讯控股"。
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            id="stock-input"
            type="text"
            className="flex-grow w-full bg-gray-50 border border-gray-300 rounded-md px-4 py-3 text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
            placeholder="输入股票代码或名称..."
            value={stockQuery}
            onChange={(e) => setStockQuery(e.target.value)}
            disabled={isLoading}
            aria-describedby="stock-input-description"
          />
          <button
            type="submit"
            disabled={isLoading || !stockQuery.trim()}
            className="inline-flex items-center justify-center w-full sm:w-auto px-10 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <svg aria-hidden="true" className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                分析中...
              </>
            ) : (
              '分析个股'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockAnalysisInput;