import { create } from 'zustand';
import type { Producto } from '@/src/types';
import type { ProductStatistics } from '@/src/services/products';

// ══════════════════════════════════════════════════════════════════════
// ── Inventory Store (Zustand) ─────────────────────────────────────────
// Estado global del módulo de inventario: productos, estadísticas,
// paginación y flags de carga.
// ══════════════════════════════════════════════════════════════════════

interface InventoryState {
  // ── Data ──
  products: Producto[];
  statistics: ProductStatistics | undefined;
  total: number;
  page: number;
  limit: number;
  search: string;

  // ── Loading flags ──
  loading: boolean;
  submitting: boolean;

  // ── Bulk setters ──
  setProducts: (items: Producto[], total?: number) => void;
  setStatistics: (s: ProductStatistics) => void;
  setLoading: (v: boolean) => void;
  setSubmitting: (v: boolean) => void;
  setPage: (p: number) => void;
  setLimit: (l: number) => void;
  setSearch: (s: string) => void;

  // ── Granular mutations ──
  /** Inserta o reemplaza un producto en el array (por id) */
  upsertProduct: (p: Producto) => void;
  /** Actualiza campos parciales de un producto */
  patchProduct: (id: string, patch: Partial<Producto>) => void;
  /** Elimina un producto del array */
  removeProduct: (id: string) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  products: [],
  statistics: undefined,
  total: 0,
  page: 1,
  limit: 10,
  search: '',
  loading: false,
  submitting: false,

  setProducts: (products, total) =>
    set((s) => ({ products, total: total ?? s.total })),
  setStatistics: (statistics) => set({ statistics }),
  setLoading: (loading) => set({ loading }),
  setSubmitting: (submitting) => set({ submitting }),
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),
  setSearch: (search) => set({ search, page: 1 }),

  upsertProduct: (product) =>
    set((s) => {
      const idx = s.products.findIndex((p) => p.id === product.id);
      if (idx === -1) return { products: [product, ...s.products], total: s.total + 1 };
      const copy = [...s.products];
      copy[idx] = { ...copy[idx], ...product };
      return { products: copy };
    }),

  patchProduct: (id, patch) =>
    set((s) => ({
      products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),

  removeProduct: (id) =>
    set((s) => ({
      products: s.products.filter((p) => p.id !== id),
      total: Math.max(0, s.total - 1),
    })),
}));
