import { supabase } from './supabase';

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

export const DEFAULT_STORE_FORM: StoreForm = {
  storeName: 'ShopNova',
  storeShortName: 'ShopNova',
  logoUrl: '',
  faviconUrl: '',
  slogan: '发现更聪明的生活方式',
  companyName: 'ShopNova Inc.',
  domain: 'shop.example.com',
  announcementText: '限时优惠：满 ¥299 免运费，新用户首单立减 15%',
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
  defaultCurrency: 'CNY',
  currencySymbol: '¥',
  defaultLanguage: 'zh-CN',
  freeShippingThreshold: '299',
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

export interface SiteSettings {
  storeForm: StoreForm;
  storeSwitches: StoreSwitches;
}

interface SettingsDataRow {
  storeForm?: Partial<StoreForm>;
  storeSwitches?: Partial<StoreSwitches>;
}

export function mergeSiteSettings(settingsData?: SettingsDataRow): SiteSettings {
  return {
    storeForm: { ...DEFAULT_STORE_FORM, ...settingsData?.storeForm },
    storeSwitches: { ...DEFAULT_STORE_SWITCHES, ...settingsData?.storeSwitches },
  };
}

export async function fetchPublicSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('settings_data')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return mergeSiteSettings();
  return mergeSiteSettings((data.settings_data ?? {}) as SettingsDataRow);
}
