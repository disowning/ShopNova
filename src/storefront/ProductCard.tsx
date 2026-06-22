import { useState } from 'react';
import { Heart, ShoppingCart, Star, Check } from 'lucide-react';
import type { Product } from './types';
import { useStore } from './StoreContext';
import { useT } from '../i18n';
import { getCategoryName } from './categoryLabels';
import { useSiteSettings } from './SiteSettingsContext';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact';
}

export default function ProductCard({ product, variant = 'default' }: ProductCardProps) {
  const { navigate, addToCart, wishlist, toggleWishlist } = useStore();
  const { t } = useT();
  const { text, storeSwitches } = useSiteSettings();
  const [added, setAdded] = useState(false);
  const isWished = wishlist.includes(product.id);
  const discount = Math.round((1 - product.price / product.originalPrice) * 100);
  const currencySymbol = text('currencySymbol');
  const visibleTags = product.tags.slice(0, 2);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const defaultSKUs: Record<string, string> = {};
    product.skuGroups.forEach((g) => { defaultSKUs[g.name] = g.options[0].label; });
    addToCart(product, defaultSKUs, product.price);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleNavigate = () => {
    navigate({ type: 'product', productId: product.id });
  };

  return (
    <div
      onClick={handleNavigate}
      className="group relative bg-white rounded-2xl border border-slate-100 overflow-hidden hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-slate-200/80 hover:border-slate-200 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Image area */}
      <div className="relative overflow-hidden bg-slate-50 aspect-square">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {visibleTags.length > 0 && (
          <div className="absolute top-3 left-3 flex max-w-[calc(100%-5.5rem)] flex-wrap gap-1">
            {visibleTags.map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm"
                style={{ backgroundColor: tag.color || '#3b82f6' }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          -{discount}%
        </div>
        <button
          onClick={handleWishlist}
          className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-200 ${
            isWished
              ? 'bg-rose-500 text-white scale-110'
              : 'bg-white/90 text-slate-500 hover:text-rose-500 hover:scale-110 opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart size={14} className={isWished ? 'fill-white' : ''} />
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-4">
        <div className="text-[11px] text-slate-400 mb-1">{getCategoryName(t, product.categoryId, product.category)}</div>
        <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1 group-hover:text-blue-700 transition-colors">
          {product.name}
        </h3>
        {variant === 'default' && (
          <p className="text-xs text-slate-500 line-clamp-1 mb-3">{product.tagline}</p>
        )}

        {(storeSwitches.showReviews || storeSwitches.showSalesCount) && (
          <div className="flex items-center gap-2 mb-3">
            {storeSwitches.showReviews && (
              <>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={10}
                      className={i < Math.floor(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-slate-700">{product.rating}</span>
              </>
            )}
            {storeSwitches.showSalesCount && (
              <span className="text-[11px] text-slate-400">{t('common.soldCount', { count: product.sold.toLocaleString() })}</span>
            )}
          </div>
        )}

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-xl font-black text-slate-900">{currencySymbol}{product.price}</span>
          <span className="text-sm text-slate-400 line-through">{currencySymbol}{product.originalPrice}</span>
        </div>

        <button
          onClick={handleAddToCart}
          className={`mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            added
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-900 hover:bg-blue-600 text-white active:scale-95'
          }`}
        >
          {added ? (
            <><Check size={15} />{t('common.addedToCart')}</>
          ) : (
            <><ShoppingCart size={15} />{t('common.addToCart')}</>
          )}
        </button>
      </div>
    </div>
  );
}
