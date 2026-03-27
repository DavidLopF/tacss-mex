'use client';
// ─────────────────────────────────────────────────────────────────────────────
// CancellationModal — 4 motivos SAT + UUID sustituto (motivo 01) + doble confirmación
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback } from 'react';
import { Button, Badge, Modal } from '@/src/components/ui';

export type CancellationMotive = '01' | '02' | '03' | '04';

interface MotiveConfig {
  code: CancellationMotive;
  label: string;
  description: string;
  requiresSubstitution: boolean;
  risk: 'low' | 'medium' | 'high';
}

const MOTIVES: MotiveConfig[] = [
  {
    code: '01',
    label: 'Comprobante emitido con errores con relación',
    description: 'Se emitirá una nueva factura que reemplaza a la actual. Debe proporcionar el UUID de la factura corregida.',
    requiresSubstitution: true,
    risk: 'medium',
  },
  {
    code: '02',
    label: 'Comprobante emitido con errores sin relación',
    description: 'Error en datos que no requiere nueva factura (descripción, condiciones de pago, observaciones).',
    requiresSubstitution: false,
    risk: 'low',
  },
  {
    code: '03',
    label: 'No se llevó a cabo la operación',
    description: 'La venta fue cancelada, el servicio no se prestó o la operación comercial no se concretó.',
    requiresSubstitution: false,
    risk: 'high',
  },
  {
    code: '04',
    label: 'Operación nominativa relacionada en factura global',
    description: 'El receptor solicitó su factura individual después de ser incluido en una factura global.',
    requiresSubstitution: false,
    risk: 'low',
  },
];

const RISK_BADGE: Record<string, 'success' | 'warning' | 'danger'> = {
  low: 'success', medium: 'warning', high: 'danger',
};
const RISK_LABEL: Record<string, string> = {
  low: 'Bajo impacto', medium: 'Requiere sustituto', high: 'Alto impacto',
};

export interface CancellationModalProps {
  invoiceId:       string;
  invoiceFolio:    string;
  invoiceTotal:    number;
  invoiceCurrency?: string;
  isOpen:          boolean;
  isLoading?:      boolean;
  onConfirm:       (motive: CancellationMotive, substitutionUuid?: string) => Promise<void>;
  onClose:         () => void;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CancellationModal: React.FC<CancellationModalProps> = ({
  invoiceId: _invoiceId,
  invoiceFolio,
  invoiceTotal,
  invoiceCurrency = 'MXN',
  isOpen,
  isLoading,
  onConfirm,
  onClose,
}) => {
  const [selected, setSelected]         = useState<CancellationMotive | null>(null);
  const [subUuid, setSubUuid]           = useState('');
  const [uuidError, setUuidError]       = useState('');
  const [confirmed, setConfirmed]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  const motive    = MOTIVES.find((m) => m.code === selected);
  const canSubmit = selected !== null
    && confirmed
    && (!motive?.requiresSubstitution || UUID_REGEX.test(subUuid));

  const handleUuidChange = useCallback((v: string) => {
    setSubUuid(v);
    setUuidError(v && !UUID_REGEX.test(v)
      ? 'Formato incorrecto. Ejemplo: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      : '');
  }, []);

  const handleClose = () => {
    if (submitting) return;
    setSelected(null); setSubUuid(''); setUuidError(''); setConfirmed(false);
    onClose();
  };

  const handleConfirm = async () => {
    if (!selected || !canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm(selected, motive?.requiresSubstitution ? subUuid : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const formatMXN = (v: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: invoiceCurrency }).format(v);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Cancelar CFDI" size="md">
      {/* ── Resumen ─────────────────────────────────────────────────────── */}
      <div className="mb-5 flex items-center gap-6 rounded-xl border border-red-100 bg-red-50/60 px-4 py-3">
        <div>
          <p className="text-xs text-gray-500">Folio fiscal</p>
          <p className="font-mono text-sm font-bold text-gray-900">{invoiceFolio}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-sm font-bold text-red-700">{formatMXN(invoiceTotal)}</p>
        </div>
        <p className="ml-auto text-xs text-red-600 font-medium">⚠ Operación irreversible ante el SAT</p>
      </div>

      {/* ── Selector de motivo ───────────────────────────────────────────── */}
      <p className="mb-2 text-sm font-semibold text-gray-700">
        Motivo de cancelación <span className="text-red-500">*</span>
      </p>
      <div className="space-y-2">
        {MOTIVES.map((m) => {
          const active = selected === m.code;
          return (
            <div
              key={m.code}
              onClick={() => { setSelected(m.code); setConfirmed(false); setSubUuid(''); setUuidError(''); }}
              className={`cursor-pointer rounded-xl border-2 p-3 transition-all ${
                active ? 'border-blue-500 bg-blue-50/80' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  {/* radio button visual */}
                  <div className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 ${
                    active ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  } flex items-center justify-center`}>
                    {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {m.code} — {m.label}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{m.description}</p>
                  </div>
                </div>
                <Badge variant={RISK_BADGE[m.risk]} className="flex-shrink-0 text-[10px]">
                  {RISK_LABEL[m.risk]}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── UUID Sustituto (motivo 01) ───────────────────────────────────── */}
      {motive?.requiresSubstitution && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="mb-1 text-sm font-semibold text-amber-800">
            UUID de la Factura Sustituta <span className="text-red-500">*</span>
          </p>
          <p className="mb-2 text-xs text-amber-700">
            Ingrese el Folio Fiscal (UUID) de la nueva factura ya emitida que reemplaza a esta.
          </p>
          <input
            type="text"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={subUuid}
            onChange={(e) => handleUuidChange(e.target.value)}
            className={`h-10 w-full rounded-lg border bg-white px-3 font-mono text-sm outline-none focus:ring-2 ${
              uuidError ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'
            }`}
          />
          {uuidError  && <p className="mt-1 text-xs text-red-600">⚠ {uuidError}</p>}
          {subUuid && !uuidError && <p className="mt-1 text-xs text-emerald-600">✓ UUID válido</p>}
        </div>
      )}

      {/* ── Confirmación ─────────────────────────────────────────────────── */}
      {selected && (
        <label className={`mt-4 flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
          confirmed ? 'border-red-300 bg-red-50/80' : 'border-gray-200 hover:border-red-200'
        }`}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-red-600"
          />
          <p className="text-xs text-gray-700 leading-relaxed">
            Entiendo que la cancelación es <strong className="text-red-700">irreversible ante el SAT</strong> y
            que el receptor recibirá una notificación para aceptar o rechazar la solicitud (plazo: 72 horas).
          </p>
        </label>
      )}

      {/* ── Botones ──────────────────────────────────────────────────────── */}
      <div className="mt-5 flex justify-end gap-2">
        <Button
          type="button"
          onClick={handleClose}
          variant="outline"
          disabled={submitting || isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          variant="danger"
          disabled={!canSubmit || submitting || isLoading}
        >
          {submitting || isLoading ? 'Procesando…' : 'Confirmar Cancelación'}
        </Button>
      </div>
    </Modal>
  );
};

export default CancellationModal;
