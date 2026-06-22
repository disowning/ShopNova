import { useEffect, useMemo, useRef, useState, type ElementType } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  Eye,
  FilePenLine,
  FileText,
  HelpCircle,
  Home,
  Image,
  Languages,
  LayoutTemplate,
  Link as LinkIcon,
  Megaphone,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { fetchAdminSettings, saveAdminSettings } from '../lib/settingsService';
import { contentMapEntries, type ContentMapArea, type ContentMapEntry, type ContentMapStatus } from '../lib/contentMap';
import {
  DEFAULT_CMS_ITEMS,
  fetchAdminCmsContent,
  saveCmsContentItems,
  type CmsContentGroup,
  type CmsContentState,
  type CmsContentStatus,
  type CmsField,
  type CmsItem,
} from '../lib/cmsContent';
import {
  DEFAULT_STORE_FORM,
  DEFAULT_STORE_SWITCHES,
  mergeSiteSettings,
  type StoreForm,
  type StoreSwitches,
} from '../lib/siteSettings';
import { fetchMediaSettings, formatMediaSize, type MediaAsset } from '../lib/mediaService';
import type { Page } from '../components/Sidebar';

type AdminCmsSettings = Record<string, unknown> & {
  cmsContent?: Partial<CmsContentState>;
  storeForm?: Partial<StoreForm>;
  storeSwitches?: Partial<StoreSwitches>;
};

type ContentWorkspace = 'map' | 'visual' | 'cms';
type ContentMapAreaFilter = ContentMapArea | 'all';
type MessageTone = 'info' | 'success' | 'warning' | 'error';

const SITE_CONFIG_TARGET_KEY = 'shopnova-site-config-target';

const mapAreaMeta: Record<ContentMapArea, { title: string; desc: string }> = {
  header: { title: '顶部区域', desc: '公告、Logo、导航、搜索' },
  home: { title: '首页内容', desc: '首屏、模块、订阅、评价' },
  footer: { title: '页脚区域', desc: '简介、链接、版权、社交' },
  contact: { title: '联系信息', desc: '客服、地址、合作邮箱' },
  commerce: { title: '购物规则', desc: '货币、免邮、展示开关' },
  seo: { title: 'SEO 与图标', desc: '标题、描述、favicon' },
  service: { title: '客服页面', desc: '订单、物流、售后、FAQ' },
  about: { title: '关于页面', desc: '品牌、联系、招聘、媒体' },
  policy: { title: '政策页面', desc: '隐私、条款、Cookie' },
  marketing: { title: '营销组件', desc: '横幅、背书、活动' },
  translation: { title: '多语言', desc: '翻译层和同步' },
};

const mapStatusMeta: Record<ContentMapStatus, { label: string; className: string; dotClassName: string }> = {
  connected: {
    label: '已接入',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dotClassName: 'bg-emerald-500',
  },
  partial: {
    label: '部分接入',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    dotClassName: 'bg-amber-500',
  },
  not_connected: {
    label: '未接前台',
    className: 'border-slate-200 bg-slate-50 text-slate-600',
    dotClassName: 'bg-slate-300',
  },
  reserved: {
    label: '预留',
    className: 'border-violet-200 bg-violet-50 text-violet-700',
    dotClassName: 'bg-violet-500',
  },
  translation_layer: {
    label: '翻译层',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
    dotClassName: 'bg-blue-500',
  },
};

const mapAreaOptions: Array<{ id: ContentMapAreaFilter; title: string; desc: string }> = [
  { id: 'all', title: '全部位置', desc: '按网站位置查找' },
  ...Object.entries(mapAreaMeta).map(([id, meta]) => ({ id: id as ContentMapArea, ...meta })),
];

type VisualPreviewPage =
  | 'home'
  | 'order-lookup'
  | 'return-policy'
  | 'logistics'
  | 'faq'
  | 'brand-story'
  | 'contact-us'
  | 'careers'
  | 'media-cooperation'
  | 'privacy'
  | 'terms'
  | 'cookies'
  | 'payment-security';

const visualPreviewPages: Array<{ id: VisualPreviewPage; label: string }> = [
  { id: 'home', label: '首页' },
  { id: 'order-lookup', label: '订单查询' },
  { id: 'return-policy', label: '退换货政策' },
  { id: 'logistics', label: '物流说明' },
  { id: 'faq', label: 'FAQ' },
  { id: 'brand-story', label: '品牌故事' },
  { id: 'contact-us', label: '联系我们' },
  { id: 'careers', label: '招聘信息' },
  { id: 'media-cooperation', label: '媒体合作' },
  { id: 'privacy', label: '隐私政策' },
  { id: 'terms', label: '服务条款' },
  { id: 'cookies', label: 'Cookie 设置' },
  { id: 'payment-security', label: '支付安全' },
];

const visualPreviewPageByItemId: Record<string, VisualPreviewPage> = {
  'order-lookup': 'order-lookup',
  'return-policy': 'return-policy',
  logistics: 'logistics',
  'faq-main': 'faq',
  'brand-story': 'brand-story',
  'contact-us': 'contact-us',
  careers: 'careers',
  'media-cooperation': 'media-cooperation',
  'privacy-policy': 'privacy',
  'terms-of-service': 'terms',
  'cookie-settings': 'cookies',
  'payment-security': 'payment-security',
};

function getVisualPreviewPage(entry?: ContentMapEntry | null): VisualPreviewPage {
  if (!entry) return 'home';
  if (entry.source.type === 'cmsContent') {
    return visualPreviewPageByItemId[entry.source.itemId] ?? 'home';
  }
  return 'home';
}

function getSiteConfigTargetId(entry: ContentMapEntry) {
  if (entry.source.type !== 'siteSettings') return null;
  if (entry.source.section === 'headerNavLinks') return 'nav-main';
  if (entry.source.section === 'footerLinkSections') return 'nav-footer';

  const key = entry.source.key as keyof StoreForm | keyof StoreSwitches;
  const targets: Partial<Record<keyof StoreForm | keyof StoreSwitches, string>> = {
    storeName: 'brand-identity',
    storeShortName: 'brand-identity',
    slogan: 'brand-identity',
    companyName: 'brand-identity',
    logoUrl: 'brand-assets',
    announcementText: 'header-announcement',
    searchPlaceholder: 'header-announcement',
    showAnnouncement: 'header-announcement',
    showLanguageSwitch: 'header-announcement',
    supportEmail: 'contact-support',
    supportPhone: 'contact-support',
    workingHours: 'contact-support',
    companyAddress: 'contact-business',
    businessEmail: 'contact-business',
    mediaEmail: 'contact-business',
    footerDescription: 'footer-copy',
    copyrightText: 'footer-copy',
    icpNumber: 'footer-copy',
    socialX: 'footer-social',
    socialInstagram: 'footer-social',
    socialYoutube: 'footer-social',
    currencySymbol: 'commerce-currency',
    defaultCurrency: 'commerce-currency',
    freeShippingThreshold: 'commerce-currency',
    showReviews: 'commerce-display',
    showSalesCount: 'commerce-display',
    siteTitle: 'seo-meta',
    siteDescription: 'seo-meta',
    faviconUrl: 'seo-meta',
  };

  return targets[key] ?? null;
}

function MapStatusBadge({ status }: { status: ContentMapStatus }) {
  const meta = mapStatusMeta[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClassName}`} />
      {meta.label}
    </span>
  );
}

const groups: Array<{ id: CmsContentGroup; title: string; desc: string; icon: ElementType }> = [
  { id: 'home', title: '首页内容', desc: '首屏、商品区、权益、订阅', icon: Home },
  { id: 'service', title: '客服与售后', desc: '订单查询、退换货、物流、FAQ', icon: HelpCircle },
  { id: 'about', title: '品牌与关于', desc: '品牌故事、联系、招聘、媒体', icon: Users },
  { id: 'policy', title: '政策与法务', desc: '隐私、条款、Cookie、支付安全', icon: ShieldCheck },
  { id: 'marketing', title: '营销组件', desc: '活动横幅、信任背书、转化文案', icon: Megaphone },
];

const statusMeta: Record<CmsContentStatus, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  ready: { label: '待发布', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  published: { label: '已发布', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

function StatusBadge({ status }: { status: CmsContentStatus }) {
  const meta = statusMeta[status];
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}>{meta.label}</span>;
}

function isImageField(field: CmsField) {
  return field.type === 'url' && /image|img|logo|banner|图片|图像|素材/i.test(`${field.key} ${field.label}`);
}

function FieldInput({
  field,
  onChange,
  onRemove,
  onSelectImage,
  highlight = false,
}: {
  field: CmsField;
  onChange: (value: Partial<CmsField>) => void;
  onRemove?: () => void;
  onSelectImage?: () => void;
  highlight?: boolean;
}) {
  const inputClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30';
  const imageField = isImageField(field);

  return (
    <div className={`${field.type === 'textarea' ? 'md:col-span-2' : ''} ${highlight ? 'rounded-xl border border-blue-200 bg-white p-2 shadow-[0_0_0_4px_rgba(37,99,235,0.10)]' : ''}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
        </label>
        {!field.required && onRemove && (
          <button type="button" onClick={onRemove} className="text-slate-300 hover:text-red-500">
            <Trash2 size={12} />
          </button>
        )}
      </div>
      {field.type === 'textarea' ? (
        <textarea
          value={field.value}
          onChange={(event) => onChange({ value: event.target.value })}
          rows={4}
          placeholder={field.placeholder}
          className={`${inputClass} resize-none leading-6`}
        />
      ) : (
        <input
          value={field.value}
          onChange={(event) => onChange({ value: event.target.value })}
          type={field.type ?? 'text'}
          placeholder={field.placeholder}
          className={inputClass}
        />
      )}
      {imageField && onSelectImage && (
        <button
          type="button"
          onClick={onSelectImage}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Image size={13} />
          从素材库选择
        </button>
      )}
    </div>
  );
}

function CmsMediaPickerModal({ onSelect, onClose }: { onSelect: (asset: MediaAsset) => void; onClose: () => void }) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    fetchMediaSettings()
      .then((result) => {
        if (!ignore) setAssets(result.mediaAssets.filter((asset) => asset.usage === 'content' || asset.usage === 'brand' || asset.usage === 'other'));
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : '读取素材库失败');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const keyword = search.trim().toLowerCase();
  const filteredAssets = assets.filter((asset) => {
    if (!keyword) return true;
    return [asset.name, asset.url, asset.altText].some((value) => value.toLowerCase().includes(keyword));
  });

  return (
    <div className="fixed inset-0 z-[540] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[82vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-base font-bold text-slate-900">从素材库选择图片</div>
            <div className="mt-0.5 text-xs text-slate-400">选择后会自动填入当前图片 URL 字段。</div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="搜索图片名称、链接、说明"
            />
          </div>
        </div>

        <div className="min-h-[360px] overflow-y-auto p-5">
          {loading && (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              <RefreshCw size={16} className="mr-2 animate-spin" />
              读取素材库中
            </div>
          )}
          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {!loading && !error && filteredAssets.length === 0 && (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
              <Image size={28} className="text-slate-300" />
              <div className="mt-2 text-sm font-bold text-slate-700">暂无可用内容图片</div>
              <div className="mt-1 text-xs text-slate-400">请先到图片管理上传 content、brand 或 other 用途的素材。</div>
            </div>
          )}
          {!loading && !error && filteredAssets.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onSelect(asset)}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                >
                  <div className="aspect-square bg-slate-100">
                    <img src={asset.url} alt={asset.altText || asset.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-3">
                    <div className="truncate text-sm font-bold text-slate-800">{asset.name}</div>
                    <div className="mt-1 text-[11px] text-slate-400">{asset.provider} · {formatMediaSize(asset.size)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ item, onClose }: { item: CmsItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 px-4">
      <div className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-base font-black text-slate-900">{item.title}</div>
            <div className="mt-0.5 text-xs font-mono text-slate-400">{item.path}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(86vh-72px)] overflow-y-auto p-5">
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <StatusBadge status={item.status} />
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">{item.surface}</span>
            </div>
            <p className="text-sm leading-6 text-slate-600">{item.summary}</p>
          </div>

          <div className="grid gap-3">
            {item.fields.map((field) => (
              <div key={field.key} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-1 text-xs font-bold text-slate-400">{field.label}</div>
                <div className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{field.value || '未填写'}</div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">页面模块</div>
            <div className="grid gap-2 md:grid-cols-2">
              {item.modules.map((module, index) => (
                <div key={`${module}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {index + 1}. {module}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentManagement({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [workspace, setWorkspace] = useState<ContentWorkspace>('map');
  const [activeMapArea, setActiveMapArea] = useState<ContentMapAreaFilter>('all');
  const [selectedVisualId, setSelectedVisualId] = useState('header.announcement');
  const [selectedVisualFieldKey, setSelectedVisualFieldKey] = useState('');
  const [selectedVisualLabel, setSelectedVisualLabel] = useState('');
  const [visualFrameKey, setVisualFrameKey] = useState(0);
  const [visualPreviewPage, setVisualPreviewPage] = useState<VisualPreviewPage>('home');
  const visualFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [activeGroup, setActiveGroup] = useState<CmsContentGroup>('home');
  const [activeId, setActiveId] = useState('home-hero');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CmsItem[]>(DEFAULT_CMS_ITEMS);
  const [lastSavedItems, setLastSavedItems] = useState<CmsItem[]>(DEFAULT_CMS_ITEMS);
  const [storeForm, setStoreForm] = useState<StoreForm>(() => DEFAULT_STORE_FORM);
  const [storeSwitches, setStoreSwitches] = useState<StoreSwitches>(() => DEFAULT_STORE_SWITCHES);
  const [lastSavedStoreForm, setLastSavedStoreForm] = useState<StoreForm>(() => DEFAULT_STORE_FORM);
  const [lastSavedStoreSwitches, setLastSavedStoreSwitches] = useState<StoreSwitches>(() => DEFAULT_STORE_SWITCHES);
  const [rawSettings, setRawSettings] = useState<AdminCmsSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageTone>('info');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<{ itemId: string; fieldKey: string } | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setMessage('');
      try {
        const [result, cmsContent] = await Promise.all([
          fetchAdminSettings<AdminCmsSettings>(),
          fetchAdminCmsContent(),
        ]);
        if (ignore) return;
        const next = cmsContent;
        const site = mergeSiteSettings(result.settingsData as AdminCmsSettings);
        setRawSettings(result.settingsData as AdminCmsSettings);
        setItems(next.items);
        setLastSavedItems(next.items);
        setStoreForm(site.storeForm);
        setStoreSwitches(site.storeSwitches);
        setLastSavedStoreForm(site.storeForm);
        setLastSavedStoreSwitches(site.storeSwitches);
        setActiveId((current) => (next.items.some((item) => item.id === current) ? current : next.items[0]?.id ?? 'home-hero'));
      } catch (err) {
        if (!ignore) {
          setMessageTone('error');
          setMessage(err instanceof Error ? err.message : '读取内容管理数据失败');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesGroup = item.group === activeGroup;
      const haystack = `${item.title} ${item.path} ${item.summary} ${item.modules.join(' ')}`.toLowerCase();
      return matchesGroup && (!keyword || haystack.includes(keyword));
    });
  }, [activeGroup, items, query]);

  const filteredMapEntries = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return contentMapEntries.filter((entry) => {
      const matchesArea = activeMapArea === 'all' || entry.area === activeMapArea;
      const haystack = `${entry.title} ${entry.customerLocation} ${entry.description} ${entry.adminEntry} ${entry.status}`.toLowerCase();
      return matchesArea && (!keyword || haystack.includes(keyword));
    });
  }, [activeMapArea, query]);

  const groupItems = useMemo(() => items.filter((item) => item.group === activeGroup), [activeGroup, items]);
  const activeItem = items.find((item) => item.id === activeId) ?? filteredItems[0] ?? groupItems[0] ?? items[0];
  const activeGroupMeta = groups.find((group) => group.id === activeGroup) ?? groups[0];
  const ActiveIcon = activeGroupMeta.icon;
  const activeGroupUnpublishedCount = groupItems.filter((item) => item.status !== 'published').length;
  const activeCmsMapEntry = contentMapEntries.find((entry) => {
    if (entry.source.type !== 'cmsContent') return false;
    return entry.source.itemId === activeItem?.id;
  });
  const activeCmsFrontendStatus = activeCmsMapEntry?.status ?? 'not_connected';
  const hasUnsavedChanges = (
    JSON.stringify(items) !== JSON.stringify(lastSavedItems) ||
    JSON.stringify(storeForm) !== JSON.stringify(lastSavedStoreForm) ||
    JSON.stringify(storeSwitches) !== JSON.stringify(lastSavedStoreSwitches)
  );
  const requiredFields = activeItem?.fields.filter((field) => field.required) ?? [];
  const completedRequired = requiredFields.filter((field) => field.value.trim()).length;
  const filledFields = activeItem?.fields.filter((field) => field.value.trim()).length ?? 0;
  const completion = Math.round((filledFields / Math.max(activeItem?.fields.length ?? 1, 1)) * 100);
  const imageReady = activeItem?.fields
    .filter((field) => field.key.toLowerCase().includes('image'))
    .every((field) => field.value.trim()) ?? true;
  const totalReady = items.filter((item) => item.status === 'ready' || item.status === 'published').length;
  const totalPublished = items.filter((item) => item.status === 'published').length;
  const connectedMapCount = contentMapEntries.filter((entry) => entry.status === 'connected').length;
  const partialMapCount = contentMapEntries.filter((entry) => entry.status === 'partial').length;
  const notConnectedMapCount = contentMapEntries.filter((entry) => entry.status === 'not_connected').length;
  const visualEntries = contentMapEntries.filter((entry) => entry.canVisualEdit);
  const selectedVisualEntry = visualEntries.find((entry) => entry.id === selectedVisualId) ?? visualEntries[0];
  const selectedVisualSource = selectedVisualEntry?.source;
  const selectedVisualCmsItem = selectedVisualSource?.type === 'cmsContent'
    ? items.find((item) => item.id === selectedVisualSource.itemId) ?? null
    : null;
  const selectedVisualIsSiteSetting = selectedVisualSource?.type === 'siteSettings';
  const selectedVisualSiteTargetId = selectedVisualIsSiteSetting ? getSiteConfigTargetId(selectedVisualEntry) : null;
  const selectedVisualCmsFields = useMemo(() => {
    if (!selectedVisualCmsItem) return [];
    if (!selectedVisualFieldKey) return selectedVisualCmsItem.fields.slice(0, 6);
    const selectedField = selectedVisualCmsItem.fields.find((field) => field.key === selectedVisualFieldKey);
    if (!selectedField) return selectedVisualCmsItem.fields.slice(0, 6);
    return [
      selectedField,
      ...selectedVisualCmsItem.fields.filter((field) => field.key !== selectedVisualFieldKey).slice(0, 5),
    ];
  }, [selectedVisualCmsItem, selectedVisualFieldKey]);
  const visualIframeSrc = selectedVisualEntry
    ? `/?visual-editor=1&visual-page=${visualPreviewPage}&visual-entry=${encodeURIComponent(selectedVisualEntry.id)}&preview=${visualFrameKey}`
    : `/?visual-editor=1&visual-page=${visualPreviewPage}&preview=${visualFrameKey}`;
  const messageClassName = {
    info: 'text-blue-600',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    error: 'text-red-600',
  }[messageTone];

  useEffect(() => {
    if (workspace !== 'visual' || !selectedVisualEntry) return;
    setVisualPreviewPage(getVisualPreviewPage(selectedVisualEntry));
  }, [workspace, selectedVisualEntry]);

  useEffect(() => {
    const handleVisualMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== 'object') return;
      const data = event.data as Record<string, unknown>;
      if (data.type === 'shopnova:editor-ready') return;
      if (data.type !== 'shopnova:select-content') return;

      const entryId = typeof data.entryId === 'string' ? data.entryId : '';
      const entry = contentMapEntries.find((current) => current.id === entryId);
      if (!entry) return;

      const fieldKey = typeof data.fieldKey === 'string' ? data.fieldKey : '';
      const label = typeof data.label === 'string' && data.label ? data.label : entry.title;
      setWorkspace('visual');
      setSelectedVisualId(entry.id);
      setSelectedVisualFieldKey(fieldKey);
      setSelectedVisualLabel(label);
      setVisualPreviewPage(getVisualPreviewPage(entry));
      if (entry.source.type === 'cmsContent') {
        setActiveGroup(entry.source.group);
        setActiveId(entry.source.itemId);
      }
      setMessageTone('info');
      setMessage(`已选中：${label}`);
    };

    window.addEventListener('message', handleVisualMessage);
    return () => window.removeEventListener('message', handleVisualMessage);
  }, []);

  const updateActiveItem = (patch: Partial<CmsItem>) => {
    if (!activeItem) return;
    setItems((prev) => prev.map((item) => (
      item.id === activeItem.id ? { ...item, ...patch, updatedAt: new Date().toISOString().slice(0, 10) } : item
    )));
    setSaved(false);
  };

  const updateCmsItemById = (itemId: string, patch: Partial<CmsItem>) => {
    setItems((prev) => prev.map((item) => (
      item.id === itemId ? { ...item, ...patch, updatedAt: new Date().toISOString().slice(0, 10) } : item
    )));
    setSaved(false);
  };

  const updateField = (fieldKey: string, value: Partial<CmsField>) => {
    if (!activeItem) return;
    updateActiveItem({
      fields: activeItem.fields.map((field) => (field.key === fieldKey ? { ...field, ...value } : field)),
    });
  };

  const updateCmsFieldByItemId = (itemId: string, fieldKey: string, value: Partial<CmsField>) => {
    const item = items.find((current) => current.id === itemId);
    if (!item) return;
    updateCmsItemById(itemId, {
      fields: item.fields.map((field) => (field.key === fieldKey ? { ...field, ...value } : field)),
    });
  };

  const handleSelectMedia = (asset: MediaAsset) => {
    if (!mediaTarget) return;
    updateCmsFieldByItemId(mediaTarget.itemId, mediaTarget.fieldKey, { value: asset.url });
    setMediaTarget(null);
  };

  const removeField = (fieldKey: string) => {
    if (!activeItem) return;
    updateActiveItem({ fields: activeItem.fields.filter((field) => field.key !== fieldKey) });
  };

  const addField = () => {
    if (!activeItem) return;
    const index = activeItem.fields.length + 1;
    updateActiveItem({
      fields: [
        ...activeItem.fields,
        { key: `customField${Date.now()}`, label: `自定义字段 ${index}`, value: '', type: 'text' },
      ],
    });
  };

  const addModule = () => {
    if (!activeItem) return;
    updateActiveItem({ modules: [...activeItem.modules, `新模块 ${activeItem.modules.length + 1}`] });
  };

  const updateModule = (index: number, value: string) => {
    if (!activeItem) return;
    updateActiveItem({ modules: activeItem.modules.map((module, current) => (current === index ? value : module)) });
  };

  const removeModule = (index: number) => {
    if (!activeItem) return;
    updateActiveItem({ modules: activeItem.modules.filter((_, current) => current !== index) });
  };

  const handleGroupChange = (group: CmsContentGroup) => {
    setActiveGroup(group);
    setActiveId(items.find((item) => item.group === group)?.id ?? items[0]?.id ?? 'home-hero');
  };

  const openContentMapEntry = (entry: ContentMapEntry) => {
    if (entry.source.type === 'cmsContent') {
      setActiveGroup(entry.source.group);
      setActiveId(entry.source.itemId);
      setWorkspace('cms');
      if (entry.status === 'not_connected' || entry.status === 'reserved') {
        setMessageTone('warning');
        setMessage('这个内容项后台可以编辑，但当前前台还没有接入显示。');
      } else if (entry.status === 'partial') {
        setMessageTone('warning');
        setMessage('这个内容项已部分接入，通常需要发布状态才会影响前台。');
      } else {
        setMessage('');
      }
      return;
    }

    if (entry.source.type === 'siteSettings') {
      const targetId = getSiteConfigTargetId(entry);
      if (targetId) localStorage.setItem(SITE_CONFIG_TARGET_KEY, targetId);
      if (onNavigate) {
        onNavigate('site');
      } else {
        setMessageTone('info');
        setMessage(`请到「${entry.adminEntry}」修改。`);
      }
      return;
    }

    if (entry.source.type === 'translation') {
      if (onNavigate) {
        onNavigate('translations');
      } else {
        setMessageTone('info');
        setMessage('请到「翻译管理」处理多语言内容。');
      }
    }
  };

  const publishActiveItem = () => {
    if (!activeItem) return;
    updateCmsItemById(activeItem.id, { status: 'published' });
    setMessageTone('warning');
    setMessage('已设为“已发布”。还需要点击保存，前台才会真正更新。');
  };

  const publishActiveGroup = () => {
    const today = new Date().toISOString().slice(0, 10);
    setItems((prev) => prev.map((item) => (
      item.group === activeGroup ? { ...item, status: 'published', updatedAt: today } : item
    )));
    setSaved(false);
    setMessageTone('warning');
    setMessage(`已将「${activeGroupMeta.title}」里的 ${groupItems.length} 个内容设为“已发布”。还需要点击保存，前台才会真正更新。`);
  };

  const createContent = () => {
    const id = `custom-${Date.now()}`;
    const next: CmsItem = {
      id,
      group: activeGroup,
      title: '新内容',
      path: `/custom-${Date.now()}`,
      status: 'draft',
      updatedAt: new Date().toISOString().slice(0, 10),
      summary: '新的自定义内容项，可编辑字段、模块和发布状态。',
      surface: '预留内容',
      system: false,
      fields: [
        { key: 'title', label: '标题', value: '新内容', required: true },
        { key: 'subtitle', label: '说明', value: '', type: 'textarea' },
        { key: 'body', label: '正文', value: '', type: 'textarea' },
      ],
      modules: ['内容主体'],
    };
    setItems((prev) => [...prev, next]);
    setActiveId(id);
    setSaved(false);
  };

  const deleteContent = () => {
    if (!activeItem || activeItem.system) return;
    const nextItems = items.filter((item) => item.id !== activeItem.id);
    setItems(nextItems);
    setActiveId(nextItems.find((item) => item.group === activeGroup)?.id ?? nextItems[0]?.id ?? 'home-hero');
    setSaved(false);
  };

  const saveContent = async () => {
    setSaving(true);
    setMessage('');
    try {
      const nextSettings: AdminCmsSettings = {
        ...rawSettings,
        storeForm,
        storeSwitches,
      };
      delete nextSettings.cmsContent;
      await Promise.all([
        saveAdminSettings(nextSettings),
        saveCmsContentItems(items),
      ]);
      setRawSettings(nextSettings);
      setLastSavedItems(items);
      setLastSavedStoreForm(storeForm);
      setLastSavedStoreSwitches(storeSwitches);
      setSaved(true);
      setVisualFrameKey((key) => key + 1);
      setMessageTone('success');
      setMessage('内容已保存。只有“已发布”的 CMS 内容会影响前台。');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setMessageTone('error');
      setMessage(err instanceof Error ? err.message : '保存内容失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  if (!activeItem) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">暂无内容项</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">内容管理</h2>
          <p className="mt-0.5 text-xs text-slate-400">管理首页模块、页面文案和发布状态。SEO、联系方式、导航等站点级信息统一在站点配置维护。</p>
          <div className="mt-2 flex h-5 flex-wrap items-center gap-2 text-xs text-slate-400">
            {loading ? (
              <span>正在读取内容...</span>
            ) : message ? (
              <span className={`font-semibold ${messageClassName}`}>{message}</span>
            ) : hasUnsavedChanges ? (
              <span className="font-semibold text-amber-600">有未保存修改</span>
            ) : saved ? (
              <span className="font-semibold text-emerald-600">内容已保存</span>
            ) : (
              <span>所有内容已保存</span>
            )}
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>内容项 {items.length}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>已发布 {totalPublished}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>待发布/已发布 {totalReady}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            {[
              ['map', '网站位置'],
              ['visual', '可视化编辑'],
              ['cms', 'CMS 字段'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setWorkspace(id as ContentWorkspace)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  workspace === id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={workspace === 'cms' ? '搜索页面、路径、模块' : '搜索网站位置、说明、入口'}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          {workspace === 'cms' && (
            <>
              <button
                type="button"
                onClick={createContent}
                disabled
                title="自定义内容需要先接前台路由，当前版本先编辑已有页面内容。"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400"
              >
                <Plus size={13} />
                新建内容
              </button>
              <button
                type="button"
                onClick={saveContent}
                disabled={loading || saving}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm ${
                  saved ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-blue-700'
                } disabled:cursor-wait disabled:bg-slate-300`}
              >
                {saved ? <Check size={13} /> : <Save size={13} />}
                {saving ? '保存中...' : saved ? '已保存' : '保存内容'}
              </button>
            </>
          )}
        </div>
      </div>

      {workspace !== 'map' && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>保存只是写入后台；CMS 内容还需要状态为“已发布”才会影响前台。草稿和待发布不会改用户端页面。</span>
          </div>
          {workspace === 'cms' && activeGroupUnpublishedCount > 0 && (
            <button
              type="button"
              onClick={publishActiveGroup}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 font-bold text-white hover:bg-amber-700"
            >
              <BadgeCheck size={13} />
              发布当前分组 {activeGroupUnpublishedCount}
            </button>
          )}
        </div>
      )}

      {workspace === 'map' && (
        <div className="grid h-[calc(100vh-168px)] min-h-[640px] grid-cols-[240px_minmax(0,1fr)_300px] gap-4">
          <aside className="flex min-h-0 flex-col rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="text-xs font-bold text-slate-500">网站位置</div>
              <div className="mt-0.5 text-[11px] text-slate-400">按客户看到的网站区域找内容</div>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {mapAreaOptions.map((area) => {
                const isActive = activeMapArea === area.id;
                const count = area.id === 'all'
                  ? contentMapEntries.length
                  : contentMapEntries.filter((entry) => entry.area === area.id).length;
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => setActiveMapArea(area.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                      isActive ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{area.title}</div>
                      <div className="truncate text-[11px] text-slate-400">{area.desc}</div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{count}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {activeMapArea === 'all' ? '全部可编辑位置' : mapAreaMeta[activeMapArea].title}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  点“去修改”会跳到真实后台入口；未接前台的内容会明确标记，不会误导客户。
                </p>
              </div>
              <div className="text-xs text-slate-400">共 {filteredMapEntries.length} 项</div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="grid gap-3">
                {filteredMapEntries.map((entry) => {
                  const areaMeta = mapAreaMeta[entry.area];
                  const actionLabel = entry.source.type === 'siteSettings'
                    ? '去站点配置'
                    : entry.source.type === 'translation'
                      ? '去翻译管理'
                      : '去编辑内容';
                  return (
                    <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900">{entry.title}</h4>
                            <MapStatusBadge status={entry.status} />
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{areaMeta.title}</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{entry.customerLocation}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-400">{entry.description}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <span className="rounded-full bg-slate-50 px-2.5 py-1 font-mono">{entry.id}</span>
                            <span>{entry.adminEntry}</span>
                          </div>
                          {entry.notes && (
                            <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                              {entry.notes}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => openContentMapEntry(entry)}
                          className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600"
                        >
                          {actionLabel}
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredMapEntries.length === 0 && (
                  <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                    <Search size={28} className="text-slate-300" />
                    <div className="mt-2 text-sm font-bold text-slate-700">没有找到匹配的位置</div>
                    <div className="mt-1 text-xs text-slate-400">换个关键词或选择全部位置。</div>
                  </div>
                )}
              </div>
            </div>
          </main>

          <aside className="min-h-0 space-y-4 overflow-y-auto">
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">接入状态</div>
              <div className="mt-4 grid gap-3">
                {[
                  ['已接入', connectedMapCount, 'connected'],
                  ['部分接入', partialMapCount, 'partial'],
                  ['未接前台', notConnectedMapCount, 'not_connected'],
                ].map(([label, count, status]) => {
                  const meta = mapStatusMeta[status as ContentMapStatus];
                  return (
                    <div key={String(label)} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <span className={`h-2 w-2 rounded-full ${meta.dotClassName}`} />
                        {label}
                      </div>
                      <span className="text-sm font-black text-slate-900">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <LayoutTemplate size={15} className="text-blue-600" />
                使用方式
              </div>
              <div className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                <p>客户先按网站位置找内容，不需要理解字段名。</p>
                <p>已接入代表保存后前台会读；未接前台代表后台有内容，但用户端还不会变化。</p>
                <p>SEO、货币、开关这类内容适合用非可视化编辑，不适合在页面上直接点改。</p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 text-xs leading-5 text-blue-700">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <Sparkles size={14} />
                下一步
              </div>
              这份清单后续会成为可视化编辑的底层索引；现在先保证客户能“看位置、找入口、知道是否生效”。
            </div>
          </aside>
        </div>
      )}

      {workspace === 'visual' && selectedVisualEntry && (
        <div className="grid h-[calc(100vh-168px)] min-h-[640px] grid-cols-[minmax(0,1fr)_340px] gap-4">
          <main className="flex min-h-0 flex-col rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">用户端可视化编辑</h3>
                <p className="mt-1 text-xs text-slate-400">左侧是真实前台页面。点击页面上的蓝框文案，右侧会自动定位到对应字段。</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={visualPreviewPage}
                  onChange={(event) => {
                    setVisualPreviewPage(event.target.value as VisualPreviewPage);
                    setVisualFrameKey((key) => key + 1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {visualPreviewPages.map((page) => (
                    <option key={page.id} value={page.id}>{page.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setVisualFrameKey((key) => key + 1)}
                  className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  刷新预览
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <iframe
                ref={visualFrameRef}
                key={visualFrameKey}
                title="ShopNova 用户端可视化编辑"
                src={visualIframeSrc}
                className="h-full w-full border-0 bg-white"
              />
            </div>

            <div className="hidden">
              <div className="border-b border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
                网站顶部
              </div>
              <div className="space-y-3 p-4">
                {visualEntries.filter((entry) => entry.area === 'header').map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedVisualId(entry.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      selectedVisualEntry.id === entry.id ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">{entry.title}</div>
                        <div className="mt-1 text-xs text-slate-400">{entry.customerLocation}</div>
                      </div>
                      <MapStatusBadge status={entry.status} />
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-y border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
                首页内容
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {visualEntries.filter((entry) => entry.area === 'home').map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedVisualId(entry.id)}
                    className={`min-h-[108px] rounded-xl border p-4 text-left transition-all ${
                      selectedVisualEntry.id === entry.id ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200'
                    }`}
                  >
                    <div className="flex h-full flex-col justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">{entry.title}</div>
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{entry.customerLocation}</div>
                      </div>
                      <MapStatusBadge status={entry.status} />
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-y border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
                营销区域
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {visualEntries.filter((entry) => entry.area === 'marketing').map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedVisualId(entry.id)}
                    className={`min-h-[108px] rounded-xl border p-4 text-left transition-all ${
                      selectedVisualEntry.id === entry.id ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200'
                    }`}
                  >
                    <div className="flex h-full flex-col justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">{entry.title}</div>
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{entry.customerLocation}</div>
                      </div>
                      <MapStatusBadge status={entry.status} />
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-y border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
                页脚和联系区域
              </div>
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {visualEntries.filter((entry) => ['footer', 'contact'].includes(entry.area)).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedVisualId(entry.id)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      selectedVisualEntry.id === entry.id ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">{entry.title}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-400">{entry.customerLocation}</div>
                      </div>
                      <MapStatusBadge status={entry.status} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </main>

          <aside className="min-h-0 space-y-4 overflow-y-auto">
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">当前选中</div>
                  <h3 className="mt-2 text-lg font-black text-slate-900">{selectedVisualEntry.title}</h3>
                  {selectedVisualLabel && (
                    <div className="mt-1 text-xs font-semibold text-blue-600">页面点选：{selectedVisualLabel}</div>
                  )}
                </div>
                <MapStatusBadge status={selectedVisualEntry.status} />
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">网站位置</div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{selectedVisualEntry.customerLocation}</p>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold text-slate-500">修改说明</div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{selectedVisualEntry.description}</p>
              </div>
              {selectedVisualCmsItem && (
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-blue-700">直接编辑 CMS 内容</div>
                      <div className="mt-1 text-[11px] text-blue-500">{selectedVisualCmsItem.path}</div>
                    </div>
                    <select
                      value={selectedVisualCmsItem.status}
                      onChange={(event) => updateCmsItemById(selectedVisualCmsItem.id, { status: event.target.value as CmsContentStatus })}
                      className="rounded-lg border border-blue-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      <option value="draft">草稿</option>
                      <option value="ready">待发布</option>
                      <option value="published">已发布</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">内容标题</label>
                      <input
                        value={selectedVisualCmsItem.title}
                        onChange={(event) => updateCmsItemById(selectedVisualCmsItem.id, { title: event.target.value })}
                        className="w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    {selectedVisualCmsFields.map((field) => (
                      <FieldInput
                        key={field.key}
                        field={field}
                        onChange={(value) => updateCmsFieldByItemId(selectedVisualCmsItem.id, field.key, value)}
                        onSelectImage={() => setMediaTarget({ itemId: selectedVisualCmsItem.id, fieldKey: field.key })}
                        highlight={field.key === selectedVisualFieldKey}
                      />
                    ))}
                    {selectedVisualCmsItem.fields.length > selectedVisualCmsFields.length && (
                      <div className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs leading-5 text-slate-500">
                        还有 {selectedVisualCmsItem.fields.length - selectedVisualCmsFields.length} 个字段，可打开完整编辑继续调整。
                      </div>
                    )}
                  </div>
                  {selectedVisualEntry.status === 'partial' && (
                    <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                      CMS 内容需要设为“已发布”并保存后，前台才会读取。
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={saveContent}
                    disabled={saving || !hasUnsavedChanges}
                    className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-bold text-white ${
                      saving || !hasUnsavedChanges ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Save size={15} />
                    {saving ? '保存中...' : saved ? '已保存' : '保存当前修改'}
                  </button>
                </div>
              )}
              {selectedVisualIsSiteSetting && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">站点配置项</div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    这个位置属于网站固定配置，不在内容管理里直接修改，避免和站点配置重复。请到站点配置统一调整。
                  </p>
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-500">
                    推荐入口：{selectedVisualEntry.adminEntry}
                    {selectedVisualSiteTargetId && <span className="ml-1 text-blue-600">已准备自动定位</span>}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => openContentMapEntry(selectedVisualEntry)}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                {selectedVisualIsSiteSetting ? '去站点配置修改' : '打开完整编辑'}
                <ArrowRight size={15} />
              </button>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 text-xs leading-5 text-amber-700">
              <div className="mb-2 font-bold">当前阶段说明</div>
              现在左侧已经是真实用户端预览，不再是假卡片。页面里带蓝色描边的文字可以点选；导航、页脚链接这类结构型内容会跳到完整编辑器处理。
            </div>
          </aside>
        </div>
      )}

      {workspace === 'cms' && (
      <div className="overflow-x-auto pb-1">
        <div className="grid h-[calc(100vh-168px)] min-h-[640px] min-w-[1240px] grid-cols-[220px_320px_minmax(0,1fr)_280px] gap-4">
          <aside className="flex min-h-0 flex-col rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="text-xs font-bold text-slate-500">内容分组</div>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {groups.map((group) => {
                const Icon = group.icon;
                const isActive = group.id === activeGroup;
                const count = items.filter((item) => item.group === group.id).length;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleGroupChange(group.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                      isActive ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{group.title}</div>
                      <div className="truncate text-[11px] text-slate-400">{group.desc}</div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{count}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <aside className="flex min-h-0 flex-col rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <ActiveIcon size={15} className="text-blue-600" />
                  {activeGroupMeta.title}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">{filteredItems.length} 个内容项</div>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {filteredItems.map((item) => {
                const isActive = item.id === activeItem.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      isActive ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-800">{item.title}</div>
                        <div className="mt-0.5 truncate text-[11px] font-mono text-slate-400">{item.path}</div>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.summary}</p>
                    <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock size={12} />
                        {item.updatedAt}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500">{item.surface}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">{activeItem.title}</h3>
                  <StatusBadge status={activeItem.status} />
                  <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500">{activeItem.surface}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{activeItem.summary}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPreviewOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
                  <Eye size={13} />
                  预览
                </button>
                {activeItem.status !== 'published' && (
                  <button type="button" onClick={publishActiveItem} className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    <BadgeCheck size={13} />
                    发布当前
                  </button>
                )}
                {!activeItem.system && (
                  <button type="button" onClick={deleteContent} className="flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600">
                    <Trash2 size={13} />
                    删除
                  </button>
                )}
                <button type="button" onClick={saveContent} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                  <Save size={13} />
                  保存内容
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <section>
                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">基础信息</div>
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_160px]">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">内容标题</label>
                    <input value={activeItem.title} onChange={(event) => updateActiveItem({ title: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">页面路径 / 内容位置</label>
                    <input value={activeItem.path} onChange={(event) => updateActiveItem({ path: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">发布状态</label>
                    <select
                      value={activeItem.status}
                      onChange={(event) => updateActiveItem({ status: event.target.value as CmsContentStatus })}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      <option value="draft">草稿</option>
                      <option value="ready">待发布</option>
                      <option value="published">已发布</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">内容说明</label>
                    <textarea value={activeItem.summary} onChange={(event) => updateActiveItem({ summary: event.target.value })} rows={3} className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                  </div>
                </div>
              </section>

              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">内容字段</div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">必填 {completedRequired}/{requiredFields.length}</span>
                    <button type="button" onClick={addField} className="flex items-center gap-1 text-xs font-semibold text-blue-600">
                      <Plus size={12} />
                      添加字段
                    </button>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {activeItem.fields.map((field) => (
                    <FieldInput
                      key={field.key}
                      field={field}
                      onChange={(value) => updateField(field.key, value)}
                      onRemove={() => removeField(field.key)}
                      onSelectImage={() => setMediaTarget({ itemId: activeItem.id, fieldKey: field.key })}
                    />
                  ))}
                </div>
              </section>

              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">页面模块</div>
                  <button type="button" onClick={addModule} className="flex items-center gap-1 text-xs font-semibold text-blue-600">
                    <Plus size={12} />
                    添加模块
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {activeItem.modules.map((module, index) => (
                    <div key={`${module}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-xs font-black text-blue-700">{index + 1}</div>
                        <input value={module} onChange={(event) => updateModule(index, event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        <button type="button" onClick={() => removeModule(index)} className="text-slate-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-400">
                        <span>模块名称会随内容一起保存</span>
                        <FilePenLine size={13} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </main>

          <aside className="min-h-0 space-y-4 overflow-y-auto">
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">CMS 完整度</div>
                <span className="text-lg font-black text-slate-900">{completion}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${completion}%` }} />
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { label: '必填字段', ready: completedRequired === requiredFields.length, icon: FileText },
                  { label: '图片素材', ready: imageReady, icon: Image },
                  { label: '已保存', ready: !hasUnsavedChanges, icon: Save },
                ].map((check) => {
                  const Icon = check.icon;
                  return (
                    <div key={check.label} className="flex items-center gap-2 text-sm text-slate-600">
                      {check.ready ? <CheckCircle2 size={15} className="text-emerald-500" /> : <AlertCircle size={15} className="text-amber-500" />}
                      <Icon size={14} className="text-slate-400" />
                      {check.label}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Languages size={15} className="text-blue-600" />
                翻译状态
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ['中文', true],
                  ['English', true],
                  ['日本語', false],
                  ['한국어', false],
                ].map(([locale, ready]) => (
                  <div key={String(locale)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-xs font-semibold text-slate-700">{locale}</div>
                    <div className={`mt-1 text-[11px] ${ready ? 'text-emerald-600' : 'text-slate-400'}`}>{ready ? '已准备' : '待同步'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <LayoutTemplate size={15} className="text-blue-600" />
                前台接入
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <BadgeCheck
                    size={15}
                    className={(activeCmsFrontendStatus === 'connected' || activeCmsFrontendStatus === 'partial') ? 'text-emerald-500' : 'text-slate-300'}
                  />
                  {activeCmsFrontendStatus === 'not_connected' ? '当前内容未接前台' : activeCmsFrontendStatus === 'reserved' ? '预留内容暂未确定展示位' : '前台已读取基础字段'}
                </div>
                <div className="flex items-center gap-2">
                  {activeItem.status === 'published' ? <CheckCircle2 size={15} className="text-emerald-500" /> : <AlertCircle size={15} className="text-amber-500" />}
                  {activeItem.status === 'published' ? '当前已发布，保存后前台可读取' : '当前未发布，前台不会读取'}
                </div>
                {activeCmsFrontendStatus === 'partial' && (
                  <div className="flex items-center gap-2">
                    <AlertCircle size={15} className="text-amber-500" />
                    只接入基础字段，复杂列表仍用原数据
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <LinkIcon size={15} className="text-slate-400" />
                  {activeItem.path}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 text-xs leading-5 text-blue-700">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <Sparkles size={14} />
                使用说明
              </div>
              修改内容后先确认发布状态，再点击保存。状态为“已发布”的 CMS 内容才会被用户端读取；草稿和待发布不会影响前台。
            </div>
          </aside>
        </div>
      </div>
      )}

      {previewOpen && <PreviewModal item={activeItem} onClose={() => setPreviewOpen(false)} />}
      {mediaTarget && <CmsMediaPickerModal onSelect={handleSelectMedia} onClose={() => setMediaTarget(null)} />}
    </div>
  );
}
