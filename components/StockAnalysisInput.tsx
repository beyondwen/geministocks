import React, { useState, useEffect, useRef } from 'react';
import { ChartBarIcon } from './icons/Icons';
import { useI18n } from '../hooks/useI18n';

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
  const { t } = useI18n();
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
    <div className="glass-refined p-6 animate-reveal-up">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl shadow-lg flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-cyan-500">{t('stockAnalysisInput.title')}</h3>
              <p id="stock-input-description" className="text-sm text-slate-600">
                {t('stockAnalysisInput.description')}
              </p>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow w-full" ref={componentRef}>
            <input
              id="stock-input"
              type="text"
              className="w-full bg-white/70 border-2 border-slate-200/80 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500/80 transition-all duration-300 placeholder:text-slate-400"
              placeholder={t('stockAnalysisInput.placeholder')}
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
                className="absolute z-10 w-full mt-2 bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-xl shadow-lg max-h-60 overflow-y-auto animate-fade-in"
              >
                {filteredSuggestions.map((stock) => (
                  <li
                    key={stock.ticker}
                    role="option"
                    aria-selected="false"
                    className="px-4 py-2 text-slate-800 cursor-pointer hover:bg-cyan-100/80 transition-colors"
                    onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(stock.name); }}
                  >
                    {stock.name} <span className="text-slate-500 font-mono">{stock.ticker}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !stockQuery.trim()}
            className="relative inline-flex items-center justify-center w-full sm:w-auto px-10 py-3 bg-gradient-to-r from-green-500 to-cyan-500 text-white text-base font-medium rounded-xl group overflow-hidden shadow-lg hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-lg disabled:-translate-y-0 disabled:hover:shadow-lg whitespace-nowrap"
          >
             <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
            {isLoading ? (
              <>
                <svg aria-hidden="true" className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="relative z-10">{t('analysisInput.buttonLoading')}</span>
              </>
            ) : (
              <span className="relative z-10">{t('stockAnalysisInput.button')}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockAnalysisInput;