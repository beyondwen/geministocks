import React, { useState, useEffect } from 'react';

interface AnalysisInputProps {
  userInput: string;
  setUserInput: (input: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

// Simple list of stop words to filter out common, non-descriptive words.
const STOP_WORDS = new Set([
  // English
  'a', 'an', 'and', 'the', 'is', 'are', 'in', 'on', 'of', 'for', 'to', 'it', 'with', 'was', 'as', 'by', 'what', 'who', 'when',
  // Chinese
  '的', '是', '在', '了', '和', '与', '或', '也', '但', '对', '从', '个', '我', '你', '他', '她', '我们', '你们', '他们',
  '近期', '影响', '关于', '分析', '一个', '什么', '哪个', '以及',
]);


const AnalysisInput: React.FC<AnalysisInputProps> = ({ userInput, setUserInput, onAnalyze, isLoading }) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);

    // Debounced effect to generate suggestions as user types
    useEffect(() => {
      const handler = setTimeout(() => {
        if (userInput.trim().length < 15) {
          setSuggestions([]);
          return;
        }
        
        // Generate suggestions by extracting potential keywords
        const words = userInput
          .toLowerCase()
          .split(/[\s,.;:!?()"“”"—-]+/) // Split by various punctuation and spaces
          .filter(word => word.length > 1 && !STOP_WORDS.has(word) && !/^\d+$/.test(word)); // Filter stop words, short words, and numbers
        
        // Get unique keywords and take the last few as they are most recent
        const uniqueWords = [...new Set(words)];
        setSuggestions(uniqueWords.slice(-5)); // Show up to 5 suggestions
  
      }, 500); // Wait for 500ms of inactivity before generating suggestions
  
      return () => {
        clearTimeout(handler);
      };
    }, [userInput]);
  
    const handleSuggestionClick = (suggestion: string) => {
      // Append the suggestion to the input.
      const separator = userInput.endsWith(' ') || userInput.length === 0 ? '' : ' ';
      const newText = userInput + separator + suggestion + ' ';
      setUserInput(newText);
    };

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

      {/* Suggestions Area */}
      {suggestions.length > 0 && !isLoading && (
        <div className="mt-4 animate-fade-in">
            <p className="text-sm font-medium text-gray-600 mb-2">建议标签:</p>
            <div className="flex flex-wrap gap-2">
                {suggestions.map((tag, index) => (
                    <button
                        key={`${tag}-${index}`}
                        onClick={() => handleSuggestionClick(tag)}
                        className="px-3 py-1 bg-cyan-100 text-cyan-800 text-xs font-semibold rounded-full hover:bg-cyan-200 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        aria-label={`添加建议标签: ${tag}`}
                    >
                        + {tag}
                    </button>
                ))}
            </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={onAnalyze}
          disabled={isLoading || !userInput.trim()}
          className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg aria-hidden="true" className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
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