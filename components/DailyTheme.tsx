import React from 'react';
import { DiamondIcon, SparklesIcon } from './icons/Icons';

interface DailyThemeProps {
    theme: { title: string; summary: string } | null;
    isLoading: boolean;
    onAnalyze: (topic: string) => void;
}

const DailyTheme: React.FC<DailyThemeProps> = ({ theme, isLoading, onAnalyze }) => {
    if (isLoading) {
        return (
            <div className="bg-white/50 backdrop-blur-sm border-2 border-dashed border-gray-300 rounded-lg p-6 shadow-lg mb-8 animate-pulse">
                <div className="flex items-center mb-3">
                    <div className="w-6 h-6 bg-gray-200 rounded-full mr-2"></div>
                    <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                <div className="h-10 bg-gray-200 rounded w-48 ml-auto"></div>
            </div>
        );
    }

    if (!theme) return null;

    return (
        <div className="bg-white/50 backdrop-blur-sm border-2 border-dashed border-cyan-400 rounded-lg p-6 shadow-lg mb-8 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-800 flex items-center mb-2">
                <DiamondIcon className="w-6 h-6 text-cyan-500 mr-2" />
                今日焦点
            </h2>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">{theme.title}</h3>
            <p className="text-gray-600 italic mb-4">
                {theme.summary}
            </p>
            <div className="flex justify-end">
                <button
                    onClick={() => onAnalyze(`${theme.title}\n\n${theme.summary}`)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all"
                >
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    一键深度分析此主题
                </button>
            </div>
        </div>
    );
};

export default DailyTheme;
