import { Star, Quote } from 'lucide-react';
import { reviews } from './mock-data';
import { useT } from '../i18n';

export default function ReviewSection() {
  const { t } = useT();
  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">{t('review.tag')}</div>
          <h2 className="text-3xl font-black text-slate-900">{t('review.title')}</h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto">{t('review.subtitle')}</p>

          {/* Aggregate score */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} className="text-amber-400 fill-amber-400" />
              ))}
            </div>
            <span className="text-2xl font-black text-slate-900">4.9</span>
            <span className="text-slate-400 text-sm">{t('review.fromReviews')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-slate-100 p-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 relative overflow-hidden"
            >
              {/* Quote icon background */}
              <div className="absolute top-4 right-4 opacity-5">
                <Quote size={48} />
              </div>

              {/* Top */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${r.color} flex items-center justify-center text-white text-sm font-black shadow-md`}>
                    {r.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{r.name}</div>
                    <div className="text-[11px] text-slate-400">{r.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
                  <Star size={11} className="text-amber-400 fill-amber-400" />
                  <span className="text-xs font-bold text-amber-700">{r.rating}</span>
                </div>
              </div>

              {/* Product tag */}
              <div className="inline-flex items-center bg-blue-50 text-blue-700 text-[10px] font-semibold px-2.5 py-1 rounded-full mb-3 border border-blue-100">
                {r.product}
              </div>

              {/* Content */}
              <p className="text-sm text-slate-600 leading-relaxed">{r.content}</p>

              {/* Verified badge */}
              <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-slate-50">
                <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">{t('review.verified')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
