import React, { useState } from 'react';
import { Item } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { ArrowDownRight, Building, FileText, CheckCircle2 } from 'lucide-react';

interface InboundStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
  preselectedItemId?: number;
}

export const InboundStockModal: React.FC<InboundStockModalProps> = ({
  isOpen,
  onClose,
  items,
  preselectedItemId,
}) => {
  const { inboundStock } = useInventory();
  const { currentUser } = useAuth();

  const [itemId, setItemId] = useState<number>(preselectedItemId || (items[0]?.id ?? 1));
  const [qty, setQty] = useState<number>(100);
  const [supplierName, setSupplierName] = useState<string>('PT. Distribusi Utama Prima');
  const [notes, setNotes] = useState<string>('Penerimaan PO Pabrik / Supplier');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync when preselected item changes
  React.useEffect(() => {
    if (preselectedItemId) {
      setItemId(preselectedItemId);
    } else if (items.length > 0 && !items.some(i => i.id === itemId)) {
      setItemId(items[0].id);
    }
  }, [preselectedItemId, items]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (qty <= 0) {
      alert('Jumlah kuantiti harus lebih dari 0');
      return;
    }

    setIsSubmitting(true);
    try {
      inboundStock(Number(itemId), Number(qty), notes, currentUser.id, supplierName);
      onClose();
      // Reset form defaults
      setQty(100);
      setNotes('Penerimaan PO Pabrik / Supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedItem = items.find(i => i.id === Number(itemId));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Inbound (Penerimaan Barang Masuk)"
      subtitle="Menambah saldo fisik stok Gudang Pusat dari Supplier / Vendor"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pilih Barang */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Pilih Barang / SKU
          </label>
          {items.length === 0 ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
              Belum ada master barang. Silakan tambahkan master barang terlebih dahulu.
            </div>
          ) : (
            <select
              value={itemId}
              onChange={e => setItemId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  [{item.sku}] {item.name} ({item.unit})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Kuantiti & Satuan */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Kuantiti Masuk
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                required
                value={qty}
                onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <ArrowDownRight className="w-4 h-4 text-emerald-500 absolute right-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Satuan
            </label>
            <input
              type="text"
              disabled
              value={selectedItem?.unit || 'PCS'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-semibold cursor-not-allowed"
            />
          </div>
        </div>

        {/* Supplier */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Nama Supplier / Pabrik
          </label>
          <div className="relative">
            <input
              type="text"
              value={supplierName}
              onChange={e => setSupplierName(e.target.value)}
              placeholder="Contoh: PT. Sumber Makmur Perkasa"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
            <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
        </div>

        {/* Catatan / Nomor PO */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Nomor PO / Catatan Penerimaan
          </label>
          <div className="relative">
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Catatan barang masuk..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
        </div>

        {/* Ledger Alert Info */}
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Append-Only Ledger: </span>
            Aksi ini akan otomatis mencatat mutasi <code className="px-1 py-0.5 bg-emerald-100 dark:bg-emerald-900 rounded font-mono text-[10px]">PURCHASE_INBOUND</code> ke buku besar audit tanpa overwrite.
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Simpan Inbound Stok</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
