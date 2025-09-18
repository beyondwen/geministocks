import React, { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import type { StockAnalysisReport, FinancialMetric, SWOT } from '../types';
import { DownloadIcon, DocumentArrowDownIcon } from './icons/Icons';

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
  
    return <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border ${config.color}`}>{config.label}</span>;
};

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
                    <p className="font-semibold text-gray-900">{profile.sector}</p>
                    <p className="text-gray-600">行业板块</p>
                </div>
            </div>
            <p className="text-sm leading-relaxed mt-4 pt-4 border-t border-gray-200">{profile.summary}</p>
        </Card>
    </div>
);

const FinancialsSection: React.FC<{ summary: StockAnalysisReport['financialSummary'] }> = ({ summary }) => (
    <Card title={`财务摘要 (${summary.period})`} icon={<ChartBarIcon className="w-6 h-6" />}>
        <ul className="space-y-3">
            {summary.highlights.map((item, index) => (
                <li key={index} className="flex flex-col sm:flex-row justify-between sm:items-center p-2 rounded-md hover:bg-gray-100">
                    <div>
                        <p className="font-semibold text-gray-900">{item.metric}: <span className="font-mono">{item.value}</span></p>
                        <p className="text-xs text-gray-600">{item.comment}</p>
                    </div>
                </li>
            ))}
        </ul>
    </Card>
);

const SWOTSection: React.FC<{ swot: SWOT }> = ({ swot }) => (
    <div className="col-span-1 md:col-span-2">
        <Card title="SWOT 分析" icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <h4 className="font-bold text-green-800 mb-2">优势 (S)</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {swot.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <h4 className="font-bold text-red-800 mb-2">劣势 (W)</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {swot.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <h4 className="font-bold text-blue-800 mb-2">机会 (O)</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {swot.opportunities.map((o, i) => <li key={i}>{o}</li>)}
                    </ul>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <h4 className="font-bold text-yellow-800 mb-2">威胁 (T)</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {swot.threats.map((t, i) => <li key={i}>{t}</li>)}
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
            <p className="text-sm leading-relaxed">{thesis.bull}</p>
        </div>
        <div className="mt-3">
            <h4 className="font-bold text-gray-800 mb-1">看跌理由 (Bear) 👎</h4>
            <p className="text-sm leading-relaxed">{thesis.bear}</p>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-bold text-gray-800 mb-1">综合结论 🎯</h4>
            <p className="text-sm font-semibold leading-relaxed">{thesis.conclusion}</p>
        </div>
    </Card>
);

const RiskSection: React.FC<{ risk: StockAnalysisReport['riskAnalysis'] }> = ({ risk }) => (
    <Card title="风险分析" icon={<ShieldExclamationIcon className="w-6 h-6" />}>
        <div className="flex items-center gap-x-4 mb-3">
            <h4 className="font-bold text-gray-800">综合风险评级:</h4>
            <RiskIndicator level={risk.level} />
        </div>
        <p className="text-sm mb-3">{risk.description}</p>
        <div>
            <h4 className="font-bold text-gray-800 mb-2">主要风险因素:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
                {risk.factors.map((factor, i) => <li key={i}>{factor}</li>)}
            </ul>
        </div>
    </Card>
);

// --- Main Component ---
interface StockAnalysisResultProps {
  report: StockAnalysisReport;
}

const StockAnalysisResult: React.FC<StockAnalysisResultProps> = ({ report }) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(() => {
    if (exportRef.current === null) return;
    setIsExporting(true);
    setExportError(null);
    toPng(exportRef.current, { cacheBust: true, pixelRatio: 2 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `个股分析报告_${report.companyProfile.name}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Failed to export image:', err);
        setExportError('导出图片失败。请稍后再试。');
      })
      .finally(() => setIsExporting(false));
  }, [report]);

  const handleExportPdf = useCallback(() => {
    if (exportRef.current === null) return;
    setIsExportingPdf(true);
    setExportError(null);
    toPng(exportRef.current, { cacheBust: true, pixelRatio: 2 })
      .then((dataUrl) => {
        const pdf = new jsPDF('p', 'px', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const imgWidth = img.width;
            const imgHeight = img.height;
            const ratio = imgHeight / imgWidth;
            const contentHeight = pdfWidth * ratio;

            let position = 0;
            let heightLeft = contentHeight;

            pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, contentHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, contentHeight);
                heightLeft -= pdfHeight;
            }

            const date = new Date().toISOString().split('T')[0];
            const fileName = `个股分析报告_${report.companyProfile.name}_${date}.pdf`;
            pdf.save(fileName);
        }
      })
      .catch((err) => {
        console.error('Failed to export PDF:', err);
        setExportError('导出 PDF 失败。请稍后再试。');
      })
      .finally(() => setIsExportingPdf(false));
  }, [report]);

  return (
    <div className="space-y-4 animate-fade-in">
        <div className="flex justify-end gap-x-2">
            <button
              onClick={handleExport}
              disabled={isExporting || isExportingPdf}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DownloadIcon className="-ml-1 mr-2 h-5 w-5" />
              {isExporting ? '正在导出...' : '导出图片'}
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || isExporting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" />
              {isExportingPdf ? '正在导出...' : '导出 PDF'}
            </button>
        </div>
        {exportError && <div role="alert" className="bg-red-100 border-red-400 text-red-700 px-4 py-3 rounded text-center"><p>{exportError}</p></div>}
        
        <div ref={exportRef} className="p-4 sm:p-6 bg-gray-50 rounded-lg shadow-lg">
            <div className="mb-6 pb-4 border-b border-gray-300">
                <h2 className="text-3xl font-bold text-gray-900">个股综合分析报告 📊</h2>
                <p className="text-gray-600">由 Gemini AI 生成</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProfileSection profile={report.companyProfile} />
                <FinancialsSection summary={report.financialSummary} />
                <SWOTSection swot={report.swotAnalysis} />
                <ThesisSection thesis={report.investmentThesis} />
                <RiskSection risk={report.riskAnalysis} />
            </div>
        </div>
    </div>
  );
};

export default StockAnalysisResult;