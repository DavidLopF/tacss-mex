import { Producto } from '@/src/types';

// ── Filtros para GET /api/products ──────────────────────────────────
export interface ProductFiltersDto {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  sku?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  hasStock?: boolean;
}

// ── Forma cruda que devuelve el backend ─────────────────────────────
export interface ApiProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
  imageUrl?: string;
  categoryId: number;
  defaultPrice: number;
  currency: string;
  totalStock: number;
  status: string;
  description?: string;
  image?: string;
}

export interface ApiPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Estructura real: { success, data: { data: ApiProduct[], pagination } } */
export interface ApiProductsResponse {
  data: ApiProduct[];
  pagination: ApiPagination;
}

// ── Respuesta ya mapeada al frontend ────────────────────────────────
export interface PaginatedProductsDto {
  items: Producto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Mapper: convierte un ApiProduct → Producto del frontend ─────────
export function mapApiProductToProducto(api: ApiProduct): Producto {
  return {
    id: String(api.id),
    nombre: api.name,
    descripcion: api.description ?? '',
    sku: api.sku,
    precio: api.defaultPrice,
    costo: 0,
    categoria: api.category,
    imageUrl: api.imageUrl,
    variaciones: [],
    stockTotal: api.totalStock,
    activo: api.status === 'Activo',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ── Estadísticas de inventario ─────────────────────────────────────
export interface ProductStatistics {
  totalProducts: number;
  totalStockOnHand: number;
  totalStockReserved: number;
  activeProducts: number;
  inactiveProducts: number;
}

// ── Detalle de producto ────────────────────────────────────────────
export interface ApiWarehouse {
  warehouseId: number;
  warehouseName: string;
  qtyOnHand: number;
  qtyReserved: number;
  qtyAvailable: number;
}

export interface ApiVariant {
  id: number;
  sku: string;
  barcode: string;
  variantName: string;
  stock: number;
  reserved: number;
  available: number;
  status: string;
  warehouses: ApiWarehouse[];
}

export interface ApiProductDetail {
  id: number;
  name: string;
  description?: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  currency: string;
  totalStock: number;
  status: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  variants: ApiVariant[];

  // ── Costos reales (landed cost) ──
  /** Costo promedio ponderado (landed) calculado de las OC */
  lastPurchaseCost: number | null;
  /** Menor costo de compra registrado */
  lowestPurchaseCost: number | null;
  /** Mayor costo de compra registrado */
  highestPurchaseCost: number | null;
  /** Margen %: (price - cost) / price × 100 */
  margin: number | null;

  // ── Proveedores asociados ──
  suppliers: ApiProductSupplier[];

  // ── Historial de compras ──
  purchaseHistory: ApiProductPurchaseHistory[];
}

// ── Proveedor asociado a un producto ────────────────────────────────
export interface ApiProductSupplier {
  supplierId: number;
  supplierName: string;
  supplierCost: number;
  supplierSku: string | null;
  currency: string;
  leadTimeDays: number | null;
  minOrderQty: number | null;
  isPreferred: boolean;
  lastLandedCost: number | null;
}

// ── Historial de compra de un producto ──────────────────────────────
export interface ApiProductPurchaseHistory {
  purchaseOrderId: number;
  purchaseOrderCode: string;
  supplierName: string;
  date: string;
  qty: number;
  unitCost: number;
  landedUnitCost: number;
  currency: string;
  status: string;
}

// ── Categorías ──────────────────────────────────────────────────────
export interface CategoryDto {
  id: number;
  name: string;
  description?: string;
}

// ── Crear producto ──────────────────────────────────────────────────
export interface CreateProductVariantDto {
  variantName: string;
  stock: number;
  warehouseId?: number; // Opcional: si no se especifica, usa el almacén por defecto
}

export interface CreateProductDto {
  name: string;
  description?: string;
  sku: string;
  categoryId: number;
  defaultPrice: number;
  cost?: number;
  currency?: string;
  image?: string;
  variants: CreateProductVariantDto[];
}

// ── Actualizar producto ─────────────────────────────────────────────
export interface UpdateProductVariantDto {
  id?: number;           // Si tiene id, se actualiza. Si no, se crea nueva
  variantName: string;
  stock: number;
  sku?: string;
  warehouseId?: number;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  categoryId?: number;
  price?: number;
  defaultPrice?: number;  // Alias de price
  cost?: number;
  currency?: string;
  image?: string;
  isActive?: boolean;
  variants?: UpdateProductVariantDto[];
}

// Respuesta del PUT
export interface UpdateProductResponseDto {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  currency: string;
  totalStock: number;
  status: string;
  description?: string;
  image?: string;
  updatedAt: string;
  variants: ApiVariant[];
}
