-- ============================================
-- Setup Supabase Storage for Product Images
-- Jalankan SQL ini di Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Buat bucket untuk gambar produk (public bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: Siapa saja bisa melihat gambar (public read)
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 3. Policy: Siapa saja bisa upload gambar
CREATE POLICY "Allow upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

-- 4. Policy: Siapa saja bisa hapus gambar
CREATE POLICY "Allow delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');

-- 5. Policy: Siapa saja bisa update gambar
CREATE POLICY "Allow update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

-- 6. Buat bucket untuk attachment chat / bukti pembayaran
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Policy: Siapa saja bisa melihat attachment chat
CREATE POLICY "Public read chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

-- 8. Policy: Siapa saja bisa upload attachment chat
CREATE POLICY "Allow upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments');

-- 9. Policy: Siapa saja bisa hapus attachment chat
CREATE POLICY "Allow delete chat attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-attachments');
