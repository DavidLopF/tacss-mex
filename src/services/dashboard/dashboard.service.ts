import { get } from '../http-client';
import { DashboardComprasSummary, DashboardSummary } from './dashboard.types';

/**
 * GET /api/dashboard
 * Retorna todos los datos del dashboard en una sola petición.
 */
export async function getDashboard(): Promise<DashboardSummary> {
  return get<DashboardSummary>('/api/dashboard');
}

/**
 * GET /api/dashboard/compras
 * Datos consolidados para la pestaña Compras & Proveedores:
 * estadísticas de proveedores + estadísticas de OC + últimas 5 OC.
 */
export async function getDashboardCompras(): Promise<DashboardComprasSummary> {
  return get<DashboardComprasSummary>('/api/dashboard/compras');
}
