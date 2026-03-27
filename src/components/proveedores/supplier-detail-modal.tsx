'use client';

import { useState, useEffect, useCallback } from 'react';
import { Truck, Calendar, DollarSign, Mail, Phone, MapPin, User, Package, Plus, Trash2, Search, Star, X, Loader2 } from 'lucide-react';
import { Modal, Badge, Button, Card, CardContent, ToastContainer } from '@/components/ui';
import {
  SupplierDetail,
  SupplierProductItem,
  AddSupplierProductDto,
  getSupplierProducts,
  addSupplierProduct,
  removeSupplierProduct,
} from '@/services/suppliers';
import {
  getOrderProducts,
  OrderProductItem,
  OrderProductsPaginatedResponse,
} from '@/services/orders';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useDebounce, useToast } from '@/lib/hooks';

type TabId = 'info' | 'products';

interface SupplierDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierDetail | null;
}

export function SupplierDetailModal({ isOpen, onClose, supplier }: SupplierDetailModalProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('info');

  // Product catalog state
  const [supplierProducts, setSupplierProducts] = useState<SupplierProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  // Add product search state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [searchResults, setSearchResults] = useState<OrderProductItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Add product form
  const [selectedProduct, setSelectedProduct] = useState<OrderProductItem | null>(null);
  const [addForm, setAddForm] = useState<Partial<AddSupplierProductDto>>({
    supplierCost: 0,
    supplierSku: '',
    currency: 'MXN',
    leadTimeDays: undefined,
    minOrderQty: undefined,
    isPreferred: false,
  });
  const [addingProduct, setAddingProduct] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  // Load supplier products when tab changes
  const loadSupplierProducts = useCallback(async () => {
    if (!supplier) return;
    setLoadingProducts(true);
    try {
      const products = await getSupplierProducts(supplier.id);
      setSupplierProducts(products);
    } catch {
      toast.error('Error al cargar productos del proveedor');
    } finally {
      setLoadingProducts(false);
    }
  }, [supplier, toast]);

  useEffect(() => {
    if (activeTab === 'products' && supplier) {
      loadSupplierProducts();
    }
  }, [activeTab, supplier, loadSupplierProducts]);

  // Search products for adding
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    const doSearch = async () => {
      setSearchLoading(true);
      try {
        const response: OrderProductsPaginatedResponse = await getOrderProducts({
          search: debouncedSearch,
          limit: 10,
          page: 1,
        });
        if (!cancelled) {
          // Filter out products already in supplier catalog
          const existingIds = new Set(supplierProducts.map(p => p.productId));
          setSearchResults(response.items.filter(item => !existingIds.has(item.productId)));
        }
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    };
    doSearch();
    return () => { cancelled = true; };
  }, [debouncedSearch, supplierProducts]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('info');
      setSupplierProducts([]);
      setShowAddProduct(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedProduct(null);
    }
  }, [isOpen]);

  const handleSelectProduct = (product: OrderProductItem) => {
    setSelectedProduct(product);
    setAddForm({
      productId: product.productId,
      supplierCost: 0,
      supplierSku: '',
      currency: product.currency || 'MXN',
      leadTimeDays: undefined,
      minOrderQty: undefined,
      isPreferred: false,
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddProduct = async () => {
    if (!supplier || !selectedProduct || !addForm.productId) return;
    setAddingProduct(true);
    try {
      const dto: AddSupplierProductDto = {
        productId: addForm.productId!,
        supplierCost: addForm.supplierCost || 0,
        supplierSku: addForm.supplierSku || undefined,
        currency: addForm.currency || 'MXN',
        leadTimeDays: addForm.leadTimeDays || undefined,
        minOrderQty: addForm.minOrderQty || undefined,
        isPreferred: addForm.isPreferred || false,
      };
      await addSupplierProduct(supplier.id, dto);
      toast.success('Producto agregado al catálogo del proveedor');
      setSelectedProduct(null);
      setShowAddProduct(false);
      await loadSupplierProducts();
    } catch {
      toast.error('Error al agregar producto');
    } finally {
      setAddingProduct(false);
    }
  };

  const handleRemoveProduct = async (productId: number) => {
    if (!supplier) return;
    setRemovingId(productId);
    try {
      await removeSupplierProduct(supplier.id, productId);
      toast.success('Producto eliminado del catálogo');
      setSupplierProducts(prev => prev.filter(p => p.productId !== productId));
    } catch {
      toast.error('Error al eliminar producto');
    } finally {
      setRemovingId(null);
    }
  };

  if (!supplier) return null;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'info', label: 'Información', icon: <Truck className="w-4 h-4" /> },
    { id: 'products', label: 'Catálogo de Productos', icon: <Package className="w-4 h-4" /> },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del Proveedor" size="xl">
      <div className="space-y-6">
        {/* Header con avatar e info principal */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Truck className="w-8 h-8 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{supplier.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={supplier.isActive ? 'success' : 'danger'}>
                {supplier.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
              {supplier.rfc && (
                <span className="text-sm text-gray-500 font-mono">{supplier.rfc}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'products' && supplierProducts.length > 0 && (
                  <span className="bg-orange-100 text-orange-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
                    {supplierProducts.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content: Info */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* Estadísticas */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Total Compras</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(supplier.totalPurchases)}</p>
              </div>
            </div>

            {/* Información de contacto */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Información de Contacto</h4>
              <div className="space-y-3">
                {supplier.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-xs text-gray-500 block">Email</span>
                      <span className="text-sm font-medium text-gray-900">{supplier.email}</span>
                    </div>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-xs text-gray-500 block">Teléfono</span>
                      <span className="text-sm font-medium text-gray-900">{supplier.phone}</span>
                    </div>
                  </div>
                )}
                {(supplier.address || supplier.city || supplier.state) && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-xs text-gray-500 block">Dirección</span>
                      <span className="text-sm font-medium text-gray-900">
                        {[supplier.address, supplier.city, supplier.state, supplier.zipCode]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Persona de contacto */}
            {(supplier.contactName || supplier.contactPhone || supplier.contactEmail) && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Persona de Contacto</h4>
                <div className="space-y-3">
                  {supplier.contactName && (
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-xs text-gray-500 block">Nombre</span>
                        <span className="text-sm font-medium text-gray-900">{supplier.contactName}</span>
                      </div>
                    </div>
                  )}
                  {supplier.contactPhone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-xs text-gray-500 block">Teléfono</span>
                        <span className="text-sm font-medium text-gray-900">{supplier.contactPhone}</span>
                      </div>
                    </div>
                  )}
                  {supplier.contactEmail && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-xs text-gray-500 block">Email</span>
                        <span className="text-sm font-medium text-gray-900">{supplier.contactEmail}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fechas */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Información del Registro</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs text-gray-500 block">Fecha de Registro</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDateTime(supplier.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs text-gray-500 block">Última Actualización</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDateTime(supplier.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notas */}
            {supplier.notes && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Notas</h4>
                <p className="text-sm text-gray-600 whitespace-pre-line">{supplier.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Products Catalog */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Header con botón de agregar */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {loadingProducts ? 'Cargando...' : `${supplierProducts.length} producto(s) en catálogo`}
              </p>
              {!showAddProduct && (
                <Button
                  size="sm"
                  onClick={() => setShowAddProduct(true)}
                  className="flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Producto
                </Button>
              )}
            </div>

            {/* Panel de agregar producto */}
            {showAddProduct && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Agregar Producto al Catálogo</h4>
                    <button
                      onClick={() => { setShowAddProduct(false); setSelectedProduct(null); setSearchQuery(''); }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>

                  {!selectedProduct ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar producto por nombre o SKU..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          autoFocus
                        />
                        {searchLoading && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                        )}
                      </div>
                      {searchResults.length > 0 && (
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                          {searchResults.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleSelectProduct(item)}
                              className="w-full text-left px-3 py-2 hover:bg-orange-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {item.sku && <span className="font-mono">{item.sku}</span>}
                                    {item.variantName && <span> · {item.variantName}</span>}
                                    {item.category && <span> · {item.category}</span>}
                                  </p>
                                </div>
                                <span className="text-xs text-gray-400">{formatCurrency(item.price)}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {debouncedSearch.length >= 2 && !searchLoading && searchResults.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-2">Sin resultados</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Selected product chip */}
                      <div className="flex items-center gap-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                        <Package className="w-5 h-5 text-orange-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{selectedProduct.name}</p>
                          <p className="text-xs text-gray-500">
                            {selectedProduct.sku && <span className="font-mono">{selectedProduct.sku}</span>}
                            {selectedProduct.variantName && <span> · {selectedProduct.variantName}</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedProduct(null)}
                          className="p-1 hover:bg-orange-100 rounded"
                        >
                          <X className="w-3.5 h-3.5 text-orange-600" />
                        </button>
                      </div>

                      {/* Form fields */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Costo del Proveedor *</label>
                          <input
                            type="number"
                            value={addForm.supplierCost || ''}
                            onChange={(e) => setAddForm(f => ({ ...f, supplierCost: parseFloat(e.target.value) || 0 }))}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">SKU del Proveedor</label>
                          <input
                            type="text"
                            value={addForm.supplierSku || ''}
                            onChange={(e) => setAddForm(f => ({ ...f, supplierSku: e.target.value }))}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="SKU-PROV"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Moneda</label>
                          <select
                            value={addForm.currency || 'MXN'}
                            onChange={(e) => setAddForm(f => ({ ...f, currency: e.target.value }))}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="MXN">MXN</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Lead Time (días)</label>
                          <input
                            type="number"
                            value={addForm.leadTimeDays ?? ''}
                            onChange={(e) => setAddForm(f => ({ ...f, leadTimeDays: e.target.value ? parseInt(e.target.value) : undefined }))}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="—"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Pedido Mínimo</label>
                          <input
                            type="number"
                            value={addForm.minOrderQty ?? ''}
                            onChange={(e) => setAddForm(f => ({ ...f, minOrderQty: e.target.value ? parseInt(e.target.value) : undefined }))}
                            className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="—"
                            min="1"
                          />
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={addForm.isPreferred || false}
                              onChange={(e) => setAddForm(f => ({ ...f, isPreferred: e.target.checked }))}
                              className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                            />
                            <span className="text-sm text-gray-700">Proveedor preferido</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={handleAddProduct}
                          disabled={addingProduct || !addForm.supplierCost}
                        >
                          {addingProduct ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                              Agregando...
                            </>
                          ) : (
                            'Agregar al Catálogo'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setShowAddProduct(false); setSelectedProduct(null); }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Products table */}
            {loadingProducts ? (
              <div className="text-center py-8 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">Cargando productos...</p>
              </div>
            ) : supplierProducts.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Este proveedor no tiene productos en su catálogo</p>
                <p className="text-xs text-gray-400 mt-1">Agregue productos para vincularlos con este proveedor</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Producto</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">SKU Interno</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">SKU Prov.</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Costo</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600">Moneda</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600">Lead Time</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600">Min.</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600">Pref.</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {supplierProducts.map((sp) => (
                      <tr key={sp.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-900 text-sm">{sp.product.name}</p>
                          {sp.product.category && (
                            <p className="text-xs text-gray-400">{sp.product.category.name}</p>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500">
                          {sp.product.variants?.[0]?.sku || '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500">
                          {sp.supplierSku || '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                          {formatCurrency(sp.supplierCost)}
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-gray-500">
                          {sp.currency || 'MXN'}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600">
                          {sp.leadTimeDays != null ? `${sp.leadTimeDays}d` : '—'}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600">
                          {sp.minOrderQty != null ? sp.minOrderQty : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {sp.isPreferred && (
                            <Star className="w-4 h-4 text-amber-500 mx-auto fill-amber-500" />
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => handleRemoveProduct(sp.productId)}
                            disabled={removingId === sp.productId}
                            className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Eliminar del catálogo"
                          >
                            {removingId === sp.productId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </Modal>
  );
}
