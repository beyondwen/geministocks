import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { getAnalysis, getStockAnalysis, getHotStocksFromAI, getPositionalWarfareAnalysis } from './services/geminiService';
import type { AnalysisReport, TopicHistoryEntry, StockAnalysisReport, StockHistoryEntry, PositionalWarfareReport, PositionalWarfareHistoryEntry } from './types';
import AnalysisInput from './components/AnalysisInput';
import AnalysisResult from './components/AnalysisResult';
import StockAnalysisInput from './components/StockAnalysisInput';
import StockAnalysisResult from './components/StockAnalysisResult';
import Loader from './components/Loader';
// import AdSenseAd from './components/AdSenseAd';
import AnalysisHistory from './components/AnalysisHistory';
import HotStocks from './components/HotStocks';
import { NewspaperIcon, SparklesIcon, ChartBarIcon, DocumentTextIcon, SwordsIcon, HeartIcon, XIcon } from './components/icons/Icons';
import AboutPage from './components/AboutPage';
import PositionalWarfareInput from './components/PositionalWarfareInput';
import PositionalWarfareResult from './components/PositionalWarfareResult';
import SupportModal from './components/SupportModal';
import BuffettIndicator from './components/BuffettIndicator';
import InvestmentRiskModal from './components/InvestmentRiskModal';
import FloatingActionButton from './components/FloatingActionButton';

const TOPIC_HISTORY_STORAGE_KEY = 'gemini-analysis-history';
const STOCK_HISTORY_STORAGE_KEY = 'gemini-stock-analysis-history';
const POSITIONAL_WARFARE_HISTORY_STORAGE_KEY = 'gemini-positional-warfare-history';
const USER_ANALYSIS_COUNT_KEY = 'gemini-user-analysis-count';
const RISK_WARNING_ACCEPTED_KEY = 'gemini-risk-warning-accepted';
const ANALYSIS_TIMESTAMPS_KEY = 'gemini-analysis-timestamps';
const MAX_ANALYSES_PER_HOUR = 12;
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

// --- Data & Types ---
interface NewsArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  sourceName: string;
}

interface NewsSource {
  id: string;
  name: string;
  url: string;
  type?: 'rss' | 'json';
}

const NEWS_SOURCES: NewsSource[] = [
  { id: 'xueqiu', name: '雪球', url: 'https://xueqiu.com/hots/topic/rss' },
  { id: 'solidot', name: '奇客 Solidot', url: 'https://www.solidot.org/index.rss' },
  { id: '36kr', name: '36氪', url: 'https://36kr.com/feed' },
  { id: 'hackernews', name: 'Hacker News', url: 'https://www.supertechfans.com/cn/index.xml' },
  { id: 'maobidao', name: '猫笔刀', url: 'https://wechat2rss.xlab.app/feed/33d986064f59be5263de2ca822fb3e0bdd59eb81.xml' },
];

const SOURCE_COLORS: { [key: string]: string } = {
  '雪球': 'bg-blue-100 text-blue-800',
  '奇客 Solidot': 'bg-gray-100 text-gray-800',
  '36氪': 'bg-cyan-100 text-cyan-800',
  'Hacker News': 'bg-orange-100 text-orange-800',
  '猫笔刀': 'bg-purple-100 text-purple-800',
};


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
      {[...Array(5)].map((_, i) => (
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
}

const LatestNews: React.FC<LatestNewsProps> = ({ onAnalyze, sources }) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllNews = async () => {
      setIsLoading(true);
      setError(null);

      const fetchPromises = sources.map(async (source) => {
        try {
          let fetchedArticles: Omit<NewsArticle, 'sourceName'>[] = [];
          if (source.type === 'json') {
            const response = await fetch(source.url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${source.name}`);
            const data = await response.json();
            if (!data.items) throw new Error(`Invalid JSON feed format for ${source.name}.`);
            
            fetchedArticles = data.items.map((item: any) => ({
              title: item.title,
              link: item.url,
              description: item.summary || item.content_html || '',
              pubDate: item.date_published || new Date().toISOString(),
            }));
          } else {
            const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`;
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${source.name}`);
            const data = await response.json();
            if (data.status !== 'ok') throw new Error(`Failed to fetch news feed via rss2json for ${source.name}.`);
            
            fetchedArticles = data.items.map((item: any) => ({
              title: item.title,
              link: item.link,
              description: item.description,
              pubDate: item.pubDate,
            }));
          }
          return fetchedArticles.map(article => ({ ...article, sourceName: source.name }));
        } catch (err) {
          console.error(`Failed to fetch from ${source.name}:`, err);
          return []; // Return empty array on failure for this source
        }
      });

      try {
        const results = await Promise.all(fetchPromises);
        const allArticles = results.flat();

        allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

        setArticles(allArticles.slice(0, 20));
      } catch (err) {
         console.error("Failed to process news feeds:", err);
         setError("无法加载最新消息。部分新闻源可能暂时不可用。");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllNews();
  }, [sources]);

  return (
    <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-lg">
      <div className="flex items-center mb-4">
          <span className="p-2 bg-gray-200 rounded-full mr-3 text-cyan-600">
              <NewspaperIcon className="h-6 w-6"/>
          </span>
          <h2 className="text-xl font-semibold text-gray-800">最新动态</h2>
      </div>
      {isLoading ? (
        <NewsSkeleton />
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <ul className="space-y-4">
          {articles.map((article, index) => (
            <li key={`${article.link}-${index}`} className="group border-b border-gray-200 pb-4 last:border-b-0">
              <div className="flex items-center gap-x-2 mb-1 flex-wrap">
                  <a href={article.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-800 hover:text-cyan-600 transition-colors">
                    {article.title}
                  </a>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${SOURCE_COLORS[article.sourceName] || 'bg-gray-100 text-gray-800'}`}>
                    {article.sourceName}
                  </span>
              </div>
              
              <p className="text-sm text-gray-600 mt-1">
                {truncateText(stripHtml(article.description), 140)}
              </p>

              <button
                onClick={() => onAnalyze(`${article.title}\n\n${stripHtml(article.description)}`)}
                className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transform-gpu transition-all duration-200 opacity-80 group-hover:opacity-100 group-hover:shadow-md hover:scale-110 active:scale-100"
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
  const toastConfig = {
    success: {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      borderColor: 'border-green-400',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    info: {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      ),
      borderColor: 'border-blue-400',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
  };

  const config = toastConfig[type];

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <div
        className={`flex items-center gap-x-2.5 max-w-sm px-4 py-2.5 rounded-xl border-l-4 shadow-2xl bg-white/70 backdrop-blur-lg animate-toast-in ${config.borderColor}`}
        role="alert"
      >
        <div className={`flex-shrink-0 rounded-full p-1 ${config.iconBg} ${config.iconColor}`}>
          {config.icon}
        </div>
        <div className="text-sm font-medium text-gray-800">
          {message}
        </div>
      </div>
    </div>
  );
};

const ImageModal: React.FC<{ imageUrl: string; onClose: () => void; title: string }> = ({ imageUrl, onClose, title }) => (
  <div
    className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
    aria-labelledby="image-modal-title"
  >
    <div
      className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center relative transform transition-all scale-95 opacity-0"
      onClick={(e) => e.stopPropagation()}
      style={{ animation: 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
    >
      <style>{`
        @keyframes scale-in {
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="关闭"
      >
        <XIcon className="w-6 h-6" />
      </button>
      <h2 id="image-modal-title" className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
      <div className="p-2 border-4 border-gray-100 rounded-lg inline-block">
        <img
          src={imageUrl}
          alt="公众号二维码"
          className="w-64 h-64 object-contain rounded-md"
        />
      </div>
    </div>
  </div>
);


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

const MainPage: React.FC = () => {
  // State for Topic Analysis
  const [userInput, setUserInput] = useState<string>('');
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [topicHistory, setTopicHistory] = useState<TopicHistoryEntry[]>([]);
  
  // State for Stock Analysis
  const [stockQuery, setStockQuery] = useState<string>('');
  const [stockAnalysisReport, setStockAnalysisReport] = useState<StockAnalysisReport | null>(null);
  const [isStockLoading, setIsStockLoading] = useState<boolean>(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [hotStocks, setHotStocks] = useState<{name: string; ticker: string}[]>([]);
  const [isHotStocksLoading, setIsHotStocksLoading] = useState<boolean>(true);
  const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([]);

  // State for Positional Warfare Analysis
  const [leaderStockQuery, setLeaderStockQuery] = useState<string>('');
  const [positionalWarfareReport, setPositionalWarfareReport] = useState<PositionalWarfareReport | null>(null);
  const [isPositionalWarfareLoading, setIsPositionalWarfareLoading] = useState<boolean>(false);
  const [positionalWarfareError, setPositionalWarfareError] = useState<string | null>(null);
  const [positionalWarfareProgress, setPositionalWarfareProgress] = useState<string>('');
  const [positionalWarfareHistory, setPositionalWarfareHistory] = useState<PositionalWarfareHistoryEntry[]>([]);


  // Common State
  const [activeTab, setActiveTab] = useState<'topic' | 'stock' | 'positional'>('topic');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [globalStats, setGlobalStats] = useState<{ pageViews: number; analysisCount: number }>({ pageViews: 0, analysisCount: 0 });
  const [userAnalysisCount, setUserAnalysisCount] = useState<number>(0);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [fabClickCount, setFabClickCount] = useState(0);
  
  // Effect to hide toast after a delay
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000); // 3 seconds
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // --- Rate Limiting Functions ---
  const checkRateLimit = (): boolean => {
    try {
        const storedTimestamps = localStorage.getItem(ANALYSIS_TIMESTAMPS_KEY);
        if (!storedTimestamps) return false;

        const timestamps: number[] = JSON.parse(storedTimestamps);
        const now = Date.now();
        
        const recentTimestamps = timestamps.filter(ts => now - ts < ONE_HOUR_IN_MS);
        
        localStorage.setItem(ANALYSIS_TIMESTAMPS_KEY, JSON.stringify(recentTimestamps));
        
        return recentTimestamps.length >= MAX_ANALYSES_PER_HOUR;
    } catch (err) {
        console.error("Failed to check rate limit from localStorage", err);
        return false; // Fail open
    }
  };

  const recordAnalysisTimestamp = () => {
    try {
        const storedTimestamps = localStorage.getItem(ANALYSIS_TIMESTAMPS_KEY);
        const timestamps: number[] = storedTimestamps ? JSON.parse(storedTimestamps) : [];
        const now = Date.now();
        
        timestamps.push(now);
        
        const recentTimestamps = timestamps.filter(ts => now - ts < ONE_HOUR_IN_MS);
        
        localStorage.setItem(ANALYSIS_TIMESTAMPS_KEY, JSON.stringify(recentTimestamps));
    } catch (err) {
        console.error("Failed to record analysis timestamp to localStorage", err);
    }
  };

  useEffect(() => {
    // Check if risk warning has been accepted
    const hasAcceptedRisk = localStorage.getItem(RISK_WARNING_ACCEPTED_KEY);
    if (hasAcceptedRisk !== 'true') {
        setIsRiskModalOpen(true);
    }

    // Load history and settings from localStorage
    try {
      const storedTopicHistory = localStorage.getItem(TOPIC_HISTORY_STORAGE_KEY);
      if (storedTopicHistory) setTopicHistory(JSON.parse(storedTopicHistory));

      const storedStockHistory = localStorage.getItem(STOCK_HISTORY_STORAGE_KEY);
      if (storedStockHistory) setStockHistory(JSON.parse(storedStockHistory));

      const storedPositionalWarfareHistory = localStorage.getItem(POSITIONAL_WARFARE_HISTORY_STORAGE_KEY);
      if (storedPositionalWarfareHistory) setPositionalWarfareHistory(JSON.parse(storedPositionalWarfareHistory));
      
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

    // Fetch dynamic hot stocks on initial load
    const fetchHotStocks = async () => {
      setIsHotStocksLoading(true);
      try {
        const stocks = await getHotStocksFromAI();
        setHotStocks(stocks);
      } catch (err) {
        console.error("Failed to fetch hot stocks:", err);
        // Fallback to a default list or show an error, here we just log it
      } finally {
        setIsHotStocksLoading(false);
      }
    };
    fetchHotStocks();

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
    const title = "超级挖掘机 | AI驱动的智能投研与股票分析利器";
    const description = "利用Google Gemini AI，超级挖掘机能将任何财经新闻或主题一键转化为深度投资分析报告。覆盖宏观、产业链、基本面与市场情绪，助您精准挖掘A股、港股、美股的投资机会。";
    
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
  }, []);

  const updateTopicHistory = (newHistory: TopicHistoryEntry[]) => {
    setTopicHistory(newHistory);
    localStorage.setItem(TOPIC_HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
  };
  
  const updateStockHistory = (newHistory: StockHistoryEntry[]) => {
    setStockHistory(newHistory);
    localStorage.setItem(STOCK_HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
  };

  const updatePositionalWarfareHistory = (newHistory: PositionalWarfareHistoryEntry[]) => {
    setPositionalWarfareHistory(newHistory);
    localStorage.setItem(POSITIONAL_WARFARE_HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
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

    if (checkRateLimit()) {
      setError('您在过去一小时内的使用次数已达上限 (12次)。请稍后再试。');
      return;
    }
    
    setActiveTab('topic');
    setIsLoading(true);
    setError(null);
    setAnalysisReport(null);
    setStockAnalysisReport(null);
    setPositionalWarfareReport(null);

    try {
      const report = await getAnalysis(topic);
      setAnalysisReport(report);
      recordAnalysisTimestamp();
      incrementAnalysisCount();
      incrementUserAnalysisCount();

      const newEntry: TopicHistoryEntry = {
        id: Date.now(),
        topic: topic,
        report: report,
      };
      const newHistory = [newEntry, ...topicHistory].slice(0, 20); // Limit history to 20 items
      updateTopicHistory(newHistory);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? `分析失败：${err.message} 😭` : '发生未知错误。🤯';
      setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  }, [topicHistory]);

  const handleStockAnalyze = useCallback(async (stockQueryToAnalyze: string) => {
    if (!stockQueryToAnalyze.trim()) {
      setStockError('股票代码或名称为必填项。');
      return;
    }

    if (checkRateLimit()) {
        setStockError('您在过去一小时内的使用次数已达上限 (12次)。请稍后再试。');
        return;
    }

    setActiveTab('stock');
    setIsStockLoading(true);
    setStockError(null);
    setStockAnalysisReport(null);
    setAnalysisReport(null);
    setPositionalWarfareReport(null);

    try {
      const report = await getStockAnalysis(stockQueryToAnalyze);
      setStockAnalysisReport(report);
      recordAnalysisTimestamp();
      incrementAnalysisCount();
      incrementUserAnalysisCount();

      const newEntry: StockHistoryEntry = {
        id: Date.now(),
        query: stockQueryToAnalyze,
        report: report,
      };
      const newHistory = [newEntry, ...stockHistory].slice(0, 20);
      updateStockHistory(newHistory);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? `分析失败：${err.message} 😭` : '发生未知错误。🤯';
      setStockError(errorMessage);
    } finally {
      setIsStockLoading(false);
    }
  }, [stockHistory]);

  const handlePositionalWarfareAnalyze = useCallback(async () => {
    if (!leaderStockQuery.trim()) {
        setPositionalWarfareError('龙头股票为必填项。');
        return;
    }

    if (checkRateLimit()) {
        setPositionalWarfareError('您在过去一小时内的使用次数已达上限 (12次)。请稍后再试。');
        return;
    }

    setActiveTab('positional');
    setIsPositionalWarfareLoading(true);
    setPositionalWarfareError(null);
    setPositionalWarfareReport(null);
    setAnalysisReport(null);
    setStockAnalysisReport(null);
    
    try {
        const report = await getPositionalWarfareAnalysis(leaderStockQuery, setPositionalWarfareProgress);
        setPositionalWarfareReport(report);
        recordAnalysisTimestamp();
        incrementAnalysisCount();
        incrementUserAnalysisCount();

        const newEntry: PositionalWarfareHistoryEntry = {
          id: Date.now(),
          leaderStockQuery: leaderStockQuery,
          report: report,
        };
        const newHistory = [newEntry, ...positionalWarfareHistory].slice(0, 20);
        updatePositionalWarfareHistory(newHistory);

    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? `分析失败：${err.message} 😭` : '发生未知错误。🤯';
        setPositionalWarfareError(errorMessage);
    } finally {
        setIsPositionalWarfareLoading(false);
        setPositionalWarfareProgress('');
    }
  }, [leaderStockQuery, positionalWarfareHistory]);


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

  // --- History Handlers ---

  const handleSelectTopicHistory = (id: number) => {
    const entry = topicHistory.find((e) => e.id === id);
    if (!entry) return;
    setUserInput(entry.topic);
    setAnalysisReport(entry.report);
    setStockAnalysisReport(null);
    setPositionalWarfareReport(null);
    setError(null);
    setStockError(null);
    setPositionalWarfareError(null);
    setActiveTab('topic');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTopicHistory = (id: number) => {
    const newHistory = topicHistory.filter((entry) => entry.id !== id);
    updateTopicHistory(newHistory);
  };

  const handleClearTopicHistory = () => {
    updateTopicHistory([]);
  };

  const handleSelectStockHistory = (id: number) => {
    const entry = stockHistory.find((e) => e.id === id);
    if (!entry) return;
    setStockQuery(entry.query);
    setStockAnalysisReport(entry.report);
    setAnalysisReport(null);
    setPositionalWarfareReport(null);
    setError(null);
    setStockError(null);
    setPositionalWarfareError(null);
    setActiveTab('stock');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteStockHistory = (id: number) => {
    const newHistory = stockHistory.filter((entry) => entry.id !== id);
    updateStockHistory(newHistory);
  };

  const handleClearStockHistory = () => {
    updateStockHistory([]);
  };

  const handleSelectPositionalWarfareHistory = (id: number) => {
    const entry = positionalWarfareHistory.find((e) => e.id === id);
    if (!entry) return;
    setLeaderStockQuery(entry.leaderStockQuery);
    setPositionalWarfareReport(entry.report);
    setAnalysisReport(null);
    setStockAnalysisReport(null);
    setError(null);
    setStockError(null);
    setPositionalWarfareError(null);
    setActiveTab('positional');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePositionalWarfareHistory = (id: number) => {
    const newHistory = positionalWarfareHistory.filter((entry) => entry.id !== id);
    updatePositionalWarfareHistory(newHistory);
  };

  const handleClearPositionalWarfareHistory = () => {
    updatePositionalWarfareHistory([]);
  };

  const handleAcceptRisk = () => {
    setIsRiskModalOpen(false);
    try {
        localStorage.setItem(RISK_WARNING_ACCEPTED_KEY, 'true');
    } catch (err) {
        console.error("Failed to save to localStorage", err);
    }
  };
  
  const handleFabClick = () => {
    setFabClickCount(prev => prev + 1);
  };

  const formattedDate = new Date().toLocaleDateString('sv'); // 'sv' locale provides YYYY-MM-DD

  return (
    <>
      {isRiskModalOpen && <InvestmentRiskModal onAccept={handleAcceptRisk} />}
      {toast && <Toast message={toast.message} type={toast.type} />}
      {isImageModalOpen && (
          <ImageModal
              imageUrl="https://youke1.picui.cn/s1/2025/10/02/68de9d3a88ef4.jpg"
              onClose={() => setIsImageModalOpen(false)}
              title="欢迎关注“小声读书”"
          />
      )}
      <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
      <div className="min-h-screen bg-gray-100 text-gray-900 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl mx-auto">
          <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8">
            <div className="order-2 sm:order-1 text-center sm:text-left">
              <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-cyan-500">
                超级挖掘机
              </h1>
              <p className="text-gray-600 mt-2">
                利用 AI 模型进行多维度投资分析 🚀
                <br />
                支持美股、A 股、港股、数字货币和实物期货市场
              </p>
            </div>
            <div className="order-1 sm:order-2 flex items-center justify-center sm:justify-end gap-x-4 mb-4 sm:mb-0">
                <div className="text-right">
                  <p className="text-sm text-gray-600 whitespace-nowrap">
                    累计分析: <span className="font-bold text-cyan-600">{userAnalysisCount}</span> 次
                  </p>
                </div>
                <button
                    onClick={() => setIsSupportModalOpen(true)}
                    className="flex items-center gap-x-1.5 px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
                    aria-haspopup="dialog"
                >
                    <HeartIcon className="w-4 h-4" />
                    支持作者
                </button>
            </div>
          </header>

          <BuffettIndicator />

          <main>
            {/* --- Tabs Navigation --- */}
            <div className="mb-6 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-2">
              <div className="flex justify-center border-b border-gray-200" role="tablist" aria-label="分析模式">
                <TabButton isActive={activeTab === 'topic'} onClick={() => setActiveTab('topic')}>
                   <DocumentTextIcon className="w-5 h-5" />
                   <span>主题挖掘</span>
                </TabButton>
                <TabButton isActive={activeTab === 'stock'} onClick={() => setActiveTab('stock')}>
                  <ChartBarIcon className="w-5 h-5" />
                  <span>个股分析</span>
                </TabButton>
                <TabButton isActive={activeTab === 'positional'} onClick={() => setActiveTab('positional')}>
                  <SwordsIcon className="w-5 h-5" />
                  <span>卡位战法</span>
                </TabButton>
              </div>
            </div>

            {/* --- Tabs Content --- */}
            <div className="space-y-8">
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
                          history={topicHistory.map(h => ({ id: h.id, text: h.topic }))}
                          onSelect={handleSelectTopicHistory}
                          onDelete={handleDeleteTopicHistory}
                          onClear={handleClearTopicHistory}
                        />

                        <LatestNews 
                          onAnalyze={handleNewsSelect} 
                          sources={NEWS_SOURCES}
                        />
                        {/* <AdSenseAd /> */}
                    </div>
                )}
                {activeTab === 'stock' && (
                    <div className="space-y-8 animate-fade-in" role="tabpanel">
                        <StockAnalysisInput
                          stockQuery={stockQuery}
                          setStockQuery={setStockQuery}
                          onAnalyze={handleStockAnalyze}
                          isLoading={isStockLoading}
                          suggestions={hotStocks}
                        />

                        <HotStocks 
                          onSelect={handleHotStockSelect} 
                          stocks={hotStocks} 
                          isLoading={isHotStocksLoading} 
                        />
                        
                        {isStockLoading && <Loader />}
            
                        {stockError && (
                          <div role="alert" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-center">
                            <p>{stockError}</p>
                          </div>
                        )}
            
                        {stockAnalysisReport && !isStockLoading && <StockAnalysisResult report={stockAnalysisReport} />}
                        
                        <AnalysisHistory
                          history={stockHistory.map(h => ({ id: h.id, text: h.query }))}
                          onSelect={handleSelectStockHistory}
                          onDelete={handleDeleteStockHistory}
                          onClear={handleClearStockHistory}
                        />

                        {/* <AdSenseAd /> */}
                    </div>
                )}
                {activeTab === 'positional' && (
                    <div className="space-y-8 animate-fade-in" role="tabpanel">
                        <PositionalWarfareInput
                          leaderStockQuery={leaderStockQuery}
                          setLeaderStockQuery={setLeaderStockQuery}
                          onAnalyze={handlePositionalWarfareAnalyze}
                          isLoading={isPositionalWarfareLoading}
                        />

                        {isPositionalWarfareLoading && <Loader progressMessage={positionalWarfareProgress} />}

                        {positionalWarfareError && (
                          <div role="alert" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-center">
                            <p>{positionalWarfareError}</p>
                          </div>
                        )}
                        
                        {positionalWarfareReport && !isPositionalWarfareLoading && <PositionalWarfareResult report={positionalWarfareReport} />}

                        <AnalysisHistory
                          history={positionalWarfareHistory.map(h => ({ id: h.id, text: h.leaderStockQuery }))}
                          onSelect={handleSelectPositionalWarfareHistory}
                          onDelete={handleDeletePositionalWarfareHistory}
                          onClear={handleClearPositionalWarfareHistory}
                        />
                    </div>
                )}
            </div>
          </main>
          
          <footer className="text-center mt-12 py-6 border-t border-gray-200">
            <div className="mb-4">
              <Link to="/about" className="text-sm text-gray-500 hover:text-cyan-600 animated-underline transition-colors">
                使用说明
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              由
              <a
                href="https://t.me/lover_links"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-cyan-600 hover:text-cyan-700 animated-underline transition-colors"
              >
                僧僧
              </a>
              独立开发，欢迎关注“
              <button
                onClick={() => setIsImageModalOpen(true)}
                className="font-medium text-cyan-600 hover:text-cyan-700 animated-underline transition-colors"
              >
                小声读书
              </button>
              ”公众号
            </p>
          </footer>
        </div>
      </div>
      <FloatingActionButton onClick={handleFabClick} />
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