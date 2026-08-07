import React, { useState, useEffect } from 'react';
import { useI18n } from '../hooks/useI18n';
import { analyzeMarketSentiment } from '../services/geminiService';
import { isApiConfigured } from '../services/apiConfigService';
import { fetchAllSources, type NewsSource } from '../services/newsService';
import { computeExitPressure, pressureBand, type SentimentScanResult } from '../utils/sentimentUtils';
import { SparklesIcon } from './icons/Icons';

const STORAGE_KEY = 'market-thermometer';

interface StoredState {
  buffettPercentile: number | null;
  scan: SentimentScanResult | null;
}

const loadStored = (): StoredState => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      buffettPercentile: typeof raw.buffettPercentile === 'number' ? raw.buffettPercentile : null,
      scan: raw.scan && typeof raw.scan.newsScore === 'number' ? raw.scan : null,
    };
  } catch {
    return { buffettPercentile: null, scan: null };
  }
};

const saveStored = (state: StoredState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* best-effort */ }
};

const BAND_STYLES: Record<string, { text: string; bg: string }> = {
  calm: { text: 'text-emerald-700', bg: 'bg-emerald-500' },
  elevated: { text: 'text-amber-700', bg: 'bg-amber-500' },
  high: { text: 'text-orange-700', bg: 'bg-orange-500' },
  extreme: { text: 'text-red-700', bg: 'bg-red-600' },
};

const SIGNAL_KEYS = ['targetPriceRaises', 'consensusBullish', 'goodNewsFatigue', 'institutionalRetreat', 'externalBlame'] as const;

const MarketThermometer: React.FC<{ sources: NewsSource[] }> = ({ sources }) => {
  const { t, locale } = useI18n();
  const [buffettPercentile, setBuffettPercentile] = useState<number | null>(null);
  const [scan, setScan] = useState<SentimentScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const stored = loadStored();
    setBuffettPercentile(stored.buffettPercentile);
    setScan(stored.scan);
  }, []);

  const handlePercentileChange = (value: number) => {
    setBuffettPercentile(value);
    saveStored({ buffettPercentile: value, scan });
  };

  const handleScan = async () => {
    if (!isApiConfigured()) {
      setScanError(t('thermometer.noApi'));
      return;
    }
    setIsScanning(true);
    setScanError(null);
    try {
      // Wider window than the display feed: up to 6 per source, 24 total
      const articles = await fetchAllSources(sources, 6, 24);
      const result = await analyzeMarketSentiment(
        articles.map(a => ({ title: a.title, description: a.description, sourceName: a.sourceName })),
        locale
      );
      setScan(result);
      saveStored({ buffettPercentile, scan: result });
    } catch (err) {
      console.error('Thermometer scan failed:', err instanceof Error ? err.message : err);
      setScanError(t('thermometer.scanError'));
    } finally {
      setIsScanning(false);
    }
  };

  const score = computeExitPressure(buffettPercentile, scan?.newsScore ?? null);
  const band = pressureBand(score);
  const bandStyle = band ? BAND_STYLES[band] : null;

  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h3 className="text-lg font-bold text-gray-900">{t('thermometer.title')}</h3>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <SparklesIcon className={`w-3.5 h-3.5 ${isScanning ? 'animate-pulse' : ''}`} />
          {isScanning ? t('thermometer.scanning') : scan ? t('thermometer.rescan') : t('thermometer.scanNow')}
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-4">{t('thermometer.subtitle')}</p>

      {scanError && <p className="text-xs text-red-600 mb-3">{scanError}</p>}

      {/* Gauge */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{t('thermometer.exitPressure')}</span>
          {score != null && band ? (
            <span className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${bandStyle?.text}`}>{score}</span>
              <span className={`text-xs font-semibold ${bandStyle?.text}`}>{t(`thermometer.band.${band}`)}</span>
            </span>
          ) : (
            <span className="text-sm text-gray-400">{t('thermometer.noData')}</span>
          )}
        </div>
        <div className="relative h-2.5 rounded-full bg-gradient-to-r from-emerald-200 via-amber-200 to-red-300" role="img" aria-label={t('thermometer.exitPressure')}>
          {score != null && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow ${bandStyle?.bg}`}
              style={{ left: `calc(${score}% - 8px)` }}
            />
          )}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-400">
          <span>{t('thermometer.band.calm')}</span>
          <span>{t('thermometer.band.elevated')}</span>
          <span>{t('thermometer.band.high')}</span>
          <span>{t('thermometer.band.extreme')}</span>
        </div>
      </div>

      {/* Inputs: slow variable + fast variable status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="buffett-percentile" className="text-xs font-semibold text-stone-600">{t('thermometer.buffettLabel')}</label>
            <span className="text-sm font-bold text-gray-900">{buffettPercentile != null ? `P${buffettPercentile}` : '—'}</span>
          </div>
          <input
            id="buffett-percentile"
            type="range"
            min={0}
            max={100}
            step={1}
            value={buffettPercentile ?? 50}
            onChange={e => handlePercentileChange(Number(e.target.value))}
            className="w-full accent-black"
          />
          <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
            {t('thermometer.buffettHint')}{' '}
            <a href="https://www.gurufocus.com/economic_indicators/60/buffett-indicator-total-market-cap-over-gdp" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
              {t('thermometer.buffettLink')}
            </a>
          </p>
        </div>
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-stone-600">{t('thermometer.newsScoreLabel')}</span>
            <span className="text-sm font-bold text-gray-900">{scan ? scan.newsScore : '—'}</span>
          </div>
          {scan ? (
            <p className="text-[10px] text-gray-400 leading-relaxed">
              {t('thermometer.lastScan', {
                count: String(scan.articleCount),
                time: new Date(scan.scannedAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
              })}
            </p>
          ) : (
            <p className="text-[10px] text-gray-400 leading-relaxed">{t('thermometer.notScanned')}</p>
          )}
        </div>
      </div>

      {/* Signals detail */}
      {scan && scan.signals.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs font-medium text-gray-500 hover:text-black transition-colors mb-2"
            aria-expanded={expanded}
          >
            {expanded ? t('thermometer.hideSignals') : t('thermometer.showSignals')}
          </button>
          {expanded && (
            <ul className="space-y-2.5">
              {SIGNAL_KEYS.map(key => {
                const signal = scan.signals.find(s => s.key === key);
                if (!signal) return null;
                return (
                  <li key={key} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-700">{t(`thermometer.signal.${key}`)}</span>
                      <span className="font-bold text-gray-900">{signal.strength}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full ${signal.strength >= 60 ? 'bg-red-500' : signal.strength >= 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${signal.strength}%` }}
                      />
                    </div>
                    <p className="text-gray-500 leading-relaxed">{signal.evidence}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <p className="text-[10px] text-gray-400 mt-4 pt-3 border-t border-stone-100 leading-relaxed">{t('thermometer.disclaimer')}</p>
    </div>
  );
};

export default MarketThermometer;
