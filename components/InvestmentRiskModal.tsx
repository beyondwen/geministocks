import React from 'react';

interface InvestmentRiskModalProps {
  onAccept: () => void;
}

const InvestmentRiskModal: React.FC<InvestmentRiskModalProps> = ({ onAccept }) => {
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
          【投资风险警示】
        </h2>
        
        <div className="text-slate-700 space-y-4 my-6 leading-relaxed">
            <p>股市有风险，投资需谨慎。</p>
            <p>本平台仅提供信息展示，不构成任何投资建议。</p>
            <p>投资者应独立判断并承担投资风险。</p>
            <p className="font-semibold text-slate-800 mt-4">继续使用即表示您已充分了解并接受上述风险提示。</p>
        </div>

        <div className="mt-8 flex justify-center">
            <button
              onClick={onAccept}
              className="relative w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 btn-premium text-white text-base font-medium rounded-xl group overflow-hidden shadow-lg hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
              <span className="relative z-10">我已了解风险</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default InvestmentRiskModal;