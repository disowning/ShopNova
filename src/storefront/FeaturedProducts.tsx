import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { fetchFeaturedProducts } from '../lib/productService';
import type { Product } from './types';
import ProductCard from './ProductCard';
import { useStore } from './StoreContext';
import { useT } from '../i18n';
import { useCmsContent } from './CmsContentContext';
import { editableAttrs } from './visualEditor';

export default function FeaturedProducts() {
  const { navigate } = useStore();
  const { t, locale } = useT();
  const { field } = useCmsContent();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const tag = field('home-featured', 'tag', t('home.featuredTag'));
  const title = field('home-featured', 'title', t('home.featuredTitle'));
  const subtitle = field('home-featured', 'subtitle', t('home.featuredSubtitle'));
  const buttonText = field('home-featured', 'buttonText', t('common.viewAll'));
  const edit = (fieldKey: string, label: string) => editableAttrs({
    entryId: 'home.featured',
    source: 'cms',
    itemId: 'home-featured',
    fieldKey,
    label,
  });

  useEffect(() => {
    setLoading(true);
    fetchFeaturedProducts(locale)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [locale]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2" {...edit('tag', '首页推荐区标签')}>{tag}</div>
            <h2 className="text-3xl font-black text-slate-900" {...edit('title', '首页推荐区标题')}>{title}</h2>
            <p className="text-sm text-slate-500 mt-2" {...edit('subtitle', '首页推荐区说明')}>{subtitle}</p>
          </div>
          <button onClick={() => navigate({ type: 'listing' })} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group">
            <span {...edit('buttonText', '首页推荐区按钮文案')}>{buttonText}</span> <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
                <div className="aspect-square bg-slate-100" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-6 bg-slate-100 rounded w-1/2 mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
