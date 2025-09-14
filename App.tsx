import React, { useState, useEffect, useCallback } from 'react';
import { getAnalysis } from './services/geminiService';
import type { AnalysisReport, HistoryEntry } from './types';
import AnalysisInput from './components/AnalysisInput';
import AnalysisResult from './components/AnalysisResult';
import Loader from './components/Loader';
import AnalysisHistory from './components/AnalysisHistory';

const HISTORY_STORAGE_KEY = 'gemini-analysis-history';

const App: React.FC = () => {
  const [userInput, setUserInput] = useState<string>('');
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (err) {
      console.error("Failed to load history from localStorage", err);
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
  }, []);

  const updateHistory = (newHistory: HistoryEntry[]) => {
    setHistory(newHistory);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
  };

  const handleAnalyze = useCallback(async () => {
    if (!userInput.trim()) {
      setError('分析主题为必填项。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisReport(null);

    try {
      const report = await getAnalysis(userInput);
      setAnalysisReport(report);

      const newEntry: HistoryEntry = {
        id: Date.now(),
        topic: userInput,
        report: report,
      };
      const newHistory = [newEntry, ...history].slice(0, 20); // Limit history to 20 items
      updateHistory(newHistory);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? `分析失败：${err.message} 😭` : '发生未知错误。🤯');
    } finally {
      setIsLoading(false);
    }
  }, [userInput, history]);

  const handleSelectHistory = (entry: HistoryEntry) => {
    setUserInput(entry.topic);
    setAnalysisReport(entry.report);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistory = (id: number) => {
    const newHistory = history.filter((entry) => entry.id !== id);
    updateHistory(newHistory);
  };

  const handleClearHistory = () => {
    updateHistory([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8 relative">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-cyan-500">
            股市超级挖掘机 📈
          </h1>
          <p className="text-gray-600 mt-2">
            利用 Gemini 2.5 Pro 模型进行多维度投资分析 🚀
          </p>
        </header>

        <main className="space-y-8">
          <AnalysisHistory
            history={history}
            onSelect={handleSelectHistory}
            onDelete={handleDeleteHistory}
            onClear={handleClearHistory}
          />

          <AnalysisInput
            userInput={userInput}
            setUserInput={setUserInput}
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
          />

          {isLoading && <Loader />}

          {error && (
            <div role="alert" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-center">
              <p>{error}</p>
            </div>
          )}

          {analysisReport && <AnalysisResult report={analysisReport} />}
        </main>
        
        <footer className="text-center mt-8 py-4">
          <p className="text-sm text-gray-500">
            由僧僧 GO 开发驱动，欢迎关注“小声读书”公众号
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;