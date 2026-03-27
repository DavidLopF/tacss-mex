// ── Tipos para el servicio de Dashboard ───────────────────────────
// Reflejan exactamente la respuesta de GET /api/dashboard → data

export interface DashboardMetricWithChange {
  value: number;
  changePercent: number | null;
}

export interface DashboardSalesChartDay {
  date: string;   // "2026-02-25"
  total: number;
}

export interface DashboardTopProduct {
  name: string;
  revenue: number;
  qtySold: number;
}

export interface DashboardRecentOrder {
  id: number;
  code: string;
  client: string;
  total: number;
  currency: string;
  status: string;      // "Enviado"
  statusCode: string;  // "ENVIADO"
  createdAt: string;
}

export interface DashboardLowStockProduct {
  id: string | number;
  nombre: string;
  sku: string;
  stockTotal: number;
}

// ── Tipos para GET /api/dashboard/compras ────────────────────────────

export interface DashboardSupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  newSuppliersLastMonth: number;
  totalPurchases: number;
}

export interface DashboardPoStats {
  totalOrders: number;
  draftOrders: number;
  sentOrders: number;
  confirmedOrders: number;
  receivedOrders: number;
  cancelledOrders: number;
  totalSpent: number;
}

export interface DashboardRecentPurchaseOrder {
  id: number;
  code: string;
  supplierName: string;
  /** Código de estado en minúsculas: 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled' */
  status: string;
  total: number;
  currency: string;
  createdAt: string;
}

export interface DashboardComprasSummary {
  supplierStats: DashboardSupplierStats;
  poStats: DashboardPoStats;
  recentOrders: DashboardRecentPurchaseOrder[];
}

/** Shape exacta de data en GET /api/dashboard */
export interface DashboardSummary {
  salesMonth: DashboardMetricWithChange;
  pendingOrders: number;
  totalProducts: number;
  totalClients: DashboardMetricWithChange;
  salesToday: number;
  ordersToday: number;
  newClientsMonth: number;
  lowStockCount: number;
  salesChart: DashboardSalesChartDay[];
  topProducts: DashboardTopProduct[];
  recentOrders: DashboardRecentOrder[];
  lowStock: DashboardLowStockProduct[];
}
