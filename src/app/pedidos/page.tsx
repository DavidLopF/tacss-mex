'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import { Plus, Search } from 'lucide-react';
import { InboxView, OrdersTable, OrdersKanban, CreateOrderModal } from '@/components/pedidos';
import { Pedido, EstadoPedido } from '@/types';
import {
  getOrders,
  OrderStatus,
  changeOrderStatus,
  OrderStatusCode,
  ORDER_STATUS_LABELS,
  canTransitionToStatus,
  createOrder,
  updateOrder,
  CreateOrderDto,
  GetOrdersFiltersDto,
} from '@/services';
import { useToast, useCrossTabSync } from '@/lib/hooks';
import { ToastContainer } from '@/components/ui';
import { PermissionGuard } from '@/components/layout';
import { useOrdersStore, useCfdiStore } from '@/stores';
import { broadcastInvalidation } from '@/lib/cross-tab-sync';
import { formatCurrency } from '@/lib/utils';
import { getOrderClientSearchText } from '@/lib/order-clients';

// ── Mappers ────────────────────────────────────────────────────────────────
const mapEstadoBackendToFrontend = (statusCode: string): EstadoPedido => {
  const mapping: Record<string, EstadoPedido> = {
    COTIZADO:    'cotizado',
    TRANSMITIDO: 'transmitido',
    EN_CURSO:    'en_curso',
    ENVIADO:     'enviado',
    ENTREGADO:   'entregado',
    CANCELADO:   'cancelado',
  };
  return mapping[statusCode] ?? 'cotizado';
};

const mapEstadoFrontendToBackendCode = (estado: EstadoPedido): OrderStatusCode => {
  const mapping: Record<string, OrderStatusCode> = {
    cotizado:    OrderStatusCode.COTIZADO,
    transmitido: OrderStatusCode.TRANSMITIDO,
    en_curso:    OrderStatusCode.EN_CURSO,
    enviado:     OrderStatusCode.ENVIADO,
    cancelado:   OrderStatusCode.CANCELADO,
    pagado:      OrderStatusCode.ENVIADO,
    entregado:   OrderStatusCode.ENVIADO, // fallback
  };
  return mapping[estado] ?? OrderStatusCode.COTIZADO;
};

const mapOrdersToPedidos = (orderStatuses: OrderStatus[]): Pedido[] => {
  const pedidos: Pedido[] = [];
  orderStatuses.forEach(status => {
    status.orders.forEach(order => {
      pedidos.push({
        id: String(order.id),
        numero: order.code,
        clienteId: String(order.client.id),
        clienteNombre: order.client.name,
        clienteEmail: '',
        clienteTelefono: '',
        estado: mapEstadoBackendToFrontend(status.statusCode),
        lineas: order.items.map(item => ({
          id: String(item.id),
          productoId: String(item.variantId),
          variacionId: String(item.variantId),   // siempre el ID numérico — el SKU va en variacionNombre
          productoNombre: item.description,
          variacionNombre: item.variant.variantName,
          cantidad: item.qty,
          precioUnitario: parseFloat(item.unitPrice),
          subtotal: parseFloat(item.lineTotal),
        })),
        subtotal: parseFloat(order.subtotal ?? order.total),
        discountTotal: parseFloat(order.discountTotal ?? '0'),
        taxRate: parseFloat(order.taxRate ?? '0'),
        impuestos: parseFloat(order.taxAmount ?? '0'),
        total: parseFloat(order.total),
        notas: '',
        transmitido: status.statusCode !== 'COTIZADO',
        usuarioId: '1',
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.createdAt),
        clientShares: order.clientShares?.map(s => ({
          clientId: s.clientId,
          clientName: s.clientName,
          percentage: s.percentage,
        })),
      });
    });
  });
  return pedidos;
};

const getStatusCodeStr = (estado: string): string => {
  const m: Record<string, string> = {
    cotizado: 'COTIZADO', transmitido: 'TRANSMITIDO',
    en_curso: 'EN_CURSO', enviado: 'ENVIADO',
    entregado: 'ENTREGADO', cancelado: 'CANCELADO',
  };
  return m[estado] ?? 'COTIZADO';
};

// ── KPI strip ──────────────────────────────────────────────────────────────
function fmtShort(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return formatCurrency(n);
}

function KpiStrip({ pedidos }: { pedidos: Pedido[] }) {
  const cfdiStatuses = useCfdiStore((s) => s.cfdiStatuses);

  const pendFact = pedidos.filter(p => p.estado === 'enviado' && cfdiStatuses[p.id]?.invoiceStatus !== 'facturado');
  const enCurso  = pedidos.filter(p => ['transmitido', 'en_curso'].includes(p.estado));
  const cotizados = pedidos.filter(p => p.estado === 'cotizado');
  const ventasMes = pedidos.filter(p => ['enviado', 'entregado'].includes(p.estado)).reduce((s, p) => s + p.total, 0);

  const tiles = [
    { label: 'Por facturar', primary: pendFact.length,   secondary: fmtShort(pendFact.reduce((s, p) => s + p.total, 0)),  unit: 'pedidos', accent: true,  hint: 'Enviados sin CFDI' },
    { label: 'En curso',     primary: enCurso.length,    secondary: fmtShort(enCurso.reduce((s, p) => s + p.total, 0)),   unit: 'pedidos', accent: false, hint: 'Transmitidos + en picking' },
    { label: 'Cotizados',    primary: cotizados.length,  secondary: fmtShort(cotizados.reduce((s, p) => s + p.total, 0)), unit: 'pedidos', accent: false, hint: 'Pendientes de transmitir' },
    { label: 'Ventas mes',   primary: fmtShort(ventasMes), secondary: '', unit: '',       accent: false, hint: 'Enviados + entregados' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #e6e3db' }}>
      {tiles.map((t, i) => (
        <div key={i} style={{ padding: '16px 24px', borderLeft: i !== 0 ? '1px solid #e6e3db' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6c6a74' }}>{t.label}</div>
            {t.accent && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-color)', flexShrink: 0 }} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{t.primary}</div>
            {t.unit && <div style={{ fontSize: 11, color: '#a19ea8' }}>{t.unit}</div>}
          </div>
          <div style={{ marginTop: 6, fontSize: 11.5, color: '#6c6a74' }}>
            {t.secondary && <span>{t.secondary} · </span>}
            <span style={{ color: '#a19ea8' }}>{t.hint}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Filter chip ─────────────────────────────────────────────────────────
type FilterKey = 'todos' | 'cotizado' | 'transmitido' | 'en_curso' | 'enviado' | 'entregado' | 'por_facturar';

function FilterChips({
  filter,
  setFilter,
  counts,
}: {
  filter: FilterKey;
  setFilter: (k: FilterKey) => void;
  counts: Record<string, number>;
}) {
  const chips: { key: FilterKey; label: string; accent?: boolean }[] = [
    { key: 'todos',        label: 'Todos' },
    { key: 'cotizado',     label: 'Cotizado' },
    { key: 'transmitido',  label: 'Transmitido' },
    { key: 'en_curso',     label: 'En curso' },
    { key: 'enviado',      label: 'Enviado' },
    { key: 'entregado',    label: 'Entregado' },
    { key: 'por_facturar', label: 'Por facturar', accent: true },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {chips.map(c => {
        const active = filter === c.key;
        return (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 6, fontSize: 12.5, border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s',
              background: active ? 'var(--foreground)' : 'transparent',
              color: active ? 'white' : c.accent ? 'var(--primary-color)' : '#6c6a74',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#efece4'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
          >
            {c.accent && !active && (
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--primary-color)', flexShrink: 0 }} />
            )}
            {c.label}
            <span style={{ fontSize: 10.5, color: active ? 'rgba(255,255,255,0.65)' : '#a19ea8', fontVariantNumeric: 'tabular-nums' }}>
              {counts[c.key] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Pagination ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 25;

function PaginationControls({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (total === 0) return null;

  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to   = Math.min((page + 1) * PAGE_SIZE, total);
  const multiPage = totalPages > 1;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 32px', borderTop: '1px solid #e6e3db',
      background: '#fbfaf7', fontSize: 12.5, color: '#6c6a74',
    }}>
      <span>
        {multiPage ? (
          <>
            Mostrando{' '}
            <strong style={{ color: 'var(--foreground)' }}>{from}–{to}</strong> de{' '}
            <strong style={{ color: 'var(--foreground)' }}>{total}</strong> pedidos
          </>
        ) : (
          <>
            <strong style={{ color: 'var(--foreground)' }}>{total}</strong>{' '}
            {total === 1 ? 'pedido' : 'pedidos'} en esta vista
          </>
        )}
      </span>

      {/* Botones solo cuando hay más de una página */}
      {multiPage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={onPrev}
            disabled={page === 0}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12.5, border: '1px solid #e6e3db',
              background: page === 0 ? '#f3f4f6' : 'white', color: page === 0 ? '#d1d5db' : '#374151',
              cursor: page === 0 ? 'default' : 'pointer', fontFamily: 'inherit',
            }}
          >
            ← Anterior
          </button>
          <span style={{
            padding: '4px 12px', borderRadius: 6, border: '1px solid #e6e3db',
            background: 'white', fontVariantNumeric: 'tabular-nums',
          }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={onNext}
            disabled={page >= totalPages - 1}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12.5, border: '1px solid #e6e3db',
              background: page >= totalPages - 1 ? '#f3f4f6' : 'white',
              color: page >= totalPages - 1 ? '#d1d5db' : '#374151',
              cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontFamily: 'inherit',
            }}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function PedidosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { pedidos, loading } = useOrdersStore(useShallow((s) => ({ pedidos: s.pedidos, loading: s.loading })));
  const setPedidos        = useOrdersStore((s) => s.setPedidos);
  const setLoading        = useOrdersStore((s) => s.setLoading);
  const updatePedidoEstado = useOrdersStore((s) => s.updatePedidoEstado);
  const markAsBilled = useCfdiStore((s) => s.markAsBilled);
  const cfdiStatuses = useCfdiStore((s) => s.cfdiStatuses);

  const [view, setView]         = useState<'bandeja' | 'tabla' | 'kanban'>('bandeja');
  const [filter, setFilter]     = useState<FilterKey>('todos');
  const [search, setSearch]     = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Debounce search para no re-fetchear en cada tecla
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Pedido | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copyingOrder, setCopyingOrder] = useState<Pedido | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  const toast = useToast();

  const handleEmitirCFDI = useCallback((pedido: Pedido) => {
    const params = new URLSearchParams({
      saleId:   pedido.id,
      clientId: pedido.clienteId,
      saleCode: pedido.numero,
      items: JSON.stringify(
        pedido.lineas.map(l => ({
          description: [l.productoNombre, l.variacionNombre].filter(Boolean).join(' — '),
          quantity:    l.cantidad,
          unitPrice:   l.precioUnitario,
        }))
      ),
    });
    markAsBilled(pedido.id);
    router.push(`/facturacion?${params.toString()}`);
  }, [router, markAsBilled]);

  const loadOrders = useCallback(async (filters: GetOrdersFiltersDto = {}) => {
    try {
      setLoading(true);
      const orderStatuses = await getOrders(filters);
      setPedidos(mapOrdersToPedidos(orderStatuses));
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => { loadOrders(); }, [loadOrders]);
  useCrossTabSync('orders', loadOrders);

  // Debounce del campo de búsqueda → re-fetch server-side si el backend lo soporta
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // Cuando el search debounced cambia, re-fetch pasando el término al backend
  const isFirstSearchRender = useRef(true);
  useEffect(() => {
    if (isFirstSearchRender.current) { isFirstSearchRender.current = false; return; }
    loadOrders(debouncedSearch ? { search: debouncedSearch } : {});
  }, [debouncedSearch]);

  // Resetear página al cambiar filtro o búsqueda
  useEffect(() => { setCurrentPage(0); }, [filter, debouncedSearch]);

  // Auto-open from ?order=ID
  useEffect(() => {
    const orderId = searchParams.get('order');
    if (!orderId || loading || pedidos.length === 0) return;
    const pedido = pedidos.find(p => p.id === orderId);
    if (pedido) {
      setActiveId(pedido.id);
      setView('bandeja');
      router.replace('/pedidos', { scroll: false });
    }
  }, [pedidos, loading, searchParams, router]);

  // Counts
  const counts = useMemo(() => ({
    todos:        pedidos.length,
    cotizado:     pedidos.filter(p => p.estado === 'cotizado').length,
    transmitido:  pedidos.filter(p => p.estado === 'transmitido').length,
    en_curso:     pedidos.filter(p => p.estado === 'en_curso').length,
    enviado:      pedidos.filter(p => p.estado === 'enviado').length,
    entregado:    pedidos.filter(p => p.estado === 'entregado').length,
    por_facturar: pedidos.filter(p => p.estado === 'enviado' && cfdiStatuses[p.id]?.invoiceStatus !== 'facturado').length,
  }), [pedidos, cfdiStatuses]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = pedidos;
    if (filter === 'por_facturar') {
      list = list.filter(p => p.estado === 'enviado' && cfdiStatuses[p.id]?.invoiceStatus !== 'facturado');
    } else if (filter !== 'todos') {
      list = list.filter(p => p.estado === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.numero.toLowerCase().includes(q) || getOrderClientSearchText(p).includes(q));
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [pedidos, filter, search, cfdiStatuses]);

  // ── Paginación client-side ────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pagedFiltered = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filtered, currentPage],
  );

  // Auto-select first order when inbox opens (usa pagedFiltered para seleccionar el primero visible)
  useEffect(() => {
    if (view === 'bandeja' && !activeId && pagedFiltered.length > 0) {
      setActiveId(pagedFiltered[0].id);
    }
  }, [view, pagedFiltered, activeId]);

  // Status change handlers
  const handleNextStep = useCallback(async (pedido: Pedido) => {
    const nextMap: Record<string, EstadoPedido> = {
      cotizado: 'transmitido', transmitido: 'en_curso', en_curso: 'enviado',
    };
    const next = nextMap[pedido.estado];
    if (!next) return;
    try {
      const newCode = mapEstadoFrontendToBackendCode(next);
      const validation = canTransitionToStatus(getStatusCodeStr(pedido.estado), newCode);
      if (!validation.valid) { toast.error(validation.error ?? 'Transición no válida'); return; }
      updatePedidoEstado(pedido.id, next);
      await changeOrderStatus(parseInt(pedido.id), { newStatusCode: newCode, userId: 1 });
      toast.success(`Pedido movido a ${next}`);
      broadcastInvalidation(['orders', 'inventory']);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar estado');
      await loadOrders();
    }
  }, [updatePedidoEstado, loadOrders, toast]);

  const handleStatusChange = useCallback(async (orderId: string, newStatusCode: OrderStatusCode) => {
    try {
      const pedido = pedidos.find(p => p.id === orderId);
      if (!pedido) return;
      const nuevoEstado = mapEstadoBackendToFrontend(ORDER_STATUS_LABELS[newStatusCode]);
      updatePedidoEstado(orderId, nuevoEstado);
      await changeOrderStatus(parseInt(orderId), { newStatusCode, userId: 1 });
      toast.success('Estado del pedido actualizado');
      broadcastInvalidation(['orders', 'inventory']);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar estado');
      await loadOrders();
    }
  }, [pedidos, updatePedidoEstado, loadOrders, toast]);

  const handleCreateOrder = async (dto: CreateOrderDto) => {
    try {
      await createOrder(dto);
      toast.success('Pedido creado exitosamente');
      await loadOrders();
      broadcastInvalidation(['orders', 'inventory']);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear el pedido');
      throw err; // propaga el error al modal para que no se cierre
    }
  };

  const handleEditOrder = async (dto: CreateOrderDto) => {
    if (!editingOrder) return;
    try {
      await updateOrder(parseInt(editingOrder.id), dto);
      toast.success('Pedido actualizado');
      // El cierre del modal lo maneja el propio modal tras await onSave(dto)
      setEditingOrder(null);
      await loadOrders();
      broadcastInvalidation(['orders', 'inventory']);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar el pedido');
      throw err; // propaga el error al modal para que no se cierre
    }
  };

  const handleEdit = (pedido: Pedido) => {
    setEditingOrder(pedido);
    setIsEditModalOpen(true);
  };

  const handleCopy = useCallback((pedido: Pedido) => {
    setCopyingOrder(pedido);
    setIsCopyModalOpen(true);
  }, []);

  return (
    <PermissionGuard moduleCode="PEDIDOS">
      <div style={{ minHeight: '100vh' }}>
        {/* Page header */}
        <header style={{ padding: '28px 32px 20px', borderBottom: '1px solid #e6e3db' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6c6a74', marginBottom: 8 }}>
                <span>Operaciones</span>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', opacity: 0.4 }} />
                <span>Pedidos</span>
              </div>
              <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1, margin: 0 }}>Pedidos</h1>
              {!loading && (
                <p style={{ fontSize: 13.5, color: '#6c6a74', marginTop: 6 }}>
                  Pipeline de ventas y logística.{' '}
                  <em>{pedidos.length} pedidos activos</em>
                </p>
              )}
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'var(--primary-color)', color: 'white',
                border: 'none', borderRadius: 8, padding: '8px 16px',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'opacity 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <Plus size={15} />
              Nuevo pedido
            </button>
          </div>
        </header>

        {/* KPIs */}
        {!loading && <KpiStrip pedidos={pedidos} />}

        {/* Filter bar */}
        <div style={{
          padding: '10px 32px', borderBottom: '1px solid #e6e3db',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          background: '#fbfaf7',
        }}>
          <FilterChips filter={filter} setFilter={(k) => { setFilter(k); setActiveId(null); }} counts={counts} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a19ea8' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar pedido o cliente…"
                style={{
                  width: 260, paddingLeft: 30, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
                  fontSize: 12.5, borderRadius: 8, border: '1px solid #e6e3db', background: 'white',
                  outline: 'none', fontFamily: 'inherit', color: 'var(--foreground)',
                }}
              />
            </div>

            {/* View toggle */}
            <div style={{ display: 'flex', border: '1px solid #e6e3db', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
              {(['bandeja', 'tabla', 'kanban'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '6px 12px', fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    background: view === v ? 'var(--foreground)' : 'transparent',
                    color: view === v ? 'white' : '#6c6a74',
                    transition: 'all 0.1s',
                    textTransform: 'capitalize',
                  }}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '2px solid #e6e3db', borderTopColor: 'var(--primary-color)',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
              }} />
              <p style={{ fontSize: 12.5, color: '#6c6a74' }}>Cargando pedidos…</p>
            </div>
          </div>
        )}

        {/* Views — reciben pagedFiltered (slice de PAGE_SIZE) */}
        {!loading && view === 'bandeja' && (
          <InboxView
            pedidos={pagedFiltered}
            activeId={activeId}
            onSelect={setActiveId}
            onNextStep={handleNextStep}
            onEdit={handleEdit}
            onEmitirCFDI={handleEmitirCFDI}
            onCopy={handleCopy}
          />
        )}
        {!loading && view === 'tabla' && (
          <OrdersTable
            pedidos={pagedFiltered}
            onOrderClick={(p) => { setActiveId(p.id); setView('bandeja'); }}
            onOrderUpdate={async (p, e) => { /* handled via status change menu */ }}
            onStatusChange={handleStatusChange}
            onEmitirCFDI={handleEmitirCFDI}
          />
        )}
        {!loading && view === 'kanban' && (
          <OrdersKanban
            pedidos={pagedFiltered}
            onOrderClick={(p) => { setActiveId(p.id); setView('bandeja'); }}
            onOrderUpdate={async (p, e) => {}}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* Controles de paginación — visibles debajo de cualquier vista */}
        {!loading && (
          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            total={filtered.length}
            onPrev={() => { setCurrentPage(p => Math.max(0, p - 1)); setActiveId(null); }}
            onNext={() => { setCurrentPage(p => Math.min(totalPages - 1, p + 1)); setActiveId(null); }}
          />
        )}

        {/* Modals */}
        <CreateOrderModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateOrder}
        />
        <CreateOrderModal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setEditingOrder(null); }}
          onSave={handleEditOrder}
          editPedido={editingOrder ?? undefined}
        />
        {/* Copiar pedido: pre-rellena datos pero siempre crea uno nuevo */}
        <CreateOrderModal
          isOpen={isCopyModalOpen}
          onClose={() => { setIsCopyModalOpen(false); setCopyingOrder(null); }}
          onSave={handleCreateOrder}
          copyFromPedido={copyingOrder ?? undefined}
        />
        <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PermissionGuard>
  );
}
