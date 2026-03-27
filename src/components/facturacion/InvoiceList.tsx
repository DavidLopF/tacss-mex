'use client';
// ─────────────────────────────────────────────────────────────────────────────
// InvoiceList — Lista de comprobantes CFDI con segmentación por tipo:
//   Facturas (I) · Notas de Crédito (E) · Complementos de Pago (P)
// Patrón: tabs primarios para tipo de documento + filtros secundarios de estado
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState, useCallback } from 'react';
import { Badge, Button } from '@/src/components/ui';
import { CfdiInvoice, InvoiceFilters, InvoiceStatus, InvoiceType } from '@/src/services/invoices/invoices.types';
import { getInvoices, syncInvoiceStatus } from '@/src/services/invoices/invoices.service';

// ── Metadatos de estado ────────────────────────────────────────────────────────
const STATUS_META: Record<InvoiceStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  DRAFT:          { label: 'Borrador',     variant: 'default' },
  STAMPED:        { label: 'Timbrada',     variant: 'success' },
  CANCEL_PENDING: { label: 'Cancelación',  variant: 'warning' },
  CANCELLED:      { label: 'Cancelada',    variant: 'danger'  },
  PAID:           { label: 'Pagada',       variant: 'info'    },
  ERROR:          { label: 'Error',        variant: 'danger'  },
};

// ── Tabs de tipo de comprobante ───────────────────────────────────────────────
type DocTypeTab = 'I' | 'E' | 'P';

interface DocTypeConfig {
  id:          DocTypeTab;
  label:       string;
  shortLabel:  string;
  description: string;
  accent:      string;   // Tailwind bg/text para el tab activo
  badgeColor:  string;   // pill de tipo en la fila
}

const DOC_TABS: DocTypeConfig[] = [
  {
    id:          'I',
    label:       'Facturas',
    shortLabel:  'Facturas',
    description: 'Comprobantes de ingreso (CFDI tipo I)',
    accent:      'bg-blue-600 text-white',
    badgeColor:  'bg-blue-50 text-blue-700 ring-blue-100',
  },
  {
    id:          'E',
    label:       'Notas de Crédito',
    shortLabel:  'NC',
    description: 'Comprobantes de egreso — devoluciones y descuentos (CFDI tipo E)',
    accent:      'bg-amber-500 text-white',
    badgeColor:  'bg-amber-50 text-amber-700 ring-amber-100',
  },
  {
    id:          'P',
    label:       'Complementos de Pago',
    shortLabel:  'REP',
    description: 'Recibos electrónicos de pago para facturas PPD (CFDI tipo P)',
    accent:      'bg-emerald-600 text-white',
    badgeColor:  'bg-emerald-50 text-emerald-700 ring-emerald-100',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.ERROR;
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface Props {
  onView?:         (invoice: CfdiInvoice) => void;
  onCancel?:       (invoice: CfdiInvoice) => void;
  onPay?:          (invoice: CfdiInvoice) => void;
  onCreditNote?:   (invoice: CfdiInvoice) => void;
  refreshTrigger?: number;
}

// ── Componente ─────────────────────────────────────────────────────────────────
export const InvoiceList: React.FC<Props> = ({
  onView, onCancel, onPay, onCreditNote, refreshTrigger,
}) => {
  const [activeType, setActiveType] = useState<DocTypeTab>('I');
  const [invoices, setInvoices]     = useState<CfdiInvoice[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(false);
  const [syncing, setSyncing]       = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [filters, setFilters]       = useState<InvoiceFilters>({ page: 1, limit: 20, invoiceType: 'I' });

  // Cambiar tab de tipo → resetear paginación y estado
  const switchTab = (tab: DocTypeTab) => {
    setActiveType(tab);
    setFilters({ page: 1, limit: filters.limit ?? 20, invoiceType: tab });
  };

  const load = useCallback(async (f: InvoiceFilters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInvoices(f);
      if (Array.isArray(res)) {
        setInvoices(res as unknown as CfdiInvoice[]);
        setTotal((res as unknown as CfdiInvoice[]).length);
      } else {
        setInvoices(Array.isArray(res?.data) ? res.data : []);
        setTotal(res?.pagination?.total ?? 0);
      }
    } catch {
      setInvoices([]);
      setTotal(0);
      setError('Error al cargar los comprobantes. Verifique que el servidor esté activo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filters); }, [filters, load, refreshTrigger]);

  const handleSync = async (id: string) => {
    setSyncing(id);
    try {
      await syncInvoiceStatus(id);
      await load(filters);
    } catch {
      setError('No fue posible sincronizar el estado con SAT.');
    } finally {
      setSyncing(null);
    }
  };

  const totalPages  = Math.ceil(total / (filters.limit ?? 20));
  const activeConfig = DOC_TABS.find((t) => t.id === activeType)!;

  // ── Columnas condicionales según tipo ──────────────────────────────────────
  const showMetodoPago = activeType === 'I';
  const showBalance    = activeType === 'I';
  const showActions    = true;

  return (
    <div className="space-y-0">

      {/* ── Tabs de tipo de documento ── */}
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        {DOC_TABS.map((tab) => {
          const isActive = activeType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              title={tab.description}
              className={`
                relative flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-medium
                transition-colors focus:outline-none
                ${isActive
                  ? 'border-gray-200 bg-white text-gray-900 shadow-sm'
                  : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'}
              `}
            >
              {/* Accent strip top */}
              {isActive && (
                <span
                  className={`absolute inset-x-0 top-0 h-0.5 rounded-t-lg ${
                    tab.id === 'I' ? 'bg-blue-600' :
                    tab.id === 'E' ? 'bg-amber-500' :
                    'bg-emerald-600'
                  }`}
                />
              )}
              <span>{tab.label}</span>
              {isActive && total > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none ${
                  tab.id === 'I' ? 'bg-blue-100 text-blue-700' :
                  tab.id === 'E' ? 'bg-amber-100 text-amber-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Filtros secundarios ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-b-none rounded-t-none border border-t-0 border-gray-200 bg-gray-50/60 px-4 py-2.5">
        <select
          value={filters.status ?? ''}
          onChange={(e) => setFilters((f) => ({
            ...f,
            status: (e.target.value as InvoiceStatus) || undefined,
            page: 1,
          }))}
          className="h-8 rounded-md border border-gray-200 bg-white px-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {(Object.keys(STATUS_META) as InvoiceStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>

        <select
          value={filters.limit ?? 20}
          onChange={(e) => setFilters((f) => ({ ...f, limit: Number(e.target.value), page: 1 }))}
          className="h-8 rounded-md border border-gray-200 bg-white px-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n} por página</option>)}
        </select>

        <Button onClick={() => load(filters)} variant="outline" size="sm" className="h-8 text-xs">
          Actualizar
        </Button>

        {/* Label del tipo activo */}
        <span className="ml-auto text-xs text-gray-400">{activeConfig.description}</span>
      </div>

      {error && (
        <div className="rounded-none border border-t-0 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="overflow-x-auto rounded-b-xl border border-t-0 border-gray-200">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-50">
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 font-semibold">Folio / Serie</th>
              <th className="px-4 py-3 font-semibold">Cliente / RFC</th>
              <th className="px-4 py-3 font-semibold">UUID Fiscal</th>
              {showMetodoPago && (
                <th className="px-4 py-3 font-semibold">Método</th>
              )}
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              {showBalance && (
                <th className="px-4 py-3 text-right font-semibold">Saldo</th>
              )}
              <th className="px-4 py-3 font-semibold">Timbrada</th>
              {showActions && (
                <th className="px-4 py-3 text-center font-semibold">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
            {loading && (
              <tr>
                <td colSpan={showMetodoPago ? 9 : 8} className="px-4 py-10 text-center text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    Cargando {activeConfig.label.toLowerCase()}…
                  </div>
                </td>
              </tr>
            )}
            {!loading && invoices.length === 0 && (
              <tr>
                <td colSpan={showMetodoPago ? 9 : 8} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <span className="text-3xl">
                      {activeType === 'I' ? '🧾' : activeType === 'E' ? '📋' : '💳'}
                    </span>
                    <p className="text-sm font-medium">
                      No hay {activeConfig.label.toLowerCase()} con los filtros seleccionados.
                    </p>
                    {filters.status && (
                      <button
                        onClick={() => setFilters((f) => ({ ...f, status: undefined }))}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Quitar filtro de estado
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {!loading && invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50/70 transition-colors">

                {/* Folio */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 ${activeConfig.badgeColor}`}
                    >
                      {inv.invoiceType}
                    </span>
                    <span className="font-mono text-xs font-semibold text-gray-900">
                      {inv.serie ? `${inv.serie}-` : ''}{inv.folio ?? '—'}
                    </span>
                  </div>
                </td>

                {/* Cliente */}
                <td className="px-4 py-3">
                  <div className="max-w-52 truncate text-sm">
                    {inv.cfdiCustomer?.legalName ?? '—'}
                  </div>
                  {inv.cfdiCustomer?.rfc && (
                    <div className="font-mono text-[11px] text-gray-500">{inv.cfdiCustomer.rfc}</div>
                  )}
                </td>

                {/* UUID */}
                <td className="px-4 py-3">
                  {inv.uuidFiscal
                    ? <span className="font-mono text-[11px] text-gray-600">{inv.uuidFiscal.substring(0, 8)}…</span>
                    : <span className="text-gray-300">—</span>}
                </td>

                {/* Método (solo facturas) */}
                {showMetodoPago && (
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                      {inv.metodoPago}
                    </span>
                  </td>
                )}

                {/* Estado */}
                <td className="px-4 py-3">
                  <StatusBadge status={inv.status} />
                </td>

                {/* Total */}
                <td className="px-4 py-3 text-right font-semibold">{formatMXN(inv.total)}</td>

                {/* Saldo (solo facturas) */}
                {showBalance && (
                  <td className={`px-4 py-3 text-right font-semibold ${inv.balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatMXN(inv.balanceDue)}
                  </td>
                )}

                {/* Fecha */}
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(inv.stampedAt)}</td>

                {/* Acciones */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {onView && (
                      <Button onClick={() => onView(inv)} size="sm" variant="outline" className="h-7 px-2.5 text-xs">
                        Ver
                      </Button>
                    )}
                    {/* Pago: solo facturas PPD con saldo */}
                    {onPay && activeType === 'I' && inv.status === 'STAMPED' && inv.metodoPago === 'PPD' && inv.balanceDue > 0 && (
                      <Button onClick={() => onPay(inv)} size="sm" className="h-7 bg-emerald-600 px-2.5 text-xs hover:bg-emerald-700">
                        Pago
                      </Button>
                    )}
                    {/* NC: solo desde facturas timbradas/pagadas */}
                    {onCreditNote && activeType === 'I' && (inv.status === 'STAMPED' || inv.status === 'PAID') && (
                      <Button onClick={() => onCreditNote(inv)} size="sm" variant="secondary" className="h-7 px-2.5 text-xs">
                        NC
                      </Button>
                    )}
                    {/* Cancelar */}
                    {onCancel && ['STAMPED', 'PAID'].includes(inv.status) && (
                      <Button onClick={() => onCancel(inv)} size="sm" variant="danger" className="h-7 px-2.5 text-xs">
                        Cancelar
                      </Button>
                    )}
                    {/* Sync SAT para cancelación pendiente */}
                    {inv.status === 'CANCEL_PENDING' && (
                      <Button
                        onClick={() => handleSync(inv.id)}
                        disabled={syncing === inv.id}
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs"
                      >
                        {syncing === inv.id ? 'Sincronizando…' : 'Sync SAT'}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Paginación ── */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-gray-500">
            {total} {activeConfig.label.toLowerCase()} — Página {filters.page ?? 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={(filters.page ?? 1) <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
              variant="outline"
              size="sm"
            >
              Anterior
            </Button>
            <Button
              disabled={(filters.page ?? 1) >= totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
              variant="outline"
              size="sm"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
