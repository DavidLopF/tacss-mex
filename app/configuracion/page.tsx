'use client';

import { useEffect, useCallback } from 'react';
import { Users, Shield, Building2 } from 'lucide-react';
import { RolesTable, UsersTable, ConfigTableSkeleton, CompanySettingsForm } from '@/components/configuracion';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
} from '@/services/users';
import type {
  CreateRoleDto,
  UpdateRoleDto,
  CreateUserDto,
  UpdateUserDto,
} from '@/services/users';
import { useDebounce, useToast, useCrossTabSync } from '@/lib/hooks';
import { ToastContainer } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useCompany } from '@/lib/company-context';
import type { UpdateCompanySettingsDto } from '@/services/company';
import { updateCompanySettings } from '@/services/company';
import { PermissionGuard } from '@/components/layout';
import { useConfigStore } from '@/stores';
import { broadcastInvalidation } from '@/lib/cross-tab-sync';

type Tab = 'users' | 'roles' | 'company';

export default function ConfiguracionPage() {
  // ── Store ─────────────────────────────────────────────────────
  const activeTab = useConfigStore((s) => s.activeTab);
  const setActiveTab = useConfigStore((s) => s.setActiveTab);

  const roles = useConfigStore((s) => s.roles);
  const rolesTotal = useConfigStore((s) => s.rolesTotal);
  const rolesPage = useConfigStore((s) => s.rolesPage);
  const rolesSearch = useConfigStore((s) => s.rolesSearch);
  const loadingRoles = useConfigStore((s) => s.loadingRoles);
  const setRoles = useConfigStore((s) => s.setRoles);
  const setLoadingRoles = useConfigStore((s) => s.setLoadingRoles);
  const setRolesPage = useConfigStore((s) => s.setRolesPage);
  const setRolesSearch = useConfigStore((s) => s.setRolesSearch);
  const patchRole = useConfigStore((s) => s.patchRole);
  const removeRole = useConfigStore((s) => s.removeRole);

  const users = useConfigStore((s) => s.users);
  const usersTotal = useConfigStore((s) => s.usersTotal);
  const usersPage = useConfigStore((s) => s.usersPage);
  const usersSearch = useConfigStore((s) => s.usersSearch);
  const usersStatusFilter = useConfigStore((s) => s.usersStatusFilter);
  const loadingUsers = useConfigStore((s) => s.loadingUsers);
  const setUsers = useConfigStore((s) => s.setUsers);
  const setLoadingUsers = useConfigStore((s) => s.setLoadingUsers);
  const setUsersPage = useConfigStore((s) => s.setUsersPage);
  const setUsersSearch = useConfigStore((s) => s.setUsersSearch);
  const setUsersStatusFilter = useConfigStore((s) => s.setUsersStatusFilter);
  const patchUser = useConfigStore((s) => s.patchUser);
  const removeUser = useConfigStore((s) => s.removeUser);

  const submitting = useConfigStore((s) => s.submitting);
  const setSubmitting = useConfigStore((s) => s.setSubmitting);

  const toast = useToast();
  const debouncedRolesSearch = useDebounce(rolesSearch, 500);
  const debouncedUsersSearch = useDebounce(usersSearch, 500);

  const LIMIT = 10;

  // ═══════════════════════════════════════════════════════════════
  // ROLES CRUD
  // ═══════════════════════════════════════════════════════════════

  const loadRoles = useCallback(async (p = rolesPage, q = rolesSearch) => {
    setLoadingRoles(true);
    try {
      const res = await getRoles({ page: p, limit: LIMIT, search: q });
      setRoles(res.items, res.total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error al cargar roles:', msg);
      toast.error('Error al cargar los roles.');
    } finally {
      setLoadingRoles(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'roles') {
      loadRoles(rolesPage, debouncedRolesSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, rolesPage, debouncedRolesSearch]);

  const handleRoleCreate = async (data: CreateRoleDto) => {
    setSubmitting(true);
    try {
      await createRole(data);
      toast.success(`Rol "${data.name}" creado exitosamente`);
      await loadRoles(rolesPage, debouncedRolesSearch);
      broadcastInvalidation('config-roles');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al crear el rol: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleUpdate = async (id: number, data: UpdateRoleDto) => {
    setSubmitting(true);
    try {
      const updated = await updateRole(id, data);
      patchRole(id, updated);
      toast.success('Rol actualizado exitosamente');
      broadcastInvalidation('config-roles');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al actualizar el rol: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleDelete = async (id: number) => {
    setSubmitting(true);
    try {
      await deleteRole(id);
      removeRole(id);
      toast.success('Rol eliminado exitosamente');
      broadcastInvalidation('config-roles');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al eliminar el rol: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // USERS CRUD
  // ═══════════════════════════════════════════════════════════════

  const loadUsers = useCallback(async (p = usersPage, q = usersSearch, filter = usersStatusFilter) => {
    setLoadingUsers(true);
    try {
      const params: { page: number; limit: number; search: string; active?: boolean } = {
        page: p,
        limit: LIMIT,
        search: q,
      };
      if (filter === 'active') params.active = true;
      else if (filter === 'inactive') params.active = false;

      const res = await getUsers(params);
      setUsers(res.items, res.total);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error al cargar usuarios:', msg);
      toast.error('Error al cargar los usuarios.');
    } finally {
      setLoadingUsers(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers(usersPage, debouncedUsersSearch, usersStatusFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, usersPage, debouncedUsersSearch, usersStatusFilter]);

  // ── Cross-tab sync ──
  useCrossTabSync('config-roles', () => {
    if (activeTab === 'roles') loadRoles(rolesPage, debouncedRolesSearch);
  });
  useCrossTabSync('config-users', () => {
    if (activeTab === 'users') loadUsers(usersPage, debouncedUsersSearch, usersStatusFilter);
  });

  const handleUserCreate = async (data: CreateUserDto) => {
    setSubmitting(true);
    try {
      await createUser(data);
      toast.success(`Usuario "${data.fullName}" creado exitosamente`);
      await loadUsers(usersPage, debouncedUsersSearch, usersStatusFilter);
      broadcastInvalidation('config-users');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al crear el usuario: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserUpdate = async (id: number, data: UpdateUserDto) => {
    setSubmitting(true);
    try {
      const updated = await updateUser(id, data);
      patchUser(id, updated);
      toast.success('Usuario actualizado exitosamente');
      broadcastInvalidation('config-users');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al actualizar el usuario: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserDelete = async (id: number) => {
    setSubmitting(true);
    try {
      await deleteUser(id);
      removeUser(id);
      toast.success('Usuario eliminado exitosamente');
      broadcastInvalidation('config-users');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al eliminar el usuario: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserRoleChange = async (userId: number, roleId: number) => {
    setSubmitting(true);
    try {
      await changeUserRole(userId, { roleId });
      toast.success('Rol del usuario actualizado exitosamente');
      await loadUsers(usersPage, debouncedUsersSearch, usersStatusFilter);
      broadcastInvalidation('config-users');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al cambiar el rol: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // COMPANY SETTINGS
  // ═══════════════════════════════════════════════════════════════

  const { settings: companySettings, updateSettings: applyCompanySettings } = useCompany();

  const handleCompanySettingsSave = async (data: UpdateCompanySettingsDto) => {
    setSubmitting(true);
    try {
      const updated = await updateCompanySettings(data);
      applyCompanySettings(updated);
      toast.success('Configuración de empresa actualizada exitosamente');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error al guardar configuración: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: 'users', label: 'Usuarios', icon: Users },
    { key: 'roles', label: 'Roles', icon: Shield },
    { key: 'company', label: 'Empresa', icon: Building2 },
  ];

  return (
    <PermissionGuard moduleCode="CONFIG">
    <main className="px-6 py-8 md:px-8 md:py-10">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <div className="mx-auto max-w-[1240px] space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Configuración</h1>
            <p className="mt-1 text-sm text-gray-500">Gestión de usuarios, roles y permisos del sistema</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="inline-flex w-full max-w-xl flex-wrap items-center gap-2 rounded-2xl border border-gray-200/80 bg-white/80 p-2 shadow-sm">
          <nav className="flex w-full flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                    : 'text-gray-500 hover:bg-gray-100/70 hover:text-gray-800'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          loadingUsers ? (
            <ConfigTableSkeleton rows={LIMIT} columns={6} />
          ) : (
            <UsersTable
              users={users}
              onUserCreate={handleUserCreate}
              onUserUpdate={handleUserUpdate}
              onUserDelete={handleUserDelete}
              onUserRoleChange={handleUserRoleChange}
              externalSearch={usersSearch}
              onSearchChange={(v) => { setUsersSearch(v); }}
              externalPage={usersPage}
              onPageChange={(p) => setUsersPage(p)}
              externalStatusFilter={usersStatusFilter}
              onStatusFilterChange={(f) => { setUsersStatusFilter(f); }}
              totalItems={usersTotal}
              itemsPerPage={LIMIT}
              submitting={submitting}
            />
          )
        )}

        {activeTab === 'roles' && (
          loadingRoles ? (
            <ConfigTableSkeleton rows={LIMIT} columns={6} />
          ) : (
            <RolesTable
              roles={roles}
              onRoleCreate={handleRoleCreate}
              onRoleUpdate={handleRoleUpdate}
              onRoleDelete={handleRoleDelete}
              externalSearch={rolesSearch}
              onSearchChange={(v) => { setRolesSearch(v); }}
              externalPage={rolesPage}
              onPageChange={(p) => setRolesPage(p)}
              totalItems={rolesTotal}
              itemsPerPage={LIMIT}
              submitting={submitting}
            />
          )
        )}

        {activeTab === 'company' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="xl:col-span-3">
              <div className="sticky top-24 rounded-2xl border border-gray-200/80 bg-white/80 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Distribucion</p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-gray-900">Ajustes de Empresa</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Personaliza identidad visual y nombre comercial del CRM. Los cambios impactan sidebar, badges y botones.
                </p>
              </div>
            </div>

            <div className="xl:col-span-9 xl:justify-self-center">
              <CompanySettingsForm
                settings={companySettings}
                onSave={handleCompanySettingsSave}
                submitting={submitting}
              />
            </div>
          </div>
        )}
      </div>
    </main>
    </PermissionGuard>
  );
}