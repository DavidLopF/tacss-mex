import { get, post, put, del, getPaginated } from '@/services/http-client';
import {
  Role,
  RolePermission,
  UpdateRolePermissionsDto,
  UserDetail,
  UserFiltersDto,
  PaginatedUsersDto,
  CreateUserDto,
  UpdateUserDto,
  ChangeUserRoleDto,
  ChangePasswordDto,
  RoleFiltersDto,
  PaginatedRolesDto,
  CreateRoleDto,
  UpdateRoleDto,
} from './users.types';

/**
 * Normaliza un UserDetail del backend:
 * convierte roles[0].role → role para que todos los componentes
 * puedan usar user.role directamente.
 */
function normalizeUser(user: UserDetail): UserDetail {
  if (!user.role && user.roles && user.roles.length > 0) {
    return { ...user, role: user.roles[0].role };
  }
  return user;
}

// ═══════════════════════════════════════════════════════════════════
// ROLES
// ═══════════════════════════════════════════════════════════════════

const ROLES_PATH = '/api/roles';

/**
 * Obtener lista paginada de roles
 * GET /api/roles
 */
export async function getRoles(filters: RoleFiltersDto = {}): Promise<PaginatedRolesDto> {
  try {
    const params: Record<string, unknown> = {};

    if (filters.page !== undefined) params.page = filters.page;
    if (filters.limit !== undefined) params.limit = filters.limit;
    if (filters.search !== undefined && filters.search !== '') params.search = filters.search;

    const response = await getPaginated<Role[]>(`${ROLES_PATH}/all`, params);

    return {
      items: response.data,
      total: response.pagination.total,
      page: response.pagination.page,
      limit: response.pagination.limit,
      totalPages: response.pagination.totalPages ?? Math.ceil(response.pagination.total / (response.pagination.limit || 10)),
    };
  } catch (err) {
    console.error('Error al obtener roles:', err);
    throw err;
  }
}
/**
 * Obtener todos los roles (para selects)
 * GET /api/roles?page=1&limit=100
 */
export async function getAllRoles(): Promise<Role[]> {
  try {
    const response = await getPaginated<Role[]>(ROLES_PATH, { page: 1, limit: 100 });
    return response.data;
  } catch (err) {
    console.error('Error al obtener roles:', err);
    throw err;
  }
}

/**
 * Obtener permisos de un rol
 * GET /api/roles/:roleId/permissions
 */
export async function getRolePermissions(roleId: number | string): Promise<RolePermission[]> {
  try {
    return await get<RolePermission[]>(`${ROLES_PATH}/${roleId}/permissions`);
  } catch (err) {
    console.error('Error al obtener permisos del rol:', err);
    throw err;
  }
}

/**
 * Actualizar permisos de un rol
 * PUT /api/roles/:roleId/permissions
 * Body: { permissions: [{ moduleId, canView, canCreate, canEdit, canDelete }] }
 */
export async function updateRolePermissions(
  roleId: number | string,
  data: UpdateRolePermissionsDto,
): Promise<RolePermission[]> {
  try {
    return await put<RolePermission[]>(`${ROLES_PATH}/${roleId}/permissions`, data);
  } catch (err) {
    console.error('Error al actualizar permisos del rol:', err);
    throw err;
  }
}


/**
 * Obtener un rol por ID
 * GET /api/roles/:id
 */
export async function getRoleById(id: number | string): Promise<Role> {
  try {
    return await get<Role>(`${ROLES_PATH}/${id}`);
  } catch (err) {
    console.error('Error al obtener rol:', err);
    throw err;
  }
}

/**
 * Crear un nuevo rol
 * POST /api/roles
 */
export async function createRole(data: CreateRoleDto): Promise<Role> {
  try {
    return await post<Role>(ROLES_PATH, data);
  } catch (err) {
    console.error('Error al crear rol:', err);
    throw err;
  }
}

/**
 * Actualizar un rol
 * PUT /api/roles/:id
 */
export async function updateRole(id: number | string, data: UpdateRoleDto): Promise<Role> {
  try {
    return await put<Role>(`${ROLES_PATH}/${id}`, data);
  } catch (err) {
    console.error('Error al actualizar rol:', err);
    throw err;
  }
}

/**
 * Eliminar un rol
 * DELETE /api/roles/:id
 */
export async function deleteRole(id: number | string): Promise<void> {
  try {
    await del<void>(`${ROLES_PATH}/${id}`);
  } catch (err) {
    console.error('Error al eliminar rol:', err);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════
// USUARIOS
// ═══════════════════════════════════════════════════════════════════

const USERS_PATH = '/api/users';

/**
 * Obtener lista paginada de usuarios
 * GET /api/users?page=1&limit=10&search=...&roleId=1&active=true
 */
export async function getUsers(filters: UserFiltersDto = {}): Promise<PaginatedUsersDto> {
  try {
    const params: Record<string, unknown> = {};

    if (filters.page !== undefined) params.page = filters.page;
    if (filters.limit !== undefined) params.limit = filters.limit;
    if (filters.search && filters.search.trim()) params.search = filters.search.trim();
    if (filters.roleId !== undefined) params.roleId = filters.roleId;
    if (filters.active !== undefined) params.active = filters.active;

    const response = await getPaginated<UserDetail[]>(USERS_PATH, params);

    return {
      items: response.data.map(normalizeUser),
      total: response.pagination.total,
      page: response.pagination.page,
      limit: response.pagination.limit,
      totalPages: response.pagination.totalPages ?? Math.ceil(response.pagination.total / (response.pagination.limit || 10)),
    };
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    throw err;
  }
}

/**
 * Obtener un usuario por ID
 * GET /api/users/:id
 */
export async function getUserById(id: number | string): Promise<UserDetail> {
  try {
    const user = await get<UserDetail>(`${USERS_PATH}/${id}`);
    return normalizeUser(user);
  } catch (err) {
    console.error('Error al obtener usuario:', err);
    throw err;
  }
}

/**
 * Crear un nuevo usuario
 * POST /api/users
 */
export async function createUser(data: CreateUserDto): Promise<UserDetail> {
  try {
    return await post<UserDetail>(USERS_PATH, data);
  } catch (err) {
    console.error('Error al crear usuario:', err);
    throw err;
  }
}

/**
 * Actualizar un usuario
 * PUT /api/users/:id
 */
export async function updateUser(id: number | string, data: UpdateUserDto): Promise<UserDetail> {
  try {
    const updated = await put<UserDetail>(`${USERS_PATH}/${id}`, data);
    return normalizeUser(updated);
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    throw err;
  }
}

/**
 * Cambiar el rol de un usuario
 * PUT /api/users/:id/role
 */
export async function changeUserRole(id: number | string, data: ChangeUserRoleDto): Promise<UserDetail> {
  try {
    const user = await put<UserDetail>(`${USERS_PATH}/${id}/role`, data);
    return normalizeUser(user);
  } catch (err) {
    console.error('Error al cambiar rol del usuario:', err);
    throw err;
  }
}

/**
 * Cambiar la contraseña de un usuario
 * PUT /api/users/:id/password
 */
export async function changeUserPassword(id: number | string, data: ChangePasswordDto): Promise<void> {
  try {
    await put<void>(`${USERS_PATH}/${id}/password`, data);
  } catch (err) {
    console.error('Error al cambiar contraseña:', err);
    throw err;
  }
}

/**
 * Eliminar un usuario
 * DELETE /api/users/:id
 */
export async function deleteUser(id: number | string): Promise<void> {
  try {
    await del<void>(`${USERS_PATH}/${id}`);
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    throw err;
  }
}
