'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '@/src/components/ui';
import { 
  Search, 
  Plus, 
  Minus,
  Trash2, 
  ShoppingCart, 
  DollarSign,
  History,
  Package,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  X,
  User,
} from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';
import { useDebounce } from '@/src/lib/hooks';
import { useCompany } from '@/src/lib/company-context';
import { 
  getOrderProducts, 
  OrderProductItem, 
  CreateOrderDto,
} from '@/src/services/orders';
import { 
  getAllClients, 
  getClientPriceHistory, 
  ClientListItem, 
  PriceHistoryItem,
} from '@/src/services/clients';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dto: CreateOrderDto) => void;
}

interface LineaCarrito {
  id: string;
  producto: OrderProductItem;
  cantidad: number;
  precioUnitario: number;
  precioLista: number;
  subtotal: number;
  usandoPrecioHistorico: boolean;
}

let carritoCounter = 0;

const PRODUCTS_PER_PAGE = 8;

export function CreateOrderModal({ isOpen, onClose, onSave }: CreateOrderModalProps) {
  // ── Tema ──────────────────────────────────────────────────────────
  const { settings } = useCompany();
  const primary = settings.primaryColor;          // e.g. "#2563eb"
  // Generate a light tint (10% opacity) for backgrounds
  const primaryBg = primary + '18';               // hex alpha ~10%
  const primaryBgMid = primary + '30';            // hex alpha ~19%

  // ── Estado principal ──────────────────────────────────────────────
  const [clienteId, setClienteId] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [notas, setNotas] = useState('');

  // ── Clientes ──────────────────────────────────────────────────────
  const [clientes, setClientes] = useState<ClientListItem[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  // ── Productos (paginados desde API) ───────────────────────────────
  const [productos, setProductos] = useState<OrderProductItem[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // ── Historial de precios ──────────────────────────────────────────
  const [expandedHistorial, setExpandedHistorial] = useState<number | null>(null);
  const [historialPrecios, setHistorialPrecios] = useState<PriceHistoryItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const historialOrdenado = [...historialPrecios].sort(
    (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
  );
  const precioHistoricoPromedio = historialOrdenado.length
    ? historialOrdenado.reduce((sum, item) => sum + item.unitPrice, 0) / historialOrdenado.length
    : null;

  const debouncedSearch = useDebounce(searchTerm, 400);

  const clienteSeleccionado = clientes.find(c => c.id === clienteId);

  // ── Bloquear scroll del body y manejar Escape ─────────────────────
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

  // ── Cargar clientes cuando se abre el modal ───────────────────────
  useEffect(() => {
    if (isOpen) {
      loadClientes();
    }
  }, [isOpen]);

  const loadClientes = async () => {
    setLoadingClientes(true);
    try {
      const data = await getAllClients();
      setClientes(data);
    } catch {
      console.error('Error al cargar clientes');
    } finally {
      setLoadingClientes(false);
    }
  };

  // ── Cargar productos con búsqueda y paginación ────────────────────
  const loadProductos = useCallback(async (page: number, search: string) => {
    setLoadingProductos(true);
    try {
      const response = await getOrderProducts({
        page,
        limit: PRODUCTS_PER_PAGE,
        search: search || undefined,
        stockStatus: search ? 'all' : 'in-stock',
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

  // Recargar productos cuando cambia la búsqueda (debounced)
  useEffect(() => {
    if (isOpen && clienteId) {
      setCurrentPage(1);
      loadProductos(1, debouncedSearch);
    }
  }, [debouncedSearch, isOpen, clienteId, loadProductos]);

  // ── Cargar historial de precios para un producto ──────────────────
  const toggleHistorial = async (variantId: number) => {
    if (expandedHistorial === variantId) {
      setExpandedHistorial(null);
      setHistorialPrecios([]);
      return;
    }

    if (!clienteId) return;

    setExpandedHistorial(variantId);
    setLoadingHistorial(true);
    try {
      const data = await getClientPriceHistory(clienteId, variantId);
      setHistorialPrecios(data);
    } catch {
      setHistorialPrecios([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  // ── Paginación ────────────────────────────────────────────────────
  const handlePrevPage = () => {
    if (currentPage > 1) {
      loadProductos(currentPage - 1, debouncedSearch);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      loadProductos(currentPage + 1, debouncedSearch);
    }
  };

  // ── Agregar producto al carrito ───────────────────────────────────
  // Si el producto ya existe en el carrito (misma variante, mismo precio),
  // incrementa la cantidad en lugar de crear una línea duplicada.
  const agregarAlCarrito = (producto: OrderProductItem, precioPersonalizado?: number) => {
    const precioBase = producto.price;
    const precioFinal = precioPersonalizado ?? precioBase;

    setCarrito(prev => {
      // Buscar línea existente: mismo producto id Y mismo precio
      const idx = prev.findIndex(
        (l) => l.producto.id === producto.id && l.precioUnitario === precioFinal
      );

      if (idx !== -1) {
        // Incrementar cantidad de la línea existente
        return prev.map((linea, i) =>
          i === idx
            ? {
                ...linea,
                cantidad: linea.cantidad + 1,
                subtotal: linea.precioUnitario * (linea.cantidad + 1),
              }
            : linea
        );
      }

      // Línea nueva (precio distinto o primera vez)
      carritoCounter++;
      const nuevaLinea: LineaCarrito = {
        id: `${producto.id}-${carritoCounter}`,
        producto,
        cantidad: 1,
        precioUnitario: precioFinal,
        precioLista: precioBase,
        subtotal: precioFinal,
        usandoPrecioHistorico: precioPersonalizado !== undefined,
      };
      return [...prev, nuevaLinea];
    });

    setExpandedHistorial(null);
  };

  // ── Actualizar cantidad ───────────────────────────────────────────
  const actualizarCantidad = (lineaId: string, cantidad: number) => {
    if (!Number.isFinite(cantidad) || cantidad < 1) return;
    setCarrito(prev =>
      prev.map(linea =>
        linea.id === lineaId
          ? { ...linea, cantidad, subtotal: linea.precioUnitario * cantidad }
          : linea
      )
    );
  };

  // ── Actualizar precio unitario ────────────────────────────────────
  const actualizarPrecio = (lineaId: string, precio: number) => {
    if (!Number.isFinite(precio) || precio < 0) return;
    setCarrito(prev =>
      prev.map(linea =>
        linea.id === lineaId
          ? {
              ...linea,
              precioUnitario: precio,
              subtotal: precio * linea.cantidad,
              usandoPrecioHistorico: false,
            }
          : linea
      )
    );
  };

  // ── Eliminar del carrito ────────────────────────────────────────────
  const eliminarDelCarrito = (lineaId: string) => {
    setCarrito(prev => prev.filter(linea => linea.id !== lineaId));
  };

  // ── Calcular totales ──────────────────────────────────────────────
  const subtotal = carrito.reduce((sum, linea) => sum + linea.subtotal, 0);
  const total = subtotal;

  // ── Guardar pedido ────────────────────────────────────────────────
  const handleGuardar = () => {
    if (!clienteId || carrito.length === 0) return;

    const dto: CreateOrderDto = {
      clientId: clienteId as number,
      items: carrito.map(linea => ({
        variantId: linea.producto.id,
        qty: linea.cantidad,
        unitPrice: linea.precioUnitario,
        listPrice: linea.precioLista,
        description: linea.producto.variantName
          ? `${linea.producto.name} - ${linea.producto.variantName}`
          : linea.producto.name,
      })),
      currency: 'MXN',
    };

    onSave(dto);
    handleClose();
  };

  const handleClose = () => {
    setClienteId('');
    setSearchTerm('');
    setCarrito([]);
    setNotas('');
    setExpandedHistorial(null);
    setHistorialPrecios([]);
    setProductos([]);
    setCurrentPage(1);
    onClose();
  };

  const handleDescargarPDF = () => {
    console.log('Descargar PDF', { cliente: clienteSeleccionado, carrito, total });
    alert('Funcionalidad de PDF en desarrollo');
  };

  const handleDescargarExcel = () => {
    console.log('Descargar Excel', { cliente: clienteSeleccionado, carrito, total });
    alert('Funcionalidad de Excel en desarrollo');
  };

  // ── Badge de stock ────────────────────────────────────────────────
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
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Crear Nuevo Pedido</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* ── Body: 3 columnas ───────────────────────────────────── */}
        <div className="flex-1 flex min-h-0">

          {/* ═══ Columna 1: Cliente + Búsqueda ═══ */}
          <div className="w-[25rem] flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/50">
            {/* Cliente */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Cliente</h3>
              </div>
              {loadingClientes ? (
                <div className="flex items-center gap-2 py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: primary }} />
                  <span className="text-sm text-gray-500">Cargando...</span>
                </div>
              ) : (
                <select
                  value={clienteId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setClienteId(val ? Number(val) : '');
                    setCarrito([]);
                    setExpandedHistorial(null);
                    setHistorialPrecios([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white transition-all duration-200"
                  style={{ '--tw-ring-color': primary } as React.CSSProperties}
                >
                  <option value="">Seleccione un cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              {clienteSeleccionado && (
                <div className="mt-2 px-3 py-2 rounded-lg animate-in slide-in-from-top-2 fade-in duration-200" style={{ backgroundColor: primaryBg }}>
                  <p className="text-sm font-medium" style={{ color: primary }}>{clienteSeleccionado.name}</p>
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
                  disabled={!clienteId}
                />
              </div>
            </div>

            {/* Lista de Productos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {!clienteId ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  Selecciona un cliente
                </div>
              ) : loadingProductos ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: primary }} />
                  <p className="text-xs text-gray-500 mt-2">Cargando...</p>
                </div>
              ) : productos.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  Sin resultados
                </div>
              ) : (
                productos.map((producto) => (
                  <div
                    key={producto.id}
                    className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    style={{ ['--hover-border' as string]: primary }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = primary)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1.5">
                          <p className="text-sm font-semibold leading-snug text-gray-900 break-words">{producto.name}</p>
                          {getStockBadge(producto.stockStatus)}
                        </div>
                        {producto.variantName && (
                          <p className="text-xs font-medium break-words" style={{ color: primary }}>{producto.variantName}</p>
                        )}
                        <p className="text-xs text-gray-400 break-words leading-snug">
                          {producto.sku}{producto.category ? ` • ${producto.category}` : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(producto.price)}</span>
                          <span className="text-xs text-gray-400">Stock: {producto.stock}</span>
                        </div>
                        {/* Almacenes inline */}
                        {producto.warehouses && producto.warehouses.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {producto.warehouses.map((wh, idx) => (
                              <span key={idx} className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">
                                <Warehouse className="w-2.5 h-2.5" />
                                {wh.warehouseName}: {wh.qtyOnHand}
                                {wh.qtyReserved > 0 && (
                                  <span className="text-orange-500">({wh.qtyReserved} res.)</span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => agregarAlCarrito(producto)}
                        disabled={producto.stock <= 0}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 active:scale-95"
                        style={{ backgroundColor: primary }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Historial toggle */}
                    {clienteId && (
                      <div className="mt-1.5">
                        <button
                          onClick={() => toggleHistorial(producto.id)}
                          className="text-xs hover:opacity-75 flex items-center gap-1 transition-colors duration-200"
                          style={{ color: primary }}
                        >
                          <History className="w-3 h-3" />
                          {expandedHistorial === producto.id ? 'Ocultar historial' : 'Ver historial'}
                        </button>
                        {expandedHistorial === producto.id && (
                          <div className="mt-2 rounded-xl border border-gray-200/80 bg-white p-2.5 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                            {loadingHistorial ? (
                              <p className="text-xs" style={{ color: primary }}>Cargando...</p>
                            ) : historialPrecios.length === 0 ? (
                              <p className="text-xs text-gray-500">Sin historial para este cliente y producto.</p>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: primaryBg }}>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Ultimo precio</p>
                                    <p className="text-xs font-semibold" style={{ color: primary }}>
                                      {formatCurrency(historialOrdenado[0].unitPrice)}
                                    </p>
                                  </div>
                                  <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: primaryBg }}>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Promedio</p>
                                    <p className="text-xs font-semibold" style={{ color: primary }}>
                                      {precioHistoricoPromedio != null ? formatCurrency(precioHistoricoPromedio) : 'N/A'}
                                    </p>
                                  </div>
                                </div>

                                {historialOrdenado.slice(0, 4).map((h) => (
                                <button
                                  key={h.orderId}
                                  onClick={() => agregarAlCarrito(producto, h.unitPrice)}
                                  className="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-white p-2 text-xs transition-all duration-200 hover:scale-[1.01]"
                                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = primaryBgMid)}
                                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                                >
                                  <div className="text-left">
                                    <span className="text-gray-600">{new Date(h.orderDate).toLocaleDateString('es-MX')}</span>
                                    <span className="ml-1 text-gray-400">• {h.orderCode}</span>
                                    <p className="text-[10px] text-gray-400">{h.quantity} uds • {h.orderStatus}</p>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-semibold" style={{ color: primary }}>{formatCurrency(h.unitPrice)}</span>
                                    <p className="text-[10px] text-gray-400">Aplicar precio</p>
                                  </div>
                                </button>
                                ))}

                                <button
                                  onClick={() => agregarAlCarrito(producto, historialOrdenado[0].unitPrice)}
                                  className="w-full rounded-lg px-2 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                                  style={{ backgroundColor: primary }}
                                >
                                  Usar ultimo precio para este producto
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Paginación */}
            {clienteId && totalProducts > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between flex-shrink-0 bg-white">
                <span className="text-xs text-gray-500">
                  {totalProducts} resultado{totalProducts !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1}
                    className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-gray-600">{currentPage}/{totalPages}</span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages}
                    className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ═══ Columna 2: Carrito ═══ */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header Carrito */}
            <div className="px-6 py-3 border-b border-gray-200 flex-shrink-0" style={{ background: `linear-gradient(to right, ${primaryBg}, ${primaryBgMid})` }}>
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" style={{ color: primary }} />
                <h3 className="text-sm font-semibold text-gray-900">
                  Carrito ({carrito.length} {carrito.length === 1 ? 'item' : 'items'})
                </h3>
                {carrito.length > 0 && (
                  <span className="text-xs text-gray-500">
                    • {carrito.reduce((s, l) => s + l.cantidad, 0)} unidades
                  </span>
                )}
              </div>
            </div>

            {/* Items del Carrito */}
            <div className="flex-1 overflow-y-auto p-4">
              {carrito.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingCart className="w-12 h-12 text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">El carrito está vacío</p>
                  <p className="text-xs text-gray-300 mt-1">Agrega productos desde el panel izquierdo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {carrito.map((linea) => (
                    <Card key={linea.id} className="animate-in slide-in-from-right-4 fade-in rounded-2xl border border-gray-200/80 p-3 duration-300 transition-shadow hover:shadow-md">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-snug text-gray-900 break-words">{linea.producto.name}</p>
                              {linea.producto.variantName && (
                                <p className="text-xs break-words" style={{ color: primary }}>{linea.producto.variantName}</p>
                              )}
                              <p className="text-[11px] text-gray-400">{linea.producto.sku}</p>
                              {linea.usandoPrecioHistorico && (
                                <span className="mt-0.5 inline-flex items-center gap-1 text-[10px]" style={{ color: primary }}>
                                  <History className="w-2.5 h-2.5" />Precio histórico
                                </span>
                              )}
                            </div>
                            <button onClick={() => eliminarDelCarrito(linea.id)} className="text-red-400 hover:text-red-600 p-0.5 transition-all duration-200 hover:scale-110 active:scale-95">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div>
                              <label className="text-[10px] text-gray-500 block">Cant.</label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => actualizarCantidad(linea.id, linea.cantidad - 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100"
                                  disabled={linea.cantidad <= 1}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={linea.cantidad}
                                  onChange={(e) => {
                                    const value = Number(e.target.value);
                                    if (Number.isNaN(value)) return;
                                    actualizarCantidad(linea.id, value);
                                  }}
                                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 transition-all text-center"
                                  style={{ '--tw-ring-color': primary } as React.CSSProperties}
                                />
                                <button
                                  type="button"
                                  onClick={() => actualizarCantidad(linea.id, linea.cantidad + 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 block">P. Unit.</label>
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={linea.precioUnitario}
                                  onChange={(e) => {
                                    const value = Number(e.target.value);
                                    if (Number.isNaN(value)) return;
                                    actualizarPrecio(linea.id, value);
                                  }}
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
                              <p className="text-[10px] text-gray-400">Lista: {formatCurrency(linea.precioLista)}</p>
                            </div>
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
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas del pedido (opcional)..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': primary } as React.CSSProperties}
                rows={2}
              />
            </div>
          </div>

          {/* ═══ Columna 3: Resumen / Acciones ═══ */}
          <div className="w-72 flex-shrink-0 border-l border-gray-200 flex flex-col bg-gray-50/50">
            {/* Totales */}
            <div className="p-5 flex-1 flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Resumen del Pedido</h3>

              {clienteSeleccionado && (
                <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: primaryBg }}>
                  <p className="text-xs text-gray-500">Cliente</p>
                  <p className="text-sm font-medium" style={{ color: primary }}>{clienteSeleccionado.name}</p>
                </div>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Productos</span>
                  <span className="font-medium text-gray-900">{carrito.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Unidades</span>
                  <span className="font-medium text-gray-900">{carrito.reduce((s, l) => s + l.cantidad, 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold" style={{ color: primary }}>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDescargarPDF}
                  disabled={!clienteId || carrito.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <FileText className="w-3.5 h-3.5" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDescargarExcel}
                  disabled={!clienteId || carrito.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel
                </Button>
              </div>
              <Button
                onClick={handleGuardar}
                disabled={!clienteId || carrito.length === 0}
                className="w-full flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <DollarSign className="w-4 h-4" />
                Crear Cotización
              </Button>
              <Button variant="outline" onClick={handleClose} className="w-full transition-all duration-200 hover:scale-105 active:scale-95">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
