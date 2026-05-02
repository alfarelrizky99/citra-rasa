-- ============================================================
-- SQL Migration: Registrasi, Approval, & Role-Based Access
-- Jalankan script ini di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom status ke users (pending, approved, rejected)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='status') THEN
        ALTER TABLE public.users ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';
    END IF;
END $$;

-- 2. Drop & recreate login_user agar cek status = approved
DROP FUNCTION IF EXISTS public.login_user(text, text);

CREATE OR REPLACE FUNCTION public.login_user(input_email TEXT, input_password TEXT)
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    status TEXT,
    store_id UUID,
    store_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        u.status,
        u.store_id,
        s.name AS store_name
    FROM public.users u
    JOIN public.stores s ON s.id = u.store_id
    WHERE u.email = input_email
      AND u.password = crypt(input_password, u.password);
END;
$$;

-- 3. Buat fungsi register_user
CREATE OR REPLACE FUNCTION public.register_user(
    input_name TEXT,
    input_email TEXT,
    input_password TEXT,
    input_role TEXT,           -- 'admin' atau 'member'
    input_store_id UUID DEFAULT NULL,
    input_store_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id UUID;
    v_user_id UUID;
    v_status TEXT;
BEGIN
    -- Cek apakah email sudah terdaftar
    IF EXISTS (SELECT 1 FROM public.users WHERE public.users.email = input_email) THEN
        RETURN QUERY SELECT false, 'Email sudah terdaftar'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Jika toko baru (input_store_id NULL, input_store_name ada)
    IF input_store_id IS NULL AND input_store_name IS NOT NULL THEN
        INSERT INTO public.stores (name)
        VALUES (input_store_name)
        RETURNING id INTO v_store_id;

        v_status := 'approved';  -- Toko baru = langsung approved sebagai admin
    ELSIF input_store_id IS NOT NULL THEN
        v_store_id := input_store_id;
        v_status := 'pending';   -- Toko lama = butuh approval
    ELSE
        RETURN QUERY SELECT false, 'Pilih toko atau buat toko baru'::TEXT, NULL::UUID;
        RETURN;
    END IF;

    -- Insert user
    INSERT INTO public.users (name, email, password, role, store_id, status)
    VALUES (
        input_name,
        input_email,
        crypt(input_password, gen_salt('bf')),
        CASE WHEN input_store_id IS NULL THEN 'admin' ELSE input_role END,
        v_store_id,
        v_status
    )
    RETURNING id INTO v_user_id;

    IF v_status = 'approved' THEN
        RETURN QUERY SELECT true, 'Registrasi berhasil! Silakan login.'::TEXT, v_user_id;
    ELSE
        RETURN QUERY SELECT true, 'Registrasi berhasil! Menunggu approval dari admin toko.'::TEXT, v_user_id;
    END IF;
END;
$$;

-- 4. Grant akses ke anon agar bisa register tanpa login
GRANT EXECUTE ON FUNCTION public.register_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_user TO anon, authenticated;

-- 5. Grant SELECT pada stores untuk anon (agar list toko muncul di form register)
GRANT SELECT ON public.stores TO anon, authenticated;

-- 6. Buat fungsi change_user_password (untuk admin/superadmin ganti password user)
CREATE OR REPLACE FUNCTION public.change_user_password(
    target_user_id UUID,
    new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.users
    SET password = crypt(new_password, gen_salt('bf'))
    WHERE id = target_user_id;
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.change_user_password TO authenticated;

-- 7. Reload schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 8. Tambah preferences user (dark mode, theme color)
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='dark_mode') THEN
        ALTER TABLE public.users ADD COLUMN dark_mode BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='theme_color') THEN
        ALTER TABLE public.users ADD COLUMN theme_color TEXT NOT NULL DEFAULT 'blue';
    END IF;
END $$;

-- ============================================================
-- 9. Tabel store_menu_config (menu visibility per toko)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_menu_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    menu_id TEXT NOT NULL,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, menu_id)
);

ALTER TABLE public.store_menu_config DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.store_menu_config TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- SELESAI! Verifikasi:
-- SELECT * FROM users;
-- SELECT * FROM stores;
-- SELECT * FROM store_menu_config;
-- ============================================================
