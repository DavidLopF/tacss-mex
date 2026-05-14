import { get, post, put, getPaginated } from '../http-client';
import {
  CreateOrderDto,
  Order,
  OrderStatus,
  ChangeOrderStatusDto,
  OrderProductItem,
  OrderProductFiltersDto,
  OrderProductsPaginatedResponse,
  GetOrdersFiltersDto,
} from './orders.types';

/**
 * Obtiene pedidos agrupados por estado.
 * Pasa los filtros como query params — si el backend los soporta filtra
 * server-side; si los ignora, retorna todos y el cliente pagina/filtra.
 *
 * GET /api/orders?page=1&limit=25&search=...&statusCode=COTIZADO
 */
export async function getOrders(filters: GetOrdersFiltersDto = {}): Promise<OrderStatus[]> {
  return get<OrderStatus[]>('/api/orders', {
    ...(filters.page      !== undefined && { page: filters.page }),
    ...(filters.limit     !== undefined && { limit: filters.limit }),
    ...(filters.search                  && { search: filters.search }),
    ...(filters.statusCode              && { statusCode: filters.statusCode }),
  });
}

/**
 * Obtiene productos disponibles para crear pedidos (paginado y con búsqueda)
 * GET /api/inventory?page=1&limit=10&search=...&stockStatus=in-stock
 *
 * Retorna items de variantes con precio, stock y almacenes.
 */
export async function getOrderProducts(
  filters: OrderProductFiltersDto = {}
): Promise<OrderProductsPaginatedResponse> {
  try {
    const response = await getPaginated<OrderProductItem[]>('/api/inventory', {
      page: filters.page ?? 1,
      limit: filters.limit ?? 10,
      search: filters.search,
      stockStatus: filters.stockStatus,
    });

    return {
      items: response.data,
      total: response.pagination.total,
      page: response.pagination.page,
      limit: response.pagination.limit,
      totalPages: response.pagination.totalPages ?? Math.ceil(response.pagination.total / (response.pagination.limit || 10)),
      hasNextPage: response.pagination.hasNextPage ?? false,
      hasPrevPage: response.pagination.hasPrevPage ?? false,
    };
  } catch (err) {
    console.error('Error al obtener productos para pedidos:', err);
    throw err;
  }
}

/**
 * Crea un nuevo pedido
 */
export async function createOrder(dto: CreateOrderDto): Promise<Order> {
  return post<Order>('/api/orders', dto);
}

/**
 * Actualiza un pedido existente (cliente, ítems, moneda)
 * PUT /api/orders/:orderId
 */
export async function updateOrder(orderId: number, dto: CreateOrderDto): Promise<Order> {
  return put<Order>(`/api/orders/${orderId}`, dto);
}

/**
 * Cambia el estado de un pedido
 * PUT /api/orders/change-status/:orderId
 */
export async function changeOrderStatus(
  orderId: number,
  dto: ChangeOrderStatusDto
): Promise<null> {
  return put<null>(`/api/orders/change-status/${orderId}`, dto);
}
