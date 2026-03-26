import { get, post, put, getPaginated } from '../http-client';
import { 
  CreateOrderDto, 
  Order, 
  OrderStatus, 
  ChangeOrderStatusDto, 
  OrderProductItem, 
  OrderProductFiltersDto, 
  OrderProductsPaginatedResponse 
} from './orders.types';

/**
 * Obtiene todos los pedidos agrupados por estado
 * El backend responde con { success: true, data: OrderStatus[] }
 * El http-client automáticamente extrae y devuelve solo el .data
 */
export async function getOrders(): Promise<OrderStatus[]> {
  return get<OrderStatus[]>('/api/orders');
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
 * Cambia el estado de un pedido
 * PUT /api/orders/change-status/:orderId
 */
export async function changeOrderStatus(
  orderId: number,
  dto: ChangeOrderStatusDto
): Promise<null> {
  return put<null>(`/api/orders/change-status/${orderId}`, dto);
}
