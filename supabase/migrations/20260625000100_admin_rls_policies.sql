-- 관리자가 모든 게시글 수정·삭제 가능
CREATE POLICY "posts_admin_update" ON posts
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "posts_admin_delete" ON posts
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 관리자가 모든 영상 수정·삭제 가능
CREATE POLICY "media_posts_admin_update" ON media_posts
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "media_posts_admin_delete" ON media_posts
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 관리자가 모든 댓글 삭제 가능
CREATE POLICY "comments_admin_delete" ON comments
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 관리자가 모든 상품 수정·삭제 가능
CREATE POLICY "products_admin_update" ON products
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "products_admin_delete" ON products
  FOR DELETE
  USING (
    seller_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
