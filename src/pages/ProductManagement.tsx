import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, Pencil, Trash2, ChevronDown, Package, TrendingUp, TrendingDown, Star,
  X, Save, AlertCircle, ChevronLeft, ChevronRight, Eye, EyeOff, Image, Tag, Layers,
  Settings2, FileText, BarChart2, RefreshCw, Download, Upload, MessageSquare,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchMediaSettings, formatMediaSize, type MediaAsset } from '../lib/mediaService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DBProduct {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  short_description: string;
  subtitle: string;
  description: string;
  detail_description: string;
  image_url: string;
  main_image_url: string;
  price: number;
  original_price: number;
  stock: number;
  rating: number;
  sold_count: number;
  review_count: number;
  status: 'active' | 'inactive';
  is_featured: boolean;
  is_hot: boolean;
  is_new: boolean;
  is_flash_sale: boolean;
  seo_title: string;
  seo_description: string;
  sort_order: number;
  created_at: string;
  product_categories: { name: string } | null;
  product_tag_relations?: { product_tags: DBTag | null }[];
}

interface DBCategory { id: string; name: string; }
interface DBTag { id: string; name: string; color: string; }
interface DBImage { id?: string; image_url: string; alt_text: string; sort_order: number; is_main: boolean; }
interface DBSKU {
  id?: string;
  sku_code: string;
  sku_name: string;
  price: string;
  original_price: string;
  stock: string;
  image_url: string;
  attributes_json: Record<string, string>;
}
interface DBAttr { id?: string; name: string; value: string; sort_order: number; }
interface DBReview {
  id?: string;
  customer_name: string;
  avatar_text: string;
  avatar_color: string;
  rating: string;
  title: string;
  content: string;
  review_date: string;
  status: 'active' | 'inactive';
  is_featured: boolean;
  sort_order: number;
}

interface ProductExportRow {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  short_description: string;
  subtitle: string;
  description: string;
  detail_description: string;
  image_url: string;
  main_image_url: string;
  images: unknown;
  price: number;
  original_price: number;
  stock: number;
  rating: number;
  sold_count: number;
  review_count: number;
  status: 'active' | 'inactive';
  is_featured: boolean;
  is_hot: boolean;
  is_new: boolean;
  is_flash_sale: boolean;
  seo_title: string;
  seo_description: string;
  sort_order: number;
  sku_groups: unknown;
  specs: unknown;
  highlights: unknown;
}

interface ProductExportSku {
  sku_code: string;
  sku_name: string;
  price: number | string;
  original_price: number | string;
  stock: number | string;
  image_url: string;
  attributes_json: Record<string, string>;
  status: string;
  sort_order: number;
}

interface ProductExportBundle {
  product: ProductExportRow;
  images: Array<Omit<DBImage, 'id'>>;
  skus: ProductExportSku[];
  attributes: Array<Omit<DBAttr, 'id'>>;
  tagIds: string[];
}

interface ProductImportPackage {
  version: 1;
  kind: 'shopnova_product_batch';
  exportedAt: string;
  products: ProductExportBundle[];
}

const productCsvColumns = [
  ['id', '商品ID'],
  ['name', '商品名称'],
  ['category_id', '分类ID'],
  ['category_name', '分类名称'],
  ['slug', 'URL别名'],
  ['subtitle', '副标题'],
  ['short_description', '一句话简介'],
  ['description', '详细描述'],
  ['detail_description', '详情长文'],
  ['image_urls', '图片URL（多张用 | 分隔）'],
  ['price', '售价'],
  ['original_price', '原价'],
  ['stock', '库存'],
  ['rating', '评分'],
  ['sold_count', '已售'],
  ['review_count', '评价数'],
  ['status', '状态(active/inactive)'],
  ['is_featured', '精选(1/0)'],
  ['is_hot', '热卖(1/0)'],
  ['is_new', '新品(1/0)'],
  ['is_flash_sale', '限时特卖(1/0)'],
  ['seo_title', 'SEO标题'],
  ['seo_description', 'SEO描述'],
  ['sort_order', '排序'],
] as const;

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all';
const PAGE_SIZE = 10;

function downloadJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function downloadText(fileName: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  const headers = productCsvColumns.map(([, label]) => label);
  const keys = productCsvColumns.map(([key]) => key);
  return [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => keys.map((key) => csvEscape(row[key])).join(',')),
  ].join('\n');
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizeCsvHeader(header: string) {
  const text = header.trim().replace(/^\uFEFF/, '');
  const exact = productCsvColumns.find(([key, label]) => key === text || label === text);
  if (exact) return exact[0];

  const normalized = text.toLowerCase().replace(/\s+/g, '');
  const aliases: Record<string, typeof productCsvColumns[number][0]> = {
    商品id: 'id',
    productid: 'id',
    商品名称: 'name',
    name: 'name',
    分类id: 'category_id',
    categoryid: 'category_id',
    分类名称: 'category_name',
    categoryname: 'category_name',
    图片url: 'image_urls',
    图片链接: 'image_urls',
    images: 'image_urls',
    imageurls: 'image_urls',
    售价: 'price',
    price: 'price',
    原价: 'original_price',
    库存: 'stock',
    评价数: 'review_count',
    评价数量: 'review_count',
    评论数: 'review_count',
    评论数量: 'review_count',
    reviewcount: 'review_count',
    状态: 'status',
    排序: 'sort_order',
  };
  return aliases[normalized] ?? null;
}

function csvRowsToRecords(text: string) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeCsvHeader);
  return rows.slice(1).map((row) => headers.reduce<Record<string, string>>((acc, key, index) => {
    if (key) acc[key] = row[index]?.trim() ?? '';
    return acc;
  }, {})).filter((record) => Object.values(record).some((value) => value.trim()));
}

function parseBoolean(value: unknown) {
  const text = String(value ?? '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'y', '是', '启用', '上架'].includes(text);
}

function normalizeProductStatus(value: unknown): 'active' | 'inactive' {
  const text = String(value ?? '').trim().toLowerCase();
  if (['inactive', '下架', '停用', '0', 'false', '否'].includes(text)) return 'inactive';
  return 'active';
}

function splitImageUrls(value: string) {
  return value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateProductImportPackage(value: unknown): ProductImportPackage {
  if (!isPlainObject(value) || value.version !== 1 || value.kind !== 'shopnova_product_batch') {
    throw new Error('商品导入文件格式不正确，请导入商品管理导出的 JSON。');
  }
  if (!Array.isArray(value.products)) throw new Error('商品导入文件缺少 products 数组。');
  value.products.forEach((item, index) => {
    if (!isPlainObject(item) || !isPlainObject(item.product)) {
      throw new Error(`第 ${index + 1} 个商品格式不正确。`);
    }
    if (typeof item.product.name !== 'string' || !item.product.name.trim()) {
      throw new Error(`第 ${index + 1} 个商品缺少商品名称。`);
    }
  });
  return value as unknown as ProductImportPackage;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function MediaPickerModal({ onSelect, onClose }: { onSelect: (asset: MediaAsset) => void; onClose: () => void }) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    fetchMediaSettings()
      .then((result) => {
        if (!ignore) setAssets(result.mediaAssets);
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
    if (asset.usage !== 'products' && asset.usage !== 'other') return false;
    if (!keyword) return true;
    return [asset.name, asset.url, asset.altText].some((value) => value.toLowerCase().includes(keyword));
  });

  return (
    <div className="fixed inset-0 z-[520] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[82vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-base font-bold text-slate-900">从素材库选择</div>
            <div className="mt-0.5 text-xs text-slate-400">选择后会自动填入图片 URL。</div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
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
              <div className="mt-2 text-sm font-bold text-slate-700">素材库暂无商品图片</div>
              <div className="mt-1 text-xs text-slate-400">请先到图片管理上传，或继续手动粘贴图片 URL。</div>
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

// ─── 7-Tab Product Form Modal ──────────────────────────────────────────────────

const TABS = [
  { id: 'basic', label: '基本信息', icon: FileText },
  { id: 'images', label: '图片管理', icon: Image },
  { id: 'price', label: '价格库存', icon: BarChart2 },
  { id: 'skus', label: 'SKU管理', icon: Layers },
  { id: 'attrs', label: '规格参数', icon: Settings2 },
  { id: 'tags', label: '标签', icon: Tag },
  { id: 'reviews', label: '商品评论', icon: MessageSquare },
  { id: 'seo', label: 'SEO', icon: Search },
] as const;

type TabId = typeof TABS[number]['id'];

const reviewColorOptions = [
  'from-blue-500 to-cyan-500',
  'from-violet-500 to-fuchsia-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-rose-500',
  'from-slate-700 to-slate-500',
];

function createReviewDraft(index: number): DBReview {
  return {
    customer_name: '',
    avatar_text: '',
    avatar_color: reviewColorOptions[index % reviewColorOptions.length],
    rating: '5.0',
    title: '',
    content: '',
    review_date: new Date().toISOString().slice(0, 10),
    status: 'active',
    is_featured: index < 3,
    sort_order: index,
  };
}

function ProductFormModal({
  product, categories, allTags, onSave, onClose,
}: {
  product: DBProduct | null;
  categories: DBCategory[];
  allTags: DBTag[];
  onSave: () => void;
  onClose: () => void;
}) {
  const isEdit = !!product;
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Basic
  const [basic, setBasic] = useState({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    subtitle: product?.subtitle ?? '',
    category_id: product?.category_id ?? '',
    short_description: product?.short_description ?? '',
    description: product?.description ?? '',
    detail_description: product?.detail_description ?? '',
    status: (product?.status ?? 'active') as 'active' | 'inactive',
    is_featured: product?.is_featured ?? false,
    is_hot: product?.is_hot ?? false,
    is_new: product?.is_new ?? false,
    is_flash_sale: product?.is_flash_sale ?? false,
    sort_order: String(product?.sort_order ?? '0'),
  });

  // Images
  const [images, setImages] = useState<DBImage[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [mediaPickerIndex, setMediaPickerIndex] = useState<number | null>(null);

  // Price
  const [price, setPrice] = useState({
    price: String(product?.price ?? ''),
    original_price: String(product?.original_price ?? ''),
    stock: String(product?.stock ?? ''),
    rating: String(product?.rating ?? '5.0'),
    sold_count: String(product?.sold_count ?? '0'),
    review_count: String(product?.review_count ?? '0'),
  });

  // SKUs
  const [skus, setSkus] = useState<DBSKU[]>([]);
  const [skusLoaded, setSkusLoaded] = useState(false);

  // Attributes
  const [attrs, setAttrs] = useState<DBAttr[]>([]);
  const [attrsLoaded, setAttrsLoaded] = useState(false);

  // Tags
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagsLoaded, setTagsLoaded] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<DBReview[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [loadedReviewIds, setLoadedReviewIds] = useState<string[]>([]);

  // SEO
  const [seo, setSeo] = useState({
    seo_title: product?.seo_title ?? '',
    seo_description: product?.seo_description ?? '',
  });

  // Lazy-load per-tab data for existing products
  useEffect(() => {
    if (!isEdit || !product) return;
    if (activeTab === 'images' && !imagesLoaded) {
      supabase.from('product_images').select('id, image_url, alt_text, sort_order, is_main').eq('product_id', product.id).order('sort_order').then(({ data }) => {
        setImages((data ?? []).map((img) => ({
          ...(img as DBImage),
          image_url: ((img as DBImage).image_url ?? '').trim(),
          alt_text: ((img as DBImage).alt_text ?? '').trim(),
        })));
        setImagesLoaded(true);
      });
    }
    if (activeTab === 'skus' && !skusLoaded) {
      supabase.from('product_skus').select('id, sku_code, sku_name, price, original_price, stock, image_url, attributes_json').eq('product_id', product.id).is('deleted_at', null).order('sort_order').then(({ data }) => {
        setSkus((data ?? []).map((r: Record<string, unknown>) => ({
          ...r,
          price: String(r.price),
          original_price: String(r.original_price),
          stock: String(r.stock),
          image_url: (r.image_url as string) ?? '',
          attributes_json: (r.attributes_json as Record<string, string>) ?? {},
        })) as DBSKU[]);
        setSkusLoaded(true);
      });
    }
    if (activeTab === 'attrs' && !attrsLoaded) {
      supabase.from('product_attributes').select('id, name, value, sort_order').eq('product_id', product.id).order('sort_order').then(({ data }) => {
        setAttrs((data ?? []) as DBAttr[]);
        setAttrsLoaded(true);
      });
    }
    if (activeTab === 'tags' && !tagsLoaded) {
      supabase.from('product_tag_relations').select('tag_id').eq('product_id', product.id).then(({ data }) => {
        setSelectedTagIds((data ?? []).map((r: { tag_id: string }) => r.tag_id));
        setTagsLoaded(true);
      });
    }
    if (activeTab === 'reviews' && !reviewsLoaded) {
      supabase
        .from('product_reviews')
        .select('id, customer_name, avatar_text, avatar_color, rating, title, content, review_date, status, is_featured, sort_order')
        .eq('product_id', product.id)
        .order('sort_order')
        .then(({ data }) => {
          const nextReviews = (data ?? []).map((review: Record<string, unknown>) => ({
            id: String(review.id ?? ''),
            customer_name: String(review.customer_name ?? ''),
            avatar_text: String(review.avatar_text ?? ''),
            avatar_color: String(review.avatar_color ?? reviewColorOptions[0]),
            rating: String(review.rating ?? '5.0'),
            title: String(review.title ?? ''),
            content: String(review.content ?? ''),
            review_date: String(review.review_date ?? new Date().toISOString().slice(0, 10)),
            status: (review.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
            is_featured: Boolean(review.is_featured),
            sort_order: Number(review.sort_order ?? 0),
          }));
          setReviews(nextReviews);
          setLoadedReviewIds(nextReviews.map((review) => review.id).filter(Boolean));
          setReviewsLoaded(true);
        });
    }
  }, [activeTab, isEdit, product, imagesLoaded, skusLoaded, attrsLoaded, tagsLoaded, reviewsLoaded]);

  const handleSelectMediaAsset = (asset: MediaAsset) => {
    setImages((prev) => {
      const nextImage: DBImage = {
        image_url: asset.url,
        alt_text: asset.altText || asset.name,
        sort_order: mediaPickerIndex ?? prev.length,
        is_main: (mediaPickerIndex ?? prev.length) === 0,
      };

      if (mediaPickerIndex === null || mediaPickerIndex >= prev.length) {
        return [...prev, nextImage];
      }

      return prev.map((img, index) => (
        index === mediaPickerIndex
          ? { ...img, image_url: asset.url, alt_text: img.alt_text || asset.altText || asset.name }
          : img
      ));
    });
    setImagesLoaded(true);
    setMediaPickerIndex(null);
  };

  const handleSubmit = async () => {
    if (!basic.name.trim()) { setError('商品名称不能为空'); setActiveTab('basic'); return; }
    if (!basic.category_id) { setError('请选择商品分类'); setActiveTab('basic'); return; }
    if (!price.price || isNaN(Number(price.price))) { setError('请输入有效的价格'); setActiveTab('price'); return; }

    setSaving(true);
    setError('');

    const cleanImages = images
      .map((img) => ({
        ...img,
        image_url: img.image_url.trim(),
        alt_text: img.alt_text.trim(),
      }))
      .filter((img) => img.image_url);

    const payload = {
      name: basic.name.trim(),
      slug: basic.slug.trim() || basic.name.trim().toLowerCase().replace(/[\s\W]+/g, '-'),
      subtitle: basic.subtitle.trim(),
      category_id: basic.category_id,
      short_description: basic.short_description.trim(),
      description: basic.description.trim(),
      detail_description: basic.detail_description.trim(),
      status: basic.status,
      is_featured: basic.is_featured,
      is_hot: basic.is_hot,
      is_new: basic.is_new,
      is_flash_sale: basic.is_flash_sale,
      sort_order: Number(basic.sort_order) || 0,
      price: Number(price.price),
      original_price: Number(price.original_price) || Number(price.price),
      stock: Number(price.stock) || 0,
      rating: Number(price.rating) || 5.0,
      sold_count: Number(price.sold_count) || 0,
      review_count: Number(price.review_count) || 0,
      seo_title: seo.seo_title.trim(),
      seo_description: seo.seo_description.trim(),
      updated_at: new Date().toISOString(),
    };

    let productId = product?.id ?? `p-${crypto.randomUUID()}`;

    if (isEdit) {
      const { error: err } = await supabase.from('products').update(payload).eq('id', productId);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const mainImg = cleanImages[0]?.image_url ?? '';
      const { data, error: err } = await supabase.from('products').insert({
        ...payload,
        id: productId,
        image_url: mainImg,
        main_image_url: mainImg,
        images: cleanImages.map((img) => img.image_url),
      }).select('id').single();
      if (err || !data) { setError(err?.message ?? '创建失败'); setSaving(false); return; }
      productId = data.id;
    }

    // Save images
    if (imagesLoaded || !isEdit) {
      await supabase.from('product_images').delete().eq('product_id', productId);
      if (cleanImages.length > 0) {
        await supabase.from('product_images').insert(
          cleanImages.map((img, i) => ({ product_id: productId, image_url: img.image_url, alt_text: img.alt_text || null, sort_order: i, is_main: i === 0 }))
        );
      }

      const mainImg = cleanImages[0]?.image_url ?? '';
      await supabase
        .from('products')
        .update({ image_url: mainImg, main_image_url: mainImg, images: cleanImages.map((img) => img.image_url) })
        .eq('id', productId);
    }

    // Save SKUs
    if (skusLoaded || !isEdit) {
      await supabase.from('product_skus').update({ deleted_at: new Date().toISOString() }).eq('product_id', productId).is('deleted_at', null);
      if (skus.length > 0) {
        await supabase.from('product_skus').insert(
          skus.map((sku, i) => ({
            product_id: productId,
            sku_code: sku.sku_code || `${productId}-${i}`,
            sku_name: sku.sku_name,
            price: Number(sku.price),
            original_price: Number(sku.original_price) || Number(sku.price),
            stock: Number(sku.stock) || 0,
            image_url: sku.image_url || null,
            attributes_json: sku.attributes_json,
            status: 'active',
            sort_order: i,
          }))
        );
      }
    }

    // Save attributes
    if (attrsLoaded || !isEdit) {
      await supabase.from('product_attributes').delete().eq('product_id', productId);
      if (attrs.length > 0) {
        await supabase.from('product_attributes').insert(
          attrs.map((a, i) => ({ product_id: productId, name: a.name, value: a.value, sort_order: i }))
        );
      }
    }

    // Save tags
    if (tagsLoaded || !isEdit) {
      await supabase.from('product_tag_relations').delete().eq('product_id', productId);
      if (selectedTagIds.length > 0) {
        await supabase.from('product_tag_relations').insert(
          selectedTagIds.map((tag_id) => ({ product_id: productId, tag_id }))
        );
      }
    }

    // Save reviews
    if (reviewsLoaded || !isEdit) {
      const cleanReviews = reviews
        .map((review, index) => ({
          id: review.id,
          product_id: productId,
          customer_name: review.customer_name.trim(),
          avatar_text: (review.avatar_text.trim() || review.customer_name.trim().slice(0, 1) || 'U').slice(0, 2).toUpperCase(),
          avatar_color: review.avatar_color || reviewColorOptions[index % reviewColorOptions.length],
          rating: Math.min(5, Math.max(1, Number(review.rating) || 5)),
          title: review.title.trim(),
          content: review.content.trim(),
          review_date: review.review_date || new Date().toISOString().slice(0, 10),
          status: review.status,
          is_featured: review.is_featured,
          sort_order: index,
        }))
        .filter((review) => review.customer_name && review.content);

      const nextReviewIds = cleanReviews.map((review) => review.id).filter(Boolean) as string[];
      const deletedReviewIds = loadedReviewIds.filter((id) => !nextReviewIds.includes(id));
      if (deletedReviewIds.length > 0) {
        const { error: deleteError } = await supabase.from('product_reviews').delete().in('id', deletedReviewIds);
        if (deleteError) { setError(deleteError.message); setSaving(false); return; }
      }

      const existingReviews = cleanReviews.filter((review) => review.id);
      const newReviews = cleanReviews.filter((review) => !review.id);

      for (const review of existingReviews) {
        if (!review.id) continue;
        const reviewPayload = { ...review };
        delete reviewPayload.id;
        const { error: updateError } = await supabase.from('product_reviews').update(reviewPayload).eq('id', review.id);
        if (updateError) { setError(updateError.message); setSaving(false); return; }
      }

      if (newReviews.length > 0) {
        const newReviewPayloads = newReviews.map((review) => {
          const reviewPayload = { ...review };
          delete reviewPayload.id;
          return reviewPayload;
        });
        const { error: insertError } = await supabase.from('product_reviews').insert(newReviewPayloads);
        if (insertError) { setError(insertError.message); setSaving(false); return; }
      }

      const activeReviews = cleanReviews.filter((review) => review.status === 'active');
      if (activeReviews.length > 0) {
        const averageRating = Math.round((activeReviews.reduce((sum, review) => sum + review.rating, 0) / activeReviews.length) * 10) / 10;
        const nextReviewCount = Math.max(Number(price.review_count) || 0, activeReviews.length);
        await supabase
          .from('products')
          .update({ rating: averageRating, review_count: nextReviewCount })
          .eq('id', productId);
      }
    }

    onSave();
    onClose();
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400] flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{isEdit ? '编辑商品' : '新增商品'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 border-b border-slate-100 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle size={14} />{error}
          </div>
        )}

        {/* Tab content */}
        <div className="px-6 py-5 space-y-4 min-h-[340px]">
          {/* ── Basic ── */}
          {activeTab === 'basic' && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="商品名称" required>
                  <input value={basic.name} onChange={(e) => setBasic((p) => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="请输入商品名称" />
                </Field>
                <Field label="副标题">
                  <input value={basic.subtitle} onChange={(e) => setBasic((p) => ({ ...p, subtitle: e.target.value }))} className={inputCls} placeholder="一行卖点文字" />
                </Field>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Slug">
                  <input value={basic.slug} onChange={(e) => setBasic((p) => ({ ...p, slug: e.target.value }))} className={inputCls} placeholder="auto-generated" />
                </Field>
                <Field label="分类" required>
                  <select value={basic.category_id} onChange={(e) => setBasic((p) => ({ ...p, category_id: e.target.value }))} className={inputCls}>
                    <option value="">请选择分类</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="排序">
                  <input type="number" value={basic.sort_order} onChange={(e) => setBasic((p) => ({ ...p, sort_order: e.target.value }))} className={inputCls} placeholder="0" />
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="状态">
                  <select value={basic.status} onChange={(e) => setBasic((p) => ({ ...p, status: e.target.value as 'active' | 'inactive' }))} className={inputCls}>
                    <option value="active">上架</option>
                    <option value="inactive">下架</option>
                  </select>
                </Field>
              </div>
              <Field label="商品简介">
                <input value={basic.short_description} onChange={(e) => setBasic((p) => ({ ...p, short_description: e.target.value }))} className={inputCls} placeholder="一句话简介" />
              </Field>
              <Field label="商品描述">
                <textarea value={basic.description} onChange={(e) => setBasic((p) => ({ ...p, description: e.target.value }))} className={`${inputCls} resize-none h-20`} placeholder="详细描述" />
              </Field>
              <Field label="详细介绍">
                <textarea value={basic.detail_description} onChange={(e) => setBasic((p) => ({ ...p, detail_description: e.target.value }))} className={`${inputCls} resize-none h-20`} placeholder="商品详情长文" />
              </Field>
              <div className="flex flex-wrap gap-4 pt-1">
                {([
                  { key: 'is_featured', label: '精选推荐' },
                  { key: 'is_hot', label: '热卖商品' },
                  { key: 'is_new', label: '新品上架' },
                  { key: 'is_flash_sale', label: '限时特卖' },
                ] as { key: 'is_featured' | 'is_hot' | 'is_new' | 'is_flash_sale'; label: string }[]).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={basic[key] as boolean}
                      onChange={(e) => setBasic((p) => ({ ...p, [key]: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600"
                    />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {/* ── Images ── */}
          {activeTab === 'images' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="text-sm font-bold text-blue-800">商品图片</div>
                <p className="mt-1 text-xs leading-5 text-blue-700">
                  第一张是主图。当前填写的是图片链接，需要先把本地图片上传到图床、CDN 或 Supabase Storage，再把 https 图片地址粘贴进来。
                </p>
              </div>

              {images.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                  <Image size={24} className="mx-auto text-slate-300" />
                  <div className="mt-2 text-sm font-semibold text-slate-700">还没有添加图片</div>
                  <button
                    type="button"
                    onClick={() => setImages((prev) => [...prev, { image_url: '', alt_text: '', sort_order: prev.length, is_main: prev.length === 0 }])}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    <Plus size={13} /> 添加第一张图片
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaPickerIndex(0)}
                    className="ml-2 mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    <Image size={13} /> 从素材库选择
                  </button>
                </div>
              )}

              {images.map((img, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-slate-300">
                      {img.image_url ? (
                        <img
                          src={img.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Image size={22} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">{i === 0 ? '主图' : `图片 ${i + 1}`}</span>
                          {i === 0 && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">商品列表展示</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setMediaPickerIndex(i)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            从素材库选择
                          </button>
                          <button
                            type="button"
                            onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-50"
                            aria-label="删除图片"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                        <Field label="图片 URL" required={i === 0}>
                          <input
                            value={img.image_url}
                            onChange={(e) => setImages((prev) => prev.map((x, j) => j === i ? { ...x, image_url: e.target.value } : x))}
                            className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-all focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            placeholder="https://example.com/product.jpg"
                          />
                        </Field>
                        <Field label="图片说明">
                          <input
                            value={img.alt_text}
                            onChange={(e) => setImages((prev) => prev.map((x, j) => j === i ? { ...x, alt_text: e.target.value } : x))}
                            className="w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-all focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            placeholder="可选"
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setImages((prev) => [...prev, { image_url: '', alt_text: '', sort_order: prev.length, is_main: prev.length === 0 }])}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold py-2"
              >
                <Plus size={13} /> 添加一行图片
              </button>
              {images.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMediaPickerIndex(images.length)}
                  className="ml-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  <Image size={13} /> 从素材库追加
                </button>
              )}
            </div>
          )}

          {/* ── Price / Stock ── */}
          {activeTab === 'price' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="售价" required>
                  <input type="number" value={price.price} onChange={(e) => setPrice((p) => ({ ...p, price: e.target.value }))} className={inputCls} placeholder="0.00" min="0" step="0.01" />
                </Field>
                <Field label="原价">
                  <input type="number" value={price.original_price} onChange={(e) => setPrice((p) => ({ ...p, original_price: e.target.value }))} className={inputCls} placeholder="0.00" min="0" step="0.01" />
                </Field>
                <Field label="库存">
                  <input type="number" value={price.stock} onChange={(e) => setPrice((p) => ({ ...p, stock: e.target.value }))} className={inputCls} placeholder="0" min="0" />
                </Field>
                <Field label="评分">
                  <input type="number" value={price.rating} onChange={(e) => setPrice((p) => ({ ...p, rating: e.target.value }))} className={inputCls} placeholder="5.0" min="0" max="5" step="0.1" />
                </Field>
                <Field label="已售数量">
                  <input type="number" value={price.sold_count} onChange={(e) => setPrice((p) => ({ ...p, sold_count: e.target.value }))} className={inputCls} placeholder="0" min="0" />
                </Field>
                <Field label="评价数量">
                  <input type="number" value={price.review_count} onChange={(e) => setPrice((p) => ({ ...p, review_count: e.target.value }))} className={inputCls} placeholder="0" min="0" />
                </Field>
              </div>
            </>
          )}

          {/* ── SKUs ── */}
          {activeTab === 'skus' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">为此商品定义 SKU 变体（颜色、尺寸等）。每个 SKU 有独立定价和库存。</p>
              {skus.map((sku, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">SKU #{i + 1}</span>
                    <button onClick={() => setSkus((prev) => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                      <X size={13} />
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="SKU 名称">
                      <input value={sku.sku_name} onChange={(e) => setSkus((prev) => prev.map((x, j) => j === i ? { ...x, sku_name: e.target.value } : x))} className={inputCls} placeholder="如：蓝色/XL" />
                    </Field>
                    <Field label="SKU 编码">
                      <input value={sku.sku_code} onChange={(e) => setSkus((prev) => prev.map((x, j) => j === i ? { ...x, sku_code: e.target.value } : x))} className={inputCls} placeholder="可选" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="售价">
                      <input type="number" value={sku.price} onChange={(e) => setSkus((prev) => prev.map((x, j) => j === i ? { ...x, price: e.target.value } : x))} className={inputCls} placeholder="0.00" min="0" step="0.01" />
                    </Field>
                    <Field label="原价">
                      <input type="number" value={sku.original_price} onChange={(e) => setSkus((prev) => prev.map((x, j) => j === i ? { ...x, original_price: e.target.value } : x))} className={inputCls} placeholder="0.00" min="0" step="0.01" />
                    </Field>
                    <Field label="库存">
                      <input type="number" value={sku.stock} onChange={(e) => setSkus((prev) => prev.map((x, j) => j === i ? { ...x, stock: e.target.value } : x))} className={inputCls} placeholder="0" min="0" />
                    </Field>
                  </div>
                  <Field label="SKU 图片 URL">
                    <input value={sku.image_url} onChange={(e) => setSkus((prev) => prev.map((x, j) => j === i ? { ...x, image_url: e.target.value } : x))} className={inputCls} placeholder="可选" />
                  </Field>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">属性 (key: value，每行一个)</label>
                    <textarea
                      value={Object.entries(sku.attributes_json).map(([k, v]) => `${k}: ${v}`).join('\n')}
                      onChange={(e) => {
                        const obj: Record<string, string> = {};
                        e.target.value.split('\n').forEach((line) => {
                          const idx = line.indexOf(':');
                          if (idx > 0) obj[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
                        });
                        setSkus((prev) => prev.map((x, j) => j === i ? { ...x, attributes_json: obj } : x));
                      }}
                      className={`${inputCls} resize-none h-16`}
                      placeholder={"颜色: 蓝色\n尺寸: XL"}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setSkus((prev) => [...prev, { sku_code: '', sku_name: '', price: '', original_price: '', stock: '', image_url: '', attributes_json: {} }])}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold py-2"
              >
                <Plus size={13} /> 添加 SKU
              </button>
            </div>
          )}

          {/* ── Attributes ── */}
          {activeTab === 'attrs' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">商品规格参数，显示在商品详情页参数表中。</p>
              {attrs.map((attr, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={attr.name}
                    onChange={(e) => setAttrs((prev) => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    className={`${inputCls} w-36`}
                    placeholder="参数名"
                  />
                  <input
                    value={attr.value}
                    onChange={(e) => setAttrs((prev) => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                    className={`${inputCls} flex-1`}
                    placeholder="参数值"
                  />
                  <button onClick={() => setAttrs((prev) => prev.filter((_, j) => j !== i))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400">
                    <X size={13} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setAttrs((prev) => [...prev, { name: '', value: '', sort_order: prev.length }])}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold py-2"
              >
                <Plus size={13} /> 添加参数
              </button>
            </div>
          )}

          {/* ── Tags ── */}
          {activeTab === 'tags' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">为商品绑定标签，可用于筛选和促销活动。</p>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedTagIds((prev) => selected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id])}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                        selected ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                      {selected && <span className="text-blue-600">✓</span>}
                    </button>
                  );
                })}
                {allTags.length === 0 && <p className="text-xs text-slate-400">暂无标签，请先在标签管理中创建。</p>}
              </div>
            </div>
          )}

          {/* ── Reviews ── */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="text-sm font-bold text-blue-800">商品评论</div>
                <p className="mt-1 text-xs leading-5 text-blue-700">
                  可以添加买家评论、评分和精选状态。用于商品详情和首页评价区展示；如果是营销型虚拟评论，建议文案保持真实、克制，不夸大承诺。
                </p>
              </div>

              {reviews.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                  <MessageSquare size={24} className="mx-auto text-slate-300" />
                  <div className="mt-2 text-sm font-semibold text-slate-700">还没有添加评论</div>
                  <button
                    type="button"
                    onClick={() => { setReviews((prev) => [...prev, createReviewDraft(prev.length)]); setReviewsLoaded(true); }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    <Plus size={13} /> 添加第一条评论
                  </button>
                </div>
              )}

              {reviews.map((review, index) => (
                <div key={review.id ?? index} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${review.avatar_color} text-sm font-black text-white`}>
                        {review.avatar_text || review.customer_name.slice(0, 1).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">评论 #{index + 1}</div>
                        <div className="text-[11px] text-slate-400">{review.is_featured ? '首页精选展示' : '商品详情展示'}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReviews((prev) => prev.filter((_, reviewIndex) => reviewIndex !== index))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-50"
                      aria-label="删除评论"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="买家昵称" required>
                      <input
                        value={review.customer_name}
                        onChange={(e) => setReviews((prev) => prev.map((item, i) => i === index ? { ...item, customer_name: e.target.value, avatar_text: item.avatar_text || e.target.value.slice(0, 1).toUpperCase() } : item))}
                        className={inputCls}
                        placeholder="如：Ava Carter"
                      />
                    </Field>
                    <Field label="评论日期">
                      <input
                        type="date"
                        value={review.review_date}
                        onChange={(e) => setReviews((prev) => prev.map((item, i) => i === index ? { ...item, review_date: e.target.value } : item))}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="头像文字">
                      <input
                        value={review.avatar_text}
                        onChange={(e) => setReviews((prev) => prev.map((item, i) => i === index ? { ...item, avatar_text: e.target.value.slice(0, 2).toUpperCase() } : item))}
                        className={inputCls}
                        placeholder="A"
                      />
                    </Field>
                    <Field label="评分">
                      <input
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        value={review.rating}
                        onChange={(e) => setReviews((prev) => prev.map((item, i) => i === index ? { ...item, rating: e.target.value } : item))}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="头像颜色">
                      <select
                        value={review.avatar_color}
                        onChange={(e) => setReviews((prev) => prev.map((item, i) => i === index ? { ...item, avatar_color: e.target.value } : item))}
                        className={inputCls}
                      >
                        {reviewColorOptions.map((color) => (
                          <option key={color} value={color}>{color}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="状态">
                      <select
                        value={review.status}
                        onChange={(e) => setReviews((prev) => prev.map((item, i) => i === index ? { ...item, status: e.target.value as 'active' | 'inactive' } : item))}
                        className={inputCls}
                      >
                        <option value="active">显示</option>
                        <option value="inactive">隐藏</option>
                      </select>
                    </Field>
                  </div>

                  <div className="mt-3 grid gap-3">
                    <Field label="评论标题">
                      <input
                        value={review.title}
                        onChange={(e) => setReviews((prev) => prev.map((item, i) => i === index ? { ...item, title: e.target.value } : item))}
                        className={inputCls}
                        placeholder="如：Exactly what I needed"
                      />
                    </Field>
                    <Field label="评论内容" required>
                      <textarea
                        value={review.content}
                        onChange={(e) => setReviews((prev) => prev.map((item, i) => i === index ? { ...item, content: e.target.value } : item))}
                        className={`${inputCls} h-20 resize-none`}
                        placeholder="写一段自然、真实的买家反馈"
                      />
                    </Field>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={review.is_featured}
                        onChange={(e) => setReviews((prev) => prev.map((item, i) => i === index ? { ...item, is_featured: e.target.checked } : item))}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      首页精选评论
                    </label>
                  </div>
                </div>
              ))}

              {reviews.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setReviews((prev) => [...prev, createReviewDraft(prev.length)]); setReviewsLoaded(true); }}
                  className="flex items-center gap-1.5 py-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  <Plus size={13} /> 添加一条评论
                </button>
              )}
            </div>
          )}

          {/* ── SEO ── */}
          {activeTab === 'seo' && (
            <>
              <Field label="SEO 标题">
                <input value={seo.seo_title} onChange={(e) => setSeo((p) => ({ ...p, seo_title: e.target.value }))} className={inputCls} placeholder="页面 <title> 标签内容" />
              </Field>
              <Field label="SEO 描述">
                <textarea value={seo.seo_description} onChange={(e) => setSeo((p) => ({ ...p, seo_description: e.target.value }))} className={`${inputCls} resize-none h-24`} placeholder="meta description，建议 120 字以内" />
              </Field>
              {seo.seo_title && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <p className="text-xs text-slate-400 mb-2">预览</p>
                  <p className="text-base font-semibold text-blue-700 mb-0.5">{seo.seo_title}</p>
                  <p className="text-sm text-slate-500">{seo.seo_description}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            取消
          </button>
          <button
            onClick={handleSubmit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
            {saving ? '保存中…' : '保存商品'}
          </button>
        </div>
      </div>
    </div>
    {mediaPickerIndex !== null && (
      <MediaPickerModal onSelect={handleSelectMediaAsset} onClose={() => setMediaPickerIndex(null)} />
    )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Stats { totalAll: number; activeCount: number; inactiveCount: number; lowStockCount: number; }

export default function ProductManagement() {
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const csvImportFileRef = useRef<HTMLInputElement | null>(null);
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [categories, setCategories] = useState<DBCategory[]>([]);
  const [allTags, setAllTags] = useState<DBTag[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats>({ totalAll: 0, activeCount: 0, inactiveCount: 0, lowStockCount: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  const [editProduct, setEditProduct] = useState<DBProduct | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [batchMenuOpen, setBatchMenuOpen] = useState<'import' | 'export' | null>(null);

  const fetchStats = useCallback(async () => {
    const { data } = await supabase.from('products').select('status, stock').is('deleted_at', null);
    if (!data) return;
    setStats({
      totalAll: data.length,
      activeCount: data.filter((p) => p.status === 'active').length,
      inactiveCount: data.filter((p) => p.status === 'inactive').length,
      lowStockCount: data.filter((p) => p.stock > 0 && p.stock < 20).length,
    });
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('products')
      .select('id, category_id, name, slug, short_description, subtitle, description, detail_description, image_url, main_image_url, price, original_price, stock, rating, sold_count, review_count, status, is_featured, is_hot, is_new, is_flash_sale, seo_title, seo_description, sort_order, created_at, product_categories(name), product_tag_relations(product_tags(id, name, color))', { count: 'exact' })
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) q = q.ilike('name', `%${search.trim()}%`);
    if (catFilter) q = q.eq('category_id', catFilter);
    if (statusFilter) q = q.eq('status', statusFilter);

    const { data, count } = await q;
    setProducts((data ?? []) as unknown as DBProduct[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [search, catFilter, statusFilter, page]);

  useEffect(() => { fetchProducts(); fetchStats(); }, [fetchProducts, fetchStats]);

  useEffect(() => {
    supabase.from('product_categories').select('id, name').is('deleted_at', null).order('sort_order').then(({ data }) => {
      setCategories((data ?? []) as DBCategory[]);
    });
    supabase.from('product_tags').select('id, name, color').eq('status', 'active').is('deleted_at', null).order('name').then(({ data }) => {
      setAllTags((data ?? []) as DBTag[]);
    });
  }, []);

  const handleToggleStatus = async (p: DBProduct) => {
    const newStatus = p.status === 'active' ? 'inactive' : 'active';
    await supabase.from('products').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', p.id);
    fetchProducts();
    fetchStats();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    setDeleteConfirm(null);
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    fetchProducts();
    fetchStats();
  };

  const currentPageIds = products.map((product) => product.id);
  const selectedOnPageCount = currentPageIds.filter((id) => selectedIds.includes(id)).length;
  const allCurrentPageSelected = currentPageIds.length > 0 && selectedOnPageCount === currentPageIds.length;

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const toggleCurrentPageSelected = () => {
    setSelectedIds((prev) => {
      if (allCurrentPageSelected) return prev.filter((id) => !currentPageIds.includes(id));
      return Array.from(new Set([...prev, ...currentPageIds]));
    });
  };

  const buildProductExportBundles = async (ids: string[]) => {
    if (ids.length === 0) throw new Error('请先选择要导出的商品。');

    const [{ data: productRows, error: productError }, { data: imageRows }, { data: skuRows }, { data: attrRows }, { data: tagRows }] = await Promise.all([
      supabase
        .from('products')
        .select('id, category_id, name, slug, short_description, subtitle, description, detail_description, image_url, main_image_url, images, price, original_price, stock, rating, sold_count, review_count, status, is_featured, is_hot, is_new, is_flash_sale, seo_title, seo_description, sort_order, sku_groups, specs, highlights')
        .in('id', ids)
        .is('deleted_at', null),
      supabase
        .from('product_images')
        .select('product_id, image_url, alt_text, sort_order, is_main')
        .in('product_id', ids)
        .order('sort_order'),
      supabase
        .from('product_skus')
        .select('product_id, sku_code, sku_name, price, original_price, stock, image_url, attributes_json, status, sort_order')
        .in('product_id', ids)
        .is('deleted_at', null)
        .order('sort_order'),
      supabase
        .from('product_attributes')
        .select('product_id, name, value, sort_order')
        .in('product_id', ids)
        .order('sort_order'),
      supabase
        .from('product_tag_relations')
        .select('product_id, tag_id')
        .in('product_id', ids),
    ]);

    if (productError) throw new Error(productError.message);

    const imagesByProduct = new Map<string, Array<Omit<DBImage, 'id'>>>();
    (imageRows ?? []).forEach((row: Record<string, unknown>) => {
      const productId = String(row.product_id ?? '');
      if (!imagesByProduct.has(productId)) imagesByProduct.set(productId, []);
      imagesByProduct.get(productId)?.push({
        image_url: String(row.image_url ?? ''),
        alt_text: String(row.alt_text ?? ''),
        sort_order: Number(row.sort_order) || 0,
        is_main: Boolean(row.is_main),
      });
    });

    const skusByProduct = new Map<string, ProductExportSku[]>();
    (skuRows ?? []).forEach((row: Record<string, unknown>) => {
      const productId = String(row.product_id ?? '');
      if (!skusByProduct.has(productId)) skusByProduct.set(productId, []);
      skusByProduct.get(productId)?.push({
        sku_code: String(row.sku_code ?? ''),
        sku_name: String(row.sku_name ?? ''),
        price: Number(row.price) || 0,
        original_price: Number(row.original_price) || Number(row.price) || 0,
        stock: Number(row.stock) || 0,
        image_url: String(row.image_url ?? ''),
        attributes_json: isPlainObject(row.attributes_json) ? row.attributes_json as Record<string, string> : {},
        status: String(row.status ?? 'active'),
        sort_order: Number(row.sort_order) || 0,
      });
    });

    const attrsByProduct = new Map<string, Array<Omit<DBAttr, 'id'>>>();
    (attrRows ?? []).forEach((row: Record<string, unknown>) => {
      const productId = String(row.product_id ?? '');
      if (!attrsByProduct.has(productId)) attrsByProduct.set(productId, []);
      attrsByProduct.get(productId)?.push({
        name: String(row.name ?? ''),
        value: String(row.value ?? ''),
        sort_order: Number(row.sort_order) || 0,
      });
    });

    const tagIdsByProduct = new Map<string, string[]>();
    (tagRows ?? []).forEach((row: Record<string, unknown>) => {
      const productId = String(row.product_id ?? '');
      if (!tagIdsByProduct.has(productId)) tagIdsByProduct.set(productId, []);
      tagIdsByProduct.get(productId)?.push(String(row.tag_id ?? ''));
    });

    return (productRows ?? []).map((row) => ({
      product: row as ProductExportRow,
      images: imagesByProduct.get(row.id) ?? [],
      skus: skusByProduct.get(row.id) ?? [],
      attributes: attrsByProduct.get(row.id) ?? [],
      tagIds: (tagIdsByProduct.get(row.id) ?? []).filter(Boolean),
    }));
  };

  const handleBatchExport = async () => {
    setBatchLoading(true);
    setActionMessage(null);
    try {
      const bundles = await buildProductExportBundles(selectedIds);
      const pack: ProductImportPackage = {
        version: 1,
        kind: 'shopnova_product_batch',
        exportedAt: new Date().toISOString(),
        products: bundles,
      };
      downloadJson(`shopnova-products-${new Date().toISOString().slice(0, 10)}.json`, pack);
      setActionMessage({ type: 'success', text: `已导出 ${bundles.length} 个商品。` });
    } catch (error) {
      setActionMessage({ type: 'error', text: error instanceof Error ? error.message : '导出商品失败' });
    } finally {
      setBatchLoading(false);
    }
  };

  const handleCsvExport = async () => {
    setBatchLoading(true);
    setActionMessage(null);
    try {
      const bundles = await buildProductExportBundles(selectedIds);
      const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
      const rows = bundles.map((bundle) => {
        const product = bundle.product;
        const imageUrls = bundle.images.length > 0
          ? bundle.images.map((image) => image.image_url)
          : Array.isArray(product.images)
            ? product.images
            : product.image_url
              ? [product.image_url]
              : [];

        return {
          id: product.id,
          name: product.name,
          category_id: product.category_id,
          category_name: categoryNameById.get(product.category_id) ?? '',
          slug: product.slug,
          subtitle: product.subtitle,
          short_description: product.short_description,
          description: product.description,
          detail_description: product.detail_description,
          image_urls: imageUrls.join(' | '),
          price: product.price,
          original_price: product.original_price,
          stock: product.stock,
          rating: product.rating,
          sold_count: product.sold_count,
          review_count: product.review_count,
          status: product.status,
          is_featured: product.is_featured ? 1 : 0,
          is_hot: product.is_hot ? 1 : 0,
          is_new: product.is_new ? 1 : 0,
          is_flash_sale: product.is_flash_sale ? 1 : 0,
          seo_title: product.seo_title,
          seo_description: product.seo_description,
          sort_order: product.sort_order,
        };
      });

      downloadText(`shopnova-products-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${toCsv(rows)}`, 'text/csv;charset=utf-8');
      setActionMessage({ type: 'success', text: `已导出 ${rows.length} 个商品 CSV。` });
    } catch (error) {
      setActionMessage({ type: 'error', text: error instanceof Error ? error.message : '导出 CSV 失败' });
    } finally {
      setBatchLoading(false);
    }
  };

  const importProductBundle = async (bundle: ProductExportBundle) => {
    const product = bundle.product;
    const productId = product.id || `p-${crypto.randomUUID()}`;
    if (!product.category_id) throw new Error(`商品「${product.name}」缺少分类 ID。`);

    const cleanImages = (bundle.images ?? [])
      .map((img, index) => ({
        image_url: String(img.image_url ?? '').trim(),
        alt_text: String(img.alt_text ?? '').trim(),
        sort_order: Number(img.sort_order) || index,
        is_main: index === 0 || Boolean(img.is_main),
      }))
      .filter((img) => img.image_url);

    const mainImg = cleanImages[0]?.image_url ?? String(product.image_url ?? '');
    const imageUrls = cleanImages.length > 0 ? cleanImages.map((img) => img.image_url) : (Array.isArray(product.images) ? product.images : []);

    const payload = {
      id: productId,
      category_id: product.category_id,
      name: String(product.name ?? '').trim(),
      slug: String(product.slug ?? '').trim() || String(product.name ?? '').trim().toLowerCase().replace(/[\s\W]+/g, '-'),
      subtitle: String(product.subtitle ?? ''),
      short_description: String(product.short_description ?? ''),
      description: String(product.description ?? ''),
      detail_description: String(product.detail_description ?? ''),
      image_url: mainImg,
      main_image_url: mainImg,
      images: imageUrls,
      price: Number(product.price) || 0,
      original_price: Number(product.original_price) || Number(product.price) || 0,
      stock: Number(product.stock) || 0,
      rating: Number(product.rating) || 5,
      sold_count: Number(product.sold_count) || 0,
      review_count: Number(product.review_count) || 0,
      status: product.status === 'inactive' ? 'inactive' : 'active',
      is_featured: Boolean(product.is_featured),
      is_hot: Boolean(product.is_hot),
      is_new: Boolean(product.is_new),
      is_flash_sale: Boolean(product.is_flash_sale),
      sku_groups: Array.isArray(product.sku_groups) ? product.sku_groups : [],
      specs: Array.isArray(product.specs) ? product.specs : [],
      highlights: Array.isArray(product.highlights) ? product.highlights : [],
      seo_title: String(product.seo_title ?? ''),
      seo_description: String(product.seo_description ?? ''),
      sort_order: Number(product.sort_order) || 0,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };

    const { error: productError } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
    if (productError) throw new Error(productError.message);

    await supabase.from('product_images').delete().eq('product_id', productId);
    if (cleanImages.length > 0) {
      const { error } = await supabase.from('product_images').insert(
        cleanImages.map((img, index) => ({
          product_id: productId,
          image_url: img.image_url,
          alt_text: img.alt_text || null,
          sort_order: index,
          is_main: index === 0,
        })),
      );
      if (error) throw new Error(error.message);
    }

    await supabase.from('product_skus').update({ deleted_at: new Date().toISOString() }).eq('product_id', productId).is('deleted_at', null);
    if ((bundle.skus ?? []).length > 0) {
      const { error } = await supabase.from('product_skus').insert(
        bundle.skus.map((sku, index) => ({
          product_id: productId,
          sku_code: sku.sku_code || `${productId}-${index}`,
          sku_name: sku.sku_name || '',
          price: Number(sku.price) || 0,
          original_price: Number(sku.original_price) || Number(sku.price) || 0,
          stock: Number(sku.stock) || 0,
          image_url: sku.image_url || null,
          attributes_json: isPlainObject(sku.attributes_json) ? sku.attributes_json : {},
          status: sku.status || 'active',
          sort_order: Number(sku.sort_order) || index,
        })),
      );
      if (error) throw new Error(error.message);
    }

    await supabase.from('product_attributes').delete().eq('product_id', productId);
    if ((bundle.attributes ?? []).length > 0) {
      const { error } = await supabase.from('product_attributes').insert(
        bundle.attributes.map((attr, index) => ({
          product_id: productId,
          name: attr.name || '',
          value: attr.value || '',
          sort_order: Number(attr.sort_order) || index,
        })),
      );
      if (error) throw new Error(error.message);
    }

    await supabase.from('product_tag_relations').delete().eq('product_id', productId);
    const tagIds = Array.from(new Set((bundle.tagIds ?? []).filter(Boolean)));
    if (tagIds.length > 0) {
      const { error } = await supabase.from('product_tag_relations').insert(
        tagIds.map((tag_id) => ({ product_id: productId, tag_id })),
      );
      if (error) throw new Error(error.message);
    }
  };

  const handleBatchImport = async (file: File) => {
    setBatchLoading(true);
    setActionMessage(null);
    try {
      const payload = validateProductImportPackage(JSON.parse(await file.text()) as unknown);
      for (const bundle of payload.products) {
        await importProductBundle(bundle);
      }
      setActionMessage({ type: 'success', text: `导入完成，写入 ${payload.products.length} 个商品。` });
      setSelectedIds([]);
      setPage(0);
      await fetchProducts();
      await fetchStats();
    } catch (error) {
      setActionMessage({ type: 'error', text: error instanceof Error ? error.message : '导入商品失败' });
    } finally {
      setBatchLoading(false);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const handleCsvImport = async (file: File) => {
    setBatchLoading(true);
    setActionMessage(null);
    try {
      const records = csvRowsToRecords(await file.text());
      if (records.length === 0) throw new Error('CSV 没有可导入的商品行。');

      const categoryIdByName = new Map(categories.map((category) => [category.name.trim().toLowerCase(), category.id]));
      for (const [index, record] of records.entries()) {
        const name = (record.name ?? '').trim();
        if (!name) throw new Error(`第 ${index + 2} 行缺少商品名称。`);

        const categoryId = record.category_id || categoryIdByName.get((record.category_name ?? '').trim().toLowerCase()) || '';
        if (!categoryId) throw new Error(`第 ${index + 2} 行缺少分类 ID，或分类名称不存在。`);

        const productId = record.id || `p-${crypto.randomUUID()}`;
        const imageUrls = splitImageUrls(record.image_urls ?? '');
        const slug = record.slug || name.toLowerCase().replace(/[\s\W]+/g, '-');
        const payload = {
          id: productId,
          category_id: categoryId,
          name,
          slug,
          subtitle: record.subtitle ?? '',
          short_description: record.short_description ?? '',
          description: record.description ?? '',
          detail_description: record.detail_description ?? '',
          image_url: imageUrls[0] ?? '',
          main_image_url: imageUrls[0] ?? '',
          images: imageUrls,
          price: Number(record.price) || 0,
          original_price: Number(record.original_price) || Number(record.price) || 0,
          stock: Number(record.stock) || 0,
          rating: Number(record.rating) || 5,
          sold_count: Number(record.sold_count) || 0,
          review_count: Number(record.review_count) || 0,
          status: normalizeProductStatus(record.status),
          is_featured: parseBoolean(record.is_featured),
          is_hot: parseBoolean(record.is_hot),
          is_new: parseBoolean(record.is_new),
          is_flash_sale: parseBoolean(record.is_flash_sale),
          seo_title: record.seo_title ?? '',
          seo_description: record.seo_description ?? '',
          sort_order: Number(record.sort_order) || 0,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
        if (error) throw new Error(`第 ${index + 2} 行导入失败：${error.message}`);

        await supabase.from('product_images').delete().eq('product_id', productId);
        if (imageUrls.length > 0) {
          const { error: imageError } = await supabase.from('product_images').insert(
            imageUrls.map((imageUrl, imageIndex) => ({
              product_id: productId,
              image_url: imageUrl,
              alt_text: name,
              sort_order: imageIndex,
              is_main: imageIndex === 0,
            })),
          );
          if (imageError) throw new Error(`第 ${index + 2} 行图片导入失败：${imageError.message}`);
        }
      }

      setActionMessage({ type: 'success', text: `CSV 导入完成，写入 ${records.length} 个商品。` });
      setSelectedIds([]);
      setPage(0);
      await fetchProducts();
      await fetchStats();
    } catch (error) {
      setActionMessage({ type: 'error', text: error instanceof Error ? error.message : '导入 CSV 失败' });
    } finally {
      setBatchLoading(false);
      if (csvImportFileRef.current) csvImportFileRef.current.value = '';
    }
  };

  const handleBatchDelete = async () => {
    setBatchLoading(true);
    setActionMessage(null);
    try {
      if (selectedIds.length === 0) throw new Error('请先选择要删除的商品。');
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .in('id', selectedIds);
      if (error) throw new Error(error.message);
      setActionMessage({ type: 'success', text: `已删除 ${selectedIds.length} 个商品。` });
      setSelectedIds([]);
      setBatchDeleteConfirm(false);
      await fetchProducts();
      await fetchStats();
    } catch (error) {
      setActionMessage({ type: 'error', text: error instanceof Error ? error.message : '批量删除失败' });
    } finally {
      setBatchLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">商品管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">管理商品信息、上下架状态与分类</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" onMouseLeave={() => setBatchMenuOpen(null)}>
          <input
            ref={importFileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleBatchImport(file);
            }}
          />
          <input
            ref={csvImportFileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleCsvImport(file);
            }}
          />
          <div className="relative">
            <button
              type="button"
              onClick={() => setBatchMenuOpen((open) => (open === 'import' ? null : 'import'))}
              disabled={batchLoading}
              className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-60"
            >
              <Upload size={13} /> 导入 <ChevronDown size={12} />
            </button>
            {batchMenuOpen === 'import' && (
              <div className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setBatchMenuOpen(null);
                    csvImportFileRef.current?.click();
                  }}
                  className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  CSV 表格导入
                  <span className="mt-0.5 block text-[11px] font-normal text-slate-400">日常维护商品</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBatchMenuOpen(null);
                    importFileRef.current?.click();
                  }}
                  className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  JSON 完整导入
                  <span className="mt-0.5 block text-[11px] font-normal text-slate-400">恢复完整备份</span>
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setBatchMenuOpen((open) => (open === 'export' ? null : 'export'))}
              disabled={batchLoading || selectedIds.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <Download size={13} /> 导出 <ChevronDown size={12} />
            </button>
            {batchMenuOpen === 'export' && (
              <div className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setBatchMenuOpen(null);
                    handleCsvExport();
                  }}
                  className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  CSV 表格导出
                  <span className="mt-0.5 block text-[11px] font-normal text-slate-400">给运营编辑</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBatchMenuOpen(null);
                    handleBatchExport();
                  }}
                  className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  JSON 完整导出
                  <span className="mt-0.5 block text-[11px] font-normal text-slate-400">保留规格和 SKU</span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setBatchDeleteConfirm(true)}
            disabled={batchLoading || selectedIds.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={13} /> 批量删除
          </button>
          <button
            onClick={() => { setEditProduct(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 text-xs text-white bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={13} /> 添加商品
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
          actionMessage.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          <AlertCircle size={15} />
          {actionMessage.text}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '商品总数', value: stats.totalAll, sub: '全部商品', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '上架中', value: stats.activeCount, sub: '正常销售中', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '已下架', value: stats.inactiveCount, sub: '暂停销售', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
          { label: '低库存', value: stats.lowStockCount, sub: '需及时补货', icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800">{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
              <div className="text-[10px] text-slate-400">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="搜索商品名称..."
            className="pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-slate-400"
          />
        </div>
        <div className="relative">
          <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(0); }} className="appearance-none pl-3 pr-7 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            <option value="">全部分类</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="appearance-none pl-3 pr-7 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            <option value="">全部状态</option>
            <option value="active">上架</option>
            <option value="inactive">下架</option>
          </select>
          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
          {selectedIds.length > 0 && (
            <button onClick={() => setSelectedIds([])} className="font-semibold text-blue-600 hover:text-blue-700">
              已选 {selectedIds.length} 件，清空
            </button>
          )}
          <span>共 {total} 件</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedOnPageCount > 0 && !allCurrentPageSelected;
                    }}
                    onChange={toggleCurrentPageSelected}
                    className="rounded border-slate-300 text-blue-600"
                    aria-label="选择当前页商品"
                  />
                </th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">排序</th>
                {['商品', '分类', '价格', '原价', '库存', '评分', '已售', '评价', '标签', '状态', '标记', '操作'].map((c) => (
                  <th key={c} className="text-left px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {[...Array(14)].map((_, j) => (
                      <td key={j} className="px-3 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-slate-400">
                    <Package size={28} className="mx-auto mb-2 text-slate-200" />
                    没有找到商品
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelected(p.id)}
                        className="rounded border-slate-300 text-blue-600"
                        aria-label={`选择 ${p.name}`}
                      />
                    </td>
                    <td className="px-3 py-3 text-slate-500 font-mono">{p.sort_order}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-slate-100 flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Package size={14} className="text-slate-300" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-800 whitespace-nowrap max-w-[160px] truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">{p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full border border-blue-100 whitespace-nowrap">
                        {p.product_categories?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-800">${Number(p.price).toFixed(2)}</td>
                    <td className="px-3 py-3 text-slate-400 line-through">${Number(p.original_price).toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <span className={`font-semibold ${p.stock === 0 ? 'text-red-600' : p.stock < 20 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Star size={11} className="text-amber-400 fill-amber-400" />
                        <span className="font-semibold text-slate-700">{p.rating}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{p.sold_count.toLocaleString()}</td>
                    <td className="px-3 py-3 text-slate-600">{p.review_count.toLocaleString()}</td>
                    <td className="px-3 py-3">
                      {(p.product_tag_relations ?? []).length > 0 ? (
                        <div className="flex max-w-[160px] flex-wrap gap-1">
                          {(p.product_tag_relations ?? []).map((relation) => relation.product_tags).filter(Boolean).slice(0, 3).map((tag) => (
                            <span
                              key={tag!.id}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: tag!.color || '#3b82f6' }}
                            >
                              {tag!.name}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-full border flex items-center gap-1 transition-all ${
                          p.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {p.status === 'active' ? <Eye size={10} /> : <EyeOff size={10} />}
                        {p.status === 'active' ? '上架' : '下架'}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        {p.is_featured && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">精选</span>}
                        {p.is_hot && <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100">热卖</span>}
                        {p.is_new && <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">新品</span>}
                        {p.is_flash_sale && <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">特卖</span>}
                        {!p.is_featured && !p.is_hot && !p.is_new && !p.is_flash_sale && <span>—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditProduct(p); setModalOpen(true); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => setDeleteConfirm(p.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              第 {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} 条，共 {total} 条
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <ChevronLeft size={13} />
              </button>
              {[...Array(Math.min(totalPages, 7))].map((_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${i === page ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <ProductFormModal
          product={editProduct}
          categories={categories}
          allTags={allTags}
          onSave={() => { fetchProducts(); fetchStats(); }}
          onClose={() => { setModalOpen(false); setEditProduct(null); }}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">确认删除商品？</h3>
            <p className="text-sm text-slate-500 text-center mb-6">此操作为软删除，商品数据不会丢失</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                取消
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors">
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {batchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">确认批量删除？</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              将软删除已选的 {selectedIds.length} 个商品，前台不会继续展示。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBatchDeleteConfirm(false)}
                disabled={batchLoading}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                取消
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={batchLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {batchLoading ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
