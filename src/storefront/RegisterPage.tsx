import { useCallback, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  Zap,
} from 'lucide-react';
import { register } from '../lib/authService';
import { useAuth } from './AuthContext';
import { useStore } from './StoreContext';
import { useT } from '../i18n';
import GoogleSignInButton from './GoogleSignInButton';

function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  optional,
  endAdornment,
  optionalLabel,
  icon: Icon,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  optional?: boolean;
  endAdornment?: React.ReactNode;
  optionalLabel?: string;
  icon?: React.ElementType;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        {optional && <span className="text-xs text-slate-400">{optionalLabel}</span>}
      </div>
      <div className="relative">
        {Icon && <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-xl border py-3 text-sm placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
            Icon ? 'pl-10' : 'pl-4'
          } ${endAdornment ? 'pr-11' : 'pr-4'} ${
            error
              ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-500/20'
              : 'border-slate-200 bg-slate-50 focus:border-blue-400 focus:ring-blue-500/30'
          }`}
        />
        {endAdornment && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{endAdornment}</div>
        )}
      </div>
      {error && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle size={11} />{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const { setUser } = useAuth();
  const { navigate } = useStore();
  const { t } = useT();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const handleGoogleSuccess = useCallback((user: Parameters<typeof setUser>[0]) => {
    setUser(user);
    navigate({ type: 'account' });
  }, [navigate, setUser]);

  const handleGoogleError = useCallback((message: string) => {
    setGlobalError(message);
  }, []);

  const set = (k: keyof typeof form) => (v: string) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: '' }));
    setGlobalError('');
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = t('register.validation.usernameRequired');
    if (!form.email.trim()) errs.email = t('register.validation.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('register.validation.emailInvalid');
    if (!form.password) errs.password = t('register.validation.passwordRequired');
    else if (form.password.length < 6) errs.password = t('register.validation.passwordMin');
    if (!form.confirm) errs.confirm = t('register.validation.confirmRequired');
    else if (form.password !== form.confirm) errs.confirm = t('register.validation.confirmMismatch');
    if (!agree) errs.agree = '请先同意服务条款和隐私政策';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setGlobalError('');
    try {
      const user = await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      setUser(user);
      navigate({ type: 'account' });
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : t('register.failed'));
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthLabel = ['', t('register.strength.weak'), t('register.strength.medium'), t('register.strength.strong')];
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-500'];

  const requirements = [
    { label: '至少 6 位字符', ok: form.password.length >= 6 },
    { label: '两次输入一致', ok: Boolean(form.confirm) && form.password === form.confirm },
    { label: '邮箱格式正确', ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) },
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
            onClick={() => navigate({ type: 'login' })}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <User size={15} />
            {t('register.loginNow')}
          </button>
        </div>

        <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_460px]">
          <section className="hidden lg:block">
            <div className="mb-8 max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <Sparkles size={13} />
                {t('register.testMode')}
              </div>
              <h1 className="text-4xl font-black leading-tight text-slate-950">{t('register.title')}</h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">{t('register.subtitle')}</p>
            </div>

            <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                <ShieldCheck size={17} className="text-emerald-600" />
                注册后可使用的能力
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[t('register.benefit1'), t('register.benefit2'), t('register.benefit3'), t('register.benefit4')].map((item) => (
                  <div key={item} className="rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
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
                <h2 className="text-2xl font-black text-slate-950">{t('register.formTitle')}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t('register.hasAccount')}
                  <button
                    type="button"
                    onClick={() => navigate({ type: 'login' })}
                    className="ml-1 font-semibold text-blue-600 transition-colors hover:text-blue-700"
                  >
                    {t('register.loginNow')}
                  </button>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {globalError && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{globalError}</span>
                  </div>
                )}

                <Field label={t('register.usernameLabel')} value={form.name} onChange={set('name')} placeholder={t('register.usernamePlaceholder')} error={errors.name} icon={User} autoComplete="name" />
                <Field label={t('register.emailLabel')} type="email" value={form.email} onChange={set('email')} placeholder="your@email.com" error={errors.email} icon={Mail} autoComplete="email" />
                <Field label={t('register.phoneLabel')} type="tel" value={form.phone} onChange={set('phone')} placeholder="138 0000 0000" error={errors.phone} optional optionalLabel={t('register.optional')} icon={Phone} autoComplete="tel" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">{t('register.passwordLabel')}</label>
                    <div className="relative">
                      <LockKeyhole size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => set('password')(e.target.value)}
                        placeholder={t('register.passwordPlaceholder')}
                        autoComplete="new-password"
                        className={`w-full rounded-xl border py-3 pl-10 pr-11 text-sm placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${errors.password ? 'border-red-300 bg-red-50 focus:ring-red-500/20' : 'border-slate-200 bg-slate-50 focus:border-blue-400 focus:ring-blue-500/30'}`}
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle size={11} />{errors.password}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">{t('register.confirmLabel')}</label>
                    <div className="relative">
                      <LockKeyhole size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={form.confirm}
                        onChange={(e) => set('confirm')(e.target.value)}
                        placeholder={t('register.confirmPlaceholder')}
                        autoComplete="new-password"
                        className={`w-full rounded-xl border py-3 pl-10 pr-11 text-sm placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${errors.confirm ? 'border-red-300 bg-red-50 focus:ring-red-500/20' : 'border-slate-200 bg-slate-50 focus:border-blue-400 focus:ring-blue-500/30'}`}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.confirm && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle size={11} />{errors.confirm}</p>}
                  </div>
                </div>

                {form.password.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex flex-1 gap-1">
                        {[1, 2, 3].map((lvl) => (
                          <div key={lvl} className={`h-1 flex-1 rounded-full transition-all ${passwordStrength >= lvl ? strengthColor[passwordStrength] : 'bg-slate-200'}`} />
                        ))}
                      </div>
                      <span className={`text-xs font-semibold ${passwordStrength === 1 ? 'text-red-500' : passwordStrength === 2 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {strengthLabel[passwordStrength]}
                      </span>
                    </div>
                    <div className="grid gap-1 text-xs sm:grid-cols-3">
                      {requirements.map((item) => (
                        <div key={item.label} className={`flex items-center gap-1.5 ${item.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <CheckCircle2 size={12} />
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => { setAgree(e.target.checked); setErrors((prev) => ({ ...prev, agree: '' })); }}
                    className="mt-0.5 rounded border-slate-300 text-blue-600"
                  />
                  <span>
                    我已阅读并同意
                    <button type="button" onClick={() => navigate({ type: 'terms' })} className="mx-1 font-semibold text-blue-600 hover:text-blue-700">服务条款</button>
                    和
                    <button type="button" onClick={() => navigate({ type: 'privacy' })} className="mx-1 font-semibold text-blue-600 hover:text-blue-700">隐私政策</button>
                  </span>
                </label>
                {errors.agree && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle size={11} />{errors.agree}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  {loading ? t('register.submitting') : t('register.submit')}
                </button>
              </form>

              <div className="mt-5">
                <GoogleSignInButton
                  mode="signup"
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
