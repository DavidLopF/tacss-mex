import { get, post, put, del } from '@/services/http-client';
import {
  ProductFiltersDto,
  PaginatedProductsDto,
  ApiProductsResponse,
  ProductStatistics,
  ApiProductDetail,
  CategoryDto,
  CreateProductDto,
  UpdateProductDto,
  UpdateProductResponseDto,
  mapApiProductToProducto,
} from './products.types';
import { Producto } from '@/types';

const BASE_PATH = '/api/products';

/**
 * Obtener lista de productos con paginación y filtros.
 * GET /api/products
 *
 * El backend responde: { success, data: { data: ApiProduct[], pagination } }
 * Aquí mapeamos a PaginatedProductsDto con items: Producto[]
 */
export async function getProducts(filters: ProductFiltersDto = {}): Promise<PaginatedProductsDto> {
  const raw = await get<ApiProductsResponse>(BASE_PATH, {
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    categoryId: filters.categoryId,
    sku: filters.sku,
    isActive: filters.isActive,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    hasStock: filters.hasStock,
  });

  return {
    items: raw.data.map(mapApiProductToProducto),
    total: raw.pagination.total,
    page: raw.pagination.page,
    limit: raw.pagination.limit,
    totalPages: raw.pagination.totalPages,
  };
}

/**
 * Obtener estadísticas globales del inventario.
 * GET /api/products/statistics
 */
export async function getStadistics(): Promise<ProductStatistics> {
  try {
    const raw = await get<ProductStatistics>(`${BASE_PATH}/statistics`);
    return raw;
  } catch (err) {
    console.error('Error al obtener estadísticas de productos:', err);
    throw err;
  }
}

/**
 * Obtener detalle completo de un producto.
 * GET /api/products/:id
 * 
 * Retorna tanto el producto mapeado como los datos raw del API
 * para tener acceso a variantes con almacenes.
 */
export async function getProductById(id: string | number): Promise<{ producto: Producto; raw: ApiProductDetail }> {
  try {
    const raw = await get<ApiProductDetail>(`${BASE_PATH}/${id}`);
    
    // Mapear variantes/variants
    const variaciones = raw.variants.map(v => ({
      id: String(v.id),
      nombre: v.variantName,
      valor: v.sku, // Usamos SKU como valor por ahora
      stock: v.stock,
      precio: undefined, // Las variantes no tienen precio individual en este modelo
    }));

    // Mapear el producto completo
    const producto: Producto = {
      id: String(raw.id),
      nombre: raw.name,
      descripcion: raw.description ?? '',
      sku: raw.sku,
      precio: raw.price,
      costo: raw.cost,
      categoria: raw.category,
      imageUrl: raw.imageUrl,
      variaciones,
      stockTotal: raw.totalStock,
      activo: raw.status === 'Activo',
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };

    return { producto, raw };
  } catch (err) {
    console.error('Error al obtener detalle del producto:', err);
    throw err;
  }
}

/**
 * Obtener lista de categorías de productos.
 * GET /api/products/categories
 * 
 * El backend responde: { success, data: CategoryDto[], count }
 */
export async function getCategories(): Promise<CategoryDto[]> {
  try {
    const response = await get<CategoryDto[]>(`${BASE_PATH}/categories`);
    return response;
  } catch (err) {
    console.error('Error al obtener categorías:', err);
    throw err;
  }
}

/**
 * Crear un nuevo producto.
 * POST /api/products
 * 
 * El backend espera:
 * {
 *   name: string,
 *   sku: string,
 *   categoryId: number,
 *   defaultPrice: number,
 *   cost?: number,
 *   description?: string,
 *   image?: string,
 *   currency?: string,
 *   variants: [{ variantName: string, stock: number, warehouseId?: number }]
 * }
 * 
 * Responde: { success, data: ApiProductDetail }
 */
export async function createProduct(productData: CreateProductDto): Promise<ApiProductDetail> {
  try {
    const response = await post<ApiProductDetail>(BASE_PATH, productData);
    return response;
  } catch (err) {
    console.error('Error al crear producto:', err);
    throw err;
  }
}

/**
 * Importación masiva de productos desde Excel (ya parseado).
 * POST /api/products/bulk-import
 */
export async function bulkImportProducts(rows: {
  name: string;
  sku: string;
  defaultPrice: number;
  categoryName: string;
  description?: string;
  variantName?: string;
  barcode?: string;
  stock?: number;
  currency?: string;
  requiresIva?: boolean;
}[]): Promise<{ created: number; errors: { sku: string; reason: string }[] }> {
  return post<{ created: number; errors: { sku: string; reason: string }[] }>(
    `${BASE_PATH}/bulk-import`,
    { rows },
  );
}

/**
 * Edición masiva de productos por IDs.
 * POST /api/products/bulk-edit
 */
export async function bulkEditProducts(
  ids: number[],
  patch: { categoryId?: number; defaultPrice?: number; isActive?: boolean; requiresIva?: boolean },
): Promise<{ updated: number; errors: { id: number; reason: string }[] }> {
  return post<{ updated: number; errors: { id: number; reason: string }[] }>(
    `${BASE_PATH}/bulk-edit`,
    { ids, patch },
  );
}

/**
 * Ajuste masivo de existencias vía OC (Excel parseado).
 * POST /api/products/bulk-stock-oc
 */
export async function bulkStockFromOC(rows: {
  sku: string;
  qty: number;
  adjustmentType: 'set' | 'increment';
}[]): Promise<{ updated: number; errors: { sku: string; reason: string }[] }> {
  return post<{ updated: number; errors: { sku: string; reason: string }[] }>(
    `${BASE_PATH}/bulk-stock-oc`,
    { rows },
  );
}

/**
 * Actualizar un producto existente.
 * PUT /api/products/:id
 * 
 * El backend espera:
 * {
 *   name?: string,
 *   description?: string,
 *   categoryId?: number,
 *   price?: number,
 *   cost?: number,
 *   currency?: string,
 *   image?: string,
 *   isActive?: boolean,
 *   variants?: [{ 
 *     id?: number,        // Si tiene id, se actualiza. Si no, se crea nueva
 *     variantName: string, 
 *     stock: number,
 *     sku?: string,
 *     warehouseId?: number
 *   }]
 * }
 * 
 * Responde: { success, data: UpdateProductResponseDto }
 */
export async function updateProduct(
  id: string | number, 
  productData: UpdateProductDto
): Promise<UpdateProductResponseDto> {
  try {
    const response = await put<UpdateProductResponseDto>(`${BASE_PATH}/${id}`, productData);
    return response;
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    throw err;
  }
}

