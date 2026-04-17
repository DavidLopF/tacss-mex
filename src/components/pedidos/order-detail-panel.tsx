'use client';

import { useState } from 'react';
import { Pedido } from '@/types';
import { useCfdiStore } from '@/stores';
import { formatCurrency } from '@/lib/utils';
import { StatusPill } from './status-pill';
import { CfdiPill } from './cfdi-pill';
import { Printer, Copy, Mail, ArrowRight, Download, Calendar } from 'lucide-react';

interface OrderDetailPanelProps {
  pedido: Pedido;
  onNextStep: (pedido: Pedido) => void;
  onEdit?: (pedido: Pedido) => void;
  onEmitirCFDI?: (pedido: Pedido) => void;
}

const daysSince = (date: Date) => {
  const diff = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
};

const fmtTime = (date: Date) => {
  return new Date(date).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

const relTime = (date: Date) => {
  const d = daysSince(date);
  if (d === 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d}d`;
  if (d < 30) return `hace ${Math.floor(d / 7)}sem`;
  return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-selected={active}
      style={{
        position: 'relative',
        padding: '12px 0',
        fontSize: 12.5,
        color: active ? 'var(--foreground)' : '#6c6a74',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
      {active && (
        <span style={{
          position: 'absolute', left: 0, right: 0, bottom: -1,
          height: 2, background: 'var(--foreground)', borderRadius: 2,
        }} />
      )}
    </button>
  );
}

function TbBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
        color: '#3a3840', border: '1px solid transparent',
        background: 'none', cursor: 'pointer', fontFamily: 'inherit',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#efece4')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {children}
    </button>
  );
}

function LineasTab({ pedido }: { pedido: Pedido }) {
  const subtotal = pedido.subtotal;
  const iva = pedido.impuestos;
  const total = pedido.total;

  return (
    <div style={{ maxWidth: '100%' }}>
      <div style={{
        background: 'white', border: '1px solid #e6e3db',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fbfaf5', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6c6a74' }}>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 500 }}>SKU</th>
              <th style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 500 }}>Descripción</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 500 }}>Cant.</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 500 }}>P. unit.</th>
              <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 500 }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {pedido.lineas.map((item) => (
              <tr key={item.id} style={{ borderTop: '1px solid #e6e3db' }}>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono, monospace)', fontSize: 11.5, color: '#6c6a74' }}>
                  {item.variacionId}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {[item.productoNombre, item.variacionNombre].filter(Boolean).join(' — ')}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{item.cantidad}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.precioUnitario)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--foreground)' }}>
              <td colSpan={3} />
              <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: 11.5, color: '#6c6a74' }}>Subtotal</td>
              <td style={{ padding: '8px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={3} />
              <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: 11.5, color: '#6c6a74' }}>IVA 16%</td>
              <td style={{ padding: '8px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(iva)}</td>
            </tr>
            <tr style={{ borderTop: '1px solid #e6e3db' }}>
              <td colSpan={3} />
              <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#3a3840' }}>Total</td>
              <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 600, lineHeight: 1 }}>{formatCurrency(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {pedido.notas && (
        <div style={{
          marginTop: 20, borderLeft: '2px solid var(--primary-color)',
          paddingLeft: 16, paddingTop: 4, paddingBottom: 4,
          fontStyle: 'italic', fontSize: 13, color: '#6c6a74',
        }}>
          {pedido.notas}
        </div>
      )}
    </div>
  );
}

function HistorialTab({ pedido }: { pedido: Pedido }) {
  const steps = [
    { title: 'Pedido creado', show: true, current: pedido.estado === 'cotizado' },
    { title: 'Transmitido a almacén', show: pedido.estado !== 'cotizado', current: pedido.estado === 'transmitido' },
    { title: 'Picking iniciado', show: ['en_curso', 'enviado', 'entregado'].includes(pedido.estado), current: pedido.estado === 'en_curso' },
    { title: 'Enviado al cliente', show: ['enviado', 'entregado'].includes(pedido.estado), current: pedido.estado === 'enviado' },
    { title: 'Entregado', show: pedido.estado === 'entregado', current: pedido.estado === 'entregado' },
    { title: 'Pedido cancelado', show: pedido.estado === 'cancelado', current: true },
  ].filter(s => s.show);

  return (
    <div style={{ maxWidth: 560 }}>
      <ol style={{ position: 'relative', listStyle: 'none', padding: 0, margin: 0 }}>
        <div style={{
          position: 'absolute', left: 7, top: 8, bottom: 8, width: 1,
          backgroundImage: 'linear-gradient(to bottom, #e6e3db 50%, transparent 50%)',
          backgroundSize: '1px 6px', backgroundRepeat: 'repeat-y',
        }} />
        {steps.map((step, i) => (
          <li key={i} style={{ position: 'relative', paddingLeft: 32, paddingBottom: 24 }}>
            <div style={{
              position: 'absolute', left: 0, top: 4,
              width: 15, height: 15, borderRadius: '50%',
              background: step.current ? 'var(--primary-color)' : 'white',
              border: step.current ? 'none' : '2px solid #e6e3db',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {step.current && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'white' }} />}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{step.title}</div>
            <div style={{ fontSize: 11.5, color: '#a19ea8', marginTop: 2 }}>
              {i === 0
                ? `${relTime(pedido.createdAt)} · ${fmtTime(pedido.createdAt)}`
                : new Date(pedido.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ClienteTab({ pedido }: { pedido: Pedido }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 700 }}>
      <div style={{ background: 'white', border: '1px solid #e6e3db', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6c6a74', marginBottom: 12 }}>Cliente</div>
        <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, marginBottom: 4 }}>{pedido.clienteNombre}</div>
        <div style={{ height: 1, background: '#e6e3db', margin: '16px 0' }} />
        <dl style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pedido.clienteEmail && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <dt style={{ color: '#6c6a74' }}>Email</dt>
              <dd style={{ margin: 0 }}>{pedido.clienteEmail}</dd>
            </div>
          )}
          {pedido.clienteTelefono && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <dt style={{ color: '#6c6a74' }}>Teléfono</dt>
              <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>{pedido.clienteTelefono}</dd>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <dt style={{ color: '#6c6a74' }}>ID cliente</dt>
            <dd style={{ margin: 0, fontFamily: 'var(--font-mono, monospace)', fontSize: 11.5 }}>#{pedido.clienteId}</dd>
          </div>
        </dl>
      </div>
      <div style={{ background: 'white', border: '1px solid #e6e3db', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6c6a74', marginBottom: 12 }}>Este pedido</div>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6c6a74', marginBottom: 8, marginTop: 16 }}>Partidas</div>
        <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{pedido.lineas.length}</div>
        <div style={{ height: 1, background: '#e6e3db', margin: '16px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
          <span style={{ color: '#6c6a74' }}>Total del pedido</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(pedido.total)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 6 }}>
          <span style={{ color: '#6c6a74' }}>Creado</span>
          <span style={{ color: '#6c6a74' }}>{relTime(pedido.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

function DocsTab({ pedido }: { pedido: Pedido }) {
  const cfdiStatus = useCfdiStore((s) => s.cfdiStatuses[pedido.id]);
  const docs = [
    { name: `Cotización — ${pedido.numero}`, type: 'PDF', size: '—' },
    pedido.transmitido && { name: 'Orden de venta', type: 'PDF', size: '—' },
    cfdiStatus?.invoiceStatus === 'facturado' && { name: `CFDI — ${pedido.numero}`, type: 'XML', size: '—' },
    cfdiStatus?.invoiceStatus === 'facturado' && { name: `CFDI — ${pedido.numero}`, type: 'PDF', size: '—' },
  ].filter(Boolean) as { name: string; type: string; size: string }[];

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ background: 'white', border: '1px solid #e6e3db', borderRadius: 12, overflow: 'hidden' }}>
        {docs.map((doc, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: i > 0 ? '1px solid #e6e3db' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 42, border: '1px solid #e6e3db', borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontFamily: 'var(--font-mono, monospace)', color: '#6c6a74',
                background: '#fbfaf5',
              }}>
                {doc.type}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{doc.name}</div>
                <div style={{ fontSize: 11, color: '#a19ea8', marginTop: 2 }}>{doc.size}</div>
              </div>
            </div>
            <TbBtn>
              <Download size={13} />
              Descargar
            </TbBtn>
          </div>
        ))}
        {docs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 16px', fontSize: 12.5, color: '#a19ea8' }}>
            No hay documentos generados aún
          </div>
        )}
      </div>
    </div>
  );
}

export function OrderDetailPanel({ pedido, onNextStep, onEdit, onEmitirCFDI }: OrderDetailPanelProps) {
  const [tab, setTab] = useState<'lineas' | 'historial' | 'cliente' | 'docs'>('lineas');
  const cfdiStatus = useCfdiStore((s) => s.cfdiStatuses[pedido.id]);
  const invoiceStatus = cfdiStatus?.invoiceStatus ?? 'no_facturado';

  const nextStepLabel: Record<string, string | null> = {
    cotizado:    'Transmitir a almacén',
    transmitido: 'Iniciar picking',
    en_curso:    'Marcar como enviado',
    enviado:     invoiceStatus === 'facturado' ? null : 'Emitir CFDI',
    entregado:   null,
    cancelado:   null,
    pagado:      null,
  };
  const nextLabel = nextStepLabel[pedido.estado];

  const handleNextStep = () => {
    if (pedido.estado === 'enviado' && invoiceStatus !== 'facturado' && onEmitirCFDI) {
      onEmitirCFDI(pedido);
    } else {
      onNextStep(pedido);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
      {/* Header */}
      <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #e6e3db' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, color: '#6c6a74', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{pedido.numero}</span>
              <span>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} />
                creado {relTime(pedido.createdAt)} · {fmtTime(pedido.createdAt)}
              </span>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0 }}>
              {pedido.clienteNombre}
            </h2>
            <div style={{ marginTop: 8, fontSize: 12.5, color: '#6c6a74', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} />
                Creado hace {daysSince(pedido.createdAt)}d
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6c6a74' }}>Total</div>
            <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', marginTop: 4 }}>
              {formatCurrency(pedido.total)}
            </div>
            <div style={{ fontSize: 11, color: '#a19ea8', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              {pedido.lineas.length} partidas
            </div>
          </div>
        </div>

        {/* Status + CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusPill status={pedido.estado} />
            <CfdiPill value={invoiceStatus} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TbBtn><Printer size={13} /> Imprimir</TbBtn>
            <TbBtn onClick={() => onEdit?.(pedido)}><Copy size={13} /> Editar</TbBtn>
            <TbBtn><Mail size={13} /> Enviar al cliente</TbBtn>
            {nextLabel && (
              <button
                onClick={handleNextStep}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'var(--primary-color)', color: 'white',
                  border: 'none', borderRadius: 8, padding: '8px 14px',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  opacity: 1, transition: 'opacity 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {nextLabel} <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 28px', borderBottom: '1px solid #e6e3db', display: 'flex', alignItems: 'center', gap: 20 }}>
        <TabBtn label={`Partidas (${pedido.lineas.length})`} active={tab === 'lineas'} onClick={() => setTab('lineas')} />
        <TabBtn label="Historial" active={tab === 'historial'} onClick={() => setTab('historial')} />
        <TabBtn label="Cliente" active={tab === 'cliente'} onClick={() => setTab('cliente')} />
        <TabBtn label="Documentos" active={tab === 'docs'} onClick={() => setTab('docs')} />
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        {tab === 'lineas'    && <LineasTab pedido={pedido} />}
        {tab === 'historial' && <HistorialTab pedido={pedido} />}
        {tab === 'cliente'   && <ClienteTab pedido={pedido} />}
        {tab === 'docs'      && <DocsTab pedido={pedido} />}
      </div>
    </div>
  );
}
