-- product-images 버킷 업로드/조회 RLS 정책
-- 인증된 사용자가 자신의 uid/ 폴더에 업로드 가능 (desc/ 서브폴더 포함)
CREATE POLICY "product-images upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 모든 사람이 읽기 가능 (public 버킷이므로)
CREATE POLICY "product-images read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- 본인 파일만 삭제 가능
CREATE POLICY "product-images delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
