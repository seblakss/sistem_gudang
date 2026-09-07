import { TransferRequestStatus, TransactionType } from '../types';

export function formatDate(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function getStatusBadgeConfig(status: TransferRequestStatus): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
} {
  switch (status) {
    case 'PENDING':
      return {
        label: 'Menunggu Persetujuan',
        bgClass: 'bg-amber-50 dark:bg-amber-950/40',
        textClass: 'text-amber-700 dark:text-amber-300',
        borderClass: 'border-amber-200 dark:border-amber-800',
        dotClass: 'bg-amber-500',
      };
    case 'APPROVED':
      return {
        label: 'Disetujui Penuh',
        bgClass: 'bg-indigo-50 dark:bg-indigo-950/40',
        textClass: 'text-indigo-700 dark:text-indigo-300',
        borderClass: 'border-indigo-200 dark:border-indigo-800',
        dotClass: 'bg-indigo-500',
      };
    case 'PARTIAL':
      return {
        label: 'Disetujui Sebagian',
        bgClass: 'bg-purple-50 dark:bg-purple-950/40',
        textClass: 'text-purple-700 dark:text-purple-300',
        borderClass: 'border-purple-200 dark:border-purple-800',
        dotClass: 'bg-purple-500',
      };
    case 'IN_TRANSIT':
      return {
        label: 'Dalam Pengiriman',
        bgClass: 'bg-blue-50 dark:bg-blue-950/40',
        textClass: 'text-blue-700 dark:text-blue-300',
        borderClass: 'border-blue-200 dark:border-blue-800',
        dotClass: 'bg-blue-500 animate-pulse',
      };
    case 'COMPLETED':
      return {
        label: 'Selesai (100% Sesuai)',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
        textClass: 'text-emerald-700 dark:text-emerald-300',
        borderClass: 'border-emerald-200 dark:border-emerald-800',
        dotClass: 'bg-emerald-500',
      };
    case 'DISCREPANCY':
      return {
        label: 'Selisih (Discrepancy)',
        bgClass: 'bg-rose-50 dark:bg-rose-950/40',
        textClass: 'text-rose-700 dark:text-rose-300',
        borderClass: 'border-rose-200 dark:border-rose-800',
        dotClass: 'bg-rose-500',
      };
    case 'REJECTED':
      return {
        label: 'Ditolak',
        bgClass: 'bg-slate-100 dark:bg-slate-800',
        textClass: 'text-slate-700 dark:text-slate-300',
        borderClass: 'border-slate-300 dark:border-slate-700',
        dotClass: 'bg-slate-400',
      };
    default:
      return {
        label: status,
        bgClass: 'bg-slate-100 dark:bg-slate-800',
        textClass: 'text-slate-700 dark:text-slate-300',
        borderClass: 'border-slate-200 dark:border-slate-700',
        dotClass: 'bg-slate-400',
      };
  }
}

export function getTransactionTypeBadge(type: TransactionType): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  switch (type) {
    case 'PURCHASE_INBOUND':
      return { label: 'Inbound Supplier', bgClass: 'bg-emerald-100 dark:bg-emerald-900/40', textClass: 'text-emerald-800 dark:text-emerald-300' };
    case 'TRANSFER_DISPATCH':
      return { label: 'Mutasi Keluar (Dispatch)', bgClass: 'bg-blue-100 dark:bg-blue-900/40', textClass: 'text-blue-800 dark:text-blue-300' };
    case 'TRANSFER_RECEIVE':
      return { label: 'Mutasi Masuk (Receive)', bgClass: 'bg-indigo-100 dark:bg-indigo-900/40', textClass: 'text-indigo-800 dark:text-indigo-300' };
    case 'DAMAGE_LOSS':
      return { label: 'Kerusakan / Selisih', bgClass: 'bg-rose-100 dark:bg-rose-900/40', textClass: 'text-rose-800 dark:text-rose-300' };
    case 'MANUAL_ADJUSTMENT':
      return { label: 'Penyesuaian Manual', bgClass: 'bg-amber-100 dark:bg-amber-900/40', textClass: 'text-amber-800 dark:text-amber-300' };
    default:
      return { label: type, bgClass: 'bg-slate-100 dark:bg-slate-800', textClass: 'text-slate-800 dark:text-slate-200' };
  }
}
