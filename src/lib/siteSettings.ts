import { supabase } from './supabase';
import { fetchAdminSettings } from './settingsService';

export interface StoreForm {
  storeName: string;
  storeShortName: string;
  logoUrl: string;
  faviconUrl: string;
  slogan: string;
  companyName: string;
  domain: string;
  announcementText: string;
  searchPlaceholder: string;
  supportEmail: string;
  supportPhone: string;
  companyAddress: string;
  workingHours: string;
  businessEmail: string;
  mediaEmail: string;
  footerDescription: string;
  copyrightText: string;
  icpNumber: string;
  socialX: string;
  socialInstagram: string;
  socialYoutube: string;
  defaultCurrency: string;
  currencySymbol: string;
  defaultLanguage: string;
  freeShippingThreshold: string;
  firstOrderDiscount: string;
  siteTitle: string;
  siteDescription: string;
}

export interface StoreSwitches {
  riskAutoBlock: boolean;
  showAnnouncement: boolean;
  showLanguageSwitch: boolean;
  showSalesCount: boolean;
  showReviews: boolean;
}

export type StoreNavigationTarget =
  | 'home'
  | 'products'
  | 'new-arrivals'
  | 'hot-deals'
  | 'flash-sale'
  | 'brand-story'
  | 'contact-us'
  | 'order-lookup'
  | 'return-policy'
  | 'logistics'
  | 'faq'
  | 'careers'
  | 'media-cooperation'
  | 'privacy'
  | 'terms'
  | 'cookies'
  | 'payment-security'
  | 'custom';

export interface StoreNavigationLink {
  id: string;
  label: string;
  target: StoreNavigationTarget;
  url?: string;
  enabled: boolean;
}

export interface StoreFooterLink {
  id: string;
  label: string;
  target: StoreNavigationTarget;
  url?: string;
  enabled: boolean;
}

export interface StoreFooterLinkSection {
  id: string;
  title: string;
  links: StoreFooterLink[];
}

export const DEFAULT_STORE_FORM: StoreForm = {
  storeName: 'ShopNova',
  storeShortName: 'ShopNova',
  logoUrl: '',
  faviconUrl: '',
  slogan: '发现更聪明的生活方式',
  companyName: 'ShopNova Inc.',
  domain: 'shop.example.com',
  announcementText: '限时优惠：满 $49 免运费，新用户首单立减 15%',
  searchPlaceholder: '搜索耳机、手表、手机壳、智能配件',
  supportEmail: 'support@shopnova.com',
  supportPhone: '+1 800-555-0000',
  companyAddress: 'ShopNova Inc., 123 Tech Park, Shanghai 200000, China.',
  workingHours: '周一至周五 09:00-18:00',
  businessEmail: 'business@shopnova.com',
  mediaEmail: 'media@shopnova.com',
  footerDescription: '精选智能配件与生活方式好物，用清晰顺畅的购物体验连接好产品与真实需求。',
  copyrightText: '© 2026 ShopNova. All rights reserved.',
  icpNumber: '',
  socialX: '',
  socialInstagram: '',
  socialYoutube: '',
  defaultCurrency: 'USD',
  currencySymbol: '$',
  defaultLanguage: 'en-US',
  freeShippingThreshold: '49',
  firstOrderDiscount: '15',
  siteTitle: 'ShopNova - 智能数码生活方式商城',
  siteDescription: '精选智能配件、数码好物与生活美学产品，让科技融入你的日常。',
};

export const DEFAULT_STORE_SWITCHES: StoreSwitches = {
  riskAutoBlock: true,
  showAnnouncement: true,
  showLanguageSwitch: true,
  showSalesCount: true,
  showReviews: true,
};

export const DEFAULT_HEADER_NAV_LINKS: StoreNavigationLink[] = [
  { id: 'home', label: '首页', target: 'home', enabled: true },
  { id: 'products', label: '全部商品', target: 'products', enabled: true },
  { id: 'new-arrivals', label: '新品上市', target: 'new-arrivals', enabled: true },
  { id: 'hot-deals', label: '热门优惠', target: 'hot-deals', enabled: true },
  { id: 'flash-sale', label: '限时抢购', target: 'flash-sale', enabled: true },
  { id: 'brand-story', label: '品牌故事', target: 'brand-story', enabled: true },
];

export const DEFAULT_FOOTER_LINK_SECTIONS: StoreFooterLinkSection[] = [
  {
    id: 'customer-service',
    title: '客户服务',
    links: [
      { id: 'order-lookup', label: '订单查询', target: 'order-lookup', enabled: true },
      { id: 'return-policy', label: '退换货政策', target: 'return-policy', enabled: true },
      { id: 'logistics', label: '物流说明', target: 'logistics', enabled: true },
      { id: 'faq', label: 'FAQ', target: 'faq', enabled: true },
      { id: 'contact-support', label: '联系客服', target: 'contact-us', enabled: true },
      { id: 'live-chat', label: '在线客服', target: 'contact-us', enabled: true },
    ],
  },
  {
    id: 'about',
    title: '关于我们',
    links: [
      { id: 'brand-story', label: '品牌故事', target: 'brand-story', enabled: true },
      { id: 'contact-us', label: '联系我们', target: 'contact-us', enabled: true },
      { id: 'careers', label: '招聘信息', target: 'careers', enabled: true },
      { id: 'media-cooperation', label: '媒体合作', target: 'media-cooperation', enabled: true },
    ],
  },
  {
    id: 'policy',
    title: '政策条款',
    links: [
      { id: 'privacy', label: '隐私政策', target: 'privacy', enabled: true },
      { id: 'terms', label: '服务条款', target: 'terms', enabled: true },
      { id: 'payment-security', label: '支付安全', target: 'payment-security', enabled: true },
      { id: 'cookies', label: 'Cookie 设置', target: 'cookies', enabled: true },
    ],
  },
];

export interface SiteSettings {
  storeForm: StoreForm;
  storeSwitches: StoreSwitches;
  headerNavLinks: StoreNavigationLink[];
  footerLinkSections: StoreFooterLinkSection[];
}

interface SettingsDataRow {
  storeForm?: Partial<StoreForm>;
  storeSwitches?: Partial<StoreSwitches>;
  headerNavLinks?: StoreNavigationLink[];
  footerLinkSections?: StoreFooterLinkSection[];
}

interface SiteSettingsTableRow {
  store_form: Partial<StoreForm> | null;
  store_switches: Partial<StoreSwitches> | null;
  header_nav_links: StoreNavigationLink[] | null;
  footer_link_sections: StoreFooterLinkSection[] | null;
}

export interface AdminSiteSettingsResult {
  siteSettings: SiteSettings;
}

const SITE_SETTINGS_ROW_ID = 'global';

export function mergeSiteSettings(settingsData?: SettingsDataRow): SiteSettings {
  return {
    storeForm: { ...DEFAULT_STORE_FORM, ...settingsData?.storeForm },
    storeSwitches: { ...DEFAULT_STORE_SWITCHES, ...settingsData?.storeSwitches },
    headerNavLinks: settingsData?.headerNavLinks?.length ? settingsData.headerNavLinks : DEFAULT_HEADER_NAV_LINKS,
    footerLinkSections: settingsData?.footerLinkSections?.length ? settingsData.footerLinkSections : DEFAULT_FOOTER_LINK_SECTIONS,
  };
}

function rowToSiteSettings(row: SiteSettingsTableRow): SiteSettings {
  return mergeSiteSettings({
    storeForm: row.store_form ?? undefined,
    storeSwitches: row.store_switches ?? undefined,
    headerNavLinks: row.header_nav_links ?? undefined,
    footerLinkSections: row.footer_link_sections ?? undefined,
  });
}

async function fetchSiteSettingsFromTable(): Promise<SiteSettings | null> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('store_form, store_switches, header_nav_links, footer_link_sections')
    .eq('id', SITE_SETTINGS_ROW_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`读取站点配置失败：${error.message}`);
  }

  return data ? rowToSiteSettings(data as SiteSettingsTableRow) : null;
}

export async function fetchPublicSiteSettings(): Promise<SiteSettings> {
  try {
    return (await fetchSiteSettingsFromTable()) ?? mergeSiteSettings();
  } catch {
    return mergeSiteSettings();
  }
}

export async function fetchAdminSiteSettings(): Promise<AdminSiteSettingsResult> {
  await fetchAdminSettings<Record<string, unknown>>();
  const siteSettings = (await fetchSiteSettingsFromTable()) ?? mergeSiteSettings();
  return { siteSettings };
}

export async function saveSiteSettings(siteSettings: SiteSettings) {
  const { error } = await supabase
    .from('site_settings')
    .upsert({
      id: SITE_SETTINGS_ROW_ID,
      store_form: siteSettings.storeForm,
      store_switches: siteSettings.storeSwitches,
      header_nav_links: siteSettings.headerNavLinks,
      footer_link_sections: siteSettings.footerLinkSections,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) throw new Error(`保存站点配置失败：${error.message}`);

}
