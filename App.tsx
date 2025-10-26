import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { getAnalysis, getStockAnalysis, getHotStocksFromAI, getPositionalWarfareAnalysis, getPolymarketAnalysis, type AnalysisModel } from './services/geminiService';
// FIX: Import getCaseStudyData to be used when selecting a case study.
import { getCaseStudyData } from './services/caseStudyData';
import type { AnalysisReport, TopicHistoryEntry, StockAnalysisReport, StockHistoryEntry, PositionalWarfareReport, PositionalWarfareHistoryEntry } from './types';
import AnalysisInput from './components/AnalysisInput';
import AnalysisResult from './components/AnalysisResult';
import StockAnalysisInput from './components/StockAnalysisInput';
import StockAnalysisResult from './components/StockAnalysisResult';
import Loader from './components/Loader';
import AdSenseAd from './components/AdSenseAd';
import AnalysisHistory from './components/AnalysisHistory';
import HotStocks from './components/HotStocks';
import { NewspaperIcon, SparklesIcon, ChartBarIcon, DocumentTextIcon, SwordsIcon, HeartIcon, XIcon, AcademicCapIcon, ChartTrendingUpIcon } from './components/icons/Icons';
import AboutPage from './components/AboutPage';
import PositionalWarfareInput from './components/PositionalWarfareInput';
import PositionalWarfareResult from './components/PositionalWarfareResult';
import InvestmentRiskModal from './components/InvestmentRiskModal';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useI18n } from './hooks/useI18n';
import CaseStudyCard from './components/CaseStudyCard';
import PaymentModal from './components/PaymentModal';

// --- Constants ---
const TOPIC_HISTORY_STORAGE_KEY = 'gemini-analysis-history';
const STOCK_HISTORY_STORAGE_KEY = 'gemini-stock-analysis-history';
const POSITIONAL_WARFARE_HISTORY_STORAGE_KEY = 'gemini-positional-warfare-history';
const USER_ANALYSIS_COUNT_KEY = 'gemini-user-analysis-count';
const RISK_WARNING_ACCEPTED_KEY = 'gemini-risk-warning-accepted';
const ANALYSIS_TIMESTAMPS_KEY = 'gemini-analysis-timestamps';
const CASE_STUDY_CLOSED_KEY = 'gemini-case-study-closed';
const USER_ID_KEY = 'gemini-user-id';
const CREDITS_KEY = 'gemini-claude-credits';
const LAST_DAILY_CREDIT_AWARD_DATE_KEY = 'gemini-daily-credit-award-date';

const MAX_ANALYSES_PER_HOUR = 12;
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

// --- Model Usage Rules ---
const DEEPSEEK_CREDIT_COST = 1;
const GEMINI_CREDIT_COST = 1;
const CLAUDE_CREDIT_COST = 2;

// --- New Credit System Rules ---
const DAILY_FREE_CREDITS_AWARD = 5;

// --- User/Credit/Usage Helper Functions ---
const getUserId = (): string => {
  try {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  } catch (e) {
    console.error("localStorage not available, using temporary ID.", e);
    return uuidv4();
  }
};

const getCredits = (): number => {
  try {
    const credits = localStorage.getItem(CREDITS_KEY);
    return credits ? parseInt(credits, 10) : 0;
  } catch (e) { return 0; }
};

const addCredits = (amount: number): number => {
  try {
    const newCredits = getCredits() + amount;
    localStorage.setItem(CREDITS_KEY, String(newCredits));
    return newCredits;
  } catch (e) { return amount; }
};

const useCredits = (amount: number): number => {
  try {
    const currentCredits = getCredits();
    if (currentCredits >= amount) {
      const newCredits = currentCredits - amount;
      localStorage.setItem(CREDITS_KEY, String(newCredits));
      return newCredits;
    }
    return currentCredits;
  } catch (e) { return 0; }
};

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
  { id: 'geekinsight', name: '极客洞察', url: 'https://api.newshacker.me/rss' },
  { id: '36kr', name: '36氪', url: 'https://36kr.com/feed' },
  { id: 'xueqiu', name: '雪球', url: 'https://xueqiu.com/hots/topic/rss' },
  { id: 'solidot', name: '奇客 Solidot', url: 'https://www.solidot.org/index.rss' },
  { id: 'hackernews', name: 'Hacker News', url: 'https://www.supertechfans.com/cn/index.xml' },
  { id: 'maobidao', name: '猫笔刀', url: 'https://wechat2rss.xlab.app/feed/33d986064f59be5263de2ca822fb3e0bdd59eb81.xml' },
];

const SOURCE_COLORS: { [key: string]: string } = {
  '极客洞察': 'bg-indigo-100 text-indigo-800',
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
  const [activeSourceId, setActiveSourceId] = useState<string>('geekinsight'); // Default to Geek Insight
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

type PendingAnalysis = { type: 'topic' | 'stock' | 'positional'; query: string };

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
  const [userAnalysisCount, setUserAnalysisCount] = useState<number>(0);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [activeModel, setActiveModel] = useState<AnalysisModel>('deepseek');
  const [isCaseStudyVisible, setIsCaseStudyVisible] = useState(true);

  // Credit and Usage State
  const [credits, setCredits] = useState<number>(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<PendingAnalysis | null>(null);
  const [redemptionCode, setRedemptionCode] = useState('');
  
  // Effect to hide toast after a delay
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000); // 5 seconds
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
    // Initialize user ID
    getUserId();

    // Daily Credits (runs once per day)
    try {
        const today = new Date().toISOString().split('T')[0];
        const lastAwardDate = localStorage.getItem(LAST_DAILY_CREDIT_AWARD_DATE_KEY);
        if (lastAwardDate !== today) {
            addCredits(DAILY_FREE_CREDITS_AWARD);
            localStorage.setItem(LAST_DAILY_CREDIT_AWARD_DATE_KEY, today);
            setToast({ message: t('toasts.dailyCreditsAwarded', { count: DAILY_FREE_CREDITS_AWARD }), type: 'success' });
        }
    } catch (e) { console.error("Failed to award daily credits:", e); }
    
    // Set credits state from the now-updated localStorage
    setCredits(getCredits());

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
      
      const isCaseStudyClosed = localStorage.getItem(CASE_STUDY_CLOSED_KEY);
      if (isCaseStudyClosed === 'true') {
          setIsCaseStudyVisible(false);
      }

    } catch (err) {
      console.error("Failed to load from localStorage", err);
    }
  }, [t]);

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

  const { cost, isPaywalled } = useMemo(() => {
    let calculatedCost = 0;

    if (activeModel === 'deepseek') {
        calculatedCost = DEEPSEEK_CREDIT_COST;
    } else if (activeModel === 'gemini') {
        calculatedCost = GEMINI_CREDIT_COST;
    } else { // claude
        calculatedCost = CLAUDE_CREDIT_COST;
    }
    
    const hasEnoughCredits = credits >= calculatedCost;
    const calculatedIsPaywalled = !hasEnoughCredits;

    return { cost: calculatedCost, isPaywalled: calculatedIsPaywalled };
  }, [activeModel, credits]);

  const getModelLabel = useCallback((model: AnalysisModel) => {
    switch(model) {
        case 'deepseek':
            return `${t('controls.deepseek')} (${t('controls.costPerUse', {count: DEEPSEEK_CREDIT_COST})})`;
        case 'gemini':
            return `${t('controls.gemini')} (${t('controls.costPerUse', {count: GEMINI_CREDIT_COST})})`;
        case 'claude':
            return `${t('controls.claude')} (${t('controls.costPerUse', {count: CLAUDE_CREDIT_COST})})`;
    }
  }, [t]);

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

  const handleModelChange = (newModel: AnalysisModel) => {
    if (activeModel === newModel) return;
    setActiveModel(newModel);
    setToast({ message: t('controls.modelSwitched'), type: 'info' });
  };

  const handleAnalyze = useCallback(async (topic: string, bypassCreditCheck = false) => {
    if (!topic.trim()) { setError(t('errors.emptyTopic')); return; }
    if (checkRateLimit()) { setError(t('errors.rateLimit')); return; }
    if (isPaywalled && !bypassCreditCheck) {
        setPendingAnalysis({ type: 'topic', query: topic });
        setIsPaymentModalOpen(true);
        return;
    }
    
    setActiveTab('topic');
    setIsLoading(true);
    setError(null);
    setAnalysisReport(null);
    setStockAnalysisReport(null);
    setPositionalWarfareReport(null);

    try {
        setCredits(useCredits(cost));

        const isPolymarketUrl = /^https?:\/\/polymarket\.com\//.test(topic.trim());
        const report = isPolymarketUrl 
            ? await getPolymarketAnalysis(topic, activeModel, locale)
            : await getAnalysis(topic, activeModel, locale);
        
        setAnalysisReport(report);
        recordAnalysisTimestamp();
        incrementUserAnalysisCount();

        const newEntry: TopicHistoryEntry = { id: Date.now(), topic, report };
        const newHistory = [newEntry, ...topicHistory].slice(0, 20);
        updateTopicHistory(newHistory);
    } catch (err) {
        console.error(err);
        setCredits(addCredits(cost)); // Refund on failure
        const errorMessage = err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError');
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  }, [topicHistory, activeModel, locale, t, cost, isPaywalled, credits]);

  const handleStockAnalyze = useCallback(async (stockQueryToAnalyze: string, bypassCreditCheck = false) => {
    if (!stockQueryToAnalyze.trim()) { setStockError(t('errors.emptyStock')); return; }
    if (checkRateLimit()) { setStockError(t('errors.rateLimit')); return; }
    if (isPaywalled && !bypassCreditCheck) {
        setPendingAnalysis({ type: 'stock', query: stockQueryToAnalyze });
        setIsPaymentModalOpen(true);
        return;
    }

    setActiveTab('stock');
    setIsStockLoading(true);
    setStockError(null);
    setStockAnalysisReport(null);
    setAnalysisReport(null);
    setPositionalWarfareReport(null);

    try {
        setCredits(useCredits(cost));

        const report = await getStockAnalysis(stockQueryToAnalyze, activeModel, locale);
        
        setStockAnalysisReport(report);
        recordAnalysisTimestamp();
        incrementUserAnalysisCount();

        const newEntry: StockHistoryEntry = { id: Date.now(), query: stockQueryToAnalyze, report };
        const newHistory = [newEntry, ...stockHistory].slice(0, 20);
        updateStockHistory(newHistory);
    } catch (err) {
        console.error(err);
        setCredits(addCredits(cost)); // Refund credit on failure
        const errorMessage = err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError');
        setStockError(errorMessage);
    } finally {
        setIsStockLoading(false);
    }
  }, [stockHistory, activeModel, locale, t, cost, isPaywalled, credits]);

  const handlePositionalWarfareAnalyze = useCallback(async (query: string, bypassCreditCheck = false) => {
    if (!query.trim()) { setPositionalWarfareError(t('errors.emptyLeaderStock')); return; }
    if (checkRateLimit()) { setPositionalWarfareError(t('errors.rateLimit')); return; }
    if (isPaywalled && !bypassCreditCheck) {
        setPendingAnalysis({ type: 'positional', query });
        setIsPaymentModalOpen(true);
        return;
    }

    setActiveTab('positional');
    setIsPositionalWarfareLoading(true);
    setPositionalWarfareError(null);
    setPositionalWarfareReport(null);
    setAnalysisReport(null);
    setStockAnalysisReport(null);
    
    try {
        setCredits(useCredits(cost));

        const report = await getPositionalWarfareAnalysis(query, setPositionalWarfareProgress, activeModel, locale);

        setPositionalWarfareReport(report);
        recordAnalysisTimestamp();
        incrementUserAnalysisCount();

        const newEntry: PositionalWarfareHistoryEntry = { id: Date.now(), leaderStockQuery: query, report };
        const newHistory = [newEntry, ...positionalWarfareHistory].slice(0, 20);
        updatePositionalWarfareHistory(newHistory);
    } catch (err) {
        console.error(err);
        setCredits(addCredits(cost)); // Refund credit on failure
        const errorMessage = err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError');
        setPositionalWarfareError(errorMessage);
    } finally {
        setIsPositionalWarfareLoading(false);
        setPositionalWarfareProgress('');
    }
  }, [positionalWarfareHistory, activeModel, locale, t, cost, isPaywalled, credits]);

  const handlePaymentSuccess = (creditsPurchased: number) => {
    const newTotal = addCredits(creditsPurchased);
    setCredits(newTotal);
    setIsPaymentModalOpen(false);
    
    if (pendingAnalysis) {
        setToast({ message: t('paymentModal.successMulti', { count: creditsPurchased }), type: 'success' });
        const { type, query } = pendingAnalysis;
        setTimeout(() => {
            if (type === 'topic') handleAnalyze(query, true);
            if (type === 'stock') handleStockAnalyze(query, true);
            if (type === 'positional') handlePositionalWarfareAnalyze(query, true);
        }, 300);
        setPendingAnalysis(null);
    } else {
        setToast({ message: t('paymentModal.successTopUp', { count: creditsPurchased }), type: 'success' });
    }
  };

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

  const handleSelectCaseStudy = useCallback(() => {
    const caseStudy = getCaseStudyData(locale);
    
    setUserInput(caseStudy.topic);
    setAnalysisReport(caseStudy.report);
    
    // Clear other states
    setStockAnalysisReport(null);
    setPositionalWarfareReport(null);
    setError(null);
    setStockError(null);
    setPositionalWarfareError(null);
    setIsLoading(false); // Ensure loader is off
    
    setActiveTab('topic');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [locale]);

  const handleCloseCaseStudy = () => {
    setIsCaseStudyVisible(false);
    try {
        localStorage.setItem(CASE_STUDY_CLOSED_KEY, 'true');
    } catch (err) {
        console.error("Failed to save to localStorage", err);
    }
  };

  const handleRedeemCode = useCallback(() => {
    if (redemptionCode.toLowerCase().trim() !== 'happy') {
        setToast({ message: t('redeem.invalidCode'), type: 'info' });
        return;
    }

    const REDEMPTION_KEY = 'gemini-redemption-date-happy';
    const today = new Date().toISOString().split('T')[0];

    try {
        const lastRedemptionDate = localStorage.getItem(REDEMPTION_KEY);
        if (lastRedemptionDate === today) {
            setToast({ message: t('redeem.alreadyRedeemed'), type: 'info' });
            return;
        }

        const newCredits = addCredits(10);
        setCredits(newCredits);
        localStorage.setItem(REDEMPTION_KEY, today);
        setToast({ message: t('redeem.success'), type: 'success' });
        setRedemptionCode(''); // Clear input after successful redemption

    } catch (e) {
        console.error("Failed to process redemption code:", e);
    }
  }, [redemptionCode, t]);


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

  const showLatestNews = locale === 'zh';
  const gridShouldBeTwoColumns = isCaseStudyVisible && showLatestNews;

  return (
    <>
      {isRiskModalOpen && <InvestmentRiskModal onAccept={handleAcceptRisk} />}
      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => {
            setIsPaymentModalOpen(false);
            setPendingAnalysis(null);
        }}
        onPaymentSuccess={handlePaymentSuccess}
      />
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
            <div className="flex justify-center items-center gap-x-4 mb-4">
              <h1 className="text-5xl sm:text-6xl font-extralight text-gradient-primary">
                {t('header.title')}
              </h1>
              <RadarIcon className="w-12 h-12 text-blue-500" />
            </div>
            <p className="text-slate-600 text-lg">
                {t('header.subtitle')}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              {t('header.markets')}
            </p>
          </header>
          
          <div className="flex justify-center items-center gap-x-3 mb-8 -mt-4">
            <div className="text-center">
              <p className="text-xs text-slate-500">{t('stats.userAnalysisCount')}</p>
              <p className="text-2xl font-bold text-blue-600 tracking-tight">{userAnalysisCount}</p>
              <div className="w-6 h-px mx-auto bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mt-0.5"></div>
            </div>
            <div className="h-8 w-px bg-slate-200/60"></div>
            <div className="flex items-center gap-x-3">
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
            <div className="mb-6 flex flex-col sm:flex-row justify-center items-center gap-x-6 gap-y-4 flex-wrap">
              <div className="flex items-center gap-x-3">
                <label htmlFor="model-switcher" className="text-sm font-medium text-slate-700">
                  {t('controls.model')}
                </label>
                <div className="relative">
                    <select
                        id="model-switcher"
                        value={activeModel}
                        onChange={(e) => handleModelChange(e.target.value as AnalysisModel)}
                        className="appearance-none bg-white/60 border border-slate-200/60 rounded-full pl-4 pr-10 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors cursor-pointer"
                    >
                        <option value="deepseek">{getModelLabel('deepseek')}</option>
                        <option value="gemini">{getModelLabel('gemini')}</option>
                        <option value="claude">{getModelLabel('claude')}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                    </div>
                </div>
              </div>
              <div className="text-sm font-medium text-slate-700 flex items-center gap-x-2">
                  <span>{t('controls.credits', { count: credits })}</span>
                  <button onClick={() => setIsPaymentModalOpen(true)} className="text-purple-600 hover:text-purple-800 text-xs font-bold">
                      ({t('controls.addCredits')})
                  </button>
              </div>
            </div>
            
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

            <div className="space-y-8">
                {activeTab === 'topic' && (
                    <div className="space-y-8 animate-fade-in" role="tabpanel">
                        <AnalysisInput
                          userInput={userInput}
                          setUserInput={setUserInput}
                          onAnalyze={() => handleAnalyze(userInput)}
                          isLoading={isLoading}
                          isPaywalled={isPaywalled}
                          cost={cost}
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

                        <div className={`grid grid-cols-1 ${gridShouldBeTwoColumns ? 'lg:grid-cols-2' : ''} gap-8 items-start`}>
                          {isCaseStudyVisible && (
                            <CaseStudyCard onSelect={handleSelectCaseStudy} onClose={handleCloseCaseStudy} />
                          )}
                          {showLatestNews && <LatestNews 
                            onAnalyze={handleNewsSelect} 
                            sources={NEWS_SOURCES}
                          />}
                        </div>
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
                          isPaywalled={isPaywalled}
                          cost={cost}
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
                          onAnalyze={() => handlePositionalWarfareAnalyze(leaderStockQuery)}
                          isLoading={isPositionalWarfareLoading}
                          isPaywalled={isPaywalled}
                          cost={cost}
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
          
          <footer className="text-center mt-16 py-8 border-t border-slate-200/60 flex flex-col items-center gap-y-6">
            <div className="flex items-center gap-x-2">
              <input
                  type="text"
                  placeholder={t('redeem.placeholder')}
                  value={redemptionCode}
                  onChange={(e) => setRedemptionCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRedeemCode(); }}
                  className="bg-white/60 border border-slate-200/60 rounded-full pl-4 pr-2 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors w-40"
                  aria-label={t('redeem.placeholder')}
              />
              <button
                  onClick={handleRedeemCode}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              >
                  {t('redeem.button')}
              </button>
            </div>
            <LanguageSwitcher />
            <p className="text-sm text-slate-500">
              {t('footer.contact')}
              <a
                href="mailto:codes@z.org"
                className="font-medium text-blue-600 hover:text-purple-600 animated-underline transition-colors"
              >
                codes@z.org
              </a>
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