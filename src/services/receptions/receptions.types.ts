// ══════════════════════════════════════════════════════════════════════
// ── RECEPCIONES PARCIALES (Partial Receipts) ─────────────────────────
// ══════════════════════════════════════════════════════════════════════

import type { PurchaseOrderStatus } from '@/src/services/suppliers/suppliers.types';

// ── Item de recepción parcial ──────────────────────────────────────
export interface PartialReceiptItem {
  id: number;
  partialReceiptId: number;
  purchaseOrderItemId: number;
  qtyReceived: number;
  notes: string | null;
  /** Info de la variante / producto (poblado por el backend) */
  purchaseOrderItem?: {
    variantId: number;
    description?: string;
    variant?: {
      id: number;
      sku: string;
      variantName?: string;
      product?: {
        id: number;
        name: string;
      };
    };
  };
}

// ── Recepción parcial (header) ─────────────────────────────────────
export interface PartialReceipt {
  id: number;
  purchaseOrderId: number;
  warehouseId: number;
  receivedByUserId: number | null;
  code: string;
  receivedDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: PartialReceiptItem[];
  warehouse?: {
    id: number;
    name: string;
  };
  receivedBy?: {
    id: number;
    fullName: string;
    email: string;
  } | null;
}

// ── Progreso por item ──────────────────────────────────────────────
export interface ReceptionProgressItem {
  id: number;
  variantId: number;
  productName: string;
  variantSku: string;
  description?: string;
  qty: number;
  qtyReceived: number;
  qtyPending: number;
  percentComplete: number;
}

// ── Progreso general de la PO ──────────────────────────────────────
export interface ReceptionProgress {
  totalQty: number;
  totalReceived: number;
  totalPending: number;
  percentComplete: number;
  isComplete: boolean;
  items: ReceptionProgressItem[];
}

// ── DTO para crear item de recepción ───────────────────────────────
export interface CreateReceptionItemDto {
  purchaseOrderItemId: number;
  qtyReceived: number;
  notes?: string;
}

// ── DTO para crear recepción parcial ───────────────────────────────
export interface CreateReceptionDto {
  warehouseId: number;
  receivedByUserId?: number;
  receivedDate?: string;
  notes?: string;
  items: CreateReceptionItemDto[];
}

// ── Respuesta al crear recepción ───────────────────────────────────
export interface CreateReceptionResponse {
  receipt: PartialReceipt;
  purchaseOrderStatus: PurchaseOrderStatus;
  progress: ReceptionProgress;
}

// ── Warehouse simplificado para selects ────────────────────────────
export interface WarehouseListItem {
  id: number;
  name: string;
}
