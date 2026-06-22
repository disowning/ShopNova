import { ChevronRight, FileText } from 'lucide-react';
import { useT } from '../i18n';
import { useStore } from './StoreContext';
import { useCmsContent } from './CmsContentContext';
import { editableAttrs } from './visualEditor';

const sections = ['service', 'account', 'products', 'orders', 'shipping', 'returns', 'prohibited', 'ip', 'disclaimer', 'law', 'changes', 'contact'];

function editTerms(fieldKey: string, label: string) {
  return editableAttrs({
    entryId: 'policy.terms',
    source: 'cms',
    itemId: 'terms-of-service',
    fieldKey,
    label,
  });
}

export default function TermsOfService() {
  const { navigate } = useStore();
  const { t } = useT();
  const { field } = useCmsContent();
  const title = field('terms-of-service', 'title', t('legal.terms.title'));
  const intro = field('terms-of-service', 'intro', t('legal.terms.intro'));
  const updatedAt = field('terms-of-service', 'updatedAt', t('legal.updated'));

  return (
    <div className="bg-white min-h-screen">
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <button onClick={() => navigate({ type: 'home' })} className="hover:text-white transition-colors">{t('common.home')}</button>
            <ChevronRight size={12} />
            <span className="text-slate-300">{title}</span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <FileText size={22} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black" {...editTerms('title', '服务条款标题')}>{title}</h1>
              <p className="text-slate-400 text-sm mt-1" {...editTerms('updatedAt', '服务条款更新时间')}>{updatedAt}</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed" {...editTerms('intro', '服务条款简介')}>{intro}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex gap-12">
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <div className="sticky top-24">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{t('legal.toc')}</div>
              <nav className="space-y-1">
                {sections.map((key, i) => {
                  const sectionTitle = field('terms-of-service', `${key}Title`, t(`legal.terms.sections.${key}.title`));
                  return (
                    <a key={key} href={`#terms-${key}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 py-1 transition-colors group">
                      <span className="text-[10px] font-bold text-slate-300 group-hover:text-indigo-400 w-4">{i + 1}.</span>
                      <span {...editTerms(`${key}Title`, '服务条款目录标题')}>{sectionTitle}</span>
                    </a>
                  );
                })}
              </nav>
            </div>
          </aside>

          <article className="flex-1 min-w-0">
            {sections.map((key) => {
              const sectionTitle = field('terms-of-service', `${key}Title`, t(`legal.terms.sections.${key}.title`));
              const sectionBody = field('terms-of-service', `${key}Body`, t(`legal.terms.sections.${key}.body`));
              return (
                <section id={`terms-${key}`} key={key} className="mb-10">
                  <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 bg-indigo-600 rounded-full inline-block" />
                    <span {...editTerms(`${key}Title`, '服务条款段落标题')}>{sectionTitle}</span>
                  </h2>
                  <div className="text-slate-600 text-sm leading-[1.85] space-y-3">
                    <p {...editTerms(`${key}Body`, '服务条款段落正文')}>{sectionBody}</p>
                  </div>
                </section>
              );
            })}

            <div className="border-t border-slate-100 pt-8 flex flex-wrap gap-3">
              <button onClick={() => navigate({ type: 'privacy' })} className="text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors">{t('legal.privacy.title')}</button>
              <button onClick={() => navigate({ type: 'cookies' })} className="text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors">{t('footer.cookieSettings')}</button>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
