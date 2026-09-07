import React, { useState } from 'react';
import { TransferRequest, Item } from '../../types';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { 
  CheckCircle2, AlertTriangle, ShieldCheck, Plus, Minus
} from 'lucide-react';

interface ReceivingHandshakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: TransferRequest;
  items: Item[];
}

export const ReceivingHandshakeModal: React.FC<ReceivingHandshakeModalProps> = ({
  isOpen,
  onClose,
  request,
  items,
}) => {
  const { receiveTransfer } = useInventory();
  const { currentUser } = useAuth();

  const itemMap = new Map(items.map(i => [i.id, i]));

  // State actual received quantities & reasons
  const [receivedQtys, setReceivedQtys] = useState<{ [itemId: number]: number }>(() => {
    const initial: { [itemId: number]: number } = {};
    request.items.forEach(item => {
      initial[item.item_id] = item.qty_dispatched;
    });
    return initial;
  });

  const [discrepancyReasons, setDiscrepancyReasons] = useState<{ [itemId: number]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasDiscrepancy = request.items.some(item => {
    const actual = receivedQtys[item.item_id] ?? item.qty_dispatched;
    return actual < item.qty_dispatched;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Validate reason if discrepancy exists
    if (hasDiscrepancy) {
      for (const item of request.items) {
        const actual = receivedQtys[item.item_id] ?? item.qty_dispatched;
        if (actual < item.qty_dispatched) {
          const reason = discrepancyReasons[item.item_id];
          if (!reason || !reason.trim()) {
            alert(`Wajib mengisi alasan selisih/kerusakan untuk item.`);
            return;
          }
        }
      }
    }

    setIsSubmitting(true);
    try {
      const payload = request.items.map(item => ({
        itemId: item.item_id,
        qtyReceived: receivedQtys[item.item_id] ?? item.qty_dispatched,
        discrepancyReason: discrepancyReasons[item.item_id] || '',
      }));

      receiveTransfer(request.id, currentUser.id, payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Serah Terima Fisik Barang"
      subtitle={`DO: ${request.do_number} • Ref: ${request.request_number}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Verification Info Box */}
        <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="font-bold block">Two-Way Handshake:</span>
            <p className="text-slate-600 dark:text-slate-300">
              Hitung fisik yang diterima. Stok toko Anda bertambah sesuai <strong>Qty Diterima Fisik</strong>. Selisih otomatis dicatat ke loss ledger.
            </p>
          </div>
        </div>

        {/* Item Rows Verification */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Verifikasi Kuantiti Aktual per Barang:
          </span>

          <div className="space-y-2.5">
            {request.items.map(item => {
              const masterItem = itemMap.get(item.item_id);
              const currentQtyReceived = receivedQtys[item.item_id] ?? item.qty_dispatched;
              const isShort = currentQtyReceived < item.qty_dispatched;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                    isShort
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                        {masterItem?.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        SKU: {masterItem?.sku} • Surat Jalan (DO): <strong>{item.qty_dispatched} {masterItem?.unit || 'PCS'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Touch Stepper [-] [counter] [+] */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-xs font-semibold text-slate-500">Qty Diterima:</span>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReceivedQtys({
                          ...receivedQtys,
                          [item.item_id]: Math.max(0, currentQtyReceived - 1),
                        })}
                        className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-90"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        max={item.qty_dispatched}
                        value={currentQtyReceived}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          setReceivedQtys({
                            ...receivedQtys,
                            [item.item_id]: Math.min(val, item.qty_dispatched),
                          });
                        }}
                        className={`w-16 py-1.5 text-center font-black text-sm rounded-xl border ${
                          isShort
                            ? 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                            : 'border-slate-200 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => setReceivedQtys({
                          ...receivedQtys,
                          [item.item_id]: Math.min(item.qty_dispatched, currentQtyReceived + 1),
                        })}
                        className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-90"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Discrepancy Reason */}
                  {isShort && (
                    <div className="pt-2 border-t border-rose-200 dark:border-rose-900/40 space-y-1">
                      <span className="text-[10px] font-bold text-rose-600 block">
                        Kurang {item.qty_dispatched - currentQtyReceived} {masterItem?.unit}. Wajib isi alasan:
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 2 botol pecah di jalan..."
                        value={discrepancyReasons[item.item_id] || ''}
                        onChange={e => setDiscrepancyReasons({
                          ...discrepancyReasons,
                          [item.item_id]: e.target.value,
                        })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-rose-300"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold text-white shadow-md active:scale-95 transition-all ${
              hasDiscrepancy
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
            }`}
          >
            {hasDiscrepancy ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                <span>Konfirmasi Serah Terima (Ada Selisih)</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Konfirmasi Serah Terima (100% Sesuai)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
