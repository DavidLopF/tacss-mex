import { create } from 'zustand';
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseOrderStatistics,
} from '@/src/services/suppliers';

// ══════════════════════════════════════════════════════════════════════
// ── Purchase Orders Store (Zustand) ──────────────────────────────────
// Almacena órdenes, estadísticas y paginación de forma global.
// Cada mutación exitosa (crear, actualizar status, recepción, etc.)
// llama a las acciones de este store para que TODA la UI reactiva
// se actualice sin necesidad de recargar la página.
// ══════════════════════════════════════════════════════════════════════

interface PurchaseOrdersState {
  // ── Data ──
  orders: PurchaseOrder[];
  stats: PurchaseOrderStatistics | undefined;
  total: number;
  page: number;
  limit: number;
  search: string;
  statusFilter: PurchaseOrderStatus | 'all';

  // ── Loading flags ──
  loading: boolean;
  submitting: boolean;

  // ── Actions: bulk ──
  setOrders: (orders: PurchaseOrder[], total?: number) => void;
  setStats: (stats: PurchaseOrderStatistics) => void;
  setLoading: (v: boolean) => void;
  setSubmitting: (v: boolean) => void;
  setPage: (p: number) => void;
  setLimit: (l: number) => void;
  setSearch: (s: string) => void;
  setStatusFilter: (f: PurchaseOrderStatus | 'all') => void;

  // ── Actions: granular mutations ──
  /** Inserta o reemplaza una orden en el array (por id) */
  upsertOrder: (order: PurchaseOrder) => void;
  /** Actualiza campos parciales de una orden */
  patchOrder: (id: number, patch: Partial<PurchaseOrder>) => void;
  /** Elimina una orden del array */
  removeOrder: (id: number) => void;
  /** Actualiza los items de una orden (e.g. tras recepción) */
  updateOrderItems: (id: number, items: PurchaseOrder['items']) => void;
}

export const usePurchaseOrdersStore = create<PurchaseOrdersState>((set) => ({
  orders: [],
  stats: undefined,
  total: 0,
  page: 1,
  limit: 10,
  search: '',
  statusFilter: 'all',
  loading: false,
  submitting: false,

  // ── Bulk setters ──
  setOrders: (orders, total) =>
    set((s) => ({ orders, total: total ?? s.total })),
  setStats: (stats) => set({ stats }),
  setLoading: (loading) => set({ loading }),
  setSubmitting: (submitting) => set({ submitting }),
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),
  setSearch: (search) => set({ search, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),

  // ── Granular mutations ──
  upsertOrder: (order) =>
    set((s) => {
      const idx = s.orders.findIndex((o) => o.id === order.id);
      if (idx === -1) {
        // Nueva orden: al principio
        return { orders: [order, ...s.orders], total: s.total + 1 };
      }
      const copy = [...s.orders];
      copy[idx] = { ...copy[idx], ...order };
      return { orders: copy };
    }),

  patchOrder: (id, patch) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    })),

  removeOrder: (id) =>
    set((s) => ({
      orders: s.orders.filter((o) => o.id !== id),
      total: Math.max(0, s.total - 1),
    })),

  updateOrderItems: (id, items) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, items } : o)),
    })),
}));
