import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { getAnalysis, getStockAnalysis } from './services/geminiService';
import type { AnalysisReport, HistoryEntry, StockAnalysisReport } from './types';
import AnalysisInput from './components/AnalysisInput';
import AnalysisResult from './components/AnalysisResult';
import StockAnalysisInput from './components/StockAnalysisInput';
import StockAnalysisResult from './components/StockAnalysisResult';
import Loader from './components/Loader';
import AdSenseAd from './components/AdSenseAd';
import AnalysisHistory from './components/AnalysisHistory';
import HotStocks from './components/HotStocks';
import { NewspaperIcon, SparklesIcon, ChartBarIcon, DocumentTextIcon } from './components/icons/Icons';
import AboutPage from './components/AboutPage';

const HISTORY_STORAGE_KEY = 'gemini-analysis-history';
const NEWS_SOURCE_STORAGE_KEY = 'gemini-news-source';
const USER_ANALYSIS_COUNT_KEY = 'gemini-user-analysis-count';

// --- Data & Types ---
interface NewsArticle {
  title: string;
  link: string;
  description: string;
}

interface NewsSource {
  id: string;
  name: string;
  url: string;
  type?: 'rss' | 'json';
}

const NEWS_SOURCES: NewsSource[] = [
  { id: 'solidot', name: '奇客 Solidot', url: 'https://www.solidot.org/index.rss' },
  { id: '36kr', name: '36氪', url: 'https://36kr.com/feed' },
  { id: 'bloomberg', name: '彭博社', url: 'https://feeds.bloomberg.com/technology/news.rss' },
  { id: 'shilian', name: '彭博挖宝', url: 'https://bloombergnew.buzzing.cc/feed.json', type: 'json' },
];

// --- Helper Components ---

const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

const truncateText = (text: string, length: number) => {
  return text.length > length ? text.substring(0, length) + '...' : text;
};

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

// --- Enhanced LatestNews Component ---
interface LatestNewsProps {
  onAnalyze: (topic: string) => void;
  sources: NewsSource[];
  selectedSourceId: string;
  onSourceChange: (sourceId: string) => void;
}

const LatestNews: React.FC<LatestNewsProps> = ({ onAnalyze, sources, selectedSourceId, onSourceChange }) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      const source = sources.find(s => s.id === selectedSourceId);
      if (!source) {
        setError("无效的新闻源。");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setArticles([]);

      try {
        let fetchedArticles: NewsArticle[] = [];

        if (source.type === 'json') {
          // Handle direct JSON feed
          const response = await fetch(source.url);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          if (!data.items) throw new Error('Invalid JSON feed format.');
          
          fetchedArticles = data.items.slice(0, 3).map((item: any) => ({
            title: item.title,
            link: item.url,
            description: item.summary || item.content_html || '',
          }));
        } else {
          // Default to RSS via rss2json proxy
          const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`;
          const response = await fetch(API_URL);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          if (data.status !== 'ok') throw new Error('Failed to fetch news feed via rss2json.');
          
          fetchedArticles = data.items.slice(0, 3).map((item: any) => ({
            title: item.title,
            link: item.link,
            description: item.description,
          }));
        }
        
        setArticles(fetchedArticles);

      } catch (err) {
        console.error("Failed to fetch news:", err);
        setError("无法加载最新消息。");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, [selectedSourceId, sources]);

  return (
    <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
                <span className="p-2 bg-gray-200 rounded-full mr-3 text-cyan-600">
                    <NewspaperIcon className="h-6 w-6"/>
                </span>
                <h2 className="text-xl font-semibold text-gray-800">最新动态</h2>
            </div>
            <div className="relative">
                <select
                    id="news-source-select"
                    value={selectedSourceId}
                    onChange={(e) => onSourceChange(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-3 pr-8 py-2 appearance-none transition"
                    aria-label="选择新闻源"
                >
                    {sources.map(source => (
                        <option key={source.id} value={source.id}>{source.name}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
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

const Toast: React.FC<{ message: string; type: 'success' | 'info' }> = ({ message, type }) => {
  const typeIcons = {
    success: (
      <svg className="w-5 h-5 text-green-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"/>
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
      </svg>
    ),
  };

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center w-full max-w-xs p-4 space-x-4 rtl:space-x-reverse text-gray-500 bg-white divide-x rtl:divide-x-reverse divide-gray-200 rounded-lg shadow-lg animate-fade-in" role="alert">
        <div className="flex-shrink-0">
          {typeIcons[type]}
        </div>
        <div className="ps-4 text-sm font-normal">{message}</div>
    </div>
  );
};


type TabButtonProps = {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center gap-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none ${
      isActive
        ? 'border-cyan-500 text-cyan-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
    role="tab"
    aria-selected={isActive}
  >
    {children}
  </button>
);

const SearchModeToggle: React.FC<{ isEnabled: boolean; onToggle: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ isEnabled, onToggle }) => (
  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6 p-3 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg shadow-md">
    <label htmlFor="online-search-toggle" className="flex items-center cursor-pointer">
      <div className="relative">
        <input 
          id="online-search-toggle" 
          type="checkbox" 
          className="sr-only peer" 
          checked={isEnabled} 
          onChange={onToggle} 
        />
        <div className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-cyan-500 transition-colors"></div>
        <div className="absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5"></div>
      </div>
      <div className="ml-3 text-gray-700">
        <p className="font-medium text-sm">实时搜索</p>
      </div>
    </label>
    <div className="hidden sm:block border-l border-gray-300 h-6 mx-2"></div>
    <p className="text-xs text-gray-600 max-w-md text-center sm:text-left mt-1 sm:mt-0">
      开启后，AI 将联网获取最新信息，分析更精准，但速度可能稍慢。
    </p>
  </div>
);


const MainPage: React.FC = () => {
  // State for Topic Analysis
  const [userInput, setUserInput] = useState<string>('');
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  // State for Stock Analysis
  const [stockQuery, setStockQuery] = useState<string>('');
  const [stockAnalysisReport, setStockAnalysisReport] = useState<StockAnalysisReport | null>(null);
  const [isStockLoading, setIsStockLoading] = useState<boolean>(false);
  const [stockError, setStockError] = useState<string | null>(null);

  // Common State
  const [activeTab, setActiveTab] = useState<'stock' | 'topic'>('topic');
  const [isOnlineSearchEnabled, setIsOnlineSearchEnabled] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [globalStats, setGlobalStats] = useState<{ pageViews: number; analysisCount: number }>({ pageViews: 0, analysisCount: 0 });
  const [userAnalysisCount, setUserAnalysisCount] = useState<number>(0);
  const [selectedNewsSourceId, setSelectedNewsSourceId] = useState<string>(NEWS_SOURCES[0].id);
  
  // Effect to hide toast after a delay
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000); // 3 seconds
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    // Load history and settings from localStorage
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) setHistory(JSON.parse(storedHistory));

      const storedSourceId = localStorage.getItem(NEWS_SOURCE_STORAGE_KEY);
      if (storedSourceId && NEWS_SOURCES.some(s => s.id === storedSourceId)) {
        setSelectedNewsSourceId(storedSourceId);
      }
      
      const storedUserCount = localStorage.getItem(USER_ANALYSIS_COUNT_KEY);
      if (storedUserCount) {
        setUserAnalysisCount(JSON.parse(storedUserCount));
      }

    } catch (err) {
      console.error("Failed to load from localStorage", err);
    }
    
    // Load global statistics
    const fetchGlobalStats = async () => {
      try {
        const response = await fetch('/api/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'pageView' }),
        });
        if (response.ok) {
          const data = await response.json();
          setGlobalStats({ 
            pageViews: data.pageViews || 0, 
            analysisCount: data.analysisCount || 0 
          });
        }
      } catch (err) {
        console.error("Failed to fetch global stats", err);
      }
    };
    fetchGlobalStats();

    // Register the service worker for PWA capabilities.
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        const swUrl = `${window.location.origin}/sw.js`;
        navigator.serviceWorker
          .register(swUrl)
          .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
          })
          .catch(error => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  // SEO: Set meta tags for the main page
  useEffect(() => {
    const title = "股市超级挖掘机 | AI驱动的智能投研与股票分析利器";
    const description = "利用Google Gemini AI，股市超级挖掘机能将任何财经新闻或主题一键转化为深度投资分析报告。覆盖宏观、产业链、基本面与市场情绪，助您精准挖掘A股、港股、美股的投资机会。";
    
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
  }, []);

  const updateHistory = (newHistory: HistoryEntry[]) => {
    setHistory(newHistory);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
  };
  
  const handleSourceChange = (sourceId: string) => {
    setSelectedNewsSourceId(sourceId);
    localStorage.setItem(NEWS_SOURCE_STORAGE_KEY, sourceId);
  };
  
  const incrementUserAnalysisCount = () => {
    setUserAnalysisCount(prevCount => {
        const newCount = prevCount + 1;
        localStorage.setItem(USER_ANALYSIS_COUNT_KEY, JSON.stringify(newCount));
        return newCount;
    });
  };

  const incrementAnalysisCount = async () => {
     try {
        const statsResponse = await fetch('/api/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'analysis' }),
        });
        if (statsResponse.ok) setGlobalStats(await statsResponse.json());
      } catch (err) {
        console.error("Failed to update global analysis count", err);
      }
  }

  const handleAnalyze = useCallback(async (topic: string) => {
    if (!topic.trim()) {
      setError('分析主题为必填项。');
      return;
    }
    
    setActiveTab('topic');
    setIsLoading(true);
    setError(null);
    setAnalysisReport(null);
    setStockAnalysisReport(null); // Clear other report
    setStockError(null);

    try {
      const report = await getAnalysis(topic, isOnlineSearchEnabled);
      setAnalysisReport(report);
      incrementAnalysisCount();
      incrementUserAnalysisCount();

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
  }, [history, isOnlineSearchEnabled]);

  const handleStockAnalyze = useCallback(async (stockQueryToAnalyze: string) => {
    if (!stockQueryToAnalyze.trim()) {
      setStockError('股票代码或名称为必填项。');
      return;
    }

    setActiveTab('stock');
    setIsStockLoading(true);
    setStockError(null);
    setStockAnalysisReport(null);
    setAnalysisReport(null); // Clear other report
    setError(null);

    try {
      const report = await getStockAnalysis(stockQueryToAnalyze, isOnlineSearchEnabled);
      setStockAnalysisReport(report);
      incrementAnalysisCount();
      incrementUserAnalysisCount();
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? `分析失败：${err.message} 😭` : '发生未知错误。🤯';
      setStockError(errorMessage);
    } finally {
      setIsStockLoading(false);
    }
  }, [isOnlineSearchEnabled]);


  const handleNewsSelect = (newsTopic: string) => {
    setUserInput(newsTopic);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleAnalyze(newsTopic);
  };
  
  const handleHotStockSelect = (query: string) => {
    setStockQuery(query);
    handleStockAnalyze(query);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectHistory = (entry: HistoryEntry) => {
    setUserInput(entry.topic);
    setAnalysisReport(entry.report);
    setStockAnalysisReport(null);
    setError(null);
    setStockError(null);
    setActiveTab('topic');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistory = (id: number) => {
    const newHistory = history.filter((entry) => entry.id !== id);
    updateHistory(newHistory);
  };

  const handleClearHistory = () => {
    updateHistory([]);
  };

  const handleToggleSearchMode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isEnabled = e.target.checked;
    setIsOnlineSearchEnabled(isEnabled);
    setToast({
      message: isEnabled ? '实时搜索已开启，分析将联网获取最新信息。' : '实时搜索已关闭，分析将使用离线模型。',
      type: isEnabled ? 'success' : 'info',
    });
  };
  
  const formattedDate = new Date().toLocaleDateString('sv'); // 'sv' locale provides YYYY-MM-DD

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl mx-auto">
          <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8">
            <div className="order-2 sm:order-1 text-center sm:text-left">
              <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-cyan-500">
                股市超级挖掘机
              </h1>
              <p className="text-gray-600 mt-2">
                利用 AI 模型进行多维度投资分析 🚀
              </p>
            </div>
            <div className="order-1 sm:order-2 flex items-center justify-center sm:justify-end gap-x-4 mb-4 sm:mb-0">
                <div className="text-right">
                  <p className="text-sm text-gray-600 whitespace-nowrap">
                    累计分析: <span className="font-bold text-cyan-600">{userAnalysisCount}</span> 次
                  </p>
                </div>
                <Link to="/about" className="text-sm text-cyan-600 hover:underline hover:text-cyan-700 transition-colors">
                  使用说明
                </Link>
            </div>
          </header>

          <main>
            {/* --- Tabs Navigation --- */}
            <div className="mb-6 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-2">
              <div className="flex justify-center border-b border-gray-200" role="tablist" aria-label="分析模式">
                <TabButton isActive={activeTab === 'topic'} onClick={() => setActiveTab('topic')}>
                   <DocumentTextIcon className="w-5 h-5" />
                   <span>主题投策分析</span>
                </TabButton>
                <TabButton isActive={activeTab === 'stock'} onClick={() => setActiveTab('stock')}>
                  <ChartBarIcon className="w-5 h-5" />
                  <span>个股综合分析</span>
                </TabButton>
              </div>
            </div>
            
            <SearchModeToggle 
              isEnabled={isOnlineSearchEnabled} 
              onToggle={handleToggleSearchMode}
            />

            {/* --- Tabs Content --- */}
            <div className="space-y-8">
                {activeTab === 'stock' && (
                    <div className="space-y-8 animate-fade-in" role="tabpanel">
                        <StockAnalysisInput
                          stockQuery={stockQuery}
                          setStockQuery={setStockQuery}
                          onAnalyze={handleStockAnalyze}
                          isLoading={isStockLoading}
                        />

                        <HotStocks onSelect={handleHotStockSelect} />
                        
                        {isStockLoading && <Loader />}
            
                        {stockError && (
                          <div role="alert" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-center">
                            <p>{stockError}</p>
                          </div>
                        )}
            
                        {stockAnalysisReport && !isStockLoading && <StockAnalysisResult report={stockAnalysisReport} />}
                        <AdSenseAd />
                    </div>
                )}
                
                {activeTab === 'topic' && (
                    <div className="space-y-8 animate-fade-in" role="tabpanel">
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
            
                        {analysisReport && !isLoading && <AnalysisResult report={analysisReport} userInput={userInput} />}
                        
                        <AnalysisHistory
                          history={history}
                          onSelect={handleSelectHistory}
                          onDelete={handleDeleteHistory}
                          onClear={handleClearHistory}
                        />

                        <LatestNews 
                          onAnalyze={handleNewsSelect} 
                          sources={NEWS_SOURCES}
                          selectedSourceId={selectedNewsSourceId}
                          onSourceChange={handleSourceChange}
                        />
                        <AdSenseAd />
                    </div>
                )}
            </div>
          </main>
          
          <footer className="text-center mt-12 py-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              由僧僧独立开发，欢迎关注“小声读书”公众号
              <br />
              联系邮箱: <a href="mailto:codes@z.org" className="text-cyan-600 hover:underline hover:text-cyan-700 transition-colors">codes@z.org</a>
            </p>
          </footer>
        </div>
      </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </HashRouter>
  );
};

export default App;