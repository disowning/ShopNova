import { supabase } from './supabase';
import type { Locale } from '../i18n';
import zhCN from '../i18n/locales/zh-CN.json';
import { getSessionUser } from './authService';
import { fetchAdminCmsContent, mergeCmsContent, type CmsContentGroup, type CmsContentState } from './cmsContent';
import {
  DEFAULT_FOOTER_LINK_SECTIONS,
  DEFAULT_HEADER_NAV_LINKS,
  DEFAULT_STORE_FORM,
  fetchAdminSiteSettings,
} from './siteSettings';

export type TranslatableEntity = 'product' | 'category' | 'tag' | 'ui' | 'store' | 'page' | 'cms';
type CatalogEntity = 'product' | 'category' | 'tag';
export type TranslationExportMode = 'all' | 'missing' | 'outdated' | 'missing_or_outdated';
export type TranslationSourceMap = Record<string, Record<string, string>>;

export const SOURCE_LOCALE: Locale = 'zh-CN';
const SUPPORTED_LOCALES: Locale[] = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR'];
const PACKAGE_ITEM_KEYS = ['products', 'categories', 'tags', 'ui', 'store', 'pages', 'cms'] as const;
const TRANSLATION_UPSERT_CHUNK_SIZE = 500;
const ALLOWED_TRANSLATION_ENTITY_TYPES = ['product', 'category', 'tag', 'ui', 'store', 'page', 'cms'] as const;

export const TRANSLATABLE_FIELDS: Record<CatalogEntity, string[]> = {
  product: [
    'name',
    'subtitle',
    'short_description',
    'description',
    'detail_description',
    'seo_title',
    'seo_description',
  ],
  category: ['name', 'description'],
  tag: ['name', 'description'],
};

export interface ContentTranslationRow {
  entity_type: TranslatableEntity;
  entity_id: string;
  locale: Locale;
  field_name: string;
  source_locale: Locale;
  source_text: string;
  source_hash: string;
  translated_text: string;
  status: string;
}

export type TranslationLookup = Record<string, Record<string, string>>;

export interface TranslationPackageItem {
  id: string;
  label: string;
  source: Record<string, string>;
  target: Record<string, string>;
  sourceHash: Record<string, string>;
  status: Record<string, 'missing' | 'translated' | 'outdated'>;
}

export interface TranslationPackage {
  version: 1;
  sourceLocale: Locale;
  targetLocale: Locale;
  exportedAt: string;
  mode: TranslationExportMode;
  items: {
    products: TranslationPackageItem[];
    categories: TranslationPackageItem[];
    tags: TranslationPackageItem[];
    ui?: TranslationPackageItem[];
    store?: TranslationPackageItem[];
    pages?: TranslationPackageItem[];
    cms?: TranslationPackageItem[];
  };
}

export interface TranslationBatchPackage {
  version: 1;
  kind: 'shopnova_translation_batch';
  sourceLocale: Locale;
  exportedAt: string;
  mode: TranslationExportMode;
  packages: TranslationPackage[];
}

export interface TranslationExportOptions {
  targetLocale: Locale;
  sourceLocale?: Locale;
  includeProducts?: boolean;
  includeCategories?: boolean;
  includeTags?: boolean;
  includeUi?: boolean;
  includeStore?: boolean;
  includePages?: boolean;
  includeCms?: boolean;
  uiSections?: readonly string[];
  storeSections?: readonly string[];
  pageSections?: readonly string[];
  cmsGroups?: readonly CmsContentGroup[];
  mode?: TranslationExportMode;
}

export interface TranslationBatchExportOptions extends Omit<TranslationExportOptions, 'targetLocale'> {
  targetLocales: Locale[];
}

interface SourceRecord {
  id: string;
  label: string;
  fields: Record<string, string>;
}

interface ProductRow {
  id: string;
  name: string | null;
  subtitle: string | null;
  short_description: string | null;
  description: string | null;
  detail_description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  highlights: unknown;
  specs: unknown;
  sku_groups: unknown;
}

interface CategoryRow {
  id: string;
  name: string | null;
  description: string | null;
}

interface TagRow {
  id: string;
  name: string | null;
  description: string | null;
}

interface ProductAttributeRow {
  id: string;
  product_id: string;
  name: string | null;
  value: string | null;
}

interface ProductSkuRow {
  product_id: string;
  attributes_json: unknown;
}

export const UI_SOURCE_SECTIONS = [
  'common',
  'cart',
  'checkout',
  'order',
  'orderSummary',
  'flashSale',
  'review',
  'newsletter',
  'login',
  'register',
  'account',
  'product',
  'benefit',
  'listing',
  'newArrivals',
  'categories',
] as const;

export const PAGE_SOURCE_SECTIONS = ['home', 'cookie', 'aboutPages', 'customerService', 'legal'] as const;
export const STORE_PROFILE_SECTION = 'profile';
export const STORE_NAVIGATION_SECTION = 'navigation';
export const STORE_SOURCE_SECTIONS = ['announcement', 'footer'] as const;
export const CMS_SOURCE_GROUPS: readonly CmsContentGroup[] = ['home', 'service', 'about', 'policy', 'marketing'];

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function addField(fields: Record<string, string>, field: string, value: unknown) {
  const text = clean(value);
  if (text) fields[field] = text;
}

function flattenStringFields(value: unknown, prefix = '', fields: Record<string, string> = {}) {
  if (typeof value === 'string') {
    addField(fields, prefix, value);
    return fields;
  }

  if (!value || typeof value !== 'object') return fields;

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flattenStringFields(item, prefix ? `${prefix}.${index}` : String(index), fields);
    });
    return fields;
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    flattenStringFields(item, prefix ? `${prefix}.${key}` : key, fields);
  });

  return fields;
}

function toStringRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const result: Record<string, string> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, rawValue]) => {
    const text = clean(rawValue);
    if (key && text) result[key] = text;
  });

  return Object.keys(result).length > 0 ? result : null;
}

function groupByProductId<T extends { product_id: string }>(rows: T[]) {
  return rows.reduce<Record<string, T[]>>((acc, row) => {
    if (!acc[row.product_id]) acc[row.product_id] = [];
    acc[row.product_id].push(row);
    return acc;
  }, {});
}

export function computeSourceHash(text: string) {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function isTranslationRowFresh(row: ContentTranslationRow, currentSources?: TranslationSourceMap) {
  if (!currentSources) return true;

  const sourceText = currentSources[row.entity_id]?.[row.field_name];
  if (typeof sourceText !== 'string') return false;
  if (!row.source_hash) return true;

  return computeSourceHash(sourceText.trim()) === row.source_hash;
}

export function buildTranslationLookup(rows: ContentTranslationRow[], currentSources?: TranslationSourceMap): TranslationLookup {
  return rows.reduce<TranslationLookup>((acc, row) => {
    if (!row.translated_text) return acc;
    if (!isTranslationRowFresh(row, currentSources)) return acc;
    if (!acc[row.entity_id]) acc[row.entity_id] = {};
    acc[row.entity_id][row.field_name] = row.translated_text;
    return acc;
  }, {});
}

export async function fetchContentTranslations(
  entityType: TranslatableEntity,
  locale: Locale,
  entityIds: string[],
  options: { includeSourceLocale?: boolean } = {},
) {
  if ((!options.includeSourceLocale && locale === SOURCE_LOCALE) || entityIds.length === 0) return [];

  const { data, error } = await supabase
    .from('content_translations')
    .select('entity_type, entity_id, locale, field_name, source_locale, source_text, source_hash, translated_text, status')
    .eq('entity_type', entityType)
    .eq('locale', locale)
    .in('entity_id', entityIds);

  if (error || !data) return [];
  return data as ContentTranslationRow[];
}

export async function fetchTranslationLookup(
  entityType: TranslatableEntity,
  locale: Locale,
  entityIds: string[],
  currentSources?: TranslationSourceMap,
) {
  const rows = await fetchContentTranslations(entityType, locale, entityIds);
  return buildTranslationLookup(rows, currentSources);
}

function addProductJsonFields(fields: Record<string, string>, row: ProductRow) {
  if (Array.isArray(row.highlights)) {
    row.highlights.forEach((highlight, index) => {
      addField(fields, `highlight:${index}`, highlight);
    });
  }

  if (Array.isArray(row.specs)) {
    row.specs.forEach((spec, index) => {
      if (!spec || typeof spec !== 'object') return;
      const record = spec as Record<string, unknown>;
      addField(fields, `spec:${index}:label`, record.label);
      addField(fields, `spec:${index}:value`, record.value);
    });
  }

  if (Array.isArray(row.sku_groups)) {
    row.sku_groups.forEach((group) => {
      if (!group || typeof group !== 'object') return;
      const record = group as Record<string, unknown>;
      const name = clean(record.name);
      if (!name) return;

      addField(fields, `sku_key:${name}`, name);
      if (!Array.isArray(record.options)) return;

      record.options.forEach((option) => {
        if (!option || typeof option !== 'object') return;
        const label = clean((option as Record<string, unknown>).label);
        addField(fields, `sku_value:${name}:${label}`, label);
      });
    });
  }
}

function toProductSources(
  rows: ProductRow[],
  attributeRows: ProductAttributeRow[] = [],
  skuRows: ProductSkuRow[] = [],
): SourceRecord[] {
  const attributesByProduct = groupByProductId(attributeRows);
  const skusByProduct = groupByProductId(skuRows);

  return rows.map((row) => {
    const fields: Record<string, string> = {};

    addField(fields, 'name', row.name);
    addField(fields, 'subtitle', row.subtitle);
    addField(fields, 'short_description', row.short_description);
    addField(fields, 'description', row.description);
    addField(fields, 'detail_description', row.detail_description);
    addField(fields, 'seo_title', row.seo_title);
    addField(fields, 'seo_description', row.seo_description);
    addProductJsonFields(fields, row);

    (attributesByProduct[row.id] ?? []).forEach((attribute) => {
      addField(fields, `attribute:${attribute.id}:name`, attribute.name);
      addField(fields, `attribute:${attribute.id}:value`, attribute.value);
    });

    (skusByProduct[row.id] ?? []).forEach((sku) => {
      const attrs = toStringRecord(sku.attributes_json);
      if (!attrs) return;

      Object.entries(attrs).forEach(([key, value]) => {
        addField(fields, `sku_key:${key}`, key);
        addField(fields, `sku_value:${key}:${value}`, value);
      });
    });

    return {
      id: row.id,
      label: clean(row.name) || row.id,
      fields,
    };
  });
}

function toCategorySources(rows: CategoryRow[]): SourceRecord[] {
  return rows.map((row) => ({
    id: row.id,
    label: clean(row.name) || row.id,
    fields: {
      name: clean(row.name),
      description: clean(row.description),
    },
  }));
}

function toTagSources(rows: TagRow[]): SourceRecord[] {
  return rows.map((row) => ({
    id: row.id,
    label: clean(row.name) || row.id,
    fields: {
      name: clean(row.name),
      description: clean(row.description),
    },
  }));
}

function toLocaleSectionSources(sectionNames: readonly string[]): SourceRecord[] {
  const sourceMessages = zhCN as Record<string, unknown>;
  return sectionNames
    .map((section) => ({
      id: section,
      label: section,
      fields: flattenStringFields(sourceMessages[section]),
    }))
    .filter((record) => Object.keys(record.fields).length > 0);
}

async function fetchStoreProfileSource(): Promise<SourceRecord> {
  const sessionUser = getSessionUser();
  if (!sessionUser) {
    return {
      id: 'global',
      label: '店铺资料',
      fields: { ...DEFAULT_STORE_FORM },
    };
  }

  const { siteSettings } = await fetchAdminSiteSettings();
  return {
    id: 'global',
    label: '店铺资料',
    fields: {
      ...DEFAULT_STORE_FORM,
      ...siteSettings.storeForm,
    },
  };
}

async function fetchStoreNavigationSource(): Promise<SourceRecord> {
  const sessionUser = getSessionUser();
  let headerNavLinks = DEFAULT_HEADER_NAV_LINKS;
  let footerLinkSections = DEFAULT_FOOTER_LINK_SECTIONS;

  if (sessionUser) {
    const { siteSettings } = await fetchAdminSiteSettings();
    headerNavLinks = siteSettings.headerNavLinks.length ? siteSettings.headerNavLinks : headerNavLinks;
    footerLinkSections = siteSettings.footerLinkSections.length ? siteSettings.footerLinkSections : footerLinkSections;
  }

  const fields: Record<string, string> = {};
  headerNavLinks.forEach((link) => {
    addField(fields, `header.${link.id}.label`, link.label);
  });
  footerLinkSections.forEach((section) => {
    addField(fields, `footer.${section.id}.title`, section.title);
    section.links.forEach((link) => {
      addField(fields, `footer.${section.id}.${link.id}.label`, link.label);
    });
  });

  return {
    id: STORE_NAVIGATION_SECTION,
    label: '导航文案',
    fields,
  };
}

async function fetchCmsContentSource(): Promise<CmsContentState> {
  const sessionUser = getSessionUser();
  if (!sessionUser) return mergeCmsContent();
  return fetchAdminCmsContent();
}

async function toStoreSources(sectionNames: readonly string[] = [STORE_PROFILE_SECTION, STORE_NAVIGATION_SECTION, ...STORE_SOURCE_SECTIONS]): Promise<SourceRecord[]> {
  const sectionSet = new Set(sectionNames);
  const sources: SourceRecord[] = [];

  if (sectionSet.has(STORE_PROFILE_SECTION)) {
    sources.push(await fetchStoreProfileSource());
  }

  if (sectionSet.has(STORE_NAVIGATION_SECTION)) {
    sources.push(await fetchStoreNavigationSource());
  }

  sources.push(...toLocaleSectionSources(STORE_SOURCE_SECTIONS.filter((section) => sectionSet.has(section))));
  return sources;
}

function toCmsSources(content: CmsContentState, groups: readonly CmsContentGroup[] = CMS_SOURCE_GROUPS): SourceRecord[] {
  const groupSet = new Set(groups);

  return content.items
    .filter((item) => groupSet.has(item.group))
    .map((item) => {
      const fields: Record<string, string> = {};
      item.fields.forEach((field) => {
        addField(fields, field.key, field.value);
      });

      return {
        id: item.id,
        label: item.title || item.id,
        fields,
      };
    })
    .filter((record) => Object.keys(record.fields).length > 0);
}

async function fetchExistingTranslationRows(entityType: TranslatableEntity, locale: Locale, ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('content_translations')
    .select('entity_type, entity_id, locale, field_name, source_locale, source_text, source_hash, translated_text, status')
    .eq('entity_type', entityType)
    .eq('locale', locale)
    .in('entity_id', ids);

  if (error || !data) return [];
  return data as ContentTranslationRow[];
}

function existingByRecord(rows: ContentTranslationRow[]) {
  return rows.reduce<Record<string, ContentTranslationRow>>((acc, row) => {
    acc[`${row.entity_id}:${row.field_name}`] = row;
    return acc;
  }, {});
}

function shouldIncludeItem(item: TranslationPackageItem, mode: TranslationExportMode) {
  const states = Object.values(item.status);
  if (mode === 'all') return true;
  if (mode === 'missing') return states.includes('missing');
  if (mode === 'outdated') return states.includes('outdated');
  return states.some((state) => state === 'missing' || state === 'outdated');
}

async function buildPackageItems(
  entityType: TranslatableEntity,
  targetLocale: Locale,
  sourceRecords: SourceRecord[],
  mode: TranslationExportMode,
) {
  const existingRows = await fetchExistingTranslationRows(entityType, targetLocale, sourceRecords.map((row) => row.id));
  const existing = existingByRecord(existingRows);

  return sourceRecords
    .map<TranslationPackageItem>((record) => {
      const source: Record<string, string> = {};
      const target: Record<string, string> = {};
      const sourceHash: Record<string, string> = {};
      const status: TranslationPackageItem['status'] = {};

      for (const field of Object.keys(record.fields).sort((a, b) => a.localeCompare(b))) {
        const sourceText = record.fields[field] ?? '';
        if (!sourceText) continue;

        const hash = computeSourceHash(sourceText);
        const existingRow = existing[`${record.id}:${field}`];
        source[field] = sourceText;
        target[field] = existingRow?.translated_text ?? '';
        sourceHash[field] = hash;
        status[field] = !existingRow?.translated_text
          ? 'missing'
          : existingRow.source_hash && existingRow.source_hash !== hash
            ? 'outdated'
            : 'translated';
      }

      return { id: record.id, label: record.label, source, target, sourceHash, status };
    })
    .filter((item) => Object.keys(item.source).length > 0)
    .filter((item) => shouldIncludeItem(item, mode));
}

export async function exportTranslationPackage(options: TranslationExportOptions): Promise<TranslationPackage> {
  const targetLocale = options.targetLocale;
  const sourceLocale = options.sourceLocale ?? SOURCE_LOCALE;
  const mode = options.mode ?? 'missing_or_outdated';
  const hasExplicitIncludes = [
    options.includeProducts,
    options.includeCategories,
    options.includeTags,
    options.includeUi,
    options.includeStore,
    options.includePages,
    options.includeCms,
  ].some((value) => value !== undefined);
  const defaultCatalogIncludes = !hasExplicitIncludes;

  const items: TranslationPackage['items'] = {
    products: [],
    categories: [],
    tags: [],
    ui: [],
    store: [],
    pages: [],
    cms: [],
  };

  if (options.includeProducts ?? defaultCatalogIncludes) {
    const { data } = await supabase
      .from('products')
      .select('id, name, subtitle, short_description, description, detail_description, seo_title, seo_description, highlights, specs, sku_groups')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const productRows = (data ?? []) as ProductRow[];
    const productIds = productRows.map((row) => row.id);
    let attributeRows: ProductAttributeRow[] = [];
    let skuRows: ProductSkuRow[] = [];

    if (productIds.length > 0) {
      const [{ data: attributes }, { data: skus }] = await Promise.all([
        supabase
          .from('product_attributes')
          .select('id, product_id, name, value')
          .in('product_id', productIds)
          .order('sort_order'),
        supabase
          .from('product_skus')
          .select('product_id, attributes_json')
          .in('product_id', productIds)
          .eq('status', 'active')
          .is('deleted_at', null)
          .order('sort_order'),
      ]);

      attributeRows = (attributes ?? []) as ProductAttributeRow[];
      skuRows = (skus ?? []) as ProductSkuRow[];
    }

    items.products = await buildPackageItems('product', targetLocale, toProductSources(productRows, attributeRows, skuRows), mode);
  }

  if (options.includeCategories ?? defaultCatalogIncludes) {
    const { data } = await supabase
      .from('product_categories')
      .select('id, name, description')
      .is('deleted_at', null)
      .order('sort_order');
    items.categories = await buildPackageItems('category', targetLocale, toCategorySources((data ?? []) as CategoryRow[]), mode);
  }

  if (options.includeTags ?? defaultCatalogIncludes) {
    const { data } = await supabase
      .from('product_tags')
      .select('id, name, description')
      .is('deleted_at', null)
      .order('name');
    items.tags = await buildPackageItems('tag', targetLocale, toTagSources((data ?? []) as TagRow[]), mode);
  }

  if (options.includeUi ?? false) {
    items.ui = await buildPackageItems('ui', targetLocale, toLocaleSectionSources(options.uiSections ?? UI_SOURCE_SECTIONS), mode);
  }

  if (options.includeStore ?? false) {
    items.store = await buildPackageItems('store', targetLocale, await toStoreSources(options.storeSections), mode);
  }

  if (options.includePages ?? false) {
    items.pages = await buildPackageItems('page', targetLocale, toLocaleSectionSources(options.pageSections ?? PAGE_SOURCE_SECTIONS), mode);
  }

  if (options.includeCms ?? false) {
    items.cms = await buildPackageItems('cms', targetLocale, toCmsSources(await fetchCmsContentSource(), options.cmsGroups), mode);
  }

  return {
    version: 1,
    sourceLocale,
    targetLocale,
    exportedAt: new Date().toISOString(),
    mode,
    items,
  };
}

export async function exportTranslationBatchPackage(options: TranslationBatchExportOptions): Promise<TranslationBatchPackage> {
  const targetLocales = Array.from(new Set(options.targetLocales)).filter(isLocale);
  if (targetLocales.length === 0) throw new Error('请至少选择一个目标语言。');

  const packages = await Promise.all(
    targetLocales.map((targetLocale) => exportTranslationPackage({
      ...options,
      targetLocale,
    })),
  );

  return {
    version: 1,
    kind: 'shopnova_translation_batch',
    sourceLocale: options.sourceLocale ?? SOURCE_LOCALE,
    exportedAt: new Date().toISOString(),
    mode: options.mode ?? 'missing_or_outdated',
    packages,
  };
}

function flattenPackageRows(pack: TranslationPackage) {
  const now = new Date().toISOString();
  const rows: Array<Record<string, string>> = [];
  let skipped = 0;
  const groups: Array<[TranslatableEntity, TranslationPackageItem[]]> = [
    ['product', pack.items.products ?? []],
    ['category', pack.items.categories ?? []],
    ['tag', pack.items.tags ?? []],
    ['ui', pack.items.ui ?? []],
    ['store', pack.items.store ?? []],
    ['page', pack.items.pages ?? []],
    ['cms', pack.items.cms ?? []],
  ];

  for (const [entityType, items] of groups) {
    for (const item of items) {
      for (const field of Object.keys(item.target ?? {})) {
        const translatedText = clean(item.target[field]);
        if (!translatedText) {
          skipped += 1;
          continue;
        }

        const sourceText = clean(item.source?.[field]);
        rows.push({
          entity_type: entityType,
          entity_id: item.id,
          locale: pack.targetLocale,
          field_name: field,
          source_locale: pack.sourceLocale,
          source_text: sourceText,
          source_hash: item.sourceHash?.[field] || computeSourceHash(sourceText),
          translated_text: translatedText,
          status: 'reviewed',
          updated_at: now,
        });
      }
    }
  }

  return { rows, skipped };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale);
}

function validateTranslationPackage(value: unknown): TranslationPackage {
  if (!isPlainObject(value)) throw new Error('翻译包格式不正确，请导入导出的 JSON 文件。');
  if (value.version !== 1) throw new Error('翻译包版本不支持，请重新导出后再翻译。');
  if (value.sourceLocale !== SOURCE_LOCALE) throw new Error('翻译包源语言必须是 zh-CN。');
  if (!isLocale(value.targetLocale)) throw new Error('翻译包目标语言不支持。');
  if (!isPlainObject(value.items)) throw new Error('翻译包缺少 items 内容。');

  const itemKeys = new Set<string>(PACKAGE_ITEM_KEYS);
  Object.entries(value.items).forEach(([key, items]) => {
    if (!itemKeys.has(key)) throw new Error(`翻译包包含未知内容分组：${key}`);
    if (!Array.isArray(items)) throw new Error(`翻译包分组 ${key} 必须是数组。`);
    items.forEach((item, index) => {
      if (!isPlainObject(item)) throw new Error(`翻译包分组 ${key} 第 ${index + 1} 项格式不正确。`);
      if (typeof item.id !== 'string' || !item.id) throw new Error(`翻译包分组 ${key} 第 ${index + 1} 项缺少 id。`);
      if (!isPlainObject(item.source) || !isPlainObject(item.target)) {
        throw new Error(`翻译包分组 ${key} 第 ${index + 1} 项缺少 source 或 target。`);
      }
    });
  });

  return value as unknown as TranslationPackage;
}

function validateTranslationBatchPackage(value: unknown): TranslationBatchPackage {
  if (!isPlainObject(value)) throw new Error('翻译包格式不正确，请导入导出的 JSON 文件。');
  if (value.version !== 1 || value.kind !== 'shopnova_translation_batch') {
    throw new Error('批量翻译包格式不正确，请重新导出后再翻译。');
  }
  if (value.sourceLocale !== SOURCE_LOCALE) throw new Error('批量翻译包源语言必须是 zh-CN。');
  if (!Array.isArray(value.packages) || value.packages.length === 0) {
    throw new Error('批量翻译包缺少 packages 内容。');
  }

  const packages = value.packages.map(validateTranslationPackage);
  const locales = packages.map((pack) => pack.targetLocale);
  if (new Set(locales).size !== locales.length) {
    throw new Error('批量翻译包里存在重复目标语言，请每个语言只保留一个包。');
  }

  return {
    version: 1,
    kind: 'shopnova_translation_batch',
    sourceLocale: SOURCE_LOCALE,
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : '',
    mode: typeof value.mode === 'string' ? value.mode as TranslationExportMode : 'missing_or_outdated',
    packages,
  };
}

function toTranslationUpsertErrorMessage(error: { message?: string; code?: string; details?: string | null }) {
  const message = error.message ?? '';
  const details = error.details ?? '';
  const combined = `${message} ${details}`;

  if (combined.includes('content_translations_entity_type_check')) {
    return [
      '翻译表的数据库约束还是旧版本，当前数据库还不允许写入新的翻译类型。',
      `当前项目需要允许这些类型：${ALLOWED_TRANSLATION_ENTITY_TYPES.join(', ')}。`,
      '请先执行最新 Supabase migration：20260526000100_refresh_content_translation_entity_type_constraint.sql。',
    ].join(' ');
  }

  if (error.code === '23505' || combined.toLowerCase().includes('duplicate key')) {
    return '翻译数据唯一键冲突，请刷新后重试。';
  }

  return message || '写入翻译数据失败。';
}

export async function importTranslationPackage(rawPack: unknown) {
  const packs = isPlainObject(rawPack) && rawPack.kind === 'shopnova_translation_batch'
    ? validateTranslationBatchPackage(rawPack).packages
    : [validateTranslationPackage(rawPack)];

  const flattened = packs.map(flattenPackageRows);
  const rows = flattened.flatMap((item) => item.rows);
  const skipped = flattened.reduce((sum, item) => sum + item.skipped, 0);
  const locales = packs.map((pack) => pack.targetLocale);
  if (rows.length === 0) return { imported: 0, skipped, locales };

  for (let index = 0; index < rows.length; index += TRANSLATION_UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + TRANSLATION_UPSERT_CHUNK_SIZE);
    const { error } = await supabase
      .from('content_translations')
      .upsert(chunk, { onConflict: 'entity_type,entity_id,locale,field_name' });

    if (error) throw new Error(toTranslationUpsertErrorMessage(error));
  }

  return { imported: rows.length, skipped, locales };
}

export async function getTranslationStats(targetLocale: Locale, options: Omit<TranslationExportOptions, 'targetLocale' | 'mode'> = {}) {
  const pack = await exportTranslationPackage({
    targetLocale,
    ...options,
    mode: 'all',
  });

  const allItems = [
    ...pack.items.products,
    ...pack.items.categories,
    ...pack.items.tags,
    ...(pack.items.ui ?? []),
    ...(pack.items.store ?? []),
    ...(pack.items.pages ?? []),
    ...(pack.items.cms ?? []),
  ];
  let total = 0;
  let translated = 0;
  let outdated = 0;
  let missing = 0;

  allItems.forEach((item) => {
    Object.values(item.status).forEach((state) => {
      total += 1;
      if (state === 'translated') translated += 1;
      if (state === 'outdated') outdated += 1;
      if (state === 'missing') missing += 1;
    });
  });

  return { total, translated, outdated, missing };
}
