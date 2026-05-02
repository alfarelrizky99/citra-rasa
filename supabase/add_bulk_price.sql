-- ============================================
-- Tambah kolom bulk_price ke tabel materials
-- Jalankan SQL ini di Supabase Dashboard > SQL Editor
-- ============================================

-- Tambah kolom bulk_price (harga belanja keseluruhan bahan)
ALTER TABLE materials ADD COLUMN IF NOT EXISTS bulk_price numeric DEFAULT 0;

-- Backfill data existing: set bulk_price = current_stock * average_cost
UPDATE materials SET bulk_price = current_stock * average_cost WHERE bulk_price = 0 OR bulk_price IS NULL;
