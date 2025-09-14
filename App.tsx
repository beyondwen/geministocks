import React, { useState, useEffect, useCallback } from 'react';
import { getAnalysis } from './services/geminiService';
import type { AnalysisReport, HistoryEntry } from './types';
import AnalysisInput from './components/AnalysisInput';
import AnalysisResult from './components/AnalysisResult';
import Loader from './components/Loader';
import AnalysisHistory from './components/AnalysisHistory';
import { NewspaperIcon, SparklesIcon, SettingsIcon } from './components/icons/Icons';
import SettingsModal from './components/ApiKeySetup';

const HISTORY_STORAGE_KEY = 'gemini-analysis-history';

// --- Helper & News Component ---

const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

const truncateText = (text: string, length: number) => {
  return text.length > length ? text.substring(0, length) + '...' : text;
};

interface NewsArticle {
  title: string;
  link: string;
  description: string;
}

const NewsSkeleton: React.FC = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
);

const LatestNews: React.FC<{
  onAnalyze: (topic: string) => void;
}> = ({ onAnalyze }) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true);
      setError(null);
      // Using Solidot RSS feed via a CORS-friendly proxy.
      const RSS_URL = "https://www.solidot.org/index.rss";
      const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;

      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.status !== 'ok') {
            throw new Error('Failed to fetch news feed.');
        }

        const fetchedArticles: NewsArticle[] = data.items.slice(0, 3).map((item: any) => ({
          title: item.title,
          link: item.link,
          description: item.description,
        }));
        
        setArticles(fetchedArticles);

      } catch (err) {
        console.error("Failed to fetch news:", err);
        setError("无法加载最新消息。");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-lg">
      <div className="flex items-center mb-4">
        <span className="p-2 bg-gray-200 rounded-full mr-3 text-cyan-600">
            <NewspaperIcon className="h-6 w-6"/>
        </span>
        <h2 className="text-xl font-semibold text-gray-800">奇客 Solidot <span className="text-sm font-normal text-gray-500">(源: solidot.org)</span></h2>
      </div>
      {isLoading ? (
        <NewsSkeleton />
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <ul className="space-y-4">
          {articles.map((article) => (
            <li key={article.link} className="group border-b border-gray-200 pb-4 last:border-b-0">
              <a href={article.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-800 hover:text-cyan-600 transition-colors">
                {article.title}
              </a>
              <p className="text-sm text-gray-600 mt-1">
                {truncateText(stripHtml(article.description), 140)}
              </p>

              <button
                onClick={() => onAnalyze(`${article.title}\n\n${stripHtml(article.description)}`)}
                className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all opacity-80 group-hover:opacity-100"
              >
                <SparklesIcon className="w-4 h-4 mr-1.5" />
                一键分析
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


const App: React.FC = () => {
  const [userInput, setUserInput] = useState<string>('');
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  useEffect(() => {
    // Load history and settings
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
      const storedApiKey = localStorage.getItem('gemini-api-key');
      if (storedApiKey) {
        setApiKey(storedApiKey);
      }
      const storedModel = localStorage.getItem('gemini-model');
      if (storedModel) {
        setModel(storedModel);
      }
    } catch (err) {
      console.error("Failed to load from localStorage", err);
    }
  }, []);

  const handleSaveSettings = (newApiKey: string, newModel: string) => {
    setApiKey(newApiKey);
    setModel(newModel);
    localStorage.setItem('gemini-api-key', newApiKey);
    localStorage.setItem('gemini-model', newModel);
  };

  const updateHistory = (newHistory: HistoryEntry[]) => {
    setHistory(newHistory);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
  };

  const handleAnalyze = useCallback(async (topic: string) => {
    if (!apiKey) {
      setError('请在设置中输入您的 Gemini API 密钥。');
      setIsSettingsOpen(true);
      return;
    }
    if (!topic.trim()) {
      setError('分析主题为必填项。');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAnalysisReport(null);

    try {
      const report = await getAnalysis(topic, apiKey, model);
      setAnalysisReport(report);

      const newEntry: HistoryEntry = {
        id: Date.now(),
        topic: topic,
        report: report,
      };
      const newHistory = [newEntry, ...history].slice(0, 20); // Limit history to 20 items
      updateHistory(newHistory);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? `分析失败：${err.message} 😭` : '发生未知错误。🤯';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [history, apiKey, model]);

  const handleNewsSelect = (newsTopic: string) => {
    setUserInput(newsTopic);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleAnalyze(newsTopic);
  };

  const handleSelectHistory = (entry: HistoryEntry) => {
    setUserInput(entry.topic);
    setAnalysisReport(entry.report);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistory = (id: number) => {
    const newHistory = history.filter((entry) => entry.id !== id);
    updateHistory(newHistory);
  };

  const handleClearHistory = () => {
    updateHistory([]);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl mx-auto">
          <header className="text-center mb-8 relative">
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-cyan-500">
              股市超级挖掘机 📈
            </h1>
            <p className="text-gray-600 mt-2">
              利用 Gemini 模型进行多维度投资分析 🚀
            </p>
            <div className="absolute top-0 right-0">
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                    aria-label="打开设置"
                >
                    <SettingsIcon className="w-6 h-6" />
                </button>
            </div>
          </header>

          <main className="space-y-8">
            <AnalysisHistory
              history={history}
              onSelect={handleSelectHistory}
              onDelete={handleDeleteHistory}
              onClear={handleClearHistory}
            />

            <AnalysisInput
              userInput={userInput}
              setUserInput={setUserInput}
              onAnalyze={() => handleAnalyze(userInput)}
              isLoading={isLoading}
            />

            {isLoading && <Loader />}

            {error && (
              <div role="alert" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-center">
                <p>{error}</p>
              </div>
            )}

            {analysisReport && <AnalysisResult report={analysisReport} userInput={userInput} />}
            
            <LatestNews onAnalyze={handleNewsSelect} />
          </main>
          
          <footer className="text-center mt-12 py-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              由僧僧 GO 开发驱动，欢迎关注“小声读书”公众号
            </p>
          </footer>
        </div>
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        initialApiKey={apiKey}
        initialModel={model}
      />
    </>
  );
};

export default App;
