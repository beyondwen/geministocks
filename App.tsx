
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
// Use streaming service with fallback to legacy
import { 
  getAnalysisWithStreaming, 
  getStockAnalysisWithStreaming,
  getStockAnalysis,
  findIndustryLeader, 
  getPositionalWarfareFollowerAnalysis, 
  getPolymarketAnalysis, 
  getHotStocksFromAI 
} from './services/streamingService';
import { getAnalysis } from './services/geminiService';
import type { AnalysisReport, TopicHistoryEntry, StockAnalysisReport, StockHistoryEntry, PositionalWarfareReport, PositionalWarfareHistoryEntry, LeaderStockProfile } from './types';
import AnalysisInput from './components/AnalysisInput';
import AnalysisResult from './components/AnalysisResult';
import StockAnalysisInput from './components/StockAnalysisInput';
import StockAnalysisResult from './components/StockAnalysisResult';
import Loader from './components/Loader';
import StreamingLoader from './components/StreamingLoader';
// import AdSenseAd from './components/AdSenseAd';
import AnalysisHistory from './components/AnalysisHistory';
import HotStocks from './components/HotStocks';
import { NewspaperIcon, SparklesIcon, ChartBarIcon, DocumentTextIcon, SwordsIcon, HeartIcon, XIcon, AcademicCapIcon, ChartTrendingUpIcon, ExternalLinkIcon, QuestionMarkCircleIcon } from './components/icons/Icons';
import AboutPage from './components/AboutPage';
import PositionalWarfareInput from './components/PositionalWarfareInput';
import PositionalWarfareResult from './components/PositionalWarfareResult';
import UserGuideModal from './components/UserGuideModal';
import { CacheStats } from './components/CacheStats';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useI18n } from './hooks/useI18n';
import ApiSettingsModal from './components/ApiSettingsModal';
import { isApiConfigured } from './services/apiConfigService';
import DuanYongpingHoldings from './components/DuanYongpingHoldings';


// --- Constants ---
const TOPIC_HISTORY_STORAGE_KEY = 'gemini-analysis-history';
const STOCK_HISTORY_STORAGE_KEY = 'gemini-stock-analysis-history';
const POSITIONAL_WARFARE_HISTORY_STORAGE_KEY = 'gemini-positional-warfare-history';
const USER_ANALYSIS_COUNT_KEY = 'gemini-user-analysis-count';
const USER_ID_KEY = 'gemini-user-id';


// --- User Helper Functions ---
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
  { id: 'geekinsight', name: '极客洞察', url: 'https://api.newshacker.me/rss' },
  { id: 'xueqiu', name: '雪球', url: 'https://xueqiu.com/hots/topic/rss' },
];

const SOURCE_COLORS: { [key: string]: string } = {
  '36氪': 'bg-gray-100 text-gray-800',
  '极客洞察': 'bg-gray-100 text-gray-800',
  '雪球': 'bg-gray-100 text-gray-800',
};


// --- Helper Components ---
const NewsDetailModal: React.FC<{ article: NewsArticle | null; onClose: () => void; }> = ({ article, onClose }) => {
  if (!article) return null;

  const createMarkup = (htmlString: string) => {
    return { __html: htmlString };
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="news-modal-title"
    >
      <div
        className="bg-white p-6 max-w-2xl w-full h-[80vh] flex flex-col text-left relative animate-reveal-scale rounded-2xl shadow-floating"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start pb-4 border-b border-gray-200">
          <h2 id="news-modal-title" className="text-xl font-bold text-gray-800 pr-8">
            {article.title}
          </h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="关闭"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="mt-4 flex-grow overflow-y-auto pr-4 text-gray-700 leading-relaxed prose prose-sm max-w-none" style={{ scrollbarWidth: 'thin' }}>
          <div dangerouslySetInnerHTML={createMarkup(article.description)} />
        </div>
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-gray-100 text-gray-800`}>
                {article.sourceName}
            </span>
            <a 
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-xl shadow-sm hover:bg-gray-800 transition-all"
            >
                <ExternalLinkIcon className="w-4 h-4" />
                查看原文
            </a>
        </div>
      </div>
    </div>
  );
};

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
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
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
    <>
      <NewsDetailModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-black rounded-xl shadow-lg">
                <NewspaperIcon className="w-5 h-5 text-white"/>
            </div>
            <h3 className="text-xl font-semibold text-black">{t('latestNews.title')}</h3>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4 mb-4">
          {sources.map(source => (
            <button
              key={source.id}
              onClick={() => setActiveSourceId(source.id)}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black ${
                activeSourceId === source.id
                  ? 'bg-black text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            <p className="text-black bg-gray-100 p-3 rounded-lg border border-gray-200">{error}</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {articles.length > 0 ? articles.map((article, index) => (
              <li key={`${article.link}-${index}`} className="group relative border-b border-gray-200 pb-4 last:border-b-0 hover:bg-gray-50/80 transition-colors duration-300 rounded-xl p-3 -mx-3">
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-4 bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-2xl shadow-floating opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-30 pointer-events-none">
                    <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
                        <span className="font-bold text-gray-100">{article.sourceName}</span>
                        <span className="font-mono text-gray-400 text-[10px]">{new Date(article.pubDate).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-300 leading-relaxed line-clamp-6">
                        {stripHtml(article.description)}
                    </p>
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-[6px] border-transparent border-t-gray-900/95"></div>
                </div>

                <div className="flex items-center gap-x-2 mb-1 flex-wrap">
                    <button 
                      onClick={() => setSelectedArticle(article)} 
                      className="font-semibold text-black hover:text-gray-700 transition-colors text-left focus:outline-none focus-visible:underline"
                    >
                      {article.title}
                    </button>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${SOURCE_COLORS[article.sourceName] || 'bg-gray-100 text-gray-800'}`}>
                      {article.sourceName}
                    </span>
                </div>
                
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
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
              <p className="text-center text-gray-500 py-4">{t('latestNews.noNews')}</p>
            )}
          </ul>
        )}
      </div>
    </>
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
      borderColor: 'border-gray-800',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-800',
    },
    info: {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      ),
      borderColor: 'border-gray-800',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-800',
    },
  };

  const config = toastConfig[type];

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <div
        className={`flex items-center gap-x-2.5 max-w-sm px-4 py-2.5 rounded-2xl border-l-4 shadow-floating bg-white animate-toast-in ${config.borderColor}`}
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
      className="bg-white p-6 max-w-sm w-full text-center relative animate-reveal-scale"
      onClick={(e) => e.stopPropagation()}
    >
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
  badge?: string;
};

const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, children, badge }) => (
    <button
        onClick={onClick}
        className={`relative flex items-center justify-center gap-x-2 px-4 py-1.5 text-sm font-semibold transition-colors duration-200 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black border ${
            isActive
            ? 'bg-white text-black shadow-sm border-stone-300'
            : 'text-gray-600 border-stone-200/90 hover:bg-stone-100/80 hover:border-stone-300'
        }`}
        role="tab"
        aria-selected={isActive}
    >
        {children}
        {badge && (
            <span className="absolute -top-1.5 -right-1.5 text-xs font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 transform scale-75">
              {badge}
            </span>
        )}
    </button>
);

// --- New Leader Confirmation Modal Component ---
interface LeaderConfirmationModalProps {
    isOpen: boolean;
    leader: LeaderStockProfile | null;
    onConfirm: () => void;
    onClose: () => void;
}

const LeaderConfirmationModal: React.FC<LeaderConfirmationModalProps> = ({ isOpen, leader, onConfirm, onClose }) => {
    const { t } = useI18n();

    if (!isOpen || !leader) return null;

    return (
        <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="leader-confirm-title"
        >
            <div
                className="bg-white p-8 max-w-md w-full mx-4 text-left relative animate-reveal-scale rounded-2xl shadow-floating"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                    aria-label={t('leaderConfirmation.close')}
                >
                    <XIcon className="w-6 h-6" />
                </button>
                <h2 id="leader-confirm-title" className="text-2xl font-bold text-black mb-4 text-center">
                    {t('leaderConfirmation.title')}
                </h2>
                <div className="my-6 p-4 bg-gray-100 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">{t('leaderConfirmation.identified')}</p>
                    <p className="text-xl font-bold text-black mt-1">{leader.name} ({leader.ticker})</p>
                    <p className="text-xs text-gray-500 mt-1">{leader.sector}</p>
                </div>
                <p className="text-center text-gray-700">{t('leaderConfirmation.question')}</p>
                <div className="mt-8 flex flex-col sm:flex-row-reverse gap-4">
                    <button
                        onClick={onConfirm}
                        className="relative w-full sm:w-auto flex-1 inline-flex items-center justify-center px-6 py-3 btn-premium text-white text-base font-medium rounded-xl group overflow-hidden shadow-lg hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 active:scale-95"
                    >
                        <span className="relative z-10">{t('leaderConfirmation.confirmButton')}</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto flex-1 px-6 py-3 bg-white border-2 border-gray-200 text-black text-sm font-medium rounded-xl shadow-sm hover:bg-gray-100 hover:border-gray-300 transition-all"
                    >
                        {t('leaderConfirmation.cancelButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};


const MainPage: React.FC = () => {
  const { t, locale } = useI18n();

  // State for Topic Analysis
  const [userInput, setUserInput] = useState<string>('');
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [topicHistory, setTopicHistory] = useState<TopicHistoryEntry[]>([]);
  const [topicProgress, setTopicProgress] = useState<number>(0);
  
  // State for Stock Analysis
  const [stockQuery, setStockQuery] = useState<string>('');
  const [stockAnalysisReport, setStockAnalysisReport] = useState<StockAnalysisReport | null>(null);
  const [isStockLoading, setIsStockLoading] = useState<boolean>(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [hotStocks, setHotStocks] = useState<{name: string; ticker: string}[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([]);
  const [stockProgress, setStockProgress] = useState<number>(0);

  // State for Positional Warfare Analysis
  const [leaderStockQuery, setLeaderStockQuery] = useState<string>('');
  const [positionalWarfareReport, setPositionalWarfareReport] = useState<PositionalWarfareReport | null>(null);
  const [isPositionalWarfareLoading, setIsPositionalWarfareLoading] = useState<boolean>(false);
  const [positionalWarfareError, setPositionalWarfareError] = useState<string | null>(null);
  const [positionalWarfareProgress, setPositionalWarfareProgress] = useState<number>(0);
  const [positionalWarfareHistory, setPositionalWarfareHistory] = useState<PositionalWarfareHistoryEntry[]>([]);
  const [isFindingLeader, setIsFindingLeader] = useState<boolean>(false);
  const [potentialLeader, setPotentialLeader] = useState<LeaderStockProfile | null>(null);
  const [isConfirmingLeader, setIsConfirmingLeader] = useState<boolean>(false);
  
  // State for Inline Stock Analysis
  const [inlineStockAnalysisReport, setInlineStockAnalysisReport] = useState<StockAnalysisReport | null>(null);
  const [isInlineStockLoading, setIsInlineStockLoading] = useState<boolean>(false);
  const [inlineStockProgress, setInlineStockProgress] = useState<number>(0);
  const [inlineStockError, setInlineStockError] = useState<string | null>(null);

  // Streaming Progress State
  const [streamingTopicProgress, setStreamingTopicProgress] = useState<number>(0);
  const [streamingStockProgress, setStreamingStockProgress] = useState<number>(0);
  const [partialTopicData, setPartialTopicData] = useState<Partial<AnalysisReport> | null>(null);
  const [partialStockData, setPartialStockData] = useState<Partial<StockAnalysisReport> | null>(null);

  // Common State
  const [activeTab, setActiveTab] = useState<'topic' | 'stock' | 'positional'>('topic');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [userAnalysisCount, setUserAnalysisCount] = useState<number>(0);
  const [isUserGuideModalOpen, setIsUserGuideModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // User API Settings State
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [apiConfigured, setApiConfigured] = useState<boolean>(false);
  

  
  // Effect to hide toast after a delay
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000); // 5 seconds
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    // Initialize user ID (for anonymous users)
    getUserId();

    // Check whether the user has configured their API settings
    setApiConfigured(isApiConfigured());

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
  }, []);
  


  // Fetch dynamic hot stocks when language changes
  useEffect(() => {
    const fetchHotStocks = async () => {
      try {
        const stocks = await getHotStocksFromAI(locale);
        setHotStocks(stocks);
      } catch (err) {
        console.error("Failed to fetch hot stocks:", err);
        // Fallback to a default list or show an error, here we just log it
      }
    };
    fetchHotStocks();
  }, [locale]);

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

  // Require user API configuration before any analysis; open settings modal if missing
  const ensureApiConfigured = (): boolean => {
    if (isApiConfigured()) return true;
    setIsApiSettingsOpen(true);
    setToast({ message: locale === 'zh' ? '请先配置模型 API 地址和密钥' : 'Please configure your model API settings first', type: 'info' });
    return false;
  };


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

  const handleClearAllResults = () => {
      setAnalysisReport(null);
      setStockAnalysisReport(null);
      setPositionalWarfareReport(null);
      setError(null);
      setStockError(null);
      setPositionalWarfareError(null);
  }

  const handleAnalyze = useCallback(async (topic: string) => {
    if (!topic.trim()) { setError(t('errors.emptyTopic')); return; }
    if (!ensureApiConfigured()) return;

    setActiveTab('topic');
    setIsLoading(true);
    handleClearAllResults();
    setTopicProgress(0);
    setStreamingTopicProgress(0);
    setPartialTopicData(null);

    try {
        const isPolymarketUrl = /^https?:\/\/polymarket\.com\//.test(topic.trim());
        
        let report: AnalysisReport;
        if (isPolymarketUrl) {
            report = await getPolymarketAnalysis(topic, locale);
        } else {
            // Use streaming analysis with progress callback
            report = await getAnalysisWithStreaming(
                topic, 
                setTopicProgress, 
                locale,
                (progress, data) => {
                    setStreamingTopicProgress(progress);
                    setPartialTopicData(data);
                }
            );
        }
        
        setAnalysisReport(report);
        incrementUserAnalysisCount();

        const newEntry: TopicHistoryEntry = { id: Date.now(), topic, report };
        const newHistory = [newEntry, ...topicHistory].slice(0, 20);
        updateTopicHistory(newHistory);
    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError');
        setError(errorMessage);
    } finally {
        setIsLoading(false);
        setTopicProgress(0);
        setStreamingTopicProgress(0);
        setPartialTopicData(null);
    }
  }, [topicHistory, locale, t]);

  const handleStockAnalyze = useCallback(async (stockQueryToAnalyze: string) => {
    if (!stockQueryToAnalyze.trim()) { setStockError(t('errors.emptyStock')); return; }
    if (!ensureApiConfigured()) return;

    setActiveTab('stock');
    setIsStockLoading(true);
    handleClearAllResults();
    setStockProgress(0);
    setStreamingStockProgress(0);
    setPartialStockData(null);

    try {
        // Use streaming analysis with progress callback
        const combinedReport = await getStockAnalysisWithStreaming(
            stockQueryToAnalyze, 
            setStockProgress, 
            locale,
            (progress, data) => {
                setStreamingStockProgress(progress);
                setPartialStockData(data);
            }
        );

        setStockAnalysisReport(combinedReport);
        incrementUserAnalysisCount();

        const newEntry: StockHistoryEntry = { id: Date.now(), query: stockQueryToAnalyze, report: combinedReport };
        const newHistory = [newEntry, ...stockHistory].slice(0, 20);
        updateStockHistory(newHistory);
    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError');
        setStockError(errorMessage);
    } finally {
        setIsStockLoading(false);
        setStockProgress(0);
        setStreamingStockProgress(0);
        setPartialStockData(null);
    }
  }, [stockHistory, locale, t]);

  const handlePositionalWarfareAnalyze = useCallback(async (query: string) => {
    if (!query.trim()) { setPositionalWarfareError(t('errors.emptyLeaderStock')); return; }
    if (!ensureApiConfigured()) return;

    setActiveTab('positional');
    setIsFindingLeader(true);
    handleClearAllResults();

    try {
        const leaderProfile = await findIndustryLeader(query, locale);
        setPotentialLeader(leaderProfile);
        setIsConfirmingLeader(true);
    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError');
        setPositionalWarfareError(errorMessage);
    } finally {
        setIsFindingLeader(false);
    }
  }, [locale, t]);
  
  const handleConfirmLeaderAndAnalyze = useCallback(async () => {
    if (!potentialLeader) return;

    setIsConfirmingLeader(false);
    setIsPositionalWarfareLoading(true);
    setPositionalWarfareError(null);
    setPositionalWarfareProgress(0);
    
    try {
        const report = await getPositionalWarfareFollowerAnalysis(potentialLeader, setPositionalWarfareProgress, locale);

        setPositionalWarfareReport(report);
        incrementUserAnalysisCount();

        const newEntry: PositionalWarfareHistoryEntry = { id: Date.now(), leaderStockQuery, report };
        const newHistory = [newEntry, ...positionalWarfareHistory].slice(0, 20);
        updatePositionalWarfareHistory(newHistory);

    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError');
        setPositionalWarfareError(errorMessage);
    } finally {
        setIsPositionalWarfareLoading(false);
        setPositionalWarfareProgress(0);
        setPotentialLeader(null);
    }
  }, [potentialLeader, leaderStockQuery, positionalWarfareHistory, locale, t]);


  const handleInlineStockAnalyze = useCallback(async (stockQueryToAnalyze: string) => {
    if (!ensureApiConfigured()) return;

    setIsInlineStockLoading(true);
    setInlineStockError(null);
    setInlineStockAnalysisReport(null);
    setInlineStockProgress(0);

    try {
        const combinedReport = await getStockAnalysis(stockQueryToAnalyze, setInlineStockProgress, locale);
        setInlineStockAnalysisReport(combinedReport);
        // Do not add to history for inline analysis to keep the main history clean
    } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError');
        setInlineStockError(errorMessage);
    } finally {
        setIsInlineStockLoading(false);
    }
  }, [locale, t]);

  const clearInlineStockAnalysis = () => {
    setInlineStockAnalysisReport(null);
    setInlineStockError(null);
    setInlineStockProgress(0);
  };

  const handleNewsSelect = (newsTopic: string) => {
    setUserInput(newsTopic);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleAnalyze(newsTopic);
  };

  const handleDuanStockSelect = (query: string) => {
    setStockQuery(query);
    handleStockAnalyze(query);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewAnalysis = () => {
    handleClearAllResults();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  // --- History Handlers ---

  const handleSelectTopicHistory = (id: number) => {
    const entry = topicHistory.find((e) => e.id === id);
    if (!entry) return;
    setUserInput(entry.topic);
    handleClearAllResults();
    setAnalysisReport(entry.report);
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
    handleClearAllResults();
    setStockAnalysisReport(entry.report);
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
    handleClearAllResults();
    setPositionalWarfareReport(entry.report);
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

  const showLatestNews = locale === 'zh';
  
  const noReportLoaded = !analysisReport && !stockAnalysisReport && !positionalWarfareReport;
  const isLoadingAny = isLoading || isStockLoading || isPositionalWarfareLoading || isFindingLeader;
  const showDashboard = noReportLoaded && !isLoadingAny;

  return (
    <>
      <CacheStats />
      <UserGuideModal isOpen={isUserGuideModalOpen} onClose={() => setIsUserGuideModalOpen(false)} />
      <ApiSettingsModal
        isOpen={isApiSettingsOpen}
        onClose={() => setIsApiSettingsOpen(false)}
        onSaved={() => {
          setApiConfigured(true);
          setToast({
            message: locale === 'zh' ? '模型已配置成功，现在可以开始分析了' : 'Model configured successfully. You can start analyzing now.',
            type: 'success',
          });
        }}
      />
      <LeaderConfirmationModal
          isOpen={isConfirmingLeader}
          leader={potentialLeader}
          onConfirm={handleConfirmLeaderAndAnalyze}
          onClose={() => setIsConfirmingLeader(false)}
      />
      {toast && <Toast message={toast.message} type={toast.type} />}
      {isImageModalOpen && (
          <ImageModal
              imageUrl="https://youke1.picui.cn/s1/2025/10/02/68de9d3a88ef4.jpg"
              onClose={() => setIsImageModalOpen(false)}
              title={t('imageModal.title')}
          />
      )}
      <div className="min-h-screen relative z-10">
         <header className="sticky top-0 z-30 w-full bg-[#FBFBFA]/80 backdrop-blur-sm border-b border-stone-200/90">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left side: Logo & Title */}
                    <div className="flex items-center gap-x-3">
                        <RadarIcon className="w-8 h-8 text-black" />
                        <h1 className="text-xl font-semibold text-gray-800">
                            {t('header.title')}
                        </h1>
                    </div>

                    {/* Right side: Controls */}
                    <div className="flex items-center gap-x-4 sm:gap-x-6">
                        <a 
                            href="https://mastergo.lovable.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-x-1.5 text-xs sm:text-sm font-medium bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm"
                        >
                            <span>金融工具箱</span>
                        </a>
                        <button 
                            onClick={() => setIsUserGuideModalOpen(true)} 
                            className="hidden sm:flex items-center gap-x-1.5 text-sm font-medium text-gray-600 hover:text-black transition-colors"
                            aria-label={t('header.userGuide')}
                        >
                            <AcademicCapIcon className="w-5 h-5" />
                            <span>{t('header.userGuide')}</span>
                        </button>
                        {/* API Settings button */}
                        <button
                            onClick={() => setIsApiSettingsOpen(true)}
                            className={`flex items-center gap-x-1.5 text-xs sm:text-sm font-medium px-3 py-1 rounded-full border shadow-sm transition-colors ${
                                apiConfigured
                                    ? 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
                                    : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                            }`}
                            aria-label={locale === 'zh' ? '模型 API 设置' : 'Model API Settings'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{locale === 'zh' ? (apiConfigured ? '模型设置' : '配置模型') : (apiConfigured ? 'API Settings' : 'Setup API')}</span>
                        </button>
                        <div className="hidden sm:block">
                            <LanguageSwitcher />
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          <main>
            {!apiConfigured && (
              <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6 animate-fade-in" role="region" aria-label={locale === 'zh' ? '配置引导' : 'Setup guide'}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.077-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-base font-semibold text-amber-900 text-balance">
                      {locale === 'zh' ? '开始前，请先配置一个分析模型' : 'Configure an analysis model to get started'}
                    </h2>
                    <p className="mt-1 text-sm text-amber-800 leading-relaxed text-pretty">
                      {locale === 'zh'
                        ? '本应用使用你自己的模型 API。支持云端服务（OpenRouter、DeepSeek、MiniMax）或运行在本机的 CLI（Claude Code、Codex）。配置仅保存在本地浏览器。'
                        : 'This app uses your own model API. Choose a cloud service (OpenRouter, DeepSeek, MiniMax) or a CLI running on your machine (Claude Code, Codex). Your config stays in your browser.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsApiSettingsOpen(true)}
                    className="shrink-0 inline-flex items-center justify-center gap-x-1.5 rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-amber-50"
                  >
                    {locale === 'zh' ? '立即配置' : 'Configure now'}
                  </button>
                </div>
              </div>
            )}

            <div className="mb-8 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-4">
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-2" role="tablist" aria-label="分析模式">
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
                {/* --- INPUTS --- */}
                {activeTab === 'topic' && (
                    <div className="space-y-8 animate-fade-in" role="tabpanel">
                        <AnalysisInput
                          userInput={userInput}
                          setUserInput={setUserInput}
                          onAnalyze={() => handleAnalyze(userInput)}
                          isLoading={isLoading}
                        />
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
                    </div>
                )}
                {activeTab === 'positional' && (
                    <div className="space-y-8 animate-fade-in" role="tabpanel">
                        <PositionalWarfareInput
                          leaderStockQuery={leaderStockQuery}
                          setLeaderStockQuery={setLeaderStockQuery}
                          onAnalyze={() => handlePositionalWarfareAnalyze(leaderStockQuery)}
                          isLoading={isPositionalWarfareLoading || isFindingLeader}
                        />
                    </div>
                )}
                
                {/* --- RESULTS / DASHBOARD --- */}
                {isLoadingAny ? (
                  <>
                    {/* Show streaming loader with progress when streaming data is available */}
                    {(streamingTopicProgress > 0 || streamingStockProgress > 0) ? (
                      <StreamingLoader
                        progress={isLoading ? streamingTopicProgress : streamingStockProgress}
                        isStreaming={isLoading || isStockLoading}
                        type={isLoading ? 'topic' : isStockLoading ? 'stock' : 'positional'}
                      />
                    ) : (
                      <Loader 
                        taskType={isLoading ? 'topic' : isStockLoading ? 'stock' : isFindingLeader ? undefined : 'positional'}
                        currentStep={isLoading ? topicProgress : isStockLoading ? stockProgress : positionalWarfareProgress}
                      />
                    )}
                  </>
                ) : error ? (
                    <div role="alert" className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 text-center rounded-lg">
                        <p className="font-semibold">{t('errors.title')}</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                ) : stockError ? (
                    <div role="alert" className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 text-center rounded-lg">
                        <p className="font-semibold">{t('errors.title')}</p>
                        <p className="text-sm mt-1">{stockError}</p>
                    </div>
                ) : positionalWarfareError ? (
                    <div role="alert" className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 text-center rounded-lg">
                        <p className="font-semibold">{t('errors.title')}</p>
                        <p className="text-sm mt-1">{positionalWarfareError}</p>
                    </div>
                ) : analysisReport ? (
                    <AnalysisResult 
                        report={analysisReport} 
                        userInput={userInput} 
                        onNewAnalysis={handleNewAnalysis}
                        onAnalyzeStock={handleInlineStockAnalyze}
                        inlineReport={inlineStockAnalysisReport}
                        isInlineLoading={isInlineStockLoading}
                        inlineProgress={inlineStockProgress}
                        inlineError={inlineStockError}
                        onClearInlineReport={clearInlineStockAnalysis}
                    />
                ) : stockAnalysisReport ? (
                    <StockAnalysisResult report={stockAnalysisReport} onNewAnalysis={handleNewAnalysis} />
                ) : positionalWarfareReport ? (
                    <PositionalWarfareResult report={positionalWarfareReport} onNewAnalysis={handleNewAnalysis} />
                ) : (
                  // DASHBOARD VIEW
                  <div className="space-y-8 animate-fade-in">
                    {activeTab === 'topic' && (
                       <div className="grid grid-cols-1 gap-8 items-start">
                          {showLatestNews && <LatestNews 
                            onAnalyze={handleNewsSelect} 
                            sources={NEWS_SOURCES}
                          />}
                        </div>
                    )}
                    {(activeTab === 'stock' || activeTab === 'positional') && (
                       <DuanYongpingHoldings onSelect={handleDuanStockSelect} />
                    )}
                     <AnalysisHistory
                        history={
                          activeTab === 'topic' ? topicHistory.map(h => ({ id: h.id, text: h.topic })) :
                          activeTab === 'stock' ? stockHistory.map(h => ({ id: h.id, text: h.query })) :
                          positionalWarfareHistory.map(h => ({ id: h.id, text: h.leaderStockQuery }))
                        }
                        onSelect={
                          activeTab === 'topic' ? handleSelectTopicHistory :
                          activeTab === 'stock' ? handleSelectStockHistory :
                          handleSelectPositionalWarfareHistory
                        }
                        onDelete={
                          activeTab === 'topic' ? handleDeleteTopicHistory :
                          activeTab === 'stock' ? handleDeleteStockHistory :
                          handleDeletePositionalWarfareHistory
                        }
                        onClear={
                          activeTab === 'topic' ? handleClearTopicHistory :
                          activeTab === 'stock' ? handleClearStockHistory :
                          handleClearPositionalWarfareHistory
                        }
                      />
                      {/* <AdSenseAd /> */}
                  </div>
                )}
            </div>
          </main>
          
          <footer className="text-center mt-16 py-8 border-t border-gray-200">
             <div className="flex flex-col sm:flex-row justify-center items-center gap-x-6 gap-y-4">
                <p className="text-sm text-gray-500">
                  {t('footer.contact')}
                  <a
                    href="mailto:codes@z.org"
                    className="font-medium text-black hover:text-gray-700 animated-underline transition-colors"
                  >
                    codes@z.org
                  </a>
                </p>
             </div>
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
