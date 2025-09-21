import React from 'react';
import type { StockTicker } from '../types';
import { ExternalLinkIcon } from './icons/Icons';

// Helper component for highlighting text.
const HighlightedText: React.FC<{ text: string; keywords: string[] }> = ({ text, keywords }) => {
  if (!keywords || keywords.length === 0 || !text) {
    return <>{text}</>;
  }

  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${keywords.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        const isKeyword = keywords.some(keyword => keyword.toLowerCase() === part.toLowerCase());
        if (isKeyword) {
          return (
            <mark key={index} className="bg-cyan-100 text-cyan-800 rounded-sm px-1 mx-px font-semibold">
              {part}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

const generateStockLink = (stock: StockTicker): string => {
    const { ticker, market } = stock;
    switch (market) {
      case 'A-Share':
        const prefix = ticker.startsWith('6') ? 'sh' : 'sz';
        return `https://quote.eastmoney.com/${prefix}${ticker}.html`;
      case 'Hong Kong':
        return `https://www.google.com/finance/quote/${ticker}:HKG`;
      case 'US':
        return `https://www.google.com/finance/quote/${ticker}`;
      case 'Other':
      default:
        return `https://www.google.com/finance/q=${encodeURIComponent(ticker)}`;
    }
};

const StockCard: React.FC<{ stock: StockTicker; keywords: string[]; }> = ({ stock, keywords }) => {
  const relevanceConfig = {
    High: {
      label: '高',
      borderColor: 'border-green-500',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800'
    },
    Medium: {
      label: '中',
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800'
    },
    Low: {
      label: '低',
      borderColor: 'border-red-500',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800'
    },
  };

  const config = relevanceConfig[stock.relevance] || relevanceConfig.Medium;
  const link = generateStockLink(stock);

  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${config.borderColor} p-4 flex flex-col justify-between transition-shadow hover:shadow-lg h-full`}>
      {/* Main content area */}
      <div>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h5 className="font-bold text-gray-800 pr-2">{stock.name}</h5>
            <p className="text-xs text-gray-500 font-mono">{stock.ticker} ({stock.market})</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor} flex-shrink-0`}>
            关联度: {config.label}
          </span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          <HighlightedText text={stock.reason} keywords={keywords} />
        </p>
      </div>
      {/* Actions area */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end">
        <a 
          href={link} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition-colors"
          aria-label={`查看 ${stock.name} 的详情`}
        >
          查看详情
          <ExternalLinkIcon className="h-3.5 w-3.5 ml-1" />
        </a>
      </div>
    </div>
  );
};


interface StockRecommendationsProps {
  stocks: StockTicker[];
  keywords: string[];
}

const StockRecommendations: React.FC<StockRecommendationsProps> = ({ stocks, keywords }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stocks.map((stock, index) => (
            <StockCard key={index} stock={stock} keywords={keywords} />
        ))}
    </div>
  );
};

export default StockRecommendations;