import { useState } from 'react';
import { Mail, ArrowRight, Check } from 'lucide-react';
import { useT } from '../i18n';

export default function NewsletterSection() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setEmail(''); }, 3000);
  };

  return (
    <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
      {/* Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl"></div>
        <div className="absolute -bottom-32 right-1/4 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl"></div>
      </div>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <Mail size={24} className="text-blue-400" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
          {t('newsletter.title')}
        </h2>
        <p className="text-slate-400 text-base mb-8 leading-relaxed">
          {t('newsletter.subtitle1')}
          <br className="hidden sm:block" />
          {t('newsletter.subtitle2')}
        </p>

        <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
          <div className="flex-1 relative">
            <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('newsletter.placeholder')}
              className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
            />
          </div>
          <button
            type="submit"
            className={`flex items-center gap-2 font-bold px-5 py-3.5 rounded-xl transition-all duration-200 whitespace-nowrap ${
              submitted
                ? 'bg-emerald-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {submitted ? (
              <>
                <Check size={15} /> {t('newsletter.subscribed')}
              </>
            ) : (
              <>
                {t('newsletter.subscribe')} <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-slate-600 mt-4">
          {t('newsletter.privacy')}
        </p>
      </div>
    </section>
  );
}
