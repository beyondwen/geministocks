import React from 'react';
import { FireIcon } from './icons/Icons';

interface HotStocksProps {
  onSelect: (query: string) => void;
}

// Export this array to be used in other components for suggestions
export const HOT_STOCKS = [
  { name: '英伟达', ticker: 'NVDA' },
  { name: '特斯拉', ticker: 'TSLA' },
  { name: '苹果', ticker: 'AAPL' },
  { name: '腾讯控股', ticker: '00700.HK' },
  { name: '阿里巴巴', ticker: 'BABA' },
  { name: '宁德时代', ticker: '300750.SZ' },
  { name: 'AMD', ticker: 'AMD' },
  { name: 'GameStop', ticker: 'GME' },
  { name: '小米集团', ticker: '01810.HK' },
  { name: '赛力斯', ticker: '601127.SH' },
];

const HotStocks: React.FC<HotStocksProps> = ({ onSelect }) => {
  return (
    <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-lg">
      <div className="flex items-center mb-4">
        <span className="p-2 bg-gray-200 rounded-full mr-3 text-red-500">
          <FireIcon className="h-6 w-6" />
        </span>
        <h2 className="text-xl font-semibold text-gray-800">24小时热门股票</h2>
      </div>
      <div className="flex flex-wrap gap-3">
        {HOT_STOCKS.map((stock) => (
          <button
            key={stock.ticker}
            onClick={() => onSelect(stock.name)}
            className="px-4 py-2 bg-gray-100 text-gray-800 text-sm font-medium rounded-full hover:bg-teal-100 hover:text-teal-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            {stock.name} <span className="text-gray-500 font-mono">{stock.ticker}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HotStocks;