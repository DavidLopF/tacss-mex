// ── Proveedor (item para selects/dropdowns) ────────────────────────
export interface SupplierListItem {
  id: number;
  name: string;
}

// ── Contacto del proveedor ─────────────────────────────────────────
export interface SupplierContact {
  name: string;
  phone: string;
  email: string;
  position?: string;
}

// ── Proveedor completo (detalle) ───────────────────────────────────
export interface SupplierDetail {
  id: number;
  name: string;
  rfc: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  /** Total de compras acumulado (viene como string del backend, se parsea a number en el servicio) */
  totalPurchases: number;
}

// ── Filtros para GET /api/suppliers (paginado) ─────────────────────
export interface SupplierFiltersDto {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  inactive?: boolean;
}

// ── Paginación del API ─────────────────────────────────────────────
export interface SupplierPagination {
  total: number;
  page: number;
  limit: number;
}

// ── Respuesta paginada del API ─────────────────────────────────────
export interface ApiSuppliersResponse {
  data: SupplierDetail[];
  pagination: SupplierPagination;
}

// ── Respuesta ya mapeada para el frontend ──────────────────────────
export interface PaginatedSuppliersDto {
  items: SupplierDetail[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── DTO para crear un proveedor ────────────────────────────────────
export interface CreateSupplierDto {
  name: string;
  rfc?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
}

// ── DTO para actualizar un proveedor ───────────────────────────────
export interface UpdateSupplierDto {
  name?: string;
  rfc?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  isActive?: boolean;
}

// ── Estadísticas de proveedores ────────────────────────────────────
export interface SupplierStatistics {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  newSuppliersLastMonth: number;
  /** Total de compras acumulado (viene como string del backend, se parsea a number en el servicio) */
  totalPurchases: number;
}

// ══════════════════════════════════════════════════════════════════════
// ── ÓRDENES DE COMPRA (Purchase Orders) ──────────────────────────────
// ══════════════════════════════════════════════════════════════════════

export type PurchaseOrderStatus =
  | 'draft'
  | 'sent'
  | 'confirmed'
  | 'partial'
  | 'received'
  | 'cancelled';

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  confirmed: 'Confirmada',
  partial: 'Parcial',
  received: 'Recibida',
  cancelled: 'Cancelada',
};

export const PURCHASE_ORDER_STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-purple-100 text-purple-700',
  partial: 'bg-orange-100 text-orange-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

// ── Reglas de transición de estados de órdenes de compra ───────────
export interface POStatusTransitionRule {
  allowedFrom: PurchaseOrderStatus[];
  label: string;
  errorMessage: string;
}

/**
 * Mapa de transiciones permitidas.
 * Clave = estado destino, valor = desde qué estados se puede llegar.
 *
 *  draft → sent → confirmed → partial → received
 *                           ↘ received
 *  (cualquiera excepto received) → cancelled
 *  cancelled → draft  (reabrir)
 */
export const PO_STATUS_TRANSITION_RULES: Record<PurchaseOrderStatus, POStatusTransitionRule> = {
  draft: {
    allowedFrom: ['cancelled'],
    label: 'Reabrir como Borrador',
    errorMessage: 'Solo se puede reabrir a Borrador desde Cancelada',
  },
  sent: {
    allowedFrom: ['draft'],
    label: 'Marcar como Enviada',
    errorMessage: 'La orden debe estar en Borrador para marcar como Enviada',
  },
  confirmed: {
    allowedFrom: ['sent'],
    label: 'Confirmar Orden',
    errorMessage: 'La orden debe estar Enviada para confirmarla',
  },
  partial: {
    allowedFrom: ['confirmed'],
    label: 'Recepción Parcial',
    errorMessage: 'La orden debe estar Confirmada para marcar como Parcial',
  },
  received: {
    allowedFrom: ['confirmed', 'partial'],
    label: 'Marcar como Recibida',
    errorMessage: 'La orden debe estar Confirmada o Parcial para marcar como Recibida',
  },
  cancelled: {
    allowedFrom: ['draft', 'sent', 'confirmed', 'partial'],
    label: 'Cancelar Orden',
    errorMessage: 'No se puede cancelar una orden ya Recibida o Cancelada',
  },
};

/**
 * Valida si una transición de estado es válida
 */
export function canTransitionPO(
  currentStatus: PurchaseOrderStatus,
  newStatus: PurchaseOrderStatus,
): { valid: boolean; error?: string } {
  if (currentStatus === newStatus) {
    return { valid: false, error: 'La orden ya está en ese estado' };
  }
  const rule = PO_STATUS_TRANSITION_RULES[newStatus];
  if (!rule) {
    return { valid: false, error: 'Estado destino no válido' };
  }
  if (!rule.allowedFrom.includes(currentStatus)) {
    return { valid: false, error: rule.errorMessage };
  }
  return { valid: true };
}

/**
 * Devuelve los estados a los que se puede transicionar desde el estado actual
 */
export function getAvailablePOTransitions(currentStatus: PurchaseOrderStatus): PurchaseOrderStatus[] {
  return (Object.entries(PO_STATUS_TRANSITION_RULES) as [PurchaseOrderStatus, POStatusTransitionRule][])
    .filter(([, rule]) => rule.allowedFrom.includes(currentStatus))
    .map(([status]) => status);
}

// ── Item de orden de compra ────────────────────────────────────────
export interface PurchaseOrderItem {
  id: number;
  purchaseOrderId: number;
  variantId: number;
  qty: number;
  qtyReceived: number;
  unitCost: number;
  lineTotal: number;
  /** Costo unitario con landed cost aplicado: unitCost × (1 + Σpcts/100) */
  landedUnitCost: number;
  /** Línea total con landed cost: landedUnitCost × qty */
  landedLineTotal: number;
  currency: string;
  description?: string;
}

// ── Proveedor embebido en la orden (viene como objeto del backend) ──
export interface PurchaseOrderSupplier {
  id: number;
  name: string;
  rfc: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string;
  isActive: boolean;
}

// ── Orden de compra (detalle) ──────────────────────────────────────
export interface PurchaseOrder {
  id: number;
  code: string;
  supplierId: number;
  /** Nombre del proveedor — derivado del objeto supplier embebido */
  supplierName: string;
  supplier: PurchaseOrderSupplier;
  statusId: number;
  /** Código de estado mapeado desde statusId — derivado en el servicio */
  status: PurchaseOrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  notes: string | null;
  expectedDeliveryDate: string | null;
  receivedDate: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItem[];

  // ── Landed cost: porcentajes ──
  /** Porcentaje de flete sobre subtotal */
  freightPct: number;
  /** Porcentaje de aduana/despacho sobre subtotal */
  customsPct: number;
  /** Porcentaje de impuestos de internación sobre subtotal */
  taxPct: number;
  /** Porcentaje de manejo/almacenaje sobre subtotal */
  handlingPct: number;
  /** Porcentaje otros costos sobre subtotal */
  otherPct: number;

  // ── Landed cost: montos calculados (subtotal × pct / 100) ──
  freightCost: number;
  customsCost: number;
  taxCost: number;
  handlingCost: number;
  otherCost: number;
}

// ── Filtros para GET /api/purchase-orders ──────────────────────────
export interface PurchaseOrderFiltersDto {
  page?: number;
  limit?: number;
  search?: string;
  supplierId?: number;
  status?: PurchaseOrderStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
}

// ── Respuesta paginada de órdenes de compra ────────────────────────
export interface PaginatedPurchaseOrdersDto {
  items: PurchaseOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── DTO para crear item de la orden ────────────────────────────────
export interface CreatePurchaseOrderItemDto {
  variantId: number;
  qty: number;
  unitCost: number;
  description?: string;
}

// ── DTO para crear una orden de compra ─────────────────────────────
export interface CreatePurchaseOrderDto {
  supplierId: number;
  items: CreatePurchaseOrderItemDto[];
  notes?: string;
  expectedDeliveryDate?: string;
  currency?: string;
  // Landed cost porcentajes (opcionales al crear)
  freightPct?: number;
  customsPct?: number;
  taxPct?: number;
  handlingPct?: number;
  otherPct?: number;
}

// ── DTO para actualizar una orden de compra ────────────────────────
export interface UpdatePurchaseOrderDto {
  status?: PurchaseOrderStatus;
  notes?: string;
  expectedDeliveryDate?: string;
  items?: CreatePurchaseOrderItemDto[];
}

// ── DTO para actualizar costos de internación (PATCH) ──────────────
export interface UpdatePurchaseOrderCostsDto {
  freightPct?: number;
  customsPct?: number;
  taxPct?: number;
  handlingPct?: number;
  otherPct?: number;
}

// ── Etiquetas de costos de internación para UI ─────────────────────
export const LANDED_COST_FIELDS = [
  { key: 'freightPct' as const, label: 'Flete', icon: '🚛' },
  { key: 'customsPct' as const, label: 'Aduana', icon: '🏛️' },
  { key: 'taxPct' as const, label: 'Impuestos', icon: '📋' },
  { key: 'handlingPct' as const, label: 'Manejo', icon: '📦' },
  { key: 'otherPct' as const, label: 'Otros', icon: '➕' },
] as const;

// ── Estadísticas de órdenes de compra ──────────────────────────────
export interface PurchaseOrderStatistics {
  totalOrders: number;
  draftOrders: number;
  sentOrders: number;
  confirmedOrders: number;
  receivedOrders: number;
  cancelledOrders: number;
  totalSpent: number;
}

// ══════════════════════════════════════════════════════════════════════
// ── RELACIÓN PROVEEDOR ↔ PRODUCTO (Supplier Products) ────────────────
// ══════════════════════════════════════════════════════════════════════

// ── Producto asociado a un proveedor (GET /api/suppliers/:id/products) ──
export interface SupplierProductItem {
  id: number;
  supplierId: number;
  productId: number;
  supplierCost: number;
  supplierSku: string | null;
  currency: string;
  leadTimeDays: number | null;
  minOrderQty: number | null;
  isPreferred: boolean;
  product: {
    id: number;
    name: string;
    category: { id: number; name: string };
    variants: { id: number; sku: string; variantName: string }[];
  };
}

// ── DTO para asociar un producto a un proveedor ────────────────────
export interface AddSupplierProductDto {
  productId: number;
  supplierCost: number;
  supplierSku?: string;
  currency?: string;
  leadTimeDays?: number;
  minOrderQty?: number;
  isPreferred?: boolean;
  notes?: string;
}

// ── DTO para bulk-add ──────────────────────────────────────────────
export interface BulkAddSupplierProductsDto {
  products: AddSupplierProductDto[];
}
