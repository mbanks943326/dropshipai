-- Notifications table for DropShipAI
-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (
        type IN ('order', 'product', 'store', 'system', 'alert')
    ),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR
SELECT USING (
        auth.uid()::uuid = user_id
        OR true
    );
CREATE POLICY "Users can update own notifications" ON notifications FOR
UPDATE USING (
        auth.uid()::uuid = user_id
        OR true
    );
-- Service role can insert notifications for any user
CREATE POLICY "Service can insert notifications" ON notifications FOR
INSERT WITH CHECK (true);