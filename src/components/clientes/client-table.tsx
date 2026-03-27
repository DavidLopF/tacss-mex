'use client';

import { useState } from 'react';
import { Search, Plus, Eye, Edit, Trash2, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Button, Badge } from '@/src/components/ui';
import { ClientDetail } from '@/src/services/clients';
import { getClientById } from '@/src/services/clients/clients.service';
import { formatCurrency, formatDate } from '@/src/lib/utils';
import { ClientDetailModal } from './client-detail-modal';
import { CreateClientModal } from './create-client-modal';
import { EditClientModal } from './edit-client-modal';
import { DeleteClientModal } from './delete-client-modal';
import type { CreateClientDto, UpdateClientDto } from '@/src/services/clients';

interface ClientTableProps {
  clients: ClientDetail[];
  onClientCreate?: (data: CreateClientDto) => void;
  onClientUpdate?: (id: number, data: UpdateClientDto) => void;
  onClientDelete?: (id: number) => void;
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

export function ClientTable({
  clients,
  onClientCreate,
  onClientUpdate,
  onClientDelete,
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
}: ClientTableProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const [internalPage, setInternalPage] = useState(1);
  const [internalStatusFilter, setInternalStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const itemsPerPage = 10;

  const isControlledSearch = typeof externalSearch === 'string' && typeof onSearchChange === 'function';
  const searchTerm = isControlledSearch ? externalSearch! : internalSearch;

  const isControlledPage = typeof externalPage === 'number' && typeof onPageChange === 'function';
  const currentPage = isControlledPage ? externalPage! : internalPage;

  const isControlledStatusFilter = typeof externalStatusFilter === 'string' && typeof onStatusFilterChange === 'function';
  const statusFilter = isControlledStatusFilter ? externalStatusFilter! : internalStatusFilter;

  const effectiveItemsPerPage = externalItemsPerPage ?? itemsPerPage;

  // Ya no filtramos client-side si el filtro es controlado (server-side)
  const filteredClients = isControlledStatusFilter 
    ? clients 
    : clients.filter(client => {
        if (statusFilter === 'active') return client.isActive;
        if (statusFilter === 'inactive') return !client.isActive;
        return true;
      });

  const totalPages = Math.ceil(
    (externalItemsPerPage ? (totalItems ?? filteredClients.length) : filteredClients.length) / effectiveItemsPerPage
  );

  const currentClients = externalItemsPerPage
    ? filteredClients
    : filteredClients.slice((currentPage - 1) * effectiveItemsPerPage, currentPage * effectiveItemsPerPage);

  // Handlers
  const handleViewClient = async (client: ClientDetail) => {
    try {
      setLoadingDetail(true);
      // Obtener datos completos del cliente desde el backend
      const fullClient = await getClientById(client.id);
      setSelectedClient(fullClient);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error('Error al obtener detalle del cliente:', error);
      // En caso de error, mostrar con los datos que ya tenemos
      setSelectedClient(client);
      setIsDetailModalOpen(true);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleEditClient = (client: ClientDetail) => {
    setSelectedClient(client);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (client: ClientDetail) => {
    setSelectedClient(client);
    setIsDeleteModalOpen(true);
  };

  const handleCreate = (data: CreateClientDto) => {
    if (onClientCreate) {
      onClientCreate(data);
    }
    setIsCreateModalOpen(false);
  };

  const handleUpdate = (id: number, data: UpdateClientDto) => {
    if (onClientUpdate) {
      onClientUpdate(id, data);
    }
    setIsEditModalOpen(false);
    setSelectedClient(null);
  };

  const handleConfirmDelete = () => {
    if (selectedClient && onClientDelete) {
      onClientDelete(selectedClient.id);
    }
    setIsDeleteModalOpen(false);
    setSelectedClient(null);
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
              placeholder="Buscar clientes por nombre o documento..."
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
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {status === 'all' ? 'Todos' : status === 'active' ? 'Activos' : 'Inactivos'}
              </button>
            ))}
          </div>
        </div>

        {canCreate && (
        <Button className="flex items-center gap-2" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Nuevo Cliente
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
                  Cliente
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Documento
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Pedidos
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Total Gastado
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Estado
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Registro
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <User className="w-8 h-8 text-gray-300" />
                      <p className="text-sm text-gray-500">No se encontraron clientes</p>
                      {searchTerm && (
                        <p className="text-xs text-gray-400">
                          Intenta con otros términos de búsqueda
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {getInitials(client.name)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{client.name}</p>
                          <p className="text-xs text-gray-500">ID: {client.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700 font-mono">
                        {client.document || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900">
                        {client.totalOrders}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(client.totalSpent)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={client.isActive ? 'success' : 'danger'}>
                        {client.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {formatDate(new Date(client.createdAt))}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewClient(client)}
                          className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-gray-400 hover:text-primary disabled:opacity-50"
                          title="Ver detalle"
                          disabled={loadingDetail}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                        <button
                          onClick={() => handleEditClient(client)}
                          className="p-2 hover:bg-amber-50 rounded-lg transition-colors text-gray-400 hover:text-amber-600 disabled:opacity-50"
                          title="Editar"
                          disabled={loadingDetail}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        )}
                        {canDelete && (
                        <button
                          onClick={() => handleDeleteClick(client)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600"
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
            {Math.min(currentPage * effectiveItemsPerPage, totalItems ?? filteredClients.length)} de{' '}
            {totalItems ?? filteredClients.length} clientes
          </p>
          <div className="flex items-center gap-2">
            {/* Items per page */}
            <select
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={effectiveItemsPerPage}
              onChange={(e) => {
                const newLimit = Number(e.target.value);
                if (onItemsPerPageChange) {
                  onItemsPerPageChange(newLimit);
                }
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
      <CreateClientModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreate}
        submitting={submitting}
      />

      <ClientDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedClient(null); }}
        client={selectedClient}
      />

      <EditClientModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedClient(null); }}
        onSave={handleUpdate}
        client={selectedClient}
        submitting={submitting}
      />

      <DeleteClientModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setSelectedClient(null); }}
        onConfirm={handleConfirmDelete}
        client={selectedClient}
        submitting={submitting}
      />
    </div>
  );
}
