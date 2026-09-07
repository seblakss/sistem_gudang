-- ==============================================================================
-- Migration 05: Add Price Column to Items (Master Harga oleh Admin Gudang)
-- ==============================================================================

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS price NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (price >= 0);
