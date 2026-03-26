'use client';

import { useEffect, useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Truck, ClipboardList } from 'lucide-react';
import {
  SupplierTable,
  SupplierTableSkeleton,
  SupplierStats,
  PurchaseOrderTable,
  PurchaseOrderTableSkeleton,
  PurchaseOrderStats,
} from '@/components/proveedores';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierStatistics,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderCosts,
  deletePurchaseOrder,
  getPurchaseOrderStatistics,
  PURCHASE_ORDER_STATUS_LABELS,
  getPurchaseOrderById,
} from '@/services/suppliers';
import type {
  CreateSupplierDto,
  UpdateSupplierDto,
  CreatePurchaseOrderDto,
  PurchaseOrderStatus,
  UpdatePurchaseOrderCostsDto,
} from '@/services/suppliers';
import { useDebounce, useToast, useCrossTabSync } from '@/lib/hooks';
import { ToastContainer } from '@/components/ui';
import { PermissionGuard } from '@/components/layout';
import { usePurchaseOrdersStore, useSuppliersStore } from '@/stores';
import { broadcastInvalidation } from '@/lib/cross-tab-sync';

type ActiveTab = 'suppliers' | 'purchase-orders';

export default function ProveedoresPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('suppliers');
  const toast = useToast();

  // ── Suppliers store (data — single shallow subscription) ──
  const {
    suppliers, supplierTotal, supplierPage, supplierLimit,
    supplierSearch, supplierStatusFilter, supplierLoading,
    supplierStats, supplierSubmitting,
  } = useSuppliersStore(useShallow((s) => ({
    suppliers: s.suppliers,
    supplierTotal: s.total,
    supplierPage: s.page,
    supplierLimit: s.limit,
    supplierSearch: s.search,
    supplierStatusFilter: s.statusFilter,
    supplierLoading: s.loading,
    supplierStats: s.stats,
    supplierSubmitting: s.submitting,
  })));

  // ── Suppliers store (actions — stable references) ──
  const setSuppliersData = useSuppliersStore((s) => s.setSuppliers);
  const setSupplierStats = useSuppliersStore((s) => s.setStats);
  const setSupplierLoading = useSuppliersStore((s) => s.setLoading);
  const setSupplierSubmitting = useSuppliersStore((s) => s.setSubmitting);
  const setSupplierPage = useSuppliersStore((s) => s.setPage);
  const setSupplierLimit = useSuppliersStore((s) => s.setLimit);
  const setSupplierSearch = useSuppliersStore((s) => s.setSearch);
  const setSupplierStatusFilter = useSuppliersStore((s) => s.setStatusFilter);
  const patchSupplier = useSuppliersStore((s) => s.patchSupplier);
  const removeSupplierFromStore = useSuppliersStore((s) => s.removeSupplier);

  // ── Purchase orders store (data — single shallow subscription) ──
  const {
    orders, orderTotal, orderPage, orderLimit,
    orderSearch, orderStatusFilter, orderLoading,
    orderStats, orderSubmitting,
  } = usePurchaseOrdersStore(useShallow((s) => ({
    orders: s.orders,
    orderTotal: s.total,
    orderPage: s.page,
    orderLimit: s.limit,
    orderSearch: s.search,
    orderStatusFilter: s.statusFilter,
    orderLoading: s.loading,
    orderStats: s.stats,
    orderSubmitting: s.submitting,
  })));

  // ── Purchase orders store (actions — stable references) ──
  const setOrdersData = usePurchaseOrdersStore((s) => s.setOrders);
  const setOrderStats = usePurchaseOrdersStore((s) => s.setStats);
  const setOrderLoading = usePurchaseOrdersStore((s) => s.setLoading);
  const setOrderSubmitting = usePurchaseOrdersStore((s) => s.setSubmitting);
  const setOrderPage = usePurchaseOrdersStore((s) => s.setPage);
  const setOrderLimit = usePurchaseOrdersStore((s) => s.setLimit);
  const setOrderSearch = usePurchaseOrdersStore((s) => s.setSearch);
  const setOrderStatusFilter = usePurchaseOrdersStore((s) => s.setStatusFilter);
  const upsertOrder = usePurchaseOrdersStore((s) => s.upsertOrder);
  const removeOrderFromStore = usePurchaseOrdersStore((s) => s.removeOrder);

  const debouncedSupplierSearch = useDebounce(supplierSearch, 500);
  const debouncedOrderSearch = useDebounce(orderSearch, 500);

  // ── Load suppliers ──
  const loadSuppliers = useCallback(async (
    p = supplierPage,
    q = supplierSearch,
    l = supplierLimit,
    filter = supplierStatusFilter
  ) => {
    setSupplierLoading(true);
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
      const res = await getSuppliers(filters);
      setSuppliersData(res.items, res.total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error al cargar proveedores:', msg);
      toast.error('Error al cargar los proveedores.');
    } finally {
      setSupplierLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSupplierStats = useCallback(async () => {
    try {
      const stats = await getSupplierStatistics();
      setSupplierStats(stats);
    } catch (err) {
      console.error('Error cargando estadísticas de proveedores:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load purchase orders ──
  const loadOrders = useCallback(async (
    p = orderPage,
    q = orderSearch,
    l = orderLimit,
    status = orderStatusFilter
  ) => {
    setOrderLoading(true);
    try {
      const res = await getPurchaseOrders({
        page: p,
        limit: l,
        search: q,
        status: status,
      });
      setOrdersData(res.items, res.total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error al cargar órdenes de compra:', msg);
      toast.error('Error al cargar las órdenes de compra.');
    } finally {
      setOrderLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrderStats = useCallback(async () => {
    try {
      const stats = await getPurchaseOrderStatistics();
      setOrderStats(stats);
    } catch (err) {
      console.error('Error cargando estadísticas de órdenes:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Effects ──
  useEffect(() => {
    loadSupplierStats();
    loadOrderStats();
  }, [loadSupplierStats, loadOrderStats]);

  useEffect(() => {
    loadSuppliers(supplierPage, debouncedSupplierSearch, supplierLimit, supplierStatusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierPage, debouncedSupplierSearch, supplierLimit, supplierStatusFilter]);

  useEffect(() => {
    loadOrders(orderPage, debouncedOrderSearch, orderLimit, orderStatusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderPage, debouncedOrderSearch, orderLimit, orderStatusFilter]);

  // ── Cross-tab sync ──
  useCrossTabSync('suppliers', () => {
    loadSuppliers(supplierPage, debouncedSupplierSearch, supplierLimit, supplierStatusFilter);
    loadSupplierStats();
  });
  useCrossTabSync('purchase-orders', () => {
    loadOrders(orderPage, debouncedOrderSearch, orderLimit, orderStatusFilter);
    loadOrderStats();
  });

  // ── Supplier handlers ──
  const handleSupplierCreate = async (data: CreateSupplierDto) => {
    setSupplierSubmitting(true);
    try {
      await createSupplier(data);
      toast.success(`Proveedor "${data.name}" creado exitosamente`);
      await loadSuppliers(supplierPage, debouncedSupplierSearch, supplierLimit, supplierStatusFilter);
      loadSupplierStats();
      broadcastInvalidation('suppliers');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al crear el proveedor: ${msg}`);
    } finally {
      setSupplierSubmitting(false);
    }
  };

  const handleSupplierUpdate = async (id: number, data: UpdateSupplierDto) => {
    setSupplierSubmitting(true);
    try {
      const updated = await updateSupplier(id, data);
      patchSupplier(id, updated);
      toast.success('Proveedor actualizado exitosamente');
      loadSupplierStats();
      broadcastInvalidation('suppliers');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al actualizar el proveedor: ${msg}`);
    } finally {
      setSupplierSubmitting(false);
    }
  };

  const handleSupplierDelete = async (id: number) => {
    setSupplierSubmitting(true);
    try {
      await deleteSupplier(id);
      removeSupplierFromStore(id);
      toast.success('Proveedor eliminado exitosamente');
      loadSupplierStats();
      broadcastInvalidation('suppliers');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al eliminar el proveedor: ${msg}`);
    } finally {
      setSupplierSubmitting(false);
    }
  };

  // ── Purchase order handlers ──
  const handleOrderCreate = async (data: CreatePurchaseOrderDto) => {
    setOrderSubmitting(true);
    try {
      await createPurchaseOrder(data);
      toast.success('Orden de compra creada exitosamente');
      await loadOrders(orderPage, debouncedOrderSearch, orderLimit, orderStatusFilter);
      loadOrderStats();
      loadSupplierStats();
      broadcastInvalidation(['purchase-orders', 'suppliers']);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al crear la orden de compra: ${msg}`);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleOrderDelete = async (id: number) => {
    setOrderSubmitting(true);
    try {
      await deletePurchaseOrder(id);
      removeOrderFromStore(id);
      toast.success('Orden de compra cancelada exitosamente');
      loadOrderStats();
      broadcastInvalidation('purchase-orders');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al cancelar la orden de compra: ${msg}`);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleOrderStatusChange = async (id: number, newStatus: PurchaseOrderStatus) => {
    try {
      await updatePurchaseOrder(id, { status: newStatus });
      const label = PURCHASE_ORDER_STATUS_LABELS[newStatus];
      toast.success(`Orden actualizada a "${label}"`);
      // Actualizar la orden en el store con el detalle completo del servidor
      try {
        const fresh = await getPurchaseOrderById(id);
        upsertOrder(fresh);
      } catch {
        // fallback: patch con el nuevo status
        upsertOrder({ ...orders.find((o) => o.id === id)!, status: newStatus });
      }
      loadOrderStats();
      broadcastInvalidation(['purchase-orders', 'inventory']);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al cambiar estado: ${msg}`);
      throw err;
    }
  };

  const handleOrderCostsUpdate = async (id: number, data: UpdatePurchaseOrderCostsDto) => {
    try {
      const updated = await updatePurchaseOrderCosts(id, data);
      // Actualizar en store
      upsertOrder(updated);
      toast.success('Costos de internación actualizados');
      broadcastInvalidation('purchase-orders');
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al actualizar costos: ${msg}`);
      throw err;
    }
  };

  /**
   * Callback tras crear una recepción parcial.
   * Recarga la orden actualizada del backend y la inyecta en el store.
   */
  const handleReceptionCreated = useCallback(async (orderId?: number) => {
    // Recargar stats
    loadOrderStats();
    // Si tenemos el id, recargar solo esa orden
    if (orderId) {
      try {
        const fresh = await getPurchaseOrderById(orderId);
        upsertOrder(fresh);
      } catch {
        // fallback: recargar todo
        loadOrders(orderPage, debouncedOrderSearch, orderLimit, orderStatusFilter);
      }
    } else {
      loadOrders(orderPage, debouncedOrderSearch, orderLimit, orderStatusFilter);
    }
    // Notificar a otras pestañas (las recepciones afectan inventario también)
    broadcastInvalidation(['purchase-orders', 'inventory']);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderPage, debouncedOrderSearch, orderLimit, orderStatusFilter]);

  return (
    <PermissionGuard moduleCode="PROVEEDORES">
      <main className="p-6">
        <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
              <p className="text-gray-500">Gestión de proveedores y órdenes de compra</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'suppliers'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              Proveedores
            </button>
            <button
              onClick={() => setActiveTab('purchase-orders')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'purchase-orders'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Órdenes de Compra
            </button>
          </div>

          {/* Content */}
          {activeTab === 'suppliers' && (
            <>
              <SupplierStats statistics={supplierStats} />
              {supplierLoading ? (
                <SupplierTableSkeleton rows={supplierLimit} />
              ) : (
                <SupplierTable
                  suppliers={suppliers}
                  onSupplierCreate={handleSupplierCreate}
                  onSupplierUpdate={handleSupplierUpdate}
                  onSupplierDelete={handleSupplierDelete}
                  externalSearch={supplierSearch}
                  onSearchChange={(v) => { setSupplierSearch(v); }}
                  externalPage={supplierPage}
                  onPageChange={(p) => setSupplierPage(p)}
                  externalItemsPerPage={supplierLimit}
                  onItemsPerPageChange={(l) => { setSupplierLimit(l); }}
                  externalStatusFilter={supplierStatusFilter}
                  onStatusFilterChange={(f) => { setSupplierStatusFilter(f); }}
                  totalItems={supplierTotal}
                  submitting={supplierSubmitting}
                />
              )}
            </>
          )}

          {activeTab === 'purchase-orders' && (
            <>
              <PurchaseOrderStats statistics={orderStats} />
              {orderLoading ? (
                <PurchaseOrderTableSkeleton rows={orderLimit} />
              ) : (
                <PurchaseOrderTable
                  orders={orders}
                  onOrderCreate={handleOrderCreate}
                  onOrderDelete={handleOrderDelete}
                  onOrderStatusChange={handleOrderStatusChange}
                  onOrderCostsUpdate={handleOrderCostsUpdate}
                  onReceptionCreated={handleReceptionCreated}
                  externalSearch={orderSearch}
                  onSearchChange={(v) => { setOrderSearch(v); }}
                  externalPage={orderPage}
                  onPageChange={(p) => setOrderPage(p)}
                  externalItemsPerPage={orderLimit}
                  onItemsPerPageChange={(l) => { setOrderLimit(l); }}
                  externalStatusFilter={orderStatusFilter}
                  onStatusFilterChange={(f) => { setOrderStatusFilter(f); }}
                  totalItems={orderTotal}
                  submitting={orderSubmitting}
                />
              )}
            </>
          )}
        </div>
      </main>
    </PermissionGuard>
  );
}
