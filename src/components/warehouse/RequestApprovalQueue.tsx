import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { TransferRequest } from '../../types';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/Badge';
import { 
  ClipboardList, CheckCircle2, AlertTriangle, 
  XCircle, Store, 
  AlertCircle, FileText, Plus, Minus, Download
} from 'lucide-react';
import { exportTransferRequestsToExcel } from '../../utils/exportHelpers';

export const RequestApprovalQueue: React.FC = () => {
  const { requests, items, inventories, authorizeRequest } = useInventory();
  const { currentUser, locations, users } = useAuth();

  const [selectedStoreFilter, setSelectedStoreFilter] = useState<number | 'ALL'>('ALL');
  
  // Action Modals State
  const [activeRequest, setActiveRequest] = useState<TransferRequest | null>(null);
  const [modalType, setModalType] = useState<'PARTIAL' | 'REJECT' | null>(null);
  const [partialQtys, setPartialQtys] = useState<{ [itemId: number]: number }>({});
  const [notes, setNotes] = useState<string>('');

  const itemMap = new Map(items.map(i => [i.id, i]));
  const locMap = new Map(locations.map(l => [l.id, l]));
  const userMap = new Map(users.map(u => [u.id, u]));

  // Gudang Pusat available stock helper
  const getWarehouseStock = (itemId: number) => {
    const inv = inventories.find(i => i.location_id === 0 && i.item_id === itemId);
    return inv ? inv.stock_available : 0;
  };

  const pendingRequests = requests.filter(r => {
    if (r.status !== 'PENDING') return false;
    if (selectedStoreFilter !== 'ALL' && r.to_location_id !== selectedStoreFilter) return false;
    return true;
  });

  const handleApproveFull = (req: TransferRequest) => {
    if (!currentUser) return;
    
    // Validate if warehouse has enough stock
    for (const item of req.items) {
      const stock = getWarehouseStock(item.item_id);
      if (stock < item.qty_requested) {
        alert(`Stok tidak cukup untuk SKU ID ${item.item_id}. Silakan gunakan opsi Setujui Parsial.`);
        return;
      }
    }

    if (confirm(`Setujui penuh ${req.request_number}? Stok gudang akan otomatis dikunci (Reserved).`)) {
      authorizeRequest(req.id, currentUser.id, 'APPROVE_FULL');
    }
  };

  const openPartialModal = (req: TransferRequest) => {
    setActiveRequest(req);
    const initial: { [itemId: number]: number } = {};
    req.items.forEach(item => {
      const available = getWarehouseStock(item.item_id);
      initial[item.item_id] = Math.min(item.qty_requested, available);
    });
    setPartialQtys(initial);
    setNotes('Stok dialokasikan sebagian sesuai ketersediaan fisik.');
    setModalType('PARTIAL');
  };

  const openRejectModal = (req: TransferRequest) => {
    setActiveRequest(req);
    setNotes('Stok gudang pusat sedang kosong / tidak mencukupi.');
    setModalType('REJECT');
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest || !currentUser) return;

    if (modalType === 'PARTIAL') {
      const approvedItems = activeRequest.items.map(item => ({
        itemId: item.item_id,
        qtyApproved: partialQtys[item.item_id] !== undefined ? partialQtys[item.item_id] : item.qty_requested,
      }));

      authorizeRequest(activeRequest.id, currentUser.id, 'APPROVE_PARTIAL', {
        approvedItems,
        rejectionNotes: notes,
      });
    } else if (modalType === 'REJECT') {
      if (!notes.trim()) {
        alert('Wajib menyertakan alasan penolakan.');
        return;
      }
      authorizeRequest(activeRequest.id, currentUser.id, 'REJECT', {
        rejectionNotes: notes,
      });
    }

    setModalType(null);
    setActiveRequest(null);
  };

  const handleExportExcel = () => {
    exportTransferRequestsToExcel(
      requests,
      items,
      locations,
      users,
      currentUser?.full_name || 'Admin Gudang Pusat'
    );
  };

  return (
    <div className="space-y-4 pb-20 sm:pb-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-600" />
            <span>Antrean Otorisasi (TR)</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            {pendingRequests.length} permohonan stok dari toko cabang menunggu keputusan
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Store Selector */}
          <select
            value={selectedStoreFilter}
            onChange={e => setSelectedStoreFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:outline-none"
          >
            <option value="ALL">Semua Cabang Toko</option>
            <option value={1}>Toko 1 (Cabang Barat)</option>
            <option value={2}>Toko 2 (Cabang Selatan)</option>
            <option value={3}>Toko 3 (Cabang Timur)</option>
          </select>

          <button
            onClick={handleExportExcel}
            disabled={requests.length === 0}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm active:scale-95 disabled:opacity-50 transition-all shrink-0"
            title="Export Rekap Permintaan Toko ke Excel"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* List Requests */}
      {pendingRequests.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Tidak Ada Antrean Pending
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Semua permintaan barang cabang telah diotorisasi.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {pendingRequests.map(req => {
            const destinationStore = locMap.get(req.to_location_id);
            const requester = userMap.get(req.requested_by);

            let hasShortage = false;
            req.items.forEach(item => {
              const stock = getWarehouseStock(item.item_id);
              if (stock < item.qty_requested) hasShortage = true;
            });

            return (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                {/* Header Card */}
                <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {req.request_number}
                      </span>
                      <StatusBadge status={req.status} size="sm" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                      <Store className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {destinationStore?.name}
                      </span>
                      <span>•</span>
                      <span>{requester?.full_name?.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>

                {/* Items in Request */}
                <div className="p-4 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Daftar Permintaan & Komparasi Stok:
                  </span>

                  <div className="space-y-2">
                    {req.items.map(item => {
                      const masterItem = itemMap.get(item.item_id);
                      const warehouseStock = getWarehouseStock(item.item_id);
                      const isEnough = warehouseStock >= item.qty_requested;

                      return (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-slate-900 dark:text-white block truncate">
                              {masterItem?.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              SKU: {masterItem?.sku}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-bold text-slate-900 dark:text-white">
                              Minta: <span className="text-sm font-black">{item.qty_requested}</span> {masterItem?.unit || 'PCS'}
                            </div>
                            <div className={`text-[10px] font-semibold ${isEnough ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              Gudang: {warehouseStock} {isEnough ? '(Cukup)' : `(Kurang ${item.qty_requested - warehouseStock})`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {req.request_notes && (
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>Catatan: {req.request_notes}</span>
                    </div>
                  )}

                  {hasShortage && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Stok gudang kurang. Gunakan <strong>Setujui Parsial</strong>.</span>
                    </div>
                  )}
                </div>

                {/* Mobile Full-width Action Buttons */}
                <div className="p-3 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => openRejectModal(req)}
                    className="flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 active:scale-95 transition-transform"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Tolak</span>
                  </button>

                  <button
                    onClick={() => openPartialModal(req)}
                    className="flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 border border-purple-200 dark:border-purple-900 active:scale-95 transition-transform"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Parsial</span>
                  </button>

                  <button
                    onClick={() => handleApproveFull(req)}
                    className="flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm active:scale-95 transition-transform"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Otorisasi (Partial / Reject) */}
      <Modal
        isOpen={modalType !== null}
        onClose={() => {
          setModalType(null);
          setActiveRequest(null);
        }}
        title={modalType === 'PARTIAL' ? 'Otorisasi Sebagian (Partial)' : 'Tolak Permintaan (Reject TR)'}
        subtitle={`Dokumen: ${activeRequest?.request_number}`}
        maxWidth="md"
      >
        <form onSubmit={handleModalSubmit} className="space-y-4">
          {modalType === 'PARTIAL' && activeRequest && (
            <div className="space-y-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Sesuaikan kuantiti yang disetujui sesuai ketersediaan stok fisik gudang:
              </span>

              <div className="space-y-2">
                {activeRequest.items.map(item => {
                  const masterItem = itemMap.get(item.item_id);
                  const available = getWarehouseStock(item.item_id);
                  const currentApproved = partialQtys[item.item_id] ?? Math.min(item.qty_requested, available);

                  return (
                    <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {masterItem?.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Minta: {item.qty_requested} | Gudang: {available}
                        </span>
                      </div>

                      {/* Touch Stepper [-] [qty] [+] */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-semibold text-slate-500">Kuantiti Disetujui:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPartialQtys({
                              ...partialQtys,
                              [item.item_id]: Math.max(0, currentApproved - 1),
                            })}
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-90"
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            max={available}
                            value={currentApproved}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              setPartialQtys({
                                ...partialQtys,
                                [item.item_id]: Math.min(val, available),
                              });
                            }}
                            className="w-16 py-1 text-center font-black text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />

                          <button
                            type="button"
                            onClick={() => setPartialQtys({
                              ...partialQtys,
                              [item.item_id]: Math.min(available, currentApproved + 1),
                            })}
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
            </div>
          )}

          {/* Reason / Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              {modalType === 'PARTIAL' ? 'Catatan / Alasan Penyesuaian' : 'Alasan Penolakan (Wajib)'}
            </label>
            <textarea
              rows={3}
              required
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Tuliskan alasan jelas..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setModalType(null);
                setActiveRequest(null);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className={`w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-bold text-white shadow-md active:scale-95 ${
                modalType === 'PARTIAL'
                  ? 'bg-purple-600 hover:bg-purple-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {modalType === 'PARTIAL' ? 'Konfirmasi Parsial' : 'Konfirmasi Tolak'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
