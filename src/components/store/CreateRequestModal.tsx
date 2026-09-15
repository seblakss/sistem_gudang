import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { 
  Plus, Trash2, Send, AlertTriangle, 
  FileText, Minus
} from 'lucide-react';
import { formatRupiah } from '../../utils/formatters';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ItemRow {
  itemId: number;
  qtyRequested: number;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { items, requests, createRequest } = useInventory();
  const { currentUser, currentLocation } = useAuth();

  const [rows, setRows] = useState<ItemRow[]>([{ itemId: items[0]?.id || 1, qtyRequested: 10 }]);
  const [notes, setNotes] = useState<string>('Pengisian stok toko harian');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (items.length > 0 && (!rows[0] || !items.some(i => i.id === rows[0].itemId))) {
      setRows([{ itemId: items[0].id, qtyRequested: 10 }]);
    }
  }, [items]);

  const itemMap = new Map(items.map(i => [i.id, i]));

  // Calculate Total Estimated Value
  const totalEstimatedValue = rows.reduce((sum, row) => {
    const itm = itemMap.get(row.itemId);
    return sum + ((itm?.price || 0) * (row.qtyRequested || 0));
  }, 0);

  const myLocationId = currentLocation?.id;
  const activePendingReqs = requests.filter(
    r => r.to_location_id === myLocationId && r.status === 'PENDING'
  );

  const pendingItemIds = new Set<number>();
  activePendingReqs.forEach(r => r.items.forEach(i => pendingItemIds.add(i.item_id)));

  const conflictingItems = rows.filter(r => pendingItemIds.has(r.itemId));

  const handleAddRow = () => {
    const usedIds = new Set(rows.map(r => r.itemId));
    const availableItem = items.find(i => !usedIds.has(i.id)) || items[0];
    if (availableItem) {
      setRows([...rows, { itemId: availableItem.id, qtyRequested: 10 }]);
    }
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, idx) => idx !== index));
  };

  const handleRowChange = (index: number, field: keyof ItemRow, val: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: val };
    setRows(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !myLocationId) return;

    if (items.length === 0) {
      alert('Belum ada master barang di sistem.');
      return;
    }

    const validRows = rows.filter(r => r.qtyRequested > 0);
    if (validRows.length === 0) {
      alert('Pilih minimal 1 barang dengan kuantiti > 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createRequest(myLocationId, currentUser.id, validRows, notes);
      onClose();
      setRows([{ itemId: items[0]?.id || 1, qtyRequested: 10 }]);
      setNotes('Pengisian stok toko harian');
    } catch {
      // Handled by toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buat Transfer Request (TR)"
      subtitle={`Pengajuan dari ${currentLocation?.name}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Items Input List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Barang & Kuantiti Permintaan:
            </label>
            <button
              type="button"
              onClick={handleAddRow}
              disabled={items.length === 0}
              className="flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Baris</span>
            </button>
          </div>

          {items.length === 0 ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              Belum ada katalog barang terdaftar di Gudang Pusat.
            </div>
          ) : (
            <div className="space-y-2.5">
              {rows.map((row, idx) => {
                const currentItem = itemMap.get(row.itemId);
                const subtotal = (currentItem?.price || 0) * row.qtyRequested;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                  >
                    {/* Select Item */}
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={row.itemId}
                        onChange={e => handleRowChange(idx, 'itemId', Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                      >
                        {items.map(i => (
                          <option key={i.id} value={i.id}>
                            [{i.sku}] {i.name} • {formatRupiah(i.price || 0)} / {i.unit}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={rows.length === 1}
                        className="p-2 text-slate-400 hover:text-rose-500 disabled:opacity-20 active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quantity Stepper & Subtotal on Mobile */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          Subtotal: <strong className="text-emerald-600 dark:text-emerald-400">{formatRupiah(subtotal)}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRowChange(idx, 'qtyRequested', Math.max(1, row.qtyRequested - 5))}
                          className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-90"
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <input
                          type="number"
                          min="1"
                          required
                          value={row.qtyRequested}
                          onChange={e => handleRowChange(idx, 'qtyRequested', Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-16 py-1 text-center font-black text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />

                        <button
                          type="button"
                          onClick={() => handleRowChange(idx, 'qtyRequested', row.qtyRequested + 5)}
                          className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-90"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Total Estimated Value Summary */}
        <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between text-xs">
          <span className="font-semibold text-emerald-800 dark:text-emerald-300">
            Estimasi Total Nilai Barang:
          </span>
          <span className="font-black text-sm text-emerald-700 dark:text-emerald-400">
            {formatRupiah(totalEstimatedValue)}
          </span>
        </div>

        {/* Warning Banner for Duplicate Pending Items */}
        {conflictingItems.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Toko Anda memiliki request pending untuk barang yang sama. Pengajuan tetap diproses jika mendesak.</span>
          </div>
        )}

        {/* Request Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Catatan Tambahan
          </label>
          <div className="relative">
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Contoh: Stok akhir pekan menipis..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/20 disabled:opacity-50 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Kirim Transfer Request ({formatRupiah(totalEstimatedValue)})</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
