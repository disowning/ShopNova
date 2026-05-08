import { ChevronRight, Shield } from 'lucide-react';
import { useT } from '../i18n';
import { useStore } from './StoreContext';

const sections = ['collect', 'use', 'share', 'cookies', 'security', 'rights', 'minors', 'updates', 'contact'];

export default function PrivacyPolicy() {
  const { navigate } = useStore();
  const { t } = useT();

  return (
    <div className="bg-white min-h-screen">
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <button onClick={() => navigate({ type: 'home' })} className="hover:text-white transition-colors">{t('common.home')}</button>
            <ChevronRight size={12} />
            <span className="text-slate-300">{t('legal.privacy.title')}</span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <Shield size={22} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black">{t('legal.privacy.title')}</h1>
              <p className="text-slate-400 text-sm mt-1">{t('legal.updated')}</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">{t('legal.privacy.intro')}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex gap-12">
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <div className="sticky top-24">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{t('legal.toc')}</div>
              <nav className="space-y-1">
                {sections.map((key, i) => (
                  <a key={key} href={`#privacy-${key}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 py-1 transition-colors group">
                    <span className="text-[10px] font-bold text-slate-300 group-hover:text-blue-400 w-4">{i + 1}.</span>
                    {t(`legal.privacy.sections.${key}.title`)}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <article className="flex-1 min-w-0">
            {sections.map((key) => (
              <section id={`privacy-${key}`} key={key} className="mb-10">
                <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-blue-600 rounded-full inline-block" />
                  {t(`legal.privacy.sections.${key}.title`)}
                </h2>
                <div className="text-slate-600 text-sm leading-[1.85] space-y-3">
                  <p>{t(`legal.privacy.sections.${key}.body`)}</p>
                </div>
              </section>
            ))}

            <div className="border-t border-slate-100 pt-8 flex flex-wrap gap-3">
              <button onClick={() => navigate({ type: 'terms' })} className="text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors">{t('legal.terms.title')}</button>
              <button onClick={() => navigate({ type: 'cookies' })} className="text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors">{t('footer.cookieSettings')}</button>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
