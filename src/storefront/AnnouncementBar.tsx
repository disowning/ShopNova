import { X, HelpCircle, Package, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { useStore } from './StoreContext';
import { useT } from '../i18n';
import { useSiteSettings } from './SiteSettingsContext';

export default function AnnouncementBar() {
  const { navigate } = useStore();
  const { t } = useT();
  const { storeSwitches, text } = useSiteSettings();
  const [visible, setVisible] = useState(true);
  if (!visible || !storeSwitches.showAnnouncement) return null;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white text-xs py-2.5 px-4 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4 opacity-0 pointer-events-none select-none">
          <span>placeholder</span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-medium tracking-wide">
            {text('announcementText')}
          </span>
        </div>
        <div className="flex items-center gap-4 text-white/70 relative z-10">
          <button
            onClick={() => navigate({ type: 'faq' })}
            className="flex items-center gap-1 hover:text-white transition-colors whitespace-nowrap"
          >
            <HelpCircle size={12} />{t('announcement.helpCenter')}
          </button>
          <button
            onClick={() => navigate({ type: 'order-lookup' })}
            className="flex items-center gap-1 hover:text-white transition-colors whitespace-nowrap"
          >
            <Package size={12} />{t('announcement.orderLookup')}
          </button>
          <button
            onClick={() => navigate({ type: 'contact-us' })}
            className="flex items-center gap-1 hover:text-white transition-colors whitespace-nowrap"
          >
            <MessageCircle size={12} />{t('announcement.contactSupport')}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="hover:text-white transition-colors ml-1"
            aria-label={t('announcement.close')}
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
