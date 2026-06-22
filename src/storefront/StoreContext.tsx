import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Product } from './types';

export type PageType =
  | { type: 'home' }
  | { type: 'listing'; categoryId?: string; categoryName?: string; title?: string; filter?: 'flashSale' }
  | { type: 'product'; productId: string }
  | { type: 'cart' }
  | { type: 'order-lookup' }
  | { type: 'return-policy' }
  | { type: 'logistics' }
  | { type: 'faq' }
  | { type: 'brand-story' }
  | { type: 'contact-us' }
  | { type: 'careers' }
  | { type: 'media-cooperation' }
  | { type: 'privacy' }
  | { type: 'terms' }
  | { type: 'cookies' }
  | { type: 'payment-security' }
  | { type: 'checkout' }
  | { type: 'order-success'; orderId: string; orderNumber: string }
  | { type: 'login' }
  | { type: 'register' }
  | { type: 'account' }
  | { type: 'account-orders' }
  | { type: 'admin-login' };

export interface CartItem {
  product: Product;
  qty: number;
  selectedSKUs: Record<string, string>;
  effectivePrice: number;
  skuId?: string;
  skuName?: string;
  skuAttributesJson?: Record<string, string>;
  productImage?: string;
}

export interface AddToCartOptions {
  skuId?: string;
  skuName?: string;
  skuAttributesJson?: Record<string, string>;
  productImage?: string;
}

interface StoreState {
  page: PageType;
  navigate: (page: PageType) => void;
  cart: CartItem[];
  addToCart: (product: Product, selectedSKUs: Record<string, string>, effectivePrice: number, options?: AddToCartOptions) => void;
  removeFromCart: (productId: string, selectedSKUs: Record<string, string>) => void;
  updateQty: (productId: string, selectedSKUs: Record<string, string>, qty: number) => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
}

const StoreContext = createContext<StoreState | null>(null);

function skuKey(selectedSKUs: Record<string, string>) {
  return Object.entries(selectedSKUs).sort().map(([k, v]) => `${k}:${v}`).join('|');
}

export function StoreProvider({ children, initialPage }: { children: ReactNode; initialPage?: PageType }) {
  const [page, setPage] = useState<PageType>(initialPage ?? { type: 'home' });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);

  const navigate = useCallback((p: PageType) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const addToCart = useCallback((product: Product, selectedSKUs: Record<string, string>, effectivePrice: number, options?: AddToCartOptions) => {
    const key = skuKey(selectedSKUs);
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id && skuKey(item.selectedSKUs) === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, {
        product, qty: 1, selectedSKUs, effectivePrice,
        skuId: options?.skuId,
        skuName: options?.skuName,
        skuAttributesJson: options?.skuAttributesJson,
        productImage: options?.productImage,
      }];
    });
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((productId: string, selectedSKUs: Record<string, string>) => {
    const key = skuKey(selectedSKUs);
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && skuKey(item.selectedSKUs) === key)));
  }, []);

  const updateQty = useCallback((productId: string, selectedSKUs: Record<string, string>, qty: number) => {
    const key = skuKey(selectedSKUs);
    setCart((prev) => {
      if (qty <= 0) return prev.filter((item) => !(item.product.id === productId && skuKey(item.selectedSKUs) === key));
      return prev.map((item) =>
        item.product.id === productId && skuKey(item.selectedSKUs) === key ? { ...item, qty } : item
      );
    });
  }, []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

  return (
    <StoreContext.Provider value={{ page, navigate, cart, addToCart, removeFromCart, updateQty, cartOpen, setCartOpen, wishlist, toggleWishlist }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
