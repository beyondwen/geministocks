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
      <div key={i} className="px-4 py-2 bg-gray-200 rounded-full w-28 h-9"></div>
    ))}
  </div>
);

const HotStocks: React.FC<HotStocksProps> = ({ stocks, isLoading, onSelect }) => {
  return (
    <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-lg">
      <div className="flex items-center mb-4">
        <span className="p-2 bg-gray-200 rounded-full mr-3 text-red-500">
          <FireIcon className="h-6 w-6" />
        </span>
        <h2 className="text-xl font-semibold text-gray-800">24小时热门股票</h2>
      </div>
      {isLoading ? (
        <HotStockSkeleton />
      ) : (
        <div className="flex flex-wrap gap-3">
          {stocks.map((stock) => (
            <button
              key={stock.ticker}
              onClick={() => onSelect(stock.name)}
              className="px-4 py-2 bg-gray-100 text-gray-800 text-sm font-medium rounded-full hover:bg-teal-100 hover:text-teal-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              {stock.name} <span className="text-gray-500 font-mono">{stock.ticker}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HotStocks;
