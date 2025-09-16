import React from 'react';
import { Link } from 'react-router-dom';
import { SparklesIcon } from './icons/Icons';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="w-full max-w-3xl mx-auto bg-white rounded-lg shadow-xl p-8 space-y-8">
        
        <header className="text-center border-b pb-6">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-cyan-500">
            关于 股市超级挖掘机
          </h1>
          <p className="text-gray-600 mt-2">
            您的智能投资研究助手
          </p>
        </header>

        <section aria-labelledby="app-purpose">
          <h2 id="app-purpose" className="text-2xl font-bold text-gray-800 mb-4">应用宗旨</h2>
          <p className="text-gray-700 leading-relaxed">
            “股市超级挖掘机”是一款智能投研工具，旨在利用尖端的 AI 技术（Google Gemini）将复杂、非结构化的财经新闻、研究报告或市场主题，转化为结构清晰、多维度的投资策略分析报告。我们的目标是帮助投资者节省时间，快速抓住信息重点，发现潜在的投资机会，并理解其中的风险。
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
              轻松将完整的分析报告导出为图片，便于分享和保存。
            </li>
          </ul>
        </section>
        
        <section aria-labelledby="api-key-guide">
          <h2 id="api-key-guide" className="text-2xl font-bold text-gray-800 mb-4">如何获取 Gemini API 密钥</h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>本应用需要您自己的 Google Gemini API 密钥才能运行。您的密钥将仅存储在您的浏览器本地，不会上传到任何服务器。</p>
            <ol className="list-decimal list-inside space-y-3 pl-4">
              <li>
                访问{" "}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-cyan-600 font-medium hover:underline">
                   Google AI Studio
                </a>。
              </li>
              <li>
                使用您的 Google 账户登录。
              </li>
              <li>
                点击 "Create API key in new project" 按钮来创建一个新的 API 密钥。
              </li>
              <li>
                复制生成的密钥字符串。
              </li>
              <li>
                回到本应用，点击右上角的设置图标 ⚙️，将密钥粘贴到输入框中并保存。
              </li>
            </ol>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                <p className="text-yellow-800">
                    <strong>重要提示：</strong> 请妥善保管您的 API 密钥，不要与他人分享。
                </p>
            </div>
          </div>
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
