import React from 'react';

interface AnalysisInputProps {
  userInput: string;
  setUserInput: (input: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

const AnalysisInput: React.FC<AnalysisInputProps> = ({ userInput, setUserInput, onAnalyze, isLoading }) => {
  return (
    <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-lg">
      <label htmlFor="news-input" className="block text-lg font-medium text-gray-700 mb-3">
        输入新闻、URL 内容或主题 ✍️
      </label>
      <p id="input-description" className="text-sm text-gray-600 mb-4">
        请粘贴新闻全文，或描述一个财经主题（例如：“近期加息对科技板块的影响”）。
      </p>
      <textarea
        id="news-input"
        rows={8}
        className="w-full bg-gray-50 border border-gray-300 rounded-md px-4 py-3 text-gray-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
        placeholder="请在此处粘贴您的内容..."
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        disabled={isLoading}
        aria-describedby="input-description"
      />

      <div className="mt-6 flex justify-end">
        <button
          onClick={onAnalyze}
          disabled={isLoading || !userInput.trim()}
          className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-lg text-white bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-cyan-500 transform-gpu transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isLoading ? (
            <>
              <svg aria-hidden="true" className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              分析中... ⏳
            </>
          ) : (
            '开始分析 ✨'
          )}
        </button>
      </div>
    </div>
  );
};

export default AnalysisInput;