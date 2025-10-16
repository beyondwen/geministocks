import React, { useState } from 'react';
import { ClockIcon, TrashIcon } from './icons/Icons';
import { useI18n } from '../hooks/useI18n';

interface DisplayHistoryItem {
  id: number;
  text: string;
}

interface AnalysisHistoryProps {
  history: DisplayHistoryItem[];
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
}

const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({ history, onSelect, onDelete, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useI18n();

  if (history.length === 0) {
    return null;
  }

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    onDelete(id);
  };

  const filteredHistory = history.filter(entry =>
    typeof entry.text === 'string' && entry.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass-refined bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-soft">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center p-6 text-left focus:outline-none"
        aria-expanded={isExpanded}
        aria-controls="history-content"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
            <ClockIcon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gradient-primary">{t('analysisHistory.title')}</h3>
        </div>
        <svg
          aria-hidden="true"
          className={`h-6 w-6 transform transition-transform duration-200 text-slate-500 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div id="history-content" className="px-6 pb-6 animate-fade-in">
          <div className="relative mb-4">
            <input
              type="search"
              placeholder={t('analysisHistory.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-200/80 bg-white/70 rounded-full text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/80 transition-colors"
              aria-label={t('analysisHistory.searchPlaceholder')}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto pr-2">
            {filteredHistory.length > 0 ? (
              <ul className="space-y-2">
                {filteredHistory.map((entry) => (
                  <li
                    key={entry.id}
                    onClick={() => onSelect(entry.id)}
                    className="group flex justify-between items-center p-3 rounded-xl cursor-pointer hover:bg-white/80 transition-colors"
                  >
                    <p className="truncate text-sm text-slate-700">
                      {entry.text}
                    </p>
                    <button
                      onClick={(e) => handleDelete(e, entry.id)}
                      className="ml-4 p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-100/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={t('analysisHistory.deleteLabel')}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm text-slate-500 py-4">
                {t('analysisHistory.noResults')}
              </p>
            )}
          </div>
          {history.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-end">
              <button
                onClick={() => {
                  onClear();
                  setSearchTerm('');
                }}
                className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
                {t('analysisHistory.clearAll')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisHistory;