import { create } from 'zustand';
import type { Role, UserDetail } from '@/src/services/users';

// ══════════════════════════════════════════════════════════════════════
// ── Config Store (Zustand) ────────────────────────────────────────────
// Estado global del módulo de configuración: roles y usuarios.
// ══════════════════════════════════════════════════════════════════════

interface ConfigState {
  // ── Active tab ──
  activeTab: 'users' | 'roles' | 'company';
  setActiveTab: (tab: 'users' | 'roles' | 'company') => void;

  // ── Roles ──
  roles: Role[];
  rolesTotal: number;
  rolesPage: number;
  rolesSearch: string;
  loadingRoles: boolean;

  setRoles: (items: Role[], total?: number) => void;
  setLoadingRoles: (v: boolean) => void;
  setRolesPage: (p: number) => void;
  setRolesSearch: (s: string) => void;
  upsertRole: (r: Role) => void;
  patchRole: (id: number, patch: Partial<Role>) => void;
  removeRole: (id: number) => void;

  // ── Users ──
  users: UserDetail[];
  usersTotal: number;
  usersPage: number;
  usersSearch: string;
  usersStatusFilter: 'all' | 'active' | 'inactive';
  loadingUsers: boolean;

  setUsers: (items: UserDetail[], total?: number) => void;
  setLoadingUsers: (v: boolean) => void;
  setUsersPage: (p: number) => void;
  setUsersSearch: (s: string) => void;
  setUsersStatusFilter: (f: 'all' | 'active' | 'inactive') => void;
  upsertUser: (u: UserDetail) => void;
  patchUser: (id: number, patch: Partial<UserDetail>) => void;
  removeUser: (id: number) => void;

  // ── Shared ──
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  // ── Active tab ──
  activeTab: 'users',
  setActiveTab: (activeTab) => set({ activeTab }),

  // ── Roles ──
  roles: [],
  rolesTotal: 0,
  rolesPage: 1,
  rolesSearch: '',
  loadingRoles: false,

  setRoles: (roles, total) =>
    set((s) => ({ roles, rolesTotal: total ?? s.rolesTotal })),
  setLoadingRoles: (loadingRoles) => set({ loadingRoles }),
  setRolesPage: (rolesPage) => set({ rolesPage }),
  setRolesSearch: (rolesSearch) => set({ rolesSearch, rolesPage: 1 }),

  upsertRole: (role) =>
    set((s) => {
      const idx = s.roles.findIndex((r) => r.id === role.id);
      if (idx === -1) return { roles: [role, ...s.roles], rolesTotal: s.rolesTotal + 1 };
      const copy = [...s.roles];
      copy[idx] = { ...copy[idx], ...role };
      return { roles: copy };
    }),

  patchRole: (id, patch) =>
    set((s) => ({
      roles: s.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),

  removeRole: (id) =>
    set((s) => ({
      roles: s.roles.filter((r) => r.id !== id),
      rolesTotal: Math.max(0, s.rolesTotal - 1),
    })),

  // ── Users ──
  users: [],
  usersTotal: 0,
  usersPage: 1,
  usersSearch: '',
  usersStatusFilter: 'all',
  loadingUsers: false,

  setUsers: (users, total) =>
    set((s) => ({ users, usersTotal: total ?? s.usersTotal })),
  setLoadingUsers: (loadingUsers) => set({ loadingUsers }),
  setUsersPage: (usersPage) => set({ usersPage }),
  setUsersSearch: (usersSearch) => set({ usersSearch, usersPage: 1 }),
  setUsersStatusFilter: (usersStatusFilter) => set({ usersStatusFilter, usersPage: 1 }),

  upsertUser: (user) =>
    set((s) => {
      const idx = s.users.findIndex((u) => u.id === user.id);
      if (idx === -1) return { users: [user, ...s.users], usersTotal: s.usersTotal + 1 };
      const copy = [...s.users];
      copy[idx] = { ...copy[idx], ...user };
      return { users: copy };
    }),

  patchUser: (id, patch) =>
    set((s) => ({
      users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    })),

  removeUser: (id) =>
    set((s) => ({
      users: s.users.filter((u) => u.id !== id),
      usersTotal: Math.max(0, s.usersTotal - 1),
    })),

  // ── Shared ──
  submitting: false,
  setSubmitting: (submitting) => set({ submitting }),
}));
