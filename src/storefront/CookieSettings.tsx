import { useState } from 'react';
import { ChevronRight, Cookie, Check, Info, ChevronDown } from 'lucide-react';
import { useStore } from './StoreContext';
import { useT } from '../i18n';
import { useCmsContent } from './CmsContentContext';
import { editableAttrs } from './visualEditor';

interface CookieCategory {
  id: 'necessary' | 'functional' | 'analytics' | 'marketing';
  required: boolean;
  defaultEnabled: boolean;
}

const cookieCategories: CookieCategory[] = [
  { id: 'necessary', required: true, defaultEnabled: true },
  { id: 'functional', required: false, defaultEnabled: true },
  { id: 'analytics', required: false, defaultEnabled: true },
  { id: 'marketing', required: false, defaultEnabled: false },
];

function editCookie(fieldKey: string, label: string) {
  return editableAttrs({
    entryId: 'policy.cookies',
    source: 'cms',
    itemId: 'cookie-settings',
    fieldKey,
    label,
  });
}

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
        enabled ? 'bg-blue-600' : 'bg-slate-200'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );
}

function CategoryCard({ cat, enabled, onChange }: { cat: CookieCategory; enabled: boolean; onChange: () => void }) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  const exampleKeys = ['example1', 'example2', 'example3'];

  return (
    <div className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${enabled ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 bg-white'}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-sm font-bold text-slate-900">{t(`cookie.categories.${cat.id}.name`)}</h3>
              {cat.required && (
                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{t('cookie.required')}</span>
              )}
              {enabled && !cat.required && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Check size={9} />{t('cookie.enabled')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{t(`cookie.categories.${cat.id}.description`)}</p>
          </div>
          <Toggle enabled={enabled} onChange={onChange} disabled={cat.required} />
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors"
        >
          <Info size={12} />
          {expanded ? t('cookie.hideDetails') : t('cookie.viewDetails')}
          <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">{t(`cookie.categories.${cat.id}.details`)}</p>
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">{t('cookie.examplesTitle')}</div>
            <div className="space-y-1.5">
              {exampleKeys.map((exampleKey) => (
                <div key={exampleKey} className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                  {t(`cookie.categories.${cat.id}.${exampleKey}`)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CookieSettings() {
  const { navigate } = useStore();
  const { t } = useT();
  const { field } = useCmsContent();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(cookieCategories.map((c) => [c.id, c.defaultEnabled]))
  );
  const [saved, setSaved] = useState(false);
  const title = field('cookie-settings', 'title', t('cookie.title'));
  const subtitle = field('cookie-settings', 'subtitle', t('cookie.subtitle'));
  const intro = field('cookie-settings', 'intro', t('cookie.intro'));

  const markSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggle = (id: string) => {
    const cat = cookieCategories.find((c) => c.id === id);
    if (cat?.required) return;
    setPrefs((prev) => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  };

  const acceptAll = () => {
    setPrefs(Object.fromEntries(cookieCategories.map((c) => [c.id, true])));
    markSaved();
  };

  const rejectOptional = () => {
    setPrefs(Object.fromEntries(cookieCategories.map((c) => [c.id, c.required])));
    markSaved();
  };

  const enabledCount = Object.values(prefs).filter(Boolean).length;

  return (
    <div className="bg-white min-h-screen">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <button onClick={() => navigate({ type: 'home' })} className="hover:text-white transition-colors">{t('common.home')}</button>
            <ChevronRight size={12} />
            <span className="text-slate-300">{title}</span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <Cookie size={22} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black" {...editCookie('title', 'Cookie 页面标题')}>{title}</h1>
              <p className="text-slate-400 text-sm mt-1" {...editCookie('subtitle', 'Cookie 页面副标题')}>{subtitle}</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed" {...editCookie('intro', 'Cookie 页面说明')}>{intro}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 mb-8">
          <div className="text-sm text-slate-600">
            {t('cookie.enabledCount', { enabled: enabledCount, total: cookieCategories.length })}
          </div>
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-semibold">
              <Check size={14} />{t('cookie.saved')}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={acceptAll}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Check size={14} />{t('cookie.acceptAll')}
          </button>
          <button
            onClick={rejectOptional}
            className="flex items-center gap-1.5 border-2 border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            {t('cookie.necessaryOnly')}
          </button>
        </div>

        <div className="space-y-4 mb-8">
          {cookieCategories.map((cat) => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              enabled={prefs[cat.id]}
              onChange={() => toggle(cat.id)}
            />
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={markSaved}
            className={`flex items-center gap-2 text-sm font-bold px-7 py-3 rounded-xl transition-all ${
              saved ? 'bg-emerald-500 text-white' : 'bg-slate-900 hover:bg-blue-600 text-white shadow-lg'
            }`}
          >
            {saved ? <><Check size={15} />{t('cookie.savedButton')}</> : t('cookie.savePrefs')}
          </button>
          <p className="text-xs text-slate-400">{t('cookie.changeAnytime')}</p>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-100 space-y-4">
          <h2 className="text-base font-bold text-slate-800">{t('cookie.whatTitle')}</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{t('cookie.whatP1')}</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t('cookie.whatP2')}
            <button onClick={() => navigate({ type: 'privacy' })} className="text-blue-600 hover:underline font-medium mx-1">{t('footer.privacyPolicy')}</button>
          </p>
        </div>

        <div className="border-t border-slate-100 pt-8 mt-8 flex flex-wrap gap-3">
          <button onClick={() => navigate({ type: 'privacy' })} className="text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors">{t('footer.privacyPolicy')}</button>
          <button onClick={() => navigate({ type: 'terms' })} className="text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors">{t('footer.termsOfService')}</button>
        </div>
      </div>
    </div>
  );
}
