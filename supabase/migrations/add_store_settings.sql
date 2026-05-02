-- Migration: Add image_url column to products table
-- Run this in your Supabase SQL Editor

-- 1. Add image_url column
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

-- 2. Allow public (unauthenticated) users to read active products for Landing Page
-- (Only if this policy doesn't already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public can view active products' AND tablename = 'products'
    ) THEN
        CREATE POLICY "Public can view active products"
            ON products FOR SELECT
            USING (is_active = true);
    END IF;
END $$;

-- 3. Create store_settings table (if not already created)
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, setting_key)
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read store settings' AND tablename = 'store_settings'
    ) THEN
        CREATE POLICY "Anyone can read store settings"
            ON store_settings FOR SELECT
            USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their store settings' AND tablename = 'store_settings'
    ) THEN
        CREATE POLICY "Users can manage their store settings"
            ON store_settings FOR ALL
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
