'use client';

import { useState } from 'react';
import { Search, Plus, Edit, Trash2, UserCircle, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Badge } from '@/src/components/ui';
import { formatDateTime } from '@/src/lib/utils';
import { CreateUserModal } from './create-user-modal';
import { EditUserModal } from './edit-user-modal';
import { DeleteUserModal } from './delete-user-modal';
import { ChangeRoleModal } from './change-role-modal';
import type { UserDetail, CreateUserDto, UpdateUserDto } from '@/src/services/users';

interface UsersTableProps {
  users: UserDetail[];
  onUserCreate?: (data: CreateUserDto) => void;
  onUserUpdate?: (id: number, data: UpdateUserDto) => void;
  onUserDelete?: (id: number) => void;
  onUserRoleChange?: (userId: number, roleId: number) => void;
  onRoleCreate?: (data: import('@/src/services/users').CreateRoleDto) => Promise<import('@/src/services/users').Role | void>;
  externalSearch?: string;
  onSearchChange?: (value: string) => void;
  externalPage?: number;
  onPageChange?: (page: number) => void;
  externalStatusFilter?: 'all' | 'active' | 'inactive';
  onStatusFilterChange?: (filter: 'all' | 'active' | 'inactive') => void;
  totalItems?: number;
  itemsPerPage?: number;
  submitting?: boolean;
  isAdmin?: boolean;
}

export function UsersTable({
  users,
  onUserCreate,
  onUserUpdate,
  onUserDelete,
  onUserRoleChange,
  onRoleCreate,
  externalSearch,
  onSearchChange,
  externalPage,
  onPageChange,
  externalStatusFilter,
  onStatusFilterChange,
  totalItems,
  itemsPerPage = 10,
  submitting,
  isAdmin = true,
}: UsersTableProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const [internalPage, setInternalPage] = useState(1);
  const [internalStatusFilter, setInternalStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);

  const isControlledSearch = typeof externalSearch === 'string' && typeof onSearchChange === 'function';
  const searchTerm = isControlledSearch ? externalSearch! : internalSearch;

  const isControlledPage = typeof externalPage === 'number' && typeof onPageChange === 'function';
  const currentPage = isControlledPage ? externalPage! : internalPage;

  const isControlledStatusFilter = typeof externalStatusFilter === 'string' && typeof onStatusFilterChange === 'function';
  const statusFilter = isControlledStatusFilter ? externalStatusFilter! : internalStatusFilter;

  const filteredUsers = isControlledStatusFilter
    ? users
    : users.filter(user => {
        if (statusFilter === 'active') return user.isActive;
        if (statusFilter === 'inactive') return !user.isActive;
        return true;
      });

  const totalPages = Math.ceil((totalItems ?? filteredUsers.length) / itemsPerPage);

  const handleEditUser = (user: UserDetail) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (user: UserDetail) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleChangeRoleClick = (user: UserDetail) => {
    setSelectedUser(user);
    setIsChangeRoleModalOpen(true);
  };

  const handleCreate = (data: CreateUserDto) => {
    if (onUserCreate) onUserCreate(data);
    setIsCreateModalOpen(false);
  };

  const handleUpdate = (id: number, data: UpdateUserDto) => {
    if (onUserUpdate) onUserUpdate(id, data);
    setIsEditModalOpen(false);
    setSelectedUser(null);
  };

  const handleConfirmDelete = () => {
    if (selectedUser && onUserDelete) {
      onUserDelete(selectedUser.id);
    }
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
  };

  const handleRoleChange = (userId: number, roleId: number) => {
    if (onUserRoleChange) onUserRoleChange(userId, roleId);
    setIsChangeRoleModalOpen(false);
    setSelectedUser(null);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    if (isControlledPage && onPageChange) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
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
              placeholder="Buscar usuarios por nombre o email..."
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

        <Button onClick={() => setIsCreateModalOpen(true)} size="md">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Creado
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <UserCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No se encontraron usuarios</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-accent/20 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">
                            {getInitials(user.fullName)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{user.fullName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{user.email}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleChangeRoleClick(user)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full hover:bg-purple-200 transition-colors cursor-pointer"
                        title="Cambiar rol"
                      >
                        <Shield className="w-3 h-3" />
                        {user.role?.name ?? '—'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={user.isActive ? 'success' : 'danger'}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-500">
                        {formatDateTime(user.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleChangeRoleClick(user)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Cambiar rol"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(user)}
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
        {(totalItems ?? filteredUsers.length) > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-500">
              {(() => {
                const total = totalItems ?? filteredUsers.length;
                const from = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
                const to = Math.min(currentPage * itemsPerPage, total);
                return `Mostrando ${from}–${to} de ${total} usuarios`;
              })()}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage <= 1}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                «
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Números de página */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p as number)}
                      className={`min-w-[32px] px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                        p === currentPage
                          ? 'border-primary bg-primary text-white font-semibold'
                          : 'border-gray-200 hover:bg-white text-gray-600'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreate}
        submitting={submitting}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedUser(null); }}
        onSave={handleUpdate}
        user={selectedUser}
        submitting={submitting}
      />

      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setSelectedUser(null); }}
        onConfirm={handleConfirmDelete}
        user={selectedUser}
        submitting={submitting}
      />

      <ChangeRoleModal
        isOpen={isChangeRoleModalOpen}
        onClose={() => { setIsChangeRoleModalOpen(false); setSelectedUser(null); }}
        onSave={handleRoleChange}
        onRoleCreate={onRoleCreate}
        user={selectedUser}
        isAdmin={isAdmin}
        submitting={submitting}
      />
    </div>
  );
}
