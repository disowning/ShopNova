import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, ChevronDown, Package, TrendingUp, TrendingDown, Star,
  X, Save, AlertCircle, ChevronLeft, ChevronRight, Eye, EyeOff, Image, Tag, Layers,
  Settings2, FileText, BarChart2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  status: 'active' | 'inactive';
  is_featured: boolean;
  is_hot: boolean;
  is_new: boolean;
  is_flash_sale: boolean;
  tag: string | null;
  seo_title: string;
  seo_description: string;
  sort_order: number;
  created_at: string;
  product_categories: { name: string } | null;
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

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all';
const PAGE_SIZE = 10;

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

// ─── 7-Tab Product Form Modal ──────────────────────────────────────────────────

const TABS = [
  { id: 'basic', label: '基本信息', icon: FileText },
  { id: 'images', label: '图片管理', icon: Image },
  { id: 'price', label: '价格库存', icon: BarChart2 },
  { id: 'skus', label: 'SKU管理', icon: Layers },
  { id: 'attrs', label: '规格参数', icon: Settings2 },
  { id: 'tags', label: '标签', icon: Tag },
  { id: 'seo', label: 'SEO', icon: Search },
] as const;

type TabId = typeof TABS[number]['id'];

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
    tag: product?.tag ?? '',
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

  // Price
  const [price, setPrice] = useState({
    price: String(product?.price ?? ''),
    original_price: String(product?.original_price ?? ''),
    stock: String(product?.stock ?? ''),
    rating: String(product?.rating ?? '5.0'),
    sold_count: String(product?.sold_count ?? '0'),
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
  }, [activeTab, isEdit, product, imagesLoaded, skusLoaded, attrsLoaded, tagsLoaded]);

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
      tag: basic.tag.trim() || null,
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

    onSave();
    onClose();
  };

  return (
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
                <Field label="商品标签">
                  <select value={basic.tag} onChange={(e) => setBasic((p) => ({ ...p, tag: e.target.value }))} className={inputCls}>
                    <option value="">无标签</option>
                    <option value="热卖">热卖</option>
                    <option value="新品">新品</option>
                    <option value="限时折扣">限时折扣</option>
                  </select>
                </Field>
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
            <div className="space-y-3">
              <p className="text-xs text-slate-400">第一张图片为主图。每行填写一个图片 URL。</p>
              {images.map((img, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg border border-slate-100 overflow-hidden flex-shrink-0 bg-slate-50">
                    {img.image_url && <img src={img.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                  </div>
                  <input
                    value={img.image_url}
                    onChange={(e) => setImages((prev) => prev.map((x, j) => j === i ? { ...x, image_url: e.target.value } : x))}
                    className={`${inputCls} flex-1`}
                    placeholder="图片 URL"
                  />
                  <input
                    value={img.alt_text}
                    onChange={(e) => setImages((prev) => prev.map((x, j) => j === i ? { ...x, alt_text: e.target.value } : x))}
                    className={`${inputCls} w-32`}
                    placeholder="Alt 文字"
                  />
                  <button onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400">
                    <X size={13} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setImages((prev) => [...prev, { image_url: '', alt_text: '', sort_order: prev.length, is_main: prev.length === 0 }])}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold py-2"
              >
                <Plus size={13} /> 添加图片
              </button>
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
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Stats { totalAll: number; activeCount: number; inactiveCount: number; lowStockCount: number; }

export default function ProductManagement() {
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
      .select('id, category_id, name, slug, short_description, subtitle, description, detail_description, image_url, main_image_url, price, original_price, stock, rating, sold_count, status, is_featured, is_hot, is_new, is_flash_sale, tag, seo_title, seo_description, sort_order, created_at, product_categories(name)', { count: 'exact' })
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
    fetchProducts();
    fetchStats();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">商品管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">管理商品信息、上下架状态与分类</p>
        </div>
        <button
          onClick={() => { setEditProduct(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 text-xs text-white bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={13} /> 添加商品
        </button>
      </div>

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
        <span className="ml-auto text-xs text-slate-400">共 {total} 件</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">排序</th>
                {['商品', '分类', '价格', '原价', '库存', '评分', '已售', '标签', '状态', '标记', '操作'].map((c) => (
                  <th key={c} className="text-left px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {[...Array(12)].map((_, j) => (
                      <td key={j} className="px-3 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-slate-400">
                    <Package size={28} className="mx-auto mb-2 text-slate-200" />
                    没有找到商品
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
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
                    <td className="px-3 py-3 font-bold text-slate-800">¥{Number(p.price).toFixed(2)}</td>
                    <td className="px-3 py-3 text-slate-400 line-through">¥{Number(p.original_price).toFixed(2)}</td>
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
                    <td className="px-3 py-3">
                      {p.tag ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.tag === '热卖' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                          p.tag === '新品' ? 'bg-violet-50 text-violet-600 border border-violet-200' :
                          'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}>{p.tag}</span>
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
    </div>
  );
}
