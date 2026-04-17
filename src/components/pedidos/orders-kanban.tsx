'use client';

import { Pedido, EstadoPedido } from '@/types';
import { OrderStatusCode } from '@/services/orders';
import { useCfdiStore } from '@/stores';
import { formatCurrency } from '@/lib/utils';
import { CfdiPill } from './cfdi-pill';
import { STATUS_CONFIG } from './status-pill';
import { Package } from 'lucide-react';

interface OrdersKanbanProps {
  pedidos: Pedido[];
  onOrderClick: (pedido: Pedido) => void;
  onOrderUpdate: (pedido: Pedido, nuevoEstado: EstadoPedido) => void;
  onStatusChange?: (orderId: string, newStatusCode: OrderStatusCode) => Promise<void>;
}

const STATUS_ORDER: EstadoPedido[] = ['cotizado', 'transmitido', 'en_curso', 'enviado', 'entregado', 'cancelado'];

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return formatCurrency(n);
};

const relTime = (date: Date) => {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  if (d === 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d}d`;
  return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

function KanbanCard({ pedido, onClick }: { pedido: Pedido; onClick: () => void }) {
  const cfdiStatus = useCfdiStore((s) => s.cfdiStatuses[pedido.id]);
  const invoiceStatus = cfdiStatus?.invoiceStatus ?? 'no_facturado';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'white', borderRadius: 10, border: '1px solid #e6e3db',
        padding: 12, cursor: 'pointer', transition: 'box-shadow 0.12s',
        boxShadow: '0 1px 0 rgba(17,16,26,0.04)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(17,16,26,0.06)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 0 rgba(17,16,26,0.04)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, color: '#6c6a74' }}>
          {pedido.numero}
        </span>
        <span style={{ fontSize: 10.5, color: '#a19ea8' }}>{relTime(pedido.createdAt)}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {pedido.clienteNombre}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5 }}>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{formatCurrency(pedido.total)}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#a19ea8' }}>
          <Package size={11} />{pedido.lineas.length}
        </span>
      </div>
      {invoiceStatus !== 'no_facturado' && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e6e3db' }}>
          <CfdiPill value={invoiceStatus} />
        </div>
      )}
    </div>
  );
}

export function OrdersKanban({ pedidos, onOrderClick }: OrdersKanbanProps) {
  const byStatus = (estado: EstadoPedido) => pedidos.filter(p => p.estado === estado);

  return (
    <div style={{ padding: '24px 32px', overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 16, minWidth: 'max-content', paddingBottom: 16 }}>
        {STATUS_ORDER.map(st => {
          const cfg = STATUS_CONFIG[st];
          const list = byStatus(st);
          const total = list.reduce((s, p) => s + p.total, 0);

          return (
            <div key={st} style={{ width: 280, flexShrink: 0 }}>
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, color: '#a19ea8', fontVariantNumeric: 'tabular-nums' }}>{list.length}</span>
                </div>
                <span style={{ fontSize: 11, color: '#a19ea8', fontVariantNumeric: 'tabular-nums' }}>{fmtShort(total)}</span>
              </div>
              <div style={{ height: 1, background: '#e6e3db', marginBottom: 10 }} />

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 180 }}>
                {list.map(p => (
                  <KanbanCard key={p.id} pedido={p} onClick={() => onOrderClick(p)} />
                ))}
                {list.length === 0 && (
                  <div style={{
                    textAlign: 'center', padding: '24px 16px', fontSize: 11.5, color: '#a19ea8',
                    border: '1px dashed #e6e3db', borderRadius: 8,
                  }}>
                    Vacío
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
