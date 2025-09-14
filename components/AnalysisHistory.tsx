import React, { useState } from 'react';
import type { HistoryEntry } from '../types';
import { ClockIcon, TrashIcon } from './icons/Icons';

interface AnalysisHistoryProps {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
}

const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({ history, onSelect, onDelete, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (history.length === 0) {
    return null;
  }

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center p-4 text-left focus:outline-none"
        aria-expanded={isExpanded}
        aria-controls="history-content"
      >
        <div className="flex items-center">
          <span className="p-2 bg-gray-200 rounded-full mr-3 text-cyan-600">
            <ClockIcon />
          </span>
          <h2 className="text-xl font-semibold text-gray-800">分析历史 📜</h2>
        </div>
        <svg
          aria-hidden="true"
          className={`h-6 w-6 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div id="history-content" className="px-4 pb-4 animate-fade-in">
          <div className="max-h-60 overflow-y-auto pr-2">
            <ul className="space-y-2">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  onClick={() => onSelect(entry)}
                  className="group flex justify-between items-center p-3 rounded-md cursor-pointer hover:bg-gray-200/70 transition-colors"
                >
                  <p className="truncate text-sm text-gray-700">
                    {entry.topic}
                  </p>
                  <button
                    onClick={(e) => handleDelete(e, entry.id)}
                    className="ml-4 p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete history item"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {history.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={onClear}
                className="text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                清空所有历史记录 🗑️
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisHistory;