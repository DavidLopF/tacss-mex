'use client';

import { useState, useMemo } from 'react';
import { Pedido, EstadoPedido } from '@/types';
import { OrderStatusCode } from '@/services/orders';
import { useCfdiStore } from '@/stores';
import { formatCurrency } from '@/lib/utils';
import { StatusPill } from './status-pill';
import { CfdiPill } from './cfdi-pill';
import { ChangeStatusMenu } from './change-status-menu';
import { Eye, Send, ChevronLeft, ChevronRight, Inbox, MoreVertical } from 'lucide-react';

interface OrdersTableProps {
  pedidos: Pedido[];
  onOrderClick: (pedido: Pedido) => void;
  onOrderUpdate: (pedido: Pedido, nuevoEstado: EstadoPedido) => void;
  onStatusChange?: (orderId: string, newStatusCode: OrderStatusCode) => Promise<void>;
  onEmitirCFDI?: (pedido: Pedido) => void;
}

const ITEMS_PER_PAGE = 10;

function fmtShort(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return formatCurrency(n);
}

const daysSince = (date: Date) =>
  Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));

const getStatusCode = (estado: string): string => {
  const m: Record<string, string> = {
    cotizado: 'COTIZADO', transmitido: 'TRANSMITIDO',
    en_curso: 'EN_CURSO', enviado: 'ENVIADO',
    entregado: 'ENTREGADO', cancelado: 'CANCELADO',
  };
  return m[estado] ?? 'COTIZADO';
};

function CheckBox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(); }}
      style={{
        width: 14, height: 14, borderRadius: 3, flexShrink: 0,
        border: checked ? 'none' : '1.5px solid #a19ea8',
        background: checked ? 'var(--foreground)' : 'white',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', padding: 0,
      }}
    >
      {checked && (
        <svg width="9" height="9" viewBox="0 0 9 9">
          <path d="M1 4.5L3.5 7L8 1.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export function OrdersTable({ pedidos, onOrderClick, onStatusChange, onEmitirCFDI }: OrdersTableProps) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const cfdiStatuses = useCfdiStore((s) => s.cfdiStatuses);

  const totalPages = Math.max(1, Math.ceil(pedidos.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return pedidos.slice(start, start + ITEMS_PER_PAGE);
  }, [pedidos, safePage]);

  const toggleSel = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paginated.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map(p => p.id)));
    }
  };

  const totalMonto = pedidos.reduce((s, p) => s + p.total, 0);
  const allChecked = paginated.length > 0 && selected.size === paginated.length;

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          marginBottom: 12, padding: '8px 12px', background: '#f1ede3',
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12,
          fontSize: 12.5, border: '1px solid #e6e3db',
        }}>
          <span style={{ color: '#6c6a74', fontVariantNumeric: 'tabular-nums' }}>{selected.size} seleccionados</span>
          {onStatusChange && (
            <button
              onClick={() => setSelected(new Set())}
              style={{ fontSize: 12, color: '#6c6a74', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
            >
              Limpiar selección
            </button>
          )}
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #e6e3db', borderRadius: 12, overflow: 'hidden' }}>
        {pedidos.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', textAlign: 'center' }}>
            <Inbox size={40} style={{ color: '#e6e3db', marginBottom: 12 }} />
            <div style={{ fontSize: 22, fontWeight: 600, color: '#6c6a74', marginBottom: 4 }}>Nada por aquí</div>
            <div style={{ fontSize: 12.5, color: '#a19ea8' }}>Ajusta los filtros o crea un nuevo pedido.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#fbfaf5', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6c6a74' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, width: 32 }}>
                    <CheckBox checked={allChecked} onChange={toggleAll} />
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500 }}>Pedido</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500 }}>Cliente</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500 }}>Estado</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500 }}>CFDI</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500 }}>Partidas</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500 }}>Total</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500 }}>Creado</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500 }} />
                </tr>
              </thead>
              <tbody>
                {paginated.map((pedido) => {
                  const isSel = selected.has(pedido.id);
                  const cfdiInfo = cfdiStatuses[pedido.id];
                  const invoiceStatus = cfdiInfo?.invoiceStatus ?? 'no_facturado';
                  const canCFDI = pedido.estado === 'enviado' && invoiceStatus !== 'facturado';

                  return (
                    <tr
                      key={pedido.id}
                      onClick={() => onOrderClick(pedido)}
                      style={{
                        borderTop: '1px solid #e6e3db',
                        cursor: 'pointer',
                        background: isSel ? '#f1ede3' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#fbfaf5'; }}
                      onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                        <CheckBox checked={isSel} onChange={() => toggleSel(pedido.id)} />
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11.5, color: '#3a3840' }}>
                          {pedido.numero}
                        </span>
                      </td>
                      <td style={{ padding: '12px 12px', fontWeight: 500 }}>{pedido.clienteNombre}</td>
                      <td style={{ padding: '12px 12px' }}><StatusPill status={pedido.estado} /></td>
                      <td style={{ padding: '12px 12px' }}><CfdiPill value={invoiceStatus} /></td>
                      <td style={{ padding: '12px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#6c6a74' }}>
                        {pedido.lineas.length}
                      </td>
                      <td style={{ padding: '12px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                        {formatCurrency(pedido.total)}
                      </td>
                      <td style={{ padding: '12px 12px', color: '#6c6a74', fontVariantNumeric: 'tabular-nums' }}>
                        hace {daysSince(pedido.createdAt)}d
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          {canCFDI && onEmitirCFDI && (
                            <button
                              onClick={() => onEmitirCFDI(pedido)}
                              title="Emitir CFDI"
                              style={{
                                padding: '4px', borderRadius: 6, border: 'none', background: 'none',
                                color: '#275a41', cursor: 'pointer',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#e9f2ea')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                              <Send size={13} />
                            </button>
                          )}
                          {onStatusChange && (
                            <ChangeStatusMenu
                              currentStatusCode={getStatusCode(pedido.estado)}
                              onChangeStatus={(code) => onStatusChange(pedido.id, code)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {pedidos.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', borderTop: '1px solid #e6e3db', fontSize: 12, color: '#6c6a74',
          }}>
            <div>{pedidos.length} pedidos · {fmtShort(totalMonto)} total</div>
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  style={{
                    padding: '4px 8px', borderRadius: 6, border: '1px solid #e6e3db',
                    background: 'none', cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                    opacity: safePage === 1 ? 0.4 : 1, display: 'inline-flex',
                  }}
                >
                  <ChevronLeft size={13} />
                </button>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{safePage} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  style={{
                    padding: '4px 8px', borderRadius: 6, border: '1px solid #e6e3db',
                    background: 'none', cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: safePage === totalPages ? 0.4 : 1, display: 'inline-flex',
                  }}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
