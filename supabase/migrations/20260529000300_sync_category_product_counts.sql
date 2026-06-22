/*
  # Sync category product counts

  Keeps product_categories.count aligned with active, non-deleted products.
*/

CREATE OR REPLACE FUNCTION public.rebuild_product_category_counts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE product_categories AS category
  SET
    count = COALESCE(stats.product_count, 0),
    updated_at = now()
  FROM (
    SELECT
      c.id,
      COUNT(p.id)::int AS product_count
    FROM product_categories AS c
    LEFT JOIN products AS p
      ON p.category_id = c.id
      AND p.status = 'active'
      AND p.deleted_at IS NULL
    GROUP BY c.id
  ) AS stats
  WHERE category.id = stats.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_product_category_count_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.rebuild_product_category_counts();
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_category_counts ON products;

CREATE TRIGGER trg_sync_product_category_counts
AFTER INSERT OR UPDATE OF category_id, status, deleted_at OR DELETE
ON products
FOR EACH STATEMENT
EXECUTE FUNCTION public.handle_product_category_count_change();

SELECT public.rebuild_product_category_counts();
