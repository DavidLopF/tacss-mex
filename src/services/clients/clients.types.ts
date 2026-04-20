// ── Lista simple de clientes para selects ──────────────────────────
export interface ClientListItem {
  id: number;
  name: string;
  priceZoneId?: number | null;
  priceZone?: { id: number; code: string; label: string } | null;
}

// ── Historial de precios de un cliente para un producto ────────────
export interface PriceHistoryItem {
  orderId: number;
  orderCode: string;
  orderDate: string;
  orderStatus: string;
  variantId: number;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  listPrice: number;
  discount: number;
  discountPercent: number;
  lineTotal: number;
  currency: string;
}

// ── Cliente completo (detalle) ─────────────────────────────────────
export interface ClientDetail {
  id: number;
  name: string;
  document: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  phone?: string | null;
  address?: string | null;
  cityName?: string | null;
  totalOrders: number;
  totalSpent: number;
  hystoricalPrices?: PriceHistoryItem[];
  priceZoneId: number | null;
  priceZone: { id: number; code: string; label: string } | null;
}

// ── Filtros para GET /api/clients (paginado) ───────────────────────
export interface ClientFiltersDto {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  inactive?: boolean;
}

// ── Paginación del API ─────────────────────────────────────────────
export interface ClientPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ── Respuesta paginada del API ─────────────────────────────────────
// El http-client ya desenvuelve { success, data }, por lo que
// para endpoints paginados usamos getPaginated que retorna { data, pagination }
export interface ApiClientsResponse {
  data: ClientDetail[];
  pagination: ClientPagination;
}

// ── Respuesta ya mapeada para el frontend ──────────────────────────
export interface PaginatedClientsDto {
  items: ClientDetail[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── DTO para crear un cliente ──────────────────────────────────────
export interface CreateClientDto {
  name: string;
  document?: string;
  priceZoneId?: number;
}

// ── DTO para actualizar un cliente ─────────────────────────────────
export interface UpdateClientDto {
  name?: string;
  document?: string;
  isActive?: boolean;
  priceZoneId?: number | null;
}

// ── Estadísticas de clientes ───────────────────────────────────────
export interface ClientStatistics {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  newClientsLastMonth: number;
  totalIncome: number;
}
