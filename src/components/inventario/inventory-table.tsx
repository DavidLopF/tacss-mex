'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Search, Plus, Edit, Eye, Trash2, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Button, Badge } from '@/src/components/ui';
import { ProductDetailModal } from './product-detail-modal';
import { CreateProductModal } from './create-product-modal';
import { DeleteConfirmModal } from './delete-confirm-modal';
import { Producto } from '@/src/types';
import { formatCurrency } from '@/src/lib/utils';
import { getProductById } from '@/src/services/products';
import type { ApiProductDetail } from '@/src/services/products';

interface InventoryTableProps {
  productos: Producto[];
  onProductUpdate?: (producto: Producto) => void;
  onProductCreate?: (producto: Omit<Producto, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onProductDelete?: (productoId: string) => void;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
  // optional controlled props for server-driven mode
  externalSearch?: string;
  onSearchChange?: (value: string) => void;
  externalPage?: number;
  onPageChange?: (page: number) => void;
  externalItemsPerPage?: number;
  onItemsPerPageChange?: (limit: number) => void;
  totalItems?: number;
  // Permission flags
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function InventoryTable({ 
  productos, 
  onProductUpdate,
  onProductCreate,
  onProductDelete,
  onError,
  onSuccess,
  externalSearch,
  onSearchChange,
  externalPage,
  onPageChange,
  externalItemsPerPage,
  onItemsPerPageChange,
  totalItems,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: InventoryTableProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [internalPage, setInternalPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [selectedProductRaw, setSelectedProductRaw] = useState<ApiProductDetail | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const itemsPerPage = 10;

  const isControlledSearch = typeof externalSearch === 'string' && typeof onSearchChange === 'function';
  const searchTerm = isControlledSearch ? externalSearch! : internalSearch;

  const isControlledPage = typeof externalPage === 'number' && typeof onPageChange === 'function';
  const currentPage = isControlledPage ? externalPage! : internalPage;

  const effectiveItemsPerPage = externalItemsPerPage ?? itemsPerPage;

  const categories = ['Todas', ...Array.from(new Set(productos.map(p => p.categoria)))];

  const filteredProducts = productos.filter(producto => {
    const matchesSearch = !searchTerm || producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         producto.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '' || selectedCategory === 'Todas' || producto.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil((externalItemsPerPage ? (totalItems ?? filteredProducts.length) : filteredProducts.length) / effectiveItemsPerPage);
  
  // Si estamos en modo server-driven (externalItemsPerPage definido), no hacemos slice local
  // porque el backend ya nos mandó solo los items de la página actual
  const currentProducts = externalItemsPerPage 
    ? filteredProducts 
    : filteredProducts.slice((currentPage - 1) * effectiveItemsPerPage, currentPage * effectiveItemsPerPage);

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { variant: 'danger' as const, label: 'Agotado' };
    if (stock <= 10) return { variant: 'warning' as const, label: 'Stock Bajo' };
    return { variant: 'success' as const, label: 'En Stock' };
  };

  const handleViewProduct = async (producto: Producto) => {
    setLoadingDetail(true);
    try {
      // Cargar el detalle completo desde el backend
      const { producto: detalle, raw } = await getProductById(producto.id);
      setSelectedProduct(detalle);
      setSelectedProductRaw(raw);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error('Error cargando detalle del producto:', error);
      // Fallback: usar el producto de la lista si falla
      setSelectedProduct(producto);
      setSelectedProductRaw(null);
      setIsDetailModalOpen(true);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleEditProduct = async (producto: Producto) => {
    setLoadingDetail(true);
    try {
      // Cargar el detalle completo desde el backend para editar
      const { producto: detalle, raw } = await getProductById(producto.id);
      setSelectedProduct(detalle);
      setSelectedProductRaw(raw);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error('Error cargando detalle del producto:', error);
      // Fallback: usar el producto de la lista si falla
      setSelectedProduct(producto);
      setSelectedProductRaw(null);
      setIsDetailModalOpen(true);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleProductUpdate = (updatedProduct: Producto) => {
    if (onProductUpdate) {
      onProductUpdate(updatedProduct);
    }
    setIsDetailModalOpen(false);
    setSelectedProduct(null);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedProduct(null);
  };

  const handleCreateProduct = (newProduct: Omit<Producto, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (onProductCreate) {
      onProductCreate(newProduct);
    }
    setIsCreateModalOpen(false);
  };

  const handleDeleteClick = (producto: Producto) => {
    setProductToDelete(producto);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (productToDelete && onProductDelete) {
      onProductDelete(productToDelete.id);
    }
    setIsDeleteModalOpen(false);
    setProductToDelete(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setProductToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos por nombre o SKU..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => {
                if (isControlledSearch && onSearchChange) {
                  onSearchChange(e.target.value);
                } else {
                  setInternalSearch(e.target.value);
                }
              }}
            />
          </div>
          
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {categories.slice(0, 6).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category === 'Todas' ? '' : category)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  (selectedCategory === '' && category === 'Todas') || selectedCategory === category
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {canCreate && (
        <Button className="flex items-center gap-2" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </Button>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Producto
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  SKU
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Categoría
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Stock
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Precio
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Estado
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentProducts.map((producto) => {
                const stockStatus = getStockStatus(producto.stockTotal);
                
                return (
                  <tr key={producto.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {producto.imageUrl ? (
                            <Image
                              src={producto.imageUrl}
                              alt={producto.nombre}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                              <Package className="w-5 h-5 text-blue-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{producto.nombre}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{producto.descripcion}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 font-mono">{producto.sku}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{producto.categoria}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {producto.stockTotal}
                        </span>
                        <Badge variant={stockStatus.variant} className="text-xs">
                          {stockStatus.label}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(producto.precio)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={producto.activo ? 'success' : 'default'}>
                        {producto.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewProduct(producto)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Ver detalle"
                          disabled={loadingDetail}
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        {canEdit && (
                        <button
                          onClick={() => handleEditProduct(producto)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Editar producto"
                          disabled={loadingDetail}
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        )}
                        {canDelete && (
                        <button
                          onClick={() => handleDeleteClick(producto)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Mostrando {((currentPage - 1) * effectiveItemsPerPage) + 1} a{' '}
            {Math.min(currentPage * effectiveItemsPerPage, totalItems ?? filteredProducts.length)} de{' '}
            {totalItems ?? filteredProducts.length} productos
          </p>
          <div className="flex items-center gap-2">
            {/* Items per page */}
            <select
              className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={effectiveItemsPerPage}
              onChange={(e) => {
                const newLimit = Number(e.target.value);
                if (onItemsPerPageChange) {
                  onItemsPerPageChange(newLimit);
                }
              }}
            >
              {[5, 10, 20, 50].map((v) => (
                <option key={v} value={v}>{v} / pág</option>
              ))}
            </select>

            <button
              onClick={() => {
                const next = Math.max(currentPage - 1, 1);
                if (isControlledPage && onPageChange) onPageChange(next);
                else setInternalPage(next);
              }}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
              
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => {
                    if (isControlledPage && onPageChange) onPageChange(pageNum);
                    else setInternalPage(pageNum);
                  }}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => {
                const next = Math.min(currentPage + 1, totalPages);
                if (isControlledPage && onPageChange) onPageChange(next);
                else setInternalPage(next);
              }}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      <ProductDetailModal
        producto={selectedProduct}
        rawDetail={selectedProductRaw}
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
        onEdit={handleProductUpdate}
        onError={onError}
        onSuccess={onSuccess}
      />

      <CreateProductModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateProduct}
        onError={onError}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        producto={productToDelete}
      />
    </div>
  );
}