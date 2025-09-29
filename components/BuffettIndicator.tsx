import React, { useState, useEffect } from 'react';
import { getBuffettIndicator } from '../services/geminiService';
import Tooltip from './Tooltip';

const BuffettIndicatorSkeleton: React.FC = () => (
    <div className="animate-pulse flex items-center justify-center gap-x-2 bg-gray-200/80 rounded-lg p-3 w-full max-w-sm mx-auto">
        <div className="h-4 bg-gray-300 rounded w-1/3"></div>
        <div className="h-6 bg-gray-400 rounded w-1/4"></div>
    </div>
);

const BuffettIndicator: React.FC = () => {
    const [indicatorValue, setIndicatorValue] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchIndicator = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await getBuffettIndicator();
                setIndicatorValue(data.indicatorValue);
            } catch (err) {
                console.error("Failed to fetch Buffett Indicator:", err);
                setError("无法加载巴菲特指数");
            } finally {
                setIsLoading(false);
            }
        };

        fetchIndicator();
    }, []);

    if (isLoading) {
        return (
            <div className="mb-6">
                <BuffettIndicatorSkeleton />
            </div>
        );
    }
    
    // Don't render the component at all if there's an error, to avoid clutter.
    if (error || indicatorValue === null) {
        return null; 
    }

    const isHigh = indicatorValue >= 80;
    const colorClass = isHigh ? 'text-red-600' : 'text-green-600';
    const bgClass = isHigh ? 'bg-red-100 border-red-300' : 'bg-green-100 border-green-300';
    const indicatorTip = "巴菲特指数（Buffett Indicator）是衡量股市总市值与国民生产总值（GDP）比率的指标。通常用于评估当前股市估值是否过高或过低。低于80%可能表示低估，高于80%则可能表示高估。";

    return (
        <div className="mb-6">
            <div className={`flex items-center justify-center gap-x-2 text-center p-3 rounded-lg border ${bgClass} shadow-sm w-full max-w-sm mx-auto transition-colors`}>
                <Tooltip tip={indicatorTip}>
                    <span className="font-semibold text-gray-800 text-sm sm:text-base">
                        巴菲特指数 (总市值/GDP):
                    </span>
                </Tooltip>
                <span className={`text-xl sm:text-2xl font-bold ${colorClass}`}>
                    {indicatorValue.toFixed(2)}%
                </span>
            </div>
        </div>
    );
};

export default BuffettIndicator;