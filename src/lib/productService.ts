/**
 * Fetches products from Supabase and maps them to the existing Product type
 * used by all storefront components.
 */
import { supabase } from './supabase';
import type { Product, Category } from '../storefront/types';
import type { Locale } from '../i18n';
import { fetchTranslationLookup, SOURCE_LOCALE } from './translationService';

// ─── DB row types ─────────────────────────────────────────────────────────────

interface DBProduct {
  id: string;
  category_id: string;
  name: string;
  short_description: string;
  description: string;
  image_url: string;
  images: string[];
  price: number;
  original_price: number;
  stock: number;
  rating: number;
  sold_count: number;
  status: string;
  is_featured: boolean;
  is_hot: boolean;
  is_new: boolean;
  is_flash_sale: boolean;
  tag: string | null;
  sku_groups: Product['skuGroups'];
  specs: Product['specs'];
  highlights: string[];
  product_categories: { name: string } | null;
}

interface DBCategory {
  id: string;
  name: string;
  icon: string;
  gradient: string;
  count: number;
}

export interface DBProductSKU {
  id: string;
  product_id: string;
  sku_code: string;
  sku_name: string;
  price: number;
  original_price: number;
  stock: number;
  image_url: string | null;
  attributes_json: Record<string, string>;
  status: string;
  sort_order: number;
}

export interface DBProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_main: boolean;
}

export interface DBProductAttribute {
  id: string;
  product_id: string;
  name: string;
  value: string;
  sort_order: number;
}

export interface DBProductTag {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string;
  status: string;
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

function toProduct(row: DBProduct): Product {
  return {
    id: row.id,
    name: row.name,
    tagline: row.short_description,
    description: row.description,
    price: Number(row.price),
    originalPrice: Number(row.original_price),
    stock: Number(row.stock),
    rating: Number(row.rating),
    reviewCount: row.sold_count,
    sold: row.sold_count,
    badge: (row.tag ?? null) as Product['badge'],
    isFlashSale: Boolean(row.is_flash_sale),
    images: Array.isArray(row.images) ? row.images : [row.image_url],
    category: row.product_categories?.name ?? '',
    categoryId: row.category_id,
    skuGroups: Array.isArray(row.sku_groups) ? row.sku_groups : [],
    specs: Array.isArray(row.specs) ? row.specs : [],
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
  };
}

function toCategory(row: DBCategory): Category {
  return {
    id: row.id,
    name: row.name,
    count: row.count,
    icon: row.icon,
    gradient: row.gradient,
  };
}

async function applyProductTranslations(products: Product[], locale: Locale = SOURCE_LOCALE): Promise<Product[]> {
  if (locale === SOURCE_LOCALE || products.length === 0) return products;

  const productIds = products.map((product) => product.id);
  const categoryIds = Array.from(new Set(products.map((product) => product.categoryId).filter(Boolean)));
  const [productTranslations, categoryTranslations] = await Promise.all([
    fetchTranslationLookup('product', locale, productIds),
    fetchTranslationLookup('category', locale, categoryIds),
  ]);

  return products.map((product) => {
    const productText = productTranslations[product.id] ?? {};
    const categoryText = categoryTranslations[product.categoryId] ?? {};
    return {
      ...product,
      name: productText.name ?? product.name,
      tagline: productText.short_description ?? product.tagline,
      description: productText.description ?? product.description,
      category: categoryText.name ?? product.category,
    };
  });
}

async function applyCategoryTranslations(categories: Category[], locale: Locale = SOURCE_LOCALE): Promise<Category[]> {
  if (locale === SOURCE_LOCALE || categories.length === 0) return categories;

  const translations = await fetchTranslationLookup('category', locale, categories.map((category) => category.id));
  return categories.map((category) => ({
    ...category,
    name: translations[category.id]?.name ?? category.name,
  }));
}

// ─── Queries ──────────────────────────────────────────────────────────────────

const BASE_SELECT = `
  id, category_id, name, short_description, description,
  image_url, images, price, original_price, stock, rating, sold_count,
  status, is_featured, is_hot, is_new, is_flash_sale, tag, sku_groups, specs, highlights,
  product_categories(name)
`;

async function queryProducts(filter: Record<string, unknown>, locale: Locale = SOURCE_LOCALE): Promise<Product[]> {
  let q = supabase
    .from('products')
    .select(BASE_SELECT)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('sort_order');

  for (const [k, v] of Object.entries(filter)) {
    q = q.eq(k, v);
  }

  const { data, error } = await q;
  if (error || !data) return [];
  return applyProductTranslations((data as unknown as DBProduct[]).map(toProduct), locale);
}

export async function fetchFeaturedProducts(locale: Locale = SOURCE_LOCALE): Promise<Product[]> {
  const data = await queryProducts({ is_featured: true }, locale);
  return data;
}

export async function fetchNewArrivals(locale: Locale = SOURCE_LOCALE): Promise<Product[]> {
  const data = await queryProducts({ is_new: true }, locale);
  return data;
}

export async function fetchFlashSaleProducts(locale: Locale = SOURCE_LOCALE): Promise<Product[]> {
  const flashSaleProducts = await queryProducts({ is_flash_sale: true }, locale);
  return flashSaleProducts.slice(0, 3);
}

export async function fetchAllProducts(locale: Locale = SOURCE_LOCALE): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(BASE_SELECT)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('sort_order');

  if (error || !data) return [];
  return applyProductTranslations((data as unknown as DBProduct[]).map(toProduct), locale);
}

export async function fetchProductById(id: string, locale: Locale = SOURCE_LOCALE): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(BASE_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data) return null;
  const translated = await applyProductTranslations([toProduct(data as unknown as DBProduct)], locale);
  return translated[0] ?? null;
}

export async function fetchProductsByCategory(categoryId: string, locale: Locale = SOURCE_LOCALE): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(BASE_SELECT)
    .eq('category_id', categoryId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('sort_order');

  if (error || !data) return [];
  return applyProductTranslations((data as unknown as DBProduct[]).map(toProduct), locale);
}

export async function fetchCategories(locale: Locale = SOURCE_LOCALE): Promise<Category[]> {
  const { data, error } = await supabase
    .from('product_categories')
    .select('id, name, icon, gradient, count')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('sort_order');

  if (error || !data) return [];
  return applyCategoryTranslations((data as DBCategory[]).map(toCategory), locale);
}

// ─── Extended fetch helpers (admin / product detail) ─────────────────────────

export async function fetchProductSKUs(productId: string): Promise<DBProductSKU[]> {
  const { data, error } = await supabase
    .from('product_skus')
    .select('id, product_id, sku_code, sku_name, price, original_price, stock, image_url, attributes_json, status, sort_order')
    .eq('product_id', productId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('sort_order');
  if (error || !data) return [];
  return data as DBProductSKU[];
}

export async function fetchProductImages(productId: string): Promise<DBProductImage[]> {
  const { data, error } = await supabase
    .from('product_images')
    .select('id, product_id, image_url, alt_text, sort_order, is_main')
    .eq('product_id', productId)
    .order('sort_order');
  if (error || !data) return [];
  return data as DBProductImage[];
}

export async function fetchProductAttributes(productId: string): Promise<DBProductAttribute[]> {
  const { data, error } = await supabase
    .from('product_attributes')
    .select('id, product_id, name, value, sort_order')
    .eq('product_id', productId)
    .order('sort_order');
  if (error || !data) return [];
  return data as DBProductAttribute[];
}

export async function fetchProductTags(): Promise<DBProductTag[]> {
  const { data, error } = await supabase
    .from('product_tags')
    .select('id, name, slug, color, description, status')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('name');
  if (error || !data) return [];
  return data as DBProductTag[];
}

export async function fetchProductTagIds(productId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('product_tag_relations')
    .select('tag_id')
    .eq('product_id', productId);
  if (error || !data) return [];
  return data.map((r: { tag_id: string }) => r.tag_id);
}
