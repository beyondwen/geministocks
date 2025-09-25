import React from 'react';
import type { PositionalWarfareReport } from '../types';
import TextRenderer from './TextRenderer';
import { ExternalLinkIcon } from './icons/Icons';

const generateStockLink = (ticker: string, market: string): string => {
    if (market.toLowerCase().includes('a-share') || market.toLowerCase().includes('a股')) {
        const prefix = ticker.startsWith('6') ? 'sh' : 'sz';
        return `https://quote.eastmoney.com/${prefix}${ticker}.html`;
    }
    if (market.toLowerCase().includes('hong kong') || market.toLowerCase().includes('港股')) {
        return `https://www.google.com/finance/quote/${ticker}:HKG`;
    }
    if (market.toLowerCase().includes('us') || market.toLowerCase().includes('美股')) {
        return `https://www.google.com/finance/quote/${ticker}`;
    }
    return `https://www.google.com/finance/q=${encodeURIComponent(ticker)}`;
};

const LeaderStockCard: React.FC<{ leader: PositionalWarfareReport['leaderStock'] }> = ({ leader }) => (
    <div className="bg-white/60 p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-2xl font-bold text-gray-800">龙头股基准</h3>
                <p className="text-gray-500 text-sm">作为我们寻找“补涨龙”的参照物</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                龙头 👑
            </span>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-xl font-semibold">{leader.name} <span className="text-gray-500 font-mono text-base">{leader.ticker}</span></h4>
            <p className="text-sm text-gray-600 mb-2">{leader.sector} | {leader.market}</p>
            <p className="text-gray-700 leading-relaxed"><TextRenderer text={leader.analysis} /></p>
        </div>
    </div>
);

const FollowerCandidateCard: React.FC<{ candidate: PositionalWarfareReport['followerCandidates'][0], index: number }> = ({ candidate, index }) => {
    const link = generateStockLink(candidate.ticker, candidate.market);
    return (
        <div className="bg-white/60 p-6 rounded-lg shadow-md border-l-4 border-cyan-500 transition-shadow hover:shadow-xl">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">潜力补涨龙 #{index + 1}</h3>
                    <h4 className="text-lg font-semibold">{candidate.name} <span className="text-gray-500 font-mono text-base">{candidate.ticker}</span></h4>
                    <p className="text-sm text-gray-600">{candidate.market}</p>
                </div>
                <a 
                  href={link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition-colors"
                  aria-label={`查看 ${candidate.name} 的详情`}
                >
                  查看详情
                  <ExternalLinkIcon className="h-3.5 w-3.5 ml-1" />
                </a>
            </div>
            
            <div className="space-y-4 text-sm">
                <div>
                    <h5 className="font-semibold text-gray-800 mb-1">对比分析 (vs 龙头):</h5>
                    <p className="pl-4 border-l-2 border-gray-300 text-gray-700 leading-relaxed"><TextRenderer text={candidate.comparativeAnalysis} /></p>
                </div>
                <div>
                    <h5 className="font-semibold text-green-700 mb-1">投资论点 (卡位逻辑):</h5>
                    <p className="pl-4 border-l-2 border-green-400 text-gray-700 leading-relaxed"><TextRenderer text={candidate.investmentThesis} /></p>
                </div>
                <div>
                    <h5 className="font-semibold text-red-700 mb-1">核心风险:</h5>
                    <p className="pl-4 border-l-2 border-red-400 text-gray-700 leading-relaxed"><TextRenderer text={candidate.risks} /></p>
                </div>
            </div>
        </div>
    );
};

interface PositionalWarfareResultProps {
  report: PositionalWarfareReport;
}

const PositionalWarfareResult: React.FC<PositionalWarfareResultProps> = ({ report }) => {
  return (
    <div className="space-y-8 animate-fade-in">
        <div className="p-4 sm:p-6 bg-gray-50 rounded-lg shadow-lg">
            <div className="mb-8 pb-6 border-b border-gray-300">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">卡位战法分析报告 ⚔️</h2>
                <p className="text-gray-600">寻找板块中的下一个机会</p>
            </div>
            <div className="space-y-8">
                <LeaderStockCard leader={report.leaderStock} />
                
                {report.followerCandidates.map((candidate, index) => (
                    <FollowerCandidateCard key={candidate.ticker} candidate={candidate} index={index} />
                ))}
            </div>
        </div>
    </div>
  );
};

export default PositionalWarfareResult;