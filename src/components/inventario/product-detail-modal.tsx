'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Edit2, Package, DollarSign, Tag, Calendar, Plus, Minus, User, TrendingUp, Truck, Star, ClipboardList, ArrowUpDown } from 'lucide-react';
import { Modal, Button, Badge, Card, CardContent, Select } from '@/src/components/ui';
import { Producto } from '@/src/types';
import { formatCurrency, formatDateTime } from '@/src/lib/utils';
import { getAllClients, getClientPriceHistory, ClientListItem, PriceHistoryItem } from '@/src/services/clients';
import { updateProduct, UpdateProductDto, getCategories, CategoryDto } from '@/src/services/products';
import type { ApiProductDetail, ApiProductSupplier, ApiProductPurchaseHistory } from '@/src/services/products';

interface ProductDetailModalProps {
  producto: Producto | null;
  rawDetail?: ApiProductDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (producto: Producto) => void;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

export function ProductDetailModal({ 
  producto, 
  rawDetail,
  isOpen, 
  onClose, 
  onEdit,
  onError,
  onSuccess,
}: ProductDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState<Producto | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [clientes, setClientes] = useState<ClientListItem[]>([]);
  const [historialPrecios, setHistorialPrecios] = useState<PriceHistoryItem[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categorias, setCategorias] = useState<CategoryDto[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);

  // Cargar lista de clientes y categorías cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadClientes();
      loadCategorias();
    }
  }, [isOpen]);

  // Cargar historial de precios cuando cambia el cliente seleccionado
  useEffect(() => {
    if (selectedClienteId && producto) {
      // El endpoint recibe variantId, no productId
      const variantId = producto.variaciones[0]?.id;
      if (variantId) {
        loadPriceHistory(selectedClienteId, variantId);
      }
    } else {
      setHistorialPrecios([]);
    }
  }, [selectedClienteId, producto]);

  const loadCategorias = async () => {
    setLoadingCategorias(true);
    try {
      const cats = await getCategories();
      setCategorias(cats);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    } finally {
      setLoadingCategorias(false);
    }
  };

  const loadClientes = async () => {
    setLoadingClientes(true);
    try {
      const data = await getAllClients();
      setClientes(data);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    } finally {
      setLoadingClientes(false);
    }
  };

  const loadPriceHistory = async (clientId: string, productId: string) => {
    setLoadingHistorial(true);
    try {
      const data = await getClientPriceHistory(clientId, productId);
      setHistorialPrecios(data);
    } catch (error) {
      console.error('Error cargando historial de precios:', error);
      setHistorialPrecios([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  if (!producto) return null;

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedProduct(null);
    } else {
      setEditedProduct({ ...producto });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!editedProduct) return;
    
    setSaving(true);
    try {
      // Buscar categoryId a partir del nombre de la categoría
      const categoriaEncontrada = categorias.find(c => c.name === editedProduct.categoria);
      
      // Preparar el DTO para el backend
      const updateDto: UpdateProductDto = {
        name: editedProduct.nombre,
        description: editedProduct.descripcion,
        categoryId: categoriaEncontrada?.id,
        price: editedProduct.precio,
        image: editedProduct.imageUrl,
        isActive: editedProduct.activo,
        variants: editedProduct.variaciones.map(v => ({
          id: isNaN(Number(v.id)) ? undefined : Number(v.id),
          variantName: v.nombre ? `${v.nombre}: ${v.valor}` : v.valor,
          stock: v.stock,
        })),
      };

      // Llamar al backend
      await updateProduct(producto.id, updateDto);
      
      // Actualizar el producto local con los cambios
      if (onEdit) {
        onEdit({
          ...editedProduct,
          updatedAt: new Date(),
        });
      }
      
      // Mostrar éxito
      if (onSuccess) {
        onSuccess(`Producto "${editedProduct.nombre}" actualizado exitosamente`);
      }
      
      setIsEditing(false);
      setEditedProduct(null);
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (onError) {
        onError(`Error al actualizar el producto: ${errorMessage}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleVariationStockChange = (variationId: string, newStock: number) => {
    if (!editedProduct) return;
    
    const updatedVariations = editedProduct.variaciones.map(v =>
      v.id === variationId ? { ...v, stock: Math.max(0, newStock) } : v
    );
    
    const newStockTotal = updatedVariations.reduce((sum, v) => sum + v.stock, 0);
    
    setEditedProduct({
      ...editedProduct,
      variaciones: updatedVariations,
      stockTotal: newStockTotal
    });
  };

  // Filtrar historial de precios - ya viene filtrado del backend por cliente y producto
  const historialFiltrado = historialPrecios.sort(
    (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
  );

  const clienteSeleccionado = clientes.find(c => String(c.id) === selectedClienteId);

  const currentProduct = isEditing && editedProduct ? editedProduct : producto;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Producto' : 'Detalle del Producto'}
      size="2xl"
    >
      <div className="space-y-6">
        {/* Fila superior: Imagen + Información básica */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Imagen del producto */}
          <div className="lg:col-span-1">
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-4">
              {currentProduct.imageUrl ? (
                <Image
                  src={currentProduct.imageUrl}
                  alt={currentProduct.nombre}
                  width={400}
                  height={400}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <Package className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">SKU</span>
                <span className="text-sm font-mono text-gray-900">{currentProduct.sku}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Categoría</span>
                {isEditing ? (
                  <Select
                    value={editedProduct?.categoria || ''}
                    onChange={(e) => setEditedProduct(editedProduct ? { ...editedProduct, categoria: e.target.value } : null)}
                    className="w-32 text-sm"
                    disabled={loadingCategorias}
                  >
                    <option value="">{loadingCategorias ? 'Cargando...' : 'Seleccione'}</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <span className="text-sm text-gray-900">{currentProduct.categoria}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Estado</span>
                <Badge variant={currentProduct.activo ? 'success' : 'default'}>
                  {currentProduct.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Información básica del producto */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProduct?.nombre || ''}
                  onChange={(e) => setEditedProduct(prev => prev ? { ...prev, nombre: e.target.value } : null)}
                  className="text-2xl font-bold text-gray-900 w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <h2 className="text-2xl font-bold text-gray-900">{currentProduct.nombre}</h2>
              )}
              
              {isEditing ? (
                <textarea
                  value={editedProduct?.descripcion || ''}
                  onChange={(e) => setEditedProduct(prev => prev ? { ...prev, descripcion: e.target.value } : null)}
                  rows={3}
                  className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="mt-2 text-gray-600">{currentProduct.descripcion}</p>
              )}
            </div>

            {/* Precios */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Precio de Venta</span>
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedProduct?.precio || 0}
                      onChange={(e) => setEditedProduct(prev => prev ? { ...prev, precio: parseFloat(e.target.value) || 0 } : null)}
                      className="text-2xl font-bold text-green-600 w-full border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(currentProduct.precio)}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Costo Promedio</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {rawDetail?.cost != null
                      ? formatCurrency(rawDetail.cost)
                      : formatCurrency(currentProduct.costo)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Calculado desde órdenes de compra</p>
                </CardContent>
              </Card>
            </div>

            {/* Stock total y fechas */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-gray-700">Stock Total</span>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">
                    {currentProduct.stockTotal} unidades
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>Creado: {formatDateTime(currentProduct.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>Actualizado: {formatDateTime(currentProduct.updatedAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Costos Reales desde Órdenes de Compra */}
        {rawDetail && (rawDetail.lastPurchaseCost !== null || (rawDetail.suppliers && rawDetail.suppliers.length > 0)) && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-600" />
              Costos Reales (Landed Cost)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Costo Promedio</p>
                  <p className="text-lg font-bold text-blue-600">
                    {rawDetail.cost != null ? formatCurrency(rawDetail.cost) : '—'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Última Compra</p>
                  <p className="text-lg font-bold text-gray-900">
                    {rawDetail.lastPurchaseCost != null ? formatCurrency(rawDetail.lastPurchaseCost) : '—'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Costo Más Bajo</p>
                  <p className="text-lg font-bold text-green-600">
                    {rawDetail.lowestPurchaseCost != null ? formatCurrency(rawDetail.lowestPurchaseCost) : '—'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Costo Más Alto</p>
                  <p className="text-lg font-bold text-red-600">
                    {rawDetail.highestPurchaseCost != null ? formatCurrency(rawDetail.highestPurchaseCost) : '—'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Margen */}
            {rawDetail.margin != null && (
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Margen estimado:</span>
                <Badge variant={rawDetail.margin >= 30 ? 'success' : rawDetail.margin >= 15 ? 'warning' : 'danger'}>
                  {rawDetail.margin.toFixed(1)}%
                </Badge>
              </div>
            )}

            {rawDetail.lastPurchaseCost == null && (
              <div className="text-center py-3 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-xs">Sin historial de compras — los costos se calcularán al registrar órdenes de compra</p>
              </div>
            )}
          </div>
        )}

        {/* Proveedores asociados */}
        {rawDetail && rawDetail.suppliers && rawDetail.suppliers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-gray-600" />
              Proveedores ({rawDetail.suppliers.length})
            </h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Proveedor</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">SKU Prov.</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Costo FOB</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Último Landed</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">Lead Time</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">Min. Pedido</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">Pref.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rawDetail.suppliers.map((sup: ApiProductSupplier, idx: number) => (
                    <tr key={`${sup.supplierId}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{sup.supplierName}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono text-xs">{sup.supplierSku || '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {formatCurrency(sup.supplierCost)} {sup.currency && sup.currency !== 'MXN' && (
                          <span className="text-xs text-gray-400 ml-1">{sup.currency}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {sup.lastLandedCost != null ? formatCurrency(sup.lastLandedCost) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">
                        {sup.leadTimeDays != null ? `${sup.leadTimeDays}d` : '—'}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">
                        {sup.minOrderQty != null ? sup.minOrderQty : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {sup.isPreferred && (
                          <Star className="w-4 h-4 text-amber-500 mx-auto fill-amber-500" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Historial de Compras (Purchase Orders) */}
        {rawDetail && rawDetail.purchaseHistory && rawDetail.purchaseHistory.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-600" />
              Historial de Compras ({rawDetail.purchaseHistory.length})
            </h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Fecha</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">OC</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Proveedor</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Qty</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Costo FOB</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Costo Landed</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rawDetail.purchaseHistory.map((ph: ApiProductPurchaseHistory, idx: number) => (
                    <tr key={`${ph.purchaseOrderId}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-600 text-xs">
                        {formatDateTime(new Date(ph.date))}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-blue-600 font-medium">
                        {ph.purchaseOrderCode}
                      </td>
                      <td className="px-3 py-2 text-gray-900">{ph.supplierName}</td>
                      <td className="px-3 py-2 text-right text-gray-900 font-medium">{ph.qty}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {formatCurrency(ph.unitCost)} {ph.currency && ph.currency !== 'MXN' && (
                          <span className="text-xs text-gray-400 ml-1">{ph.currency}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 font-medium">
                        {ph.landedUnitCost != null ? formatCurrency(ph.landedUnitCost) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={
                          ph.status === 'Recibida' || ph.status === 'received' ? 'success' :
                          ph.status === 'Cancelada' || ph.status === 'cancelled' ? 'danger' :
                          'warning'
                        }>
                          {ph.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Fila inferior: Variaciones y Stock | Historial de Precios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna izquierda: Variaciones */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-600" />
              Variaciones y Stock
            </h3>
            <div className="space-y-2">
              {currentProduct.variaciones.map((variacion) => (
                <Card key={variacion.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-gray-900 text-sm">
                          {variacion.nombre}: {variacion.valor}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleVariationStockChange(variacion.id, variacion.stock - 1)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Minus className="w-3 h-3 text-gray-600" />
                            </button>
                            <input
                              type="number"
                              value={variacion.stock}
                              onChange={(e) => handleVariationStockChange(variacion.id, parseInt(e.target.value) || 0)}
                              className="w-14 text-center border border-gray-200 rounded px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              min="0"
                            />
                            <button
                              onClick={() => handleVariationStockChange(variacion.id, variacion.stock + 1)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Plus className="w-3 h-3 text-gray-600" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-gray-900">
                            {variacion.stock} uds
                          </span>
                        )}
                        
                        <Badge 
                          variant={
                            variacion.stock === 0 ? 'danger' : 
                            variacion.stock <= 5 ? 'warning' : 'success'
                          }
                        >
                          {variacion.stock === 0 ? 'Agotado' : 
                           variacion.stock <= 5 ? 'Bajo' : 'Disponible'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Columna derecha: Historial de Precios por Cliente */}
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              Historial de Precios
            </h3>
            
            <div className="mb-3">
              <Select
                value={selectedClienteId}
                onChange={(e) => setSelectedClienteId(e.target.value)}
                disabled={loadingClientes}
              >
                <option value="">-- Seleccione un cliente --</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.name}
                  </option>
                ))}
              </Select>
            </div>

            {loadingHistorial && (
              <div className="text-center text-sm text-gray-500 py-4">
                Cargando historial...
              </div>
            )}

            {selectedClienteId && clienteSeleccionado && !loadingHistorial ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {clienteSeleccionado.name}
                    </p>
                  </div>
                </div>

                {historialFiltrado.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {historialFiltrado.map((item) => (
                      <div key={item.orderId} className="border border-gray-200 rounded-lg p-3 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 mb-0.5">
                              {formatDateTime(new Date(item.orderDate))}
                            </p>
                            <p className="text-xs font-mono text-blue-600 font-medium">
                              {item.orderCode}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {item.orderStatus}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">
                              {formatCurrency(item.unitPrice)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              × {item.quantity} uds
                            </p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">Total</span>
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(item.lineTotal)}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Totales */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-3 sticky bottom-0">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">Total Unidades:</span>
                          <span className="font-bold text-gray-900">
                            {historialFiltrado.reduce((sum, item) => sum + item.quantity, 0)} uds
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-blue-200">
                          <span className="font-semibold text-gray-800">Total Vendido:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {formatCurrency(
                              historialFiltrado.reduce((sum, item) => sum + item.lineTotal, 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Sin historial para este cliente</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Seleccione un cliente para ver el historial</p>
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          {isEditing ? (
            <>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              <Button variant="outline" onClick={handleEditToggle} disabled={saving}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button onClick={handleEditToggle} className="flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              Editar Producto
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}