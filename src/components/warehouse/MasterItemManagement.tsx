import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { InboundStockModal } from './InboundStockModal';
import { 
  Package, Plus, ArrowDownRight, Search, 
  ShieldAlert, Boxes, Download
} from 'lucide-react';
import { formatNumber, formatRupiah } from '../../utils/formatters';
import { exportMasterItemsToExcel } from '../../utils/exportHelpers';

export const MasterItemManagement: React.FC = () => {
  const { items, inventories, addNewItem } = useInventory();
  const { locations, currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  // Modals state
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isInboundOpen, setIsInboundOpen] = useState(false);
  const [selectedInboundItemId, setSelectedInboundItemId] = useState<number | undefined>(undefined);

  // Form State New Item
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'Elektronik',
    unit: 'PCS',
    price: 50000,
    safety_stock: 10,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['ALL', ...Array.from(new Set(items.map(i => i.category || 'Umum')))];

  const filteredItems = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku || !formData.name || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addNewItem({
        sku: formData.sku.trim().toUpperCase(),
        name: formData.name.trim(),
        category: formData.category.trim(),
        unit: formData.unit.trim().toUpperCase(),
        price: Number(formData.price) || 0,
        safety_stock: Number(formData.safety_stock) || 0,
      });
      setIsAddItemOpen(false);
      setFormData({
        sku: '',
        name: '',
        category: 'Elektronik',
        unit: 'PCS',
        price: 50000,
        safety_stock: 10,
      });
    } catch {
      // Handled by toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const openInboundForItem = (itemId: number) => {
    setSelectedInboundItemId(itemId);
    setIsInboundOpen(true);
  };

  // Helper to get inventory
  const getInv = (locationId: number, itemId: number) => {
    return inventories.find(inv => inv.location_id === locationId && inv.item_id === itemId) || {
      stock_available: 0,
      stock_reserved: 0,
      stock_in_transit: 0,
    };
  };

  const handleExportExcel = () => {
    exportMasterItemsToExcel(
      filteredItems,
      inventories,
      locations,
      currentUser?.full_name || 'Admin Gudang Pusat'
    );
  };

  return (
    <div className="space-y-4 pb-20 sm:pb-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-600" />
            <span>Master SKU & Stok</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            {items.length} SKU terdaftar di Gudang Pusat
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportExcel}
            disabled={items.length === 0}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm active:scale-95 disabled:opacity-50 transition-all"
            title="Export Data SKU & Stok ke Excel"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            onClick={() => {
              setSelectedInboundItemId(items[0]?.id);
              setIsInboundOpen(true);
            }}
            disabled={items.length === 0}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-sm active:scale-95 disabled:opacity-50 transition-all"
          >
            <ArrowDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Inbound</span>
          </button>

          <button
            onClick={() => setIsAddItemOpen(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ SKU</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari SKU atau nama barang..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          />
        </div>

        {/* Horizontal Category Scroll for touch */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Card List View */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <Boxes className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Belum Ada Master SKU
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Tambahkan SKU baru atau gunakan tombol "Data Demo" di pojok kanan atas.
          </p>
          <button
            onClick={() => setIsAddItemOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah SKU</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredItems.map(item => {
            const hubInv = getInv(0, item.id);
            const store1Inv = getInv(1, item.id);
            const store2Inv = getInv(2, item.id);
            const store3Inv = getInv(3, item.id);

            const isLowStockInHub = hubInv.stock_available <= item.safety_stock;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-3"
              >
                {/* Header Card */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                          {item.name}
                        </span>
                        {isLowStockInHub && (
                          <span title="Stok Menipis">
                            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="font-mono tabular-nums text-[11px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded-lg border border-brand-200/60 dark:border-brand-900/60">
                          {item.sku}
                        </span>
                        <span className="text-[11px] font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-900/60">
                          {formatRupiah(item.price || 0)}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => openInboundForItem(item.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-95 transition-all shrink-0"
                    >
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      <span>Inbound</span>
                    </button>
                  </div>
                </div>

                {/* Central Warehouse Quantities */}
                <div className="grid grid-cols-3 gap-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Gudang Bebas</span>
                    <span className="text-base font-bold font-mono tabular-nums text-brand-600 dark:text-brand-400">
                      {formatNumber(hubInv.stock_available)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Terkunci</span>
                    <span className="text-base font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                      {formatNumber(hubInv.stock_reserved)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">In-Transit</span>
                    <span className="text-base font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                      {formatNumber(hubInv.stock_in_transit)}
                    </span>
                  </div>
                </div>

                {/* Stock across 3 stores breakdown */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">3 Cabang:</span>
                  <div className="flex items-center gap-1.5 font-mono tabular-nums font-bold text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      T1: {store1Inv.stock_available}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      T2: {store2Inv.stock_available}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      T3: {store3Inv.stock_available}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add Item */}
      <Modal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        title="Daftarkan Master SKU Baru"
        subtitle="Barang akan terdaftar di katalog pusat dan dapat diminta toko"
        maxWidth="md"
      >
        <form onSubmit={handleCreateItem} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Kode SKU (Unique Barcode/ID)
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: SKU-ELK-001"
              value={formData.sku}
              onChange={e => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Barang / Produk
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Wireless Barcode Scanner 2D"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Kategori
              </label>
              <input
                type="text"
                required
                placeholder="Elektronik"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Satuan / UoM
              </label>
              <input
                type="text"
                required
                placeholder="PCS / BOX"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold uppercase focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Harga Satuan (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                required
                placeholder="50000"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Minimum Safety Stock
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.safety_stock}
                onChange={e => setFormData({ ...formData, safety_stock: parseInt(e.target.value) || 0 })}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddItemOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Master SKU'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Inbound */}
      <InboundStockModal
        isOpen={isInboundOpen}
        onClose={() => setIsInboundOpen(false)}
        items={items}
        preselectedItemId={selectedInboundItemId}
      />
    </div>
  );
};
