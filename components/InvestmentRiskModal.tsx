import React from 'react';
import { useI18n } from '../hooks/useI18n';

interface InvestmentRiskModalProps {
  onAccept: () => void;
}

const InvestmentRiskModal: React.FC<InvestmentRiskModalProps> = ({ onAccept }) => {
  const { t } = useI18n();

  return (
    <div
      className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="risk-modal-title"
    >
      <div
        className="glass-refined bg-white/80 p-8 max-w-lg w-full mx-4 text-left relative animate-reveal-scale rounded-2xl shadow-floating"
      >
        <h2 id="risk-modal-title" className="text-2xl font-bold text-slate-800 mb-4 text-center border-b border-slate-200/60 pb-3">
          {t('riskModal.title')}
        </h2>
        
        <div className="text-slate-700 space-y-4 my-6 leading-relaxed">
            <p>{t('riskModal.line1')}</p>
            <p>{t('riskModal.line2')}</p>
            <p>{t('riskModal.line3')}</p>
            <p className="font-semibold text-slate-800 mt-4">{t('riskModal.line4')}</p>
        </div>

        <div className="mt-8 flex justify-center">
            <button
              onClick={onAccept}
              className="relative w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 btn-premium text-white text-base font-medium rounded-xl group overflow-hidden shadow-lg hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
              <span className="relative z-10">{t('riskModal.acceptButton')}</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default InvestmentRiskModal;