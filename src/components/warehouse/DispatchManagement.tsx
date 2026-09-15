import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { TransferRequest } from '../../types';
import { StatusBadge } from '../common/Badge';
import { SuratJalanModal } from '../documents/SuratJalanModal';
import { 
  Send, Truck, Printer, Store, 
  PackageCheck, CheckCircle2, Download
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { exportTransferRequestsToExcel } from '../../utils/exportHelpers';

export const DispatchManagement: React.FC = () => {
  const { requests, items, dispatchRequest } = useInventory();
  const { currentUser, locations, users } = useAuth();

  const [activeSuratJalan, setActiveSuratJalan] = useState<TransferRequest | null>(null);

  const itemMap = new Map(items.map(i => [i.id, i]));
  const locMap = new Map(locations.map(l => [l.id, l]));

  // Ready for dispatch (APPROVED / PARTIAL)
  const readyToDispatch = requests.filter(r => r.status === 'APPROVED' || r.status === 'PARTIAL');

  // Currently In-Transit (DISPATCHED)
  const activeInTransit = requests.filter(r => r.status === 'IN_TRANSIT');

  const handleDispatch = async (req: TransferRequest) => {
    if (!currentUser) return;
    if (confirm(`Konfirmasi pengiriman fisik barang untuk ${req.request_number}? Stok Gudang akan dipotong dan nomor Surat Jalan DO diterbitkan.`)) {
      try {
        await dispatchRequest(req.id, currentUser.id);
      } catch {
        // Handled by toast
      }
    }
  };

  const handleExportExcel = () => {
    exportTransferRequestsToExcel(
      requests,
      items,
      locations,
      users,
      currentUser?.full_name || 'Admin Gudang Pusat',
      'Laporan_Pengiriman_dan_Surat_Jalan.xlsx'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-brand-600" />
            <span>Pengiriman & Surat Jalan (DO)</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            Proses dispatch fisik dan pantau status barang in-transit di jalan
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={requests.length === 0}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm active:scale-95 disabled:opacity-50 transition-all shrink-0"
          title="Export Status Pengiriman & Surat Jalan ke Excel"
        >
          <Download className="w-4 h-4" />
          <span>Excel</span>
        </button>
      </div>

      {/* Section 1: Siap Kirim (Pending Packing & Dispatch) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Siap Di-Dispatch ({readyToDispatch.length})</span>
          </h3>
        </div>

        {readyToDispatch.length === 0 ? (
          <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <PackageCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
            <p className="text-xs text-slate-400">
              Tidak ada antrean barang siap kirim.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readyToDispatch.map(req => {
              const dest = locMap.get(req.to_location_id);
              const totalItems = req.items.reduce((sum, i) => sum + i.qty_approved, 0);

              return (
                <div
                  key={req.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                        {req.request_number}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <Store className="w-3.5 h-3.5 text-brand-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {dest?.name}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={req.status} size="sm" />
                  </div>

                  {/* Rincian Ringkas */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Total: {totalItems} Unit ({req.items.length} SKU)
                    </span>
                    {req.items.slice(0, 3).map(item => {
                      const mItem = itemMap.get(item.item_id);
                      return (
                        <div key={item.id} className="flex justify-between text-[11px]">
                          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[180px]">
                            {mItem?.name}
                          </span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {item.qty_approved} {mItem?.unit || 'PCS'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dispatch Action */}
                  <button
                    onClick={() => handleDispatch(req)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md active:scale-95 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim Sekarang & Terbitkan DO</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Sedang Dalam Perjalanan (In-Transit) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Sedang In-Transit ({activeInTransit.length})</span>
          </h3>
        </div>

        {activeInTransit.length === 0 ? (
          <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
            <p className="text-xs text-slate-400">
              Tidak ada pengiriman in-transit saat ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeInTransit.map(req => {
              const dest = locMap.get(req.to_location_id);
              const totalDispatched = req.items.reduce((sum, i) => sum + i.qty_dispatched, 0);

              return (
                <div
                  key={req.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900/60 p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400 block">
                        {req.do_number}
                      </span>
                      <span className="text-xs text-slate-500">Ref: {req.request_number}</span>
                    </div>
                    <StatusBadge status={req.status} size="sm" />
                  </div>

                  <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs">
                    <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                      <span>Tujuan: {dest?.name}</span>
                      <span className="text-blue-600 dark:text-blue-400">{totalDispatched} unit di jalan</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Waktu Kirim: {formatDate(req.dispatched_at)}
                    </span>
                  </div>

                  <button
                    onClick={() => setActiveSuratJalan(req)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform"
                  >
                    <Printer className="w-4 h-4 text-slate-500" />
                    <span>Lihat / Cetak Surat Jalan</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Surat Jalan Modal */}
      {activeSuratJalan && (
        <SuratJalanModal
          isOpen={activeSuratJalan !== null}
          onClose={() => setActiveSuratJalan(null)}
          request={activeSuratJalan}
          locations={locations}
          items={items}
          users={users}
        />
      )}
    </div>
  );
};
