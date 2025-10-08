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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-pulse">
        {[...Array(10)].map((_, i) => (
            <div key={i} className="p-3 bg-gray-200 rounded-lg h-[76px]">
                <div className="flex items-center mb-2">
                    <div className="h-2.5 w-2.5 bg-gray-300 rounded-full mr-2"></div>
                </div>
                <div className="h-3 bg-gray-300 rounded w-3/4 mb-1.5"></div>
                <div className="h-2 bg-gray-300 rounded w-1/2"></div>
            </div>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {stocks.map((stock) => (
            <button
              key={stock.ticker}
              onClick={() => onSelect(stock.name)}
              className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md hover:border-teal-400 border border-gray-200 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <div className="flex items-center mb-2">
                <span className="h-2.5 w-2.5 bg-red-500 rounded-full mr-2 animate-pulse-hot"></span>
                <span className="text-xs font-semibold text-red-600">热门</span>
              </div>
              <p className="font-semibold text-gray-800 text-sm truncate">{stock.name}</p>
              <p className="font-mono text-xs text-gray-500">{stock.ticker}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HotStocks;