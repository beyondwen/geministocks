import React from 'react';
import type { QandAResultItem } from '../types';
import { useI18n } from '../hooks/useI18n';
import { PlusIcon, LightBulbIcon, SparklesIcon } from './icons/Icons';
import TextRenderer from './TextRenderer';

interface QandAResultProps {
  result: QandAResultItem;
  onNewAnalysis: () => void;
}

const QandAResult: React.FC<QandAResultProps> = ({ result, onNewAnalysis }) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6 animate-reveal-scale">
        <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold text-black">{t('qandaResult.title')}</h2>
             <button
                onClick={onNewAnalysis}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-black text-sm font-medium rounded-xl shadow-sm hover:bg-gray-100 hover:border-gray-300 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                aria-label={t('analysisResult.newAnalysis')}
                >
                <PlusIcon className="h-5 w-5" />
                <span>{t('analysisResult.newAnalysis')}</span>
            </button>
        </div>

        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-sm space-y-8">
            {/* Rephrased Question Section */}
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                        <LightBulbIcon className="w-5 h-5 text-black" />
                    </div>
                    <h3 className="text-lg font-semibold text-black">{t('qandaResult.rephrasedTitle')}</h3>
                </div>
                <blockquote className="text-gray-800 font-medium border-l-4 border-gray-300 pl-4 py-2 bg-gray-50 rounded-r-lg">
                    {result.rephrasedQuestion}
                </blockquote>
            </div>

            {/* AI Answer Section */}
            <div>
                <div className="flex items-center gap-3 mb-4">
                     <div className="p-2 bg-black rounded-lg">
                        <SparklesIcon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-black">{t('qandaResult.answerTitle')}</h3>
                </div>
                <div className="prose prose-base max-w-none text-gray-800 leading-relaxed prose-p:mb-4 prose-ul:my-4 prose-ol:my-4">
                    <TextRenderer text={result.answer} />
                </div>
            </div>
        </div>
    </div>
  );
};

export default QandAResult;