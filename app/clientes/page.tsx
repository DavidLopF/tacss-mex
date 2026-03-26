'use client';

import { useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ClientTable, ClientTableSkeleton, ClientStats } from '@/components/clientes';
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getClientStatistics,
  CreateClientDto,
  UpdateClientDto,
} from '@/services/clients';
import { useDebounce, useToast, useCrossTabSync } from '@/lib/hooks';
import { ToastContainer } from '@/components/ui';
import { PermissionGuard } from '@/components/layout';
import { useClientsStore } from '@/stores';
import { broadcastInvalidation } from '@/lib/cross-tab-sync';

export default function ClientesPage() {
  // ── Data & UI state (single shallow subscription) ──
  const {
    clients, page, limit, search, statusFilter,
    total, loading, submitting, statistics,
  } = useClientsStore(useShallow((s) => ({
    clients: s.clients,
    page: s.page,
    limit: s.limit,
    search: s.search,
    statusFilter: s.statusFilter,
    total: s.total,
    loading: s.loading,
    submitting: s.submitting,
    statistics: s.statistics,
  })));

  // ── Actions (stable references) ──
  const setClients = useClientsStore((s) => s.setClients);
  const setStatistics = useClientsStore((s) => s.setStatistics);
  const setLoading = useClientsStore((s) => s.setLoading);
  const setSubmitting = useClientsStore((s) => s.setSubmitting);
  const setPage = useClientsStore((s) => s.setPage);
  const setLimit = useClientsStore((s) => s.setLimit);
  const setSearch = useClientsStore((s) => s.setSearch);
  const setStatusFilter = useClientsStore((s) => s.setStatusFilter);
  const patchClient = useClientsStore((s) => s.patchClient);
  const removeClient = useClientsStore((s) => s.removeClient);

  const toast = useToast();
  const debouncedSearch = useDebounce(search, 500);

  const load = useCallback(async (p = page, q = search, l = limit, filter = statusFilter) => {
    setLoading(true);
    try {
      const filters: { page: number; limit: number; search: string; active?: boolean; inactive?: boolean } = {
        page: p,
        limit: l,
        search: q,
      };
      if (filter === 'active') {
        filters.active = true;
        filters.inactive = false;
      } else if (filter === 'inactive') {
        filters.active = false;
        filters.inactive = true;
      }
      const res = await getClients(filters);
      setClients(res.items, res.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error al cargar clientes:', errorMessage);
      toast.error('Error al cargar los clientes. Verifica que el servidor esté en ejecución.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStatistics = useCallback(async () => {
    try {
      const stats = await getClientStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  useEffect(() => {
    load(page, debouncedSearch, limit, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, limit, statusFilter]);

  // ── Cross-tab sync ──
  useCrossTabSync('clients', () => {
    load(page, debouncedSearch, limit, statusFilter);
    loadStatistics();
  });

  const handleClientCreate = async (data: CreateClientDto) => {
    setSubmitting(true);
    try {
      await createClient(data);
      toast.success(`Cliente "${data.name}" creado exitosamente`);
      await load(page, debouncedSearch, limit, statusFilter);
      loadStatistics();
      broadcastInvalidation('clients');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Error al crear el cliente: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClientUpdate = async (id: number, data: UpdateClientDto) => {
    setSubmitting(true);
    try {
      const updated = await updateClient(id, data);
      patchClient(id, updated);
      toast.success('Cliente actualizado exitosamente');
      loadStatistics();
      broadcastInvalidation('clients');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Error al actualizar el cliente: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClientDelete = async (id: number) => {
    setSubmitting(true);
    try {
      await deleteClient(id);
      removeClient(id);
      toast.success('Cliente eliminado exitosamente');
      loadStatistics();
      broadcastInvalidation('clients');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Error al eliminar el cliente: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PermissionGuard moduleCode="CLIENTES">
    <main className="p-6">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-500">Gestión de clientes y relaciones</p>
          </div>
        </div>

        <ClientStats statistics={statistics} />

        {loading ? (
          <ClientTableSkeleton rows={limit} />
        ) : (
          <ClientTable
            clients={clients}
            onClientCreate={handleClientCreate}
            onClientUpdate={handleClientUpdate}
            onClientDelete={handleClientDelete}
            externalSearch={search}
            onSearchChange={(v) => { setSearch(v); }}
            externalPage={page}
            onPageChange={(p) => setPage(p)}
            externalItemsPerPage={limit}
            onItemsPerPageChange={(l) => { setLimit(l); }}
            externalStatusFilter={statusFilter}
            onStatusFilterChange={(filter) => { setStatusFilter(filter); }}
            totalItems={total}
            submitting={submitting}
          />
        )}
      </div>
    </main>
    </PermissionGuard>
  );
}