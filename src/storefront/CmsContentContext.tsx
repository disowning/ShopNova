/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useT } from '../i18n';
import { fetchPublicCmsContent, getCmsField, getCmsItem, mergeCmsContent, type CmsContentState } from '../lib/cmsContent';
import { fetchTranslationLookup, SOURCE_LOCALE, type TranslationLookup, type TranslationSourceMap } from '../lib/translationService';

interface CmsContentContextValue {
  content: CmsContentState;
  loading: boolean;
  editorMode: boolean;
  field: (itemId: string, fieldKey: string, fallback: string) => string;
}

const CmsContentContext = createContext<CmsContentContextValue | null>(null);

function buildCmsSourceMap(content: CmsContentState): TranslationSourceMap {
  return content.items.reduce<TranslationSourceMap>((acc, item) => {
    acc[item.id] = item.fields.reduce<Record<string, string>>((fields, field) => {
      fields[field.key] = field.value;
      return fields;
    }, {});
    return acc;
  }, {});
}

export function CmsContentProvider({ children, editorMode = false }: { children: ReactNode; editorMode?: boolean }) {
  const { locale } = useT();
  const [content, setContent] = useState<CmsContentState>(() => mergeCmsContent());
  const [translations, setTranslations] = useState<TranslationLookup>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    async function loadContent() {
      const next = await fetchPublicCmsContent();
      const nextTranslations = locale === SOURCE_LOCALE
        ? {}
        : await fetchTranslationLookup('cms', locale, next.items.map((item) => item.id), buildCmsSourceMap(next));

      if (!ignore) {
        setContent(next);
        setTranslations(nextTranslations);
      }
    }

    loadContent()
      .catch(() => {
        if (!ignore) setTranslations({});
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [locale]);

  const value = useMemo<CmsContentContextValue>(() => ({
    content,
    loading,
    editorMode,
    field: (itemId, fieldKey, fallback) => {
      const item = getCmsItem(content, itemId);
      if (!item || (!editorMode && item.status !== 'published')) return fallback;

      const value = item.fields.find((entry) => entry.key === fieldKey)?.value?.trim();
      if (editorMode) return value || fallback;

      return translations[itemId]?.[fieldKey]?.trim() || getCmsField(content, itemId, fieldKey, fallback);
    },
  }), [content, editorMode, loading, translations]);

  return (
    <CmsContentContext.Provider value={value}>
      {children}
    </CmsContentContext.Provider>
  );
}

export function useCmsContent() {
  const ctx = useContext(CmsContentContext);
  if (!ctx) throw new Error('useCmsContent must be used within CmsContentProvider');
  return ctx;
}
