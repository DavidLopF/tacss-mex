import { create } from 'zustand';
import type { ClientDetail, ClientStatistics } from '@/services/clients';

// ══════════════════════════════════════════════════════════════════════
// ── Clients Store (Zustand) ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

interface ClientsState {
  // ── Data ──
  clients: ClientDetail[];
  statistics: ClientStatistics | undefined;
  total: number;
  page: number;
  limit: number;
  search: string;
  statusFilter: 'all' | 'active' | 'inactive';

  // ── Loading flags ──
  loading: boolean;
  submitting: boolean;

  // ── Bulk setters ──
  setClients: (items: ClientDetail[], total?: number) => void;
  setStatistics: (s: ClientStatistics) => void;
  setLoading: (v: boolean) => void;
  setSubmitting: (v: boolean) => void;
  setPage: (p: number) => void;
  setLimit: (l: number) => void;
  setSearch: (s: string) => void;
  setStatusFilter: (f: 'all' | 'active' | 'inactive') => void;

  // ── Granular mutations ──
  upsertClient: (c: ClientDetail) => void;
  patchClient: (id: number, patch: Partial<ClientDetail>) => void;
  removeClient: (id: number) => void;
}

export const useClientsStore = create<ClientsState>((set) => ({
  clients: [],
  statistics: undefined,
  total: 0,
  page: 1,
  limit: 10,
  search: '',
  statusFilter: 'all',
  loading: false,
  submitting: false,

  setClients: (clients, total) =>
    set((s) => ({ clients, total: total ?? s.total })),
  setStatistics: (statistics) => set({ statistics }),
  setLoading: (loading) => set({ loading }),
  setSubmitting: (submitting) => set({ submitting }),
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),
  setSearch: (search) => set({ search, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),

  upsertClient: (client) =>
    set((s) => {
      const idx = s.clients.findIndex((c) => c.id === client.id);
      if (idx === -1) return { clients: [client, ...s.clients], total: s.total + 1 };
      const copy = [...s.clients];
      copy[idx] = { ...copy[idx], ...client };
      return { clients: copy };
    }),

  patchClient: (id, patch) =>
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  removeClient: (id) =>
    set((s) => ({
      clients: s.clients.filter((c) => c.id !== id),
      total: Math.max(0, s.total - 1),
    })),
}));
