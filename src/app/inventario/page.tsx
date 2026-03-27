'use client';

import { useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { InventoryTable, InventoryTableSkeleton, InventoryStats } from '@/components/inventario';
import { Producto } from '@/types';
import { getProducts, PaginatedProductsDto, getStadistics } from '@/services/products';
import { useDebounce, useToast, usePermissions, useCrossTabSync } from '@/lib/hooks';
import { ToastContainer } from '@/components/ui';
import { PermissionGuard } from '@/components/layout';
import { useInventoryStore } from '@/stores';
import { broadcastInvalidation } from '@/lib/cross-tab-sync';

export default function InventarioPage() {
  // ── Data & UI state (single shallow subscription) ──
  const {
    products, page, limit, search, total, loading, statistics,
  } = useInventoryStore(useShallow((s) => ({
    products: s.products,
    page: s.page,
    limit: s.limit,
    search: s.search,
    total: s.total,
    loading: s.loading,
    statistics: s.statistics,
  })));

  // ── Actions (stable references — no re-render on data change) ──
  const setProducts = useInventoryStore((s) => s.setProducts);
  const setStatistics = useInventoryStore((s) => s.setStatistics);
  const setLoading = useInventoryStore((s) => s.setLoading);
  const setPage = useInventoryStore((s) => s.setPage);
  const setLimit = useInventoryStore((s) => s.setLimit);
  const setSearch = useInventoryStore((s) => s.setSearch);
  const patchProduct = useInventoryStore((s) => s.patchProduct);
  const removeProduct = useInventoryStore((s) => s.removeProduct);
  const upsertProduct = useInventoryStore((s) => s.upsertProduct);

  // Toast notifications
  const toast = useToast();
  const { canCreate, canEdit, canDelete } = usePermissions('INVENTARIO');

  const debouncedSearch = useDebounce(search, 500);

  const load = useCallback(async (p = page, q = search, l = limit) => {
    setLoading(true);
    try {
      const filters = { page: p, limit: l, search: q };
      const res: PaginatedProductsDto = await getProducts(filters);
      setProducts(res.items, res.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error al cargar productos:', errorMessage);
      toast.error('Error al cargar los productos. Verifica que el servidor esté en ejecución.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStatistics = useCallback(async () => {
    try {
      const stats = await getStadistics();
      setStatistics(stats);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
      toast.error('No se pudieron cargar las estadísticas del inventario.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  useEffect(() => {
    load(page, debouncedSearch, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, limit]);

  // ── Cross-tab sync: recargar cuando otra pestaña muta inventario ──
  useCrossTabSync('inventory', () => {
    load(page, debouncedSearch, limit);
    loadStatistics();
  });

  const handleProductUpdate = (updatedProduct: Producto) => {
    patchProduct(updatedProduct.id, updatedProduct);
    broadcastInvalidation('inventory');
    toast.success('Producto actualizado exitosamente');
  };

  const handleProductCreate = (newProduct: Omit<Producto, 'id' | 'createdAt' | 'updatedAt'>) => {
    const producto: Producto = {
      ...newProduct,
      id: `prod-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    upsertProduct(producto);
    loadStatistics();
    broadcastInvalidation('inventory');
    toast.success(`Producto "${newProduct.nombre}" creado exitosamente`);
  };

  const handleProductDelete = (productoId: string) => {
    removeProduct(productoId);
    loadStatistics();
    broadcastInvalidation('inventory');
    toast.success('Producto eliminado exitosamente');
  };

  return (
    <PermissionGuard moduleCode="INVENTARIO">
      <main className="p-6">
        <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
              <p className="text-gray-500">Gestión de productos y control de stock</p>
            </div>
          </div>
          
          <InventoryStats statistics={statistics} />
          <div>
            {loading ? (
              <InventoryTableSkeleton rows={limit} />
            ) : (
              <InventoryTable 
                productos={products} 
                onProductUpdate={canEdit ? handleProductUpdate : undefined}
                onProductCreate={canCreate ? handleProductCreate : undefined}
                onProductDelete={canDelete ? handleProductDelete : undefined}
                onError={toast.error}
                onSuccess={toast.success}
                externalSearch={search}
                onSearchChange={(v) => { setSearch(v); }}
                externalPage={page}
                onPageChange={(p) => setPage(p)}
                externalItemsPerPage={limit}
                onItemsPerPageChange={(newLimit) => { setLimit(newLimit); }}
                totalItems={total}
                canCreate={canCreate}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            )}
          </div>
        </div>
      </main>
    </PermissionGuard>
  );
}