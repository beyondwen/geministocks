import React, { useRef, useState, useCallback, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { StockAnalysisReport, InvestmentScore, SWOT, ValuationAnalysis, PeerCompetitor, RecentNewsItem, FinancialTrend } from '../types';
import { DownloadIcon, BookmarkSquareIcon, SparklesIcon, CheckCircleIcon, DocumentArrowDownIcon, TagIcon, SpeakerWaveIcon } from './icons/Icons';
import TextRenderer from './TextRenderer';

// --- SVG Icons (defined locally to minimize file changes) ---
const BuildingOfficeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6M9 11.25h6M9 15.75h6M4.5 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0-3.375v-3.375m0 0h3.75m-3.75 0h3.75m-3.75 0V21m0-6.375v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m-3.75-6.375h3.75" />
    </svg>
);
const ChartBarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);
const LightBulbIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3 7.5a7.478 7.478 0 01-4.242 0M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const ShieldExclamationIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);
const UsersIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.663M12 12.031c-1.63 0-3.07.73-4.025 1.887M12 12.031c.64.043 1.282.082 1.94.121a5.964 5.964 0 013.913 1.152m-11.854.482a6.375 6.375 0 0011.964-4.663M4.5 12.031a9.37 9.37 0 019.375-9.375 9.37 9.37 0 019.375 9.375c0 4.135-2.693 7.62-6.375 8.92-2.124.762-4.383 1.15-6.75.981-2.5-1.5-4.5-4.5-4.5-7.844z" />
    </svg>
);
const GlobeAltIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
);


// --- Reusable Components ---
const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white/60 p-6 rounded-lg shadow-md border border-gray-200 h-full">
        <div className="flex items-center mb-4">
            <span className="p-2 bg-gray-200 rounded-full mr-3 text-cyan-700">{icon}</span>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        </div>
        <div className="text-gray-700 space-y-3">{children}</div>
    </div>
);

const RiskIndicator: React.FC<{ level: 'High' | 'Medium' | 'Low' }> = ({ level }) => {
    const config = {
      High: { label: '高风险', color: 'bg-red-100 text-red-800 border-red-400' },
      Medium: { label: '中等风险', color: 'bg-yellow-100 text-yellow-800 border-yellow-400' },
      Low: { label: '低风险', color: 'bg-green-100 text-green-800 border-green-400' },
    }[level] || { label: '中等风险', color: 'bg-yellow-100 text-yellow-800 border-yellow-400' };
  
    return <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border ${config.color}`}><TextRenderer text={config.label} /></span>;
};

const ScoreDisplay: React.FC<{ scoreData: InvestmentScore }> = ({ scoreData }) => {
  const getScoreColor = (score: number) => {
    if (score >= 75) return { text: 'text-green-600', bg: 'bg-green-100', border: 'border-green-500' };
    if (score >= 50) return { text: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-500' };
    return { text: 'text-red-600', bg: 'bg-red-100', border: 'border-red-500' };
  };

  const { score, reason } = scoreData;
  const { text, bg, border } = getScoreColor(score);

  return (
    <div className={`p-4 rounded-lg shadow-sm border-l-4 ${border} ${bg} mb-6 col-span-1 md:col-span-2`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center mb-2 sm:mb-0">
          <SparklesIcon className={`w-6 h-6 mr-2 ${text}`} />
          <h3 className="text-lg font-bold text-gray-800">投资吸引力评分</h3>
        </div>
        <div className="text-center sm:text-right">
          <p className={`text-4xl font-extrabold ${text}`}>{score}<span className="text-xl font-medium">/100</span></p>
        </div>
      </div>
      <p className="text-sm text-gray-700 mt-2 pl-1"><TextRenderer text={reason} /></p>
    </div>
  );
};

const KeyTakeaways: React.FC<{ takeaways: string[] }> = ({ takeaways }) => (
    <div className="bg-white/60 p-6 rounded-lg shadow-md border border-gray-200 mb-6 col-span-1 md:col-span-2">
        <h3 className="text-xl font-bold text-gray-800 mb-4">核心摘要</h3>
        <ul className="space-y-2">
            {takeaways.map((item, index) => (
                <li key={index} className="flex items-start">
                    <CheckCircleIcon className="w-5 h-5 text-cyan-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700"><TextRenderer text={item} /></span>
                </li>
            ))}
        </ul>
    </div>
);


// --- Main Display Sections ---
const ProfileSection: React.FC<{ profile: StockAnalysisReport['companyProfile'] }> = ({ profile }) => (
    <div className="col-span-1 md:col-span-2">
        <Card title="公司概况" icon={<BuildingOfficeIcon className="w-6 h-6" />}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                    <p className="font-semibold text-gray-900">{profile.name}</p>
                    <p className="text-gray-600">公司名称</p>
                </div>
                <div>
                    <p className="font-semibold text-gray-900 font-mono">{profile.ticker}</p>
                    <p className="text-gray-600">股票代码</p>
                </div>
                <div>
                    <p className="font-semibold text-gray-900">{profile.exchange}</p>
                    <p className="text-gray-600">交易所</p>
                </div>
                <div>
                    <p className="font-semibold text-gray-900"><TextRenderer text={profile.sector} /></p>
                    <p className="text-gray-600">行业板块</p>
                </div>
            </div>
            <p className="text-sm leading-relaxed mt-4 pt-4 border-t border-gray-200"><TextRenderer text={profile.summary} /></p>
        </Card>
    </div>
);

const FinancialTrendChart: React.FC<{ data: FinancialTrend[] }> = ({ data }) => {
    const yAxisFormatter = (value: number) => new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value);
  
    return (
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="year" stroke="#6b7280" />
            <YAxis tickFormatter={yAxisFormatter} stroke="#6b7280" />
            <Tooltip
              formatter={(value: number) => yAxisFormatter(value)}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(5px)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="revenue" name="营收" stroke="#38bdf8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="netIncome" name="净利润" stroke="#34d399" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
};

const ValuationSection: React.FC<{ valuation: ValuationAnalysis }> = ({ valuation }) => {
    const judgmentConfig = {
      undervalued: { label: '低估', color: 'bg-green-100 text-green-800 border-green-400' },
      'fairly valued': { label: '合理', color: 'bg-yellow-100 text-yellow-800 border-yellow-400' },
      overvalued: { label: '高估', color: 'bg-red-100 text-red-800 border-red-400' },
    };
    const config = judgmentConfig[valuation.judgment] || judgmentConfig['fairly valued'];
  
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">估值判断:</span>
            <span className={`px-3 py-1 text-sm font-bold rounded-full border ${config.color}`}>{config.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">目标价区间:</span>
            <span className="px-3 py-1 text-sm font-bold bg-gray-200 text-gray-800 rounded-md">{valuation.targetPriceRange}</span>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 text-sm mb-1">分析方法:</h4>
          <p className="text-sm pl-4 border-l-2 border-gray-300"><TextRenderer text={valuation.methodology} /></p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 text-sm mb-1">判断依据:</h4>
          <p className="text-sm pl-4 border-l-2 border-cyan-400"><TextRenderer text={valuation.reasoning} /></p>
        </div>
      </div>
    );
};
  
const PeerComparisonSection: React.FC<{ peers: PeerCompetitor[] }> = ({ peers }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-700">
        <thead className="text-xs text-gray-800 uppercase bg-gray-200/60">
          <tr>
            <th scope="col" className="px-4 py-3">公司</th>
            <th scope="col" className="px-4 py-3">市值</th>
            <th scope="col" className="px-4 py-3">市盈率 (PE)</th>
            <th scope="col" className="px-4 py-3">营收增长</th>
            <th scope="col" className="px-4 py-3">毛利率</th>
          </tr>
        </thead>
        <tbody>
          {peers.map((peer, index) => (
            <tr key={index} className="bg-white/50 border-b border-gray-200 hover:bg-gray-100/70">
              <th scope="row" className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                {peer.name} <span className="font-mono text-gray-500">{peer.ticker}</span>
              </th>
              <td className="px-4 py-3">{peer.marketCap}</td>
              <td className="px-4 py-3">{peer.peRatio}</td>
              <td className="px-4 py-3">{peer.revenueGrowth}</td>
              <td className="px-4 py-3">{peer.grossMargin}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
);

const RecentNewsSection: React.FC<{ news: RecentNewsItem[] }> = ({ news }) => {
    const impactConfig = {
      Positive: { label: '正面', color: 'bg-green-100 text-green-800' },
      Neutral: { label: '中性', color: 'bg-yellow-100 text-yellow-800' },
      Negative: { label: '负面', color: 'bg-red-100 text-red-800' },
    };
  
    return (
      <ul className="space-y-4">
        {news.map((item, index) => (
          <li key={index} className="border-b border-gray-200 pb-3 last:border-b-0">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-semibold text-gray-900">{item.title}</h4>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${impactConfig[item.impact]?.color || impactConfig.Neutral.color}`}>
                {impactConfig[item.impact]?.label || '中性'}
              </span>
            </div>
            <p className="text-sm"><TextRenderer text={item.summary} /></p>
          </li>
        ))}
      </ul>
    );
};

const SWOTSection: React.FC<{ swot: SWOT }> = ({ swot }) => (
    <div className="col-span-1 md:col-span-2">
        <Card title="SWOT 分析" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <h4 className="font-bold text-green-800 mb-2">优势 (S)</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {swot.strengths.map((s, i) => <li key={i}><TextRenderer text={s} /></li>)}
                    </ul>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <h4 className="font-bold text-red-800 mb-2">劣势 (W)</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {swot.weaknesses.map((w, i) => <li key={i}><TextRenderer text={w} /></li>)}
                    </ul>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <h4 className="font-bold text-blue-800 mb-2">机会 (O)</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {swot.opportunities.map((o, i) => <li key={i}><TextRenderer text={o} /></li>)}
                    </ul>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <h4 className="font-bold text-yellow-800 mb-2">威胁 (T)</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {swot.threats.map((t, i) => <li key={i}><TextRenderer text={t} /></li>)}
                    </ul>
                </div>
            </div>
        </Card>
    </div>
);

const ThesisSection: React.FC<{ thesis: StockAnalysisReport['investmentThesis'] }> = ({ thesis }) => (
    <Card title="投资论点" icon={<LightBulbIcon className="w-6 h-6" />}>
        <div>
            <h4 className="font-bold text-gray-800 mb-1">看涨理由 (Bull) 👍</h4>
            <p className="text-sm leading-relaxed"><TextRenderer text={thesis.bull} /></p>
        </div>
        <div className="mt-3">
            <h4 className="font-bold text-gray-800 mb-1">看跌理由 (Bear) 👎</h4>
            <p className="text-sm leading-relaxed"><TextRenderer text={thesis.bear} /></p>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-bold text-gray-800 mb-1">综合结论 🎯</h4>
            <p className="text-sm font-semibold leading-relaxed"><TextRenderer text={thesis.conclusion} /></p>
        </div>
    </Card>
);

const RiskSection: React.FC<{ risk: StockAnalysisReport['riskAnalysis'] }> = ({ risk }) => (
    <div className="col-span-1 md:col-span-2">
        <Card title="风险分析" icon={<ShieldExclamationIcon className="w-6 h-6" />}>
            <div className="flex items-center gap-x-4 mb-3">
                <h4 className="font-bold text-gray-800">综合风险评级:</h4>
                <RiskIndicator level={risk.level} />
            </div>
            <p className="text-sm mb-3"><TextRenderer text={risk.description} /></p>
            <div>
                <h4 className="font-bold text-gray-800 mb-2">主要风险因素:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                    {risk.factors.map((factor, i) => <li key={i}><TextRenderer text={factor} /></li>)}
                </ul>
            </div>
        </Card>
    </div>
);

const GovernanceSection: React.FC<{ governance: StockAnalysisReport['corporateGovernance'] }> = ({ governance }) => (
    <Card title="公司治理" icon={<UsersIcon className="w-6 h-6" />}>
        <p className="text-sm leading-relaxed"><TextRenderer text={governance.summary} /></p>
    </Card>
);

const ESGSection: React.FC<{ esg: StockAnalysisReport['esgRating'] }> = ({ esg }) => (
    <Card title="ESG 评级" icon={<GlobeAltIcon className="w-6 h-6" />}>
        <div className="flex items-center gap-x-4 mb-3">
            <h4 className="font-bold text-gray-800">综合评级:</h4>
            <span className="inline-block px-3 py-1 text-sm font-bold bg-gray-200 text-gray-800 rounded-md"><TextRenderer text={esg.rating} /></span>
        </div>
        <p className="text-sm leading-relaxed"><TextRenderer text={esg.summary} /></p>
    </Card>
);

// --- Main Component ---
interface StockAnalysisResultProps {
  report: StockAnalysisReport;
}

const StockAnalysisResult: React.FC<StockAnalysisResultProps> = ({ report }) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);

  const handleExportImage = useCallback(() => {
    if (exportRef.current === null) return;
    setIsExporting(true);
    setExportError(null);
    toPng(exportRef.current, { cacheBust: true, pixelRatio: 2 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `个股分析报告_${report.companyProfile.name}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((err) => {
        console.error('Failed to export image:', err);
        setExportError('导出图片失败。请稍后再试。');
      })
      .finally(() => setIsExporting(false));
  }, [report]);
  
  const handlePrint = useCallback(() => {
    setIsPreparingPdf(true);
    // Using a short timeout allows the state to update and the preparing message to render
    // before the blocking print dialog opens.
    setTimeout(() => {
      window.print();
    }, 50);
  }, []);
  
  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPreparingPdf(false);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
        {isPreparingPdf && (
            <div className="no-print fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-white rounded-lg p-8 shadow-2xl text-center">
                    <svg className="animate-spin h-10 w-10 text-teal-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-xl font-semibold text-gray-800">正在准备导出...</p>
                    <p className="text-sm text-gray-600 mt-1">即将打开打印预览窗口</p>
                </div>
            </div>
        )}

        <div className="no-print flex justify-end gap-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all"
              aria-label="导出为 PDF"
            >
                <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" />
                导出 PDF
            </button>
            <button
              onClick={handleExportImage}
              disabled={isExporting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DownloadIcon className="-ml-1 mr-2 h-5 w-5" />
              {isExporting ? '正在导出...' : '导出图片'}
            </button>
        </div>
        {exportError && <div role="alert" className="bg-red-100 border-red-400 text-red-700 px-4 py-3 rounded text-center"><p>{exportError}</p></div>}
        
        <div ref={exportRef} className="printable-area p-4 sm:p-6 bg-gray-50 rounded-lg shadow-lg">
            <div className="mb-6 pb-4 border-b border-gray-300">
                <h2 className="text-3xl font-bold text-gray-900">个股分析报告 📊</h2>
                <p className="text-gray-600">由 AI 生成</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {report.investmentScore && <ScoreDisplay scoreData={report.investmentScore} />}
                {report.keyTakeaways && report.keyTakeaways.length > 0 && <KeyTakeaways takeaways={report.keyTakeaways} />}
                <ProfileSection profile={report.companyProfile} />
                
                {report.financialTrends && report.financialTrends.length > 0 && (
                    <div className="col-span-1 md:col-span-2">
                        <Card title="财务趋势 (近3年)" icon={<ChartBarIcon className="w-6 h-6" />}>
                            <FinancialTrendChart data={report.financialTrends} />
                        </Card>
                    </div>
                )}
                
                {report.valuationAnalysis && (
                    <div className="col-span-1 md:col-span-2">
                        <Card title="估值分析" icon={<TagIcon className="w-6 h-6" />}>
                            <ValuationSection valuation={report.valuationAnalysis} />
                        </Card>
                    </div>
                )}
                
                {report.peerComparison && report.peerComparison.length > 0 && (
                     <div className="col-span-1 md:col-span-2">
                        <Card title="同行对比" icon={<UsersIcon className="w-6 h-6" />}>
                            <PeerComparisonSection peers={report.peerComparison} />
                        </Card>
                    </div>
                )}

                <div className="col-span-1 md:col-span-2">
                    <ThesisSection thesis={report.investmentThesis} />
                </div>
                
                <SWOTSection swot={report.swotAnalysis} />

                {report.recentNews && report.recentNews.length > 0 && (
                    <div className="col-span-1 md:col-span-2">
                       <Card title="近期动态" icon={<SpeakerWaveIcon className="w-6 h-6" />}>
                           <RecentNewsSection news={report.recentNews} />
                       </Card>
                   </div>
                )}

                <GovernanceSection governance={report.corporateGovernance} />
                <ESGSection esg={report.esgRating} />
                <RiskSection risk={report.riskAnalysis} />

                {report.sources && report.sources.length > 0 && (
                    <div className="col-span-1 md:col-span-2">
                        <Card title="参考来源" icon={<BookmarkSquareIcon className="w-6 h-6" />}>
                            <ul className="list-disc list-inside space-y-2 text-sm">
                                {report.sources.map((source, index) => (
                                    <li key={index}>
                                        <a
                                            href={source.uri}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-cyan-600 hover:text-cyan-800 hover:underline transition-colors"
                                            title={source.title}
                                        >
                                            {source.title}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </div>
                )}
            </div>
            <footer className="text-center mt-8 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                    本报告使用超级挖掘机分析生成，<br />欢迎关注“小声读书”公众号获取更多信息
                </p>
            </footer>
        </div>
    </div>
  );
};

export default StockAnalysisResult;