import { useEffect, useState } from 'react';
import { Quote, Star } from 'lucide-react';
import { useT } from '../i18n';
import { fetchFeaturedProductReviews, type ProductReview } from '../lib/reviewService';
import { useCmsContent } from './CmsContentContext';
import { useSiteSettings } from './SiteSettingsContext';
import { editableAttrs } from './visualEditor';

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={13}
          className={i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
        />
      ))}
    </div>
  );
}

export default function ReviewSection() {
  const { t } = useT();
  const { storeSwitches } = useSiteSettings();
  const { field } = useCmsContent();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);

  const tag = field('home-reviews', 'tag', t('review.tag'));
  const title = field('home-reviews', 'title', t('review.title'));
  const subtitle = field('home-reviews', 'subtitle', t('review.subtitle'));
  const reviewSource = field('home-reviews', 'reviewSource', t('review.fromReviews'));
  const edit = (fieldKey: string, label: string) => editableAttrs({
    entryId: 'home.reviews',
    source: 'cms',
    itemId: 'home-reviews',
    fieldKey,
    label,
  });

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetchFeaturedProductReviews(3)
      .then((next) => {
        if (!ignore) setReviews(next);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (!storeSwitches.showReviews) return null;
  if (!loading && reviews.length === 0) return null;

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3" {...edit('tag', '首页评价区标签')}>{tag}</div>
          <h2 className="text-3xl font-black text-slate-900" {...edit('title', '首页评价区标题')}>{title}</h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto" {...edit('subtitle', '首页评价区说明')}>{subtitle}</p>

          <div className="flex items-center justify-center gap-3 mt-6">
            <ReviewStars rating={reviews[0]?.rating ?? 5} />
            <span className="text-2xl font-black text-slate-900">{reviews[0]?.rating.toFixed(1) ?? '5.0'}</span>
            <span className="text-slate-400 text-sm" {...edit('reviewSource', '首页评价区来源说明')}>{reviewSource}</span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="rounded-2xl border border-slate-100 bg-white p-6 animate-pulse">
                <div className="mb-4 h-10 w-10 rounded-full bg-slate-100" />
                <div className="mb-3 h-4 w-1/3 rounded bg-slate-100" />
                <div className="space-y-2">
                  <div className="h-3 rounded bg-slate-100" />
                  <div className="h-3 rounded bg-slate-100" />
                  <div className="h-3 w-2/3 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-100"
              >
                <div className="absolute top-4 right-4 opacity-5">
                  <Quote size={48} />
                </div>

                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${review.avatarColor} text-sm font-black text-white shadow-md`}>
                      {review.avatarText}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{review.customerName}</div>
                      <div className="text-[11px] text-slate-400">{review.reviewDate}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-amber-100 bg-amber-50 px-2 py-1">
                    <Star size={11} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold text-amber-700">{review.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="mb-3 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                  {review.productName || t('common.products')}
                </div>

                {review.title && <div className="mb-2 text-sm font-bold text-slate-900">{review.title}</div>}
                <p className="text-sm leading-relaxed text-slate-600">{review.content}</p>

                <div className="mt-4 flex items-center gap-1.5 border-t border-slate-50 pt-4">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100">
                    <svg className="h-2.5 w-2.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">{t('review.verified')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
