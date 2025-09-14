import React, { useState, useEffect } from 'react';
import { XIcon } from './icons/Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string, model: string) => void;
  initialApiKey: string;
  initialModel: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, initialApiKey, initialModel }) => {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [selectedModel, setSelectedModel] = useState(initialModel);

  useEffect(() => {
    setApiKey(initialApiKey);
    setSelectedModel(initialModel);
  }, [initialApiKey, initialModel, isOpen]);

  const handleSave = () => {
    onSave(apiKey, selectedModel);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div
        className="relative bg-white w-full max-w-md m-4 rounded-lg shadow-2xl p-6 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="settings-title" className="text-2xl font-bold text-gray-800">
            设置 ⚙️
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            aria-label="关闭设置"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
              Gemini API 密钥
            </label>
            <input
              type="password"
              id="api-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
              placeholder="在此输入您的 API 密钥"
            />
            <p className="mt-2 text-xs text-gray-500">
              您的密钥将仅存储在您的浏览器中。
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">
                从此处获取您的密钥
              </a>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">模型选择</label>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
                <button
                    onClick={() => setSelectedModel('gemini-2.5-flash')}
                    className={`w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        selectedModel === 'gemini-2.5-flash'
                            ? 'bg-white shadow-sm text-cyan-600'
                            : 'text-gray-600 hover:bg-gray-200'
                    }`}
                    aria-pressed={selectedModel === 'gemini-2.5-flash'}
                >
                    Flash (更快)
                </button>
                <button
                    onClick={() => setSelectedModel('gemini-2.5-pro')}
                    className={`w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        selectedModel === 'gemini-2.5-pro'
                            ? 'bg-white shadow-sm text-cyan-600'
                            : 'text-gray-600 hover:bg-gray-200'
                    }`}
                    aria-pressed={selectedModel === 'gemini-2.5-pro'}
                >
                    Pro (更强)
                </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Flash 模型响应速度更快，Pro 模型分析质量更高。
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;