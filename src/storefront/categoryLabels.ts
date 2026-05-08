type Translate = (key: string, params?: Record<string, string | number>) => string;

export function getCategoryName(t: Translate, categoryId?: string, fallback = '') {
  if (fallback) return fallback;
  if (!categoryId) return fallback;
  const key = `categories.${categoryId}`;
  const translated = t(key);
  return translated === key ? fallback : translated;
}
