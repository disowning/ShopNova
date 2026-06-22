import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Heart, ShoppingCart, Star, Check, Share2, Shield, Truck, RefreshCw, ChevronRight, Minus, Plus } from 'lucide-react';
import { fetchProductById, fetchProductsByCategory, fetchProductImages, fetchProductSKUs, fetchProductAttributes, type DBProductSKU, type DBProductImage, type DBProductAttribute } from '../lib/productService';
import type { Product } from './types';
import { useStore } from './StoreContext';
import ProductCard from './ProductCard';
import { useT } from '../i18n';
import { getCategoryName } from './categoryLabels';
import { fetchTranslationLookup, type TranslationSourceMap } from '../lib/translationService';
import { useSiteSettings } from './SiteSettingsContext';
import { fetchProductReviews, type ProductReview } from '../lib/reviewService';

type DisplaySKUOption = {
  value: string;
  label: string;
};

type DisplaySKUGroup = {
  name: string;
  label: string;
  options: DisplaySKUOption[];
};

function ProductReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={13}
          className={i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
        />
      ))}
    </div>
  );
}

function buildProductDetailSourceMap(
  product: Product,
  attrs: DBProductAttribute[],
  skus: DBProductSKU[],
): TranslationSourceMap {
  const fields: Record<string, string> = {};

  product.highlights.forEach((highlight, index) => {
    fields[`highlight:${index}`] = highlight;
  });

  product.specs.forEach((spec, index) => {
    fields[`spec:${index}:label`] = spec.label;
    fields[`spec:${index}:value`] = spec.value;
  });

  product.skuGroups.forEach((group) => {
    fields[`sku_key:${group.name}`] = group.name;
    group.options.forEach((option) => {
      fields[`sku_value:${group.name}:${option.label}`] = option.label;
    });
  });

  attrs.forEach((attr) => {
    fields[`attribute:${attr.id}:name`] = attr.name;
    fields[`attribute:${attr.id}:value`] = attr.value;
  });

  skus.forEach((sku) => {
    Object.entries(sku.attributes_json ?? {}).forEach(([key, value]) => {
      fields[`sku_key:${key}`] = key;
      fields[`sku_value:${key}:${value}`] = value;
    });
  });

  return { [product.id]: fields };
}

export default function ProductDetail({ productId }: { productId: string }) {
  const { t, locale } = useT();
  const { navigate, addToCart, setCartOpen, wishlist, toggleWishlist } = useStore();
  const { text, storeSwitches } = useSiteSettings();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // New table data
  const [dbImages, setDbImages] = useState<DBProductImage[]>([]);
  const [dbSkus, setDbSkus] = useState<DBProductSKU[]>([]);
  const [dbAttrs, setDbAttrs] = useState<DBProductAttribute[]>([]);
  const [productReviews, setProductReviews] = useState<ProductReview[]>([]);
  const [productTranslations, setProductTranslations] = useState<Record<string, string>>({});

  const [activeImg, setActiveImg] = useState(0);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<'highlights' | 'specs'>('highlights');

  useEffect(() => {
    setLoading(true);
    setActiveImg(0);
    setSelectedAttrs({});
    setProductTranslations({});
    setQty(1);

    Promise.all([
      fetchProductById(productId, locale),
      fetchProductImages(productId),
      fetchProductSKUs(productId),
      fetchProductAttributes(productId),
      fetchProductReviews(productId),
    ]).then(async ([p, imgs, skus, attrs, reviews]) => {
      const translations = p
        ? await fetchTranslationLookup('product', locale, [productId], buildProductDetailSourceMap(p, attrs, skus))
        : {};

      setProduct(p);
      setDbImages(imgs);
      setDbSkus(skus);
      setDbAttrs(attrs);
      setProductReviews(reviews);
      setProductTranslations(translations[productId] ?? {});

      if (p) {
        fetchProductsByCategory(p.categoryId, locale).then((all) => {
          setRelatedProducts(all.filter((r) => r.id !== productId).slice(0, 4));
        });
      }
      setLoading(false);
    });
  }, [productId, locale]);

  // Derive images: prefer product_images table, fallback to product.images
  const images = useMemo(() => {
    if (dbImages.length > 0) return dbImages.map((img) => img.image_url);
    return product?.images ?? [];
  }, [dbImages, product]);

  // Derive specs: prefer product_attributes table, fallback to product.specs
  const specs = useMemo(() => {
    if (dbAttrs.length > 0) {
      return dbAttrs.map((a) => ({
        label: productTranslations[`attribute:${a.id}:name`] ?? a.name,
        value: productTranslations[`attribute:${a.id}:value`] ?? a.value,
      }));
    }

    return product?.specs.map((spec, index) => ({
      label: productTranslations[`spec:${index}:label`] ?? spec.label,
      value: productTranslations[`spec:${index}:value`] ?? spec.value,
    })) ?? [];
  }, [dbAttrs, product, productTranslations]);

  const translatedHighlights = useMemo(() => {
    return product?.highlights.map((highlight, index) => (
      productTranslations[`highlight:${index}`] ?? highlight
    )) ?? [];
  }, [product, productTranslations]);

  // SKU grouping: extract attribute keys and their unique values from product_skus
  const skuGroups = useMemo<DisplaySKUGroup[] | null>(() => {
    if (dbSkus.length === 0) return null;
    const keyMap = new Map<string, Set<string>>();
    dbSkus.forEach((sku) => {
      Object.entries(sku.attributes_json ?? {}).forEach(([k, v]) => {
        if (!keyMap.has(k)) keyMap.set(k, new Set());
        keyMap.get(k)!.add(v);
      });
    });
    return Array.from(keyMap.entries()).map(([name, values]) => ({
      name,
      label: productTranslations[`sku_key:${name}`] ?? name,
      options: Array.from(values).map((value) => ({
        value,
        label: productTranslations[`sku_value:${name}:${value}`] ?? value,
      })),
    }));
  }, [dbSkus, productTranslations]);

  const legacySkuGroups = useMemo(() => {
    return product?.skuGroups.map((group) => ({
      ...group,
      label: productTranslations[`sku_key:${group.name}`] ?? group.name,
      options: group.options.map((option) => ({
        ...option,
        displayLabel: productTranslations[`sku_value:${group.name}:${option.label}`] ?? option.label,
      })),
    })) ?? [];
  }, [product, productTranslations]);

  // Auto-select first option for each group on load
  useEffect(() => {
    if (!skuGroups || skuGroups.length === 0) return;
    const defaults: Record<string, string> = {};
    skuGroups.forEach((g) => {
      const firstOption = g.options[0];
      if (firstOption) defaults[g.name] = firstOption.value;
    });
    setSelectedAttrs(defaults);
  }, [skuGroups]);

  // Legacy fallback: init old-style selectedSKUs for products without new SKUs
  useEffect(() => {
    if (product && dbSkus.length === 0 && product.skuGroups.length > 0) {
      const defaults: Record<string, string> = {};
      product.skuGroups.forEach((g) => { defaults[g.name] = g.options[0].id; });
      setSelectedAttrs(defaults);
    }
  }, [product, dbSkus]);

  // Match selected attrs to a specific SKU
  const matchedSKU = useMemo(() => {
    if (dbSkus.length === 0) return null;
    return dbSkus.find((sku) => {
      const attrs = sku.attributes_json ?? {};
      return Object.entries(selectedAttrs).every(([k, v]) => attrs[k] === v);
    }) ?? null;
  }, [dbSkus, selectedAttrs]);

  if (loading) {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-2 gap-10 animate-pulse">
          <div className="aspect-square bg-slate-100 rounded-2xl" />
          <div className="space-y-4 pt-4">
            <div className="h-8 bg-slate-100 rounded w-3/4" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
            <div className="h-10 bg-slate-100 rounded w-1/3 mt-6" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
        <div className="text-5xl mb-4">🔍</div>
        <div className="text-lg font-semibold mb-2">{t('product.notFound')}</div>
        <button onClick={() => navigate({ type: 'home' })} className="text-blue-600 hover:underline text-sm">{t('common.backToHome')}</button>
      </div>
    );
  }

  // Price logic: new SKU mode vs legacy mode
  const hasNewSKUs = dbSkus.length > 0;
  const selectedSkuParts = hasNewSKUs
    ? Object.entries(selectedAttrs)
        .map(([key, value]) => dbSkus.find((sku) => (sku.attributes_json ?? {})[key] === value))
        .filter((sku): sku is DBProductSKU => Boolean(sku))
    : [];
  let effectivePrice: number;
  let effectiveOriginalPrice: number;
  let effectiveStock: number;
  let skuImage: string | null = null;

  if (hasNewSKUs && matchedSKU) {
    effectivePrice = Number(matchedSKU.price);
    effectiveOriginalPrice = Number(matchedSKU.original_price) || effectivePrice;
    effectiveStock = matchedSKU.stock;
    skuImage = matchedSKU.image_url ?? null;
  } else if (hasNewSKUs && !matchedSKU) {
    // Some seeded/admin SKU data stores one row per selected attribute instead of
    // a full variant combination. In that case, fall back to product-level stock
    // while still respecting any matched attribute-row stock and price modifiers.
    const basePrice = Number(product.price);
    const priceDelta = selectedSkuParts.reduce((sum, sku) => {
      return sum + Math.max(0, Number(sku.price) - basePrice);
    }, 0);
    const stockValues = selectedSkuParts.map((sku) => Number(sku.stock));

    effectivePrice = basePrice + priceDelta;
    effectiveOriginalPrice = Number(product.originalPrice) + priceDelta;
    effectiveStock = stockValues.length > 0
      ? Math.min(...stockValues)
      : Number(product.stock ?? 0);
  } else {
    // Legacy mode: use old skuGroups priceModifier
    const priceModifier = product.skuGroups.flatMap((g) =>
      g.options.filter((o) => selectedAttrs[g.name] === o.id).map((o) => o.priceModifier ?? 0)
    ).reduce((a, b) => a + b, 0);
    effectivePrice = product.price + priceModifier;
    effectiveOriginalPrice = product.originalPrice;
    effectiveStock = 999;
  }

  const discount = effectiveOriginalPrice > effectivePrice
    ? Math.round((1 - effectivePrice / effectiveOriginalPrice) * 100)
    : 0;
  const currencySymbol = text('currencySymbol');
  const isWished = wishlist.includes(product.id);
  const isOutOfStock = effectiveStock <= 0;

  const addCurrentSelectionToCart = () => {
    if (isOutOfStock) return;

    if (hasNewSKUs && matchedSKU) {
      const skuLabels = Object.entries(matchedSKU.attributes_json ?? {}).map(([key, value]) => (
        productTranslations[`sku_value:${key}:${value}`] ?? value
      ));
      const selectedSKUs = matchedSKU.attributes_json ?? {};
      for (let i = 0; i < qty; i++) {
        addToCart(product, selectedSKUs, effectivePrice, {
          skuId: matchedSKU.id,
          skuName: matchedSKU.sku_name || skuLabels.join(' / '),
          skuAttributesJson: matchedSKU.attributes_json,
          productImage: skuImage || images[0] || product.images[0],
        });
      }
    } else if (hasNewSKUs) {
      const selectedSKUs = { ...selectedAttrs };
      const skuName = Object.entries(selectedSKUs).map(([key, value]) => (
        productTranslations[`sku_value:${key}:${value}`] ?? value
      )).join(' / ');
      for (let i = 0; i < qty; i++) {
        addToCart(product, selectedSKUs, effectivePrice, {
          skuName,
          skuAttributesJson: selectedSKUs,
          productImage: images[0] || product.images[0],
        });
      }
    } else {
      // Legacy mode
      const skuLabels: Record<string, string> = {};
      product.skuGroups.forEach((g) => {
        const opt = g.options.find((o) => o.id === selectedAttrs[g.name]);
        if (opt) {
          const groupLabel = productTranslations[`sku_key:${g.name}`] ?? g.name;
          const optionLabel = productTranslations[`sku_value:${g.name}:${opt.label}`] ?? opt.label;
          skuLabels[groupLabel] = optionLabel;
        }
      });
      for (let i = 0; i < qty; i++) addToCart(product, skuLabels, effectivePrice);
    }
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    addCurrentSelectionToCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;

    addCurrentSelectionToCart();
    setCartOpen(false);
    navigate({ type: 'checkout' });
  };

  // If SKU has an image, show it as the active image
  const displayImages = images;
  const currentImg = skuImage || displayImages[activeImg] || product.images[0];
  const categoryName = getCategoryName(t, product.categoryId, product.category);
  const visibleTags = product.tags.slice(0, 3);

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-2 text-xs text-slate-400">
        <button onClick={() => navigate({ type: 'home' })} className="hover:text-blue-600 transition-colors">{t('common.home')}</button>
        <ChevronRight size={12} />
        <button
          onClick={() => navigate({ type: 'listing', categoryId: product.categoryId, categoryName })}
          className="hover:text-blue-600 transition-colors"
        >
          {categoryName}
        </button>
        <ChevronRight size={12} />
        <span className="text-slate-600 font-medium truncate max-w-xs">{product.name}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        {/* Back button */}
        <button
          onClick={() => navigate({ type: 'listing', categoryId: product.categoryId, categoryName })}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          {t('product.backTo', { name: categoryName })}
        </button>

        <div className="grid lg:grid-cols-2 gap-10 xl:gap-16">
          {/* ── Gallery ── */}
          <div className="space-y-3">
            {/* Main image */}
            <div className="relative aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 group">
              <img
                src={currentImg}
                alt={product.name}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              {visibleTags.length > 0 && (
                <div className="absolute top-4 left-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-1.5">
                  {visibleTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="text-xs font-bold px-3 py-1 rounded-full text-white shadow"
                      style={{ backgroundColor: tag.color || '#3b82f6' }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
              {displayImages.length > 1 && !skuImage && (
                <>
                  <button
                    onClick={() => setActiveImg((i) => (i - 1 + displayImages.length) % displayImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  >
                    <ChevronLeft size={16} className="text-slate-700" />
                  </button>
                  <button
                    onClick={() => setActiveImg((i) => (i + 1) % displayImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  >
                    <ChevronRight size={16} className="text-slate-700" />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {displayImages.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {displayImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveImg(i); }}
                    className={`relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                      activeImg === i && !skuImage ? 'border-blue-600 shadow-md shadow-blue-100' : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div className="flex flex-col gap-5">
            {/* Title + wishlist */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl font-black text-slate-900 leading-snug">{product.name}</h1>
                <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                      isWished
                        ? 'bg-rose-50 border-rose-200 text-rose-500'
                        : 'border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-500 hover:bg-rose-50'
                    }`}
                  >
                    <Heart size={16} className={isWished ? 'fill-rose-500' : ''} />
                  </button>
                  <button className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-all">
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-1.5">{product.tagline}</p>
            </div>

            {/* Rating */}
            {(storeSwitches.showReviews || storeSwitches.showSalesCount) && (
              <div className="flex items-center gap-3">
                {storeSwitches.showReviews && (
                  <>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < Math.floor(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-slate-800">{product.rating}</span>
                    <span className="text-sm text-slate-400">{t('common.reviews', { count: product.reviewCount.toLocaleString() })}</span>
                  </>
                )}
                {storeSwitches.showReviews && storeSwitches.showSalesCount && <span className="text-sm text-slate-400">·</span>}
                {storeSwitches.showSalesCount && (
                  <span className="text-sm text-slate-400">{t('common.soldCount', { count: product.sold.toLocaleString() })}</span>
                )}
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 bg-slate-50 rounded-xl px-4 py-3">
              <span className="text-3xl font-black text-slate-900">{currencySymbol}{effectivePrice}</span>
              {discount > 0 && (
                <>
                  <span className="text-base text-slate-400 line-through">{currencySymbol}{effectiveOriginalPrice}</span>
                  <span className="text-sm font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">-{discount}%</span>
                </>
              )}
              {hasNewSKUs && matchedSKU && (
                <span className="text-xs text-slate-400 ml-auto">{t('common.stock', { count: effectiveStock })}</span>
              )}
            </div>

            {/* SKU selectors — New mode (from product_skus) */}
            {hasNewSKUs && skuGroups && skuGroups.map((group) => (
              <div key={group.name}>
                <div className="text-sm font-bold text-slate-700 mb-2">
                  {group.label}:
                  <span className="font-normal text-blue-600 ml-1">
                    {group.options.find((option) => option.value === selectedAttrs[group.name])?.label ?? selectedAttrs[group.name]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((option) => {
                    const isSelected = selectedAttrs[group.name] === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setSelectedAttrs((prev) => ({ ...prev, [group.name]: option.value }))}
                        className={`relative px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {option.label}
                        {isSelected && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                            <Check size={9} className="text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* SKU selectors — Legacy mode (from product.skuGroups) */}
            {!hasNewSKUs && legacySkuGroups.map((group) => (
              <div key={group.name}>
                <div className="text-sm font-bold text-slate-700 mb-2">
                  {group.label}:
                  <span className="font-normal text-blue-600 ml-1">
                    {group.options.find((o) => o.id === selectedAttrs[group.name])?.displayLabel}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((option) => {
                    const isSelected = selectedAttrs[group.name] === option.id;
                    const isOOS = option.stock === 0;
                    return (
                      <button
                        key={option.id}
                        disabled={isOOS}
                        onClick={() => setSelectedAttrs((prev) => ({ ...prev, [group.name]: option.id }))}
                        className={`relative px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                          isOOS
                            ? 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed line-through'
                            : isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {option.displayLabel}
                        {isSelected && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                            <Check size={9} className="text-white" />
                          </span>
                        )}
                        {option.priceModifier && option.priceModifier > 0 && !isOOS && (
                          <span className="ml-1 text-xs text-slate-400">+{currencySymbol}{option.priceModifier}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quantity */}
            <div>
              <div className="text-sm font-bold text-slate-700 mb-2">{t('common.quantity')}</div>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-12 text-center text-sm font-bold text-slate-900">{qty}</span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {hasNewSKUs && matchedSKU && (
                  <span className="text-xs text-slate-400">
                    {effectiveStock > 0 ? t('common.stock', { count: effectiveStock }) : t('common.outOfStock')}
                  </span>
                )}
                {!hasNewSKUs && <span className="text-xs text-slate-400">{t('common.inStock')}</span>}
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.99] ${
                  isOutOfStock
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : added
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-900 hover:bg-blue-600 text-white shadow-lg'
                }`}
              >
                {added ? <Check size={16} /> : <ShoppingCart size={16} />}
                {isOutOfStock ? t('common.outOfStock') : added ? t('common.addedToCart') : t('common.addToCart')}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.99] ${
                  isOutOfStock
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white shadow-lg shadow-blue-200'
                }`}
              >
                {t('common.buyNow')}
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { icon: Shield, text: t('product.guarantee'), sub: t('product.guaranteeDesc') },
                { icon: Truck, text: t('product.fastShip'), sub: t('product.fastShipDesc') },
                { icon: RefreshCw, text: t('product.returnPolicy'), sub: t('product.returnPolicyDesc') },
              ].map((b) => (
                <div key={b.text} className="flex flex-col items-center gap-1 bg-slate-50 rounded-xl py-2.5 px-2">
                  <b.icon size={15} className="text-blue-600" />
                  <span className="text-xs font-semibold text-slate-700">{b.text}</span>
                  <span className="text-[10px] text-slate-400">{b.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tabs: Highlights / Specs ── */}
        <div className="mt-12 border-t border-slate-100 pt-10">
          <div className="flex gap-1 mb-6 border-b border-slate-100">
            {(['highlights', 'specs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors -mb-px border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-700 bg-blue-50'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'highlights' ? t('product.highlights') : t('product.specs')}
              </button>
            ))}
          </div>

          {activeTab === 'highlights' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {translatedHighlights.map((h, i) => (
                <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl p-4">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={12} className="text-white" />
                  </div>
                  <span className="text-sm text-slate-700">{h}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="grid sm:grid-cols-2 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
              {specs.map((spec, i) => (
                <div key={i} className={`flex items-start gap-4 bg-white px-5 py-3.5 ${i === specs.length - 1 && specs.length % 2 !== 0 ? 'sm:col-span-2' : ''}`}>
                  <span className="text-sm text-slate-400 w-28 flex-shrink-0">{spec.label}</span>
                  <span className="text-sm font-semibold text-slate-800">{spec.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="mt-8 bg-slate-50 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-2">{t('product.description')}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
        </div>

        {storeSwitches.showReviews && productReviews.length > 0 && (
          <div className="mt-8 rounded-2xl border border-slate-100 bg-white p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">{t('review.title')}</h3>
                <p className="mt-1 text-sm text-slate-500">{t('common.reviews', { count: productReviews.length })}</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2">
                <ProductReviewStars rating={product.rating} />
                <span className="text-sm font-black text-amber-700">{product.rating.toFixed(1)}</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {productReviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${review.avatarColor} text-xs font-black text-white`}>
                        {review.avatarText}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">{review.customerName}</div>
                        <div className="text-[11px] text-slate-400">{review.reviewDate}</div>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <ProductReviewStars rating={review.rating} />
                      <span className="text-xs font-bold text-slate-700">{review.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  {review.title && <div className="mb-1.5 text-sm font-bold text-slate-800">{review.title}</div>}
                  <p className="text-sm leading-relaxed text-slate-600">{review.content}</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    <Check size={11} />
                    {t('review.verified')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related */}
        {relatedProducts.length > 0 && (
          <div className="mt-14">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900">{t('product.related')}</h3>
              <button
                onClick={() => navigate({ type: 'listing', categoryId: product.categoryId, categoryName })}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                {t('product.viewMore')} →
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
