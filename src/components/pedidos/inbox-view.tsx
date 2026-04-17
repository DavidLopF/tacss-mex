'use client';

import { Pedido } from '@/types';
import { useCfdiStore } from '@/stores';
import { formatCurrency } from '@/lib/utils';
import { StatusPill } from './status-pill';
import { CfdiPill } from './cfdi-pill';
import { OrderDetailPanel } from './order-detail-panel';
import { Package } from 'lucide-react';

interface InboxViewProps {
  pedidos: Pedido[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNextStep: (pedido: Pedido) => void;
  onEdit?: (pedido: Pedido) => void;
  onEmitirCFDI?: (pedido: Pedido) => void;
}

const daysSince = (date: Date) => Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));

const relTime = (date: Date) => {
  const d = daysSince(date);
  if (d === 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d}d`;
  if (d < 30) return `hace ${Math.floor(d / 7)}sem`;
  return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

function InboxRow({
  pedido,
  active,
  onClick,
}: {
  pedido: Pedido;
  active: boolean;
  onClick: () => void;
}) {
  const cfdiStatus = useCfdiStore((s) => s.cfdiStatuses[pedido.id]);
  const invoiceStatus = cfdiStatus?.invoiceStatus ?? 'no_facturado';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e6e3db',
        cursor: 'pointer',
        transition: 'background 0.1s',
        background: active ? '#f1ede3' : 'transparent',
        boxShadow: active ? 'inset 3px 0 0 var(--primary-color)' : 'none',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#fbfaf5'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11.5, color: '#3a3840' }}>
              {pedido.numero}
            </span>
            <span style={{ fontSize: 11, color: '#a19ea8', flexShrink: 0 }}>{relTime(pedido.createdAt)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pedido.clienteNombre}
            </div>
            <div style={{ fontSize: 13.5, fontVariantNumeric: 'tabular-nums', fontWeight: 500, flexShrink: 0 }}>
              {formatCurrency(pedido.total)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StatusPill status={pedido.estado} />
              {invoiceStatus !== 'no_facturado' && <CfdiPill value={invoiceStatus} />}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#a19ea8' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Package size={11} />{pedido.lineas.length}
              </span>
            </div>
          </div>
          {pedido.notas && (
            <div style={{ marginTop: 6, fontSize: 11.5, color: '#6c6a74', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
              › {pedido.notas}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function InboxView({ pedidos, activeId, onSelect, onNextStep, onEdit, onEmitirCFDI }: InboxViewProps) {
  const activePedido = pedidos.find(p => p.id === activeId) ?? pedidos[0] ?? null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', minHeight: 'calc(100vh - 260px)' }}>
      {/* List panel */}
      <div style={{ borderRight: '1px solid #e6e3db', background: '#fbfaf7' }}>
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid #e6e3db',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6c6a74',
        }}>
          <span>{pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''}</span>
          <span>Más recientes</span>
        </div>
        <div style={{ maxHeight: 'calc(100vh - 310px)', overflowY: 'auto' }}>
          {pedidos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 24px' }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#6c6a74', marginBottom: 4 }}>Nada por aquí</div>
              <div style={{ fontSize: 12.5, color: '#a19ea8' }}>Ajusta los filtros o crea un nuevo pedido.</div>
            </div>
          ) : (
            pedidos.map(p => (
              <InboxRow
                key={p.id}
                pedido={p}
                active={p.id === activePedido?.id}
                onClick={() => onSelect(p.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div style={{ background: 'var(--background)', overflow: 'hidden' }}>
        {activePedido ? (
          <OrderDetailPanel
            pedido={activePedido}
            onNextStep={onNextStep}
            onEdit={onEdit}
            onEmitirCFDI={onEmitirCFDI}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a19ea8', fontSize: 13 }}>
            Selecciona un pedido para ver el detalle
          </div>
        )}
      </div>
    </div>
  );
}
