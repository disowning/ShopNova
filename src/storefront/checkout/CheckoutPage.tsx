import { useState } from 'react';
import { User, MapPin, Truck, CreditCard, Tag, MessageSquare, Lock, ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react';
import CheckoutHeader from './CheckoutHeader';
import SectionCard from './SectionCard';
import FormField from './FormField';
import DeliveryMethodSelector, { type DeliveryMethod } from './DeliveryMethodSelector';
import PaymentMethodSelector, { type PaymentMethod, type CardData } from './PaymentMethodSelector';
import CouponBox from './CouponBox';
import OrderSummary from './OrderSummary';
import { useStore } from '../StoreContext';
import { useAuth } from '../AuthContext';
import { submitOrder } from '../../lib/checkoutService';
import { useT } from '../../i18n';

const deliveryFeeMap: Record<DeliveryMethod, number> = {
  standard: 0,
  express: 29,
  nextday: 59,
};

const COUNTRY_CODES = [
  'CN', 'HK', 'TW', 'MO',
  'US', 'CA', 'MX', 'BR', 'AR', 'CL',
  'GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'PL', 'CZ', 'HU', 'GR',
  'TR', 'RU', 'AE', 'SA',
  'JP', 'KR', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID', 'IN',
  'AU', 'NZ',
] as const;

const REGION_CODES_BY_COUNTRY = {
  CN: [
    'beijing', 'tianjin', 'hebei', 'shanxi', 'innerMongolia', 'liaoning', 'jilin', 'heilongjiang',
    'shanghai', 'jiangsu', 'zhejiang', 'anhui', 'fujian', 'jiangxi', 'shandong', 'henan',
    'hubei', 'hunan', 'guangdong', 'guangxi', 'hainan', 'chongqing', 'sichuan', 'guizhou',
    'yunnan', 'tibet', 'shaanxi', 'gansu', 'qinghai', 'ningxia', 'xinjiang',
  ],
  US: [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
    'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM',
    'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
    'WV', 'WI', 'WY',
  ],
  CA: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'],
  AU: ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'],
  JP: [
    'hokkaido', 'aomori', 'iwate', 'miyagi', 'akita', 'yamagata', 'fukushima', 'ibaraki',
    'tochigi', 'gunma', 'saitama', 'chiba', 'tokyo', 'kanagawa', 'niigata', 'toyama',
    'ishikawa', 'fukui', 'yamanashi', 'nagano', 'gifu', 'shizuoka', 'aichi', 'mie',
    'shiga', 'kyoto', 'osaka', 'hyogo', 'nara', 'wakayama', 'tottori', 'shimane',
    'okayama', 'hiroshima', 'yamaguchi', 'tokushima', 'kagawa', 'ehime', 'kochi',
    'fukuoka', 'saga', 'nagasaki', 'kumamoto', 'oita', 'miyazaki', 'kagoshima', 'okinawa',
  ],
} as const;

interface FormData {
  email: string;
  phone: string;
  name: string;
  country: string;
  province: string;
  city: string;
  zip: string;
  street1: string;
  street2: string;
  note: string;
}

type FormErrors = Partial<Record<keyof FormData | keyof CardData, string>>;

export default function CheckoutPage() {
  const { navigate, cart, setCartOpen } = useStore();
  const { user } = useAuth();
  const { t } = useT();

  const countryOptions = COUNTRY_CODES.map((code) => ({
    value: code,
    label: t(`checkout.countries.${code}`),
  }));

  const [form, setForm] = useState<FormData>({
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    name: user?.name ?? '',
    country: 'CN', province: '',
    city: '', zip: '', street1: '', street2: '', note: '',
  });
  const regionCodes = REGION_CODES_BY_COUNTRY[form.country as keyof typeof REGION_CODES_BY_COUNTRY] ?? [];
  const provinceOptions = [
    { value: '', label: t('checkout.selectProvince') },
    ...regionCodes.map((code) => {
      const label = t(`checkout.regions.${form.country}.${code}`);
      return { value: label, label };
    }),
  ];
  const hasProvinceOptions = regionCodes.length > 0;
  const [delivery, setDelivery] = useState<DeliveryMethod>('standard');
  const [payment, setPayment] = useState<PaymentMethod>('card');
  const [cardData, setCardData] = useState<CardData>({ name: '', number: '', expiry: '', cvv: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const subtotal = cart.reduce((a, item) => a + item.effectivePrice * item.qty, 0);
  const shippingFee = deliveryFeeMap[delivery];
  const total = subtotal + shippingFee - discountAmount;

  const setField = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, country: e.target.value, province: '' }));
    setErrors((prev) => ({ ...prev, province: undefined }));
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.email.trim()) errs.email = t('checkout.validation.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('checkout.validation.emailInvalid');
    if (!form.phone.trim()) errs.phone = t('checkout.validation.phoneRequired');
    if (!form.name.trim()) errs.name = t('checkout.validation.nameRequired');
    if (!form.province) errs.province = t('checkout.validation.provinceRequired');
    if (!form.city.trim()) errs.city = t('checkout.validation.cityRequired');
    if (!form.zip.trim()) errs.zip = t('checkout.validation.zipRequired');
    if (!form.street1.trim()) errs.street1 = t('checkout.validation.streetRequired');
    if (payment === 'card') {
      if (!cardData.name.trim()) errs.name = t('checkout.validation.cardNameRequired');
      if (!cardData.number.trim()) errs.number = t('checkout.validation.cardNumberRequired');
      if (!cardData.expiry.trim()) errs.expiry = t('checkout.validation.cardExpiryRequired');
      if (!cardData.cvv.trim()) errs.cvv = t('checkout.validation.cardCvvRequired');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) {
      const firstErr = document.querySelector('[data-field-error]');
      firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitOrder({
        userId: user?.id,
        email: form.email,
        phone: form.phone,
        recipientName: form.name,
        country: form.country,
        province: form.province,
        city: form.city,
        zip: form.zip,
        street1: form.street1,
        street2: form.street2,
        delivery,
        payment,
        cardData,
        subtotal,
        discountAmount,
        couponCode,
        shippingFee,
        total,
        cart,
        note: form.note,
      });

      navigate({ type: 'order-success', orderId: result.orderId, orderNumber: result.orderNumber });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('checkout.validation.submitFailed'));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <CheckoutHeader currentStep={2} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <button
          type="button"
          onClick={() => { setCartOpen(true); navigate({ type: 'home' }); }}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors group"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          {t('checkout.backToCart')}
        </button>

        {/* Dev mode notice */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4 mb-6">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <span className="font-black">{t('checkout.testModeTitle')}</span>{' '}{t('checkout.testModeDesc')}
            <span className="font-semibold"> {t('checkout.testModeWarn')}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
            {/* ── Left column ── */}
            <div className="space-y-5">
              {/* Contact */}
              <SectionCard title={t('checkout.contact')} icon={<User size={16} />}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    label={t('checkout.email')} required
                    type="email" placeholder="your@email.com"
                    value={form.email} onChange={setField('email')}
                    error={errors.email}
                  />
                  <FormField
                    label={t('checkout.phone')} required
                    type="tel" placeholder="138 0000 0000"
                    value={form.phone} onChange={setField('phone')}
                    error={errors.phone}
                  />
                </div>
              </SectionCard>

              {/* Shipping address */}
              <SectionCard title={t('checkout.shippingAddress')} icon={<MapPin size={16} />}>
                <div className="space-y-4">
                  <FormField
                    label={t('checkout.recipientName')} required
                    placeholder={t('checkout.recipientPlaceholder')}
                    value={form.name} onChange={setField('name')}
                    error={errors.name}
                  />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      as="select" label={t('checkout.country')} required
                      options={countryOptions}
                      value={form.country}
                      onChange={handleCountryChange}
                    />
                    {hasProvinceOptions ? (
                      <FormField
                        as="select" label={t('checkout.province')} required
                        options={provinceOptions}
                        value={form.province}
                        onChange={setField('province') as (e: React.ChangeEvent<HTMLSelectElement>) => void}
                        error={errors.province}
                      />
                    ) : (
                      <FormField
                        label={t('checkout.province')} required
                        placeholder={t('checkout.regionPlaceholder')}
                        value={form.province}
                        onChange={setField('province')}
                        error={errors.province}
                      />
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      label={t('checkout.city')} required
                      placeholder={t('checkout.cityPlaceholder')}
                      value={form.city} onChange={setField('city')}
                      error={errors.city}
                    />
                    <FormField
                      label={t('checkout.postalCode')} required
                      placeholder="100000"
                      value={form.zip} onChange={setField('zip')}
                      error={errors.zip}
                    />
                  </div>
                  <FormField
                    label={t('checkout.addressLine1')} required
                    placeholder={t('checkout.addressLine1Placeholder')}
                    value={form.street1} onChange={setField('street1')}
                    error={errors.street1}
                  />
                  <FormField
                    label={t('checkout.addressLine2')} optional
                    placeholder={t('checkout.addressLine2Placeholder')}
                    value={form.street2} onChange={setField('street2')}
                  />
                </div>
              </SectionCard>

              {/* Delivery */}
              <SectionCard title={t('checkout.deliveryMethod')} icon={<Truck size={16} />}>
                <DeliveryMethodSelector value={delivery} onChange={setDelivery} />
              </SectionCard>

              {/* Payment */}
              <SectionCard title={t('checkout.paymentMethod')} icon={<CreditCard size={16} />}>
                <PaymentMethodSelector
                  method={payment} onChange={setPayment}
                  cardData={cardData}
                  onCardChange={(field, val) => {
                    setCardData((prev) => ({ ...prev, [field]: val }));
                    setErrors((prev) => ({ ...prev, [field]: undefined }));
                  }}
                  errors={errors}
                />
              </SectionCard>

              {/* Coupon */}
              <SectionCard title={t('checkout.couponCode')} icon={<Tag size={16} />}>
                <CouponBox
                  subtotal={subtotal}
                  onDiscount={(amount, code) => { setDiscountAmount(amount); setCouponCode(code); }}
                  onRemove={() => { setDiscountAmount(0); setCouponCode(''); }}
                  appliedCode={couponCode}
                  discountAmount={discountAmount}
                />
              </SectionCard>

              {/* Note */}
              <SectionCard title={t('checkout.orderNote')} icon={<MessageSquare size={16} />}>
                <FormField
                  as="textarea" label={t('checkout.orderNote')} optional
                  placeholder={t('checkout.orderNotePlaceholder')}
                  value={form.note}
                  onChange={setField('note') as (e: React.ChangeEvent<HTMLTextAreaElement>) => void}
                />
              </SectionCard>

              {/* Error from DB */}
              {submitError && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit — mobile */}
              <div className="lg:hidden space-y-3">
                <SubmitButton submitting={submitting} t={t} />
                <SecurityNote t={t} />
              </div>
            </div>

            {/* ── Right column ── */}
            <div className="space-y-5 lg:sticky lg:top-24">
              <OrderSummary
                cart={cart}
                delivery={delivery}
                discountAmount={discountAmount}
                couponCode={couponCode}
              />
              <div className="hidden lg:block space-y-3">
                <SubmitButton submitting={submitting} t={t} />
                <SecurityNote t={t} />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function SubmitButton({ submitting, t }: { submitting: boolean; t: (key: string, params?: Record<string, string | number>) => string }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-base transition-all duration-200 shadow-xl ${
        submitting
          ? 'bg-slate-400 text-white cursor-not-allowed'
          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white hover:-translate-y-0.5 hover:shadow-blue-300/50 active:translate-y-0'
      }`}
    >
      {submitting ? (
        <>
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          {t('checkout.processing')}
        </>
      ) : (
        <>
          <Lock size={17} />
          {t('checkout.confirmPay')}
        </>
      )}
    </button>
  );
}

function SecurityNote({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-slate-400 px-1">
      <ShieldCheck size={13} className="flex-shrink-0 mt-0.5 text-emerald-500" />
      <span>{t('checkout.securityNote')}</span>
    </div>
  );
}
