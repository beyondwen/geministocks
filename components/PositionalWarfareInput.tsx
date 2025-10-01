import React from 'react';

interface PositionalWarfareInputProps {
  leaderStockQuery: string;
  setLeaderStockQuery: (query: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

const PositionalWarfareInput: React.FC<PositionalWarfareInputProps> = ({ leaderStockQuery, setLeaderStockQuery, onAnalyze, isLoading }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyze();
  };

  return (
    <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-lg">
      <form onSubmit={handleSubmit}>
        <label htmlFor="leader-stock-input" className="block text-lg font-medium text-gray-700 mb-3">
          输入龙头股票名称或代码 🎯
        </label>
        <p id="leader-stock-description" className="text-sm text-gray-600 mb-4">
          AI 将分析该龙头股，并在同板块中寻找位置更低、有潜力接替的“补涨龙”或“龙二”。
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
            <input
              id="leader-stock-input"
              type="text"
              className="w-full flex-grow bg-gray-50 border border-gray-300 rounded-md px-4 py-3 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
              placeholder="例如: 英伟达, NVDA, 宁德时代..."
              value={leaderStockQuery}
              onChange={(e) => setLeaderStockQuery(e.target.value)}
              disabled={isLoading}
              aria-describedby="leader-stock-description"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !leaderStockQuery.trim()}
              className="inline-flex items-center justify-center w-full sm:w-auto px-10 py-3 border border-transparent text-base font-medium rounded-md shadow-lg text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-orange-500 transform-gpu transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 whitespace-nowrap"
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
                '开始分析'
              )}
            </button>
        </div>
      </form>
    </div>
  );
};

export default PositionalWarfareInput;