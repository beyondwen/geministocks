import React from 'react';
import { FireIcon } from './icons/Icons';
import { useI18n } from '../hooks/useI18n';

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
  const { t } = useI18n();

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-soft">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-black rounded-xl shadow-lg">
          <FireIcon className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-black">{t('hotStocks.title')}</h3>
      </div>
      {isLoading ? (
        <HotStockSkeleton />
      ) : (
        <div className="flex flex-wrap gap-3">
          {stocks.map((stock) => (
            <button
              key={stock.ticker}
              onClick={() => onSelect(stock.name)}
              className="px-4 py-2 bg-gray-100 text-black text-sm font-medium rounded-full hover:bg-gray-200 hover:text-black transition-all duration-200 hover:shadow-md hover:scale-105 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            >
              {stock.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HotStocks;