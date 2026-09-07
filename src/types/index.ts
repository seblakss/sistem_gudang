export type LocationType = 'WAREHOUSE' | 'STORE';

export interface Location {
  id: number;
  name: string;
  type: LocationType;
  address?: string;
  created_at: string;
}

export type UserRole = 'ADMIN_GUDANG' | 'ORANG_TOKO';

export interface User {
  id: string;
  username: string;
  password_hash?: string;
  full_name: string;
  role: UserRole;
  location_id: number;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Item {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  safety_stock: number;
  created_at: string;
}

export interface Inventory {
  id: number;
  location_id: number;
  item_id: number;
  stock_available: number;
  stock_reserved: number;
  stock_in_transit: number;
  updated_at: string;
}

export type TransferRequestStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'PARTIAL' 
  | 'REJECTED' 
  | 'IN_TRANSIT' 
  | 'COMPLETED' 
  | 'DISCREPANCY';

export interface TransferRequestItem {
  id: number;
  transfer_request_id: number;
  item_id: number;
  qty_requested: number;
  qty_approved: number;
  qty_dispatched: number;
  qty_received: number;
  discrepancy_reason?: string;
  item?: Item;
}

export interface TransferRequest {
  id: number;
  request_number: string;
  do_number?: string;
  from_location_id: number;
  to_location_id: number;
  requested_by: string;
  approved_by?: string;
  status: TransferRequestStatus;
  request_notes?: string;
  rejection_notes?: string;
  created_at: string;
  dispatched_at?: string;
  received_at?: string;
  items: TransferRequestItem[];
}

export type TransactionType = 
  | 'PURCHASE_INBOUND' 
  | 'TRANSFER_DISPATCH' 
  | 'TRANSFER_RECEIVE' 
  | 'DAMAGE_LOSS' 
  | 'MANUAL_ADJUSTMENT';

export interface InventoryMutation {
  id: number;
  item_id: number;
  from_location_id?: number | null;
  to_location_id?: number | null;
  qty: number;
  transaction_type: TransactionType;
  reference_id?: number | null;
  reference_code?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  targetRole?: UserRole;
  targetLocationId?: number;
}
