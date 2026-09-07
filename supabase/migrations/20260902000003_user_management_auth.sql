-- ==============================================================================
-- Migration 03: User Management & Authentication Functions (Managed by Admin Gudang)
-- ==============================================================================

-- 1. RPC: Autentikasi Login Pengguna
CREATE OR REPLACE FUNCTION rpc_authenticate_user(
    p_username TEXT,
    p_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
    v_location RECORD;
BEGIN
    SELECT * INTO v_user 
    FROM users 
    WHERE LOWER(username) = LOWER(TRIM(p_username)) 
      AND password_hash = p_password_hash
      AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Username atau kata sandi tidak cocok / akun dinonaktifkan.'
        );
    END IF;

    SELECT * INTO v_location FROM locations WHERE id = v_user.location_id;

    RETURN jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
            'id', v_user.id,
            'username', v_user.username,
            'full_name', v_user.full_name,
            'role', v_user.role,
            'location_id', v_user.location_id,
            'is_active', v_user.is_active,
            'created_at', v_user.created_at
        ),
        'location', jsonb_build_object(
            'id', v_location.id,
            'name', v_location.name,
            'type', v_location.type,
            'address', v_location.address
        )
    );
END;
$$;

-- 2. RPC: Tambah Pengguna Baru (Hanya Admin Gudang)
CREATE OR REPLACE FUNCTION rpc_create_user(
    p_admin_id UUID,
    p_username TEXT,
    p_password_hash TEXT,
    p_full_name TEXT,
    p_role TEXT,
    p_location_id INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin RECORD;
    v_new_id UUID;
BEGIN
    -- Verifikasi pemanggil adalah Admin Gudang
    SELECT * INTO v_admin FROM users WHERE id = p_admin_id AND role = 'ADMIN_GUDANG' AND is_active = TRUE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hanya Admin Gudang yang berhak menambahkan pengguna baru';
    END IF;

    IF EXISTS (SELECT 1 FROM users WHERE LOWER(username) = LOWER(TRIM(p_username))) THEN
        RAISE EXCEPTION 'Username "%" sudah terdaftar. Gunakan username lain.', p_username;
    END IF;

    INSERT INTO users (
        username, password_hash, full_name, role, location_id, is_active, created_at, updated_at
    ) VALUES (
        LOWER(TRIM(p_username)), p_password_hash, TRIM(p_full_name), p_role, p_location_id, TRUE, NOW(), NOW()
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_new_id,
        'message', 'Pengguna berhasil didaftarkan'
    );
END;
$$;

-- 3. RPC: Ubah / Reset Password / Nonaktifkan Pengguna (Admin Gudang)
CREATE OR REPLACE FUNCTION rpc_manage_user(
    p_admin_id UUID,
    p_target_user_id UUID,
    p_full_name TEXT,
    p_role TEXT,
    p_location_id INT,
    p_is_active BOOLEAN,
    p_new_password_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin RECORD;
BEGIN
    SELECT * INTO v_admin FROM users WHERE id = p_admin_id AND role = 'ADMIN_GUDANG' AND is_active = TRUE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hanya Admin Gudang yang berhak mengelola akun pengguna';
    END IF;

    UPDATE users
    SET full_name = COALESCE(TRIM(p_full_name), full_name),
        role = COALESCE(p_role, role),
        location_id = COALESCE(p_location_id, location_id),
        is_active = COALESCE(p_is_active, is_active),
        password_hash = CASE WHEN p_new_password_hash IS NOT NULL AND p_new_password_hash <> '' THEN p_new_password_hash ELSE password_hash END,
        updated_at = NOW()
    WHERE id = p_target_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Data pengguna berhasil diperbarui'
    );
END;
$$;
