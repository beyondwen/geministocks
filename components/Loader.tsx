import React, { useState, useEffect, useMemo } from 'react';

// Expanded and more dynamic loading messages for a financial context
const loadingMessages = [
  "正在初始化分析引擎... ⚙️",
  "正在连接 AI 获取深度见解... 🧠",
  "正在交叉验证数据源... 📊",
  "正在应用量化模型... 🧮",
  "正在扫描市场异动信号... 📡",
  "正在评估地缘政治风险... 🗺️",
  "正在模拟未来现金流... 💰",
  "正在构建多维分析框架... 🏗️",
  "正在解析最新财报数据... 📄",
  "正在分析宏观经济因素... 🌍",
  "正在绘制产业链图谱... 🔗",
  "正在评估公司核心基本面... 🧾",
  "正在衡量当前市场情绪... 🎭",
  "AI 正在深度思考... 🤔",
  "正在生成投资策略... 📈",
  "即将完成标的推荐... ✅",
];

// Standard Fisher-Yates shuffle algorithm to randomize message order
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// FIX: Add `progressMessage` prop to allow custom loading messages.
interface LoaderProps {
  progressMessage?: string;
}

const Loader: React.FC<LoaderProps> = ({ progressMessage }) => {
    // Shuffled messages are created once via useMemo to avoid re-shuffling on re-renders
    const shuffledMessages = useMemo(() => shuffleArray(loadingMessages), []);
    
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        // Cycle through the shuffled messages at a slightly faster pace for engagement
        const interval = setInterval(() => {
            setMessageIndex(prevIndex => (prevIndex + 1) % shuffledMessages.length);
        }, 2200);

        return () => clearInterval(interval);
    }, [shuffledMessages.length]);

    const currentMessage = progressMessage || shuffledMessages[messageIndex];

    return (
        <div role="status" aria-live="polite" className="text-center p-8 bg-white/50 border border-gray-200 rounded-lg shadow-lg">
            <div className="flex justify-center items-center mb-4">
                <svg aria-hidden="true" className="animate-spin h-10 w-10 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
            <p className="text-lg font-semibold text-gray-800">正在分析中 🤖</p>
            {/* Wrapper div to prevent layout shifts when message content changes */}
            <div className="mt-2 h-6 flex items-center justify-center overflow-hidden">
              {/* Using the message as a key forces React to re-mount the component, triggering the fade-in animation */}
              <p
                key={currentMessage}
                className="text-gray-600 animate-fade-in"
              >
                  {currentMessage}
              </p>
            </div>
        </div>
    );
};

export default Loader;