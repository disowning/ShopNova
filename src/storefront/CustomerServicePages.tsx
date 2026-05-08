import {
  ChevronRight,
  ClipboardList,
  HelpCircle,
  Mail,
  PackageCheck,
  RefreshCcw,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useT } from '../i18n';
import { useAuth } from './AuthContext';
import { useStore } from './StoreContext';

type CustomerServiceKind = 'order-lookup' | 'return-policy' | 'logistics' | 'faq';

const icons: Record<CustomerServiceKind, React.ElementType> = {
  'order-lookup': ClipboardList,
  'return-policy': RefreshCcw,
  logistics: Truck,
  faq: HelpCircle,
};

const accents: Record<CustomerServiceKind, string> = {
  'order-lookup': 'from-blue-600 to-cyan-500',
  'return-policy': 'from-emerald-600 to-teal-500',
  logistics: 'from-amber-500 to-orange-500',
  faq: 'from-violet-600 to-indigo-500',
};

function Hero({ kind }: { kind: CustomerServiceKind }) {
  const { navigate } = useStore();
  const { t } = useT();
  const Icon = icons[kind];

  return (
    <div className="bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-8">
          <button onClick={() => navigate({ type: 'home' })} className="hover:text-white transition-colors">{t('common.home')}</button>
          <ChevronRight size={12} />
          <span>{t('customerService.common.title')}</span>
          <ChevronRight size={12} />
          <span className="text-slate-200">{t(`customerService.${kind}.title`)}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${accents[kind]} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <Icon size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-300 mb-2">{t('customerService.common.title')}</p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{t(`customerService.${kind}.title`)}</h1>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed max-w-3xl">{t(`customerService.${kind}.subtitle`)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-black text-slate-900 mb-4">{title}</h2>
      <div className="text-sm leading-7 text-slate-600 space-y-3">{children}</div>
    </section>
  );
}

function Card({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
        <Icon size={18} />
      </div>
      <h3 className="text-sm font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-6">{desc}</p>
    </div>
  );
}

function OrderLookupPage() {
  const { t } = useT();
  const { navigate } = useStore();
  const { isLoggedIn } = useAuth();

  return (
    <article className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        <Card icon={Search} title={t('customerService.order-lookup.card1Title')} desc={t('customerService.order-lookup.card1Desc')} />
        <Card icon={PackageCheck} title={t('customerService.order-lookup.card2Title')} desc={t('customerService.order-lookup.card2Desc')} />
        <Card icon={Mail} title={t('customerService.order-lookup.card3Title')} desc={t('customerService.order-lookup.card3Desc')} />
      </div>
      <Section title={t('customerService.order-lookup.actionTitle')}>
        <p>{t('customerService.order-lookup.actionDesc')}</p>
        <button
          onClick={() => navigate({ type: isLoggedIn ? 'account-orders' : 'login' })}
          className="mt-3 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
        >
          <ClipboardList size={16} />
          {t(isLoggedIn ? 'customerService.order-lookup.viewOrders' : 'customerService.order-lookup.loginToView')}
        </button>
      </Section>
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm text-slate-600 leading-7">
        {t('customerService.order-lookup.note')}
      </div>
    </article>
  );
}

function ReturnPolicyPage() {
  const { t } = useT();
  return (
    <article className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        <Card icon={RefreshCcw} title={t('customerService.return-policy.card1Title')} desc={t('customerService.return-policy.card1Desc')} />
        <Card icon={ShieldCheck} title={t('customerService.return-policy.card2Title')} desc={t('customerService.return-policy.card2Desc')} />
        <Card icon={PackageCheck} title={t('customerService.return-policy.card3Title')} desc={t('customerService.return-policy.card3Desc')} />
      </div>
      <Section title={t('customerService.return-policy.processTitle')}>
        <p>{t('customerService.return-policy.processDesc')}</p>
      </Section>
      <Section title={t('customerService.return-policy.noticeTitle')}>
        <p>{t('customerService.return-policy.noticeDesc')}</p>
      </Section>
    </article>
  );
}

function LogisticsPage() {
  const { t } = useT();
  return (
    <article className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        <Card icon={Truck} title={t('customerService.logistics.card1Title')} desc={t('customerService.logistics.card1Desc')} />
        <Card icon={PackageCheck} title={t('customerService.logistics.card2Title')} desc={t('customerService.logistics.card2Desc')} />
        <Card icon={ShieldCheck} title={t('customerService.logistics.card3Title')} desc={t('customerService.logistics.card3Desc')} />
      </div>
      <Section title={t('customerService.logistics.timelineTitle')}>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden">
          {['standard', 'express', 'nextday'].map((key) => (
            <div key={key} className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100 last:border-0">
              <span className="font-bold text-slate-800 text-sm">{t(`customerService.logistics.${key}Title`)}</span>
              <span className="text-sm text-slate-500 text-right">{t(`customerService.logistics.${key}Desc`)}</span>
            </div>
          ))}
        </div>
      </Section>
      <p className="text-sm text-slate-500 leading-7">{t('customerService.logistics.note')}</p>
    </article>
  );
}

function FAQPage() {
  const { t } = useT();
  const items = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="space-y-4">
        {items.map((key) => (
          <div key={key} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-black text-slate-900 mb-2">{t(`customerService.faq.${key}Title`)}</h3>
            <p className="text-sm text-slate-500 leading-7">{t(`customerService.faq.${key}Desc`)}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function CustomerServicePages({ kind }: { kind: CustomerServiceKind }) {
  return (
    <div className="bg-white min-h-screen">
      <Hero kind={kind} />
      {kind === 'order-lookup' && <OrderLookupPage />}
      {kind === 'return-policy' && <ReturnPolicyPage />}
      {kind === 'logistics' && <LogisticsPage />}
      {kind === 'faq' && <FAQPage />}
    </div>
  );
}
