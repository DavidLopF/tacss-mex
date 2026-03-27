'use client';

import { useAuth } from '@/lib/auth-context';

/**
 * Mapa de rutas a códigos de módulo del backend.
 * Se usa para resolver qué permiso aplicar según la URL.
 */
const ROUTE_TO_MODULE: Record<string, string> = {
  '/': 'DASHBOARD',
  '/inventario': 'INVENTARIO',
  '/pedidos': 'PEDIDOS',
  '/clientes': 'CLIENTES',
  '/proveedores': 'PROVEEDORES',
  '/facturacion': 'FACTURACION',
  '/configuracion': 'CONFIG',
};

/**
 * Módulos del backend que NO están implementados en esta rama del frontend.
 * Se ocultan en la UI (sidebar, panel de permisos) aunque el backend los devuelva.
 */
export const HIDDEN_MODULES = new Set(['POS', 'PRECIOS', 'REPORTES_POS']);

/**
 * Hook que expone helpers de permisos para un módulo dado.
 *
 * @param moduleCode — Código del módulo (ej: "DASHBOARD", "PEDIDOS", etc.)
 *
 * @example
 * const { canView, canCreate, canEdit, canDelete } = usePermissions('INVENTARIO');
 */
export function usePermissions(moduleCode: string) {
  const { can } = useAuth();

  return {
    canView: can(moduleCode, 'canView'),
    canCreate: can(moduleCode, 'canCreate'),
    canEdit: can(moduleCode, 'canEdit'),
    canDelete: can(moduleCode, 'canDelete'),
  };
}

/**
 * Devuelve el código de módulo correspondiente a una ruta.
 */
export function getModuleForRoute(pathname: string): string | undefined {
  // Coincidencia exacta primero
  if (ROUTE_TO_MODULE[pathname]) return ROUTE_TO_MODULE[pathname];

  // Coincidencia parcial (ej: /inventario/123 → INVENTARIO)
  const base = '/' + pathname.split('/').filter(Boolean)[0];
  return ROUTE_TO_MODULE[base];
}

export { ROUTE_TO_MODULE };
