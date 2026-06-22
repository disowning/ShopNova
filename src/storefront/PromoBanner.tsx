import { ArrowRight, Sparkles } from 'lucide-react';
import { useCmsContent } from './CmsContentContext';
import { useStore } from './StoreContext';
import { editableAttrs } from './visualEditor';

export default function PromoBanner() {
  const { content, editorMode, field } = useCmsContent();
  const { navigate } = useStore();
  const item = content.items.find((entry) => entry.id === 'promo-banner');
  if (!item || (!editorMode && item.status !== 'published')) return null;

  const title = field('promo-banner', 'title', '限时优惠');
  const subtitle = field('promo-banner', 'subtitle', '满额免邮，新用户首单立减。');
  const tag = field('promo-banner', 'tag', 'Featured offer');
  const buttonText = field('promo-banner', 'buttonText', '立即查看');
  const buttonLink = field('promo-banner', 'buttonLink', '/products');
  const imageUrl = field('promo-banner', 'imageUrl', '');
  const edit = (fieldKey: string, label: string) => editableAttrs({
    entryId: 'marketing.promoBanner',
    source: 'cms',
    itemId: 'promo-banner',
    fieldKey,
    label,
  });

  const openLink = () => {
    if (buttonLink === '/products') {
      navigate({ type: 'listing' });
      return;
    }
    if (buttonLink.startsWith('/')) {
      window.location.href = buttonLink;
      return;
    }
    if (buttonLink) window.location.href = buttonLink;
  };

  return (
    <section className="bg-white px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-blue-100 bg-blue-50">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_280px] md:items-center md:p-8">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 shadow-sm" {...edit('tag', '营销横幅标签')}>
              <Sparkles size={12} />
              {tag}
            </div>
            <h2 className="text-2xl font-black text-slate-900 sm:text-3xl" {...edit('title', '营销横幅标题')}>{title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600" {...edit('subtitle', '营销横幅说明')}>{subtitle}</p>
            <button
              type="button"
              onClick={openLink}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <span {...edit('buttonText', '营销横幅按钮文案')}>{buttonText}</span>
              <ArrowRight size={15} />
            </button>
          </div>
          {imageUrl ? (
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-white">
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="hidden aspect-[4/3] items-center justify-center rounded-2xl border border-blue-100 bg-white md:flex">
              <span className="text-lg font-black text-blue-600">ShopNova</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
