import { ArrowRight, ShoppingBag, Star, Truck, Zap } from 'lucide-react';
import { useStore } from './StoreContext';
import { useT } from '../i18n';

export default function HeroSection() {
  const { navigate } = useStore();
  const { t } = useT();

  return (
    <section className="relative bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 overflow-hidden min-h-[600px] flex items-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-blue-900/20 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left copy */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-blue-300 text-xs font-semibold backdrop-blur-sm">
              <Zap size={12} className="text-blue-400" />
              {t('home.heroTag')}
            </div>

            <div className="space-y-3">
              <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
                {t('home.heroTitle1')}
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                  {t('home.heroTitle2')}
                </span>
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed max-w-md">
                {t('home.heroSubtitle1')}
                <br className="hidden sm:block" />{t('home.heroSubtitle2')}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate({ type: 'listing' })}
                className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                <ShoppingBag size={17} />
                {t('home.shopNow')}
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => navigate({ type: 'listing', title: t('common.hotDeals') })}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 backdrop-blur-sm hover:-translate-y-0.5 active:translate-y-0"
              >
                {t('home.viewHot')}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-5 pt-2">
              {[
                { icon: Star, text: t('home.ratingLabel') },
                { icon: Truck, text: t('home.freeShipping') },
                { icon: Zap, text: t('home.fastShip') },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-1.5 text-slate-400 text-sm">
                  <item.icon size={14} className="text-blue-400" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right product showcase */}
          <div className="relative hidden lg:block h-[480px]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-72 h-72 rounded-full bg-blue-500/20 blur-3xl" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => navigate({ type: 'product', productId: 'p1' })}
                className="relative w-64 h-64 cursor-pointer group/hero"
              >
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-600/30 to-indigo-600/20 backdrop-blur-sm border border-white/10 shadow-2xl group-hover/hero:scale-[1.02] transition-transform duration-300" />
                <img
                  src="https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=500"
                  alt="AirSound Pro"
                  className="absolute inset-2 rounded-2xl object-cover"
                />
                <div className="absolute top-0 left-0 right-0 h-1/3 rounded-t-3xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              </button>
            </div>

            <button
              onClick={() => navigate({ type: 'product', productId: 'p2' })}
              className="absolute top-8 right-0 bg-white/90 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-white/60 flex items-center gap-3 animate-[float_4s_ease-in-out_infinite] hover:shadow-2xl transition-shadow cursor-pointer"
            >
              <img src="https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=80" alt="" className="w-10 h-10 rounded-xl object-cover" />
              <div>
                <div className="text-xs font-bold text-slate-800">{t('home.newRelease')}</div>
                <div className="text-[10px] text-violet-600 font-semibold">NovaWatch</div>
              </div>
              <span className="bg-violet-100 text-violet-700 text-[9px] font-bold px-2 py-0.5 rounded-full">NEW</span>
            </button>

            <div className="absolute bottom-16 left-0 bg-white/90 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-white/60 flex items-center gap-3 animate-[float_4s_ease-in-out_0.8s_infinite]">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Truck size={18} className="text-blue-600" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">{t('home.freeDelivery')}</div>
                <div className="text-[10px] text-slate-500">{t('home.freeOver299')}</div>
              </div>
            </div>

            <div className="absolute bottom-8 right-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl px-4 py-2.5 shadow-xl text-white animate-[float_4s_ease-in-out_1.6s_infinite]">
              <div className="text-xs font-bold">{t('home.maxDiscount')}</div>
              <div className="text-2xl font-black">30%</div>
            </div>

            <div className="absolute top-1/2 -translate-y-1/2 -left-4 flex flex-col gap-3">
              {[
                { productId: 'p4', img: 'https://images.pexels.com/photos/1279365/pexels-photo-1279365.jpeg?auto=compress&cs=tinysrgb&w=80', label: 'MiniBass', price: '¥299' },
                { productId: 'p3', img: 'https://images.pexels.com/photos/1294886/pexels-photo-1294886.jpeg?auto=compress&cs=tinysrgb&w=80', label: 'ClearCase', price: '¥79' },
              ].map((p) => (
                <button
                  key={p.productId}
                  onClick={() => navigate({ type: 'product', productId: p.productId })}
                  className="bg-white/80 backdrop-blur-xl rounded-xl px-2.5 py-2 shadow-lg border border-white/60 flex items-center gap-2 hover:shadow-xl transition-shadow cursor-pointer"
                >
                  <img src={p.img} alt={p.label} className="w-8 h-8 rounded-lg object-cover" />
                  <div>
                    <div className="text-[10px] font-bold text-slate-700">{p.label}</div>
                    <div className="text-[10px] text-blue-600 font-bold">{p.price}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
}
