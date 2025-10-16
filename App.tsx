



import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { getAnalysis, getStockAnalysis, getHotStocksFromAI, getPositionalWarfareAnalysis, type AnalysisModel } from './services/geminiService';
import type { AnalysisReport, TopicHistoryEntry, StockAnalysisReport, StockHistoryEntry, PositionalWarfareReport, PositionalWarfareHistoryEntry } from './types';
import AnalysisInput from './components/AnalysisInput';
import AnalysisResult from './components/AnalysisResult';
import StockAnalysisInput from './components/StockAnalysisInput';
import StockAnalysisResult from './components/StockAnalysisResult';
import Loader from './components/Loader';
import AdSenseAd from './components/AdSenseAd';
import AnalysisHistory from './components/AnalysisHistory';
import HotStocks from './components/HotStocks';
import { NewspaperIcon, SparklesIcon, ChartBarIcon, DocumentTextIcon, SwordsIcon, HeartIcon, XIcon, AcademicCapIcon } from './components/icons/Icons';
import AboutPage from './components/AboutPage';
import PositionalWarfareInput from './components/PositionalWarfareInput';
import PositionalWarfareResult from './components/PositionalWarfareResult';
import InvestmentRiskModal from './components/InvestmentRiskModal';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useI18n } from './hooks/useI18n';

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
  { id: '36kr', name: '36氪', url: 'https://36kr.com/feed' },
  { id: 'xueqiu', name: '雪球', url: 'https://xueqiu.com/hots/topic/rss' },
  { id: 'solidot', name: '奇客 Solidot', url: 'https://www.solidot.org/index.rss' },
  { id: 'hackernews', name: 'Hacker News', url: 'https://www.supertechfans.com/cn/index.xml' },
  { id: 'maobidao', name: '猫笔刀', url: 'https://wechat2rss.xlab.app/feed/33d986064f59be5263de2ca822fb3e0bdd59eb81.xml' },
];

const SOURCE_COLORS: { [key: string]: string } = {
  '雪球': 'bg-blue-100 text-blue-800',
  '奇客 Solidot': 'bg-slate-100 text-slate-800',
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
      {[...Array(4)].map((_, i) => (
        <div key={i} className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-slate-200/80 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-200/80 rounded"></div>
              <div className="h-3 bg-slate-200/80 rounded w-5/6"></div>
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
  const [activeSourceId, setActiveSourceId] = useState<string>('36kr'); // Default to 36kr
  const { t } = useI18n();

  useEffect(() => {
    const fetchNewsForSource = async () => {
      const source = sources.find(s => s.id === activeSourceId);
      if (!source) {
        setError(t('latestNews.errorNotFound'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let fetchedArticles: Omit<NewsArticle, 'sourceName'>[] = [];
        if (source.type === 'json') {
          const response = await fetch(source.url);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          if (!data.items) throw new Error(`Invalid JSON feed format.`);
          
          fetchedArticles = data.items.map((item: any) => ({
            title: item.title,
            link: item.url,
            description: item.summary || item.content_html || '',
            pubDate: item.date_published || new Date().toISOString(),
          }));
        } else {
          const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`;
          const response = await fetch(API_URL);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          if (data.status !== 'ok') throw new Error(`Failed to fetch news feed via rss2json.`);
          
          fetchedArticles = data.items.map((item: any) => ({
            title: item.title,
            link: item.link,
            description: item.description,
            pubDate: item.pubDate,
          }));
        }
        
        const articlesWithSource = fetchedArticles.map(article => ({ ...article, sourceName: source.name }));
        // Sort by date before slicing to ensure the latest articles are shown
        articlesWithSource.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        setArticles(articlesWithSource.slice(0, 4));

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Failed to fetch from ${source.name}:`, errorMessage);
        setError(t('latestNews.errorLoad', { sourceName: source.name }));
        setArticles([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNewsForSource();
  }, [activeSourceId, sources, t]);

  return (
    <div className="glass-refined bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-soft hover:bg-white/80 hover:border-slate-300/80 hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 h-full">
      <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl shadow-lg">
              <NewspaperIcon className="w-5 h-5 text-white"/>
          </div>
          <h3 className="text-xl font-semibold text-gradient-primary">{t('latestNews.title')}</h3>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200/60 pb-4 mb-4">
        {sources.map(source => (
          <button
            key={source.id}
            onClick={() => setActiveSourceId(source.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
              activeSourceId === source.id
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                : 'bg-white/60 text-slate-700 hover:bg-white/80'
            }`}
          >
            {source.name}
          </button>
        ))}
      </div>
      
      {isLoading ? (
        <NewsSkeleton />
      ) : error ? (
        <div className="text-center py-4">
          <p className="text-red-600 bg-red-50/80 p-3 rounded-lg border border-red-200">{error}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {articles.length > 0 ? articles.map((article, index) => (
            <li key={`${article.link}-${index}`} className="group border-b border-slate-200/60 pb-4 last:border-b-0">
              <div className="flex items-center gap-x-2 mb-1 flex-wrap">
                  <a href={article.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                    {article.title}
                  </a>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${SOURCE_COLORS[article.sourceName] || 'bg-slate-100 text-slate-800'}`}>
                    {article.sourceName}
                  </span>
              </div>
              
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                {truncateText(stripHtml(article.description), 140)}
              </p>

              <button
                onClick={() => onAnalyze(`${article.title}\n\n${stripHtml(article.description)}`)}
                className="mt-3 relative inline-flex items-center gap-2 px-4 py-1.5 text-white text-xs font-medium rounded-full group overflow-hidden btn-premium opacity-80 group-hover:opacity-100 group-hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                <SparklesIcon className="w-4 h-4" />
                <span className="relative z-10">{t('latestNews.analyzeButton')}</span>
              </button>
            </li>
          )) : (
            <p className="text-center text-slate-500 py-4">{t('latestNews.noNews')}</p>
          )}
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
      borderColor: 'border-green-400/80',
      iconBg: 'bg-green-100/80',
      iconColor: 'text-green-600',
    },
    info: {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      ),
      borderColor: 'border-blue-400/80',
      iconBg: 'bg-blue-100/80',
      iconColor: 'text-blue-600',
    },
  };

  const config = toastConfig[type];

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <div
        className={`flex items-center gap-x-2.5 max-w-sm px-4 py-2.5 rounded-2xl border-l-4 shadow-floating bg-white/80 backdrop-blur-lg animate-toast-in ${config.borderColor}`}
        role="alert"
      >
        <div className={`flex-shrink-0 rounded-full p-1 ${config.iconBg} ${config.iconColor}`}>
          {config.icon}
        </div>
        <div className="text-sm font-medium text-slate-800">
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
      className="glass-refined bg-white/80 p-6 max-w-sm w-full text-center relative animate-reveal-scale"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-2 rounded-full text-slate-500 hover:bg-slate-100/80 transition-colors"
        aria-label="关闭"
      >
        <XIcon className="w-6 h-6" />
      </button>
      <h2 id="image-modal-title" className="text-xl font-bold text-slate-800 mb-4">{title}</h2>
      <div className="p-2 border-4 border-slate-100/80 rounded-lg inline-block">
        <img
          src={imageUrl}
          alt="公众号二维码"
          className="w-64 h-64 object-contain rounded-md"
        />
      </div>
    </div>
  </div>
);

const RadarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 3v2" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 12h-2" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 21v-2" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 12h2" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 12L7 7" className="radar-sweep" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
);


type TabButtonProps = {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, children }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-x-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${
      isActive
        ? 'bg-white shadow-md text-slate-800'
        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
    }`}
    role="tab"
    aria-selected={isActive}
  >
    {children}
  </button>
);

const MainPage: React.FC = () => {
  const { t, locale } = useI18n();

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
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [activeModel, setActiveModel] = useState<AnalysisModel>('grok');
  
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

    // Register the service worker for PWA capabilities.
    /*
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
    */
  }, []);

  // Fetch dynamic hot stocks when model or language changes
  useEffect(() => {
    const fetchHotStocks = async () => {
      setIsHotStocksLoading(true);
      try {
        const stocks = await getHotStocksFromAI(activeModel, locale);
        setHotStocks(stocks);
      } catch (err) {
        console.error("Failed to fetch hot stocks:", err);
        // Fallback to a default list or show an error, here we just log it
      } finally {
        setIsHotStocksLoading(false);
      }
    };
    fetchHotStocks();
  }, [activeModel, locale]);

  // SEO: Set meta tags and html lang
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en-US';
    const title = t('meta.title');
    const description = t('meta.description');
    const ogTitle = t('meta.ogTitle');
    const ogDescription = t('meta.ogDescription');

    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', ogTitle);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', ogDescription);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', ogTitle);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', ogDescription);
  }, [locale, t]);

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
      setError(t('errors.emptyTopic'));
      return;
    }

    if (checkRateLimit()) {
      setError(t('errors.rateLimit'));
      return;
    }
    
    setActiveTab('topic');
    setIsLoading(true);
    setError(null);
    setAnalysisReport(null);
    setStockAnalysisReport(null);
    setPositionalWarfareReport(null);

    try {
      const report = await getAnalysis(topic, activeModel, locale);
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
      const errorMessage = err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError');
      setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  }, [topicHistory, activeModel, locale, t]);

  const handleStockAnalyze = useCallback(async (stockQueryToAnalyze: string) => {
    if (!stockQueryToAnalyze.trim()) {
      setStockError(t('errors.emptyStock'));
      return;
    }

    if (checkRateLimit()) {
        setStockError(t('errors.rateLimit'));
        return;
    }

    setActiveTab('stock');
    setIsStockLoading(true);
    setStockError(null);
    setStockAnalysisReport(null);
    setAnalysisReport(null);
    setPositionalWarfareReport(null);

    try {
      const report = await getStockAnalysis(stockQueryToAnalyze, activeModel, locale);
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
      const errorMessage = err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError');
      setStockError(errorMessage);
    } finally {
      setIsStockLoading(false);
    }
  }, [stockHistory, activeModel, locale, t]);

  const handlePositionalWarfareAnalyze = useCallback(async () => {
    if (!leaderStockQuery.trim()) {
        setPositionalWarfareError(t('errors.emptyLeaderStock'));
        return;
    }

    if (checkRateLimit()) {
        setPositionalWarfareError(t('errors.rateLimit'));
        return;
    }

    setActiveTab('positional');
    setIsPositionalWarfareLoading(true);
    setPositionalWarfareError(null);
    setPositionalWarfareReport(null);
    setAnalysisReport(null);
    setStockAnalysisReport(null);
    
    try {
        const report = await getPositionalWarfareAnalysis(leaderStockQuery, setPositionalWarfareProgress, activeModel, locale);
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
        const errorMessage = err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError');
        setPositionalWarfareError(errorMessage);
    } finally {
        setIsPositionalWarfareLoading(false);
        setPositionalWarfareProgress('');
    }
  }, [leaderStockQuery, positionalWarfareHistory, activeModel, locale, t]);


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

  return (
    <>
      {isRiskModalOpen && <InvestmentRiskModal onAccept={handleAcceptRisk} />}
      {toast && <Toast message={toast.message} type={toast.type} />}
      {isImageModalOpen && (
          <ImageModal
              imageUrl="https://youke1.picui.cn/s1/2025/10/02/68de9d3a88ef4.jpg"
              onClose={() => setIsImageModalOpen(false)}
              title={t('imageModal.title')}
          />
      )}
      <div className="min-h-screen font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto">
          <header className="text-center mb-12">
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
                <LanguageSwitcher />
            </div>
            
            {/* Group title and subtitle for better vertical spacing and control */}
            <div className="flex flex-col items-center gap-y-4">
                <div className="flex justify-center items-center gap-x-4">
                  <h1 className="text-5xl sm:text-6xl font-extralight text-gradient-primary">
                    {t('header.title')}
                  </h1>
                  <RadarIcon className="w-12 h-12 text-blue-500" />
                </div>
                <p className="text-slate-600 text-lg max-w-xl">
                    {t('header.subtitle')}
                </p>
            </div>
            
            {/* Markets text with slightly more top margin to separate it from the main title block */}
            <p className="text-sm text-slate-500 mt-4">
              {t('header.markets')}
            </p>
          </header>
          
          <div className="flex justify-center items-center gap-x-3 mb-8 -mt-4">
            {/* Cumulative Analysis Counter */}
            <div className="text-center">
              <p className="text-xs text-slate-500">{t('stats.userAnalysisCount')}</p>
              <p className="text-2xl font-bold text-blue-600 tracking-tight">{userAnalysisCount}</p>
              <div className="w-6 h-px mx-auto bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mt-0.5"></div>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-slate-200/60"></div>

            {/* Action Buttons */}
            <div className="flex items-center gap-x-2">
              <a
                href="https://pplx.ai/mastergo"
                target="_blank"
                rel="noopener noreferrer"
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-medium rounded-lg group overflow-hidden btn-premium shadow-lg hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                <AcademicCapIcon className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                <span className="relative z-10">{t('actions.getPerplexity')}</span>
              </a>
            </div>
          </div>


          <main>
            {/* --- Analysis Controls --- */}
            <div className="mb-6 flex flex-col sm:flex-row justify-center items-center gap-x-6 gap-y-4">
              {/* Model Switcher */}
              <div className="flex items-center gap-x-3">
                <label id="model-switcher-label" className="text-sm font-medium text-slate-700">
                  {t('controls.model')}
                </label>
                <div role="group" aria-labelledby="model-switcher-label" className="flex items-center gap-x-1.5 p-1 rounded-full bg-slate-200/60">
                    <button
                        onClick={() => setActiveModel('grok')}
                        className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors duration-200 ${
                            activeModel === 'grok' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {t('controls.grok')}
                    </button>
                    <button
                        onClick={() => setActiveModel('gemini')}
                        className={`inline-flex items-center gap-x-1.5 px-4 py-1 text-sm font-semibold rounded-full transition-colors duration-200 ${
                            activeModel === 'gemini' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <span>{t('controls.gemini')}</span>
                        <span className="text-[10px] font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 px-1.5 py-0.5 rounded-md leading-none">
                          {t('controls.beta')}
                        </span>
                    </button>
                </div>
              </div>
            </div>
            
            {/* --- Tabs Navigation --- */}
            <div className="mb-8" role="tablist" aria-label="分析模式">
              <div className="glass-refined p-2 flex justify-center items-center gap-x-2 max-w-md mx-auto">
                <TabButton isActive={activeTab === 'topic'} onClick={() => setActiveTab('topic')}>
                   <DocumentTextIcon className="w-5 h-5" />
                   <span>{t('tabs.topic')}</span>
                </TabButton>
                <TabButton isActive={activeTab === 'stock'} onClick={() => setActiveTab('stock')}>
                  <ChartBarIcon className="w-5 h-5" />
                  <span>{t('tabs.stock')}</span>
                </TabButton>
                <TabButton isActive={activeTab === 'positional'} onClick={() => setActiveTab('positional')}>
                  <SwordsIcon className="w-5 h-5" />
                  <span>{t('tabs.positional')}</span>
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
                          <div role="alert" className="glass-refined bg-red-50/80 border-2 border-red-200 text-red-700 px-6 py-4 text-center">
                            <p className="font-semibold">{t('errors.title')}</p>
                            <p className="text-sm mt-1">{error}</p>
                          </div>
                        )}
            
                        {analysisReport && !isLoading && <AnalysisResult report={analysisReport} userInput={userInput} />}
                        
                        <AnalysisHistory
                          history={topicHistory.map(h => ({ id: h.id, text: h.topic }))}
                          onSelect={handleSelectTopicHistory}
                          onDelete={handleDeleteTopicHistory}
                          onClear={handleClearTopicHistory}
                        />

                        {locale === 'zh' && <LatestNews 
                          onAnalyze={handleNewsSelect} 
                          sources={NEWS_SOURCES}
                        />}
                        <AdSenseAd />
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
                          <div role="alert" className="glass-refined bg-red-50/80 border-2 border-red-200 text-red-700 px-6 py-4 text-center">
                            <p className="font-semibold">{t('errors.title')}</p>
                            <p className="text-sm mt-1">{stockError}</p>
                          </div>
                        )}
            
                        {stockAnalysisReport && !isStockLoading && <StockAnalysisResult report={stockAnalysisReport} />}
                        
                        <AnalysisHistory
                          history={stockHistory.map(h => ({ id: h.id, text: h.query }))}
                          onSelect={handleSelectStockHistory}
                          onDelete={handleDeleteStockHistory}
                          onClear={handleClearStockHistory}
                        />

                        <AdSenseAd />
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
                          <div role="alert" className="glass-refined bg-red-50/80 border-2 border-red-200 text-red-700 px-6 py-4 text-center">
                            <p className="font-semibold">{t('errors.title')}</p>
                            <p className="text-sm mt-1">{positionalWarfareError}</p>
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
          
          <footer className="text-center mt-16 py-8 border-t border-slate-200/60">
            <p className="text-sm text-slate-500">
              {t('footer.developedBy')}&nbsp;
              <a
                href="https://t.me/lover_links"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:text-purple-600 animated-underline transition-colors"
              >
                {t('footer.developerName')}
              </a>
              {t('footer.followUs')}
              <button
                onClick={() => setIsImageModalOpen(true)}
                className="font-medium text-blue-600 hover:text-purple-600 animated-underline transition-colors"
              >
                {t('footer.accountName')}
              </button>
              {t('footer.endText')}
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