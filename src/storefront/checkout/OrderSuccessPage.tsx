import { CheckCircle, Package, ArrowRight, Home, ShoppingBag, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../StoreContext';
import CheckoutHeader from './CheckoutHeader';
import { useT } from '../../i18n';

export default function OrderSuccessPage({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const { navigate } = useStore();
  const [copied, setCopied] = useState(false);
  const { t } = useT();

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(orderNumber).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const steps = [
    { label: t('order.step1'), time: `${dateStr} ${timeStr}`, state: 'done' },
    { label: t('order.step2'), time: t('order.step2Time'), state: 'active' },
    { label: t('order.step3'), time: t('order.step3Time'), state: 'pending' },
    { label: t('order.step4'), time: t('order.step4Time'), state: 'pending' },
    { label: t('order.step5'), time: t('order.step5Time'), state: 'pending' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <CheckoutHeader currentStep={3} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        {/* Success card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden mb-6">
          {/* Green banner */}
          <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 px-8 pt-10 pb-16 text-center relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute top-4 right-12 w-16 h-16 rounded-full bg-white/5" />
            <div className="relative">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-white/20 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <CheckCircle size={36} className="text-emerald-500" strokeWidth={1.5} />
                </div>
              </div>
              <h1 className="text-2xl font-black text-white mb-2">{t('order.successTitle')}</h1>
              <p className="text-emerald-100 text-sm">{t('order.successSubtitle')}</p>
            </div>
          </div>

          {/* Order info card (pulled up) */}
          <div className="-mt-8 mx-6 bg-white rounded-2xl border border-slate-100 shadow-md p-5 space-y-4">
            {/* Order number */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 mb-0.5">{t('order.orderNumber')}</div>
                <div className="text-base font-black text-slate-900 font-mono tracking-wide">{orderNumber}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {orderId.slice(0, 8)}…</div>
              </div>
              <button
                onClick={copyOrderNumber}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  copied ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {copied ? <><Check size={12} />{t('order.copied')}</> : <><Copy size={12} />{t('order.copy')}</>}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-50">
              <div>
                <div className="text-xs text-slate-400 mb-0.5">{t('order.orderTime')}</div>
                <div className="text-xs font-semibold text-slate-700">{dateStr}</div>
                <div className="text-xs text-slate-500">{timeStr}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">{t('order.paymentStatus')}</div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-700">{t('order.paid')}</span>
                </div>
                <div className="text-xs text-slate-400">{t('order.simulated')}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">{t('order.deliveryMethod')}</div>
                <div className="text-xs font-semibold text-slate-700">{t('order.standardDelivery')}</div>
                <div className="text-xs text-slate-400">{t('order.deliveryTime')}</div>
              </div>
            </div>
          </div>

          {/* Progress timeline */}
          <div className="px-6 py-6">
            <div className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Package size={15} className="text-blue-600" />
              {t('order.progress')}
            </div>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100" />
              <div className="space-y-5">
                {steps.map((step, i) => (
                  <div key={step.label} className="relative flex items-start gap-4">
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.state === 'done' ? 'bg-emerald-500 shadow-md shadow-emerald-200'
                      : step.state === 'active' ? 'bg-blue-500 shadow-md shadow-blue-200'
                      : 'bg-slate-100'
                    }`}>
                      {step.state === 'done' ? (
                        <Check size={14} className="text-white" />
                      ) : step.state === 'active' ? (
                        <svg className="w-3.5 h-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                      )}
                    </div>
                    <div className="pt-0.5">
                      <div className={`text-sm font-semibold ${i <= 1 ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{step.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Confirmation note */}
          <div className="mx-6 mb-6 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>{t('order.emailSent')} <span className="font-mono font-bold">{orderNumber}</span></span>
          </div>
        </div>

        {/* CTAs */}
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate({ type: 'listing' })}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-lg shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <ShoppingBag size={16} />
            {t('common.continueShopping')}
            <ArrowRight size={14} />
          </button>
          <button
            onClick={() => navigate({ type: 'home' })}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            <Home size={16} />
            {t('common.backToHome')}
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          {t('order.needHelp')}<button className="text-blue-600 hover:underline font-semibold ml-1">{t('order.contactSupport')}</button>
          <span className="mx-2">·</span>
          {t('order.orderNumberPrefix')}<span className="font-mono font-bold text-slate-600">{orderNumber}</span>
        </div>
      </div>
    </div>
  );
}
