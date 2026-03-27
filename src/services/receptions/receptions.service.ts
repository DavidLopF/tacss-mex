import { get, post } from '@/services/http-client';
import type {
  PartialReceipt,
  ReceptionProgress,
  CreateReceptionDto,
  CreateReceptionResponse,
  WarehouseListItem,
} from './receptions.types';

const RECEPTIONS_PATH = '/api/receptions';
const WAREHOUSES_PATH = '/api/warehouses';

// ══════════════════════════════════════════════════════════════════════
// ── RECEPCIONES ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

/**
 * Crear una recepción parcial para una orden de compra
 * POST /api/receptions/:poId
 */
export async function createReception(
  poId: number | string,
  data: CreateReceptionDto,
): Promise<CreateReceptionResponse> {
  try {
    const response = await post<CreateReceptionResponse>(`${RECEPTIONS_PATH}/${poId}`, data);
    return response;
  } catch (err) {
    console.error('Error al crear recepción:', err);
    throw err;
  }
}

/**
 * Obtener todas las recepciones de una orden de compra
 * GET /api/receptions/:poId
 */
export async function getReceptions(poId: number | string): Promise<PartialReceipt[]> {
  try {
    const response = await get<PartialReceipt[]>(`${RECEPTIONS_PATH}/${poId}`);
    return Array.isArray(response) ? response : [];
  } catch (err) {
    console.error('Error al obtener recepciones:', err);
    throw err;
  }
}

/**
 * Obtener progreso de recepción de una orden de compra
 * GET /api/receptions/:poId/progress
 */
export async function getReceptionProgress(poId: number | string): Promise<ReceptionProgress> {
  try {
    const response = await get<ReceptionProgress>(`${RECEPTIONS_PATH}/${poId}/progress`);
    return response;
  } catch (err) {
    console.error('Error al obtener progreso de recepción:', err);
    throw err;
  }
}

/**
 * Obtener detalle de una recepción específica
 * GET /api/receptions/detail/:receptionId
 */
export async function getReceptionDetail(receptionId: number | string): Promise<PartialReceipt> {
  try {
    const response = await get<PartialReceipt>(`${RECEPTIONS_PATH}/detail/${receptionId}`);
    return response;
  } catch (err) {
    console.error('Error al obtener detalle de recepción:', err);
    throw err;
  }
}

// ══════════════════════════════════════════════════════════════════════
// ── WAREHOUSES (para select en recepción) ────────────────────────────
// ══════════════════════════════════════════════════════════════════════

/**
 * Obtener lista de almacenes
 * GET /api/warehouses
 */
export async function getWarehouses(): Promise<WarehouseListItem[]> {
  try {
    const response = await get<WarehouseListItem[]>(WAREHOUSES_PATH);
    return Array.isArray(response) ? response : [];
  } catch (err) {
    console.error('Error al obtener almacenes:', err);
    throw err;
  }
}
