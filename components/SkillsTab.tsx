import React, { useState, useCallback } from 'react';
import { useI18n } from '../hooks/useI18n';
import type { SkillType, SkillReport } from '../types';
import {
    getDCFValuationAnalysis,
    getEarningsPreviewAnalysis,
    getEarningsRecapAnalysis,
    getSEPAStrategyAnalysis,
    getStartupAnalysis,
    getEstimateAnalysis,
} from '../services/skillsService';
import SkillReportDisplay from './skills/SkillReportDisplay';
import {
    ScaleIcon,
    CalendarIcon,
    PresentationChartLineIcon,
    ChartTrendingUpIcon,
    LightBulbIcon,
    UsersIcon,
    SparklesIcon,
} from './icons/Icons';

interface SkillsTabProps {
    /** Returns true when the user's API settings are configured; otherwise opens the settings modal. */
    ensureApiConfigured: () => boolean;
}

interface SkillDef {
    type: SkillType;
    icon: React.ReactNode;
    inputKind: 'ticker' | 'ticker-quarter' | 'company';
}

const SKILLS: SkillDef[] = [
    { type: 'dcf-valuation', icon: <ScaleIcon className="w-7 h-7" />, inputKind: 'ticker' },
    { type: 'earnings-preview', icon: <CalendarIcon className="w-7 h-7" />, inputKind: 'ticker' },
    { type: 'earnings-recap', icon: <PresentationChartLineIcon className="w-7 h-7" />, inputKind: 'ticker-quarter' },
    { type: 'sepa-strategy', icon: <ChartTrendingUpIcon className="w-7 h-7" />, inputKind: 'ticker' },
    { type: 'startup-analysis', icon: <LightBulbIcon className="w-7 h-7" />, inputKind: 'company' },
    { type: 'estimate-analysis', icon: <UsersIcon className="w-7 h-7" />, inputKind: 'ticker' },
];

const SkillsTab: React.FC<SkillsTabProps> = ({ ensureApiConfigured }) => {
    const { t, locale } = useI18n();
    const [selectedSkill, setSelectedSkill] = useState<SkillDef | null>(null);
    const [query, setQuery] = useState('');
    const [quarter, setQuarter] = useState('');
    const [report, setReport] = useState<SkillReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSelectSkill = (skill: SkillDef) => {
        setSelectedSkill(skill);
        setReport(null);
        setError(null);
        setQuery('');
        setQuarter('');
    };

    const handleBack = () => {
        setSelectedSkill(null);
        setReport(null);
        setError(null);
    };

    const handleAnalyze = useCallback(async () => {
        if (!selectedSkill || !query.trim() || isLoading) return;
        if (!ensureApiConfigured()) return;

        setIsLoading(true);
        setError(null);
        setReport(null);

        try {
            let result: SkillReport;
            switch (selectedSkill.type) {
                case 'dcf-valuation':
                    result = await getDCFValuationAnalysis(query.trim(), locale);
                    break;
                case 'earnings-preview':
                    result = await getEarningsPreviewAnalysis(query.trim(), locale);
                    break;
                case 'earnings-recap':
                    result = await getEarningsRecapAnalysis(query.trim(), quarter, locale);
                    break;
                case 'sepa-strategy':
                    result = await getSEPAStrategyAnalysis(query.trim(), locale);
                    break;
                case 'startup-analysis':
                    result = await getStartupAnalysis(query.trim(), locale);
                    break;
                case 'estimate-analysis':
                    result = await getEstimateAnalysis(query.trim(), locale);
                    break;
            }
            setReport(result);
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? t('errors.analysisFailed', { message: err.message }) : t('errors.unknownError');
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [selectedSkill, query, quarter, isLoading, locale, t, ensureApiConfigured]);

    // --- Skill selector grid ---
    if (!selectedSkill) {
        return (
            <div className="animate-fade-in" role="tabpanel">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 text-balance">{t('skillsTab.heading')}</h2>
                    <p className="text-sm text-gray-500 mt-2 text-pretty max-w-xl mx-auto">{t('skillsTab.subheading')}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {SKILLS.map((skill) => (
                        <button
                            key={skill.type}
                            onClick={() => handleSelectSkill(skill)}
                            className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 text-left transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
                        >
                            <div className="text-gray-800 mb-3">{skill.icon}</div>
                            <h3 className="text-base font-semibold text-gray-900 mb-1.5">{t(`skills.${skill.type}.title`)}</h3>
                            <p className="text-sm text-gray-600 leading-relaxed mb-3">{t(`skills.${skill.type}.description`)}</p>
                            <p className="text-xs text-gray-400">{t(`skills.${skill.type}.tags`)}</p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const inputLabel =
        selectedSkill.inputKind === 'company' ? t('skillsTab.companyLabel') : t('skillsTab.tickerLabel');
    const inputPlaceholder =
        selectedSkill.inputKind === 'company' ? t('skillsTab.companyPlaceholder') : t('skillsTab.tickerPlaceholder');

    // --- Input form + report ---
    return (
        <div className="animate-fade-in space-y-6" role="tabpanel">
            {/* Header with back button */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-x-3">
                    <button
                        onClick={handleBack}
                        className="px-3 py-1.5 bg-white border border-stone-300 text-gray-700 text-sm font-medium rounded-full shadow-sm hover:bg-stone-50 transition-colors"
                    >
                        ← {t('skillsTab.back')}
                    </button>
                    <h2 className="text-lg font-semibold text-gray-900">{t(`skills.${selectedSkill.type}.title`)}</h2>
                </div>
                {report && (
                    <button
                        onClick={() => { setReport(null); setError(null); }}
                        className="px-4 py-1.5 bg-white border border-stone-300 text-gray-700 text-sm font-medium rounded-full shadow-sm hover:bg-stone-50 transition-colors"
                    >
                        {t('skillsTab.newAnalysis')}
                    </button>
                )}
            </div>

            {/* Input form */}
            {!report && (
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 sm:p-6">
                    <p className="text-sm text-gray-600 mb-4 leading-relaxed">{t(`skills.${selectedSkill.type}.description`)}</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <label htmlFor="skill-query" className="sr-only">{inputLabel}</label>
                            <input
                                id="skill-query"
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAnalyze(); }}
                                placeholder={inputPlaceholder}
                                disabled={isLoading}
                                className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-stone-500 disabled:bg-stone-50"
                            />
                        </div>
                        {selectedSkill.inputKind === 'ticker-quarter' && (
                            <div className="sm:w-48">
                                <label htmlFor="skill-quarter" className="sr-only">{t('skillsTab.quarterLabel')}</label>
                                <input
                                    id="skill-quarter"
                                    type="text"
                                    value={quarter}
                                    onChange={(e) => setQuarter(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAnalyze(); }}
                                    placeholder={t('skillsTab.quarterPlaceholder')}
                                    disabled={isLoading}
                                    className="w-full bg-white border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-stone-500 disabled:bg-stone-50"
                                />
                            </div>
                        )}
                        <button
                            onClick={handleAnalyze}
                            disabled={isLoading || !query.trim()}
                            className="inline-flex items-center justify-center gap-x-2 px-6 py-2.5 btn-premium text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-px active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            {isLoading ? t('skillsTab.analyzing') : t('skillsTab.analyze')}
                        </button>
                    </div>
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-10 flex flex-col items-center gap-y-4" role="status">
                    <div className="w-10 h-10 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin" aria-hidden="true" />
                    <p className="text-sm text-gray-600">{t('skillsTab.loadingMessage')}</p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div role="alert" className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 text-center rounded-lg">
                    <p className="font-semibold">{t('errors.title')}</p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            )}

            {/* Report */}
            {report && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {report.companyName || report.ticker || query}
                        </h2>
                        {report.ticker && report.companyName && (
                            <span className="text-sm font-medium text-gray-500">{report.ticker}</span>
                        )}
                        {report.dataFreshness?.dataAsOf && (
                            <span className="text-xs text-gray-400">{t('skillsTab.dataAsOf', { date: report.dataFreshness.dataAsOf })}</span>
                        )}
                    </div>
                    <SkillReportDisplay report={report} />
                    <p className="text-xs text-gray-400 text-center pt-2">{t('skillsTab.disclaimer')}</p>
                </div>
            )}
        </div>
    );
};

export default SkillsTab;
