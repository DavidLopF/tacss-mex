'use client';

import { useReducer, useEffect, useCallback, useId, type Dispatch } from 'react';
import { Truck, Calendar, DollarSign, Mail, Phone, MapPin, User, Package, Plus, Trash2, Search, Star, X, Loader2 } from 'lucide-react';
import { Modal, Badge, Button, Card, CardContent, ToastContainer, NumericInput } from '@/components/ui';
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

type SupplierState = {
  activeTab: TabId;
  supplierProducts: SupplierProductItem[];
  loadingProducts: boolean;
  showAddProduct: boolean;
  searchQuery: string;
  searchResults: OrderProductItem[];
  searchLoading: boolean;
  selectedProduct: OrderProductItem | null;
  addForm: Partial<AddSupplierProductDto>;
  addingProduct: boolean;
  removingId: number | null;
};

type SupplierAction =
  | { type: 'set'; payload: Partial<SupplierState> }
  | { type: 'reset' }
  | { type: 'selectProduct'; product: OrderProductItem }
  | { type: 'clearSelectedProduct' };

const createAddForm = (product?: OrderProductItem | null): Partial<AddSupplierProductDto> => ({
  productId: product?.productId,
  supplierCost: 0,
  supplierSku: '',
  currency: product?.currency || 'MXN',
  leadTimeDays: undefined,
  minOrderQty: undefined,
  isPreferred: false,
});

const initialSupplierState: SupplierState = {
  activeTab: 'info',
  supplierProducts: [],
  loadingProducts: false,
  showAddProduct: false,
  searchQuery: '',
  searchResults: [],
  searchLoading: false,
  selectedProduct: null,
  addForm: createAddForm(null),
  addingProduct: false,
  removingId: null,
};

const supplierReducer = (state: SupplierState, action: SupplierAction): SupplierState => {
  switch (action.type) {
    case 'set':
      return { ...state, ...action.payload };
    case 'reset':
      return { ...initialSupplierState, addForm: createAddForm(null) };
    case 'selectProduct':
      return {
        ...state,
        selectedProduct: action.product,
        addForm: createAddForm(action.product),
        searchQuery: '',
        searchResults: [],
      };
    case 'clearSelectedProduct':
      return {
        ...state,
        selectedProduct: null,
        addForm: createAddForm(null),
      };
    default:
      return state;
  }
};

const SupplierHeader = ({ supplier }: { supplier: SupplierDetail }) => (
  <div className="flex items-center gap-4">
    <div className="size-16 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
      <Truck className="size-8 text-orange-600" />
    </div>
    <div className="flex-1">
      <h3 className="text-xl font-semibold text-zinc-900">{supplier.name}</h3>
      <div className="flex items-center gap-2 mt-1">
        <Badge variant={supplier.isActive ? 'success' : 'danger'}>
          {supplier.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
        {supplier.rfc && (
          <span className="text-sm text-zinc-500 font-mono">{supplier.rfc}</span>
        )}
      </div>
    </div>
  </div>
);

const SupplierInfoTab = ({ supplier }: { supplier: SupplierDetail }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 gap-4">
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="size-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">Total Compras</span>
              </div>
              <p className="text-2xl font-semibold text-emerald-900">{formatCurrency(supplier.totalPurchases)}</p>
            </div>
    </div>

    <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">Información de Contacto</h4>
      <div className="space-y-3">
        {supplier.email && (
          <div className="flex items-center gap-3">
            <Mail className="size-4 text-zinc-400 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-xs text-zinc-500 block">Email</span>
              <span className="text-sm font-medium text-zinc-900">{supplier.email}</span>
            </div>
          </div>
        )}
        {supplier.phone && (
          <div className="flex items-center gap-3">
            <Phone className="size-4 text-zinc-400 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-xs text-zinc-500 block">Teléfono</span>
              <span className="text-sm font-medium text-zinc-900">{supplier.phone}</span>
            </div>
          </div>
        )}
        {(supplier.address || supplier.city || supplier.state) && (
          <div className="flex items-center gap-3">
            <MapPin className="size-4 text-zinc-400 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-xs text-zinc-500 block">Dirección</span>
              <span className="text-sm font-medium text-zinc-900">
                {[supplier.address, supplier.city, supplier.state, supplier.zipCode]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>

    {(supplier.contactName || supplier.contactPhone || supplier.contactEmail) && (
      <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
        <h4 className="text-sm font-semibold text-zinc-700 mb-3">Persona de Contacto</h4>
        <div className="space-y-3">
          {supplier.contactName && (
            <div className="flex items-center gap-3">
              <User className="size-4 text-zinc-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-xs text-zinc-500 block">Nombre</span>
                <span className="text-sm font-medium text-zinc-900">{supplier.contactName}</span>
              </div>
            </div>
          )}
          {supplier.contactPhone && (
            <div className="flex items-center gap-3">
              <Phone className="size-4 text-zinc-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-xs text-zinc-500 block">Teléfono</span>
                <span className="text-sm font-medium text-zinc-900">{supplier.contactPhone}</span>
              </div>
            </div>
          )}
          {supplier.contactEmail && (
            <div className="flex items-center gap-3">
              <Mail className="size-4 text-zinc-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-xs text-zinc-500 block">Email</span>
                <span className="text-sm font-medium text-zinc-900">{supplier.contactEmail}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">Información del Registro</h4>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Calendar className="size-4 text-zinc-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-xs text-zinc-500 block">Fecha de Registro</span>
            <span className="text-sm font-medium text-zinc-900">
              {formatDateTime(supplier.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="size-4 text-zinc-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-xs text-zinc-500 block">Última Actualización</span>
            <span className="text-sm font-medium text-zinc-900">
              {formatDateTime(supplier.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </div>

    {supplier.notes && (
      <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
        <h4 className="text-sm font-semibold text-zinc-700 mb-2">Notas</h4>
        <p className="text-sm text-zinc-600 whitespace-pre-line">{supplier.notes}</p>
      </div>
    )}
  </div>
);

type SupplierProductsTabProps = {
  state: SupplierState;
  dispatch: Dispatch<SupplierAction>;
  debouncedSearch: string;
  onSelectProduct: (product: OrderProductItem) => void;
  onAddProduct: () => void;
  onRemoveProduct: (productId: number) => void;
  supplierCostId: string;
  supplierSkuId: string;
  currencyId: string;
  leadTimeId: string;
  minOrderId: string;
};

const SupplierProductsTab = ({
  state,
  dispatch,
  debouncedSearch,
  onSelectProduct,
  onAddProduct,
  onRemoveProduct,
  supplierCostId,
  supplierSkuId,
  currencyId,
  leadTimeId,
  minOrderId,
}: SupplierProductsTabProps) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <p className="text-sm text-zinc-500">
        {state.loadingProducts ? 'Cargando…' : `${state.supplierProducts.length} producto(s) en catálogo`}
      </p>
      {!state.showAddProduct && (
        <Button
          size="sm"
          onClick={() => dispatch({ type: 'set', payload: { showAddProduct: true } })}
          className="flex items-center gap-1.5"
        >
          <Plus className="size-3.5" />
          Agregar Producto
        </Button>
      )}
    </div>

    {state.showAddProduct && (
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-zinc-900">Agregar Producto al Catálogo</h4>
            <button
              onClick={() => dispatch({ type: 'set', payload: { showAddProduct: false, selectedProduct: null, searchQuery: '' } })}
              className="p-1 hover:bg-zinc-100 rounded"
            >
              <X className="size-4 text-zinc-500" />
            </button>
          </div>

          {!state.selectedProduct ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <input
                  type="text"
                  value={state.searchQuery}
                  onChange={(e) => dispatch({ type: 'set', payload: { searchQuery: e.target.value } })}
                  placeholder="Buscar producto por nombre o SKU…"
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {state.searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400 animate-spin" />
                )}
              </div>
              {state.searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-lg divide-y divide-zinc-100">
                  {state.searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onSelectProduct(item)}
                      className="w-full text-left px-3 py-2 hover:bg-orange-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{item.name}</p>
                          <p className="text-xs text-zinc-500">
                            {item.sku && <span className="font-mono">{item.sku}</span>}
                            {item.variantName && <span> · {item.variantName}</span>}
                            {item.category && <span> · {item.category}</span>}
                          </p>
                        </div>
                        <span className="text-xs text-zinc-400">{formatCurrency(item.price)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {debouncedSearch.length >= 2 && !state.searchLoading && state.searchResults.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-2">Sin resultados</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                <Package className="size-5 text-orange-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{state.selectedProduct.name}</p>
                  <p className="text-xs text-zinc-500">
                    {state.selectedProduct.sku && <span className="font-mono">{state.selectedProduct.sku}</span>}
                    {state.selectedProduct.variantName && <span> · {state.selectedProduct.variantName}</span>}
                  </p>
                </div>
                <button
                  onClick={() => dispatch({ type: 'clearSelectedProduct' })}
                  className="p-1 hover:bg-orange-100 rounded"
                >
                  <X className="size-3.5 text-orange-600" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={supplierCostId} className="text-xs text-zinc-600 mb-1 block">Costo del Proveedor *</label>
                  <NumericInput
                    min={0}
                    id={supplierCostId}
                    value={state.addForm.supplierCost ?? 0}
                    onChange={(v) => dispatch({ type: 'set', payload: { addForm: { ...state.addForm, supplierCost: v } } })}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor={supplierSkuId} className="text-xs text-zinc-600 mb-1 block">SKU del Proveedor</label>
                  <input
                    id={supplierSkuId}
                    type="text"
                    value={state.addForm.supplierSku || ''}
                    onChange={(e) => dispatch({ type: 'set', payload: { addForm: { ...state.addForm, supplierSku: e.target.value } } })}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="SKU-PROV"
                  />
                </div>
                <div>
                  <label htmlFor={currencyId} className="text-xs text-zinc-600 mb-1 block">Moneda</label>
                  <select
                    id={currencyId}
                    value={state.addForm.currency || 'MXN'}
                    onChange={(e) => dispatch({ type: 'set', payload: { addForm: { ...state.addForm, currency: e.target.value } } })}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="MXN">MXN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label htmlFor={leadTimeId} className="text-xs text-zinc-600 mb-1 block">Lead Time (días)</label>
                  <NumericInput
                    integer
                    min={0}
                    id={leadTimeId}
                    value={state.addForm.leadTimeDays ?? 0}
                    onChange={(v) => dispatch({ type: 'set', payload: { addForm: { ...state.addForm, leadTimeDays: v > 0 ? v : undefined } } })}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="—"
                  />
                </div>
                <div>
                  <label htmlFor={minOrderId} className="text-xs text-zinc-600 mb-1 block">Pedido Mínimo</label>
                  <NumericInput
                    integer
                    min={1}
                    id={minOrderId}
                    value={state.addForm.minOrderQty ?? 0}
                    onChange={(v) => dispatch({ type: 'set', payload: { addForm: { ...state.addForm, minOrderQty: v > 0 ? v : undefined } } })}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="—"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={state.addForm.isPreferred || false}
                      onChange={(e) => dispatch({ type: 'set', payload: { addForm: { ...state.addForm, isPreferred: e.target.checked } } })}
                      className="size-4 text-orange-500 border-zinc-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm text-zinc-700">Proveedor preferido</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={onAddProduct}
                  disabled={state.addingProduct || !state.addForm.supplierCost}
                >
                  {state.addingProduct ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1" />
                      Agregando…
                    </>
                  ) : (
                    'Agregar al Catálogo'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => dispatch({ type: 'set', payload: { showAddProduct: false, selectedProduct: null } })}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )}

    {state.loadingProducts ? (
      <div className="text-center py-8 text-zinc-400">
        <Loader2 className="size-6 animate-spin mx-auto mb-2" />
        <p className="text-sm">Cargando productos…</p>
      </div>
    ) : state.supplierProducts.length === 0 ? (
      <div className="text-center py-10 text-zinc-400 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
        <Package className="size-10 mx-auto mb-2 text-zinc-300" />
        <p className="text-sm">Este proveedor no tiene productos en su catálogo</p>
        <p className="text-xs text-zinc-400 mt-1">Agregue productos para vincularlos con este proveedor</p>
      </div>
    ) : (
      <div className="overflow-x-auto border border-zinc-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-zinc-600">Producto</th>
              <th className="text-left px-3 py-2 font-medium text-zinc-600">SKU Interno</th>
              <th className="text-left px-3 py-2 font-medium text-zinc-600">SKU Prov.</th>
              <th className="text-right px-3 py-2 font-medium text-zinc-600">Costo</th>
              <th className="text-center px-3 py-2 font-medium text-zinc-600">Moneda</th>
              <th className="text-center px-3 py-2 font-medium text-zinc-600">Lead Time</th>
              <th className="text-center px-3 py-2 font-medium text-zinc-600">Min.</th>
              <th className="text-center px-3 py-2 font-medium text-zinc-600">Pref.</th>
              <th className="text-center px-3 py-2 font-medium text-zinc-600 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {state.supplierProducts.map((sp) => (
              <tr key={sp.id} className="hover:bg-zinc-50">
                <td className="px-3 py-2">
                  <p className="font-medium text-zinc-900 text-sm">{sp.product.name}</p>
                  {sp.product.category && (
                    <p className="text-xs text-zinc-400">{sp.product.category.name}</p>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                  {sp.product.variants?.[0]?.sku || '—'}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                  {sp.supplierSku || '—'}
                </td>
                <td className="px-3 py-2 text-right font-medium text-zinc-900">
                  {formatCurrency(sp.supplierCost)}
                </td>
                <td className="px-3 py-2 text-center text-xs text-zinc-500">
                  {sp.currency || 'MXN'}
                </td>
                <td className="px-3 py-2 text-center text-zinc-600">
                  {sp.leadTimeDays != null ? `${sp.leadTimeDays}d` : '—'}
                </td>
                <td className="px-3 py-2 text-center text-zinc-600">
                  {sp.minOrderQty != null ? sp.minOrderQty : '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  {sp.isPreferred && (
                    <Star className="size-4 text-amber-500 mx-auto fill-amber-500" />
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => onRemoveProduct(sp.productId)}
                    disabled={state.removingId === sp.productId}
                    className="p-1 hover:bg-red-50 rounded text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                    title="Eliminar del catálogo"
                  >
                    {state.removingId === sp.productId ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
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
);

export function SupplierDetailModal({ isOpen, onClose, supplier }: SupplierDetailModalProps) {
  const toast = useToast();
  const [state, dispatch] = useReducer(supplierReducer, initialSupplierState);
  const debouncedSearch = useDebounce(state.searchQuery, 400);
  const supplierCostId = useId();
  const supplierSkuId = useId();
  const currencyId = useId();
  const leadTimeId = useId();
  const minOrderId = useId();

  // Load supplier products when tab changes
  const loadSupplierProducts = useCallback(async () => {
    if (!supplier) return;
    dispatch({ type: 'set', payload: { loadingProducts: true } });
    try {
      const products = await getSupplierProducts(supplier.id);
      dispatch({ type: 'set', payload: { supplierProducts: products } });
    } catch {
      toast.error('Error al cargar productos del proveedor');
    } finally {
      dispatch({ type: 'set', payload: { loadingProducts: false } });
    }
  }, [supplier, toast]);

  // Search products for adding
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      dispatch({ type: 'set', payload: { searchResults: [] } });
      return;
    }

    let cancelled = false;
    const doSearch = async () => {
      dispatch({ type: 'set', payload: { searchLoading: true } });
      try {
        const response: OrderProductsPaginatedResponse = await getOrderProducts({
          search: debouncedSearch,
          limit: 10,
          page: 1,
        });
        if (!cancelled) {
          // Filter out products already in supplier catalog
          const existingIds = new Set(state.supplierProducts.map(p => p.productId));
          dispatch({
            type: 'set',
            payload: { searchResults: response.items.filter(item => !existingIds.has(item.productId)) },
          });
        }
      } catch {
        if (!cancelled) dispatch({ type: 'set', payload: { searchResults: [] } });
      } finally {
        if (!cancelled) dispatch({ type: 'set', payload: { searchLoading: false } });
      }
    };
    doSearch();
    return () => { cancelled = true; };
  }, [debouncedSearch, state.supplierProducts]);

  const handleTabChange = (tabId: TabId) => {
    dispatch({ type: 'set', payload: { activeTab: tabId } });
    if (tabId === 'products' && supplier) {
      loadSupplierProducts();
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      dispatch({ type: 'reset' });
    }
  }, [isOpen]);

  const handleSelectProduct = (product: OrderProductItem) => {
    dispatch({ type: 'selectProduct', product });
  };

  const handleAddProduct = async () => {
    if (!supplier || !state.selectedProduct || !state.addForm.productId) return;
    dispatch({ type: 'set', payload: { addingProduct: true } });
    try {
      const dto: AddSupplierProductDto = {
        productId: state.addForm.productId!,
        supplierCost: state.addForm.supplierCost || 0,
        supplierSku: state.addForm.supplierSku || undefined,
        currency: state.addForm.currency || 'MXN',
        leadTimeDays: state.addForm.leadTimeDays || undefined,
        minOrderQty: state.addForm.minOrderQty || undefined,
        isPreferred: state.addForm.isPreferred || false,
      };
      await addSupplierProduct(supplier.id, dto);
      toast.success('Producto agregado al catálogo del proveedor');
      dispatch({ type: 'set', payload: { selectedProduct: null, showAddProduct: false } });
      await loadSupplierProducts();
    } catch {
      toast.error('Error al agregar producto');
    } finally {
      dispatch({ type: 'set', payload: { addingProduct: false } });
    }
  };

  const handleRemoveProduct = async (productId: number) => {
    if (!supplier) return;
    dispatch({ type: 'set', payload: { removingId: productId } });
    try {
      await removeSupplierProduct(supplier.id, productId);
      toast.success('Producto eliminado del catálogo');
      dispatch({
        type: 'set',
        payload: { supplierProducts: state.supplierProducts.filter(p => p.productId !== productId) },
      });
    } catch {
      toast.error('Error al eliminar producto');
    } finally {
      dispatch({ type: 'set', payload: { removingId: null } });
    }
  };

  if (!supplier) return null;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'info', label: 'Información', icon: <Truck className="size-4" /> },
    { id: 'products', label: 'Catálogo de Productos', icon: <Package className="size-4" /> },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del Proveedor" size="xl">
      <div className="space-y-6">
        {/* Header con avatar e info principal */}
        <SupplierHeader supplier={supplier} />

        {/* Tabs */}
        <div className="border-b border-zinc-200">
          <div className="flex gap-1">
            {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    state.activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'products' && state.supplierProducts.length > 0 && (
                  <span className="bg-orange-100 text-orange-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
                    {state.supplierProducts.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content: Info */}
        {state.activeTab === 'info' && <SupplierInfoTab supplier={supplier} />}

        {/* Tab Content: Products Catalog */}
        {state.activeTab === 'products' && (
          <SupplierProductsTab
            state={state}
            dispatch={dispatch}
            debouncedSearch={debouncedSearch}
            onSelectProduct={handleSelectProduct}
            onAddProduct={handleAddProduct}
            onRemoveProduct={handleRemoveProduct}
            supplierCostId={supplierCostId}
            supplierSkuId={supplierSkuId}
            currencyId={currencyId}
            leadTimeId={leadTimeId}
            minOrderId={minOrderId}
          />
        )}
      </div>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </Modal>
  );
}
