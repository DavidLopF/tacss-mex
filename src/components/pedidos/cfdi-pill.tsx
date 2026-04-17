'use client';

type CfdiStatus = 'no_facturado' | 'en_proceso' | 'facturado' | 'cancelado';

const CFDI_CONFIG: Record<CfdiStatus, { label: string; soft: string; ink: string; border: string }> = {
  no_facturado: { label: 'Sin facturar', soft: 'transparent', ink: '#6c6a74', border: '#d9d5cb' },
  en_proceso:   { label: 'En proceso',   soft: '#fbf2dc',     ink: '#6b4a07', border: '#ead9a4' },
  facturado:    { label: 'Facturado',    soft: '#e7f1e8',     ink: '#275a41', border: '#b5d7ba' },
  cancelado:    { label: 'CFDI cancelado', soft: '#f4e7e4',   ink: '#6a2f2f', border: '#dfb6af' },
};

export function CfdiPill({ value }: { value: CfdiStatus | string }) {
  const c = CFDI_CONFIG[value as CfdiStatus] ?? CFDI_CONFIG.no_facturado;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.02em',
        background: c.soft,
        color: c.ink,
        border: `1px solid ${c.border}`,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      {c.label}
    </span>
  );
}
