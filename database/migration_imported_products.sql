-- Migration: Update imported_products table for direct product import
-- Run this in Supabase SQL Editor
-- 1. Drop the foreign key constraint on product_id
ALTER TABLE imported_products DROP CONSTRAINT IF EXISTS imported_products_product_id_fkey;
-- 2. Make product_id optional (allow NULL)
ALTER TABLE imported_products
ALTER COLUMN product_id DROP NOT NULL;
-- 3. Add new columns for storing product data directly
ALTER TABLE imported_products
ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE imported_products
ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE imported_products
ADD COLUMN IF NOT EXISTS original_title TEXT;
ALTER TABLE imported_products
ADD COLUMN IF NOT EXISTS main_image TEXT;
ALTER TABLE imported_products
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
ALTER TABLE imported_products
ADD COLUMN IF NOT EXISTS supplier_url TEXT;
ALTER TABLE imported_products
ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2);
ALTER TABLE imported_products
ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;
ALTER TABLE imported_products
ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;
-- Verify changes
SELECT column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'imported_products';