import React from 'react';
import { SparklesIcon } from './icons/Icons';
import { useI18n } from '../hooks/useI18n';

interface AnalysisInputProps {
  userInput: string;
  setUserInput: (input: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

const AnalysisInput: React.FC<AnalysisInputProps> = ({ userInput, setUserInput, onAnalyze, isLoading }) => {
  const { t } = useI18n();

  return (
    <div className="glass-refined p-6 animate-reveal-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg flex items-center justify-center">
          <SparklesIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gradient-primary">{t('analysisInput.title')}</h3>
          <p id="input-description" className="text-sm text-slate-600">
            {t('analysisInput.description')}
          </p>
        </div>
      </div>
      
      <textarea
        id="news-input"
        rows={8}
        className="w-full bg-white/70 border-2 border-slate-200/80 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/80 transition-all duration-300 placeholder:text-slate-400"
        placeholder={t('analysisInput.placeholder')}
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        disabled={isLoading}
        aria-describedby="input-description"
      />

      <div className="mt-6 flex justify-end">
        <button
          onClick={onAnalyze}
          disabled={isLoading || !userInput.trim()}
          className="relative inline-flex items-center gap-2 px-8 py-3 btn-premium text-white text-base font-medium rounded-xl group overflow-hidden shadow-lg hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-lg disabled:-translate-y-0 disabled:hover:shadow-lg"
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
            <span className="relative z-10">{t('analysisInput.button')}</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default AnalysisInput;