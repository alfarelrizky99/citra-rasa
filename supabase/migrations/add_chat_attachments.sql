-- ================================================
-- Migration: Chat image attachments / payment proof
-- ================================================

ALTER TABLE order_messages
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    CREATE POLICY "Public read chat attachments"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'chat-attachments');
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Allow upload chat attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'chat-attachments');
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Allow delete chat attachments"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'chat-attachments');
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;
