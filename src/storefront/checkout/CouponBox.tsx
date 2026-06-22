import { useState } from 'react';
import { Tag, Check, X } from 'lucide-react';
import { useT } from '../../i18n';
import { useSiteSettings } from '../SiteSettingsContext';

const VALID_CODES: Record<string, number> = {
  WELCOME15: 0.15,
  SAVE10: 0.10,
  NOVA20: 0.20,
};

interface Props {
  subtotal: number;
  onDiscount: (amount: number, code: string) => void;
  onRemove: () => void;
  appliedCode: string;
  discountAmount: number;
}

export default function CouponBox({ subtotal, onDiscount, onRemove, appliedCode, discountAmount }: Props) {
  const { t } = useT();
  const { text } = useSiteSettings();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const currencySymbol = text('currencySymbol');

  const apply = () => {
    const code = input.trim().toUpperCase();
    if (!code) {
      setError(t('checkout.coupon.enterCode'));
      return;
    }
    setLoading(true);
    setError('');
    setTimeout(() => {
      const rate = VALID_CODES[code];
      if (rate) {
        const amount = Math.round(subtotal * rate * 100) / 100;
        onDiscount(amount, code);
        setInput('');
      } else {
        setError(t('checkout.coupon.invalidCode'));
      }
      setLoading(false);
    }, 600);
  };

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Check size={14} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-800">{t('checkout.coupon.applied')}</div>
            <div className="text-xs text-emerald-600">
              <span className="font-mono font-bold">{appliedCode}</span>
              <span> · {t('checkout.coupon.saved')} </span>
              <span className="font-black">{currencySymbol}{discountAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="w-7 h-7 rounded-full hover:bg-emerald-200 flex items-center justify-center text-emerald-600 transition-colors"
          aria-label={t('checkout.coupon.remove')}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && apply()}
            placeholder={t('checkout.coupon.placeholder')}
            className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 transition-all ${
              error ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-100 focus:border-blue-400'
            }`}
          />
        </div>
        <button
          type="button"
          onClick={apply}
          disabled={loading}
          className="px-4 py-2.5 text-sm font-bold bg-slate-900 hover:bg-blue-600 text-white rounded-xl transition-all disabled:opacity-60 whitespace-nowrap"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              {t('checkout.coupon.validating')}
            </span>
          ) : t('checkout.coupon.apply')}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 flex items-center gap-1 pl-1"><X size={11} />{error}</p>}
      <p className="text-[11px] text-slate-400 pl-1">
        {t('checkout.coupon.hint')}{' '}
        <button type="button" onClick={() => setInput('WELCOME15')} className="font-mono font-bold text-blue-500 hover:underline">WELCOME15</button>
      </p>
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-700">
        {t('checkout.coupon.demoNote')}
      </p>
    </div>
  );
}
