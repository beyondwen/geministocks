import React, { useMemo } from 'react';
import type { QandAResultItem } from '../types';
import { useI18n } from '../hooks/useI18n';
import { PlusIcon } from './icons/Icons';

// Helper function to parse CSV string into headers and rows
const parseCsv = (csvString: string): { headers: string[], rows: string[][] } => {
    if (!csvString || typeof csvString !== 'string') {
        return { headers: [], rows: [] };
    }
    const lines = csvString.trim().split('\n');
    const headers = lines[0] ? lines[0].split(',') : [];
    const rows = lines.slice(1).map(line => line.split(','));
    return { headers, rows };
};


const DataTable: React.FC<{ csvString: string }> = ({ csvString }) => {
    const { headers, rows } = useMemo(() => parseCsv(csvString), [csvString]);

    if (headers.length === 0 || rows.length === 0) {
        return <p className="text-sm text-gray-500">No data to display.</p>;
    }

    return (
        <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            {headers.map((header, index) => (
                                <th key={index} scope="col" className="px-4 py-2 text-left text-xs font-bold text-black uppercase tracking-wider">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="px-4 py-2 whitespace-nowrap text-gray-700">
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
                {rows.map((row, rowIndex) => (
                    <div key={rowIndex} className="bg-gray-50/80 border border-gray-200 rounded-lg p-4">
                        {headers.map((header, headerIndex) => (
                            <div key={headerIndex} className="grid grid-cols-2 gap-2 text-sm py-1.5 border-b border-gray-200/80 last:border-b-0">
                                <span className="font-semibold text-gray-600">{header}</span>
                                <span className="text-gray-800 font-medium text-right">{row[headerIndex]}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </>
    );
};

const ResultCard: React.FC<{ item: QandAResultItem }> = ({ item }) => {
    const { t } = useI18n();
    return (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-black mb-2">{t('qandaResult.matchedQuestion')}</h3>
                <blockquote className="text-gray-800 font-medium italic border-l-4 border-gray-400 pl-4 py-2 bg-gray-100 rounded-r-lg">
                    {item.question}
                </blockquote>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-black mb-2">{t('qandaResult.answer')}</h3>
                <p className="text-gray-700 leading-relaxed">{item.answer}</p>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-black mb-2">{t('qandaResult.sqlQuery')}</h3>
                <pre className="bg-gray-800 text-white p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{item.sql}</code>
                </pre>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-black mb-2">{t('qandaResult.sourceTable')}</h3>
                <DataTable csvString={item.table} />
            </div>
        </div>
    );
};


interface QandAResultProps {
  results: QandAResultItem[];
  onNewAnalysis: () => void;
}

const QandAResult: React.FC<QandAResultProps> = ({ results, onNewAnalysis }) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6 animate-reveal-scale">
        <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold text-black">{t('qandaResult.title')}</h2>
             <button
                onClick={onNewAnalysis}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 text-black text-sm font-medium rounded-xl shadow-sm hover:bg-gray-100 hover:border-gray-300 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                aria-label={t('analysisResult.newAnalysis')}
                >
                <PlusIcon className="h-5 w-5" />
                <span>{t('analysisResult.newAnalysis')}</span>
            </button>
        </div>

        {results.length > 0 ? (
            <div className="space-y-6">
                {results.map((item, index) => (
                    <ResultCard key={index} item={item} />
                ))}
            </div>
        ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <p className="text-gray-600">{t('qandaResult.noResults')}</p>
            </div>
        )}
    </div>
  );
};

export default QandAResult;