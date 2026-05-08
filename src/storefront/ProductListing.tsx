import { useState, useEffect } from 'react';
import { SlidersHorizontal, ChevronDown, Search, X } from 'lucide-react';
import { fetchAllProducts, fetchCategories } from '../lib/productService';
import type { Product, Category } from './types';
import { useStore } from './StoreContext';
import ProductCard from './ProductCard';
import { useT } from '../i18n';
import { getCategoryName } from './categoryLabels';

interface Props {
  categoryId?: string;
  categoryName?: string;
  title?: string;
  filter?: 'flashSale';
}

export default function ProductListing({ categoryId, categoryName, title, filter }: Props) {
  const { navigate } = useStore();
  const { t, locale } = useT();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const sortOptions = [
    { value: 'default', label: t('listing.sortDefault') },
    { value: 'priceLow', label: t('listing.sortPriceLow') },
    { value: 'priceHigh', label: t('listing.sortPriceHigh') },
    { value: 'sales', label: t('listing.sortSales') },
    { value: 'rating', label: t('listing.sortRating') },
  ];

  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState(categoryId ?? '');
  const [sort, setSort] = useState('default');
  const [priceMax, setPriceMax] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    Promise.all([fetchAllProducts(locale), fetchCategories(locale)]).then(([prods, cats]) => {
      setAllProducts(prods);
      setCategories(cats);
      setDataLoading(false);
    });
  }, [locale]);

  const pageTitle = title ?? (categoryId ? getCategoryName(t, categoryId, categoryName) : t('listing.title'));

  const filtered = allProducts.filter((p) => {
    const matchCollection = filter !== 'flashSale' || p.isFlashSale;
    const matchCat = !activeCat || p.categoryId === activeCat;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q);
    const matchPrice = !priceMax || p.price <= priceMax;
    return matchCollection && matchCat && matchSearch && matchPrice;
  }).sort((a, b) => {
    if (sort === 'priceLow') return a.price - b.price;
    if (sort === 'priceHigh') return b.price - a.price;
    if (sort === 'sales') return b.sold - a.sold;
    if (sort === 'rating') return b.rating - a.rating;
    return 0;
  });

  const activeCatObj = categories.find((c) => c.id === activeCat);

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Page header */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                <button onClick={() => navigate({ type: 'home' })} className="hover:text-blue-600 transition-colors">{t('common.home')}</button>
                <span>/</span>
                <span className="text-slate-600">{pageTitle}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900">{pageTitle}</h1>
              <p className="text-sm text-slate-400 mt-1">{t('listing.totalItems', { count: filtered.length })}</p>
            </div>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2 mt-5">
            <button
              onClick={() => setActiveCat('')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                !activeCat ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
              }`}
            >
              {t('listing.all')}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  activeCat === cat.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                }`}
              >
                <span>{cat.icon}</span>
                {getCategoryName(t, cat.id, cat.name)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-white rounded-xl border border-slate-200 p-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('listing.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-slate-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
            >
              {sortOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Price filter */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-all ${showFilters ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <SlidersHorizontal size={14} />
            {t('listing.filter')}
            {priceMax > 0 && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
          </button>

          <span className="ml-auto text-xs text-slate-400 hidden sm:block">{t('listing.results', { count: filtered.length })}</span>
        </div>

        {/* Expanded filter panel */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">{t('listing.priceMax')}</span>
              <div className="flex gap-2">
                {[0, 100, 300, 500, 1000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setPriceMax(v)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${priceMax === v ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {v === 0 ? t('listing.noLimit') : `¥${v}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active filters */}
        {(activeCat || search || priceMax > 0) && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-slate-400">{t('listing.filtered')}</span>
            {activeCat && (
              <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-semibold">
                {getCategoryName(t, activeCatObj?.id, activeCatObj?.name)}
                <button onClick={() => setActiveCat('')}><X size={11} /></button>
              </span>
            )}
            {search && (
              <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-semibold">
                "{search}"
                <button onClick={() => setSearch('')}><X size={11} /></button>
              </span>
            )}
            {priceMax > 0 && (
              <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-semibold">
                ≤¥{priceMax}
                <button onClick={() => setPriceMax(0)}><X size={11} /></button>
              </span>
            )}
            <button
              onClick={() => { setActiveCat(''); setSearch(''); setPriceMax(0); }}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              {t('listing.clearAll')}
            </button>
          </div>
        )}

        {/* Grid */}
        {dataLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
                <div className="aspect-square bg-slate-100" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-6 bg-slate-100 rounded w-1/2 mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="text-5xl mb-4">🔍</div>
            <div className="text-base font-semibold text-slate-600 mb-1">{t('listing.noMatch')}</div>
            <div className="text-sm">{t('listing.adjustFilter')}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
