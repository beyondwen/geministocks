import React from 'react';
import { SwordsIcon } from './icons/Icons';
import { useI18n } from '../hooks/useI18n';

interface PositionalWarfareInputProps {
  leaderStockQuery: string;
  setLeaderStockQuery: (query: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  isPaywalled: boolean;
  cost: number;
}

const PositionalWarfareInput: React.FC<PositionalWarfareInputProps> = ({ leaderStockQuery, setLeaderStockQuery, onAnalyze, isLoading, isPaywalled, cost }) => {
  const { t } = useI18n();
  
  const getButtonText = () => {
    if (isPaywalled) {
      return t('controls.getCredits');
    }
    return t('controls.useCreditAndAnalyzeMulti', { count: cost });
  };

  const buttonText = getButtonText();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyze();
  };

  return (
    <div className="glass-refined p-6 animate-reveal-up">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl shadow-lg flex items-center justify-center">
                <SwordsIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">{t('positionalWarfareInput.title')}</h3>
              <p id="leader-stock-description" className="text-sm text-slate-600">
                {t('positionalWarfareInput.description')}
              </p>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
            <input
              id="leader-stock-input"
              type="text"
              className="w-full flex-grow bg-white/70 border-2 border-slate-200/80 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500/80 transition-all duration-300 placeholder:text-slate-400"
              placeholder={t('positionalWarfareInput.placeholder')}
              value={leaderStockQuery}
              onChange={(e) => setLeaderStockQuery(e.target.value)}
              disabled={isLoading}
              aria-describedby="leader-stock-description"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !leaderStockQuery.trim()}
              className="relative inline-flex items-center justify-center w-full sm:w-auto px-10 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white text-base font-medium rounded-xl group overflow-hidden shadow-lg hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-lg disabled:-translate-y-0 disabled:hover:shadow-lg whitespace-nowrap"
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
                <span className="relative z-10">{buttonText}</span>
              )}
            </button>
        </div>
      </form>
    </div>
  );
};

export default PositionalWarfareInput;