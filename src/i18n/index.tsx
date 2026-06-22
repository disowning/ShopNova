/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import enUS from './locales/en-US.json';
import jaJP from './locales/ja-JP.json';
import koKR from './locales/ko-KR.json';
import {
  fetchContentTranslations,
  isTranslationRowFresh,
  PAGE_SOURCE_SECTIONS,
  STORE_NAVIGATION_SECTION,
  STORE_SOURCE_SECTIONS,
  UI_SOURCE_SECTIONS,
  type TranslatableEntity,
  type TranslationSourceMap,
} from '../lib/translationService';
import { fetchPublicSiteSettings, type SiteSettings } from '../lib/siteSettings';

export type Locale = 'zh-CN' | 'zh-TW' | 'en-US' | 'ja-JP' | 'ko-KR';

const LOCALE_KEY = 'shopnova-locale';
const FALLBACK_LOCALE: Locale = 'en-US';

const messages: Record<Locale, Record<string, unknown>> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'en-US': enUS,
  'ja-JP': jaJP,
  'ko-KR': koKR,
};

const fallbackLocales: Record<Locale, Locale[]> = {
  'zh-CN': [],
  'zh-TW': ['zh-CN'],
  'en-US': ['zh-CN'],
  'ja-JP': ['en-US', 'zh-CN'],
  'ko-KR': ['en-US', 'zh-CN'],
};

export const localeNames: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'en-US': 'English',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
};

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && value in messages;
}

function detectBrowserLocale(): Locale {
  const browserLang = navigator.language;
  if (browserLang.startsWith('en')) return 'en-US';
  if (browserLang.startsWith('ja')) return 'ja-JP';
  if (browserLang.startsWith('ko')) return 'ko-KR';
  if (browserLang === 'zh-TW' || browserLang === 'zh-HK' || browserLang === 'zh-MO') return 'zh-TW';
  if (browserLang.startsWith('zh')) return 'zh-CN';
  return FALLBACK_LOCALE;
}

function detectLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY);
  if (isLocale(saved)) return saved;
  return FALLBACK_LOCALE;
}

function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function flattenStringFields(value: unknown, prefix = '', fields: Record<string, string> = {}) {
  if (typeof value === 'string') {
    const text = cleanText(value);
    if (prefix && text) fields[prefix] = text;
    return fields;
  }

  if (!value || typeof value !== 'object') return fields;

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flattenStringFields(item, prefix ? `${prefix}.${index}` : String(index), fields);
    });
    return fields;
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    flattenStringFields(item, prefix ? `${prefix}.${key}` : key, fields);
  });

  return fields;
}

function buildLocaleSectionSourceMap(sectionNames: readonly string[]): TranslationSourceMap {
  const sourceMessages = zhCN as Record<string, unknown>;
  return sectionNames.reduce<TranslationSourceMap>((acc, section) => {
    acc[section] = flattenStringFields(sourceMessages[section]);
    return acc;
  }, {});
}

function buildStoreSourceMap(settings: SiteSettings): TranslationSourceMap {
  const sourceMap = buildLocaleSectionSourceMap(STORE_SOURCE_SECTIONS);
  sourceMap.global = Object.entries(settings.storeForm).reduce<Record<string, string>>((acc, [key, value]) => {
    const text = cleanText(value);
    if (text) acc[key] = text;
    return acc;
  }, {});

  const navigationFields: Record<string, string> = {};
  settings.headerNavLinks.forEach((link) => {
    const text = cleanText(link.label);
    if (text) navigationFields[`header.${link.id}.label`] = text;
  });
  settings.footerLinkSections.forEach((section) => {
    const title = cleanText(section.title);
    if (title) navigationFields[`footer.${section.id}.title`] = title;
    section.links.forEach((link) => {
      const text = cleanText(link.label);
      if (text) navigationFields[`footer.${section.id}.${link.id}.label`] = text;
    });
  });
  sourceMap[STORE_NAVIGATION_SECTION] = navigationFields;

  return sourceMap;
}

function rowsToOverrides(rows: Awaited<ReturnType<typeof fetchContentTranslations>>, sourceMap: TranslationSourceMap) {
  return rows.reduce<Record<string, string>>((acc, row) => {
    if (!row.translated_text) return acc;
    if (!isTranslationRowFresh(row, sourceMap)) return acc;
    const prefix = row.entity_id === 'global' ? 'storeProfile' : row.entity_id;
    acc[`${prefix}.${row.field_name}`] = row.translated_text;
    return acc;
  }, {});
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'zh-CN',
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
  const [contentOverrides, setContentOverrides] = useState<Record<string, string>>({});

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_KEY, newLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (localStorage.getItem(LOCALE_KEY)) return;

    let ignore = false;
    fetchPublicSiteSettings()
      .then((settings) => {
        if (ignore || localStorage.getItem(LOCALE_KEY)) return;
        const configuredLocale = settings.storeForm.defaultLanguage;
        setLocaleState(isLocale(configuredLocale) ? configuredLocale : detectBrowserLocale());
      })
      .catch(() => {
        if (!ignore && !localStorage.getItem(LOCALE_KEY)) setLocaleState(detectBrowserLocale());
      });

    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadContentOverrides() {
      const settings = await fetchPublicSiteSettings();
      const groups: Array<{ type: TranslatableEntity; ids: string[] }> = [
        { type: 'ui', ids: [...UI_SOURCE_SECTIONS] },
        { type: 'store', ids: ['global', STORE_NAVIGATION_SECTION, ...STORE_SOURCE_SECTIONS] },
        { type: 'page', ids: [...PAGE_SOURCE_SECTIONS] },
      ];
      const sourceMap: TranslationSourceMap = {
        ...buildLocaleSectionSourceMap([...UI_SOURCE_SECTIONS, ...PAGE_SOURCE_SECTIONS]),
        ...buildStoreSourceMap(settings),
      };

      const results = await Promise.all(
        groups.map((group) => fetchContentTranslations(group.type, locale, group.ids, { includeSourceLocale: true })),
      );

      if (!ignore) {
        setContentOverrides(rowsToOverrides(results.flat(), sourceMap));
      }
    }

    loadContentOverrides().catch(() => {
      if (!ignore) setContentOverrides({});
    });

    return () => { ignore = true; };
  }, [locale]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text: string | undefined = contentOverrides[key] ?? getNestedValue(messages[locale], key);
    for (const fallbackLocale of fallbackLocales[locale]) {
      if (text !== undefined) break;
      text = getNestedValue(messages[fallbackLocale], key);
    }
    if (text === undefined) return key;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text!.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  }, [contentOverrides, locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
