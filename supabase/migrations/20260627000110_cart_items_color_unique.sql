-- 기존 unique(user_id, product_id) 제약 제거
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;

-- 색상 없는 상품: (user_id, product_id) 당 1행 (selected_color IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_unique_no_color
  ON cart_items (user_id, product_id)
  WHERE selected_color IS NULL;

-- 색상 있는 상품: (user_id, product_id, selected_color) 당 1행
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_unique_with_color
  ON cart_items (user_id, product_id, selected_color)
  WHERE selected_color IS NOT NULL;
