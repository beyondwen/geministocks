// Shared news-feed fetching, used by LatestNews (display) and MarketThermometer (AI scan).

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
  /** Hidden sources are excluded from the display tabs but still feed the indicator scans. */
  hidden?: boolean;
  /** User-added sources (stored in localStorage, removable in the UI). */
  custom?: boolean;
}

/** Built-in news sources (display tabs + indicator scan window). */
export const NEWS_SOURCES: NewsSource[] = [
  { id: 'xueqiu', name: '雪球', url: 'https://xueqiu.com/hots/topic/rss' },
  { id: 'huxiu', name: '虎嗅', url: 'https://rss.huxiu.com' },
  { id: 'geekinsight', name: '极客洞察', url: 'https://api.newshacker.me/rss' },
  { id: 'bloomberg', name: '彭博', url: 'https://bbg.buzzing.cc/feed.xml' },
  { id: 'buzzing', name: 'Buzzing', url: 'https://www.buzzing.cc/feed.xml' },
  { id: 'ahead-of-ai', name: 'Ahead of AI', url: 'https://magazine.sebastianraschka.com/feed' },
  // Hidden from tabs; still part of the indicator scan window (EN institutional signals)
  { id: 'cnbc', name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', hidden: true },
  { id: 'marketwatch', name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', hidden: true },
];

// --- User-defined custom RSS sources (localStorage) ---

const CUSTOM_SOURCES_KEY = 'custom-news-sources';

export const loadCustomSources = (): NewsSource[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_SOURCES_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((s: any) => s && typeof s.id === 'string' && typeof s.name === 'string' && typeof s.url === 'string')
      .map((s: any) => ({ id: s.id, name: s.name, url: s.url, custom: true as const }));
  } catch {
    return [];
  }
};

export const saveCustomSources = (sources: NewsSource[]): void => {
  try {
    localStorage.setItem(
      CUSTOM_SOURCES_KEY,
      JSON.stringify(sources.map(s => ({ id: s.id, name: s.name, url: s.url })))
    );
  } catch { /* best-effort */ }
};

/** Sources shown as tabs: visible built-ins plus the user's custom feeds. */
export const getDisplaySources = (custom: NewsSource[]): NewsSource[] =>
  [...NEWS_SOURCES.filter(s => !s.hidden), ...custom];

/**
 * English financial media RSS (free feeds), used ONLY for indicator scanning.
 * Institutional signals (price targets, tariff game) live mostly in EN media.
 */
export const ENGLISH_FINANCE_SOURCES: NewsSource[] = [
  { id: 'cnbc', name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
  { id: 'marketwatch', name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  { id: 'yahoo-finance', name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex' },
];

/** Fetch one source and return its articles sorted by date (newest first). */
export const fetchNewsSource = async (source: NewsSource): Promise<NewsArticle[]> => {
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
  return fetchedArticles
    .map(article => ({ ...article, sourceName: source.name }))
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
};

/**
 * Fetch all sources in parallel (best-effort: failed sources are skipped),
 * capping each source's contribution and interleaving by recency.
 */
export const fetchAllSources = async (
  sources: NewsSource[],
  perSourceCap: number,
  totalCap: number
): Promise<NewsArticle[]> => {
  const results = await Promise.allSettled(sources.map(s => fetchNewsSource(s)));
  const merged = results
    .filter((r): r is PromiseFulfilledResult<NewsArticle[]> => r.status === 'fulfilled')
    .flatMap(r => r.value.slice(0, perSourceCap));
  if (merged.length === 0) throw new Error('All sources failed');
  merged.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return merged.slice(0, totalCap);
};
