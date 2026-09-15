import React, { useState } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { TransferRequest } from '../../types';
import { StatusBadge } from '../common/Badge';
import { ReceivingHandshakeModal } from './ReceivingHandshakeModal';
import { SuratJalanModal } from '../documents/SuratJalanModal';
import { 
  ClipboardList, CheckSquare, Printer, Clock, 
  ChevronDown, ChevronUp
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

interface StoreRequestListProps {
  initialFilter?: 'ALL' | 'IN_TRANSIT' | 'PENDING' | 'COMPLETED';
}

export const StoreRequestList: React.FC<StoreRequestListProps> = ({ initialFilter = 'ALL' }) => {
  const { requests, items } = useInventory();
  const { currentLocation, locations, users } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [expandedReqId, setExpandedReqId] = useState<number | null>(null);

  // Modals state
  const [receivingRequest, setReceivingRequest] = useState<TransferRequest | null>(null);
  const [activeSuratJalan, setActiveSuratJalan] = useState<TransferRequest | null>(null);

  const itemMap = new Map(items.map(i => [i.id, i]));
  const myLocationId = currentLocation?.id;

  // Filter requests strictly to this store
  const storeRequests = requests.filter(r => {
    if (r.to_location_id !== myLocationId) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    return true;
  });

  const toggleExpand = (id: number) => {
    setExpandedReqId(prev => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" />
            <span>Riwayat Transfer Request (TR)</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            {storeRequests.length} dokumen permohonan cabang Anda
          </p>
        </div>

        {/* Filter Dropdown */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="ALL">Semua Status</option>
          <option value="IN_TRANSIT">Sedang Dikirim (In-Transit)</option>
          <option value="PENDING">Menunggu Otorisasi</option>
          <option value="APPROVED">Disetujui</option>
          <option value="COMPLETED">Selesai (100% Cocok)</option>
          <option value="DISCREPANCY">Terdapat Selisih (Loss)</option>
          <option value="REJECTED">Ditolak</option>
        </select>
      </div>

      {/* Requests List */}
      {storeRequests.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <ClipboardList className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Tidak Ada Dokumen
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Belum ada permintaan barang pada filter ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {storeRequests.map(req => {
            const isExpanded = expandedReqId === req.id;
            const totalRequested = req.items.reduce((s, i) => s + i.qty_requested, 0);

            return (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                {/* Header Summary */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {req.request_number}
                        </span>
                        <StatusBadge status={req.status} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDate(req.created_at)}</span>
                        {req.do_number && (
                          <>
                            <span>•</span>
                            <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                              {req.do_number}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExpand(req.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg active:scale-90"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Quick Summary of items */}
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">{req.items.length} SKU Barang</span> ({totalRequested} unit diminta)
                  </div>

                  {/* If In-Transit: Prominent Receive Button on Mobile */}
                  {req.status === 'IN_TRANSIT' && (
                    <button
                      onClick={() => setReceivingRequest(req)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md active:scale-95 transition-all animate-pulse"
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>Konfirmasi Terima Barang Sekarang</span>
                    </button>
                  )}
                </div>

                {/* Expandable Details */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 animate-in fade-in">
                    
                    <div className="space-y-2 mt-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Rincian Barang:
                      </span>
                      {req.items.map(item => {
                        const master = itemMap.get(item.item_id);
                        return (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[170px]">
                                {master?.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                SKU: {master?.sku}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="font-black text-slate-900 dark:text-white block">
                                Minta: {item.qty_requested} | Setuju: {item.qty_approved}
                              </span>
                              {item.qty_dispatched > 0 && (
                                <span className="text-[10px] font-semibold text-blue-500 block">
                                  Kirim: {item.qty_dispatched} {item.qty_received > 0 ? `| Diterima: ${item.qty_received}` : ''}
                                </span>
                              )}
                              {item.discrepancy_reason && (
                                <span className="text-[10px] text-rose-500 font-medium block">
                                  Selisih: {item.discrepancy_reason}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {req.request_notes && (
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                        <strong>Catatan Permintaan:</strong> {req.request_notes}
                      </div>
                    )}

                    {req.rejection_notes && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[11px] text-rose-700 dark:text-rose-300">
                        <strong>Catatan Admin Gudang:</strong> {req.rejection_notes}
                      </div>
                    )}

                    {req.do_number && (
                      <button
                        onClick={() => setActiveSuratJalan(req)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Lihat Dokumen Surat Jalan DO</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Receiving Handshake Modal */}
      {receivingRequest && (
        <ReceivingHandshakeModal
          isOpen={receivingRequest !== null}
          onClose={() => setReceivingRequest(null)}
          request={receivingRequest}
          items={items}
        />
      )}

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
