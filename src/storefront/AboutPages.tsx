import {
  Briefcase,
  ChevronRight,
  Handshake,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { useT } from '../i18n';
import { useStore } from './StoreContext';
import { useSiteSettings } from './SiteSettingsContext';

type AboutPageKind = 'brand-story' | 'contact-us' | 'careers' | 'media-cooperation';

const pageIcons: Record<AboutPageKind, React.ElementType> = {
  'brand-story': Sparkles,
  'contact-us': Mail,
  careers: Briefcase,
  'media-cooperation': Megaphone,
};

const pageAccents: Record<AboutPageKind, string> = {
  'brand-story': 'from-blue-600 to-cyan-500',
  'contact-us': 'from-emerald-600 to-teal-500',
  careers: 'from-violet-600 to-indigo-500',
  'media-cooperation': 'from-rose-600 to-orange-500',
};

function PageHero({ kind }: { kind: AboutPageKind }) {
  const { navigate } = useStore();
  const { t } = useT();
  const Icon = pageIcons[kind];

  return (
    <div className="bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-8">
          <button onClick={() => navigate({ type: 'home' })} className="hover:text-white transition-colors">{t('common.home')}</button>
          <ChevronRight size={12} />
          <span>{t('aboutPages.common.aboutUs')}</span>
          <ChevronRight size={12} />
          <span className="text-slate-200">{t(`aboutPages.${kind}.title`)}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${pageAccents[kind]} flex items-center justify-center shadow-lg flex-shrink-0`}>
            <Icon size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-300 mb-2">{t('aboutPages.common.aboutUs')}</p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{t(`aboutPages.${kind}.title`)}</h1>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed max-w-3xl">{t(`aboutPages.${kind}.subtitle`)}</p>
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

function InfoCard({ icon: Icon, title, desc, tone = 'blue' }: { icon: React.ElementType; title: string; desc: string; tone?: 'blue' | 'violet' }) {
  const toneClass = tone === 'violet' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600';
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${toneClass}`}>
        <Icon size={18} />
      </div>
      <h3 className="font-bold text-slate-900 text-sm mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-6">{desc}</p>
    </div>
  );
}

function BrandStoryPage() {
  const { t } = useT();
  return (
    <article className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <Section title={t('aboutPages.brand-story.whyTitle')}>
        <p>{t('aboutPages.brand-story.whyP1')}</p>
        <p>{t('aboutPages.brand-story.whyP2')}</p>
      </Section>
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <InfoCard icon={Zap} title={t('aboutPages.brand-story.card1Title')} desc={t('aboutPages.brand-story.card1Desc')} />
        <InfoCard icon={ShieldCheck} title={t('aboutPages.brand-story.card2Title')} desc={t('aboutPages.brand-story.card2Desc')} />
        <InfoCard icon={Rocket} title={t('aboutPages.brand-story.card3Title')} desc={t('aboutPages.brand-story.card3Desc')} />
      </div>
      <Section title={t('aboutPages.brand-story.positionTitle')}>
        <p>{t('aboutPages.brand-story.positionDesc')}</p>
      </Section>
    </article>
  );
}

function ContactUsPage() {
  const { t } = useT();
  const { text } = useSiteSettings();
  return (
    <article className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        <InfoCard icon={Mail} title={t('aboutPages.contact-us.serviceTitle')} desc={text('supportEmail')} />
        <InfoCard icon={Phone} title={t('aboutPages.contact-us.phoneTitle')} desc={`${text('supportPhone')} · ${text('workingHours')}`} />
        <InfoCard icon={MapPin} title={t('aboutPages.contact-us.addressTitle')} desc={text('companyAddress')} />
      </div>
      <Section title={t('aboutPages.contact-us.noteTitle')}>
        <p>{t('aboutPages.contact-us.noteP1')}</p>
        <p>{t('aboutPages.contact-us.noteP2')}</p>
      </Section>
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm text-slate-600 leading-7">
        {t('aboutPages.contact-us.demoNote')}
      </div>
    </article>
  );
}

function CareersPage() {
  const { t } = useT();
  const roles = ['frontend', 'operation', 'support', 'design'];

  return (
    <article className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <Section title={t('aboutPages.careers.joinTitle')}>
        <p>{t('aboutPages.careers.joinDesc')}</p>
      </Section>
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {roles.map((key) => (
          <div key={key} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                <Users size={17} className="text-violet-600" />
              </div>
              <h3 className="font-black text-slate-900">{t(`aboutPages.careers.${key}Title`)}</h3>
            </div>
            <p className="text-sm text-slate-500 leading-6">{t(`aboutPages.careers.${key}Desc`)}</p>
          </div>
        ))}
      </div>
      <Section title={t('aboutPages.careers.applyTitle')}>
        <p>{t('aboutPages.careers.applyDesc')}</p>
      </Section>
    </article>
  );
}

function MediaCooperationPage() {
  const { t } = useT();
  return (
    <article className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <Section title={t('aboutPages.media-cooperation.directionTitle')}>
        <p>{t('aboutPages.media-cooperation.directionDesc')}</p>
      </Section>
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <InfoCard icon={Megaphone} title={t('aboutPages.media-cooperation.card1Title')} desc={t('aboutPages.media-cooperation.card1Desc')} />
        <InfoCard icon={Handshake} title={t('aboutPages.media-cooperation.card2Title')} desc={t('aboutPages.media-cooperation.card2Desc')} />
        <InfoCard icon={Sparkles} title={t('aboutPages.media-cooperation.card3Title')} desc={t('aboutPages.media-cooperation.card3Desc')} />
      </div>
      <Section title={t('aboutPages.media-cooperation.emailTitle')}>
        <p>{t('aboutPages.media-cooperation.emailDesc')}</p>
      </Section>
    </article>
  );
}

export default function AboutPages({ kind }: { kind: AboutPageKind }) {
  return (
    <div className="bg-white min-h-screen">
      <PageHero kind={kind} />
      {kind === 'brand-story' && <BrandStoryPage />}
      {kind === 'contact-us' && <ContactUsPage />}
      {kind === 'careers' && <CareersPage />}
      {kind === 'media-cooperation' && <MediaCooperationPage />}
    </div>
  );
}
