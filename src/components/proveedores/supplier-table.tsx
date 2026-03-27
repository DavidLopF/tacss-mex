'use client';

import { useState } from 'react';
import { Search, Plus, Eye, Edit, Trash2, Truck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Button, Badge } from '@/src/components/ui';
import { SupplierDetail } from '@/src/services/suppliers';
import { getSupplierById } from '@/src/services/suppliers/suppliers.service';
import { formatCurrency } from '@/src/lib/utils';
import { SupplierDetailModal } from './supplier-detail-modal';
import { CreateSupplierModal } from './create-supplier-modal';
import { EditSupplierModal } from './edit-supplier-modal';
import { DeleteSupplierModal } from './delete-supplier-modal';
import type { CreateSupplierDto, UpdateSupplierDto } from '@/src/services/suppliers';

interface SupplierTableProps {
  suppliers: SupplierDetail[];
  onSupplierCreate?: (data: CreateSupplierDto) => void;
  onSupplierUpdate?: (id: number, data: UpdateSupplierDto) => void;
  onSupplierDelete?: (id: number) => void;
  // Server-driven controlled props
  externalSearch?: string;
  onSearchChange?: (value: string) => void;
  externalPage?: number;
  onPageChange?: (page: number) => void;
  externalItemsPerPage?: number;
  onItemsPerPageChange?: (limit: number) => void;
  externalStatusFilter?: 'all' | 'active' | 'inactive';
  onStatusFilterChange?: (filter: 'all' | 'active' | 'inactive') => void;
  totalItems?: number;
  submitting?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function SupplierTable({
  suppliers,
  onSupplierCreate,
  onSupplierUpdate,
  onSupplierDelete,
  externalSearch,
  onSearchChange,
  externalPage,
  onPageChange,
  externalItemsPerPage,
  onItemsPerPageChange,
  externalStatusFilter,
  onStatusFilterChange,
  totalItems,
  submitting,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: SupplierTableProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const [internalPage, setInternalPage] = useState(1);
  const [internalStatusFilter, setInternalStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const itemsPerPage = 10;

  const isControlledSearch = typeof externalSearch === 'string' && typeof onSearchChange === 'function';
  const searchTerm = isControlledSearch ? externalSearch! : internalSearch;

  const isControlledPage = typeof externalPage === 'number' && typeof onPageChange === 'function';
  const currentPage = isControlledPage ? externalPage! : internalPage;

  const isControlledStatusFilter = typeof externalStatusFilter === 'string' && typeof onStatusFilterChange === 'function';
  const statusFilter = isControlledStatusFilter ? externalStatusFilter! : internalStatusFilter;

  const effectiveItemsPerPage = externalItemsPerPage ?? itemsPerPage;

  // Guard: asegurar que suppliers siempre sea un array
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

  const filteredSuppliers = isControlledStatusFilter
    ? safeSuppliers
    : safeSuppliers.filter(s => {
        if (statusFilter === 'active') return s.isActive;
        if (statusFilter === 'inactive') return !s.isActive;
        return true;
      });

  const totalPages = Math.ceil(
    (externalItemsPerPage ? (totalItems ?? filteredSuppliers.length) : filteredSuppliers.length) / effectiveItemsPerPage
  );

  const currentSuppliers = externalItemsPerPage
    ? filteredSuppliers
    : filteredSuppliers.slice((currentPage - 1) * effectiveItemsPerPage, currentPage * effectiveItemsPerPage);

  // Handlers
  const handleViewSupplier = async (supplier: SupplierDetail) => {
    try {
      setLoadingDetail(true);
      const full = await getSupplierById(supplier.id);
      setSelectedSupplier(full);
      setIsDetailModalOpen(true);
    } catch {
      setSelectedSupplier(supplier);
      setIsDetailModalOpen(true);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleEditSupplier = (supplier: SupplierDetail) => {
    setSelectedSupplier(supplier);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (supplier: SupplierDetail) => {
    setSelectedSupplier(supplier);
    setIsDeleteModalOpen(true);
  };

  const handleCreate = (data: CreateSupplierDto) => {
    if (onSupplierCreate) onSupplierCreate(data);
    setIsCreateModalOpen(false);
  };

  const handleUpdate = (id: number, data: UpdateSupplierDto) => {
    if (onSupplierUpdate) onSupplierUpdate(id, data);
    setIsEditModalOpen(false);
    setSelectedSupplier(null);
  };

  const handleConfirmDelete = () => {
    if (selectedSupplier && onSupplierDelete) onSupplierDelete(selectedSupplier.id);
    setIsDeleteModalOpen(false);
    setSelectedSupplier(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    if (isControlledPage && onPageChange) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar proveedores por nombre o RFC..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => {
                if (isControlledSearch && onSearchChange) {
                  onSearchChange(e.target.value);
                } else {
                  setInternalSearch(e.target.value);
                }
              }}
            />
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  if (isControlledStatusFilter && onStatusFilterChange) {
                    onStatusFilterChange(status);
                  } else {
                    setInternalStatusFilter(status);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === status
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {status === 'all' ? 'Todos' : status === 'active' ? 'Activos' : 'Inactivos'}
              </button>
            ))}
          </div>
        </div>

        {canCreate && (
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Proveedor
          </Button>
        )}
      </div>

      {/* Tabla */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Proveedor
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  RFC
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Contacto
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Total Compras
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Estado
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No se encontraron proveedores</p>
                    <p className="text-gray-400 text-sm mt-1">Intenta cambiar los filtros de búsqueda</p>
                  </td>
                </tr>
              ) : (
                currentSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-orange-600">
                            {getInitials(supplier.name)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{supplier.name}</p>
                          {supplier.email && (
                            <p className="text-xs text-gray-500">{supplier.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 font-mono">
                        {supplier.rfc || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {supplier.contactName ? (
                        <div>
                          <p className="text-sm text-gray-900">{supplier.contactName}</p>
                          {supplier.contactPhone && (
                            <p className="text-xs text-gray-500">{supplier.contactPhone}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(supplier.totalPurchases)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={supplier.isActive ? 'success' : 'danger'}>
                        {supplier.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewSupplier(supplier)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalle"
                          disabled={loadingDetail}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleEditSupplier(supplier)}
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteClick(supplier)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Mostrando {((currentPage - 1) * effectiveItemsPerPage) + 1} a{' '}
            {Math.min(currentPage * effectiveItemsPerPage, totalItems ?? filteredSuppliers.length)} de{' '}
            {totalItems ?? filteredSuppliers.length} proveedores
          </p>
          <div className="flex items-center gap-2">
            {/* Items por página */}
            <select
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={effectiveItemsPerPage}
              onChange={(e) => {
                const newLimit = Number(e.target.value);
                if (onItemsPerPageChange) onItemsPerPageChange(newLimit);
              }}
            >
              {[5, 10, 20, 50].map((v) => (
                <option key={v} value={v}>{v} / pág</option>
              ))}
            </select>

            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Modals */}
      <SupplierDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedSupplier(null); }}
        supplier={selectedSupplier}
      />
      <CreateSupplierModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreate}
        submitting={submitting}
      />
      <EditSupplierModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedSupplier(null); }}
        onSave={handleUpdate}
        supplier={selectedSupplier}
        submitting={submitting}
      />
      <DeleteSupplierModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setSelectedSupplier(null); }}
        onConfirm={handleConfirmDelete}
        supplier={selectedSupplier}
        submitting={submitting}
      />
    </div>
  );
}
