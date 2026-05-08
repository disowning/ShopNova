/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchPublicSiteSettings, mergeSiteSettings, type SiteSettings } from '../lib/siteSettings';
import { useT } from '../i18n';

interface SiteSettingsContextValue extends SiteSettings {
  loading: boolean;
  text: (key: keyof SiteSettings['storeForm']) => string;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null);

function ensureMeta(name: string, selector: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  return meta;
}

function updateFavicon(href: string) {
  if (!href) return;
  let link = document.head.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [settings, setSettings] = useState<SiteSettings>(() => mergeSiteSettings());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetchPublicSiteSettings()
      .then((next) => {
        if (!ignore) setSettings(next);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    const titleKey = 'storeProfile.siteTitle';
    const descriptionKey = 'storeProfile.siteDescription';
    const translatedTitle = t(titleKey);
    const translatedDescription = t(descriptionKey);
    const title = translatedTitle === titleKey ? settings.storeForm.siteTitle : translatedTitle;
    const description = translatedDescription === descriptionKey ? settings.storeForm.siteDescription : translatedDescription;

    if (title) {
      document.title = title;
      ensureMeta('title', "meta[name='title']").content = title;
      const ogTitle = ensureMeta('og:title', "meta[property='og:title']");
      ogTitle.setAttribute('property', 'og:title');
      ogTitle.content = title;
    }

    if (description) {
      ensureMeta('description', "meta[name='description']").content = description;
      const ogDescription = ensureMeta('og:description', "meta[property='og:description']");
      ogDescription.setAttribute('property', 'og:description');
      ogDescription.content = description;
      ensureMeta('twitter:description', "meta[name='twitter:description']").content = description;
    }

    updateFavicon(settings.storeForm.faviconUrl || settings.storeForm.logoUrl);
  }, [
    settings.storeForm.faviconUrl,
    settings.storeForm.logoUrl,
    settings.storeForm.siteDescription,
    settings.storeForm.siteTitle,
    t,
  ]);

  const value = useMemo<SiteSettingsContextValue>(() => ({
    ...settings,
    loading,
    text: (key) => {
      const translationKey = `storeProfile.${key}`;
      const translated = t(translationKey);
      return translated === translationKey ? settings.storeForm[key] : translated;
    },
  }), [loading, settings, t]);

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error('useSiteSettings must be used within SiteSettingsProvider');
  return ctx;
}
