import { BadgeCheck, PackageCheck, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useCmsContent } from './CmsContentContext';
import { editableAttrs } from './visualEditor';

const badgeIcons = [ShieldCheck, PackageCheck, RefreshCcw, BadgeCheck];

export default function TrustBadges() {
  const { content, editorMode, field } = useCmsContent();
  const item = content.items.find((entry) => entry.id === 'trust-badges');
  if (!item || (!editorMode && item.status !== 'published')) return null;

  const badges = [1, 2, 3, 4]
    .map((index) => field('trust-badges', `badge${index}`, ''))
    .filter(Boolean);

  if (badges.length === 0) return null;

  return (
    <section className="bg-white px-4 py-8 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {badges.map((badge, index) => {
          const Icon = badgeIcons[index % badgeIcons.length];
          return (
            <div key={`${badge}-${index}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                <Icon size={18} />
              </div>
              <div
                className="text-sm font-black text-slate-800"
                {...editableAttrs({
                  entryId: 'marketing.trustBadges',
                  source: 'cms',
                  itemId: 'trust-badges',
                  fieldKey: `badge${index + 1}`,
                  label: `信任背书 ${index + 1}`,
                })}
              >
                {badge}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
