/**
 * Exa 实时搜索服务
 * 用户自行填写 https://exa.ai 的 API Key 并开启实时搜索后，
 * 在生成分析报告前会先用 Exa REST /search 拉取该主题的最新网络结果，
 * 并将结果注入到 prompt 中作为「已核实的实时数据」。
 *
 * 配置保存在浏览器 localStorage 中，不会上传到服务器。
 * Exa REST 接口支持浏览器跨域（返回 CORS 头），可直接带用户自己的 key 调用，无需代理。
 */

import type { Locale } from '../hooks/useI18n';

const EXA_CONFIG_KEY = 'exa-search-config';
const EXA_SEARCH_URL = 'https://api.exa.ai/search';

export interface ExaSearchConfig {
  apiKey: string;
  enabled: boolean;
}

export interface ExaResult {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  text?: string;
}

/**
 * 读取 Exa 搜索配置
 */
export function getExaConfig(): ExaSearchConfig {
  try {
    const raw = localStorage.getItem(EXA_CONFIG_KEY);
    if (!raw) return { apiKey: '', enabled: false };
    const parsed = JSON.parse(raw) as Partial<ExaSearchConfig>;
    return {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      enabled: !!parsed.enabled,
    };
  } catch {
    return { apiKey: '', enabled: false };
  }
}

/**
 * 保存 Exa 搜索配置
 */
export function saveExaConfig(config: ExaSearchConfig): void {
  const normalized: ExaSearchConfig = {
    apiKey: config.apiKey.trim(),
    // 没有 key 时强制关闭，避免误开
    enabled: config.enabled && !!config.apiKey.trim(),
  };
  localStorage.setItem(EXA_CONFIG_KEY, JSON.stringify(normalized));
}

/**
 * 实时搜索是否已启用（已开启开关且填写了 key）
 */
export function isExaSearchEnabled(): boolean {
  const c = getExaConfig();
  return c.enabled && !!c.apiKey;
}

/**
 * 调用 Exa REST /search 获取最新网络结果
 * @param query 搜索词（通常是用户输入的主题）
 * @param numResults 返回结果数量
 */
export async function searchExa(
  query: string,
  numResults = 6
): Promise<{ ok: boolean; results: ExaResult[]; message: string }> {
  const { apiKey } = getExaConfig();
  if (!apiKey) {
    return { ok: false, results: [], message: 'Exa API key not configured' };
  }

  try {
    const response = await fetch(EXA_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query,
        numResults,
        type: 'auto',
        contents: {
          text: { maxCharacters: 1200 },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, results: [], message: `HTTP ${response.status}: ${errorText.slice(0, 200)}` };
    }

    const data = await response.json();
    const rawResults: any[] = Array.isArray(data?.results) ? data.results : [];
    const results: ExaResult[] = rawResults.map((r) => ({
      title: typeof r?.title === 'string' && r.title ? r.title : r?.url || 'Untitled',
      url: typeof r?.url === 'string' ? r.url : '',
      publishedDate: typeof r?.publishedDate === 'string' ? r.publishedDate : undefined,
      author: typeof r?.author === 'string' ? r.author : undefined,
      text: typeof r?.text === 'string' ? r.text : undefined,
    }));

    return { ok: true, results, message: '' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, results: [], message: msg };
  }
}

/**
 * 测试 Exa 连接是否可用
 */
export async function testExaConnection(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const trimmed = apiKey.trim();
  if (!trimmed) return { ok: false, message: 'empty key' };
  try {
    const response = await fetch(EXA_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': trimmed },
      body: JSON.stringify({ query: 'market news today', numResults: 1, type: 'auto' }),
    });
    if (response.ok) return { ok: true, message: '' };
    const errorText = await response.text();
    return { ok: false, message: `HTTP ${response.status}: ${errorText.slice(0, 200)}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg };
  }
}

/**
 * 将 Exa 结果格式化为可注入 prompt 的文本块
 */
export function formatExaResultsForPrompt(results: ExaResult[], locale: Locale): string {
  if (results.length === 0) return '';

  const header =
    locale === 'zh'
      ? '以下是通过实时网络搜索获取的最新资料（请将其作为已核实的实时数据，优先采纳其中的最新事实、数据与日期；如与你的固有知识冲突，以下述资料为准）：'
      : 'The following are the latest materials retrieved via real-time web search (treat them as verified real-time data and prioritize the latest facts, figures, and dates within; if they conflict with your prior knowledge, defer to the materials below):';

  const blocks = results
    .map((r, i) => {
      const lines: string[] = [`[${i + 1}] ${r.title}`];
      if (r.url) lines.push(`URL: ${r.url}`);
      if (r.publishedDate) lines.push((locale === 'zh' ? '发布日期: ' : 'Published: ') + r.publishedDate);
      if (r.text) lines.push((locale === 'zh' ? '摘要: ' : 'Excerpt: ') + r.text.replace(/\s+/g, ' ').trim());
      return lines.join('\n');
    })
    .join('\n\n');

  return `${header}\n\n${blocks}`;
}
