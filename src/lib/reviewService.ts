import { supabase } from './supabase';

export interface ProductReview {
  id: string;
  productId: string;
  productName?: string;
  customerName: string;
  avatarText: string;
  avatarColor: string;
  rating: number;
  title: string;
  content: string;
  reviewDate: string;
  isFeatured: boolean;
}

interface ProductReviewRow {
  id: string;
  product_id: string;
  customer_name: string;
  avatar_text: string;
  avatar_color: string;
  rating: number;
  title: string;
  content: string;
  review_date: string;
  is_featured: boolean;
  products?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

function toProductReview(row: ProductReviewRow): ProductReview {
  return {
    id: row.id,
    productId: row.product_id,
    productName: (Array.isArray(row.products) ? row.products[0]?.name : row.products?.name) ?? undefined,
    customerName: row.customer_name,
    avatarText: row.avatar_text || row.customer_name.slice(0, 1).toUpperCase(),
    avatarColor: row.avatar_color || 'from-blue-500 to-cyan-500',
    rating: Number(row.rating),
    title: row.title,
    content: row.content,
    reviewDate: row.review_date,
    isFeatured: Boolean(row.is_featured),
  };
}

export async function fetchProductReviews(productId: string, limit = 12): Promise<ProductReview[]> {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('id, product_id, customer_name, avatar_text, avatar_color, rating, title, content, review_date, is_featured')
    .eq('product_id', productId)
    .eq('status', 'active')
    .order('is_featured', { ascending: false })
    .order('sort_order')
    .order('review_date', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as ProductReviewRow[]).map(toProductReview);
}

export async function fetchFeaturedProductReviews(limit = 3): Promise<ProductReview[]> {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('id, product_id, customer_name, avatar_text, avatar_color, rating, title, content, review_date, is_featured, products(name)')
    .eq('status', 'active')
    .eq('is_featured', true)
    .order('sort_order')
    .order('review_date', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as unknown as ProductReviewRow[]).map(toProductReview);
}
