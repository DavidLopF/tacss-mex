'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
} from '@/services';
import { useToast, useCrossTabSync } from '@/lib/hooks';
import { PermissionGuard } from '@/components/layout';
import { useOrdersStore, useCfdiStore } from '@/stores';
import { broadcastInvalidation } from '@/lib/cross-tab-sync';
import { formatCurrency } from '@/lib/utils';

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
          variacionId: item.variant.sku ?? String(item.variantId),
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

  const [view, setView]       = useState<'bandeja' | 'tabla' | 'kanban'>('bandeja');
  const [filter, setFilter]   = useState<FilterKey>('todos');
  const [search, setSearch]   = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Pedido | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const orderStatuses = await getOrders();
      setPedidos(mapOrdersToPedidos(orderStatuses));
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useCrossTabSync('orders', loadOrders);

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
      list = list.filter(p => p.numero.toLowerCase().includes(q) || p.clienteNombre.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [pedidos, filter, search, cfdiStatuses]);

  // Auto-select first order when inbox opens
  useEffect(() => {
    if (view === 'bandeja' && !activeId && filtered.length > 0) {
      setActiveId(filtered[0].id);
    }
  }, [view, filtered, activeId]);

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
    }
  };

  const handleEditOrder = async (dto: CreateOrderDto) => {
    if (!editingOrder) return;
    try {
      await updateOrder(parseInt(editingOrder.id), dto);
      toast.success('Pedido actualizado');
      setIsEditModalOpen(false);
      setEditingOrder(null);
      await loadOrders();
      broadcastInvalidation(['orders', 'inventory']);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar el pedido');
    }
  };

  const handleEdit = (pedido: Pedido) => {
    setEditingOrder(pedido);
    setIsEditModalOpen(true);
  };

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

        {/* Views */}
        {!loading && view === 'bandeja' && (
          <InboxView
            pedidos={filtered}
            activeId={activeId}
            onSelect={setActiveId}
            onNextStep={handleNextStep}
            onEdit={handleEdit}
            onEmitirCFDI={handleEmitirCFDI}
          />
        )}
        {!loading && view === 'tabla' && (
          <OrdersTable
            pedidos={filtered}
            onOrderClick={(p) => { setActiveId(p.id); setView('bandeja'); }}
            onOrderUpdate={async (p, e) => { /* handled via status change menu */ }}
            onStatusChange={handleStatusChange}
            onEmitirCFDI={handleEmitirCFDI}
          />
        )}
        {!loading && view === 'kanban' && (
          <OrdersKanban
            pedidos={filtered}
            onOrderClick={(p) => { setActiveId(p.id); setView('bandeja'); }}
            onOrderUpdate={async (p, e) => {}}
            onStatusChange={handleStatusChange}
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
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PermissionGuard>
  );
}
