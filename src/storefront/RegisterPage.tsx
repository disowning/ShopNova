import { useState } from 'react';
import { Eye, EyeOff, Zap, UserPlus, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { register } from '../lib/authService';
import { useAuth } from './AuthContext';
import { useStore } from './StoreContext';
import { useT } from '../i18n';

function Field({
  label, type = 'text', value, onChange, placeholder, error, optional, endAdornment, optionalLabel,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  error?: string; optional?: boolean; endAdornment?: React.ReactNode;
  optionalLabel?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        {optional && <span className="text-xs text-slate-400">{optionalLabel}</span>}
      </div>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 ${endAdornment ? 'pr-11' : ''} rounded-xl border text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
            error
              ? 'border-red-300 bg-red-50 focus:ring-red-500/20 focus:border-red-400'
              : 'border-slate-200 bg-slate-50 focus:ring-blue-500/30 focus:border-blue-400'
          }`}
        />
        {endAdornment && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{endAdornment}</div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-white/5 rounded-full" />
        </div>

        <div className="relative z-10">
          <button onClick={() => navigate({ type: 'home' })} className="flex items-center gap-2.5 mb-16">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">ShopNova</span>
          </button>

          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            {t('register.title')}
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed mb-10">
            {t('register.subtitle')}
          </p>

          <div className="space-y-4">
            {[
              { icon: '🎁', text: t('register.benefit1') },
              { icon: '📱', text: t('register.benefit2') },
              { icon: '🔒', text: t('register.benefit3') },
              { icon: '🌟', text: t('register.benefit4') },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-blue-100 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-blue-300/60 text-xs">© 2026 ShopNova. {t('register.testMode')}</div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 overflow-y-auto">
        <button onClick={() => navigate({ type: 'home' })} className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-xl font-black text-slate-900">Shop<span className="text-blue-600">Nova</span></span>
        </button>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-1">{t('register.formTitle')}</h2>
            <p className="text-sm text-slate-500">
              {t('register.hasAccount')}
              <button onClick={() => navigate({ type: 'login' })} className="text-blue-600 font-semibold hover:text-blue-700 ml-1">
                {t('register.loginNow')}
              </button>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {globalError && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{globalError}</span>
              </div>
            )}

            <Field label={t('register.usernameLabel')} value={form.name} onChange={set('name')} placeholder={t('register.usernamePlaceholder')} error={errors.name} />
            <Field label={t('register.emailLabel')} type="email" value={form.email} onChange={set('email')} placeholder="your@email.com" error={errors.email} />
            <Field label={t('register.phoneLabel')} type="tel" value={form.phone} onChange={set('phone')} placeholder="138 0000 0000" error={errors.phone} optional optionalLabel={t('register.optional')} />

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">{t('register.passwordLabel')}</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password')(e.target.value)}
                  placeholder={t('register.passwordPlaceholder')}
                  className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${errors.password ? 'border-red-300 bg-red-50 focus:ring-red-500/20' : 'border-slate-200 bg-slate-50 focus:ring-blue-500/30 focus:border-blue-400'}`}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3].map((lvl) => (
                      <div key={lvl} className={`flex-1 h-1 rounded-full transition-all ${passwordStrength >= lvl ? strengthColor[passwordStrength] : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <span className={`text-xs font-semibold ${passwordStrength === 1 ? 'text-red-500' : passwordStrength === 2 ? 'text-amber-500' : 'text-emerald-600'}`}>
                    {strengthLabel[passwordStrength]}
                  </span>
                </div>
              )}
              {errors.password && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={11} />{errors.password}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">{t('register.confirmLabel')}</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={(e) => set('confirm')(e.target.value)}
                  placeholder={t('register.confirmPlaceholder')}
                  className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${errors.confirm ? 'border-red-300 bg-red-50 focus:ring-red-500/20' : 'border-slate-200 bg-slate-50 focus:ring-blue-500/30 focus:border-blue-400'}`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.confirm && form.password === form.confirm && (
                <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} />{t('register.passwordMatch')}</p>
              )}
              {errors.confirm && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={11} />{errors.confirm}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-200/60 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {loading ? t('register.submitting') : t('register.submit')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => navigate({ type: 'home' })} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              ← {t('register.backToStore')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
