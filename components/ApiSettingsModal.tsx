import React, { useState, useEffect } from 'react';
import { XIcon } from './icons/Icons';
import { useI18n } from '../hooks/useI18n';
import {
  getApiConfig,
  saveApiConfig,
  clearApiConfig,
  testApiConnection,
  fetchAvailableModels,
  UserApiConfig,
} from '../services/apiConfigService';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const PRESETS: { label: string; baseUrl: string; modelPlaceholder: string }[] = [
  { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', modelPlaceholder: 'deepseek/deepseek-chat-v3.1:free' },
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', modelPlaceholder: 'gpt-4o' },
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', modelPlaceholder: 'deepseek-chat' },
];

interface LocalPreset {
  label: string;
  baseUrl: string;
  modelPlaceholder: string;
  hintZh: string;
  hintEn: string;
}

const LOCAL_PRESETS: LocalPreset[] = [
  {
    label: 'Claude Code',
    baseUrl: 'http://localhost:3456/v1',
    modelPlaceholder: 'claude-sonnet-4-5',
    hintZh: '通过 claude-code-router 暴露本机 Claude Code 订阅：npm i -g @musistudio/claude-code-router 后运行 ccr start',
    hintEn: 'Expose your local Claude Code subscription via claude-code-router: npm i -g @musistudio/claude-code-router, then run ccr start',
  },
  {
    label: 'Codex',
    baseUrl: 'http://localhost:1455/v1',
    modelPlaceholder: 'gpt-5-codex',
    hintZh: '通过 codex-proxy 等工具将本机 Codex CLI 暴露为 OpenAI 兼容接口，端口以实际工具为准',
    hintEn: 'Expose your local Codex CLI as an OpenAI-compatible endpoint via tools like codex-proxy; port depends on your tool',
  },
  {
    label: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    modelPlaceholder: 'qwen3:14b',
    hintZh: '安装 Ollama 并拉取模型（如 ollama pull qwen3:14b）。浏览器跨域访问需设置 OLLAMA_ORIGINS="*" 后重启服务',
    hintEn: 'Install Ollama and pull a model (e.g. ollama pull qwen3:14b). For browser access set OLLAMA_ORIGINS="*" and restart the server',
  },
  {
    label: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    modelPlaceholder: 'qwen/qwen3-14b',
    hintZh: '在 LM Studio 中加载模型并启动本地服务器（Developer 标签页），需在设置中开启 CORS',
    hintEn: 'Load a model in LM Studio and start the local server (Developer tab); enable CORS in server settings',
  },
];

const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { locale } = useI18n();
  const zh = locale === 'zh';

  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [mode, setMode] = useState<'cloud' | 'local'>('cloud');
  const [isCustomProvider, setIsCustomProvider] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  // Model list fetching state
  const [modelList, setModelList] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelListError, setModelListError] = useState<string | null>(null);
  const [modelFilter, setModelFilter] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getApiConfig();
      if (config) {
        setBaseUrl(config.baseUrl);
        setApiKey(config.apiKey);
        setModel(config.model);
        // Detect mode: localhost URLs belong to local CLI mode
        const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)[:/]/.test(config.baseUrl);
        setMode(isLocal ? 'local' : 'cloud');
        // Detect custom provider: saved URL doesn't match any preset
        setIsCustomProvider(
          isLocal
            ? !LOCAL_PRESETS.some((p) => p.baseUrl === config.baseUrl)
            : !PRESETS.some((p) => p.baseUrl === config.baseUrl)
        );
      } else {
        setMode('cloud');
        setIsCustomProvider(false);
      }
      setTestResult(null);
      setSaved(false);
      setModelList([]);
      setModelListError(null);
      setModelFilter('');
      setShowModelPicker(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // API Key is optional in local CLI mode (Ollama, Claude Code proxy, etc. usually need no key)
  const isValid = baseUrl.trim() && model.trim() && (mode === 'local' || apiKey.trim());

  const canFetchModels = baseUrl.trim() && (mode === 'local' || apiKey.trim());

  const handleFetchModels = async () => {
    if (!canFetchModels || fetchingModels) return;
    setFetchingModels(true);
    setModelListError(null);
    const result = await fetchAvailableModels(baseUrl, apiKey);
    if (result.ok) {
      setModelList(result.models);
      setShowModelPicker(true);
      setModelFilter('');
    } else {
      setModelList([]);
      setShowModelPicker(false);
      setModelListError(result.message);
    }
    setFetchingModels(false);
  };

  const filteredModels = modelFilter.trim()
    ? modelList.filter((m) => m.toLowerCase().includes(modelFilter.trim().toLowerCase()))
    : modelList;

  const handleSelectModel = (m: string) => {
    setModel(m);
    setShowModelPicker(false);
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!isValid) return;
    setTesting(true);
    setTestResult(null);
    const result = await testApiConnection({ baseUrl, apiKey, model } as UserApiConfig);
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = () => {
    if (!isValid) return;
    saveApiConfig({ baseUrl, apiKey, model } as UserApiConfig);
    setSaved(true);
    onSaved?.();
    setTimeout(() => onClose(), 600);
  };

  const handleClear = () => {
    clearApiConfig();
    setBaseUrl('');
    setApiKey('');
    setModel('');
    setTestResult(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={zh ? '模型 API 设置' : 'Model API Settings'}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {zh ? '模型 API 设置' : 'Model API Settings'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label={zh ? '关闭' : 'Close'}
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-gray-500 leading-relaxed">
            {zh
              ? '支持云端 API（OpenRouter、OpenAI 等）或运行在本机的 CLI 服务（Claude Code、Codex、Ollama 等）。配置仅保存在您的浏览器本地，不会上传到服务器。'
              : 'Use a cloud API (OpenRouter, OpenAI, etc.) or a CLI service running on your machine (Claude Code, Codex, Ollama, etc.). Your config is stored locally in your browser only.'}
          </p>

          {/* Mode switch: Cloud API vs Local CLI */}
          <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50" role="tablist" aria-label={zh ? '连接模式' : 'Connection mode'}>
            {([
              { value: 'cloud' as const, labelZh: '云端 API', labelEn: 'Cloud API' },
              { value: 'local' as const, labelZh: '本机 CLI', labelEn: 'Local CLI' },
            ]).map((m) => (
              <button
                key={m.value}
                role="tab"
                aria-selected={mode === m.value}
                onClick={() => {
                  if (mode === m.value) return;
                  setMode(m.value);
                  setIsCustomProvider(false);
                  setBaseUrl(m.value === 'local' ? LOCAL_PRESETS[0].baseUrl : '');
                  setTestResult(null);
                  setModelList([]);
                  setShowModelPicker(false);
                  setModelListError(null);
                }}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === m.value
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {zh ? m.labelZh : m.labelEn}
              </button>
            ))}
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2" role="group" aria-label={zh ? '选择提供方' : 'Select provider'}>
            {(mode === 'local' ? LOCAL_PRESETS : PRESETS).map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setIsCustomProvider(false);
                  setBaseUrl(p.baseUrl);
                  setTestResult(null);
                  setModelList([]);
                  setShowModelPicker(false);
                  setModelListError(null);
                }}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  !isCustomProvider && baseUrl === p.baseUrl
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => {
                setIsCustomProvider(true);
                setBaseUrl('');
                setTestResult(null);
                setModelList([]);
                setShowModelPicker(false);
                setModelListError(null);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                isCustomProvider
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
              }`}
            >
              {zh ? '自定义' : 'Custom'}
            </button>
          </div>

          {/* Local preset setup hint */}
          {mode === 'local' && !isCustomProvider && (() => {
            const activePreset = LOCAL_PRESETS.find((p) => p.baseUrl === baseUrl);
            return activePreset ? (
              <div className="px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 leading-relaxed -mt-2">
                {zh ? activePreset.hintZh : activePreset.hintEn}
              </div>
            ) : null;
          })()}

          {/* Local custom provider hint */}
          {mode === 'local' && isCustomProvider && (
            <p className="text-xs text-gray-400 -mt-2">
              {zh
                ? '填写本机任意 OpenAI 兼容服务的地址，如 http://localhost:8000/v1。注意本地服务需允许浏览器跨域访问（CORS）。'
                : 'Enter any OpenAI-compatible endpoint on your machine, e.g. http://localhost:8000/v1. The local server must allow browser CORS access.'}
            </p>
          )}

          {/* Cloud custom provider hint */}
          {mode === 'cloud' && isCustomProvider && (
            <p className="text-xs text-gray-400 -mt-2">
              {zh
                ? '填写自建或第三方中转服务的 OpenAI 兼容地址，通常以 /v1 结尾（如 https://your-proxy.com/v1）。'
                : 'Enter the OpenAI-compatible endpoint of your self-hosted or proxy service, usually ending in /v1 (e.g. https://your-proxy.com/v1).'}
            </p>
          )}

          {/* Base URL */}
          <div className="space-y-1.5">
            <label htmlFor="api-base-url" className="block text-sm font-medium text-gray-700">
              {zh ? '调用地址 (Base URL)' : 'Base URL'}
            </label>
            <input
              id="api-base-url"
              type="url"
              value={baseUrl}
              onChange={(e) => {
                const value = e.target.value;
                setBaseUrl(value);
                setTestResult(null);
                // Keep preset highlight in sync when typing manually
                const presets = mode === 'local' ? LOCAL_PRESETS : PRESETS;
                setIsCustomProvider(!presets.some((p) => p.baseUrl === value));
              }}
              placeholder={
                mode === 'local'
                  ? 'http://localhost:11434/v1'
                  : isCustomProvider ? 'https://your-proxy.com/v1' : 'https://openrouter.ai/api/v1'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {/* API Key (optional in local mode) */}
          <div className="space-y-1.5">
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
              API Key {mode === 'local' && <span className="text-xs text-gray-400 font-normal">({zh ? '本机服务通常无需密钥' : 'usually not needed for local CLI'})</span>}
            </label>
            <div className="relative">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                placeholder={mode === 'local' ? (zh ? '（可选）' : '(optional)') : 'sk-...'}
                className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1"
              >
                {showKey ? (zh ? '隐藏' : 'Hide') : (zh ? '显示' : 'Show')}
              </button>
            </div>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="api-model" className="block text-sm font-medium text-gray-700">
                {zh ? '模型名称' : 'Model Name'}
              </label>
              <button
                type="button"
                onClick={handleFetchModels}
                disabled={!canFetchModels || fetchingModels}
                className="text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-500 rounded-full px-3 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {fetchingModels
                  ? (zh ? '获取中…' : 'Fetching…')
                  : (zh ? '获取模型列表' : 'Fetch Models')}
              </button>
            </div>
            <input
              id="api-model"
              type="text"
              value={model}
              onChange={(e) => { setModel(e.target.value); setTestResult(null); }}
              placeholder={
                (mode === 'local' ? LOCAL_PRESETS : PRESETS).find((p) => p.baseUrl === baseUrl)?.modelPlaceholder
                  || (mode === 'local' ? 'qwen3:14b' : 'gpt-4o')
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
            />

            {/* Model list fetch error */}
            {modelListError && (
              <p role="alert" className="text-xs text-red-600">
                {zh ? `获取模型列表失败：${modelListError}` : `Failed to fetch models: ${modelListError}`}
              </p>
            )}

            {/* Model picker */}
            {showModelPicker && modelList.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <input
                    type="text"
                    value={modelFilter}
                    onChange={(e) => setModelFilter(e.target.value)}
                    placeholder={zh ? '搜索模型…' : 'Filter models…'}
                    className="flex-1 px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                    aria-label={zh ? '搜索模型' : 'Filter models'}
                  />
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {zh ? `共 ${filteredModels.length} 个` : `${filteredModels.length} models`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowModelPicker(false)}
                    className="text-xs text-gray-400 hover:text-gray-700"
                    aria-label={zh ? '收起列表' : 'Collapse list'}
                  >
                    {zh ? '收起' : 'Hide'}
                  </button>
                </div>
                <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100" role="listbox" aria-label={zh ? '可用模型' : 'Available models'}>
                  {filteredModels.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-gray-400">
                      {zh ? '没有匹配的模型' : 'No matching models'}
                    </li>
                  ) : (
                    filteredModels.map((m) => (
                      <li key={m}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={m === model}
                          onClick={() => handleSelectModel(m)}
                          className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors ${
                            m === model
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {m}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}

            {/* Re-open picker shortcut when collapsed but list already fetched */}
            {!showModelPicker && modelList.length > 0 && (
              <button
                type="button"
                onClick={() => setShowModelPicker(true)}
                className="text-xs text-gray-500 hover:text-gray-800 animated-underline"
              >
                {zh ? `从已获取的 ${modelList.length} 个模型中选择` : `Choose from ${modelList.length} fetched models`}
              </button>
            )}

            <p className="text-xs text-gray-400">
              {zh
                ? '建议选择支持 JSON 输出的模型，以获得最佳分析效果。'
                : 'Models with JSON output support are recommended for best results.'}
            </p>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              role="status"
              className={`px-4 py-3 rounded-lg text-sm ${
                testResult.ok
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {testResult.ok
                ? (zh ? '连接成功，模型可用！' : 'Connection successful. Model is available!')
                : (zh ? `连接失败：${testResult.message}` : `Connection failed: ${testResult.message}`)}
            </div>
          )}

          {saved && (
            <div role="status" className="px-4 py-3 rounded-lg text-sm bg-green-50 text-green-800 border border-green-200">
              {zh ? '配置已保存' : 'Settings saved'}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={handleClear}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors"
            >
              {zh ? '清除配置' : 'Clear'}
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleTest}
                disabled={!isValid || testing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? (zh ? '测试中…' : 'Testing…') : (zh ? '测试连接' : 'Test Connection')}
              </button>
              <button
                onClick={handleSave}
                disabled={!isValid}
                className="px-5 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {zh ? '保存' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiSettingsModal;
