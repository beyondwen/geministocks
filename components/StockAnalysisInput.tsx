import React, { useState, useEffect, useRef } from 'react';

interface Stock {
  name: string;
  ticker: string;
}

interface StockAnalysisInputProps {
  stockQuery: string;
  setStockQuery: (query: string) => void;
  onAnalyze: (stockQuery: string) => void;
  isLoading: boolean;
  suggestions: Stock[];
}

const StockAnalysisInput: React.FC<StockAnalysisInputProps> = ({ stockQuery, setStockQuery, onAnalyze, isLoading, suggestions: initialSuggestions }) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState<Stock[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    onAnalyze(stockQuery);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setStockQuery(query);

    if (query.trim().length > 0) {
      const filtered = initialSuggestions.filter(
        stock =>
          stock.name.toLowerCase().includes(query.toLowerCase()) ||
          stock.ticker.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (stockName: string) => {
    setStockQuery(stockName);
    setShowSuggestions(false);
    onAnalyze(stockName); // Trigger analysis on selection
  };
  
  // Effect to handle clicks outside the component to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (componentRef.current && !componentRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-lg">
      <form onSubmit={handleSubmit}>
        <label htmlFor="stock-input" className="block text-lg font-medium text-gray-700 mb-3">
          输入股票代码或名称进行分析 📈
        </label>
        <p id="stock-input-description" className="text-sm text-gray-600 mb-4">
          例如: "AAPL", "苹果公司", "00700.HK", "腾讯控股"。
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow w-full" ref={componentRef}>
            <input
              id="stock-input"
              type="text"
              className="w-full bg-gray-50 border border-gray-300 rounded-md px-4 py-3 text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              placeholder="输入股票代码或名称..."
              value={stockQuery}
              onChange={handleInputChange}
              onFocus={handleInputChange} // Show suggestions on focus as well
              disabled={isLoading}
              aria-describedby="stock-input-description"
              autoComplete="off"
              aria-controls="stock-suggestions"
              aria-expanded={showSuggestions}
              aria-haspopup="listbox"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <ul
                id="stock-suggestions"
                role="listbox"
                className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto animate-fade-in"
              >
                {filteredSuggestions.map((stock) => (
                  <li
                    key={stock.ticker}
                    role="option"
                    aria-selected="false"
                    className="px-4 py-2 text-gray-800 cursor-pointer hover:bg-teal-100 transition-colors"
                    // Use onMouseDown to prevent blur event from hiding suggestions before click is registered
                    onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(stock.name); }}
                  >
                    {stock.name} <span className="text-gray-500 font-mono">{stock.ticker}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !stockQuery.trim()}
            className="inline-flex items-center justify-center w-full sm:w-auto px-10 py-3 border border-transparent text-base font-medium rounded-md shadow-lg text-white bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-teal-500 transform-gpu transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 whitespace-nowrap"
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