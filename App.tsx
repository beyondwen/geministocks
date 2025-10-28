import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { useUser, useAuth, SignedIn, SignedOut } from "@clerk/clerk-react";
import { v4 as uuidv4 } from 'uuid';

import type { AnalysisReport, TopicHistoryEntry, StockAnalysisReport, StockHistoryEntry, PositionalWarfareReport, PositionalWarfareHistoryEntry } from './types';
import type { AnalysisModel } from './api/analyze';
import { getCaseStudyData } from './services/caseStudyData';
import { SyncService } from './services/syncService';

import AnalysisInput from './components/AnalysisInput';
import AnalysisResult from './components/AnalysisResult';
import StockAnalysisInput from './components/StockAnalysisInput';
import StockAnalysisResult from './components/StockAnalysisResult';
import Loader from './components/Loader';
import AdSenseAd from './components/AdSenseAd';
import AnalysisHistory from './components/AnalysisHistory';
import HotStocks from './components/HotStocks';
import { NewspaperIcon, SparklesIcon, ChartBarIcon, DocumentTextIcon, SwordsIcon, XIcon, CloudIcon } from './components/icons/Icons';
import AboutPage from './components/AboutPage';
import PositionalWarfareInput from './components/PositionalWarfareInput';
import PositionalWarfareResult from './components/PositionalWarfareResult';
import InvestmentRiskModal from './components/InvestmentRiskModal';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useI18n } from './hooks/useI18n';
import CaseStudyCard from './components/CaseStudyCard';
import PaymentModal from './components/PaymentModal';
import { AuthButton } from './components/AuthButton';
import { MigrationModal } from './components/MigrationModal';

// --- Constants ---
const TOPIC_HISTORY_STORAGE_KEY = 'gemini-analysis-history';
const STOCK_HISTORY_STORAGE_KEY = 'gemini-stock-analysis-history';
const POSITIONAL_WARFARE_HISTORY_STORAGE_KEY = 'gemini-positional-warfare-history';
const USER_ANALYSIS_COUNT_KEY = 'gemini-user-analysis-count';
const RISK_WARNING_ACCEPTED_KEY = 'gemini-risk-warning-accepted';
const CASE_STUDY_CLOSED_KEY = 'gemini-case-study-closed';
const CREDITS_KEY = 'gemini-claude-credits';
const MIGRATED_TO_CLOUD_KEY = 'migrated-to-cloud';

const DEEPSEEK_CREDIT_COST = 1;
const GEMINI_CREDIT_COST = 1;
const CLAUDE_CREDIT_COST = 2;

const Toast: React.FC<{ message: string; type: 'success' | 'info' }> = ({ message, type }) => {
  const toastConfig = {
    success: { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, borderColor: 'border-green-400/80', iconBg: 'bg-green-100/80', iconColor: 'text-green-600',},
    info: { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>, borderColor: 'border-blue-400/80', iconBg: 'bg-blue-100/80', iconColor: 'text-blue-600',},
  };
  const config = toastConfig[type];
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <div className={`flex items-center gap-x-2.5 max-w-sm px-4 py-2.5 rounded-2xl border-l-4 shadow-floating bg-white/80 backdrop-blur-lg animate-toast-in ${config.borderColor}`} role="alert">
        <div className={`flex-shrink-0 rounded-full p-1 ${config.iconBg} ${config.iconColor}`}>{config.icon}</div>
        <div className="text-sm font-medium text-slate-800">{message}</div>
      </div>
    </div>
  );
};

const RadarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 8a4 4 0 100 8 4 4 0 000-8z" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 3v2" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12h-2" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 21v-2" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 12h2" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 12L7 7" className="radar-sweep" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
);

type TabButtonProps = { isActive: boolean; onClick: () => void; children: React.ReactNode; };
const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, children }) => (
  <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-x-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${ isActive ? 'bg-white shadow-md text-slate-800' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'}`} role="tab" aria-selected={isActive}>{children}</button>
);

type PendingAnalysis = { type: 'topic' | 'stock' | 'positional'; query: string };

// The main application content
const MainPage: React.FC = () => {
  const { t, locale } = useI18n();
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  
  const syncService = useMemo(() => new SyncService('', getToken), [getToken]);

  // States
  const [userInput, setUserInput] = useState<string>('');
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [topicHistory, setTopicHistory] = useState<TopicHistoryEntry[]>([]);
  
  const [stockQuery, setStockQuery] = useState<string>('');
  const [stockAnalysisReport, setStockAnalysisReport] = useState<StockAnalysisReport | null>(null);
  const [isStockLoading, setIsStockLoading] = useState<boolean>(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [hotStocks, setHotStocks] = useState<{name: string; ticker: string}[]>([]);
  const [isHotStocksLoading, setIsHotStocksLoading] = useState<boolean>(true);
  const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([]);

  const [leaderStockQuery, setLeaderStockQuery] = useState<string>('');
  const [positionalWarfareReport, setPositionalWarfareReport] = useState<PositionalWarfareReport | null>(null);
  const [isPositionalWarfareLoading, setIsPositionalWarfareLoading] = useState<boolean>(false);
  const [positionalWarfareError, setPositionalWarfareError] = useState<string | null>(null);
  const [positionalWarfareProgress, setPositionalWarfareProgress] = useState<string>('');
  const [positionalWarfareHistory, setPositionalWarfareHistory] = useState<PositionalWarfareHistoryEntry[]>([]);

  const [activeTab, setActiveTab] = useState<'topic' | 'stock' | 'positional'>('topic');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [userAnalysisCount, setUserAnalysisCount] = useState<number>(0);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [activeModel, setActiveModel] = useState<AnalysisModel>('deepseek');
  const [isCaseStudyVisible, setIsCaseStudyVisible] = useState(true);

  const [credits, setCredits] = useState<number>(0);
  const [dailyFreeUsed, setDailyFreeUsed] = useState<number>(0);
  const [dailyFreeTotal, setDailyFreeTotal] = useState<number>(5);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<PendingAnalysis | null>(null);
  const [redemptionCode, setRedemptionCode] = useState('');
  
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Centralized data loading effect
  useEffect(() => {
    const loadData = async () => {
      // Common logic for both states
      const hasAcceptedRisk = localStorage.getItem(RISK_WARNING_ACCEPTED_KEY) === 'true';
      if (!hasAcceptedRisk) setIsRiskModalOpen(true);

      const isCaseStudyClosed = localStorage.getItem(CASE_STUDY_CLOSED_KEY) === 'true';
      if (isCaseStudyClosed) setIsCaseStudyVisible(false);

      if (isSignedIn) {
        // --- LOGGED-IN USER ---
        try {
          // Fetch profile to check for migration status
          const profile = await syncService.getProfile();
          const hasMigrated = localStorage.getItem(MIGRATED_TO_CLOUD_KEY) === 'true';

          if (!profile.migratedFromLocal && !hasMigrated) {
            const localCredits = parseInt(localStorage.getItem(CREDITS_KEY) || '0', 10);
            const localTopicHistory = JSON.parse(localStorage.getItem(TOPIC_HISTORY_STORAGE_KEY) || '[]');
            const localStockHistory = JSON.parse(localStorage.getItem(STOCK_HISTORY_STORAGE_KEY) || '[]');
            const localPositionalHistory = JSON.parse(localStorage.getItem(POSITIONAL_WARFARE_HISTORY_STORAGE_KEY) || '[]');
            if (localCredits > 0 || localTopicHistory.length > 0 || localStockHistory.length > 0 || localPositionalHistory.length > 0) {
              setIsMigrationModalOpen(true);
            }
          }
          
          setUserAnalysisCount(profile.totalAnalysesCount);
          
          // Fetch credits and history
          const creditsData = await syncService.getCredits();
          setCredits(creditsData.balance);
          setDailyFreeUsed(creditsData.dailyFreeUsed);
          setDailyFreeTotal(creditsData.dailyFreeCredits);
          if (creditsData.awarded > 0) {
            setToast({ message: t('toasts.dailyCreditsAwarded', { count: creditsData.awarded }), type: 'success' });
          }

          // Fetch all histories in parallel
          const [topicRes, stockRes, positionalRes] = await Promise.all([
            syncService.getHistory('topic'),
            syncService.getHistory('stock'),
            syncService.getHistory('positional_warfare')
          ]);
          setTopicHistory(topicRes.items.map(item => ({ id: item.id, topic: item.inputQuery, report: item.result })));
          setStockHistory(stockRes.items.map(item => ({ id: item.id, query: item.inputQuery, report: item.result })));
          setPositionalWarfareHistory(positionalRes.items.map(item => ({ id: item.id, leaderStockQuery: item.inputQuery, report: item.result })));

        } catch (err) {
          console.error("Failed to load cloud data:", err);
          setToast({ message: 'Failed to load cloud data.', type: 'info' });
        }
      } else {
        // --- LOGGED-OUT USER ---
        try {
          const localCredits = parseInt(localStorage.getItem(CREDITS_KEY) || '0', 10);
          setCredits(localCredits);
          setDailyFreeUsed(0); // Cannot track daily for local
          setDailyFreeTotal(0);

          const storedTopicHistory = localStorage.getItem(TOPIC_HISTORY_STORAGE_KEY);
          if (storedTopicHistory) setTopicHistory(JSON.parse(storedTopicHistory));

          const storedStockHistory = localStorage.getItem(STOCK_HISTORY_STORAGE_KEY);
          if (storedStockHistory) setStockHistory(JSON.parse(storedStockHistory));

          const storedPositionalWarfareHistory = localStorage.getItem(POSITIONAL_WARFARE_HISTORY_STORAGE_KEY);
          if (storedPositionalWarfareHistory) setPositionalWarfareHistory(JSON.parse(storedPositionalWarfareHistory));
          
          const storedUserCount = localStorage.getItem(USER_ANALYSIS_COUNT_KEY);
          if (storedUserCount) setUserAnalysisCount(JSON.parse(storedUserCount));
        } catch (err) {
          console.error("Failed to load from localStorage", err);
        }
      }
    };
    if (isLoaded) { // Only load data once Clerk is ready
      loadData();
    }
  }, [isSignedIn, isLoaded, syncService, t]);


  // Fetch hot stocks
  useEffect(() => {
    const fetchHotStocks = async () => {
      setIsHotStocksLoading(true);
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'hot_stocks', model: activeModel, locale })
        });
        if (!response.ok) throw new Error('Failed to fetch hot stocks');
        const data = await response.json();
        setHotStocks(data.stocks);
      } catch (err) {
        console.error("Failed to fetch hot stocks:", err);
      } finally {
        setIsHotStocksLoading(false);
      }
    };
    fetchHotStocks();
  }, [activeModel, locale]);

  // SEO
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en-US';
    document.title = t('meta.title');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', t('meta.ogTitle'));
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', t('meta.ogDescription'));
  }, [locale, t]);

  const { cost, isPaywalled } = useMemo(() => {
    let calculatedCost = activeModel === 'claude' ? CLAUDE_CREDIT_COST : activeModel === 'gemini' ? GEMINI_CREDIT_COST : DEEPSEEK_CREDIT_COST;
    const dailyFreeRemaining = dailyFreeTotal - dailyFreeUsed;

    if (isSignedIn && dailyFreeRemaining > 0) {
      return { cost: 0, isPaywalled: false };
    }
    
    const hasEnoughCredits = credits >= calculatedCost;
    return { cost: calculatedCost, isPaywalled: !hasEnoughCredits };
  }, [activeModel, credits, isSignedIn, dailyFreeUsed, dailyFreeTotal]);

  const getModelLabel = useCallback((model: AnalysisModel) => {
    const modelCost = model === 'claude' ? CLAUDE_CREDIT_COST : model === 'gemini' ? GEMINI_CREDIT_COST : DEEPSEEK_CREDIT_COST;
    const dailyFreeRemaining = dailyFreeTotal - dailyFreeUsed;
    const actualCost = (isSignedIn && dailyFreeRemaining > 0) ? 0 : modelCost;
    const modelName = t(`controls.${model}`);
    return `${modelName} (${t('controls.costPerUse', {count: actualCost})})`;
  }, [t, isSignedIn, dailyFreeTotal, dailyFreeUsed]);

  // --- ANALYSIS HANDLERS ---
  const handleAnalyze = useCallback(async (topic: string, bypassCreditCheck = false) => {
    if (!topic.trim()) { setError(t('errors.emptyTopic')); return; }
    if (isPaywalled && !bypassCreditCheck) { setPendingAnalysis({ type: 'topic', query: topic }); setIsPaymentModalOpen(true); return; }
    
    setActiveTab('topic'); setIsLoading(true); setError(null); setAnalysisReport(null); setStockAnalysisReport(null); setPositionalWarfareReport(null);
    const startTime = Date.now();
    try {
        let usedDaily = false;
        if (isSignedIn && cost > 0) {
            const res = await syncService.useCredits(cost, activeModel);
            setCredits(res.newBalance);
            usedDaily = res.usedDailyFree;
        } else if (isSignedIn && cost === 0) {
            const res = await syncService.useCredits(1, activeModel, undefined, true); // Use 1 daily credit
            setDailyFreeUsed(res.newDailyFreeUsed);
            usedDaily = true;
        } else {
            setCredits(prev => prev - cost);
            localStorage.setItem(CREDITS_KEY, String(credits - cost));
        }

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getToken()}` },
            body: JSON.stringify({ type: 'topic', query: topic, model: activeModel, locale })
        });
        if (!response.ok) throw new Error((await response.json()).error);
        const report: AnalysisReport = (await response.json()).report;
        
        setAnalysisReport(report);
        const executionTimeMs = Date.now() - startTime;

        if (isSignedIn) {
            const savedAnalysis = await syncService.saveAnalysis({ analysisType: 'topic', inputQuery: topic, model: activeModel, creditCost: usedDaily ? 0 : cost, result: report, executionTimeMs });
            const newEntry: TopicHistoryEntry = { id: savedAnalysis.id, topic, report };
            setTopicHistory(prev => [newEntry, ...prev]);
            setUserAnalysisCount(prev => prev + 1);
        } else {
            const newEntry: TopicHistoryEntry = { id: Date.now(), topic, report };
            const newHistory = [newEntry, ...topicHistory].slice(0, 20);
            setTopicHistory(newHistory);
            localStorage.setItem(TOPIC_HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
            setUserAnalysisCount(prev => { const n = prev + 1; localStorage.setItem(USER_ANALYSIS_COUNT_KEY, String(n)); return n; });
        }
    } catch (err) {
        console.error(err);
        if (isSignedIn) await syncService.refundLastTx(); // Attempt to refund
        const errorMessage = err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError');
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  }, [activeModel, locale, t, cost, isPaywalled, credits, topicHistory, syncService, getToken, isSignedIn]);

  // Other analysis handlers (stock, positional) would follow a similar refactored pattern...
  const handleStockAnalyze = useCallback(async (query: string, bypassCreditCheck = false) => {
    if (!query.trim()) { setStockError(t('errors.emptyStock')); return; }
    if (isPaywalled && !bypassCreditCheck) { setPendingAnalysis({ type: 'stock', query }); setIsPaymentModalOpen(true); return; }

    setActiveTab('stock'); setIsStockLoading(true); setStockError(null); setStockAnalysisReport(null); setAnalysisReport(null); setPositionalWarfareReport(null);
    const startTime = Date.now();
    try {
        let usedDaily = false;
        if (isSignedIn) {
            const res = await syncService.useCredits(cost > 0 ? cost : 1, activeModel, undefined, cost === 0);
            if(cost > 0) setCredits(res.newBalance);
            else setDailyFreeUsed(res.newDailyFreeUsed);
            usedDaily = res.usedDailyFree;
        } else {
            setCredits(prev => prev - cost);
            localStorage.setItem(CREDITS_KEY, String(credits - cost));
        }

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getToken()}` },
            body: JSON.stringify({ type: 'stock', query, model: activeModel, locale })
        });
        if (!response.ok) throw new Error((await response.json()).error);
        const report: StockAnalysisReport = (await response.json()).report;
        
        setStockAnalysisReport(report);
        const executionTimeMs = Date.now() - startTime;

        if (isSignedIn) {
            const savedAnalysis = await syncService.saveAnalysis({ analysisType: 'stock', inputQuery: query, model: activeModel, creditCost: usedDaily ? 0 : cost, result: report, executionTimeMs });
            const newEntry: StockHistoryEntry = { id: savedAnalysis.id, query, report };
            setStockHistory(prev => [newEntry, ...prev]);
            setUserAnalysisCount(prev => prev + 1);
        } else {
            const newEntry: StockHistoryEntry = { id: Date.now(), query, report };
            const newHistory = [newEntry, ...stockHistory].slice(0, 20);
            setStockHistory(newHistory);
            localStorage.setItem(STOCK_HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
            setUserAnalysisCount(prev => { const n = prev + 1; localStorage.setItem(USER_ANALYSIS_COUNT_KEY, String(n)); return n; });
        }
    } catch (err) {
        console.error(err);
        if (isSignedIn) await syncService.refundLastTx();
        const errorMessage = err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError');
        setStockError(errorMessage);
    } finally {
        setIsStockLoading(false);
    }
}, [activeModel, locale, t, cost, isPaywalled, credits, stockHistory, syncService, getToken, isSignedIn]);

const handlePositionalWarfareAnalyze = useCallback(async (query: string, bypassCreditCheck = false) => {
    if (!query.trim()) { setPositionalWarfareError(t('errors.emptyLeaderStock')); return; }
    if (isPaywalled && !bypassCreditCheck) { setPendingAnalysis({ type: 'positional', query }); setIsPaymentModalOpen(true); return; }

    setActiveTab('positional'); setIsPositionalWarfareLoading(true); setPositionalWarfareError(null); setPositionalWarfareReport(null); setAnalysisReport(null); setStockAnalysisReport(null);
    const startTime = Date.now();
    try {
        let usedDaily = false;
        if (isSignedIn) {
            const res = await syncService.useCredits(cost > 0 ? cost : 1, activeModel, undefined, cost === 0);
            if(cost > 0) setCredits(res.newBalance);
            else setDailyFreeUsed(res.newDailyFreeUsed);
            usedDaily = res.usedDailyFree;
        } else {
            setCredits(prev => prev - cost);
            localStorage.setItem(CREDITS_KEY, String(credits - cost));
        }

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getToken()}` },
            body: JSON.stringify({ type: 'positional', query, model: activeModel, locale })
        });

        if (!response.ok) throw new Error((await response.json()).error);
        const report: PositionalWarfareReport = (await response.json()).report;
        
        setPositionalWarfareReport(report);
        const executionTimeMs = Date.now() - startTime;

        if (isSignedIn) {
            const savedAnalysis = await syncService.saveAnalysis({ analysisType: 'positional_warfare', inputQuery: query, model: activeModel, creditCost: usedDaily ? 0 : cost, result: report, executionTimeMs });
            const newEntry: PositionalWarfareHistoryEntry = { id: savedAnalysis.id, leaderStockQuery: query, report };
            setPositionalWarfareHistory(prev => [newEntry, ...prev]);
            setUserAnalysisCount(prev => prev + 1);
        } else {
            const newEntry: PositionalWarfareHistoryEntry = { id: Date.now(), leaderStockQuery: query, report };
            const newHistory = [newEntry, ...positionalWarfareHistory].slice(0, 20);
            setPositionalWarfareHistory(newHistory);
            localStorage.setItem(POSITIONAL_WARFARE_HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
            setUserAnalysisCount(prev => { const n = prev + 1; localStorage.setItem(USER_ANALYSIS_COUNT_KEY, String(n)); return n; });
        }
    } catch (err) {
        console.error(err);
        if (isSignedIn) await syncService.refundLastTx();
        const errorMessage = err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError');
        setPositionalWarfareError(errorMessage);
    } finally {
        setIsPositionalWarfareLoading(false);
        setPositionalWarfareProgress('');
    }
}, [activeModel, locale, t, cost, isPaywalled, credits, positionalWarfareHistory, syncService, getToken, isSignedIn]);

  // --- UI/OTHER HANDLERS ---
  const handlePaymentSuccess = (creditsPurchased: number) => {
    const newTotal = credits + creditsPurchased;
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

  const handleMigrationComplete = () => {
      setIsMigrationModalOpen(false);
      // Reload all data from the server
      window.location.reload();
  };
  
  const handleNewsSelect = (newsTopic: string) => { setUserInput(newsTopic); window.scrollTo({ top: 0, behavior: 'smooth' }); handleAnalyze(newsTopic); };
  const handleHotStockSelect = (query: string) => { setStockQuery(query); handleStockAnalyze(query); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleModelChange = (newModel: AnalysisModel) => { setActiveModel(newModel); setToast({ message: t('controls.modelSwitched'), type: 'info' }); };
  const handleAcceptRisk = () => { setIsRiskModalOpen(false); try { localStorage.setItem(RISK_WARNING_ACCEPTED_KEY, 'true'); } catch (err) { console.error("Failed to save to localStorage", err); } };
  const handleCloseCaseStudy = () => { setIsCaseStudyVisible(false); try { localStorage.setItem(CASE_STUDY_CLOSED_KEY, 'true'); } catch (err) { console.error("Failed to save to localStorage", err); } };
  
  const handleSelectCaseStudy = useCallback(() => {
    const caseStudy = getCaseStudyData(locale);
    setUserInput(caseStudy.topic);
    setAnalysisReport(caseStudy.report);
    setStockAnalysisReport(null);
    setPositionalWarfareReport(null);
    setError(null); setStockError(null); setPositionalWarfareError(null);
    setIsLoading(false);
    setActiveTab('topic');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [locale]);
  
  const clearAllOutputs = () => {
      setAnalysisReport(null);
      setStockAnalysisReport(null);
      setPositionalWarfareReport(null);
  };

  const handleSelectTopicHistory = (id: number) => { const entry = topicHistory.find((e) => e.id === id); if (!entry) return; setUserInput(entry.topic); setAnalysisReport(entry.report); clearAllOutputs(); setAnalysisReport(entry.report); setActiveTab('topic'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleSelectStockHistory = (id: number) => { const entry = stockHistory.find((e) => e.id === id); if (!entry) return; setStockQuery(entry.query); setStockAnalysisReport(entry.report); clearAllOutputs(); setStockAnalysisReport(entry.report); setActiveTab('stock'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleSelectPositionalWarfareHistory = (id: number) => { const entry = positionalWarfareHistory.find((e) => e.id === id); if (!entry) return; setLeaderStockQuery(entry.leaderStockQuery); setPositionalWarfareReport(entry.report); clearAllOutputs(); setPositionalWarfareReport(entry.report); setActiveTab('positional'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleDeleteHistory = async (id: number, type: 'topic' | 'stock' | 'positional_warfare') => {
      if (isSignedIn) {
          await syncService.deleteAnalysis(id);
      } else {
          // localStorage logic
          if (type === 'topic') localStorage.setItem(TOPIC_HISTORY_STORAGE_KEY, JSON.stringify(topicHistory.filter(h => h.id !== id)));
          if (type === 'stock') localStorage.setItem(STOCK_HISTORY_STORAGE_KEY, JSON.stringify(stockHistory.filter(h => h.id !== id)));
          if (type === 'positional_warfare') localStorage.setItem(POSITIONAL_WARFARE_HISTORY_STORAGE_KEY, JSON.stringify(positionalWarfareHistory.filter(h => h.id !== id)));
      }
      // Update state
      if (type === 'topic') setTopicHistory(prev => prev.filter(h => h.id !== id));
      if (type === 'stock') setStockHistory(prev => prev.filter(h => h.id !== id));
      if (type === 'positional_warfare') setPositionalWarfareHistory(prev => prev.filter(h => h.id !== id));
  };
  
  const handleClearHistory = async (type: 'topic' | 'stock' | 'positional_warfare') => {
    // This is a destructive action, might need a confirmation modal in the future
    const idsToClear = (type === 'topic' ? topicHistory : type === 'stock' ? stockHistory : positionalWarfareHistory).map(h => h.id);
    if(isSignedIn) {
        await Promise.all(idsToClear.map(id => syncService.deleteAnalysis(id)));
    } else {
        if (type === 'topic') localStorage.removeItem(TOPIC_HISTORY_STORAGE_KEY);
        if (type === 'stock') localStorage.removeItem(STOCK_HISTORY_STORAGE_KEY);
        if (type === 'positional_warfare') localStorage.removeItem(POSITIONAL_WARFARE_HISTORY_STORAGE_KEY);
    }
    if (type === 'topic') setTopicHistory([]);
    if (type === 'stock') setStockHistory([]);
    if (type === 'positional_warfare') setPositionalWarfareHistory([]);
  };

  const showLatestNews = locale === 'zh';
  const gridShouldBeTwoColumns = isCaseStudyVisible && showLatestNews;

  return (
    <>
      {isRiskModalOpen && <InvestmentRiskModal onAccept={handleAcceptRisk} />}
      {isMigrationModalOpen && <MigrationModal onComplete={handleMigrationComplete} onSkip={() => setIsMigrationModalOpen(false)} />}
      <PaymentModal isOpen={isPaymentModalOpen} onClose={() => { setIsPaymentModalOpen(false); setPendingAnalysis(null); }} onPaymentSuccess={handlePaymentSuccess} />
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      <div className="min-h-screen font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto">
          <header className="mb-12">
            <div className="flex justify-between items-center mb-8">
                <div /> 
                <AuthButton />
            </div>
            <div className="text-center">
                <div className="flex justify-center items-center gap-x-4 mb-4">
                  <h1 className="text-5xl sm:text-6xl font-extralight text-gradient-primary">{t('header.title')}</h1>
                  <RadarIcon className="w-12 h-12 text-blue-500" />
                </div>
                <p className="text-slate-600 text-lg">{t('header.subtitle')}</p>
                <p className="text-sm text-slate-500 mt-2">{t('header.markets')}</p>
            </div>
          </header>
          
          <main>
            {/* --- Analysis Controls --- */}
            <div className="mb-8 -mt-4 flex flex-col sm:flex-row justify-center items-center gap-x-6 gap-y-4 flex-wrap">
              <div className="flex items-center gap-x-2 text-sm font-medium text-slate-700"><span>{t('stats.userAnalysisCount')}:</span><span className="font-bold text-base text-slate-800">{userAnalysisCount}</span></div>
              <div className="h-4 w-px bg-slate-200/80 hidden sm:block"></div>
              <div className="flex items-center gap-x-3">
                <label htmlFor="model-switcher" className="text-sm font-medium text-slate-700">{t('controls.model')}:</label>
                <div className="relative">
                    <select id="model-switcher" value={activeModel} onChange={(e) => handleModelChange(e.target.value as AnalysisModel)} className="appearance-none bg-white/60 border border-slate-200/60 rounded-full pl-4 pr-10 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors cursor-pointer">
                        <option value="deepseek">{getModelLabel('deepseek')}</option>
                        <option value="gemini">{getModelLabel('gemini')}</option>
                        <option value="claude">{getModelLabel('claude')}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-700"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg></div>
                </div>
              </div>
              <div className="h-4 w-px bg-slate-200/80 hidden sm:block"></div>
              <div className="text-sm font-medium text-slate-700 flex items-center gap-x-2">
                  <span>{t('controls.credits', { count: credits })}</span>
                  <button onClick={() => setIsPaymentModalOpen(true)} className="text-purple-600 hover:text-purple-800 text-xs font-bold">({t('controls.addCredits')})</button>
              </div>
            </div>

            <SignedOut>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-center">
                    <p className="text-blue-800 text-sm">💡 提示：登录后您的分析记录和信用点将安全保存在云端，支持多设备同步。</p>
                </div>
            </SignedOut>
            <SignedIn>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-center">
                    <p className="text-green-800 text-sm flex items-center justify-center gap-2"><CloudIcon className="w-5 h-5"/> ✓ 您已登录，数据将自动同步到云端。</p>
                </div>
            </SignedIn>
            
            <div className="mb-8" role="tablist" aria-label="分析模式">
              <div className="glass-refined p-2 flex justify-center items-center gap-x-2 max-w-md mx-auto">
                <TabButton isActive={activeTab === 'topic'} onClick={() => setActiveTab('topic')}><DocumentTextIcon className="w-5 h-5" /><span>{t('tabs.topic')}</span></TabButton>
                <TabButton isActive={activeTab === 'stock'} onClick={() => setActiveTab('stock')}><ChartBarIcon className="w-5 h-5" /><span>{t('tabs.stock')}</span></TabButton>
                <TabButton isActive={activeTab === 'positional'} onClick={() => setActiveTab('positional')}><SwordsIcon className="w-5 h-5" /><span>{t('tabs.positional')}</span></TabButton>
              </div>
            </div>

            <div className="space-y-8">
                {activeTab === 'topic' && (
                    <div className="space-y-8 animate-fade-in" role="tabpanel">
                        <AnalysisInput userInput={userInput} setUserInput={setUserInput} onAnalyze={() => handleAnalyze(userInput)} isLoading={isLoading} isPaywalled={isPaywalled} cost={cost} />
                        {isLoading && <Loader />}
                        {error && <div role="alert" className="glass-refined bg-red-50/80 border-2 border-red-200 text-red-700 px-6 py-4 text-center"><p className="font-semibold">{t('errors.title')}</p><p className="text-sm mt-1">{error}</p></div>}
                        {analysisReport && !isLoading && <AnalysisResult report={analysisReport} userInput={userInput} />}
                        <AnalysisHistory history={topicHistory.map(h => ({ id: h.id, text: h.topic }))} onSelect={handleSelectTopicHistory} onDelete={(id) => handleDeleteHistory(id, 'topic')} onClear={() => handleClearHistory('topic')} />
                        <div className={`grid grid-cols-1 ${gridShouldBeTwoColumns ? 'lg:grid-cols-2' : ''} gap-8 items-start`}>
                          {isCaseStudyVisible && <CaseStudyCard onSelect={handleSelectCaseStudy} onClose={handleCloseCaseStudy} />}
                          {/* {showLatestNews && <LatestNews onAnalyze={handleNewsSelect} sources={NEWS_SOURCES} />} */}
                        </div>
                        <AdSenseAd />
                    </div>
                )}
                {activeTab === 'stock' && (
                    <div className="space-y-8 animate-fade-in" role="tabpanel">
                        <StockAnalysisInput stockQuery={stockQuery} setStockQuery={setStockQuery} onAnalyze={handleStockAnalyze} isLoading={isStockLoading} suggestions={hotStocks} isPaywalled={isPaywalled} cost={cost} />
                        <HotStocks onSelect={handleHotStockSelect} stocks={hotStocks} isLoading={isHotStocksLoading} />
                        {isStockLoading && <Loader />}
                        {stockError && <div role="alert" className="glass-refined bg-red-50/80 border-2 border-red-200 text-red-700 px-6 py-4 text-center"><p className="font-semibold">{t('errors.title')}</p><p className="text-sm mt-1">{stockError}</p></div>}
                        {stockAnalysisReport && !isStockLoading && <StockAnalysisResult report={stockAnalysisReport} />}
                        <AnalysisHistory history={stockHistory.map(h => ({ id: h.id, text: h.query }))} onSelect={handleSelectStockHistory} onDelete={(id) => handleDeleteHistory(id, 'stock')} onClear={() => handleClearHistory('stock')} />
                        <AdSenseAd />
                    </div>
                )}
                {activeTab === 'positional' && (
                    <div className="space-y-8 animate-fade-in" role="tabpanel">
                        <PositionalWarfareInput leaderStockQuery={leaderStockQuery} setLeaderStockQuery={setLeaderStockQuery} onAnalyze={() => handlePositionalWarfareAnalyze(leaderStockQuery)} isLoading={isPositionalWarfareLoading} isPaywalled={isPaywalled} cost={cost} />
                        {isPositionalWarfareLoading && <Loader progressMessage={positionalWarfareProgress} />}
                        {positionalWarfareError && <div role="alert" className="glass-refined bg-red-50/80 border-2 border-red-200 text-red-700 px-6 py-4 text-center"><p className="font-semibold">{t('errors.title')}</p><p className="text-sm mt-1">{positionalWarfareError}</p></div>}
                        {positionalWarfareReport && !isPositionalWarfareLoading && <PositionalWarfareResult report={positionalWarfareReport} />}
                        <AnalysisHistory history={positionalWarfareHistory.map(h => ({ id: h.id, text: h.leaderStockQuery }))} onSelect={handleSelectPositionalWarfareHistory} onDelete={(id) => handleDeleteHistory(id, 'positional_warfare')} onClear={() => handleClearHistory('positional_warfare')} />
                    </div>
                )}
            </div>
          </main>
          
          <footer className="text-center mt-16 py-8 border-t border-slate-200/60 flex flex-col items-center gap-y-6">
            <div className="flex items-center gap-x-2">
              <input type="text" placeholder={t('redeem.placeholder')} value={redemptionCode} onChange={(e) => setRedemptionCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') {/* handleRedeemCode */ } }} className="bg-white/60 border border-slate-200/60 rounded-full pl-4 pr-2 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors w-40" aria-label={t('redeem.placeholder')} />
              <button onClick={() => {/* handleRedeemCode */}} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95">{t('redeem.button')}</button>
            </div>
            <LanguageSwitcher />
            <div className="flex gap-4 items-center">
              <Link to="/about" className="text-sm font-medium text-slate-500 hover:text-purple-600 animated-underline transition-colors">使用说明</Link>
              <p className="text-sm text-slate-500">{t('footer.contact')}<a href="mailto:codes@z.org" className="font-medium text-blue-600 hover:text-purple-600 animated-underline transition-colors">codes@z.org</a></p>
            </div>
            <div className="flex items-center gap-x-2 text-sm text-slate-500">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span>{t('footer.status')}</span>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};

const App: React.FC = () => (
  <HashRouter>
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/about" element={<AboutPage />} />
    </Routes>
  </HashRouter>
);

export default App;