-- ==============================================================================
-- Migration 04: Seed Initial Locations & Default Accounts
-- ==============================================================================

-- Seed Locations: Gudang Pusat (0), Toko 1 (1), Toko 2 (2), Toko 3 (3)
INSERT INTO locations (id, name, type, address, created_at)
VALUES 
    (0, 'Gudang Pusat (Hub Master)', 'WAREHOUSE', 'Kawasan Industri Terpadu Blok A1, Cikarang', NOW()),
    (1, 'Toko 1 (Cabang Barat)', 'STORE', 'Jl. Boulevard Raya Barat No. 45, Jakarta Barat', NOW()),
    (2, 'Toko 2 (Cabang Selatan)', 'STORE', 'Jl. Kemang Raya No. 12, Jakarta Selatan', NOW()),
    (3, 'Toko 3 (Cabang Timur)', 'STORE', 'Jl. Pemuda No. 88, Jakarta Timur', NOW())
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, type = EXCLUDED.type, address = EXCLUDED.address;

-- Seed Default Users
-- Default Passwords:
-- admin.gudang -> admin123
-- staf.toko1   -> toko123
-- staf.toko2   -> toko123
-- staf.toko3   -> toko123
INSERT INTO users (id, username, password_hash, full_name, role, location_id, is_active, created_at, updated_at)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'admin.gudang', 'admin123', 'Budi Santoso (Admin Gudang Pusat)', 'ADMIN_GUDANG', 0, TRUE, NOW(), NOW()),
    ('a0000000-0000-0000-0000-000000000002', 'staf.toko1', 'toko123', 'Rian Pratama (Staf Toko 1)', 'ORANG_TOKO', 1, TRUE, NOW(), NOW()),
    ('a0000000-0000-0000-0000-000000000003', 'staf.toko2', 'toko123', 'Siti Rahma (Staf Toko 2)', 'ORANG_TOKO', 2, TRUE, NOW(), NOW()),
    ('a0000000-0000-0000-0000-000000000004', 'staf.toko3', 'toko123', 'Doni Wijaya (Staf Toko 3)', 'ORANG_TOKO', 3, TRUE, NOW(), NOW())
ON CONFLICT (username) DO NOTHING;
