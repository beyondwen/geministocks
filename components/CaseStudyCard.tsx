import React from 'react';
import { AcademicCapIcon, SparklesIcon, XIcon } from './icons/Icons';
import { useI18n } from '../hooks/useI18n';

interface CaseStudyCardProps {
  onSelect: () => void;
  onClose: () => void;
}

const CaseStudyCard: React.FC<CaseStudyCardProps> = ({ onSelect, onClose }) => {
  const { t } = useI18n();
  const features: string[] = t('caseStudyCard.features');

  return (
    <div className="relative bg-white border border-stone-200/90 rounded-2xl p-6 shadow-sm hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors z-10"
        aria-label={t('caseStudyCard.close')}
      >
        <XIcon className="w-5 h-5" />
      </button>

      <div className="flex-grow">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-black rounded-xl shadow-lg">
            <AcademicCapIcon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gradient-primary">{t('caseStudyCard.title')}</h3>
        </div>

        <div className="mb-4 p-4 bg-gray-100 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-black mb-2">{t('caseStudyCard.descriptionTitle')}</h4>
            <ul className="space-y-1.5 text-sm text-gray-700 list-disc list-inside">
                {features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                ))}
            </ul>
        </div>
      </div>

      <div className="mt-4 text-center">
        <button
          onClick={onSelect}
          className="w-full relative inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl group overflow-hidden btn-premium shadow-md transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
          <SparklesIcon className="w-4 h-4" />
          <span className="relative z-10">{t('caseStudyCard.button')}</span>
        </button>
      </div>
    </div>
  );
};

export default CaseStudyCard;