import React, { useState, useEffect } from 'react';
import { NewspaperIcon, SparklesIcon, XIcon, ExternalLinkIcon } from './icons/Icons';
import { useI18n } from '../hooks/useI18n';

// --- Data & Types ---
export interface NewsArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  sourceName: string;
}

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  type?: 'rss' | 'json';
}

export const NEWS_SOURCES: NewsSource[] = [
  { id: 'xueqiu', name: '雪球', url: 'https://xueqiu.com/hots/topic/rss' },
  { id: '36kr', name: '36氪', url: 'https://36kr.com/feed' },
  { id: 'geekinsight', name: '极客洞察', url: 'https://api.newshacker.me/rss' },
  { id: 'bloomberg', name: '彭博', url: 'https://bbg.buzzing.cc/feed.xml' },
  { id: 'buzzing', name: 'Buzzing', url: 'https://www.buzzing.cc/feed.xml' },
];

const SOURCE_COLORS: { [key: string]: string } = {
  '36氪': 'bg-gray-100 text-gray-800',
  '极客洞察': 'bg-gray-100 text-gray-800',
  '雪球': 'bg-gray-100 text-gray-800',
  '彭博': 'bg-gray-100 text-gray-800',
  'Buzzing': 'bg-gray-100 text-gray-800',
};

// --- Helpers ---
const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

const truncateText = (text: string, length: number) => {
  return text.length > length ? text.substring(0, length) + '...' : text;
};

// --- News Detail Modal ---
const NewsDetailModal: React.FC<{
  article: NewsArticle | null;
  onClose: () => void;
  onAnalyze: (topic: string) => void;
}> = ({ article, onClose, onAnalyze }) => {
  const { t } = useI18n();
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
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center gap-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-gray-100 text-gray-800">
            {article.sourceName}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-black text-sm font-medium rounded-xl shadow-sm hover:bg-gray-100 transition-all"
            >
              <ExternalLinkIcon className="w-4 h-4" />
              查看原文
            </a>
            <button
              onClick={() => {
                onClose();
                onAnalyze(`${article.title}\n\n${stripHtml(article.description)}`);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-xl shadow-sm hover:bg-gray-800 transition-all"
            >
              <SparklesIcon className="w-4 h-4" />
              {t('latestNews.analyzeButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Skeleton ---
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

// --- LatestNews ---
interface LatestNewsProps {
  onAnalyze: (topic: string) => void;
  sources: NewsSource[];
}

const LatestNews: React.FC<LatestNewsProps> = ({ onAnalyze, sources }) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string>('xueqiu'); // Default to 雪球
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
      <NewsDetailModal article={selectedArticle} onClose={() => setSelectedArticle(null)} onAnalyze={onAnalyze} />
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-black rounded-xl shadow-lg">
            <NewspaperIcon className="w-5 h-5 text-white" />
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

export default LatestNews;
