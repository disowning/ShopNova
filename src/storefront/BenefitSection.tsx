import { ShieldCheck, Zap, RefreshCw, Lock } from 'lucide-react';
import { useCmsContent } from './CmsContentContext';
import { useT } from '../i18n';
import { editableAttrs } from './visualEditor';

export default function BenefitSection() {
  const { t } = useT();
  const { field } = useCmsContent();
  const tag = field('home-benefits', 'tag', t('benefit.tag'));
  const title = field('home-benefits', 'title', t('benefit.title'));
  const subtitle = field('home-benefits', 'subtitle', t('benefit.subtitle'));
  const edit = (fieldKey: string, label: string) => editableAttrs({
    entryId: 'home.benefits',
    source: 'cms',
    itemId: 'home-benefits',
    fieldKey,
    label,
  });

  const benefits = [
    {
      icon: ShieldCheck,
      title: field('home-benefits', 'benefit1Title', t('benefit.guarantee')),
      desc: field('home-benefits', 'benefit1Desc', t('benefit.guaranteeDesc')),
      titleKey: 'benefit1Title',
      descKey: 'benefit1Desc',
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: Zap,
      title: field('home-benefits', 'benefit2Title', t('benefit.fastShip')),
      desc: field('home-benefits', 'benefit2Desc', t('benefit.fastShipDesc')),
      titleKey: 'benefit2Title',
      descKey: 'benefit2Desc',
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      icon: RefreshCw,
      title: field('home-benefits', 'benefit3Title', t('benefit.returnPolicy')),
      desc: field('home-benefits', 'benefit3Desc', t('benefit.returnPolicyDesc')),
      titleKey: 'benefit3Title',
      descKey: 'benefit3Desc',
      gradient: 'from-emerald-500 to-teal-500',
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      icon: Lock,
      title: field('home-benefits', 'benefit4Title', t('benefit.securePay')),
      desc: field('home-benefits', 'benefit4Desc', t('benefit.securePayDesc')),
      titleKey: 'benefit4Title',
      descKey: 'benefit4Desc',
      gradient: 'from-violet-500 to-purple-500',
      bg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3" {...edit('tag', '首页权益区顶部标签')}>{tag}</div>
          <h2 className="text-3xl font-black text-slate-900" {...edit('title', '首页权益区标题')}>{title}</h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto" {...edit('subtitle', '首页权益区说明')}>{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="group relative bg-white rounded-2xl border border-slate-100 p-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 text-center overflow-hidden"
            >
              {/* Subtle gradient on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${b.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300`}></div>

              <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl ${b.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                <b.icon size={24} className={b.iconColor} />
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-2" {...edit(b.titleKey, `${b.title} 标题`)}>{b.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed" {...edit(b.descKey, `${b.title} 说明`)}>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
