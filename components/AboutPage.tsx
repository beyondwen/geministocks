import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SparklesIcon } from './icons/Icons';

const AboutPage: React.FC = () => {
  useEffect(() => {
    const title = "使用说明 - 股市超级挖掘机";
    const description = "了解“股市超级挖掘机”如何利用 AI 进行四维一体分析，快速上手这款强大的智能投研工具。";

    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-xl p-8 space-y-8">
        
        <header className="text-center border-b pb-6">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-cyan-500">
            使用说明
          </h1>
          <p className="text-gray-600 mt-2">
            您的智能投资研究助手
          </p>
        </header>

        <section aria-labelledby="app-purpose">
          <h2 id="app-purpose" className="text-2xl font-bold text-gray-800 mb-4">应用宗旨</h2>
          <p className="text-gray-700 leading-relaxed">
            “股市超级挖掘机”是一款智能投研工具，旨在利用尖端的 AI 技术将复杂、非结构化的财经新闻、研究报告或市场主题，转化为结构清晰、多维度的投资策略分析报告。我们的目标是帮助投资者节省时间，快速抓住信息重点，发现潜在的投资机会，并理解其中的风险。
          </p>
        </section>

        <section aria-labelledby="app-features">
          <h2 id="app-features" className="text-2xl font-bold text-gray-800 mb-4">核心功能</h2>
          <ul className="list-disc list-inside space-y-3 text-gray-700">
            <li>
              <strong>四维一体分析法：</strong> 
              报告从宏观与政策、行业与产业链、公司基本面、市场情绪与催化剂四个维度进行全面分析，提供立体化的投资视角。
            </li>
            <li>
              <strong>结构化报告输出：</strong> 
              将 AI 的分析结果以结构化的 JSON 格式呈现，内容清晰、易于理解，告别冗长繁杂的文本。
            </li>
            <li>
              <strong>数据可视化：</strong> 
              通过行业产业链图谱、股票关联度图表等可视化工具，让数据和关系一目了然。
            </li>
            <li>
              <strong>历史记录与回溯：</strong> 
              自动保存您的分析历史，方便随时回顾和对比。
            </li>
            <li>
              <strong>一键导出：</strong> 
              轻松将完整的分析报告导出为高保真图片或 PDF 文档，便于分享和保存。
            </li>
          </ul>
        </section>
        
        <footer className="text-center pt-6 border-t">
            <Link 
                to="/"
                className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all"
            >
                <SparklesIcon className="w-5 h-5 mr-2" />
                返回主页开始分析
            </Link>
        </footer>

      </div>
    </div>
  );
};

export default AboutPage;