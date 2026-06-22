import { useCallback, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  LockKeyhole,
  Mail,
  PackageCheck,
  ShieldCheck,
  Truck,
  UserPlus,
  Zap,
} from 'lucide-react';
import { login } from '../lib/authService';
import { useAuth } from './AuthContext';
import { useStore } from './StoreContext';
import { useT } from '../i18n';
import GoogleSignInButton from './GoogleSignInButton';

export default function LoginPage() {
  const { setUser } = useAuth();
  const { navigate } = useStore();
  const { t } = useT();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSuccess = useCallback((user: Parameters<typeof setUser>[0]) => {
    setUser(user);
    navigate({ type: 'home' });
  }, [navigate, setUser]);

  const handleGoogleError = useCallback((message: string) => {
    setError(message);
  }, []);

  const fillCustomerAccount = () => {
    setEmail('customer@test.com');
    setPassword('123456');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError(t('login.subtitle'));
      return;
    }
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

  const benefits = [
    { icon: PackageCheck, title: t('login.benefit1'), desc: '订单、支付和配送进度集中查看' },
    { icon: Heart, title: t('login.benefit2'), desc: '保留常用商品和个人偏好' },
    { icon: Truck, title: t('login.benefit3'), desc: '结算时更快填写收货信息' },
    { icon: ShieldCheck, title: t('login.benefit4'), desc: '账号信息用于演示环境权限识别' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate({ type: 'home' })} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <Zap size={18} />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">ShopNova</span>
          </button>
          <button
            onClick={() => navigate({ type: 'register' })}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <UserPlus size={15} />
            {t('login.registerNow')}
          </button>
        </div>

        <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="hidden lg:block">
            <div className="mb-8 max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                <ShieldCheck size={13} />
                {t('login.testMode')}
              </div>
              <h1 className="text-4xl font-black leading-tight text-slate-950">{t('login.welcome')}</h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">{t('login.welcomeDesc')}</p>
            </div>
            <div className="grid max-w-2xl grid-cols-2 gap-3">
              {benefits.map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <item.icon size={17} />
                  </div>
                  <div className="text-sm font-bold text-slate-900">{item.title}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="w-full">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
              <button
                onClick={() => navigate({ type: 'home' })}
                className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-700"
              >
                <ArrowLeft size={13} />
                {t('common.backToHome')}
              </button>

              <div className="mb-7">
                <h2 className="text-2xl font-black text-slate-950">{t('login.title')}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t('login.noAccount')}
                  <button
                    type="button"
                    onClick={() => navigate({ type: 'register' })}
                    className="ml-1 font-semibold text-blue-600 transition-colors hover:text-blue-700"
                  >
                    {t('login.registerNow')}
                  </button>
                </p>
              </div>

              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-amber-900">{t('login.testAccount')}</div>
                    <div className="mt-1 text-xs text-amber-800">
                      <span>{t('login.normalUser')}</span>
                      <span className="font-mono">customer@test.com / 123456</span>
                    </div>
                    <div className="mt-1 text-[11px] text-amber-700">管理后台请从商城顶部头像菜单进入。</div>
                  </div>
                  <button
                    type="button"
                    onClick={fillCustomerAccount}
                    className="shrink-0 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-600"
                  >
                    填入
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">{t('login.emailLabel')}</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="your@email.com"
                      autoComplete="email"
                      autoFocus
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm placeholder-slate-400 transition-all focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">{t('login.passwordLabel')}</label>
                  <div className="relative">
                    <LockKeyhole size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      placeholder={t('login.passwordPlaceholder')}
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-sm placeholder-slate-400 transition-all focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  {loading ? t('login.submitting') : t('login.submit')}
                </button>
              </form>

              <div className="mt-5">
                <GoogleSignInButton
                  mode="signin"
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
