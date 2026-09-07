# Product Requirement Document (PRD)
# Sistem Manajemen Gudang & Distribusi Multi-Toko (Hub-and-Spoke)

**Versi Dokumen:** 1.0.0  
**Status:** Ready for Development  
**Target Platform:** Web Application (Responsive Desktop & Mobile)  
**Arsitektur Model:** Hub-and-Spoke Inventory Distribution (1 Gudang Pusat -> 3 Toko Cabang)  

---

## 1. Executive Summary & Background

Sistem ini dirancang untuk mengatasi inefisiensi, kebocoran barang, dan distorsi pencatatan mutasi pada sistem distribusi internal barang dari 1 Gudang Pusat (*Hub*) ke 3 Toko Retail (*Spokes*). 

Sistem mengadopsi model *pull replenishment* (berbasis permintaan cabang), di mana staf toko dapat mengajukan *Transfer Request* (TR) kapan pun stok lokal menipis dengan kuantiti fleksibel. Admin gudang bertindak sebagai gerbang otorisasi (*gatekeeper*) yang melakukan verifikasi stok fisik, persetujuan (*approval*), dan pencatatan mutasi keluar secara terperinci per cabang tujuan.

Sistem juga menerapkan protokol **Two-Way Handshake** (serah terima dua arah) untuk mencegah selisih stok saat barang dalam status pengiriman (*in-transit*).

---

## 2. Tujuan & Matriks Keberhasilan (Success Metrics)

### 2.1 Tujuan Utama
1. **Transparansi Stok Real-time:** Mengetahui posisi riil stok di Gudang Pusat dan masing-masing Toko tanpa perlu kalkulasi manual.
2. **Eliminasi Selisih Stok (Discrepancy):** Melacak status barang keluar dari gudang hingga fisik diverifikasi dan diterima di toko.
3. **Pencatatan Mutasi Akurat:** Menghasilkan rekap mutasi keluar per toko secara otomatis, lengkap dengan *timestamp*, kuantiti, dan penanggung jawab.

### 2.2 KPI & Success Metrics
* **100% Traceability:** Setiap unit barang yang keluar dari gudang terikat pada ID Request, ID Pengiriman, dan ID Toko Tujuan.
* **0 Untracked In-Transit Loss:** Tidak ada stok yang "menggantung" tanpa status jelas antara gudang dan toko.
* **Waktu Rekapitulasi Stok:** Mengurangi waktu rekonsiliasi stok mingguan/bulanan dari jam-jaman menjadi instan (1-klik generate report).

---

## 3. User Persona & Hak Akses (Role-Based Access Control)

| Parameter | Role 1: Admin Gudang (Hub Master) | Role 2: Staf Toko (Branch Requester) |
| :--- | :--- | :--- |
| **User Count** | 1 (atau Super Admin tim gudang) | 3 Akun Toko (Toko 1, Toko 2, Toko 3) |
| **Kewenangan Utama** | Mengelola stok pusat, approve/reject/partial-approve request, kirim barang, lihat rekap seluruh toko. | Mengelola stok lokal, input request barang, konfirmasi barang masuk. |
| **Visibilitas Data** | Seluruh data gudang pusat dan seluruh transaksi dari 3 toko. | **Hanya** data stok tokonya sendiri dan riwayat request tokonya sendiri. |
| **Aksi Terlarang** | Mengubah stok toko cabang secara sepihak tanpa mekanisme transfer. | Melihat data request/omset/stok milik toko cabang lain. |

---

## 4. End-to-End Business Process & Workflow

### 4.1 Alur Siklus Distribusi (Transfer Lifecycle)

```
[Staf Toko]                 [Sistem Database]                 [Admin Gudang]
     |                              |                               |
     |-- 1. Buat Transfer Request ->|                               |
     |   (Pilih Barang & Qty)       |-- Notifikasi Request Baru --->|
     |                              |                               |
     |                              |                         2. Cek Fisik/Stok
     |                              |                         3. Keputusan Otorisasi:
     |                              |                            - REJECT (Selesai)
     |                              |<-- 4. Set Status APPROVED -| (Full / Partial)
     |                              |   (Reserve Stok Gudang)       |
     |                              |                               |
     |                              |                         5. Packing & Kirim
     |                              |<-- 6. Set Status DISPATCHED --|
     |                              |   (Stok Gudang Berkurang,     |
     |                              |    Stok IN-TRANSIT Bertambah) |
     |                              |                               |
     |-- 7. Barang Tiba di Toko     |                               |
     |-- 8. Hitung Fisik & Verifikasi                               |
     |-- 9. Konfirmasi Terima ----->|                               |
     |   (Two-Way Handshake)        |-- 10. Ledger Update:          |
     |                              |    - Stok In-Transit = 0      |
     |                              |    - Stok Toko Bertambah      |
     |                              |    - Log Mutasi Terkunci      |
```

### 4.2 Aturan Bisnis (Core Business Rules)
1. **On-Demand Replenishment:** Tidak ada batas kuantiti minimal/maksimal request selama stok master terdaftar. Toko bisa request 1 pcs maupun ratusan pcs.
2. **Partial Approval:** Jika Toko A request 20 unit, tapi gudang hanya bisa menyuplai 12 unit, Admin Gudang berhak menyetujui sejumlah 12 unit dengan memberikan catatan sistem. Sisa 8 unit otomatis dibatalkan (*auto-close balance*) atau dibuatkan *backorder* sesuai flag konfigurasi.
3. **Pemisahan Entitas Stok (Zero Overwrite):**
   * Stok Gudang tidak boleh langsung pindah menjadi Stok Toko saat klik Approve.
   * Ada 3 tahap state kuantiti: `Available in Central` -> `In-Transit (Dispatched)` -> `Available in Store`.
4. **Mutasi Terikat (Immutability):** Setiap pengurangan stok di gudang wajib memiliki dokumen sumber (*Source Document ID*), yaitu `Transfer_Request_ID`. Tidak boleh ada stok keluar manual tanpa referensi.

---

## 5. Spesifikasi Kebutuhan Fungsional (Functional Requirements)

### FR-01: Manajemen Master Data & Multi-Location Inventory
* **FR-01.1:** Sistem wajib mendukung master data barang (SKU, Nama Barang, Kategori, Satuan/UoM, Minimum Safety Stock).
* **FR-01.2:** Sistem memisahkan *inventory balance* per lokasi entitas:
  * `Location_ID = 0`: Gudang Pusat.
  * `Location_ID = 1, 2, 3`: Toko 1, Toko 2, Toko 3.
* **FR-01.3:** Admin Gudang memiliki modul *Stock Inbound* (Barang Masuk dari Supplier/Vendor) untuk menambah saldo stok gudang pusat.

### FR-02: Modul Request Barang (Staf Toko)
* **FR-02.1:** Toko dapat memilih katalog barang aktif dan mengisi kuantiti permintaan.
* **FR-02.2:** Toko dapat menambahkan catatan pada request (contoh: *"Stok akhir pekan menipis"*).
* **FR-02.3:** Toko dapat memantau status dokumen secara *live*:
  * `DRAFT`
  * `PENDING_APPROVAL`
  * `APPROVED` / `PARTIALLY_APPROVED`
  * `REJECTED`
  * `IN_TRANSIT`
  * `COMPLETED`
  * `DISCREPANCY` (Selisih)

### FR-03: Modul Otorisasi & Alokasi Stok (Admin Gudang)
* **FR-03.1:** Admin Gudang menerima *real-time list* antrean permintaan yang di-filter per toko pemohon.
* **FR-03.2 (Stok Check Engine):** Sistem menampilkan perbandingan otomatis: `Qty Diminta` vs `Qty Tersedia di Gudang`.
* **FR-03.3:** Tindakan Admin Gudang:
  * **Approve Penuh:** Menyetujui sesuai kuantiti permintaan.
  * **Approve Parsial:** Mengubah angka yang disetujui (misal dari 50 jadi 30) dengan wajib mengisi alasan.
  * **Reject:** Menolak request dengan memilih/mengisi alasan (misal: *Stok Kosong*, *Mendekati Expired*).
* **FR-03.4 (Atomic Stock Reservation):** Ketika status berubah menjadi `APPROVED`, sistem mengunci (*reserve*) kuantiti tersebut dari stok bebas gudang untuk mencegah *race condition* (rebutan stok antar 3 toko).

### FR-04: Modul Pengiriman & Handshake Penerimaan (Dispatch & Receiving)
* **FR-04.1 (Dispatch):** Admin Gudang mengonfirmasi pengiriman barang fisik. Sistem mencetak Surat Jalan / Bukti Transfer Barang (Nomor Dokumen: `DO-YYYYMMDD-XXXX`). Stok gudang pusat resmi dipotong.
* **FR-04.2 (Receiving):** Staf Toko membuka dokumen terkait saat barang sampai, lalu menginput kuantiti aktual yang diterima fisik.
* **FR-04.3 (Handling Discrepancy):** 
  * Jika `Qty Diterima == Qty Dikirim`: Status menjadi `COMPLETED`. Stok toko bertambah utuh.
  * Jika `Qty Diterima < Qty Dikirim`: Staf toko wajib mencatat alasan (misal: 2 botol pecah di perjalanan). Sistem mencatat status `DISCREPANCY`, membuat tiket investigasi, dan mengalokasikan selisih ke akun kerugian / *Damaged Stock Ledger*.

### FR-05: Modul Pencatatan & Rekap Mutasi Barang Keluar (Reporting Engine)
* **FR-05.1:** Admin Gudang memiliki dasbor khusus: **Buku Besar Pengeluaran per Toko**.
* **FR-05.2 Filter Kustom:** 
  * Filter berdasarkan Rentang Tanggal (Harian, Mingguan, Bulanan, Custom).
  * Filter berdasarkan Toko Tujuan (Toko 1, Toko 2, Toko 3, atau All).
  * Filter berdasarkan Kategori / SKU Barang.
* **FR-05.3 Metrik Rekapitulasi:**
  * Total Qty Barang Keluar per Toko.
  * Frekuensi Request per Toko.
  * Rasio Pemenuhan (*Fulfillment Rate* = Qty Terkirim / Qty Diminta).
* **FR-05.4 Export:** Mendukung ekspor laporan ke format `.XLSX` (Excel) dan `.PDF`.

---

## 6. Desain Skema Database (Data Architecture)

Arsitektur database relasional (PostgreSQL / Supabase compatible) yang dirancang anti-selisih:

```sql
-- 1. Tabel Master Toko / Cabang (Locations)
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- 'Gudang Pusat', 'Toko 1', 'Toko 2', 'Toko 3'
    type VARCHAR(20) NOT NULL CHECK (type IN ('WAREHOUSE', 'STORE')),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Master Pengguna (Users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN_GUDANG', 'ORANG_TOKO')),
    location_id INT REFERENCES locations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel Master Barang (Items)
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50),
    unit VARCHAR(20) NOT NULL, -- 'PCS', 'BOX', 'KG', dll
    safety_stock INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabel Saldo Stok per Lokasi (Inventories)
CREATE TABLE inventories (
    id SERIAL PRIMARY KEY,
    location_id INT NOT NULL REFERENCES locations(id),
    item_id INT NOT NULL REFERENCES items(id),
    stock_available INT NOT NULL DEFAULT 0 CHECK (stock_available >= 0),
    stock_reserved INT NOT NULL DEFAULT 0 CHECK (stock_reserved >= 0),
    stock_in_transit INT NOT NULL DEFAULT 0 CHECK (stock_in_transit >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_location_item UNIQUE (location_id, item_id)
);

-- 5. Tabel Header Request / Transfer (Transfer Requests)
CREATE TABLE transfer_requests (
    id SERIAL PRIMARY KEY,
    request_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. TR-20260901-001
    from_location_id INT NOT NULL REFERENCES locations(id), -- Gudang Pusat
    to_location_id INT NOT NULL REFERENCES locations(id),   -- Toko 1/2/3
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

-- 6. Tabel Detail Request (Transfer Request Items)
CREATE TABLE transfer_request_items (
    id SERIAL PRIMARY KEY,
    transfer_request_id INT NOT NULL REFERENCES transfer_requests(id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES items(id),
    qty_requested INT NOT NULL CHECK (qty_requested > 0),
    qty_approved INT DEFAULT 0 CHECK (qty_approved >= 0),
    qty_dispatched INT DEFAULT 0 CHECK (qty_dispatched >= 0),
    qty_received INT DEFAULT 0 CHECK (qty_received >= 0),
    discrepancy_reason TEXT
);

-- 7. Tabel Buku Besar Mutasi Stok (Inventory Stock Mutations Ledger)
-- Tabel ini bersifat APPEND-ONLY untuk audit trail yang tidak bisa dimanipulasi
CREATE TABLE inventory_mutations (
    id BIGSERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES items(id),
    from_location_id INT REFERENCES locations(id),
    to_location_id INT REFERENCES locations(id),
    qty INT NOT NULL,
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
        'PURCHASE_INBOUND', 'TRANSFER_DISPATCH', 'TRANSFER_RECEIVE', 'DAMAGE_LOSS', 'MANUAL_ADJUSTMENT'
    )),
    reference_id INT, -- ID dari transfer_requests
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 7. Penanganan Kasus Kritis & Edge Cases

| Kasus Kritis (Edge Case) | Risiko Potensial | Mitigasi Solusi Sistem |
| :--- | :--- | :--- |
| **Race Condition Antar Toko** | Toko 1 dan Toko 2 request barang yang sama di waktu hampir bersamaan, stok gudang sisa 10 tapi di-request total 18. | Terapkan mekanisme Database Row-Level Locking (`SELECT FOR UPDATE`) pada `inventories` saat approval. Stok gudang langsung masuk ke `stock_reserved` seketika tombol approve dieksekusi. |
| **Barang Rusak / Hilang Saat Pengiriman** | Fisik sampai di toko kurang dari yang dicatat keluar oleh gudang. | Toko input angka riil di sistem (`qty_received < qty_dispatched`). Selisih kuantiti otomatis dicatat ke tabel `inventory_mutations` dengan tipe `DAMAGE_LOSS` dan tidak ditambahkan ke stok toko maupun gudang pusat. |
| **Admin Salah Approve** | Admin salah input kuantiti yang disetujui. | Selama status belum `DISPATCHED` (belum keluar fisik), Admin punya tombol "Revisi Approval". Jika sudah `DISPATCHED`, pembatalan harus melalui alur *Return/Transfer Balik*. |
| **Request Berulang dalam Jumlah Sedikit** | Toko mengirim 10 request berbeda dalam 1 jam untuk barang yang sama. | UI menampilkan banner informasi: *"Toko Anda memiliki request bertatus PENDING untuk barang X. Disarankan menggabungkan kuantiti."* Namun sistem tetap mengizinkan jika ada kebutuhan mendesak. |

---

## 8. Kebutuhan Non-Fungsional (Non-Functional Requirements)

1. **Integritas Transaksi (ACID Compliance):** Setiap transaksi perpindahan stok wajib dibungkus dalam blok Database Transaction (`BEGIN ... COMMIT`). Jika update di tabel mutasi gagal, pemotongan stok di tabel gudang otomatis di-`ROLLBACK`.
2. **Auditing & Traceability:** Tidak ada fitur `HARD DELETE` pada data transaksi mutasi dan transfer request. Pembatalan harus menggunakan mekanisme *Soft Delete* atau *Void Status* dengan pencatatan nama user dan alasan.
3. **Response Time:** Halaman rekapitulasi mutasi stok harus dapat menampilkan query hingga 100.000 baris riwayat transaksi dalam waktu `< 1.5 detik` menggunakan indexing pada `(location_id, item_id, created_at)`.
4. **Keamanan Data (Multi-Tenant Isolation):** Level API wajib memvalidasi `user.location_id`. Staf Toko 1 tidak dapat mengakses endpoint atau ID request milik Toko 2/3 (Mencegah kerentanan IDOR).

---

## 9. Rencana Implementasi & Roadmap

* **Fase 1 (Foundational Setup & Database):** Migrasi schema PostgreSQL, pembuatan master data lokasi, user RBAC, dan master produk.
* **Fase 2 (Core Request & Approval Flow):** Implementasi form transfer request untuk staf toko, dasbor antrean approval, dan mekanisme reservasi stok untuk admin gudang.
* **Fase 3 (Dispatch, Receiving & Two-Way Handshake):** Fitur cetak surat jalan transfer, konfirmasi terima barang di sisi toko, serta sistem pelaporan selisih (*discrepancy*).
* **Fase 4 (Ledger Reporting & Export):** Halaman dasbor analitik admin gudang, filter mutasi keluar per toko, dan fungsi export Excel/PDF.
