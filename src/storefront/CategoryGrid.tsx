import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { fetchCategories } from '../lib/productService';
import type { Category } from './types';
import { useStore } from './StoreContext';
import { useT } from '../i18n';
import { getCategoryName } from './categoryLabels';

export default function CategoryGrid() {
  const { navigate } = useStore();
  const { t, locale } = useT();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories(locale).then(setCategories);
  }, [locale]);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">{t('home.categoriesTag')}</div>
            <h2 className="text-3xl font-black text-slate-900">{t('home.categoriesTitle')}</h2>
          </div>
          <button
            onClick={() => navigate({ type: 'listing' })}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group"
          >
            {t('home.allCategories')} <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.length === 0
            ? [...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 mx-auto mb-3.5" />
                  <div className="h-4 bg-slate-100 rounded w-2/3 mx-auto mb-1" />
                  <div className="h-3 bg-slate-100 rounded w-1/2 mx-auto" />
                </div>
              ))
            : categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate({ type: 'listing', categoryId: cat.id, categoryName: getCategoryName(t, cat.id, cat.name) })}
                  className="group relative bg-white rounded-2xl border border-slate-100 p-5 text-center hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-200/80 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                  <div className={`w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {cat.icon}
                  </div>
                  <div className="text-sm font-bold text-slate-800 mb-1 group-hover:text-slate-900">{getCategoryName(t, cat.id, cat.name)}</div>
                  <div className="text-xs text-slate-400">{t('home.itemCount', { count: cat.count })}</div>
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={12} className="text-slate-400" />
                  </div>
                </button>
              ))}
        </div>
      </div>
    </section>
  );
}
