import { get, post, put, del, getPaginated } from '@/services/http-client';
import {
  ClientListItem,
  PriceHistoryItem,
  ClientDetail,
  ClientFiltersDto,
  PaginatedClientsDto,
  CreateClientDto,
  UpdateClientDto,
  ClientStatistics,
} from './clients.types';

const BASE_PATH = '/api/clients';

/**
 * Obtener lista paginada de clientes
 * GET /api/clients?page=1&limit=10&search=...&active=true&inactive=false
 */
export async function getClients(filters: ClientFiltersDto = {}): Promise<PaginatedClientsDto> {
  try {
    // Preparar los parámetros
    const params: Record<string, unknown> = {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
    };

    // Solo agregar active/inactive si no están ambos en true o ambos en false/undefined
    // (el backend espera que si ambos están activos, no se envíe ninguno)
    const hasActive = filters.active === true;
    const hasInactive = filters.inactive === true;
    
    // Solo enviar si hay una diferencia (uno está activo y el otro no)
    if (hasActive && !hasInactive) {
      params.active = true;
      params.inactive = false;
    } else if (!hasActive && hasInactive) {
      params.active = false;
      params.inactive = true;
    }
    // Si ambos están activos o ambos desactivados, no enviamos ningún filtro

    const response = await getPaginated<ClientDetail[]>(BASE_PATH, params);

    return {
      items: response.data,
      total: response.pagination.total,
      page: response.pagination.page,
      limit: response.pagination.limit,
      totalPages: response.pagination.totalPages ?? 0,
    };
  } catch (err) {
    console.error('Error al obtener clientes:', err);
    throw err;
  }
}

/**
 * Obtener lista simple de todos los clientes (para selects/dropdowns)
 * Compatibilidad para componentes que esperan lista completa sin paginación.
 */
export async function getAllClients(): Promise<ClientListItem[]> {
  try {
    const limit = 200;
    let page = 1;
    let totalPages = 1;
    const allClients: ClientListItem[] = [];

    while (page <= totalPages) {
      const response = await getClients({ page, limit });
      allClients.push(
        ...response.items.map((client) => ({
          id: client.id,
          name: client.name,
          priceZoneId: client.priceZoneId,
          priceZone: client.priceZone,
        }))
      );

      totalPages = response.totalPages || 1;
      page += 1;
    }

    return allClients;
  } catch (err) {
    console.error('Error al obtener clientes:', err);
    throw err;
  }
}

/**
 * Obtener un cliente por ID
 * GET /api/clients/:id
 */
export async function getClientById(id: number | string): Promise<ClientDetail> {
  try {
    const response = await get<ClientDetail>(`${BASE_PATH}/${id}`);
    return response;
  } catch (err) {
    console.error('Error al obtener cliente:', err);
    throw err;
  }
}

/**
 * Crear un nuevo cliente
 * POST /api/clients
 */
export async function createClient(data: CreateClientDto): Promise<ClientDetail> {
  try {
    const response = await post<ClientDetail>(BASE_PATH, data);
    return response;
  } catch (err) {
    console.error('Error al crear cliente:', err);
    throw err;
  }
}

/**
 * Actualizar un cliente
 * PUT /api/clients/:id
 */
export async function updateClient(id: number | string, data: UpdateClientDto): Promise<ClientDetail> {
  try {
    const response = await put<ClientDetail>(`${BASE_PATH}/${id}`, data);
    return response;
  } catch (err) {
    console.error('Error al actualizar cliente:', err);
    throw err;
  }
}

/**
 * Eliminar (desactivar) un cliente
 * DELETE /api/clients/:id
 */
export async function deleteClient(id: number | string): Promise<void> {
  try {
    await del<void>(`${BASE_PATH}/${id}`);
  } catch (err) {
    console.error('Error al eliminar cliente:', err);
    throw err;
  }
}

/**
 * Obtener estadísticas de clientes
 * GET /api/clients/statistics
 */
export async function getClientStatistics(): Promise<ClientStatistics> {
  try {
    const response = await get<ClientStatistics>(`${BASE_PATH}/statistics`);
    return response;
  } catch (err) {
    console.error('Error al obtener estadísticas de clientes:', err);
    throw err;
  }
}

/**
 * Obtener historial de precios de un producto para un cliente específico
 * GET /api/clients/:clientId/price-history/:productId
 */
export async function getClientPriceHistory(
  clientId: number | string,
  productId: number | string
): Promise<PriceHistoryItem[]> {
  try {
    const response = await get<PriceHistoryItem[]>(
      `${BASE_PATH}/${clientId}/price-history/${productId}`
    );
    return response;
  } catch (err) {
    console.error('Error al obtener historial de precios:', err);
    throw err;
  }
}
