import { create } from 'zustand';
import type {
  SupplierDetail,
  SupplierStatistics,
} from '@/services/suppliers';

// ══════════════════════════════════════════════════════════════════════
// ── Suppliers Store (Zustand) ────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

interface SuppliersState {
  suppliers: SupplierDetail[];
  stats: SupplierStatistics | undefined;
  total: number;
  page: number;
  limit: number;
  search: string;
  statusFilter: 'all' | 'active' | 'inactive';
  loading: boolean;
  submitting: boolean;

  setSuppliers: (items: SupplierDetail[], total?: number) => void;
  setStats: (stats: SupplierStatistics) => void;
  setLoading: (v: boolean) => void;
  setSubmitting: (v: boolean) => void;
  setPage: (p: number) => void;
  setLimit: (l: number) => void;
  setSearch: (s: string) => void;
  setStatusFilter: (f: 'all' | 'active' | 'inactive') => void;

  upsertSupplier: (s: SupplierDetail) => void;
  patchSupplier: (id: number, patch: Partial<SupplierDetail>) => void;
  removeSupplier: (id: number) => void;
}

export const useSuppliersStore = create<SuppliersState>((set) => ({
  suppliers: [],
  stats: undefined,
  total: 0,
  page: 1,
  limit: 10,
  search: '',
  statusFilter: 'all',
  loading: false,
  submitting: false,

  setSuppliers: (suppliers, total) =>
    set((s) => ({ suppliers, total: total ?? s.total })),
  setStats: (stats) => set({ stats }),
  setLoading: (loading) => set({ loading }),
  setSubmitting: (submitting) => set({ submitting }),
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),
  setSearch: (search) => set({ search, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),

  upsertSupplier: (supplier) =>
    set((s) => {
      const idx = s.suppliers.findIndex((x) => x.id === supplier.id);
      if (idx === -1) return { suppliers: [supplier, ...s.suppliers], total: s.total + 1 };
      const copy = [...s.suppliers];
      copy[idx] = { ...copy[idx], ...supplier };
      return { suppliers: copy };
    }),

  patchSupplier: (id, patch) =>
    set((s) => ({
      suppliers: s.suppliers.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    })),

  removeSupplier: (id) =>
    set((s) => ({
      suppliers: s.suppliers.filter((x) => x.id !== id),
      total: Math.max(0, s.total - 1),
    })),
}));
