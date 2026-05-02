-- ================================================
-- Migration: Customer System & Delivery Orders
-- Run this SQL in Supabase SQL Editor
-- ================================================

-- 1. Orders table (supports dine_in and delivery)
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    order_number TEXT NOT NULL,
    order_type TEXT NOT NULL DEFAULT 'dine_in', -- 'dine_in' or 'delivery'
    status TEXT NOT NULL DEFAULT 'menunggu_pembayaran', -- menunggu_pembayaran, sedang_dilayani, dalam_perjalanan, selesai
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT,
    customer_landmark TEXT,
    customer_lat DOUBLE PRECISION,
    customer_lng DOUBLE PRECISION,
    total_amount NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Order messages table (chat)
CREATE TABLE IF NOT EXISTS order_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    message TEXT NOT NULL,
    attachment_url TEXT,
    attachment_type TEXT,
    attachment_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Promo banners table
CREATE TABLE IF NOT EXISTS promo_banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable RLS on new tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_banners ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for orders
CREATE POLICY "Anyone can view orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Anyone can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update orders" ON orders FOR UPDATE USING (true);

-- 7. RLS Policies for order_items
CREATE POLICY "Anyone can view order_items" ON order_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert order_items" ON order_items FOR INSERT WITH CHECK (true);

-- 8. RLS Policies for order_messages
CREATE POLICY "Anyone can view order_messages" ON order_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert order_messages" ON order_messages FOR INSERT WITH CHECK (true);

-- 9. Message read receipts
CREATE TABLE IF NOT EXISTS order_message_reads (
    message_id UUID NOT NULL REFERENCES order_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

ALTER TABLE order_message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view order message reads" ON order_message_reads FOR SELECT USING (true);
CREATE POLICY "Anyone can insert order message reads" ON order_message_reads FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update order message reads" ON order_message_reads FOR UPDATE USING (true);

-- 10. RLS Policies for promo_banners
CREATE POLICY "Anyone can view promo_banners" ON promo_banners FOR SELECT USING (true);
CREATE POLICY "Anyone can insert promo_banners" ON promo_banners FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update promo_banners" ON promo_banners FOR UPDATE USING (true);

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_order_id ON order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_message_reads_user_id ON order_message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_banners_store_id ON promo_banners(store_id);

-- 12. Update register_user function to support 'pelanggan' role
-- (The existing function should already work since it accepts any input_role string)
-- Just make sure 'pelanggan' users get 'active' status directly:
CREATE OR REPLACE FUNCTION register_user(
    input_name TEXT,
    input_email TEXT,
    input_password TEXT,
    input_role TEXT DEFAULT 'member',
    input_store_id UUID DEFAULT NULL,
    input_store_name TEXT DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, message TEXT, user_id UUID) AS $$
DECLARE
    v_store_id UUID;
    v_user_id UUID;
    v_hashed_password TEXT;
BEGIN
    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM users WHERE email = input_email) THEN
        RETURN QUERY SELECT false, 'Email sudah terdaftar'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Hash password
    v_hashed_password := crypt(input_password, gen_salt('bf'));

    -- Handle store
    IF input_store_id IS NOT NULL THEN
        v_store_id := input_store_id;
    ELSIF input_store_name IS NOT NULL AND input_store_name != '' THEN
        INSERT INTO stores (name) VALUES (input_store_name) RETURNING id INTO v_store_id;
    ELSE
        -- Find any existing store as fallback
        SELECT id INTO v_store_id FROM stores LIMIT 1;
        IF v_store_id IS NULL THEN
            INSERT INTO stores (name) VALUES ('Default Store') RETURNING id INTO v_store_id;
        END IF;
    END IF;

    -- Insert user
    INSERT INTO users (store_id, email, password, name, role, status)
    VALUES (
        v_store_id,
        input_email,
        v_hashed_password,
        input_name,
        input_role,
        CASE
            WHEN input_role = 'admin' AND input_store_name IS NOT NULL THEN 'active'
            WHEN input_role = 'pelanggan' THEN 'active'  -- Customers are auto-activated
            ELSE 'pending'
        END
    ) RETURNING id INTO v_user_id;

    RETURN QUERY SELECT true,
        CASE
            WHEN input_role = 'pelanggan' THEN 'Pendaftaran berhasil! Silakan login.'::TEXT
            WHEN input_role = 'admin' AND input_store_name IS NOT NULL THEN 'Pendaftaran berhasil! Anda terdaftar sebagai Admin.'::TEXT
            ELSE 'Pendaftaran berhasil! Menunggu persetujuan admin.'::TEXT
        END,
        v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
