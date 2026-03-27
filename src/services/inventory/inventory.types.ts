// ── Tipos para el endpoint de inventario ────────────────────────────

export interface InventoryItem {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  variantId: number;
  variantName: string;
  warehouseId: number;
  warehouseName: string;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
  status: string;
}

export interface InventoryFiltersDto {
  productId?: number;
  warehouseId?: number;
  sku?: string;
  variantId?: number;
  status?: string;
}
