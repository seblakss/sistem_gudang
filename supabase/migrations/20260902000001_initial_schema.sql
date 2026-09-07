-- ==============================================================================
-- Migration 01: Initial Schema (Hub-and-Spoke Warehouse & Multi-Store System)
-- ==============================================================================

-- 1. Master Lokasi / Cabang
CREATE TABLE IF NOT EXISTS locations (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('WAREHOUSE', 'STORE')),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Master Pengguna (Users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN_GUDANG', 'ORANG_TOKO')),
    location_id INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Master Data Barang (Items / SKU)
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Umum',
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    safety_stock INT NOT NULL DEFAULT 0 CHECK (safety_stock >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Saldo Inventori per Lokasi (Inventories)
CREATE TABLE IF NOT EXISTS inventories (
    id SERIAL PRIMARY KEY,
    location_id INT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    stock_available INT NOT NULL DEFAULT 0 CHECK (stock_available >= 0),
    stock_reserved INT NOT NULL DEFAULT 0 CHECK (stock_reserved >= 0),
    stock_in_transit INT NOT NULL DEFAULT 0 CHECK (stock_in_transit >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_location_item UNIQUE (location_id, item_id)
);

-- 5. Header Transfer Request (Transfer Requests)
CREATE TABLE IF NOT EXISTS transfer_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    do_number VARCHAR(50) UNIQUE,
    from_location_id INT NOT NULL REFERENCES locations(id),
    to_location_id INT NOT NULL REFERENCES locations(id),
    requested_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    status VARCHAR(30) NOT NULL CHECK (status IN (
        'PENDING', 'APPROVED', 'PARTIAL', 'REJECTED', 'IN_TRANSIT', 'COMPLETED', 'DISCREPANCY'
    )),
    request_notes TEXT,
    rejection_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dispatched_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE
);

-- 6. Detail Item Transfer Request (Transfer Request Items)
CREATE TABLE IF NOT EXISTS transfer_request_items (
    id SERIAL PRIMARY KEY,
    transfer_request_id INT NOT NULL REFERENCES transfer_requests(id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    qty_requested INT NOT NULL CHECK (qty_requested > 0),
    qty_approved INT NOT NULL DEFAULT 0 CHECK (qty_approved >= 0),
    qty_dispatched INT NOT NULL DEFAULT 0 CHECK (qty_dispatched >= 0),
    qty_received INT NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
    discrepancy_reason TEXT
);

-- 7. Buku Besar Mutasi Stok (Inventory Stock Mutations Ledger) - APPEND-ONLY
CREATE TABLE IF NOT EXISTS inventory_mutations (
    id BIGSERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    from_location_id INT REFERENCES locations(id),
    to_location_id INT REFERENCES locations(id),
    qty INT NOT NULL CHECK (qty > 0),
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
        'PURCHASE_INBOUND', 'TRANSFER_DISPATCH', 'TRANSFER_RECEIVE', 'DAMAGE_LOSS', 'MANUAL_ADJUSTMENT'
    )),
    reference_id INT,
    reference_code VARCHAR(50),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes untuk optimasi query (Response time < 1.5s sesuai NFR PRD)
CREATE INDEX IF NOT EXISTS idx_inventories_loc_item ON inventories(location_id, item_id);
CREATE INDEX IF NOT EXISTS idx_mutations_audit ON inventory_mutations(item_id, from_location_id, to_location_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_status ON transfer_requests(status, to_location_id);
