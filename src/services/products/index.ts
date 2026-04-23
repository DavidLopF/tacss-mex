export {
  getProducts, getStadistics, getProductById, getCategories,
  createProduct, updateProduct,
  bulkImportProducts, bulkEditProducts, bulkStockFromOC,
} from './products.service';
export type { 
  ProductFiltersDto, 
  PaginatedProductsDto, 
  ApiProduct, 
  ProductStatistics,
  ApiProductDetail,
  ApiVariant,
  ApiWarehouse,
  ApiProductSupplier,
  ApiProductPurchaseHistory,
  CategoryDto,
  CreateProductDto,
  CreateProductVariantDto,
  UpdateProductDto,
  UpdateProductVariantDto,
  UpdateProductResponseDto,
} from './products.types';
export { mapApiProductToProducto } from './products.types';
