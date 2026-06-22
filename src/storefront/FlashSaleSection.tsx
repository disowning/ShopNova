import { useState, useEffect } from 'react';
import { Zap, ArrowRight, ShoppingCart, Check, Timer } from 'lucide-react';
import { fetchFlashSaleProducts } from '../lib/productService';
import type { Product } from './types';
import { useStore } from './StoreContext';
import { useT } from '../i18n';
import { useSiteSettings } from './SiteSettingsContext';
import { useCmsContent } from './CmsContentContext';
import { editableAttrs } from './visualEditor';

function useCountdown(initial: { h: number; m: number; s: number }) {
  const [time, setTime] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => {
      setTime((prev) => {
        const { h, m, s } = prev;
        if (s > 0) return { h, m, s: s - 1 };
        if (m > 0) return { h, m: m - 1, s: 59 };
        if (h > 0) return { h: h - 1, m: 59, s: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function FlashProductCard({ product }: { product: Product }) {
  const { navigate, addToCart } = useStore();
  const { t } = useT();
  const { text, storeSwitches } = useSiteSettings();
  const [added, setAdded] = useState(false);
  const discount = product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  const soldPct = Math.min(90, Math.round((product.sold / (product.sold + 300)) * 100));
  const currencySymbol = text('currencySymbol');

  return (
    <div
      onClick={() => navigate({ type: 'product', productId: product.id })}
      className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex gap-4 p-4 hover:shadow-lg hover:border-blue-100 transition-all duration-200 group cursor-pointer"
    >
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-50">
        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-rose-500 font-bold mb-1">{t('flashSale.discount', { pct: discount })}</div>
        <div className="text-sm font-bold text-slate-900 truncate mb-1">{product.name}</div>
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-lg font-black text-slate-900">{currencySymbol}{product.price}</span>
          <span className="text-xs text-slate-400 line-through">{currencySymbol}{product.originalPrice}</span>
        </div>
        {storeSwitches.showSalesCount && <div className="mb-2">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-rose-500 to-orange-400 rounded-full" style={{ width: `${soldPct}%` }} />
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t('flashSale.soldPct', { pct: soldPct })}</div>
        </div>}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          const defaultSKUs: Record<string, string> = {};
          product.skuGroups.forEach((g) => { defaultSKUs[g.name] = g.options[0].label; });
          addToCart(product, defaultSKUs, product.price);
          setAdded(true);
          setTimeout(() => setAdded(false), 1800);
        }}
        className={`self-center w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${added ? 'bg-emerald-500 text-white' : 'bg-slate-900 hover:bg-blue-600 text-white active:scale-95'}`}
      >
        {added ? <Check size={15} /> : <ShoppingCart size={15} />}
      </button>
    </div>
  );
}

export default function FlashSaleSection() {
  const { navigate } = useStore();
  const { t, locale } = useT();
  const { field } = useCmsContent();
  const time = useCountdown({ h: 8, m: 24, s: 36 });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const tag = field('home-flash-sale', 'tag', t('flashSale.tag'));
  const title = field('home-flash-sale', 'title', t('flashSale.title'));
  const subtitle = field('home-flash-sale', 'subtitle', t('flashSale.subtitle'));
  const timerLabel = field('home-flash-sale', 'timerLabel', t('flashSale.endsIn'));
  const ctaText = field('home-flash-sale', 'ctaText', t('flashSale.viewAll'));
  const edit = (fieldKey: string, label: string) => editableAttrs({
    entryId: 'home.flashSale',
    source: 'cms',
    itemId: 'home-flash-sale',
    fieldKey,
    label,
  });

  useEffect(() => {
    setLoading(true);
    fetchFlashSaleProducts(locale)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [locale]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-1.5" {...edit('tag', '首页限时抢购标签')}>
              <Zap size={12} /> {tag}
            </div>
            <h2 className="text-3xl font-black text-slate-900" {...edit('title', '首页限时抢购标题')}>{title}</h2>
            <p className="text-sm text-slate-500 mt-2" {...edit('subtitle', '首页限时抢购说明')}>{subtitle}</p>
          </div>
          <button onClick={() => navigate({ type: 'listing', title, filter: 'flashSale' })} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group">
            <span {...edit('ctaText', '首页限时抢购按钮文案')}>{ctaText}</span> <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 p-8 flex flex-col justify-between min-h-[320px]">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-rose-500/15 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl" />
            </div>
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold px-3 py-1 rounded-full mb-4">
                <Zap size={11} /> {t('flashSale.weeklyPick')}
              </span>
              <h3 className="text-3xl font-black text-white leading-tight mb-2">
                {t('flashSale.maxDiscount')}<br /><span className="text-rose-400">30%</span>
              </h3>
              <p className="text-slate-400 text-sm mb-6">{t('flashSale.weeklyDesc')}</p>
            </div>
            <div className="relative">
              <div className="flex items-center gap-1 mb-5">
                <Timer size={13} className="text-slate-400" />
                <span className="text-xs text-slate-400 font-medium" {...edit('timerLabel', '首页限时抢购倒计时标签')}>{timerLabel}</span>
                {[pad(time.h), pad(time.m), pad(time.s)].map((unit, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className="bg-white/10 backdrop-blur-sm text-white font-black text-lg w-10 h-10 flex items-center justify-center rounded-xl border border-white/10">{unit}</span>
                    {i < 2 && <span className="text-slate-400 font-bold text-lg">:</span>}
                  </span>
                ))}
              </div>
              <button
                onClick={() => navigate({ type: 'listing', title, filter: 'flashSale' })}
                className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white font-bold px-6 py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-rose-500/30"
              >
                <Zap size={15} /> <span {...edit('ctaText', '首页限时抢购按钮文案')}>{ctaText}</span> <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 flex flex-col gap-4 justify-center">
            {loading
              ? [...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 flex gap-4 p-4 animate-pulse">
                    <div className="w-20 h-20 rounded-xl bg-slate-100 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-1/4" />
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                      <div className="h-5 bg-slate-100 rounded w-1/3" />
                    </div>
                  </div>
                ))
              : products.map((p) => <FlashProductCard key={p.id} product={p} />)
            }
          </div>
        </div>
      </div>
    </section>
  );
}
