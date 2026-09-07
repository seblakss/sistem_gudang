# Sistem Manajemen Gudang & Distribusi Multi-Toko (Hub-and-Spoke)

Aplikasi Frontend berbasis **React 18 + Vite + TypeScript + Tailwind CSS** yang mengimplementasikan arsitektur distribusi inventori **1 Gudang Pusat (*Central Hub*) ke 3 Toko Retail (*Branch Spokes*)** sesuai spesifikasi [PRD.md](PRD.md).

---

## ✨ Fitur Unggulan

1. **Role-Based Access Control (RBAC) & Multi-Tenant Isolation:**
   - **Admin Gudang (*Hub Master*):** Mengelola master SKU, stock inbound supplier, otorisasi request, dispatch & surat jalan, serta buku besar mutasi.
   - **Staf Toko (*Spokes: Toko 1, Toko 2, Toko 3*):** Isolasi data stok cabang, form transfer request, dan serah terima penerimaan barang.
2. **Atomic Stock Reservation Engine:**
   - Stok gudang yang disetujui otomatis dikunci (*stock_reserved*) untuk mencegah *race condition* antar cabang.
3. **Surat Jalan / Delivery Order (DO) Generator:**
   - Format standar `DO-YYYYMMDD-XXXX` siap cetak (*Printable*) lengkap dengan area tanda tangan serah terima.
4. **Protokol Two-Way Handshake & Discrepancy Handling:**
   - Konfirmasi serah terima fisik dua arah saat barang tiba di cabang.
   - Jika kuantiti fisik kurang / rusak (`qty_received < qty_dispatched`), selisih otomatis dicatat ke akun kerugian `DAMAGE_LOSS` pada buku besar audit.
5. **Buku Besar Mutasi (*Append-Only Audit Ledger*):**
   - Riwayat mutasi lengkap tanpa overwrite.
   - Filter kustom: Rentang Tanggal, Toko Tujuan, Tipe Transaksi, dan Pencarian SKU.
   - Metrik KPI real-time (Fulfillment Rate, Total Inbound, Total Dispatch, Total Kerugian).
   - Ekspor laporan ke **Excel (.XLSX)** dan Cetak PDF.
6. **Quick Role Switcher & Live Simulation:**
   - Bar pengalih akun instan di header untuk mempermudah demonstrasi alur *Two-Way Handshake* secara cepat tanpa perlu logout berulang kali.
   - Opsi *Muat Data Sampel Cepat* & *Reset ke Data Kosong*.

---

## 🚀 Cara Menjalankan Aplikasi

1. **Instalasi Dependensi:**
   ```bash
   npm install
   ```

2. **Menjalankan Server Pengembangan (Dev Server):**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:5173`.

3. **Build untuk Produksi:**
   ```bash
   npm run build
   ```

---

## 🛠️ Alur Simulasi Uji Coba (End-to-End Test Flow)

1. **Pilih Akun / Role:** Buka aplikasi, gunakan **Role Switcher** di navbar untuk memilih peran:
   - `Admin Gudang`: Menambah SKU master atau melakukan Inbound stok dari supplier.
   - `Toko 1 / Toko 2 / Toko 3`: Masuk ke menu *Ajukan Permintaan (TR)* dan buat transfer request baru.
2. **Otorisasi Gudang:** Beralih ke `Admin Gudang` -> buka *Antrean Otorisasi* -> lakukan *Approve Penuh*, *Setujui Sebagian (Partial)*, atau *Tolak (Reject)*.
3. **Dispatch & Surat Jalan:** Admin Gudang membuka menu *Pengiriman & Surat Jalan* -> klik *Kirim Sekarang & Terbitkan Surat Jalan* -> lihat/cetak dokumen Surat Jalan DO.
4. **Penerimaan Toko (Two-Way Handshake):** Beralih ke toko pemohon -> klik *Konfirmasi Terima Barang* -> input kuantiti fisik aktual -> konfirmasi serah terima.
5. **Cek Buku Besar Mutasi:** Beralih ke Admin Gudang -> buka *Buku Besar Mutasi* -> tinjau catatan log mutasi dan unduh laporan Excel (.XLSX).
