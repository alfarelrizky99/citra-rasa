-- ================================================
-- Migration: Order chat read receipts
-- ================================================

CREATE TABLE IF NOT EXISTS order_message_reads (
    message_id UUID NOT NULL REFERENCES order_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

ALTER TABLE order_message_reads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    CREATE POLICY "Anyone can view order message reads"
    ON order_message_reads FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Anyone can insert order message reads"
    ON order_message_reads FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Anyone can update order message reads"
    ON order_message_reads FOR UPDATE
    USING (true);
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_message_reads_user_id ON order_message_reads(user_id);
