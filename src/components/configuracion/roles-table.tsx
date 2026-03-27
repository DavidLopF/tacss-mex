'use client';

import { useState } from 'react';
import { Search, Plus, Edit, Trash2, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Badge } from '@/src/components/ui';
import { CreateRoleModal } from './create-role-modal';
import { EditRoleModal } from './edit-role-modal';
import { DeleteRoleModal } from './delete-role-modal';
import type { Role, CreateRoleDto, UpdateRoleDto } from '@/src/services/users';

interface RolesTableProps {
  roles: Role[];
  onRoleCreate?: (data: CreateRoleDto) => void;
  onRoleUpdate?: (id: number, data: UpdateRoleDto) => void;
  onRoleDelete?: (id: number) => void;
  externalSearch?: string;
  onSearchChange?: (value: string) => void;
  externalPage?: number;
  onPageChange?: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  submitting?: boolean;
}

export function RolesTable({
  roles,
  onRoleCreate,
  onRoleUpdate,
  onRoleDelete,
  externalSearch,
  onSearchChange,
  externalPage,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
  submitting,
}: RolesTableProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const [internalPage, setInternalPage] = useState(1);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const isControlledSearch = typeof externalSearch === 'string' && typeof onSearchChange === 'function';
  const searchTerm = isControlledSearch ? externalSearch! : internalSearch;

  const isControlledPage = typeof externalPage === 'number' && typeof onPageChange === 'function';
  const currentPage = isControlledPage ? externalPage! : internalPage;

  const totalPages = Math.ceil((totalItems ?? roles.length) / itemsPerPage);

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteModalOpen(true);
  };

  const handleCreate = (data: CreateRoleDto) => {
    if (onRoleCreate) onRoleCreate(data);
    setIsCreateModalOpen(false);
  };

  const handleUpdate = (id: number, data: UpdateRoleDto) => {
    if (onRoleUpdate) onRoleUpdate(id, data);
    setIsEditModalOpen(false);
    setSelectedRole(null);
  };

  const handleConfirmDelete = () => {
    if (selectedRole && onRoleDelete) {
      onRoleDelete(selectedRole.id);
    }
    setIsDeleteModalOpen(false);
    setSelectedRole(null);
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
      {/* Barra de búsqueda y acciones */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar roles..."
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

        <Button onClick={() => setIsCreateModalOpen(true)} size="md">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Rol
        </Button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuarios
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No se encontraron roles</p>
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Shield className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{role.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {role.description || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {role.usersCount ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={role.isActive ? 'success' : 'danger'}>
                        {role.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditRole(role)}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(role)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {(() => {
          const total = totalItems ?? roles.length;
          const start = (currentPage - 1) * itemsPerPage + 1;
          const end = Math.min(currentPage * itemsPerPage, total);

          const getPageNumbers = () => {
            if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
            const pages: (number | '...')[] = [1];
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
              pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
            return pages;
          };

          return (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">
                {total === 0 ? 'Sin resultados' : `Mostrando ${start}–${end} de ${total} roles`}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs px-2"
                  title="Primera página"
                >
                  «
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {getPageNumbers().map((page, idx) =>
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm">…</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page as number)}
                      className={`min-w-[32px] h-8 rounded-lg border text-sm transition-colors ${
                        page === currentPage
                          ? 'bg-primary border-primary text-white font-medium'
                          : 'border-gray-200 hover:bg-white text-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs px-2"
                  title="Última página"
                >
                  »
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Modals */}
      <CreateRoleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreate}
        submitting={submitting}
      />

      <EditRoleModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedRole(null); }}
        onSave={handleUpdate}
        role={selectedRole}
        submitting={submitting}
      />

      <DeleteRoleModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setSelectedRole(null); }}
        onConfirm={handleConfirmDelete}
        role={selectedRole}
        submitting={submitting}
      />
    </div>
  );
}
