import { ShieldCheck, Zap, RefreshCw, Lock } from 'lucide-react';
import { useT } from '../i18n';

export default function BenefitSection() {
  const { t } = useT();

  const benefits = [
    {
      icon: ShieldCheck,
      title: t('benefit.guarantee'),
      desc: t('benefit.guaranteeDesc'),
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: Zap,
      title: t('benefit.fastShip'),
      desc: t('benefit.fastShipDesc'),
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      icon: RefreshCw,
      title: t('benefit.returnPolicy'),
      desc: t('benefit.returnPolicyDesc'),
      gradient: 'from-emerald-500 to-teal-500',
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      icon: Lock,
      title: t('benefit.securePay'),
      desc: t('benefit.securePayDesc'),
      gradient: 'from-violet-500 to-purple-500',
      bg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">{t('benefit.tag')}</div>
          <h2 className="text-3xl font-black text-slate-900">{t('benefit.title')}</h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto">{t('benefit.subtitle')}</p>
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

              <h3 className="text-base font-bold text-slate-900 mb-2">{b.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
