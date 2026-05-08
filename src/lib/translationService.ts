import { supabase } from './supabase';
import type { Locale } from '../i18n';
import zhCN from '../i18n/locales/zh-CN.json';
import { getSessionUser } from './authService';
import { DEFAULT_STORE_FORM, type StoreForm } from './siteSettings';

export type TranslatableEntity = 'product' | 'category' | 'tag' | 'ui' | 'store' | 'page';
type CatalogEntity = 'product' | 'category' | 'tag';
export type TranslationExportMode = 'all' | 'missing' | 'outdated' | 'missing_or_outdated';

export const SOURCE_LOCALE: Locale = 'zh-CN';

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
  };
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
  mode?: TranslationExportMode;
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
export const STORE_SOURCE_SECTIONS = ['announcement', 'footer'] as const;

type StoreSettingsData = {
  storeForm?: Partial<StoreForm>;
};

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

export function buildTranslationLookup(rows: ContentTranslationRow[]): TranslationLookup {
  return rows.reduce<TranslationLookup>((acc, row) => {
    if (!row.translated_text) return acc;
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
) {
  const rows = await fetchContentTranslations(entityType, locale, entityIds);
  return buildTranslationLookup(rows);
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

  const { data } = await supabase
    .from('admin_settings')
    .select('settings_data')
    .eq('user_id', sessionUser.id)
    .maybeSingle();

  const settingsData = (data?.settings_data ?? {}) as StoreSettingsData;
  return {
    id: 'global',
    label: '店铺资料',
    fields: {
      ...DEFAULT_STORE_FORM,
      ...settingsData.storeForm,
    },
  };
}

async function toStoreSources(): Promise<SourceRecord[]> {
  return [
    await fetchStoreProfileSource(),
    ...toLocaleSectionSources(STORE_SOURCE_SECTIONS),
  ];
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
  ].some((value) => value !== undefined);
  const defaultCatalogIncludes = !hasExplicitIncludes;

  const items: TranslationPackage['items'] = {
    products: [],
    categories: [],
    tags: [],
    ui: [],
    store: [],
    pages: [],
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
    items.ui = await buildPackageItems('ui', targetLocale, toLocaleSectionSources(UI_SOURCE_SECTIONS), mode);
  }

  if (options.includeStore ?? false) {
    items.store = await buildPackageItems('store', targetLocale, await toStoreSources(), mode);
  }

  if (options.includePages ?? false) {
    items.pages = await buildPackageItems('page', targetLocale, toLocaleSectionSources(PAGE_SOURCE_SECTIONS), mode);
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

function flattenPackageRows(pack: TranslationPackage) {
  const now = new Date().toISOString();
  const rows: Array<Record<string, string>> = [];
  const groups: Array<[TranslatableEntity, TranslationPackageItem[]]> = [
    ['product', pack.items.products ?? []],
    ['category', pack.items.categories ?? []],
    ['tag', pack.items.tags ?? []],
    ['ui', pack.items.ui ?? []],
    ['store', pack.items.store ?? []],
    ['page', pack.items.pages ?? []],
  ];

  for (const [entityType, items] of groups) {
    for (const item of items) {
      for (const field of Object.keys(item.target ?? {})) {
        const translatedText = clean(item.target[field]);
        if (!translatedText) continue;

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

  return rows;
}

export async function importTranslationPackage(pack: TranslationPackage) {
  if (pack.version !== 1) throw new Error('Unsupported translation package version.');
  if (!pack.targetLocale || !pack.sourceLocale) throw new Error('Missing locale information.');

  const rows = flattenPackageRows(pack);
  if (rows.length === 0) return { imported: 0 };

  const { error } = await supabase
    .from('content_translations')
    .upsert(rows, { onConflict: 'entity_type,entity_id,locale,field_name' });

  if (error) throw new Error(error.message);
  return { imported: rows.length };
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
