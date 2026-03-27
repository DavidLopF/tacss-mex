'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '@/components/ui';
import {
  Search,
  Plus,
  Trash2,
  ShoppingCart,
  DollarSign,
  Package,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Truck,
  Calendar,
  StickyNote,
  Loader2,
  ChevronDown,
  ChevronUp,
  Percent,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks';
import { useCompany } from '@/lib/company-context';
import {
  CreatePurchaseOrderDto,
  SupplierListItem,
  SupplierProductItem,
} from '@/services/suppliers';
import { getAllSuppliers, getSupplierProducts } from '@/services/suppliers/suppliers.service';
import {
  getOrderProducts,
  OrderProductItem,
  OrderProductsPaginatedResponse,
} from '@/services/orders';

interface CreatePurchaseOrderFullscreenProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dto: CreatePurchaseOrderDto) => void;
  submitting?: boolean;
}

interface LineaOC {
  key: number;
  producto: OrderProductItem;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
}

let itemCounter = 0;
const PRODUCTS_PER_PAGE = 4;

export function CreatePurchaseOrderFullscreen({
  isOpen,
  onClose,
  onSave,
  submitting,
}: CreatePurchaseOrderFullscreenProps) {
  const { settings } = useCompany();
  const primary = settings.primaryColor;
  const primaryBg = primary + '18';
  const primaryBgMid = primary + '30';

  // ── Estado principal ──
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [carrito, setCarrito] = useState<LineaOC[]>([]);
  const [notas, setNotas] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');

  // ── Costos de internación (landed cost) ──
  const [costosOpen, setCostosOpen] = useState(false);
  const [freightPct, setFreightPct] = useState(0);
  const [customsPct, setCustomsPct] = useState(0);
  const [taxPct, setTaxPct] = useState(0);
  const [handlingPct, setHandlingPct] = useState(0);
  const [otherPct, setOtherPct] = useState(0);

  // ── Proveedores ──
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // ── Productos (paginados desde API /api/inventory) ──
  const [productos, setProductos] = useState<OrderProductItem[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // ── Catálogo del proveedor ──
  const [catalogoProveedor, setCatalogoProveedor] = useState<SupplierProductItem[]>([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [showCatalogo, setShowCatalogo] = useState(true);

  const debouncedSearch = useDebounce(searchTerm, 400);

  const supplierSeleccionado = suppliers.find(s => s.id === supplierId);

  // ── Bloquear scroll y manejar Escape ──
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // ── Cargar proveedores cuando se abre ──
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingSuppliers(true);
    getAllSuppliers()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data)
          ? data
          : Array.isArray((data as unknown as { suppliers: SupplierListItem[] }).suppliers)
            ? (data as unknown as { suppliers: SupplierListItem[] }).suppliers
            : [];
        setSuppliers(list);
      })
      .catch(() => { if (!cancelled) setSuppliers([]); })
      .finally(() => { if (!cancelled) setLoadingSuppliers(false); });
    return () => { cancelled = true; };
  }, [isOpen]);

  // ── Cargar catálogo del proveedor seleccionado ──
  useEffect(() => {
    if (!isOpen || !supplierId) {
      setCatalogoProveedor([]);
      return;
    }
    let cancelled = false;
    setLoadingCatalogo(true);
    getSupplierProducts(supplierId as number)
      .then((data) => {
        if (!cancelled) setCatalogoProveedor(data);
      })
      .catch(() => {
        if (!cancelled) setCatalogoProveedor([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalogo(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, supplierId]);

  // ── Cargar productos con búsqueda y paginación ──
  const loadProductos = useCallback(async (page: number, search: string) => {
    setLoadingProductos(true);
    try {
      const response: OrderProductsPaginatedResponse = await getOrderProducts({
        page,
        limit: PRODUCTS_PER_PAGE,
        search: search || undefined,
        stockStatus: 'all',
      });
      setProductos(response.items);
      setTotalPages(response.totalPages);
      setTotalProducts(response.total);
      setCurrentPage(response.page);
    } catch {
      console.error('Error al cargar productos');
      setProductos([]);
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  // Recargar cuando cambia la búsqueda
  useEffect(() => {
    if (isOpen && supplierId) {
      setCurrentPage(1);
      loadProductos(1, debouncedSearch);
    }
  }, [debouncedSearch, isOpen, supplierId, loadProductos]);

  // ── Paginación ──
  const handlePrevPage = () => {
    if (currentPage > 1) loadProductos(currentPage - 1, debouncedSearch);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) loadProductos(currentPage + 1, debouncedSearch);
  };

  // ── Agregar producto al carrito ──
  const agregarAlCarrito = (producto: OrderProductItem) => {
    // Si ya existe esta variante, incrementar cantidad
    const existing = carrito.find(l => l.producto.id === producto.id);
    if (existing) {
      setCarrito(prev =>
        prev.map(l =>
          l.key === existing.key
            ? { ...l, cantidad: l.cantidad + 1, subtotal: l.costoUnitario * (l.cantidad + 1) }
            : l
        )
      );
      return;
    }

    itemCounter++;
    const nuevaLinea: LineaOC = {
      key: itemCounter,
      producto,
      cantidad: 1,
      costoUnitario: producto.price,
      subtotal: producto.price,
    };
    setCarrito(prev => [...prev, nuevaLinea]);
  };

  // ── Agregar producto desde catálogo del proveedor (con costo pre-llenado) ──
  const agregarDesdeCatalogo = (sp: SupplierProductItem) => {
    // Build a virtual OrderProductItem from the catalog entry
    const variant = sp.product.variants?.[0];
    const virtualProducto: OrderProductItem = {
      id: variant?.id ?? sp.productId,
      productId: sp.productId,
      name: sp.product.name,
      description: '',
      variantName: variant?.variantName ?? '',
      sku: variant?.sku ?? sp.supplierSku ?? '',
      barcode: '',
      category: sp.product.category?.name ?? '',
      stock: 0,
      stockStatus: 'in_stock',
      price: sp.supplierCost,
      currency: sp.currency || 'MXN',
      isActive: true,
      warehouses: [],
    };

    // If already in cart, increment
    const existing = carrito.find(l => l.producto.id === virtualProducto.id);
    if (existing) {
      setCarrito(prev =>
        prev.map(l =>
          l.key === existing.key
            ? { ...l, cantidad: l.cantidad + 1, subtotal: l.costoUnitario * (l.cantidad + 1) }
            : l
        )
      );
      return;
    }

    itemCounter++;
    const nuevaLinea: LineaOC = {
      key: itemCounter,
      producto: virtualProducto,
      cantidad: sp.minOrderQty || 1,
      costoUnitario: sp.supplierCost,
      subtotal: sp.supplierCost * (sp.minOrderQty || 1),
    };
    setCarrito(prev => [...prev, nuevaLinea]);
  };

  // ── Actualizar cantidad ──
  const actualizarCantidad = (key: number, cantidad: number) => {
    if (cantidad < 1) return;
    setCarrito(prev =>
      prev.map(l =>
        l.key === key
          ? { ...l, cantidad, subtotal: l.costoUnitario * cantidad }
          : l
      )
    );
  };

  // ── Actualizar costo unitario ──
  const actualizarCosto = (key: number, costo: number) => {
    if (costo < 0) return;
    setCarrito(prev =>
      prev.map(l =>
        l.key === key
          ? { ...l, costoUnitario: costo, subtotal: costo * l.cantidad }
          : l
      )
    );
  };

  // ── Eliminar del carrito ──
  const eliminarDelCarrito = (key: number) => {
    setCarrito(prev => prev.filter(l => l.key !== key));
  };

  // ── Totales ──
  const subtotal = carrito.reduce((sum, l) => sum + l.subtotal, 0);
  const totalUnidades = carrito.reduce((sum, l) => sum + l.cantidad, 0);

  // ── Landed cost calculations ──
  const totalPctSum = freightPct + customsPct + taxPct + handlingPct + otherPct;
  const landedMultiplier = 1 + totalPctSum / 100;
  const freightCost = subtotal * freightPct / 100;
  const customsCost = subtotal * customsPct / 100;
  const taxCostCalc = subtotal * taxPct / 100;
  const handlingCost = subtotal * handlingPct / 100;
  const otherCost = subtotal * otherPct / 100;
  const totalLandedCosts = freightCost + customsCost + taxCostCalc + handlingCost + otherCost;
  const grandTotal = subtotal + totalLandedCosts;

  const costFields = [
    { key: 'freightPct', label: 'Flete', icon: '🚛', value: freightPct, setter: setFreightPct, cost: freightCost },
    { key: 'customsPct', label: 'Aduana', icon: '🏛️', value: customsPct, setter: setCustomsPct, cost: customsCost },
    { key: 'taxPct', label: 'Impuestos', icon: '📋', value: taxPct, setter: setTaxPct, cost: taxCostCalc },
    { key: 'handlingPct', label: 'Manejo', icon: '📦', value: handlingPct, setter: setHandlingPct, cost: handlingCost },
    { key: 'otherPct', label: 'Otros', icon: '➕', value: otherPct, setter: setOtherPct, cost: otherCost },
  ];

  // ── Guardar ──
  const handleGuardar = () => {
    if (!supplierId || carrito.length === 0) return;

    const dto: CreatePurchaseOrderDto = {
      supplierId: supplierId as number,
      items: carrito.map(l => ({
        variantId: l.producto.id,
        qty: l.cantidad,
        unitCost: l.costoUnitario,
        description: l.producto.variantName
          ? `${l.producto.name} - ${l.producto.variantName}`
          : l.producto.name,
      })),
      notes: notas.trim() || undefined,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      // Landed cost percentages
      ...(freightPct > 0 && { freightPct }),
      ...(customsPct > 0 && { customsPct }),
      ...(taxPct > 0 && { taxPct }),
      ...(handlingPct > 0 && { handlingPct }),
      ...(otherPct > 0 && { otherPct }),
    };

    onSave(dto);
  };

  const handleClose = () => {
    setSupplierId('');
    setSearchTerm('');
    setCarrito([]);
    setNotas('');
    setExpectedDeliveryDate('');
    setProductos([]);
    setCurrentPage(1);
    setCatalogoProveedor([]);
    setShowCatalogo(true);
    // Reset landed cost
    setCostosOpen(false);
    setFreightPct(0);
    setCustomsPct(0);
    setTaxPct(0);
    setHandlingPct(0);
    setOtherPct(0);
    itemCounter = 0;
    onClose();
  };

  // ── Stock badge ──
  const getStockBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">En stock</span>;
      case 'low_stock':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Stock bajo</span>;
      case 'out_of_stock':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Sin stock</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 animate-in fade-in"
        onClick={handleClose}
      />

      {/* Fullscreen Panel */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom-4 fade-in duration-300">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5" style={{ color: primary }} />
            <h2 className="text-lg font-semibold text-gray-900">Nueva Orden de Compra</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* ── Body: 3 columnas ── */}
        <div className="flex-1 flex min-h-0">

          {/* ═══ Columna 1: Proveedor + Búsqueda de Productos ═══ */}
          <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/50">
            {/* Proveedor */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Proveedor</h3>
              </div>
              {loadingSuppliers ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: primary }} />
                  <span className="text-sm text-gray-500">Cargando...</span>
                </div>
              ) : (
                <select
                  value={supplierId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSupplierId(val ? Number(val) : '');
                    setCarrito([]);
                    setSearchTerm('');
                    setShowCatalogo(true);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white transition-all duration-200"
                  style={{ '--tw-ring-color': primary } as React.CSSProperties}
                >
                  <option value="">Seleccione un proveedor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
              {supplierSeleccionado && (
                <div className="mt-2 px-3 py-2 rounded-lg animate-in slide-in-from-top-2 fade-in duration-200" style={{ backgroundColor: primaryBg }}>
                  <p className="text-sm font-medium" style={{ color: primary }}>{supplierSeleccionado.name}</p>
                </div>
              )}
            </div>

            {/* Buscador */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar producto, SKU..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white transition-all duration-200"
                  style={{ '--tw-ring-color': primary } as React.CSSProperties}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!supplierId}
                />
              </div>
            </div>

            {/* Lista de Productos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {!supplierId ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <Truck className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  Selecciona un proveedor primero
                </div>
              ) : (
                <>
                  {/* ── Catálogo del Proveedor ── */}
                  {catalogoProveedor.length > 0 && (
                    <div className="mb-3">
                      <button
                        onClick={() => setShowCatalogo(prev => !prev)}
                        className="flex items-center gap-2 w-full text-left mb-2"
                      >
                        {showCatalogo ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Catálogo del Proveedor ({catalogoProveedor.length})
                        </span>
                      </button>
                      {showCatalogo && (
                        <div className="space-y-2">
                          {catalogoProveedor.map((sp) => {
                            const variant = sp.product.variants?.[0];
                            const enCarrito = carrito.some(l => l.producto.id === (variant?.id ?? sp.productId));
                            return (
                              <div
                                key={sp.id}
                                className="p-3 rounded-lg border transition-all duration-200 cursor-pointer group transform hover:scale-[1.01]"
                                style={{
                                  backgroundColor: enCarrito ? primaryBg : 'white',
                                  borderColor: enCarrito ? primary : '#f3f4f6',
                                }}
                                onMouseEnter={e => { if (!enCarrito) e.currentTarget.style.borderColor = primary; }}
                                onMouseLeave={e => { if (!enCarrito) e.currentTarget.style.borderColor = '#f3f4f6'; }}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className="w-10 h-10 flex-shrink-0 rounded flex items-center justify-center"
                                    style={{ backgroundColor: primaryBg }}
                                  >
                                    <Package className="w-5 h-5" style={{ color: primary }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{sp.product.name}</p>
                                    {variant?.variantName && (
                                      <p className="text-xs font-medium" style={{ color: primary }}>{variant.variantName}</p>
                                    )}
                                    <p className="text-xs text-gray-400 truncate">
                                      {sp.supplierSku && <span className="font-mono">{sp.supplierSku}</span>}
                                      {sp.product.category && <span>{sp.supplierSku ? ' • ' : ''}{sp.product.category.name}</span>}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-sm font-bold" style={{ color: primary }}>
                                        {formatCurrency(sp.supplierCost)}
                                      </span>
                                      {sp.currency && sp.currency !== 'MXN' && (
                                        <span className="text-xs text-gray-400">{sp.currency}</span>
                                      )}
                                      {sp.minOrderQty && (
                                        <span className="text-xs text-gray-400">Min: {sp.minOrderQty}</span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => agregarDesdeCatalogo(sp)}
                                    className="p-1.5 rounded-lg text-white flex-shrink-0 transition-all duration-200 hover:scale-110 active:scale-95"
                                    style={{ backgroundColor: primary }}
                                    title="Agregar al carrito"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Separator */}
                      <div className="flex items-center gap-2 mt-3 mb-1">
                        <div className="flex-1 border-t border-gray-200"></div>
                        <span className="text-xs text-gray-400 uppercase tracking-wider">Todos los productos</span>
                        <div className="flex-1 border-t border-gray-200"></div>
                      </div>
                    </div>
                  )}

                  {loadingCatalogo && catalogoProveedor.length === 0 && (
                    <div className="text-center py-4">
                      <Loader2 className="w-5 h-5 mx-auto animate-spin" style={{ color: primary }} />
                      <p className="text-xs text-gray-500 mt-1">Cargando catálogo...</p>
                    </div>
                  )}

                  {/* ── Productos del inventario general ── */}
                  {loadingProductos ? (
                <div className="text-center py-12">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin" style={{ color: primary }} />
                  <p className="text-xs text-gray-500 mt-2">Cargando productos...</p>
                </div>
              ) : productos.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  Sin resultados
                </div>
              ) : (
                productos.map((producto) => (
                  <div
                    key={producto.id}
                    className="p-3 bg-white rounded-lg border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer group transform hover:scale-[1.01]"
                    onMouseEnter={e => (e.currentTarget.style.borderColor = primary)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 flex-shrink-0 bg-gray-100 rounded flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900 truncate">{producto.name}</p>
                          {getStockBadge(producto.stockStatus)}
                        </div>
                        {producto.variantName && (
                          <p className="text-xs font-medium" style={{ color: primary }}>{producto.variantName}</p>
                        )}
                        <p className="text-xs text-gray-400 truncate">
                          {producto.sku}{producto.category ? ` • ${producto.category}` : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(producto.price)}</span>
                          <span className="text-xs text-gray-400">Stock: {producto.stock}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => agregarAlCarrito(producto)}
                        className="p-1.5 rounded-lg text-white flex-shrink-0 transition-all duration-200 hover:scale-110 active:scale-95"
                        style={{ backgroundColor: primary }}
                        title="Agregar al carrito"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
                </>
              )}
            </div>

            {/* Paginación */}
            {supplierId && totalProducts > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between flex-shrink-0 bg-white">
                <span className="text-xs text-gray-500">
                  {totalProducts} resultado{totalProducts !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1}
                    className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-gray-600">{currentPage}/{totalPages}</span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages}
                    className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ═══ Columna 2: Carrito de la Orden ═══ */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header Carrito */}
            <div className="px-6 py-3 border-b border-gray-200 flex-shrink-0" style={{ background: `linear-gradient(to right, ${primaryBg}, ${primaryBgMid})` }}>
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" style={{ color: primary }} />
                <h3 className="text-sm font-semibold text-gray-900">
                  Artículos de la Orden ({carrito.length} {carrito.length === 1 ? 'item' : 'items'})
                </h3>
              </div>
            </div>

            {/* Items del Carrito */}
            <div className="flex-1 overflow-y-auto p-4">
              {carrito.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingCart className="w-12 h-12 text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">No hay artículos en la orden</p>
                  <p className="text-xs text-gray-300 mt-1">Agrega productos desde el panel izquierdo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {carrito.map((linea) => (
                    <Card key={linea.key} className="p-3 animate-in slide-in-from-right-4 fade-in duration-300 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 flex-shrink-0 bg-gray-100 rounded flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{linea.producto.name}</p>
                              {linea.producto.variantName && (
                                <p className="text-xs" style={{ color: primary }}>{linea.producto.variantName}</p>
                              )}
                              <p className="text-xs text-gray-400">{linea.producto.sku}</p>
                            </div>
                            <button
                              onClick={() => eliminarDelCarrito(linea.key)}
                              className="text-red-400 hover:text-red-600 p-0.5 transition-all duration-200 hover:scale-110 active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            <div>
                              <label className="text-[10px] text-gray-500 block">Cantidad</label>
                              <input
                                type="number"
                                min="1"
                                value={linea.cantidad}
                                onChange={(e) => actualizarCantidad(linea.key, parseInt(e.target.value) || 1)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 transition-all"
                                style={{ '--tw-ring-color': primary } as React.CSSProperties}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 block">Costo Unit.</label>
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={linea.costoUnitario}
                                  onChange={(e) => actualizarCosto(linea.key, parseFloat(e.target.value) || 0)}
                                  className="w-full pl-4 pr-1 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 transition-all"
                                  style={{ '--tw-ring-color': primary } as React.CSSProperties}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 block">Subtotal</label>
                              <p className="py-1 text-sm font-bold text-gray-900">
                                {formatCurrency(linea.subtotal)}
                              </p>
                            </div>
                            {totalPctSum > 0 && (
                              <div>
                                <label className="text-[10px] text-gray-500 block">C. Internado</label>
                                <p className="py-1 text-sm font-bold" style={{ color: primary }}>
                                  {formatCurrency(linea.costoUnitario * landedMultiplier)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Notas */}
            <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <StickyNote className="w-3.5 h-3.5 text-gray-400" />
                <label className="text-xs font-medium text-gray-500">Notas (opcional)</label>
              </div>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Instrucciones especiales para el proveedor..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': primary } as React.CSSProperties}
                rows={2}
              />
            </div>

            {/* ── Costos de Internación (collapsible) ── */}
            <div className="border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={() => setCostosOpen(!costosOpen)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Percent className="w-3.5 h-3.5" style={{ color: primary }} />
                  <span className="text-xs font-semibold text-gray-700">Costos de Internación</span>
                  {totalPctSum > 0 && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ backgroundColor: primaryBg, color: primary }}
                    >
                      {totalPctSum.toFixed(1)}%
                    </span>
                  )}
                </div>
                {costosOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {costosOpen && (
                <div className="px-4 pb-3 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                  {costFields.map((field) => (
                    <div key={field.key} className="flex items-center gap-3">
                      <span className="text-sm w-5 flex-shrink-0">{field.icon}</span>
                      <span className="text-xs text-gray-600 w-20 flex-shrink-0">{field.label}</span>
                      <div className="relative flex-shrink-0 w-24">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={field.value || ''}
                          placeholder="0"
                          onChange={(e) => field.setter(parseFloat(e.target.value) || 0)}
                          className="w-full pl-2 pr-6 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-2 transition-all"
                          style={{ '--tw-ring-color': primary } as React.CSSProperties}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                      </div>
                      <span className="text-xs text-gray-500 ml-auto tabular-nums">
                        {field.cost > 0 ? formatCurrency(field.cost) : '—'}
                      </span>
                    </div>
                  ))}

                  {totalPctSum > 0 && (
                    <div className="pt-2 mt-2 border-t border-dashed border-gray-200 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">Total costos</span>
                      <span className="text-sm font-bold" style={{ color: primary }}>
                        {formatCurrency(totalLandedCosts)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ═══ Columna 3: Resumen / Acciones ═══ */}
          <div className="w-72 flex-shrink-0 border-l border-gray-200 flex flex-col bg-gray-50/50">
            {/* Totales */}
            <div className="p-5 flex-1 flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Resumen de la Orden</h3>

              {supplierSeleccionado && (
                <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: primaryBg }}>
                  <p className="text-xs text-gray-500">Proveedor</p>
                  <p className="text-sm font-medium" style={{ color: primary }}>{supplierSeleccionado.name}</p>
                </div>
              )}

              {/* Fecha de entrega */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <label className="text-xs font-medium text-gray-500">Entrega Estimada</label>
                </div>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': primary } as React.CSSProperties}
                />
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Artículos</span>
                  <span className="font-medium text-gray-900">{carrito.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Unidades</span>
                  <span className="font-medium text-gray-900">{totalUnidades}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
                </div>

                {/* Landed cost breakdown */}
                {totalPctSum > 0 && (
                  <>
                    <div className="pt-2 border-t border-dashed border-gray-200" />
                    {costFields.filter(f => f.value > 0).map((field) => (
                      <div key={field.key} className="flex justify-between text-sm">
                        <span className="text-gray-500">{field.icon} {field.label} ({field.value}%)</span>
                        <span className="font-medium text-gray-700">{formatCurrency(field.cost)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-medium">Costos internación</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(totalLandedCosts)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-gray-900">Total Estimado</span>
                  <span className="text-2xl font-bold" style={{ color: primary }}>{formatCurrency(grandTotal)}</span>
                </div>
                {totalPctSum > 0 && (
                  <p className="text-[10px] text-gray-400 text-right mt-1">
                    Incluye {totalPctSum.toFixed(1)}% de costos de internación
                  </p>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
              <Button
                onClick={handleGuardar}
                disabled={!supplierId || carrito.length === 0 || submitting}
                className="w-full flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <DollarSign className="w-4 h-4" />
                )}
                {submitting ? 'Creando...' : 'Crear Orden de Compra'}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full transition-all duration-200 hover:scale-105 active:scale-95"
                disabled={submitting}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
