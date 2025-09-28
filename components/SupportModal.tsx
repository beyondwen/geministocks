import React, { useEffect } from 'react';
import { XIcon } from './icons/Icons';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center relative transform transition-all scale-95 opacity-0 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
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
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          aria-label="关闭"
        >
          <XIcon className="w-6 h-6" />
        </button>

        <h2 id="support-modal-title" className="text-2xl font-bold text-gray-800 mb-2">
          支持作者
        </h2>
        <p className="text-gray-600 mb-6">
          如果觉得「超级挖掘机」对您有帮助，可以请我喝杯咖啡 ☕️
        </p>

        <div className="p-2 border-4 border-gray-100 rounded-lg inline-block">
          <img
            src="https://youke1.picui.cn/s1/2025/09/28/68d93e5e927e6.jpg"
            alt="赞赏码"
            className="w-64 h-64 object-contain rounded-md"
          />
        </div>

        <p className="text-xs text-gray-400 mt-4">
          您的支持是项目持续发展的动力！
        </p>
      </div>
    </div>
  );
};

export default SupportModal;
