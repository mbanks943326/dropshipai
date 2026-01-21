-- DropShipAI Database Schema
-- PostgreSQL / Supabase
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    full_name TEXT,
    avatar_url TEXT,
    provider TEXT DEFAULT 'email',
    -- 'email', 'google'
    provider_id TEXT,
    subscription_tier TEXT DEFAULT 'free',
    -- 'free', 'pro'
    stripe_customer_id TEXT,
    email_verified BOOLEAN DEFAULT false,
    reset_token TEXT,
    reset_token_expires TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- PRODUCTS CACHE
-- =====================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL CHECK (source IN ('amazon', 'aliexpress', 'temu')),
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    currency TEXT DEFAULT 'USD',
    images JSONB DEFAULT '[]',
    main_image TEXT,
    rating DECIMAL(3, 2),
    reviews_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    category TEXT,
    subcategory TEXT,
    brand TEXT,
    supplier_url TEXT,
    shipping_info JSONB,
    variants JSONB DEFAULT '[]',
    ai_score INTEGER CHECK (
        ai_score >= 0
        AND ai_score <= 100
    ),
    ai_analysis JSONB,
    is_winning BOOLEAN DEFAULT false,
    cached_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    UNIQUE(source, external_id)
);
-- =====================================================
-- USER STORES
-- =====================================================
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('shopify', 'woocommerce', 'ebay')),
    store_name TEXT NOT NULL,
    store_url TEXT NOT NULL,
    api_key TEXT,
    api_secret TEXT,
    access_token TEXT,
    refresh_token TEXT,
    webhook_secret TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- IMPORTED PRODUCTS
-- =====================================================
CREATE TABLE imported_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    external_product_id TEXT,
    -- ID in the store platform
    custom_title TEXT,
    custom_description TEXT,
    custom_price DECIMAL(10, 2),
    cost_price DECIMAL(10, 2),
    markup_percentage DECIMAL(5, 2) DEFAULT 30.00,
    profit_margin DECIMAL(10, 2),
    inventory_quantity INTEGER DEFAULT 0,
    auto_sync BOOLEAN DEFAULT true,
    auto_fulfill BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'draft' CHECK (
        status IN ('draft', 'active', 'paused', 'deleted')
    ),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- ORDERS
-- =====================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    imported_product_id UUID REFERENCES imported_products(id) ON DELETE
    SET NULL,
        external_order_id TEXT,
        -- Order ID from store
        order_number TEXT,
        customer_name TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        shipping_address JSONB,
        billing_address JSONB,
        line_items JSONB DEFAULT '[]',
        subtotal DECIMAL(10, 2),
        shipping_cost DECIMAL(10, 2) DEFAULT 0,
        tax_amount DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(10, 2),
        cost_of_goods DECIMAL(10, 2),
        profit DECIMAL(10, 2),
        currency TEXT DEFAULT 'USD',
        status TEXT DEFAULT 'pending' CHECK (
            status IN (
                'pending',
                'processing',
                'awaiting_shipment',
                'shipped',
                'delivered',
                'cancelled',
                'refunded'
            )
        ),
        fulfillment_status TEXT DEFAULT 'unfulfilled',
        supplier_order_id TEXT,
        supplier_order_status TEXT,
        tracking_number TEXT,
        tracking_url TEXT,
        tracking_carrier TEXT,
        notes TEXT,
        ordered_at TIMESTAMPTZ DEFAULT NOW(),
        shipped_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- SUBSCRIPTIONS
-- =====================================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
    status TEXT DEFAULT 'active' CHECK (
        status IN (
            'active',
            'cancelled',
            'past_due',
            'unpaid',
            'trialing'
        )
    ),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- USAGE TRACKING (for rate limiting)
-- =====================================================
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    -- 'search', 'import', 'ai_analysis'
    count INTEGER DEFAULT 1,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, action, date)
);
-- =====================================================
-- AI SUGGESTIONS LOG
-- =====================================================
CREATE TABLE ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE
    SET NULL,
        suggestion_type TEXT NOT NULL,
        -- 'winning_products', 'price_optimization', 'marketing'
        products JSONB,
        analysis TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    -- 'order', 'shipment', 'subscription', 'system'
    title TEXT NOT NULL,
    message TEXT,
    data JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_products_source ON products(source);
CREATE INDEX idx_products_ai_score ON products(ai_score DESC NULLS LAST);
CREATE INDEX idx_products_is_winning ON products(is_winning)
WHERE is_winning = true;
CREATE INDEX idx_products_cached_at ON products(cached_at);
CREATE INDEX idx_stores_user ON stores(user_id);
CREATE INDEX idx_imported_products_user ON imported_products(user_id);
CREATE INDEX idx_imported_products_store ON imported_products(store_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_usage_logs_user_date ON usage_logs(user_id, date);
CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);
-- =====================================================
-- ROW LEVEL SECURITY (for Supabase)
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users FOR
SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR
UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own stores" ON stores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own imported products" ON imported_products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own orders" ON orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own subscription" ON subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own usage" ON usage_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
-- Products are public (cached data)
CREATE POLICY "Products are viewable by all" ON products FOR
SELECT USING (true);
-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================
-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_users_updated_at BEFORE
UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_stores_updated_at BEFORE
UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_imported_products_updated_at BEFORE
UPDATE ON imported_products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE
UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE
UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- Calculate profit on order update
CREATE OR REPLACE FUNCTION calculate_order_profit() RETURNS TRIGGER AS $$ BEGIN IF NEW.total_amount IS NOT NULL
    AND NEW.cost_of_goods IS NOT NULL THEN NEW.profit = NEW.total_amount - NEW.cost_of_goods - COALESCE(NEW.shipping_cost, 0);
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER calculate_order_profit_trigger BEFORE
INSERT
    OR
UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION calculate_order_profit();