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
}

/** Display news sources (also part of the indicator scan window). */
export const NEWS_SOURCES: NewsSource[] = [
  { id: 'xueqiu', name: '雪球', url: 'https://xueqiu.com/hots/topic/rss' },
  { id: '36kr', name: '36氪', url: 'https://36kr.com/feed' },
  { id: 'geekinsight', name: '极客洞察', url: 'https://api.newshacker.me/rss' },
  { id: 'bloomberg', name: '彭博', url: 'https://bbg.buzzing.cc/feed.xml' },
  { id: 'buzzing', name: 'Buzzing', url: 'https://www.buzzing.cc/feed.xml' },
  { id: 'cnbc', name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
  { id: 'marketwatch', name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
];

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
