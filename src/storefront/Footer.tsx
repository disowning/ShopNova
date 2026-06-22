import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { useStore } from './StoreContext';
import { fetchCategories } from '../lib/productService';
import type { Category } from './types';
import { useT } from '../i18n';
import { getCategoryName } from './categoryLabels';
import { useSiteSettings } from './SiteSettingsContext';
import type { StoreFooterLink } from '../lib/siteSettings';
import { editableAttrs } from './visualEditor';

export default function Footer() {
  const { navigate } = useStore();
  const { t, locale } = useT();
  const { text, storeForm, footerLinkSections, footerSectionTitle, footerLinkLabel } = useSiteSettings();
  const [categories, setCategories] = useState<Category[]>([]);
  const socialLinks = [
    { label: 'X', url: storeForm.socialX },
    { label: 'IG', url: storeForm.socialInstagram },
    { label: 'YT', url: storeForm.socialYoutube },
  ].filter((item) => item.url.trim());
  const editStore = (entryId: string, settingKey: string, label: string) => editableAttrs({
    entryId,
    source: 'siteSettings',
    settingSection: 'storeForm',
    settingKey,
    label,
  });
  const editFooterNavigation = (label: string) => editableAttrs({
    entryId: 'footer.navigation',
    source: 'siteSettings',
    settingSection: 'footerLinkSections',
    settingKey: 'all',
    label,
  });

  useEffect(() => {
    fetchCategories(locale).then(setCategories);
  }, [locale]);

  const navigateFooterLink = (link: StoreFooterLink, displayLabel?: string) => {
    if (link.target === 'home') navigate({ type: 'home' });
    if (link.target === 'products') navigate({ type: 'listing' });
    if (link.target === 'new-arrivals') navigate({ type: 'listing', title: displayLabel || t('common.newArrivals') });
    if (link.target === 'hot-deals') navigate({ type: 'listing', title: displayLabel || t('common.hotDeals') });
    if (link.target === 'flash-sale') navigate({ type: 'listing', title: displayLabel || t('common.flashSale'), filter: 'flashSale' });
    if (link.target === 'brand-story') navigate({ type: 'brand-story' });
    if (link.target === 'contact-us') navigate({ type: 'contact-us' });
    if (link.target === 'order-lookup') navigate({ type: 'order-lookup' });
    if (link.target === 'return-policy') navigate({ type: 'return-policy' });
    if (link.target === 'logistics') navigate({ type: 'logistics' });
    if (link.target === 'faq') navigate({ type: 'faq' });
    if (link.target === 'careers') navigate({ type: 'careers' });
    if (link.target === 'media-cooperation') navigate({ type: 'media-cooperation' });
    if (link.target === 'privacy') navigate({ type: 'privacy' });
    if (link.target === 'terms') navigate({ type: 'terms' });
    if (link.target === 'cookies') navigate({ type: 'cookies' });
    if (link.target === 'payment-security') navigate({ type: 'payment-security' });
    if (link.target === 'custom' && link.url) window.location.href = link.url;
  };

  const legalLinks = footerLinkSections
    .flatMap((section) => section.links.map((link) => ({ sectionId: section.id, link })))
    .filter(({ link }) => link.enabled && ['privacy', 'terms', 'cookies', 'payment-security'].includes(link.target));

  return (
    <footer className="bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <button onClick={() => navigate({ type: 'home' })} className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <Zap size={17} className="text-white" />
              </div>
              <span
                className="text-xl font-black tracking-tight"
                {...editStore('header.storeShortName', 'storeShortName', '页脚品牌简称')}
              >
                {text('storeShortName')}
              </span>
            </button>
            <p
              className="text-slate-400 text-sm leading-relaxed mb-5 max-w-xs"
              {...editStore('footer.description', 'footerDescription', '页脚品牌简介')}
            >
              {text('footerDescription')}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-lg bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-blue-600 flex items-center justify-center transition-all duration-200 text-slate-400 hover:text-white text-xs font-bold"
                    {...editStore('footer.social', social.label === 'X' ? 'socialX' : social.label === 'IG' ? 'socialInstagram' : 'socialYoutube', '页脚社交链接')}
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Categories */}
          <div>
            <div className="text-sm font-bold text-white mb-4">{t('footer.categories')}</div>
            <ul className="space-y-2.5">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => navigate({ type: 'listing', categoryId: cat.id, categoryName: getCategoryName(t, cat.id, cat.name) })}
                    className="text-sm text-slate-400 hover:text-white transition-colors duration-150 text-left"
                  >
                    {getCategoryName(t, cat.id, cat.name)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {footerLinkSections.map((section) => {
            const visibleLinks = section.links.filter((link) => link.enabled && link.label.trim());
            if (visibleLinks.length === 0) return null;
            return (
              <div key={section.id}>
                <div className="text-sm font-bold text-white mb-4" {...editFooterNavigation('页脚导航分组标题')}>{footerSectionTitle(section)}</div>
                <ul className="space-y-2.5">
                  {visibleLinks.map((link) => {
                    const label = footerLinkLabel(section.id, link);
                    return (
                      <li key={link.id}>
                        <button
                          onClick={() => navigateFooterLink(link, label)}
                          className="text-sm text-slate-400 hover:text-white transition-colors duration-150 text-left"
                          {...editFooterNavigation('页脚导航链接')}
                        >
                          {label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            <p {...editStore('footer.copyright', 'copyrightText', '页脚版权文字')}>{text('copyrightText')}</p>
            {storeForm.icpNumber && (
              <p className="mt-1" {...editStore('footer.copyright', 'icpNumber', '页脚备案号')}>
                {storeForm.icpNumber}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {legalLinks.map(({ sectionId, link }) => (
              <button
                key={link.id}
                onClick={() => navigateFooterLink(link, footerLinkLabel(sectionId, link))}
                className="text-xs text-slate-500 hover:text-white transition-colors"
                {...editFooterNavigation('页脚底部政策链接')}
              >
                {footerLinkLabel(sectionId, link)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {['Visa', 'MC', 'PayPal', 'AliPay'].map((p) => (
              <span key={p} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-bold text-slate-500">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
