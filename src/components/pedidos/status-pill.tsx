'use client';

import { EstadoPedido } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; dot: string; soft: string; ink: string }> = {
  cotizado:    { label: 'Cotizado',    dot: '#8a8693', soft: '#eeece4', ink: '#3a3840' },
  transmitido: { label: 'Transmitido', dot: '#6e6ab2', soft: '#ecebf6', ink: '#4a478f' },
  en_curso:    { label: 'En curso',    dot: '#c97a3a', soft: '#f7eee1', ink: '#7d4518' },
  enviado:     { label: 'Enviado',     dot: '#3d8f6a', soft: '#e9f2ea', ink: '#275a41' },
  entregado:   { label: 'Entregado',   dot: '#2f6b4f', soft: '#dfeee2', ink: '#1f4d36' },
  cancelado:   { label: 'Cancelado',   dot: '#a45454', soft: '#f4e7e4', ink: '#6a2f2f' },
  pagado:      { label: 'Pagado',      dot: '#2f6b4f', soft: '#dfeee2', ink: '#1f4d36' },
};

export function StatusPill({ status }: { status: EstadoPedido }) {
  const s = STATUS_CONFIG[status] ?? STATUS_CONFIG.cotizado;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.02em',
        background: s.soft,
        color: s.ink,
        border: `1px solid ${s.soft}`,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

export { STATUS_CONFIG };
