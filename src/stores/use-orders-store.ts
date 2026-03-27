import { create } from 'zustand';
import type { Pedido, EstadoPedido } from '@/src/types';

// ══════════════════════════════════════════════════════════════════════
// ── Orders Store (Zustand) ────────────────────────────────────────────
// Estado global del módulo de pedidos (kanban board).
// ══════════════════════════════════════════════════════════════════════

interface OrdersState {
  // ── Data ──
  pedidos: Pedido[];
  searchTerm: string;

  // ── Loading flags ──
  loading: boolean;
  submitting: boolean;

  // ── Bulk setters ──
  setPedidos: (items: Pedido[]) => void;
  setSearchTerm: (s: string) => void;
  setLoading: (v: boolean) => void;
  setSubmitting: (v: boolean) => void;

  // ── Granular mutations ──
  /** Inserta o reemplaza un pedido (por id) */
  upsertPedido: (p: Pedido) => void;
  /** Actualiza campos parciales de un pedido (e.g. estado optimista) */
  patchPedido: (id: string, patch: Partial<Pedido>) => void;
  /** Actualiza el estado de un pedido */
  updatePedidoEstado: (id: string, estado: EstadoPedido) => void;
  /** Elimina un pedido del store */
  removePedido: (id: string) => void;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  pedidos: [],
  searchTerm: '',
  loading: false,
  submitting: false,

  setPedidos: (pedidos) => set({ pedidos }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setLoading: (loading) => set({ loading }),
  setSubmitting: (submitting) => set({ submitting }),

  upsertPedido: (pedido) =>
    set((s) => {
      const idx = s.pedidos.findIndex((p) => p.id === pedido.id);
      if (idx === -1) return { pedidos: [pedido, ...s.pedidos] };
      const copy = [...s.pedidos];
      copy[idx] = { ...copy[idx], ...pedido };
      return { pedidos: copy };
    }),

  patchPedido: (id, patch) =>
    set((s) => ({
      pedidos: s.pedidos.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),

  updatePedidoEstado: (id, estado) =>
    set((s) => ({
      pedidos: s.pedidos.map((p) =>
        p.id === id
          ? { ...p, estado, transmitido: estado !== 'cotizado' }
          : p
      ),
    })),

  removePedido: (id) =>
    set((s) => ({
      pedidos: s.pedidos.filter((p) => p.id !== id),
    })),
}));
