import React, { useState, useEffect } from 'react';

const loadingMessages = [
  "正在初始化分析引擎... ⚙️",
  "正在处理输入数据... 📥",
  "正在构建多维分析框架... 🏗️",
  "正在连接 Gemini 获取深度见解... 🧠",
  "正在分析宏观经济因素... 🌍",
  "正在绘制产业链图谱... 🔗",
  "正在评估公司基本面... 🧾",
  "正在衡量市场情绪... 🎭",
  "正在生成投资策略... 📈",
  "正在完成标的推荐... ✅",
];

const Loader: React.FC = () => {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
        }, 2500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div role="status" aria-live="polite" className="text-center p-8 bg-white/50 border border-gray-200 rounded-lg">
            <div className="flex justify-center items-center mb-4">
                <svg aria-hidden="true" className="animate-spin h-10 w-10 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
            <p className="text-lg font-semibold text-gray-800">正在分析中 🤖</p>
            <p className="text-gray-600 mt-2 transition-opacity duration-500">
                {loadingMessages[messageIndex]}
            </p>
        </div>
    );
};

export default Loader;