import { Lock, RefreshCw, Headphones, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { CartItem } from '../StoreContext';
import type { DeliveryMethod } from './DeliveryMethodSelector';
import { useT } from '../../i18n';

const deliveryCost: Record<DeliveryMethod, number> = {
  standard: 0,
  express: 29,
  nextday: 59,
};

interface Props {
  cart: CartItem[];
  delivery: DeliveryMethod;
  discountAmount: number;
  couponCode: string;
}

export default function OrderSummary({ cart, delivery, discountAmount, couponCode }: Props) {
  const [expanded, setExpanded] = useState(true);
  const { t } = useT();
  const subtotal = cart.reduce((a, item) => a + item.effectivePrice * item.qty, 0);
  const shipping = deliveryCost[delivery];
  const total = subtotal + shipping - discountAmount;

  const deliveryLabel: Record<DeliveryMethod, string> = {
    standard: t('orderSummary.standardDelivery'),
    express: t('orderSummary.expressDelivery'),
    nextday: t('orderSummary.nextDay'),
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900">{t('orderSummary.title')}</h2>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            {cart.reduce((a, i) => a + i.qty, 0)} {t('common.items')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-slate-900">¥{total.toFixed(2)}</span>
          {expanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <>
          {/* Items */}
          <div className="px-6 py-4 space-y-4 border-b border-slate-50">
            {cart.map((item) => {
              const skuDesc = Object.values(item.selectedSKUs).join(' · ');
              return (
                <div key={`${item.product.id}-${skuDesc}`} className="flex gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                      <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {item.qty}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">{item.product.name}</div>
                    {skuDesc && <div className="text-xs text-slate-400 mt-0.5">{skuDesc}</div>}
                    <div className="text-sm font-black text-slate-900 mt-1">¥{(item.effectivePrice * item.qty).toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing breakdown */}
          <div className="px-6 py-4 space-y-2.5 border-b border-slate-50">
            <div className="flex justify-between text-sm text-slate-600">
              <span>{t('orderSummary.productSubtotal')}</span>
              <span className="font-semibold">¥{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>{deliveryLabel[delivery]}</span>
              <span className="font-semibold">
                {shipping === 0 ? <span className="text-emerald-600">{t('common.free')}</span> : `¥${shipping.toFixed(2)}`}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  {t('orderSummary.couponApplied', { code: couponCode })}
                </span>
                <span className="font-bold text-emerald-600">-¥{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-slate-400">
              <span>{t('orderSummary.tax')}</span>
              <span>¥0.00</span>
            </div>
          </div>

          {/* Total */}
          <div className="px-6 py-4 flex justify-between items-baseline bg-slate-50/60">
            <span className="text-sm font-bold text-slate-700">{t('orderSummary.total')}</span>
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900">¥{total.toFixed(2)}</div>
              {discountAmount > 0 && (
                <div className="text-xs text-emerald-600 font-semibold">{t('orderSummary.saved', { amount: `¥${discountAmount.toFixed(2)}` })}</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Trust badges */}
      <div className="px-6 py-4 border-t border-slate-100 grid grid-cols-3 gap-3">
        {[
          { icon: <Lock size={14} />, text: t('orderSummary.sslSecurity') },
          { icon: <RefreshCw size={14} />, text: t('orderSummary.returnPolicy') },
          { icon: <Headphones size={14} />, text: t('orderSummary.support') },
        ].map((b) => (
          <div key={b.text} className="flex flex-col items-center gap-1 text-center">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">{b.icon}</div>
            <span className="text-[10px] text-slate-500 leading-tight whitespace-pre-line">{b.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
