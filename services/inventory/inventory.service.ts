import { get } from '@/services/http-client';
import { InventoryItem, InventoryFiltersDto } from './inventory.types';

const BASE_PATH = '/api/inventory';

/**
 * Obtener inventario disponible
 * GET /api/inventory
 * 
 * Retorna la lista de items de inventario con su disponibilidad
 * por producto, variante y almacén.
 */
export async function getInventory(filters: InventoryFiltersDto = {}): Promise<InventoryItem[]> {
  try {
    const response = await get<InventoryItem[]>(BASE_PATH, {
      productId: filters.productId,
      warehouseId: filters.warehouseId,
      sku: filters.sku,
      variantId: filters.variantId,
      status: filters.status,
    });
    return response;
  } catch (err) {
    console.error('Error al obtener inventario:', err);
    throw err;
  }
}
