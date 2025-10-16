import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';

export type Locale = 'en' | 'zh';

const DEFAULT_LOCALE: Locale = 'zh';
const LOCAL_STORAGE_KEY = 'gemini-app-locale';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, options?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Helper to get nested value from an object using a dot-notation string
const getNestedTranslation = (obj: any, key: string): string | undefined => {
  return key.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [translations, setTranslations] = useState<Record<Locale, any> | null>(null);
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const storedLocale = localStorage.getItem(LOCAL_STORAGE_KEY) as Locale;
      if (storedLocale && ['en', 'zh'].includes(storedLocale)) {
        return storedLocale;
      }
    } catch (e) {
      console.error('Could not access localStorage:', e);
    }
    const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : DEFAULT_LOCALE;
    return browserLang === 'zh' ? 'zh' : 'en';
  });

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const [enResponse, zhResponse] = await Promise.all([
          fetch('/locales/en.json'),
          fetch('/locales/zh.json')
        ]);
        if (!enResponse.ok || !zhResponse.ok) {
          throw new Error('Failed to fetch translation files');
        }
        const enData = await enResponse.json();
        const zhData = await zhResponse.json();
        setTranslations({ en: enData, zh: zhData });
      } catch (error) {
        console.error("Failed to load translation files", error);
        // Fallback to empty objects to prevent crashing
        setTranslations({ en: {}, zh: {} });
      }
    };
    fetchTranslations();
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, newLocale);
    } catch (e) {
      console.error('Could not save locale to localStorage:', e);
    }
  }, []);

  const t = useCallback((key: string, options?: Record<string, string | number>): string => {
    if (!translations) {
      return key; // Return key as fallback during load
    }
    
    let text = getNestedTranslation(translations[locale], key);
    if (text === undefined) {
      console.warn(`Translation key "${key}" not found for locale "${locale}". Falling back to default.`);
      text = getNestedTranslation(translations[DEFAULT_LOCALE], key);
      if (text === undefined) {
        return key; // Return the key itself as a last resort
      }
    }

    if (options && typeof text === 'string') {
      Object.keys(options).forEach(optKey => {
        text = text.replace(`{{${optKey}}}`, String(options[optKey]));
      });
    }

    return text;
  }, [locale, translations]);
  
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  
  // Don't render the rest of the app until translations are loaded
  if (!translations) {
    return null; // Or return a loading spinner component
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};