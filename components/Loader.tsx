
import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../hooks/useI18n';
import { SnowflakeIcon } from './icons/Icons';

// Standard Fisher-Yates shuffle algorithm to randomize message order
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Icons for progress steps
const CheckmarkIcon = () => (
    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
);

const FestiveSpinnerIcon = () => (
    <div className="w-5 h-5 animate-spin text-red-500">
        <SnowflakeIcon className="w-full h-full" />
    </div>
);

const CircleIcon = () => (
    <div className="w-5 h-5 flex items-center justify-center">
        <div className="w-2.5 h-2.5 bg-gray-300 rounded-full"></div>
    </div>
);


interface LoaderProps {
  currentStep?: number;
  taskType?: 'topic' | 'stock' | 'positional';
}

const Loader: React.FC<LoaderProps> = ({ currentStep = 0, taskType }) => {
    const { t } = useI18n();
    
    const getStepsForTask = (task?: 'topic' | 'stock' | 'positional'): string[] => {
        if (task === 'topic') return t('loader.topicSteps') as unknown as string[];
        if (task === 'stock') return t('loader.stockSteps') as unknown as string[];
        if (task === 'positional') return t('loader.positionalSteps') as unknown as string[];
        return [];
    };

    const steps = getStepsForTask(taskType);
    const quotes = t('loader.quotes') as unknown as string[];
    const shuffledQuotes = useMemo(() => shuffleArray(quotes), [quotes]);
    const [quoteIndex, setQuoteIndex] = useState(0);


    useEffect(() => {
        const quoteInterval = setInterval(() => {
            setQuoteIndex(prevIndex => (prevIndex + 1) % shuffledQuotes.length);
        }, 4000);

        return () => {
            clearInterval(quoteInterval);
        };
    }, [shuffledQuotes.length]);

    // If it's a step-based task
    if (taskType && steps.length > 0) {
        return (
            <div role="status" aria-live="polite" className="text-center p-8 max-w-md mx-auto animate-fade-in">
                <div className="flex justify-center items-center mb-6">
                    <div className="animate-spin text-red-500">
                        <SnowflakeIcon className="w-12 h-12" />
                    </div>
                </div>
                <p className="text-xl font-semibold text-slate-800 mb-6">{t('loader.analyzing')}</p>
                
                <div className="space-y-3 text-left border border-gray-200 bg-white shadow-sm rounded-lg p-4">
                    {steps.map((step, index) => {
                        const isCompleted = index < currentStep;
                        const isInProgress = index === currentStep;
                        const isPending = index > currentStep;
                        
                        let icon;
                        if (isCompleted) icon = <CheckmarkIcon />;
                        else if (isInProgress) icon = <FestiveSpinnerIcon />;
                        else icon = <CircleIcon />;
                        
                        return (
                            <div key={index} className={`flex items-center gap-x-3 transition-opacity duration-300 ${isPending ? 'opacity-40' : 'opacity-100'}`}>
                                {icon}
                                <span className={`font-medium ${isInProgress ? 'text-black font-semibold' : 'text-gray-600'}`}>
                                    {step}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 border-t border-gray-200 pt-6 min-h-[3rem] flex items-center justify-center">
                  <p key={shuffledQuotes[quoteIndex]} className="text-slate-500 italic animate-fade-in text-sm">
                      "{shuffledQuotes[quoteIndex]}"
                  </p>
                </div>
            </div>
        );
    }

    // Fallback simple loader
    return (
        <div role="status" aria-live="polite" className="text-center p-8">
            <div className="flex justify-center items-center mb-4">
                <div className="animate-spin text-red-500">
                    <SnowflakeIcon className="w-12 h-12" />
                </div>
            </div>
            <p className="text-xl font-semibold text-slate-800">{t('loader.analyzing')}</p>
        </div>
    );
};

export default Loader;
