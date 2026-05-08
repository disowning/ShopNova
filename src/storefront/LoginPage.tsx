import { useState } from 'react';
import { Eye, EyeOff, Zap, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { login } from '../lib/authService';
import { useAuth } from './AuthContext';
import { useStore } from './StoreContext';
import { useT } from '../i18n';

export default function LoginPage() {
  const { setUser } = useAuth();
  const { navigate } = useStore();
  const { t } = useT();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError(t('login.subtitle')); return; }
    setLoading(true);
    setError('');
    try {
      const user = await login({ email, password });
      setUser(user);
      navigate({ type: 'home' });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 relative overflow-hidden flex-shrink-0">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full" />
        </div>

        <div className="relative z-10">
          <button onClick={() => navigate({ type: 'home' })} className="flex items-center gap-2.5 mb-16">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">ShopNova</span>
          </button>

          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            {t('login.welcome')}
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed mb-10">
            {t('login.welcomeDesc')}
          </p>

          <div className="space-y-4">
            {[
              { icon: '🛍️', text: t('login.benefit1') },
              { icon: '❤️', text: t('login.benefit2') },
              { icon: '📦', text: t('login.benefit3') },
              { icon: '⚡', text: t('login.benefit4') },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-blue-100 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-blue-300/60 text-xs">
          © 2026 ShopNova. {t('login.testMode')}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        {/* Mobile logo */}
        <button onClick={() => navigate({ type: 'home' })} className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-xl font-black text-slate-900">Shop<span className="text-blue-600">Nova</span></span>
        </button>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-1">{t('login.title')}</h2>
            <p className="text-sm text-slate-500">
              {t('login.noAccount')}
              <button onClick={() => navigate({ type: 'register' })} className="text-blue-600 font-semibold hover:text-blue-700 ml-1">
                {t('login.registerNow')}
              </button>
            </p>
          </div>

          {/* Test account hint */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-xs text-amber-800">
            <div className="font-bold mb-1">{t('login.testAccount')}</div>
            <div>{t('login.normalUser')}<span className="font-mono">customer@test.com</span> / <span className="font-mono">123456</span></div>
            <div>{t('login.adminUser')}<span className="font-mono">admin@test.com</span> / <span className="font-mono">123456</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">{t('login.emailLabel')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="your@email.com"
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">{t('login.passwordLabel')}</label>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder={t('login.passwordPlaceholder')}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-200/60 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {loading ? t('login.submitting') : t('login.submit')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate({ type: 'home' })}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ← {t('login.backToStore')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
