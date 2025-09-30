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
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4 text-left relative transform transition-all scale-95 opacity-0 animate-scale-in"
        style={{ animationDelay: '0.1s' }}
      >
        <style>
          {`
            @keyframes scale-in {
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
            .animate-scale-in {
              animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}
        </style>
        
        <h2 id="risk-modal-title" className="text-2xl font-bold text-gray-800 mb-4 text-center border-b pb-3">
          【投资风险警示】
        </h2>
        
        <div className="text-gray-700 space-y-4 my-6 leading-relaxed">
            <p>股市有风险，投资需谨慎。</p>
            <p>本平台仅提供信息展示，不构成任何投资建议。</p>
            <p>投资者应独立判断并承担投资风险。</p>
            <p className="font-semibold text-gray-800 mt-4">继续使用即表示您已充分了解并接受上述风险提示。</p>
        </div>

        <div className="mt-8 flex justify-center">
            <button
              onClick={onAccept}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-cyan-500 transition-all"
            >
              我已了解风险
            </button>
        </div>
      </div>
    </div>
  );
};

export default InvestmentRiskModal;
