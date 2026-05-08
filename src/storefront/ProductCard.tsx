import { useState } from 'react';
import { Heart, ShoppingCart, Star, Check } from 'lucide-react';
import type { Product } from './types';
import { useStore } from './StoreContext';
import { useT } from '../i18n';
import { getCategoryName } from './categoryLabels';

const badgeKeys: Record<string, string> = {
  热卖: 'common.hot',
  新品: 'common.new',
  限时折扣: 'common.flashDiscount',
};

const badgeStyle: Record<string, string> = {
  热卖: 'bg-rose-500 text-white',
  新品: 'bg-violet-600 text-white',
  限时折扣: 'bg-amber-500 text-white',
};

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact';
}

export default function ProductCard({ product, variant = 'default' }: ProductCardProps) {
  const { navigate, addToCart, wishlist, toggleWishlist } = useStore();
  const { t } = useT();
  const [added, setAdded] = useState(false);
  const isWished = wishlist.includes(product.id);
  const discount = Math.round((1 - product.price / product.originalPrice) * 100);

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
        {product.badge && (
          <div className={`absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm ${badgeStyle[product.badge]}`}>
            {t(badgeKeys[product.badge] || product.badge)}
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

        <div className="flex items-center gap-2 mb-3">
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
          <span className="text-[11px] text-slate-400">{t('common.soldCount', { count: product.sold.toLocaleString() })}</span>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-xl font-black text-slate-900">¥{product.price}</span>
          <span className="text-sm text-slate-400 line-through">¥{product.originalPrice}</span>
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
