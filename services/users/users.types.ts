// ── Permiso individual (frontend) ─────────────────────────────────
export interface Permission {
  id: string;
  label: string;
  description?: string;
  module: string;
}

// ── Permiso de rol (tal como devuelve GET /api/roles/:id/permissions) ──
export interface RolePermission {
  moduleId: number;
  moduleCode: string;   // ej: "DASHBOARD", "PEDIDOS", "INVENTARIO"
  moduleName: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

// ── Rol ────────────────────────────────────────────────────────────
export interface Role {
  id: number;
  code?: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  usersCount?: number;
  permissions?: string[];
}

// ── Relación usuario-rol (tal como viene del backend) ──────────────
export interface UserRoleRelation {
  userId: number;
  roleId: number;
  createdAt: string;
  role: Role;
}

// ── Usuario completo ───────────────────────────────────────────────
export interface UserDetail {
  id: number;
  /** El backend devuelve fullName (no name) */
  fullName: string;
  email: string;
  isActive: boolean;
  /** Array de relaciones usuario-rol tal como viene del backend */
  roles?: UserRoleRelation[];
  /** Campo normalizado: primer rol del array (calculado por el mapper) */
  role?: Role;
  createdAt: string;
  updatedAt?: string;
}

// ── Filtros para GET /api/users (paginado) ─────────────────────────
export interface UserFiltersDto {
  page?: number;
  limit?: number;
  search?: string;
  roleId?: number;
  active?: boolean;
}

// ── Respuesta paginada de usuarios ─────────────────────────────────
export interface PaginatedUsersDto {
  items: UserDetail[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── DTO para crear un usuario ──────────────────────────────────────
export interface CreateUserDto {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  roleId: number;
}

// ── DTO para actualizar un usuario ─────────────────────────────────
export interface UpdateUserDto {
  fullName?: string;
  email?: string;
}

// ── DTO para cambiar el rol de un usuario ──────────────────────────
export interface ChangeUserRoleDto {
  roleId: number;
}

// ── DTO para cambiar la contraseña de un usuario ───────────────────
export interface ChangePasswordDto {
  password: string;
}

// ── Filtros para GET /api/roles ────────────────────────────────────
export interface RoleFiltersDto {
  page?: number;
  limit?: number;
  search?: string;
}

// ── Respuesta paginada de roles ────────────────────────────────────
export interface PaginatedRolesDto {
  items: Role[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── DTO para crear un rol ──────────────────────────────────────────
export interface CreateRoleDto {
  name: string;
  description?: string;
  code?: string;
}

// ── DTO para actualizar un rol ─────────────────────────────────────
export interface UpdateRoleDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// ── DTO para actualizar permisos de un rol ─────────────────────────
// Body: { permissions: [{ moduleId, canView, canCreate, canEdit, canDelete }] }
export interface RolePermissionUpdateItem {
  moduleId: number;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface UpdateRolePermissionsDto {
  permissions: RolePermissionUpdateItem[];
}
