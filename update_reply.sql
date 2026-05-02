ALTER TABLE order_messages ADD COLUMN reply_to_id UUID REFERENCES order_messages(id) ON DELETE SET NULL;
