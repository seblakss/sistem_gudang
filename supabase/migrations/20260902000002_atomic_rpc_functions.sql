-- ==============================================================================
-- Migration 02: Atomic Stored Procedures (PostgreSQL RPC Functions)
-- Menjamin Integritas ACID, Atomic Stock Reservation, dan Two-Way Handshake
-- ==============================================================================

-- 1. RPC: Stock Inbound (Barang Masuk Supplier ke Gudang Pusat)
CREATE OR REPLACE FUNCTION rpc_add_stock_inbound(
    p_item_id INT,
    p_qty INT,
    p_notes TEXT,
    p_user_id UUID,
    p_supplier_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inv_id INT;
    v_mut_id BIGINT;
    v_full_notes TEXT;
BEGIN
    IF p_qty <= 0 THEN
        RAISE EXCEPTION 'Kuantiti barang masuk harus lebih besar dari 0';
    END IF;

    -- Update atau Insert Saldo Gudang Pusat (Location 0)
    INSERT INTO inventories (location_id, item_id, stock_available, stock_reserved, stock_in_transit, updated_at)
    VALUES (0, p_item_id, p_qty, 0, 0, NOW())
    ON CONFLICT (location_id, item_id)
    DO UPDATE SET 
        stock_available = inventories.stock_available + p_qty,
        updated_at = NOW()
    RETURNING id INTO v_inv_id;

    -- Buat Catatan
    IF p_supplier_name IS NOT NULL AND p_supplier_name <> '' THEN
        v_full_notes := 'Inbound dari ' || p_supplier_name || ': ' || COALESCE(p_notes, '');
    ELSE
        v_full_notes := 'Stock Inbound: ' || COALESCE(p_notes, '');
    END IF;

    -- Append ke Buku Besar Mutasi (PURCHASE_INBOUND)
    INSERT INTO inventory_mutations (
        item_id, from_location_id, to_location_id, qty, transaction_type, notes, created_by, created_at
    ) VALUES (
        p_item_id, NULL, 0, p_qty, 'PURCHASE_INBOUND', v_full_notes, p_user_id, NOW()
    ) RETURNING id INTO v_mut_id;

    RETURN jsonb_build_object(
        'success', true,
        'inventory_id', v_inv_id,
        'mutation_id', v_mut_id,
        'qty_added', p_qty
    );
END;
$$;

-- 2. RPC: Buat Transfer Request Baru (Staf Toko)
CREATE OR REPLACE FUNCTION rpc_create_transfer_request(
    p_to_location_id INT,
    p_requested_by UUID,
    p_items JSONB, -- Array of {"item_id": 1, "qty_requested": 10}
    p_request_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today_str TEXT;
    v_count_today INT;
    v_req_number TEXT;
    v_req_id INT;
    v_item JSONB;
BEGIN
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Pilih minimal 1 barang untuk diajukan';
    END IF;

    v_today_str := to_char(NOW(), 'YYYYMMDD');
    
    SELECT COUNT(*) + 1 INTO v_count_today 
    FROM transfer_requests 
    WHERE created_at::date = CURRENT_DATE;

    v_req_number := 'TR-' || v_today_str || '-' || lpad(v_count_today::text, 3, '0');

    -- Insert Header Request
    INSERT INTO transfer_requests (
        request_number, from_location_id, to_location_id, requested_by, status, request_notes, created_at
    ) VALUES (
        v_req_number, 0, p_to_location_id, p_requested_by, 'PENDING', p_request_notes, NOW()
    ) RETURNING id INTO v_req_id;

    -- Insert Detail Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO transfer_request_items (
            transfer_request_id, item_id, qty_requested, qty_approved, qty_dispatched, qty_received
        ) VALUES (
            v_req_id,
            (v_item->>'item_id')::INT,
            (v_item->>'qty_requested')::INT,
            0, 0, 0
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_req_id,
        'request_number', v_req_number
    );
END;
$$;

-- 3. RPC: Otorisasi & Atomic Stock Reservation (Admin Gudang)
CREATE OR REPLACE FUNCTION rpc_authorize_transfer_request(
    p_request_id INT,
    p_admin_id UUID,
    p_decision TEXT, -- 'APPROVE_FULL', 'APPROVE_PARTIAL', 'REJECT'
    p_approved_items JSONB DEFAULT '[]'::jsonb, -- [{"item_id": 1, "qty_approved": 8}]
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req RECORD;
    v_item RECORD;
    v_inv RECORD;
    v_approved_qty INT;
    v_is_partial BOOLEAN := FALSE;
    v_custom_item JSONB;
BEGIN
    -- Kunci baris request
    SELECT * INTO v_req FROM transfer_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer request tidak ditemukan';
    END IF;

    IF v_req.status <> 'PENDING' THEN
        RAISE EXCEPTION 'Request dengan status % tidak dapat diotorisasi ulang', v_req.status;
    END IF;

    IF p_decision = 'REJECT' THEN
        UPDATE transfer_requests
        SET status = 'REJECTED',
            approved_by = p_admin_id,
            rejection_notes = COALESCE(p_notes, 'Ditolak oleh admin gudang')
        WHERE id = p_request_id;

        RETURN jsonb_build_object('success', true, 'status', 'REJECTED');
    END IF;

    -- Loop setiap item dan lakukan Row-Level Locking (SELECT FOR UPDATE)
    FOR v_item IN SELECT * FROM transfer_request_items WHERE transfer_request_id = p_request_id
    LOOP
        v_approved_qty := v_item.qty_requested;

        IF p_decision = 'APPROVE_PARTIAL' AND jsonb_array_length(p_approved_items) > 0 THEN
            SELECT elem INTO v_custom_item 
            FROM jsonb_array_elements(p_approved_items) elem 
            WHERE (elem->>'item_id')::INT = v_item.item_id 
            LIMIT 1;

            IF v_custom_item IS NOT NULL THEN
                v_approved_qty := (v_custom_item->>'qty_approved')::INT;
            END IF;
        END IF;

        -- Ambil saldo stok Gudang Pusat (Location 0) dengan LOCK baris untuk mencegah race condition
        SELECT * INTO v_inv 
        FROM inventories 
        WHERE location_id = 0 AND item_id = v_item.item_id 
        FOR UPDATE;

        IF NOT FOUND OR v_inv.stock_available < v_approved_qty THEN
            RAISE EXCEPTION 'Stok gudang tidak mencukupi untuk item ID % (Tersedia: %, Diminta: %)', 
                v_item.item_id, COALESCE(v_inv.stock_available, 0), v_approved_qty;
        END IF;

        IF v_approved_qty < v_item.qty_requested THEN
            v_is_partial := TRUE;
        END IF;

        -- Update kuantiti disetujui pada item
        UPDATE transfer_request_items
        SET qty_approved = v_approved_qty
        WHERE id = v_item.id;

        -- Atomic Reservation: stock_available berkurang, stock_reserved bertambah
        IF v_approved_qty > 0 THEN
            UPDATE inventories
            SET stock_available = stock_available - v_approved_qty,
                stock_reserved = stock_reserved + v_approved_qty,
                updated_at = NOW()
            WHERE id = v_inv.id;
        END IF;
    END LOOP;

    -- Update status request
    UPDATE transfer_requests
    SET status = CASE WHEN v_is_partial OR p_decision = 'APPROVE_PARTIAL' THEN 'PARTIAL' ELSE 'APPROVED' END,
        approved_by = p_admin_id,
        rejection_notes = p_notes
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true, 
        'status', CASE WHEN v_is_partial OR p_decision = 'APPROVE_PARTIAL' THEN 'PARTIAL' ELSE 'APPROVED' END
    );
END;
$$;

-- 4. RPC: Dispatch & Cetak Surat Jalan DO (Admin Gudang)
CREATE OR REPLACE FUNCTION rpc_dispatch_transfer_request(
    p_request_id INT,
    p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req RECORD;
    v_item RECORD;
    v_today_str TEXT;
    v_do_count INT;
    v_do_number TEXT;
BEGIN
    SELECT * INTO v_req FROM transfer_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer request tidak ditemukan';
    END IF;

    IF v_req.status NOT IN ('APPROVED', 'PARTIAL') THEN
        RAISE EXCEPTION 'Request dengan status % belum siap di-dispatch', v_req.status;
    END IF;

    v_today_str := to_char(NOW(), 'YYYYMMDD');
    SELECT COUNT(*) + 1 INTO v_do_count FROM transfer_requests WHERE do_number LIKE 'DO-' || v_today_str || '%';
    v_do_number := 'DO-' || v_today_str || '-' || lpad(v_do_count::text, 4, '0');

    FOR v_item IN SELECT * FROM transfer_request_items WHERE transfer_request_id = p_request_id
    LOOP
        UPDATE transfer_request_items 
        SET qty_dispatched = qty_approved 
        WHERE id = v_item.id;

        IF v_item.qty_approved > 0 THEN
            -- Pindahkan saldo gudang dari stock_reserved ke stock_in_transit
            UPDATE inventories
            SET stock_reserved = stock_reserved - v_item.qty_approved,
                stock_in_transit = stock_in_transit + v_item.qty_approved,
                updated_at = NOW()
            WHERE location_id = 0 AND item_id = v_item.item_id;

            -- Catat ke Buku Besar Mutasi (TRANSFER_DISPATCH)
            INSERT INTO inventory_mutations (
                item_id, from_location_id, to_location_id, qty, transaction_type,
                reference_id, reference_code, notes, created_by, created_at
            ) VALUES (
                v_item.item_id, 0, v_req.to_location_id, v_item.qty_approved, 'TRANSFER_DISPATCH',
                v_req.id, v_do_number, 'Pengiriman ke Cabang #' || v_req.to_location_id, p_admin_id, NOW()
            );
        END IF;
    END LOOP;

    UPDATE transfer_requests
    SET status = 'IN_TRANSIT',
        do_number = v_do_number,
        dispatched_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'do_number', v_do_number,
        'status', 'IN_TRANSIT'
    );
END;
$$;

-- 5. RPC: Two-Way Handshake Receiving & Discrepancy (Staf Toko)
CREATE OR REPLACE FUNCTION rpc_receive_transfer_request(
    p_request_id INT,
    p_store_user_id UUID,
    p_received_items JSONB -- [{"item_id": 1, "qty_received": 8, "discrepancy_reason": "2 pecah"}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req RECORD;
    v_item RECORD;
    v_rec_elem JSONB;
    v_qty_actual INT;
    v_reason TEXT;
    v_discrepancy_qty INT;
    v_has_discrepancy BOOLEAN := FALSE;
BEGIN
    SELECT * INTO v_req FROM transfer_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer request tidak ditemukan';
    END IF;

    IF v_req.status <> 'IN_TRANSIT' THEN
        RAISE EXCEPTION 'Request dengan status % tidak dalam pengiriman in-transit', v_req.status;
    END IF;

    FOR v_item IN SELECT * FROM transfer_request_items WHERE transfer_request_id = p_request_id
    LOOP
        v_qty_actual := v_item.qty_dispatched;
        v_reason := NULL;

        -- Cek payload
        SELECT elem INTO v_rec_elem 
        FROM jsonb_array_elements(p_received_items) elem 
        WHERE (elem->>'item_id')::INT = v_item.item_id 
        LIMIT 1;

        IF v_rec_elem IS NOT NULL THEN
            v_qty_actual := (v_rec_elem->>'qty_received')::INT;
            v_reason := v_rec_elem->>'discrepancy_reason';
        END IF;

        v_discrepancy_qty := v_item.qty_dispatched - v_qty_actual;

        -- Update item detail
        UPDATE transfer_request_items
        SET qty_received = v_qty_actual,
            discrepancy_reason = v_reason
        WHERE id = v_item.id;

        -- 1. Potong In-Transit di Gudang Pusat (Location 0)
        UPDATE inventories
        SET stock_in_transit = GREATEST(0, stock_in_transit - v_item.qty_dispatched),
            updated_at = NOW()
        WHERE location_id = 0 AND item_id = v_item.item_id;

        -- 2. Tambah Saldo Fisik Bebas di Toko Cabang
        INSERT INTO inventories (location_id, item_id, stock_available, stock_reserved, stock_in_transit, updated_at)
        VALUES (v_req.to_location_id, v_item.item_id, v_qty_actual, 0, 0, NOW())
        ON CONFLICT (location_id, item_id)
        DO UPDATE SET
            stock_available = inventories.stock_available + v_qty_actual,
            updated_at = NOW();

        -- 3. Catat Mutasi Masuk (TRANSFER_RECEIVE)
        IF v_qty_actual > 0 THEN
            INSERT INTO inventory_mutations (
                item_id, from_location_id, to_location_id, qty, transaction_type,
                reference_id, reference_code, notes, created_by, created_at
            ) VALUES (
                v_item.item_id, 0, v_req.to_location_id, v_qty_actual, 'TRANSFER_RECEIVE',
                v_req.id, v_req.do_number, 'Diterima fisik di cabang', p_store_user_id, NOW()
            );
        END IF;

        -- 4. Jika ada selisih, catat ke Akun Kerugian (DAMAGE_LOSS)
        IF v_discrepancy_qty > 0 THEN
            v_has_discrepancy := TRUE;
            INSERT INTO inventory_mutations (
                item_id, from_location_id, to_location_id, qty, transaction_type,
                reference_id, reference_code, notes, created_by, created_at
            ) VALUES (
                v_item.item_id, 0, NULL, v_discrepancy_qty, 'DAMAGE_LOSS',
                v_req.id, v_req.do_number, 'Selisih/Kerusakan fisik: ' || COALESCE(v_reason, 'Tidak ada keterangan'), p_store_user_id, NOW()
            );
        END IF;
    END LOOP;

    UPDATE transfer_requests
    SET status = CASE WHEN v_has_discrepancy THEN 'DISCREPANCY' ELSE 'COMPLETED' END,
        received_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', CASE WHEN v_has_discrepancy THEN 'DISCREPANCY' ELSE 'COMPLETED' END
    );
END;
$$;
