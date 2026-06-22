import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Package } from 'lucide-react';
import { useStore } from './StoreContext';
import { useAuth } from './AuthContext';
import { useT } from '../i18n';
import { useSiteSettings } from './SiteSettingsContext';

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, removeFromCart, updateQty, navigate } = useStore();
  const { isLoggedIn } = useAuth();
  const { t } = useT();
  const { text } = useSiteSettings();

  const subtotal = cart.reduce((a, item) => a + item.effectivePrice * item.qty, 0);
  const totalItems = cart.reduce((a, item) => a + item.qty, 0);
  const currencySymbol = text('currencySymbol');
  const freeShippingThreshold = Number(text('freeShippingThreshold')) || 299;
  const freeShipping = subtotal >= freeShippingThreshold;

  if (!cartOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
        onClick={() => setCartOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[201] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={18} className="text-slate-700" />
            <h2 className="font-bold text-slate-900 text-base">{t('cart.title')}</h2>
            {totalItems > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalItems}</span>
            )}
          </div>
          <button
            onClick={() => setCartOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <ShoppingBag size={32} className="text-slate-300" />
              </div>
              <div className="text-slate-700 font-semibold mb-1">{t('cart.empty')}</div>
              <div className="text-sm text-slate-400 mb-6">{t('cart.emptyHint')}</div>
              <button
                onClick={() => { setCartOpen(false); navigate({ type: 'listing' }); }}
                className="flex items-center gap-2 bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
              >
                {t('common.goShopping')} <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const skuDesc = item.skuName || Object.values(item.selectedSKUs).join(' / ');
              const itemImage = item.productImage || item.product.images[0];
              return (
                <div key={`${item.product.id}-${skuDesc}`} className="flex gap-3 bg-white rounded-xl border border-slate-100 p-3 hover:border-slate-200 transition-colors">
                  <div
                    className="w-16 h-16 rounded-lg overflow-hidden bg-slate-50 flex-shrink-0 cursor-pointer"
                    onClick={() => { setCartOpen(false); navigate({ type: 'product', productId: item.product.id }); }}
                  >
                    <img src={itemImage} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-semibold text-slate-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => { setCartOpen(false); navigate({ type: 'product', productId: item.product.id }); }}
                    >
                      {item.product.name}
                    </div>
                    {skuDesc && <div className="text-xs text-slate-400 mt-0.5">{skuDesc}</div>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-base font-black text-slate-900">{currencySymbol}{item.effectivePrice}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.product.id, item.selectedSKUs, item.qty - 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 hover:border-blue-400 text-slate-500 hover:text-blue-600 transition-colors"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-sm font-bold text-slate-800 w-5 text-center">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.product.id, item.selectedSKUs, item.qty + 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 hover:border-blue-400 text-slate-500 hover:text-blue-600 transition-colors"
                        >
                          <Plus size={11} />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id, item.selectedSKUs)}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors ml-1"
                          title={t('cart.remove')}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-slate-100 px-6 py-4 space-y-3">
            {/* Free shipping progress */}
            {!freeShipping && (
              <div className="flex items-center gap-2 text-xs">
                <Package size={13} className="text-blue-500 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-slate-500">{t('cart.freeShippingHint', { amount: `${currencySymbol}${(freeShippingThreshold - subtotal).toFixed(0)}` })}</span>
                  <div className="mt-1 h-1.5 bg-slate-100 rounded-full">
                    <div
                      className="h-1.5 bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min((subtotal / freeShippingThreshold) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
            {freeShipping && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                <Package size={13} />
                <span className="font-semibold">{t('cart.freeShippingReached')}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{t('cart.subtotal', { count: totalItems })}</span>
              <span className="text-xl font-black text-slate-900">{currencySymbol}{subtotal.toFixed(2)}</span>
            </div>
            <button
              onClick={() => { setCartOpen(false); navigate(isLoggedIn ? { type: 'checkout' } : { type: 'login' }); }}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-200 active:scale-[0.99] flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              {t('cart.checkoutNow')}
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => { setCartOpen(false); navigate({ type: 'listing' }); }}
              className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors text-center py-1"
            >
              {t('common.continueShopping')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
