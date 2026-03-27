import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CfdiStatus {
  pedidoId: string;
  invoiceUuid?: string;
  invoiceStatus: 'no_facturado' | 'en_proceso' | 'facturado' | 'cancelado';
  createdAt: number;
}

interface CfdiStore {
  // Estado
  cfdiStatuses: Record<string, CfdiStatus>;
  
  // Acciones
  getCfdiStatus: (pedidoId: string) => CfdiStatus | undefined;
  markAsBilled: (pedidoId: string, invoiceUuid?: string) => void;
  markAsInProcess: (pedidoId: string) => void;
  markAsCanceled: (pedidoId: string) => void;
  markAsNotBilled: (pedidoId: string) => void;
  clearAll: () => void;
}

export const useCfdiStore = create<CfdiStore>()(
  persist(
    (set, get) => ({
      cfdiStatuses: {},

      getCfdiStatus: (pedidoId: string) => {
        return get().cfdiStatuses[pedidoId];
      },

      markAsBilled: (pedidoId: string, invoiceUuid?: string) => {
        set((state) => ({
          cfdiStatuses: {
            ...state.cfdiStatuses,
            [pedidoId]: {
              pedidoId,
              invoiceUuid,
              invoiceStatus: 'facturado',
              createdAt: Date.now(),
            },
          },
        }));
      },

      markAsInProcess: (pedidoId: string) => {
        set((state) => ({
          cfdiStatuses: {
            ...state.cfdiStatuses,
            [pedidoId]: {
              pedidoId,
              invoiceStatus: 'en_proceso',
              createdAt: Date.now(),
            },
          },
        }));
      },

      markAsCanceled: (pedidoId: string) => {
        set((state) => ({
          cfdiStatuses: {
            ...state.cfdiStatuses,
            [pedidoId]: {
              pedidoId,
              invoiceStatus: 'cancelado',
              createdAt: Date.now(),
            },
          },
        }));
      },

      markAsNotBilled: (pedidoId: string) => {
        set((state) => {
          const newStatuses = { ...state.cfdiStatuses };
          delete newStatuses[pedidoId];
          return { cfdiStatuses: newStatuses };
        });
      },

      clearAll: () => {
        set({ cfdiStatuses: {} });
      },
    }),
    {
      name: 'cfdi-store',
      version: 1,
    }
  )
);
