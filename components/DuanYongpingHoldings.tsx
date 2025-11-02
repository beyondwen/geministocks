import React from 'react';
import { SparklesIcon } from './icons/Icons';
import { useI18n } from '../hooks/useI18n';

interface Holding {
  name: string;
  ticker: string;
  percentage: string;
}

const holdingsData: Holding[] = [
  { name: '苹果 (Apple)', ticker: 'AAPL', percentage: '62.47%' },
  { name: '伯克希尔·哈撒韦 (Berkshire Hathaway)', ticker: 'BRK.B', percentage: '14.24%' },
  { name: '拼多多 (PDD Holdings)', ticker: 'PDD', percentage: '7.86%' },
  { name: '西方石油 (Occidental Petroleum)', ticker: 'OXY', percentage: '4.94%' },
  { name: '阿里巴巴 (Alibaba)', ticker: 'BABA', percentage: '3.68%' },
  { name: '谷歌 (Alphabet Class C)', ticker: 'GOOG', percentage: '2.99%' },
  { name: '英伟达 (NVIDIA)', ticker: 'NVDA', percentage: '1.32%' },
  { name: '微软 (Microsoft)', ticker: 'MSFT', percentage: '1.20%' },
  { name: '迪士尼 (Walt Disney)', ticker: 'DIS', percentage: '0.78%' },
  { name: '台积电 (Taiwan Semiconductor)', ticker: 'TSM', percentage: '0.51%' },
];

interface DuanYongpingHoldingsProps {
  onSelect: (query: string) => void;
}

const DuanYongpingHoldings: React.FC<DuanYongpingHoldingsProps> = ({ onSelect }) => {
  const { t } = useI18n();

  // A simple briefcase icon for portfolio
  const BriefcaseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.075c0 1.313-.964 2.446-2.25 2.611a48.455 48.455 0 01-1.295.064H7.295a48.455 48.455 0 01-1.295-.064C4.704 20.67 3.75 19.538 3.75 18.225V14.15M16.5 18.75h.008v.008h-.008v-.008zM12.75 9.75h.008v.008h-.008V9.75zM12 12.75h.008v.008H12v-.008zM12 15.75h.008v.008H12v-.008zM16.5 12.75h.008v.008h-.008v-.008zM16.5 15.75h.008v.008h-.008v-.008zM21 9.75a2.25 2.25 0 00-2.25-2.25H5.25a2.25 2.25 0 00-2.25 2.25v.383c0 .33.043.655.127.966l.248 1.033a.75.75 0 00.73.57h13.29c.333 0 .622-.224.73-.57l.248-1.033A2.251 2.251 0 0021 10.133V9.75z" />
    </svg>
  );

  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-black rounded-xl shadow-lg">
           <BriefcaseIcon className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-black">{t('duanHoldings.title')}</h3>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100/80">
              <tr>
                <th scope="col" className="px-4 py-3">{t('duanHoldings.stock')}</th>
                <th scope="col" className="px-4 py-3">{t('duanHoldings.ticker')}</th>
                <th scope="col" className="px-4 py-3 text-right">{t('duanHoldings.portfolio')}</th>
                <th scope="col" className="px-4 py-3 text-right">{t('duanHoldings.action')}</th>
              </tr>
            </thead>
            <tbody>
              {holdingsData.map((holding) => (
                <tr key={holding.ticker} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50/80">
                  <th scope="row" className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{holding.name}</th>
                  <td className="px-4 py-3 font-mono text-gray-600">{holding.ticker}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{holding.percentage}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onSelect(holding.ticker)}
                      className="relative inline-flex items-center gap-1.5 px-3 py-1 text-white text-xs font-medium rounded-full group overflow-hidden btn-premium opacity-90 hover:opacity-100 hover:shadow-md transition-all duration-300 hover:-translate-y-px active:scale-95"
                    >
                      <SparklesIcon className="w-3.5 h-3.5" />
                      <span className="relative z-10">{t('latestNews.analyzeButton')}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {holdingsData.map((holding) => (
            <div key={holding.ticker} className="border border-gray-200 rounded-lg p-4 shadow-sm">
                 <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{holding.name}</p>
                    <p className="font-mono text-sm text-gray-600">{holding.ticker}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="font-semibold text-lg text-gray-800">{holding.percentage}</p>
                    <p className="text-xs text-gray-500">{t('duanHoldings.portfolio')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <button
                    onClick={() => onSelect(holding.ticker)}
                    className="relative inline-flex items-center gap-1.5 px-3 py-1 text-white text-xs font-medium rounded-full group overflow-hidden btn-premium opacity-90 hover:opacity-100 hover:shadow-md transition-all duration-300 hover:-translate-y-px active:scale-95"
                  >
                    <SparklesIcon className="w-3.5 h-3.5" />
                    <span className="relative z-10">{t('latestNews.analyzeButton')}</span>
                  </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default DuanYongpingHoldings;
