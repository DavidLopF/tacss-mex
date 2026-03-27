'use client';
// ─────────────────────────────────────────────────────────────────────────────
// CFDIViewer — Visualizador de comprobantes CFDI 4.0
// PDF preview · descarga XML · UUID copy · estado · acciones
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback } from 'react';
import { Button, Badge } from '@/components/ui';

// ── Types ─────────────────────────────────────────────────────────────────────
export type InvoiceStatus = 'DRAFT' | 'STAMPED' | 'CANCEL_PENDING' | 'CANCELLED' | 'PAID' | 'ERROR';
export type InvoiceType   = 'I' | 'E' | 'P' | 'T';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceReceptor {
  rfc: string;
  legalName: string;
  taxZip: string;
  taxRegime: string;
}

export interface CFDIViewerProps {
  invoice: {
    id: string;
    uuidFiscal: string | null;
    status: InvoiceStatus;
    invoiceType: InvoiceType;
    serie?: string | null;
    folio?: number | null;
    total: number;
    subtotal: number;
    totalTaxes: number;
    totalRetentions: number;
    currency: string;
    metodoPago: string;
    formaPago: string;
    usoCfdi: string;
    stampedAt?: string | null;
    pdfUrl?: string | null;
    xmlUrl?: string | null;
    receptor?: InvoiceReceptor;
    items?: InvoiceItem[];
    errorMessage?: string | null;
  };
  onRequestCancel?: (invoiceId: string) => void;
  onSendByEmail?:  (invoiceId: string) => void;
  onSyncStatus?:   (invoiceId: string) => Promise<void>;
  className?: string;
}

// ── Configuración de estado ───────────────────────────────────────────────────
const STATUS_META: Record<InvoiceStatus, {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info';
  description: string;
}> = {
  DRAFT:          { label: 'Borrador',              variant: 'default',  description: 'Aún no timbrado' },
  STAMPED:        { label: 'Timbrada',              variant: 'success',  description: 'Válida ante el SAT' },
  CANCEL_PENDING: { label: 'Cancelación Pendiente', variant: 'warning',  description: 'Esperando aceptación del receptor (72h)' },
  CANCELLED:      { label: 'Cancelada',             variant: 'danger',   description: 'Cancelada ante el SAT' },
  PAID:           { label: 'Pagada',                variant: 'info',     description: 'Saldo liquidado' },
  ERROR:          { label: 'Error',                 variant: 'danger',   description: 'Error en timbrado' },
};

const TIPO_CFDI: Record<InvoiceType, string> = {
  I: 'Ingreso',
  E: 'Egreso (Nota de Crédito)',
  P: 'Pago (REP)',
  T: 'Traslado',
};

// ── UUID Copy Button ──────────────────────────────────────────────────────────
const UuidCopyButton: React.FC<{ uuid: string }> = ({ uuid }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(uuid);
    } catch {
      const el = document.createElement('textarea');
      el.value = uuid;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [uuid]);

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">UUID (Folio Fiscal)</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-blue-900">
          {uuid}
        </code>
        <Button
          type="button"
          size="sm"
          variant={copied ? 'secondary' : 'outline'}
          onClick={handleCopy}
          className="flex-shrink-0"
        >
          {copied ? '✓ Copiado' : 'Copiar UUID'}
        </Button>
      </div>
    </div>
  );
};

// ── Componente Principal ──────────────────────────────────────────────────────
export const CFDIViewer: React.FC<CFDIViewerProps> = ({
  invoice,
  onRequestCancel,
  onSendByEmail,
  onSyncStatus,
  className,
}) => {
  const [isSyncing, setIsSyncing]         = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const statusMeta     = STATUS_META[invoice.status];
  const folio          = [invoice.serie, invoice.folio].filter(Boolean).join('') || '—';
  const isStamped      = ['STAMPED', 'PAID', 'CANCEL_PENDING'].includes(invoice.status);
  const isCancellable  = ['STAMPED', 'PAID'].includes(invoice.status);
  const receptorRfc    = invoice.receptor?.rfc ?? '—';

  const stampedDate = invoice.stampedAt
    ? new Date(invoice.stampedAt).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

  const formatMXN = (v: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: invoice.currency }).format(v);

  const handleDownload = (url: string, ext: string) => {
    const fn = `${folio}_${receptorRfc}_${new Date(invoice.stampedAt ?? Date.now()).toISOString().slice(0, 10)}.${ext}`;
    const a  = document.createElement('a');
    a.href   = url; a.download = fn; a.target = '_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleSync = async () => {
    if (!onSyncStatus) return;
    setIsSyncing(true);
    try { await onSyncStatus(invoice.id); }
    finally { setIsSyncing(false); }
  };

  return (
    <div className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${className ?? ''}`}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#1B4F8A] to-[#2980B9] px-6 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80">
              CFDI 4.0 · {TIPO_CFDI[invoice.invoiceType]}
            </p>
            <h2 className="mt-1 text-2xl font-bold">Factura {folio}</h2>
            {stampedDate && (
              <p className="mt-1 text-sm opacity-80">Timbrado: {stampedDate}</p>
            )}
          </div>
          <div className="text-right">
            <Badge variant={statusMeta.variant} className="text-xs" >
              {statusMeta.label}
            </Badge>
            <p className="mt-3 text-2xl font-bold">{formatMXN(invoice.total)}</p>
            <p className="text-xs opacity-75">{invoice.currency} · {invoice.metodoPago}</p>
          </div>
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────────── */}
      {invoice.status === 'ERROR' && invoice.errorMessage && (
        <div className="flex gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Error al timbrar</p>
            <p className="text-sm text-amber-700">{invoice.errorMessage}</p>
          </div>
        </div>
      )}

      {/* ── UUID ────────────────────────────────────────────────────────────── */}
      {invoice.uuidFiscal && (
        <div className="border-b border-gray-100 bg-gray-50/60 px-6 py-4">
          <UuidCopyButton uuid={invoice.uuidFiscal} />
        </div>
      )}

      {/* ── Receptor ─────────────────────────────────────────────────────── */}
      {invoice.receptor && (
        <div className="border-b border-gray-100 px-6 py-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Receptor</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {[
              { label: 'RFC',                 value: invoice.receptor.rfc },
              { label: 'Nombre / Razón Social', value: invoice.receptor.legalName },
              { label: 'CP Fiscal',            value: invoice.receptor.taxZip },
              { label: 'Uso CFDI',             value: invoice.usoCfdi },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] text-gray-400">{label}</p>
                <p className="text-sm font-medium text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Conceptos ─────────────────────────────────────────────────────── */}
      {invoice.items && invoice.items.length > 0 && (
        <div className="border-b border-gray-100 px-6 py-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Conceptos</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500">
                  <th className="pb-2">Descripción</th>
                  <th className="pb-2 text-right w-16">Cant.</th>
                  <th className="pb-2 text-right w-28">P. Unit.</th>
                  <th className="pb-2 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 text-gray-700">{item.description}</td>
                    <td className="py-2 text-right text-gray-500">{item.quantity}</td>
                    <td className="py-2 text-right text-gray-500">{formatMXN(item.unitPrice)}</td>
                    <td className="py-2 text-right font-semibold text-gray-900">{formatMXN(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="mt-3 space-y-1 border-t border-gray-200 pt-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{formatMXN(invoice.subtotal)}</span>
            </div>
            {invoice.totalTaxes > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>IVA Trasladado</span><span>{formatMXN(invoice.totalTaxes)}</span>
              </div>
            )}
            {invoice.totalRetentions > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Retenciones</span><span>–{formatMXN(invoice.totalRetentions)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-blue-900">
              <span>Total</span><span>{formatMXN(invoice.total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── PDF Preview ───────────────────────────────────────────────────── */}
      {showPdfPreview && invoice.pdfUrl && (
        <div className="border-b border-gray-100 px-6 pb-4">
          <iframe
            src={invoice.pdfUrl}
            className="h-[500px] w-full rounded-lg border border-gray-200"
            title="Vista previa del CFDI"
          />
        </div>
      )}

      {/* ── Acciones ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50/60 px-6 py-4">
        <div className="flex flex-wrap gap-2">
          {invoice.pdfUrl && (
            <Button size="sm" variant="outline" onClick={() => setShowPdfPreview((v) => !v)}>
              {showPdfPreview ? 'Ocultar PDF' : 'Ver PDF'}
            </Button>
          )}
          {invoice.pdfUrl && (
            <Button size="sm" variant="outline" onClick={() => handleDownload(invoice.pdfUrl!, 'pdf')}>
              Descargar PDF
            </Button>
          )}
          {invoice.xmlUrl && (
            <Button size="sm" variant="outline" onClick={() => handleDownload(invoice.xmlUrl!, 'xml')}>
              Descargar XML
            </Button>
          )}
          {isStamped && onSendByEmail && (
            <Button size="sm" variant="outline" onClick={() => onSendByEmail(invoice.id)}>
              Enviar por email
            </Button>
          )}
          {invoice.status === 'CANCEL_PENDING' && onSyncStatus && (
            <Button size="sm" variant="secondary" onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? 'Verificando…' : 'Verificar estado SAT'}
            </Button>
          )}
        </div>

        {isCancellable && onRequestCancel && (
          <Button size="sm" variant="danger" onClick={() => onRequestCancel(invoice.id)}>
            Cancelar CFDI
          </Button>
        )}
      </div>

      {/* ── Footer CANCEL_PENDING ─────────────────────────────────────────── */}
      {invoice.status === 'CANCEL_PENDING' && (
        <div className="border-t border-amber-200 bg-amber-50 px-6 py-3 text-xs text-amber-700">
          ⏳ La solicitud fue enviada al SAT. El receptor tiene 72 horas para aceptar o rechazar.
          Puede verificar el estado en cualquier momento con el botón de arriba.
        </div>
      )}
    </div>
  );
};

export default CFDIViewer;
