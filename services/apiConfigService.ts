/**
 * 用户自定义 API 配置服务
 * 用户自行填写 OpenAI 兼容的模型调用地址、API Key 和模型名称
 * 配置保存在浏览器 localStorage 中，不会上传到服务器
 */

const API_CONFIG_KEY = 'user-api-config';

export interface UserApiConfig {
  baseUrl: string;   // e.g. https://openrouter.ai/api/v1 or http://localhost:11434/v1
  apiKey: string;    // user's own API key; may be empty for local CLI servers (Ollama, Claude Code proxy, etc.)
  model: string;     // e.g. gpt-4o, deepseek/deepseek-chat-v3.1:free
}

/**
 * 构建请求头：本机 CLI 服务（Ollama、Claude Code 代理等）通常无需 API Key
 */
export function buildAuthHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const key = apiKey?.trim();
  if (key) {
    headers['Authorization'] = `Bearer ${key}`;
  }
  return headers;
}

/**
 * 读取用户 API 配置
 * 注意：apiKey 可为空（本机 CLI 模式无需密钥）
 */
export function getApiConfig(): UserApiConfig | null {
  try {
    const raw = localStorage.getItem(API_CONFIG_KEY);
    if (!raw) return null;
    const config = JSON.parse(raw) as UserApiConfig;
    if (!config.baseUrl || !config.model) return null;
    if (typeof config.apiKey !== 'string') config.apiKey = '';
    return config;
  } catch {
    return null;
  }
}

/**
 * 保存用户 API 配置
 */
export function saveApiConfig(config: UserApiConfig): void {
  // Normalize: strip trailing slash and trailing /chat/completions if user pasted full endpoint
  let baseUrl = config.baseUrl.trim().replace(/\/+$/, '');
  baseUrl = baseUrl.replace(/\/chat\/completions$/, '');
  const normalized: UserApiConfig = {
    baseUrl,
    apiKey: config.apiKey.trim(),
    model: config.model.trim(),
  };
  localStorage.setItem(API_CONFIG_KEY, JSON.stringify(normalized));
}

/**
 * 清除用户 API 配置
 */
export function clearApiConfig(): void {
  try {
    localStorage.removeItem(API_CONFIG_KEY);
  } catch {
    // ignore
  }
}

/**
 * 是否已配置
 */
export function isApiConfigured(): boolean {
  return getApiConfig() !== null;
}

/**
 * 获取 chat/completions 完整端点
 */
export function getChatCompletionsUrl(config: UserApiConfig): string {
  return `${config.baseUrl}/chat/completions`;
}

/**
 * 从用户配置的服务获取可用模型列表（OpenAI 兼容 GET /models 接口）
 * 只需 baseUrl 和 apiKey，无需 model
 */
export async function fetchAvailableModels(
  baseUrl: string,
  apiKey: string
): Promise<{ ok: boolean; models: string[]; message: string }> {
  try {
    const normalizedBase = baseUrl.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
    const response = await fetch(`${normalizedBase}/models`, {
      method: 'GET',
      headers: buildAuthHeaders(apiKey),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, models: [], message: `HTTP ${response.status}: ${errorText.slice(0, 200)}` };
    }

    const data = await response.json();
    // OpenAI-compatible: { data: [{ id: "gpt-4o", ... }, ...] }
    const list: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    const models = list
      .map((m) => (typeof m === 'string' ? m : m?.id))
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .sort((a, b) => a.localeCompare(b));

    if (models.length === 0) {
      return { ok: false, models: [], message: 'Empty model list' };
    }
    return { ok: true, models, message: '' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, models: [], message: msg };
  }
}

/**
 * 测试 API 连接是否可用
 * 返回 { ok, message }
 */
export async function testApiConnection(config: UserApiConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch(getChatCompletionsUrl({ ...config, baseUrl: config.baseUrl.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '') }), {
      method: 'POST',
      headers: {
        ...buildAuthHeaders(config.apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model.trim(),
        messages: [{ role: 'user', content: 'Reply with: ok' }],
        max_tokens: 10,
      }),
    });

    if (response.ok) {
      return { ok: true, message: '' };
    }

    const errorText = await response.text();
    return { ok: false, message: `HTTP ${response.status}: ${errorText.slice(0, 200)}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // "Failed to fetch" usually means CORS or network issue
    return { ok: false, message: msg };
  }
}
