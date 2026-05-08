import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { useStore } from './StoreContext';
import { fetchCategories } from '../lib/productService';
import type { Category } from './types';
import { useT } from '../i18n';
import { getCategoryName } from './categoryLabels';
import { useSiteSettings } from './SiteSettingsContext';

export default function Footer() {
  const { navigate } = useStore();
  const { t, locale } = useT();
  const { text, storeForm } = useSiteSettings();
  const [categories, setCategories] = useState<Category[]>([]);
  const socialLinks = [
    { label: 'X', url: storeForm.socialX },
    { label: 'IG', url: storeForm.socialInstagram },
    { label: 'YT', url: storeForm.socialYoutube },
  ].filter((item) => item.url.trim());

  useEffect(() => {
    fetchCategories(locale).then(setCategories);
  }, [locale]);

  return (
    <footer className="bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <button onClick={() => navigate({ type: 'home' })} className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <Zap size={17} className="text-white" />
              </div>
              <span className="text-xl font-black tracking-tight">{text('storeShortName')}</span>
            </button>
            <p className="text-slate-400 text-sm leading-relaxed mb-5 max-w-xs">
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

          {/* Customer service */}
          <div>
            <div className="text-sm font-bold text-white mb-4">{t('footer.customerService')}</div>
            <ul className="space-y-2.5">
              <li><button onClick={() => navigate({ type: 'order-lookup' })} className="text-sm text-slate-400 hover:text-white transition-colors duration-150 text-left">{t('footer.orderLookup')}</button></li>
              <li><button onClick={() => navigate({ type: 'return-policy' })} className="text-sm text-slate-400 hover:text-white transition-colors duration-150 text-left">{t('footer.returnPolicy')}</button></li>
              <li><button onClick={() => navigate({ type: 'logistics' })} className="text-sm text-slate-400 hover:text-white transition-colors duration-150 text-left">{t('footer.logistics')}</button></li>
              <li><button onClick={() => navigate({ type: 'faq' })} className="text-sm text-slate-400 hover:text-white transition-colors duration-150 text-left">{t('footer.faq')}</button></li>
              <li><button onClick={() => navigate({ type: 'contact-us' })} className="text-sm text-slate-400 hover:text-white transition-colors duration-150 text-left">{t('footer.contactSupport')}</button></li>
              <li><button onClick={() => navigate({ type: 'contact-us' })} className="text-sm text-slate-400 hover:text-white transition-colors duration-150 text-left">{t('footer.liveChat')}</button></li>
            </ul>
          </div>

          {/* About */}
          <div>
            <div className="text-sm font-bold text-white mb-4">{t('footer.aboutUs')}</div>
            <ul className="space-y-2.5">
              <li><button onClick={() => navigate({ type: 'brand-story' })} className="text-sm text-slate-400 hover:text-white transition-colors duration-150 text-left">{t('footer.brandStory')}</button></li>
              <li><button onClick={() => navigate({ type: 'contact-us' })} className="text-sm text-slate-400 hover:text-white transition-colors duration-150 text-left">{t('footer.contactUs')}</button></li>
              <li><button onClick={() => navigate({ type: 'careers' })} className="text-sm text-slate-400 hover:text-white transition-colors duration-150 text-left">{t('footer.careers')}</button></li>
              <li><button onClick={() => navigate({ type: 'media-cooperation' })} className="text-sm text-slate-400 hover:text-white transition-colors duration-150 text-left">{t('footer.mediaCooperation')}</button></li>
              <li><button onClick={() => navigate({ type: 'privacy' })} className="text-sm text-slate-400 hover:text-white transition-colors duration-150 text-left">{t('footer.privacyPolicy')}</button></li>
              <li><button onClick={() => navigate({ type: 'terms' })} className="text-sm text-slate-400 hover:text-white transition-colors duration-150 text-left">{t('footer.termsOfService')}</button></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            <p>{text('copyrightText')}</p>
            {storeForm.icpNumber && <p className="mt-1">{storeForm.icpNumber}</p>}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate({ type: 'privacy' })} className="text-xs text-slate-500 hover:text-white transition-colors">{t('footer.privacyPolicy')}</button>
            <button onClick={() => navigate({ type: 'terms' })} className="text-xs text-slate-500 hover:text-white transition-colors">{t('footer.termsOfService')}</button>
            <button onClick={() => navigate({ type: 'cookies' })} className="text-xs text-slate-500 hover:text-white transition-colors">{t('footer.cookieSettings')}</button>
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
