import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Building2,
  CalendarClock,
  Check,
  ExternalLink,
  FileText,
  Image,
  MonitorSmartphone,
  PanelTop,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import AdminSwitch from '../components/AdminSwitch';
import {
  DEFAULT_FOOTER_LINK_SECTIONS,
  DEFAULT_HEADER_NAV_LINKS,
  DEFAULT_STORE_FORM,
  DEFAULT_STORE_SWITCHES,
  fetchAdminSiteSettings,
  saveSiteSettings,
  type StoreFooterLink,
  type StoreFooterLinkSection,
  type StoreNavigationLink,
  type StoreNavigationTarget,
  type StoreForm,
  type StoreSwitches,
} from '../lib/siteSettings';
import { fetchMediaSettings, formatMediaSize, type MediaAsset } from '../lib/mediaService';

type StoreField = keyof StoreForm;
type SwitchField = keyof StoreSwitches;
type SiteConfigGroup = 'brand' | 'navigation' | 'contact' | 'commerce' | 'seo';
const SITE_CONFIG_TARGET_KEY = 'shopnova-site-config-target';

type ConfigItem = {
  id: string;
  group: SiteConfigGroup;
  title: string;
  path: string;
  status: 'ready';
  updatedAt: string;
  summary: string;
  fields?: Array<{ label: string; key: StoreField; type?: 'text' | 'number' | 'url' | 'locale'; multiline?: boolean }>;
  switches?: Array<{ label: string; desc: string; key: SwitchField }>;
  blocks: string[];
};

const groups: Array<{ id: SiteConfigGroup; title: string; desc: string; icon: React.ElementType }> = [
  { id: 'brand', title: '品牌信息', desc: '店铺名、Logo、公司名', icon: Building2 },
  { id: 'navigation', title: '导航与页眉', desc: '主导航、页脚导航、公告', icon: PanelTop },
  { id: 'contact', title: '联系与页脚', desc: '客服、合作、版权、社交', icon: FileText },
  { id: 'commerce', title: '基础商业规则', desc: '货币、免邮、展示开关', icon: ShoppingBag },
  { id: 'seo', title: 'SEO 基础', desc: '标题、描述、favicon', icon: Search },
];

const configItems: ConfigItem[] = [
  {
    id: 'brand-identity',
    group: 'brand',
    title: '品牌身份',
    path: 'brand/identity',
    status: 'ready',
    updatedAt: '2026-05-08',
    summary: '管理店铺名称、简称、品牌标语和公司名称。',
    fields: [
      { label: '店铺名称', key: 'storeName' },
      { label: '店铺简称', key: 'storeShortName' },
      { label: '品牌 Slogan', key: 'slogan' },
      { label: '公司名称', key: 'companyName' },
    ],
    blocks: ['品牌名称', '品牌标语', '公司主体', '后台品牌位'],
  },
  {
    id: 'brand-assets',
    group: 'brand',
    title: 'Logo 素材',
    path: 'brand/assets',
    status: 'ready',
    updatedAt: '2026-05-08',
    summary: '管理前台 Header 使用的 Logo 图片。',
    fields: [
      { label: 'Logo 图片 URL', key: 'logoUrl', type: 'url' },
    ],
    blocks: ['前台 Header Logo', '移动端菜单 Logo', '默认图标回退'],
  },
  {
    id: 'nav-main',
    group: 'navigation',
    title: '主导航',
    path: 'navigation/main',
    status: 'ready',
    updatedAt: '2026-05-08',
    summary: '管理前台顶部导航链接、排序、显示状态和跳转地址。',
    blocks: ['首页', '全部商品', '新品上市', '自定义链接'],
  },
  {
    id: 'nav-footer',
    group: 'navigation',
    title: '页脚导航',
    path: 'navigation/footer',
    status: 'ready',
    updatedAt: '2026-05-08',
    summary: '管理页脚客服、关于我们、政策条款和社交链接分组。',
    blocks: ['客服链接', '关于链接', '政策链接', '社交链接'],
  },
  {
    id: 'header-announcement',
    group: 'navigation',
    title: '页眉公告',
    path: 'navigation/header',
    status: 'ready',
    updatedAt: '2026-05-08',
    summary: '管理顶部公告、搜索框提示和语言切换开关。',
    fields: [
      { label: '顶部公告', key: 'announcementText', multiline: true },
      { label: '搜索框占位文案', key: 'searchPlaceholder' },
    ],
    switches: [
      { label: '显示公告栏', desc: '关闭后前台会隐藏顶部公告栏', key: 'showAnnouncement' },
      { label: '显示语言切换', desc: '用于多语言站点交付', key: 'showLanguageSwitch' },
    ],
    blocks: ['公告栏', '搜索框', '语言切换', '活动提示'],
  },
  {
    id: 'contact-support',
    group: 'contact',
    title: '客服联系方式',
    path: 'contact/support',
    status: 'ready',
    updatedAt: '2026-05-08',
    summary: '管理客服邮箱、客服电话、工作时间和售后联系提示。',
    fields: [
      { label: '客服邮箱', key: 'supportEmail' },
      { label: '客服电话', key: 'supportPhone' },
      { label: '工作时间', key: 'workingHours' },
    ],
    blocks: ['客服邮箱', '客服电话', '工作时间', '售后提示'],
  },
  {
    id: 'contact-business',
    group: 'contact',
    title: '商务与媒体合作',
    path: 'contact/business',
    status: 'ready',
    updatedAt: '2026-05-08',
    summary: '管理商务合作邮箱、媒体合作邮箱和公司地址。',
    fields: [
      { label: '商务合作邮箱', key: 'businessEmail' },
      { label: '媒体合作邮箱', key: 'mediaEmail' },
      { label: '公司地址', key: 'companyAddress', multiline: true },
    ],
    blocks: ['商务邮箱', '媒体邮箱', '合作说明', '地址信息'],
  },
  {
    id: 'footer-copy',
    group: 'contact',
    title: '页脚文案',
    path: 'footer/copy',
    status: 'ready',
    updatedAt: '2026-05-08',
    summary: '管理页脚简介、版权文字和备案信息。',
    fields: [
      { label: '页脚简介', key: 'footerDescription', multiline: true },
      { label: '版权文字', key: 'copyrightText' },
      { label: '备案号 / 许可证号', key: 'icpNumber' },
    ],
    blocks: ['页脚简介', '版权文字', '备案信息'],
  },
  {
    id: 'footer-social',
    group: 'contact',
    title: '社交链接',
    path: 'footer/social',
    status: 'ready',
    updatedAt: '2026-05-08',
    summary: '管理 X / Twitter、Instagram 和 YouTube 链接。',
    fields: [
      { label: 'X / Twitter 链接', key: 'socialX', type: 'url' },
      { label: 'Instagram 链接', key: 'socialInstagram', type: 'url' },
      { label: 'YouTube 链接', key: 'socialYoutube', type: 'url' },
    ],
    blocks: ['X / Twitter', 'Instagram', 'YouTube'],
  },
  {
    id: 'commerce-currency',
    group: 'commerce',
    title: '货币与免邮',
    path: 'commerce/currency',
    status: 'ready',
    updatedAt: '2026-05-08',
    summary: '管理默认货币、货币符号和满免邮门槛。',
    fields: [
      { label: '默认货币', key: 'defaultCurrency' },
      { label: '货币符号', key: 'currencySymbol' },
      { label: '满免邮门槛', key: 'freeShippingThreshold', type: 'number' },
    ],
    blocks: ['商品价格', '购物车金额', '结算金额', '免邮提示'],
  },
  {
    id: 'commerce-display',
    group: 'commerce',
    title: '展示开关',
    path: 'commerce/display',
    status: 'ready',
    updatedAt: '2026-05-08',
    summary: '管理销量和评价等前台展示规则。',
    switches: [
      { label: '显示销量', desc: '商品卡和详情页可用', key: 'showSalesCount' },
      { label: '显示评价', desc: '商品评分与评价数量可用', key: 'showReviews' },
      { label: '风控自动拦截', desc: '高风险订单达到阈值时自动标记拒绝', key: 'riskAutoBlock' },
    ],
    blocks: ['商品卡片', '商品详情', '首页评价区'],
  },
  {
    id: 'seo-meta',
    group: 'seo',
    title: 'SEO 元信息',
    path: 'seo/meta',
    status: 'ready',
    updatedAt: '2026-05-08',
    summary: '管理网站标题、网站描述和搜索结果预览。',
    fields: [
      { label: '网站标题', key: 'siteTitle' },
      { label: '网站描述', key: 'siteDescription', multiline: true },
      { label: 'Favicon URL', key: 'faviconUrl', type: 'url' },
    ],
    blocks: ['浏览器标题', '搜索描述', '浏览器图标'],
  },
];

const defaultLanguageField: NonNullable<ConfigItem['fields']>[number] = { label: '默认语言', key: 'defaultLanguage', type: 'locale' };

const storeFieldImpactText: Partial<Record<StoreField, string>> = {
  storeName: '用于后台和部分品牌资料展示，完整店铺名称可给客户识别品牌主体。',
  storeShortName: '显示在网站顶部 Logo 旁边，也显示在页脚品牌区域。',
  slogan: '用于品牌摘要和配置预览，后续可接入首页或品牌区。',
  companyName: '公司主体信息，后续可用于页脚、政策页、发票或合同信息。',
  logoUrl: '显示在网站顶部左上角；没有图片时会显示默认图标。',
  announcementText: '显示在网站最顶部的公告横条，常用于免邮、活动和通知。',
  searchPlaceholder: '显示在网站顶部搜索框里，提示用户可以搜索什么。',
  supportEmail: '显示在联系我们页面的客服卡片，也可用于售后联系说明。',
  supportPhone: '显示在联系我们页面的电话卡片，会和工作时间一起出现。',
  workingHours: '显示在联系我们页面，告诉客户客服什么时候在线。',
  businessEmail: '商务合作邮箱；当前前台未直接展示，后续可接入合作页面。',
  mediaEmail: '显示在媒体合作页面，用于媒体或内容合作联系。',
  companyAddress: '显示在联系我们页面的地址卡片。',
  footerDescription: '显示在网站底部品牌名下面的简介文字。',
  copyrightText: '显示在网站底部最下方的版权声明。',
  icpNumber: '显示在网站底部版权区域；为空时前台不显示。',
  socialX: '填写后在网站底部显示 X / Twitter 入口。',
  socialInstagram: '填写后在网站底部显示 Instagram 入口。',
  socialYoutube: '填写后在网站底部显示 YouTube 入口。',
  defaultCurrency: '当前主要作为后台配置展示；前台价格实际主要看货币符号。',
  currencySymbol: '显示在商品价格、购物车、结算金额和订单金额前面。',
  defaultLanguage: '新访客没有手动选择语言时，会优先使用这个默认语言。',
  freeShippingThreshold: '影响购物车里的满额免邮提示和进度条。',
  firstOrderDiscount: '首单优惠配置；当前前台未发现直接使用。',
  siteTitle: '显示在浏览器标签页和搜索结果标题里，不显示在页面正文。',
  siteDescription: '显示在搜索结果描述和分享描述里，不显示在页面正文。',
  faviconUrl: '显示在浏览器标签页左侧的小图标；为空时会回退使用 Logo。',
};

function getInitialSiteConfigTarget() {
  if (typeof window === 'undefined') {
    return { itemId: 'brand-identity', group: 'brand' as SiteConfigGroup };
  }

  const stored = window.localStorage.getItem(SITE_CONFIG_TARGET_KEY);
  if (stored) window.localStorage.removeItem(SITE_CONFIG_TARGET_KEY);
  const item = configItems.find((entry) => entry.id === stored) ?? configItems[0];
  return { itemId: item.id, group: item.group };
}

const navigationTargetOptions: Array<{ value: StoreNavigationTarget; label: string; path: string }> = [
  { value: 'home', label: '首页', path: '/' },
  { value: 'products', label: '全部商品', path: '/products' },
  { value: 'new-arrivals', label: '新品上市', path: '/products?sort=new' },
  { value: 'hot-deals', label: '热门优惠', path: '/products?sort=hot' },
  { value: 'flash-sale', label: '限时抢购', path: '/products?filter=flashSale' },
  { value: 'brand-story', label: '品牌故事', path: '/brand-story' },
  { value: 'contact-us', label: '联系我们', path: '/contact-us' },
  { value: 'order-lookup', label: '订单查询', path: '/order-lookup' },
  { value: 'return-policy', label: '退换货政策', path: '/return-policy' },
  { value: 'logistics', label: '物流说明', path: '/logistics' },
  { value: 'faq', label: 'FAQ', path: '/faq' },
  { value: 'careers', label: '招聘信息', path: '/careers' },
  { value: 'media-cooperation', label: '媒体合作', path: '/media-cooperation' },
  { value: 'privacy', label: '隐私政策', path: '/privacy' },
  { value: 'terms', label: '服务条款', path: '/terms' },
  { value: 'payment-security', label: '支付安全', path: '/payment-security' },
  { value: 'cookies', label: 'Cookie 设置', path: '/cookies' },
  { value: 'custom', label: '自定义链接', path: 'custom' },
];

const localeOptions = [
  { value: 'en-US', label: 'English' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'ko-KR', label: '한국어' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'zh-CN', label: '简体中文' },
];

const statusMeta = {
  ready: { label: '已接入', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

function StatusBadge({ status }: { status: ConfigItem['status'] }) {
  const meta = statusMeta[status];
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}>{meta.label}</span>;
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-medium text-slate-800">{label}</div>
        {desc && <div className="mt-0.5 text-[11px] text-slate-400">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function HeaderNavigationEditor({
  links,
  onChange,
}: {
  links: StoreNavigationLink[];
  onChange: (links: StoreNavigationLink[]) => void;
}) {
  const updateLink = (index: number, value: Partial<StoreNavigationLink>) => {
    onChange(links.map((link, currentIndex) => (currentIndex === index ? { ...link, ...value } : link)));
  };

  const moveLink = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= links.length) return;
    const next = [...links];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };

  const addLink = () => {
    onChange([
      ...links,
      {
        id: `custom-${Date.now()}`,
        label: '自定义链接',
        target: 'custom',
        url: 'https://example.com',
        enabled: true,
      },
    ]);
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">顶部主导航</div>
          <div className="mt-0.5 text-[11px] text-slate-400">这里保存后会直接影响前台顶部导航和移动端菜单。</div>
        </div>
        <button type="button" onClick={addLink} className="flex items-center gap-1 text-xs font-semibold text-blue-600">
          <Plus size={12} />
          添加链接
        </button>
      </div>
      <div className="grid gap-3">
        {links.map((link, index) => {
          const targetPath = navigationTargetOptions.find((option) => option.value === link.target)?.path ?? '-';
          return (
            <div key={link.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 xl:grid-cols-[1fr_180px_1fr_auto] xl:items-end">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">导航名称</label>
                  <input
                    value={link.label}
                    onChange={(event) => updateLink(index, { label: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">跳转目标</label>
                  <select
                    value={link.target}
                    onChange={(event) => updateLink(index, { target: event.target.value as StoreNavigationTarget })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    {navigationTargetOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                    {link.target === 'custom' ? '自定义 URL' : '前台路径'}
                  </label>
                  <input
                    value={link.target === 'custom' ? link.url ?? '' : targetPath}
                    onChange={(event) => updateLink(index, { url: event.target.value })}
                    disabled={link.target !== 'custom'}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-600 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 xl:justify-end">
                  <AdminSwitch enabled={link.enabled} onChange={() => updateLink(index, { enabled: !link.enabled })} label={`${link.label} 显示状态`} />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveLink(index, -1)}
                      disabled={index === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(index, 1)}
                      disabled={index === links.length - 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FooterNavigationEditor({
  sections,
  onChange,
}: {
  sections: StoreFooterLinkSection[];
  onChange: (sections: StoreFooterLinkSection[]) => void;
}) {
  const updateSection = (sectionIndex: number, value: Partial<StoreFooterLinkSection>) => {
    onChange(sections.map((section, index) => (index === sectionIndex ? { ...section, ...value } : section)));
  };

  const updateLink = (sectionIndex: number, linkIndex: number, value: Partial<StoreFooterLink>) => {
    onChange(sections.map((section, index) => {
      if (index !== sectionIndex) return section;
      return {
        ...section,
        links: section.links.map((link, currentIndex) => (currentIndex === linkIndex ? { ...link, ...value } : link)),
      };
    }));
  };

  const addSection = () => {
    onChange([
      ...sections,
      {
        id: `footer-section-${Date.now()}`,
        title: '新分组',
        links: [],
      },
    ]);
  };

  const removeSection = (sectionIndex: number) => {
    onChange(sections.filter((_, index) => index !== sectionIndex));
  };

  const addLink = (sectionIndex: number) => {
    const nextLink: StoreFooterLink = {
      id: `footer-link-${Date.now()}`,
      label: '新链接',
      target: 'custom',
      url: 'https://example.com',
      enabled: true,
    };
    onChange(sections.map((section, index) => (
      index === sectionIndex ? { ...section, links: [...section.links, nextLink] } : section
    )));
  };

  const removeLink = (sectionIndex: number, linkIndex: number) => {
    onChange(sections.map((section, index) => (
      index === sectionIndex
        ? { ...section, links: section.links.filter((_, currentIndex) => currentIndex !== linkIndex) }
        : section
    )));
  };

  const moveLink = (sectionIndex: number, linkIndex: number, direction: -1 | 1) => {
    const section = sections[sectionIndex];
    const nextIndex = linkIndex + direction;
    if (!section || nextIndex < 0 || nextIndex >= section.links.length) return;
    const links = [...section.links];
    [links[linkIndex], links[nextIndex]] = [links[nextIndex], links[linkIndex]];
    updateSection(sectionIndex, { links });
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">页脚链接分组</div>
          <div className="mt-0.5 text-[11px] text-slate-400">管理 Footer 的客服、关于、政策等分组和链接顺序。</div>
        </div>
        <button type="button" onClick={addSection} className="flex items-center gap-1 text-xs font-semibold text-blue-600">
          <Plus size={12} />
          添加分组
        </button>
      </div>
      <div className="grid gap-4">
        {sections.map((section, sectionIndex) => (
          <div key={section.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">分组名称</label>
                <input
                  value={section.title}
                  onChange={(event) => updateSection(sectionIndex, { title: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div className="flex items-center gap-2 sm:pt-5">
                <button type="button" onClick={() => addLink(sectionIndex)} className="flex items-center gap-1 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-600">
                  <Plus size={12} />
                  添加链接
                </button>
                <button type="button" onClick={() => removeSection(sectionIndex)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="grid gap-2">
              {section.links.map((link, linkIndex) => {
                const targetPath = navigationTargetOptions.find((option) => option.value === link.target)?.path ?? '-';
                return (
                  <div key={link.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 xl:grid-cols-[1fr_180px_1fr_auto] xl:items-end">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">链接名称</label>
                      <input
                        value={link.label}
                        onChange={(event) => updateLink(sectionIndex, linkIndex, { label: event.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">跳转目标</label>
                      <select
                        value={link.target}
                        onChange={(event) => updateLink(sectionIndex, linkIndex, { target: event.target.value as StoreNavigationTarget })}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        {navigationTargetOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        {link.target === 'custom' ? '自定义 URL' : '前台路径'}
                      </label>
                      <input
                        value={link.target === 'custom' ? link.url ?? '' : targetPath}
                        onChange={(event) => updateLink(sectionIndex, linkIndex, { url: event.target.value })}
                        disabled={link.target !== 'custom'}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 xl:justify-end">
                      <AdminSwitch enabled={link.enabled} onChange={() => updateLink(sectionIndex, linkIndex, { enabled: !link.enabled })} label={`${link.label} 显示状态`} />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveLink(sectionIndex, linkIndex, -1)}
                          disabled={linkIndex === 0}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLink(sectionIndex, linkIndex, 1)}
                          disabled={linkIndex === section.links.length - 1}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLink(sectionIndex, linkIndex)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SiteMediaPickerModal({ onSelect, onClose }: { onSelect: (asset: MediaAsset) => void; onClose: () => void }) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    fetchMediaSettings()
      .then((result) => {
        if (!ignore) {
          setAssets(result.mediaAssets.filter((asset) => asset.usage === 'brand' || asset.usage === 'content' || asset.usage === 'other'));
        }
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
            <div className="mt-0.5 text-xs text-slate-400">选择后会自动填入当前 Logo / Favicon URL 字段。</div>
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
              <div className="mt-2 text-sm font-bold text-slate-700">暂无可用站点图片</div>
              <div className="mt-1 text-xs text-slate-400">请先到图片管理上传 brand、content 或 other 用途的素材。</div>
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

function FieldEditor({
  item,
  values,
  switches,
  headerNavLinks,
  footerLinkSections,
  onFieldChange,
  onSwitchChange,
  onHeaderNavChange,
  onFooterLinksChange,
  onSelectMediaField,
}: {
  item: ConfigItem;
  values: StoreForm;
  switches: StoreSwitches;
  headerNavLinks: StoreNavigationLink[];
  footerLinkSections: StoreFooterLinkSection[];
  onFieldChange: (key: StoreField, value: string) => void;
  onSwitchChange: (value: Partial<StoreSwitches>) => void;
  onHeaderNavChange: (links: StoreNavigationLink[]) => void;
  onFooterLinksChange: (sections: StoreFooterLinkSection[]) => void;
  onSelectMediaField: (key: StoreField) => void;
}) {
  const editorFields = item.id === 'commerce-currency'
    ? [...(item.fields ?? []), defaultLanguageField]
    : item.fields;

  return (
    <div className="grid gap-5 p-5">
      {editorFields && (
        <section>
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">配置字段</div>
          <div className="grid gap-4 md:grid-cols-2">
            {editorFields.map((field) => {
              const impactText = storeFieldImpactText[field.key];
              const canSelectMedia = field.key === 'logoUrl' || field.key === 'faviconUrl';
              return (
                <div key={field.key} className={field.multiline ? 'md:col-span-2' : undefined}>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">{field.label}</label>
                  {impactText && <div className="mb-2 text-[11px] leading-5 text-slate-400">{impactText}</div>}
                  {field.type === 'locale' ? (
                    <select
                      value={values[field.key]}
                      onChange={(event) => onFieldChange(field.key, event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      {localeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : field.multiline ? (
                    <textarea
                      rows={4}
                      value={values[field.key]}
                      onChange={(event) => onFieldChange(field.key, event.target.value)}
                      className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  ) : (
                    <input
                      type={field.type ?? 'text'}
                      value={values[field.key]}
                      onChange={(event) => onFieldChange(field.key, event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  )}
                  {canSelectMedia && (
                    <button
                      type="button"
                      onClick={() => onSelectMediaField(field.key)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <Image size={13} />
                      从素材库选择
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {item.switches && (
        <section>
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">显示开关</div>
          <div className="grid gap-3">
            {item.switches.map((entry) => (
              <SettingRow key={entry.key} label={entry.label} desc={entry.desc}>
                <AdminSwitch
                  enabled={switches[entry.key]}
                  onChange={() => onSwitchChange({ [entry.key]: !switches[entry.key] } as Partial<StoreSwitches>)}
                  label={entry.label}
                />
              </SettingRow>
            ))}
          </div>
        </section>
      )}

      {item.id === 'nav-main' && (
        <HeaderNavigationEditor links={headerNavLinks} onChange={onHeaderNavChange} />
      )}

      {item.id === 'nav-footer' && (
        <FooterNavigationEditor sections={footerLinkSections} onChange={onFooterLinksChange} />
      )}

      <section>
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">前台影响范围</div>
        <div className="grid gap-3 md:grid-cols-2">
          {item.blocks.map((block, index) => (
            <div key={block} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-xs font-black text-blue-700">{index + 1}</div>
                <div className="text-sm font-bold text-slate-800">{block}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function SiteConfig() {
  const [initialTarget] = useState(getInitialSiteConfigTarget);
  const [activeGroup, setActiveGroup] = useState<SiteConfigGroup>(initialTarget.group);
  const [activeItemId, setActiveItemId] = useState(initialTarget.itemId);
  const [storeForm, setStoreForm] = useState<StoreForm>(() => DEFAULT_STORE_FORM);
  const [storeSwitches, setStoreSwitches] = useState<StoreSwitches>(() => DEFAULT_STORE_SWITCHES);
  const [headerNavLinks, setHeaderNavLinks] = useState<StoreNavigationLink[]>(() => DEFAULT_HEADER_NAV_LINKS);
  const [footerLinkSections, setFooterLinkSections] = useState<StoreFooterLinkSection[]>(() => DEFAULT_FOOTER_LINK_SECTIONS);
  const [lastSavedForm, setLastSavedForm] = useState<StoreForm>(() => DEFAULT_STORE_FORM);
  const [lastSavedSwitches, setLastSavedSwitches] = useState<StoreSwitches>(() => DEFAULT_STORE_SWITCHES);
  const [lastSavedHeaderNavLinks, setLastSavedHeaderNavLinks] = useState<StoreNavigationLink[]>(() => DEFAULT_HEADER_NAV_LINKS);
  const [lastSavedFooterLinkSections, setLastSavedFooterLinkSections] = useState<StoreFooterLinkSection[]>(() => DEFAULT_FOOTER_LINK_SECTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [mediaTarget, setMediaTarget] = useState<StoreField | null>(null);

  const activeGroupMeta = groups.find((group) => group.id === activeGroup) ?? groups[0];
  const ActiveIcon = activeGroupMeta.icon;
  const groupItems = useMemo(() => configItems.filter((item) => item.group === activeGroup), [activeGroup]);
  const activeItem = configItems.find((item) => item.id === activeItemId) ?? groupItems[0] ?? configItems[0];
  const hasUnsavedChanges =
    JSON.stringify(storeForm) !== JSON.stringify(lastSavedForm) ||
    JSON.stringify(storeSwitches) !== JSON.stringify(lastSavedSwitches) ||
    JSON.stringify(headerNavLinks) !== JSON.stringify(lastSavedHeaderNavLinks) ||
    JSON.stringify(footerLinkSections) !== JSON.stringify(lastSavedFooterLinkSections);
  const launchCheckItems = [
    { label: '店铺名称', ready: Boolean(storeForm.storeName.trim() && storeForm.storeShortName.trim()) },
    { label: 'Logo', ready: Boolean(storeForm.logoUrl.trim()) },
    { label: '顶部导航', ready: headerNavLinks.some((link) => link.enabled && link.label.trim()) },
    { label: '页脚导航', ready: footerLinkSections.some((section) => section.links.some((link) => link.enabled && link.label.trim())) },
    { label: '联系方式', ready: Boolean(storeForm.supportEmail.trim() && storeForm.supportPhone.trim() && storeForm.workingHours.trim() && storeForm.companyAddress.trim() && storeForm.businessEmail.trim()) },
    { label: '公告栏', ready: Boolean(storeForm.announcementText.trim()) },
    { label: 'SEO 基础', ready: Boolean(storeForm.siteTitle.trim() && storeForm.siteDescription.trim() && (storeForm.faviconUrl.trim() || storeForm.logoUrl.trim())) },
    { label: '货币与免邮', ready: Boolean(storeForm.currencySymbol.trim() && storeForm.freeShippingThreshold.trim() && Number(storeForm.freeShippingThreshold) >= 0) },
  ];

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setSaveError('');
      try {
        const result = await fetchAdminSiteSettings();
        if (ignore) return;
        const next = result.siteSettings;
        setStoreForm(next.storeForm);
        setStoreSwitches(next.storeSwitches);
        setHeaderNavLinks(next.headerNavLinks);
        setFooterLinkSections(next.footerLinkSections);
        setLastSavedForm(next.storeForm);
        setLastSavedSwitches(next.storeSwitches);
        setLastSavedHeaderNavLinks(next.headerNavLinks);
        setLastSavedFooterLinkSections(next.footerLinkSections);
      } catch (err) {
        if (!ignore) setSaveError(err instanceof Error ? err.message : '读取站点配置失败');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleGroupChange = (group: SiteConfigGroup) => {
    setActiveGroup(group);
    setActiveItemId(configItems.find((item) => item.group === group)?.id ?? configItems[0].id);
  };

  const updateStoreField = (key: StoreField, value: string) => {
    setStoreForm((prev) => ({ ...prev, [key]: value }));
    setSaveError('');
  };

  const updateSwitch = (value: Partial<StoreSwitches>) => {
    setStoreSwitches((prev) => ({ ...prev, ...value }));
    setSaveError('');
  };

  const updateHeaderNavLinks = (links: StoreNavigationLink[]) => {
    setHeaderNavLinks(links);
    setSaveError('');
  };

  const updateFooterLinkSections = (sections: StoreFooterLinkSection[]) => {
    setFooterLinkSections(sections);
    setSaveError('');
  };

  const handleSelectMedia = (asset: MediaAsset) => {
    if (!mediaTarget) return;
    updateStoreField(mediaTarget, asset.url);
    setMediaTarget(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await saveSiteSettings({
        storeForm,
        storeSwitches,
        headerNavLinks,
        footerLinkSections,
      });
      setLastSavedForm(storeForm);
      setLastSavedSwitches(storeSwitches);
      setLastSavedHeaderNavLinks(headerNavLinks);
      setLastSavedFooterLinkSections(footerLinkSections);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaved(false);
      setSaveError(err instanceof Error ? err.message : '保存站点配置失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const openStorefrontPreview = () => {
    window.open('/?preview=site-config', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">站点配置</h2>
          <p className="mt-0.5 text-xs text-slate-400">只保留交付必需配置：品牌、导航、联系方式、公告、SEO 和基础商业规则。</p>
          <div className="mt-2 h-5">
            {loading ? (
              <span className="text-xs text-slate-400">正在读取站点配置...</span>
            ) : saveError ? (
              <span className="text-xs font-semibold text-red-600">{saveError}</span>
            ) : hasUnsavedChanges ? (
              <span className="text-xs font-semibold text-amber-600">有未保存修改</span>
            ) : (
              <span className="text-xs text-slate-400">所有站点配置已保存</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition-all ${
            loading || saving
              ? 'cursor-wait bg-slate-200 text-slate-400'
              : saved
                ? 'bg-emerald-500 text-white'
                : hasUnsavedChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-200 text-slate-500'
          }`}
        >
          {saved ? <Check size={13} /> : <Save size={13} />}
          {saving ? '保存中...' : saved ? '已保存' : hasUnsavedChanges ? '保存修改' : '保存配置'}
        </button>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="grid h-[calc(100vh-168px)] min-h-[620px] min-w-[1180px] grid-cols-[220px_300px_minmax(0,1fr)_280px] gap-4">
          <aside className="flex min-h-0 flex-col rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="text-xs font-bold text-slate-500">配置分组</div>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {groups.map((group) => {
                const Icon = group.icon;
                const isActive = group.id === activeGroup;
                const count = configItems.filter((item) => item.group === group.id).length;
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
                <div className="mt-0.5 text-[11px] text-slate-400">{groupItems.length} 个配置项</div>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {groupItems.map((item) => {
                const isActive = item.id === activeItem.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveItemId(item.id)}
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
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <CalendarClock size={12} />
                      {item.updatedAt}
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
                </div>
                <p className="mt-1 text-xs text-slate-400">{activeItem.summary}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openStorefrontPreview}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  <ExternalLink size={13} />
                  打开前台
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  <Save size={13} />
                  保存配置
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <FieldEditor
                item={activeItem}
                values={storeForm}
                switches={storeSwitches}
                headerNavLinks={headerNavLinks}
                footerLinkSections={footerLinkSections}
                onFieldChange={updateStoreField}
                onSwitchChange={updateSwitch}
                onHeaderNavChange={updateHeaderNavLinks}
                onFooterLinksChange={updateFooterLinkSections}
                onSelectMediaField={setMediaTarget}
              />
            </div>
          </main>

          <aside className="min-h-0 min-w-0 space-y-4 overflow-y-auto pr-1">
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">发布检查</div>
              <div className="mt-4 space-y-3">
                {launchCheckItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm text-slate-600">
                    <BadgeCheck size={15} className={item.ready ? 'text-emerald-500' : 'text-slate-300'} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <MonitorSmartphone size={15} className="text-blue-600" />
                前台预览
              </div>
              <div className="mt-4 min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-600 text-xs font-black text-white">
                    {storeForm.logoUrl ? <img src={storeForm.logoUrl} alt="" className="h-full w-full object-cover" /> : 'Logo'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-slate-900">{storeForm.storeName || '未命名店铺'}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">{storeForm.slogan || '暂无品牌标语'}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-[11px] text-slate-500">
                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3">
                    <span className="flex-shrink-0">公告</span>
                    <span className="min-w-0 truncate text-right font-semibold text-slate-700">{storeForm.announcementText || '-'}</span>
                  </div>
                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3">
                    <span className="flex-shrink-0">货币</span>
                    <span className="min-w-0 truncate text-right font-semibold text-slate-700">{storeForm.defaultCurrency} / {storeForm.currencySymbol}</span>
                  </div>
                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3">
                    <span className="flex-shrink-0">免邮门槛</span>
                    <span className="min-w-0 truncate text-right font-semibold text-slate-700">{storeForm.currencySymbol}{storeForm.freeShippingThreshold || '0'}</span>
                  </div>
                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3">
                    <span className="flex-shrink-0">客服</span>
                    <span className="min-w-0 truncate text-right font-semibold text-slate-700" title={storeForm.supportEmail || '-'}>
                      {storeForm.supportEmail || '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Search size={15} className="text-blue-600" />
                SEO 基础
              </div>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                <div className="font-semibold text-slate-700">搜索结果预览</div>
                <div className="mt-1 line-clamp-1 text-blue-700">{storeForm.siteTitle}</div>
                <div className="mt-1 line-clamp-2">{storeForm.siteDescription}</div>
                <div className="mt-2 text-[11px] text-slate-400">
                  Favicon：{storeForm.faviconUrl || storeForm.logoUrl ? '已配置' : '未配置'}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      {mediaTarget && <SiteMediaPickerModal onSelect={handleSelectMedia} onClose={() => setMediaTarget(null)} />}
    </div>
  );
}
