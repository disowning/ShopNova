import { CreditCard, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useT } from '../../i18n';
import FormField from './FormField';
import type { StorefrontPaymentOption } from '../../lib/paymentSettings';

export type PaymentMethod = 'card' | 'stripe' | 'paypal' | 'cod';

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  icon: React.ReactNode;
  notice?: string;
}

export interface CardData {
  name: string;
  number: string;
  expiry: string;
  cvv: string;
}

interface Props {
  method: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  cardData: CardData;
  onCardChange: (field: keyof CardData, value: string) => void;
  errors: Partial<Record<keyof CardData, string>>;
  options?: StorefrontPaymentOption[];
  loading?: boolean;
}

function formatCardNumber(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length >= 3) return d.slice(0, 2) + ' / ' + d.slice(2);
  return d;
}

export default function PaymentMethodSelector({ method, onChange, cardData, onCardChange, errors, options, loading = false }: Props) {
  const { t } = useT();
  const [showCvv, setShowCvv] = useState(false);

  const fallbackOptions: StorefrontPaymentOption[] = [
    {
      id: 'card',
      providerId: 'dev_card',
      label: t('checkout.payment.card'),
      notice: t('checkout.payment.demoNotice'),
    },
    {
      id: 'cod',
      providerId: 'cod',
      label: t('checkout.payment.cod'),
      notice: t('checkout.payment.codNotice'),
    },
  ];

  const cardIcon = (
    <svg className="w-6 h-5" viewBox="0 0 36 24" fill="none">
      <rect width="36" height="24" rx="4" fill="#1A1F71" />
      <rect x="0" y="8" width="36" height="5" fill="#F7B600" />
      <rect x="4" y="15" width="10" height="2" rx="1" fill="white" opacity="0.7" />
    </svg>
  );

  const iconMap: Record<PaymentMethod, React.ReactNode> = {
    card: cardIcon,
    stripe: cardIcon,
    paypal: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <path d="M7.5 19.5l1-6H6l.5-3h2.5l.5-3C10 5 11.5 4 13.5 4c1 0 2.5.5 2.5.5l-.5 3s-1-.3-1.5-.3c-1 0-1.5.5-1.5 1.5L12 11h2.5l-.5 3H11.5l-1 5.5H7.5z" fill="#009cde" />
        <path d="M14 7.5s2.5-.5 3 1.5c.5 2-1 3.5-3 4H12l-1 6h-2l1.5-9h2.5c2 0 3-1 3-2.5z" fill="#003087" />
      </svg>
    ),
    cod: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M8 14h.01M12 14h.01" strokeLinecap="round" />
      </svg>
    ),
  };

  const sourceOptions = options ?? fallbackOptions;
  const paymentOptions: PaymentOption[] = sourceOptions.map((option) => ({
    id: option.id,
    label: option.label,
    notice: option.notice,
    icon: iconMap[option.id],
  }));

  return (
    <div className="space-y-2.5">
      {loading && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          {t('checkout.payment.loading')}
        </div>
      )}
      {!loading && paymentOptions.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <div className="font-bold">{t('checkout.payment.unavailableTitle')}</div>
          <p className="mt-1 text-xs leading-5 text-amber-700">{t('checkout.payment.unavailableDesc')}</p>
        </div>
      )}
      {paymentOptions.map((opt) => {
        const isSelected = method === opt.id;
        return (
          <div key={opt.id}>
            <button
              type="button"
              onClick={() => onChange(opt.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/60 shadow-sm shadow-blue-100'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
              }`}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className={`flex-shrink-0 ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>{opt.icon}</div>
              <span className={`text-sm font-semibold ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>{opt.label}</span>
            </button>

            {isSelected && opt.id === 'card' && (
              <div className="mt-2 bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
                  <CreditCard size={13} className="flex-shrink-0 mt-0.5" />
                  <span>{opt.notice || t('checkout.payment.demoNotice')}</span>
                </div>

                <FormField
                  label={t('checkout.payment.cardholderName')}
                  required
                  placeholder={t('checkout.payment.cardholderPlaceholder')}
                  value={cardData.name}
                  onChange={(e) => onCardChange('name', (e.target as HTMLInputElement).value)}
                  error={errors.name}
                />

                <FormField
                  label={t('checkout.payment.cardNumber')}
                  required
                  placeholder="4242 4242 4242 4242"
                  value={cardData.number}
                  onChange={(e) => onCardChange('number', formatCardNumber((e.target as HTMLInputElement).value))}
                  error={errors.number}
                  maxLength={19}
                  inputMode="numeric"
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    label={t('checkout.payment.expiry')}
                    required
                    placeholder="MM / YY"
                    value={cardData.expiry}
                    onChange={(e) => onCardChange('expiry', formatExpiry((e.target as HTMLInputElement).value))}
                    error={errors.expiry}
                    maxLength={7}
                    inputMode="numeric"
                  />
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      CVV <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCvv ? 'text' : 'password'}
                        placeholder="***"
                        value={cardData.cvv}
                        onChange={(e) => onCardChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        inputMode="numeric"
                        className={`w-full px-3.5 py-2.5 pr-10 text-sm border rounded-xl bg-white text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 ${
                          errors.cvv
                            ? 'border-red-400 focus:ring-red-200'
                            : 'border-slate-200 focus:ring-blue-100 focus:border-blue-400 hover:border-slate-300'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCvv(!showCvv)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showCvv ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {errors.cvv && <p className="mt-1 text-xs text-red-500">{errors.cvv}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {['Visa', 'MC', 'Amex', 'JCB'].map((brand) => (
                    <span key={brand} className="text-[10px] font-bold text-slate-400 border border-slate-200 px-2 py-0.5 rounded">{brand}</span>
                  ))}
                </div>
              </div>
            )}

            {isSelected && opt.id === 'paypal' && (
              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {opt.notice || t('checkout.payment.paypalNotice')}
              </div>
            )}

            {isSelected && opt.id === 'stripe' && (
              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {opt.notice}
              </div>
            )}

            {isSelected && opt.id === 'cod' && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {opt.notice || t('checkout.payment.codNotice')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
