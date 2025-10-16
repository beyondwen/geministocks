import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../hooks/useI18n';

// Standard Fisher-Yates shuffle algorithm to randomize message order
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

interface LoaderProps {
  progressMessage?: string;
}

const Loader: React.FC<LoaderProps> = ({ progressMessage }) => {
    const { t } = useI18n();
    const loadingMessages = t('loader.messages') as unknown as string[];
    const shuffledMessages = useMemo(() => shuffleArray(loadingMessages), [loadingMessages]);
    
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex(prevIndex => (prevIndex + 1) % shuffledMessages.length);
        }, 2200);

        return () => clearInterval(interval);
    }, [shuffledMessages.length]);

    const currentMessage = progressMessage || shuffledMessages[messageIndex];

    return (
        <div role="status" aria-live="polite" className="text-center p-8 glass-refined">
            <div className="flex justify-center items-center mb-4">
                <svg aria-hidden="true" className="animate-spin h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
            <p className="text-xl font-semibold text-slate-800">{t('loader.analyzing')}</p>
            <div className="mt-2 h-6 flex items-center justify-center overflow-hidden">
              <p
                key={currentMessage}
                className="text-slate-600 animate-fade-in"
              >
                  {currentMessage}
              </p>
            </div>
        </div>
    );
};

export default Loader;