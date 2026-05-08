export interface SKU {
  id: string;
  label: string;
  stock: number;
  priceModifier?: number;
}

export interface SKUGroup {
  name: string;
  options: SKU[];
}

export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  originalPrice: number;
  stock?: number;
  rating: number;
  reviewCount: number;
  sold: number;
  badge: string | null;
  isFlashSale?: boolean;
  images: string[];
  category: string;
  categoryId: string;
  skuGroups: SKUGroup[];
  specs: { label: string; value: string }[];
  highlights: string[];
}

export interface Category {
  id: string;
  name: string;
  count: number;
  icon: string;
  gradient: string;
}
