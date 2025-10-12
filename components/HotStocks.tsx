import React from 'react';
import { FireIcon } from './icons/Icons';

interface HotStock {
  name: string;
  ticker: string;
}

interface HotStocksProps {
  stocks: HotStock[];
  isLoading: boolean;
  onSelect: (query: string) => void;
}

const HotStockSkeleton: React.FC = () => (
  <div className="flex flex-wrap gap-3 animate-pulse">
    {[...Array(10)].map((_, i) => (
      <div key={i} className="px-4 py-2 bg-slate-200/80 rounded-full w-28 h-9"></div>
    ))}
  </div>
);

const HotStocks: React.FC<HotStocksProps> = ({ stocks, isLoading, onSelect }) => {
  return (
    <div className="glass-refined p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl shadow-lg">
          <FireIcon className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">24小时热门股票</h3>
      </div>
      {isLoading ? (
        <HotStockSkeleton />
      ) : (
        <div className="flex flex-wrap gap-3">
          {stocks.map((stock) => (
            <button
              key={stock.ticker}
              onClick={() => onSelect(stock.name)}
              className="px-4 py-2 bg-white/60 text-slate-800 text-sm font-medium rounded-full hover:bg-white/80 hover:text-cyan-700 transition-all duration-200 hover:shadow-md hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            >
              {stock.name} <span className="text-slate-500 font-mono">{stock.ticker}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HotStocks;