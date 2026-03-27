'use client';
// ─────────────────────────────────────────────────────────────────────────────
// PaymentForm — Registro de pagos PPD + generación automática de REP (CFDI 4.0)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { RegisterPaymentDto } from '@/services/invoices/invoices.types';

const FORMAS_PAGO = [
  { code: '01', label: '01 – Efectivo' },
  { code: '02', label: '02 – Cheque nominativo' },
  { code: '03', label: '03 – Transferencia electrónica de fondos' },
  { code: '04', label: '04 – Tarjeta de crédito' },
  { code: '28', label: '28 – Tarjeta de débito' },
  { code: '06', label: '06 – Dinero electrónico' },
  { code: '31', label: '31 – Intermediario pagos electrónicos' },
];

interface Props {
  invoiceId: string;
  invoiceFolio: string;
  balanceDue: number;
  invoiceCurrency?: string;
  onSubmit: (data: RegisterPaymentDto) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export const PaymentForm: React.FC<Props> = ({
  invoiceId: _invoiceId,
  invoiceFolio,
  balanceDue,
  invoiceCurrency = 'MXN',
  onSubmit,
  onCancel,
  loading,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<RegisterPaymentDto>({
    paymentDate:  today,
    amount:       balanceDue,
    formaPago:    '03',
    currency:     invoiceCurrency,
    exchangeRate: 1,
    generateRep:  true,
    parciality:   1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  const set = <K extends keyof RegisterPaymentDto>(k: K, v: RegisterPaymentDto[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const formatMXN = (v: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: invoiceCurrency }).format(v);

  const remainingAfter = Math.max(0, balanceDue - (form.amount ?? 0));
  const isFullPayment  = form.amount >= balanceDue;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.paymentDate)             e.paymentDate = 'Fecha requerida';
    if (!form.amount || form.amount <= 0) e.amount   = 'El monto debe ser mayor a 0';
    if (form.amount > balanceDue)      e.amount      = `No puede exceder el saldo: ${formatMXN(balanceDue)}`;
    if (!form.formaPago)               e.formaPago   = 'Seleccione una forma de pago';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try { await onSubmit(form); }
    finally { setSubmitting(false); }
  };

  const inputCls = (err?: string) =>
    `h-10 w-full rounded-lg border ${err ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'} bg-white px-3 text-sm outline-none focus:ring-2`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Resumen de la deuda ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Factura PPD
            </p>
            <p className="mt-0.5 font-mono text-sm font-bold text-gray-900">{invoiceFolio}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Saldo pendiente</p>
            <p className="text-xl font-bold text-red-600">{formatMXN(balanceDue)}</p>
          </div>
        </div>
      </div>

      {/* ── Campos ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Fecha de Pago *
          </label>
          <input
            type="date"
            className={inputCls(errors.paymentDate)}
            value={form.paymentDate}
            max={today}
            onChange={(e) => set('paymentDate', e.target.value)}
          />
          {errors.paymentDate && <p className="mt-1 text-xs text-red-600">{errors.paymentDate}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Monto del Pago *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max={balanceDue}
            className={inputCls(errors.amount)}
            value={form.amount}
            onChange={(e) => set('amount', parseFloat(e.target.value))}
          />
          {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Forma de Pago *
          </label>
          <select
            className={inputCls(errors.formaPago)}
            value={form.formaPago}
            onChange={(e) => set('formaPago', e.target.value)}
          >
            {FORMAS_PAGO.map((fp) => (
              <option key={fp.code} value={fp.code}>{fp.label}</option>
            ))}
          </select>
          {errors.formaPago && <p className="mt-1 text-xs text-red-600">{errors.formaPago}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">No. Parcialidad</label>
          <input
            type="number"
            min="1"
            step="1"
            className={inputCls()}
            value={form.parciality ?? 1}
            onChange={(e) => set('parciality', parseInt(e.target.value))}
          />
          <p className="mt-1 text-xs text-gray-400">Consecutivo del pago (1, 2, 3…)</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Moneda del Pago</label>
          <select
            className={inputCls()}
            value={form.currency ?? invoiceCurrency}
            onChange={(e) => set('currency', e.target.value)}
          >
            <option value="MXN">MXN – Peso Mexicano</option>
            <option value="USD">USD – Dólar Americano</option>
          </select>
        </div>

        {form.currency !== invoiceCurrency && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tipo de Cambio
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={inputCls()}
              value={form.exchangeRate ?? 1}
              onChange={(e) => set('exchangeRate', parseFloat(e.target.value))}
            />
          </div>
        )}
      </div>

      {/* ── Toggle REP ───────────────────────────────────────────────────── */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <input
          type="checkbox"
          checked={form.generateRep ?? true}
          onChange={(e) => set('generateRep', e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-emerald-600"
        />
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            Generar Complemento de Pago (REP)
          </p>
          <p className="mt-0.5 text-xs text-emerald-700">
            Se timbrará automáticamente un CFDI de tipo P que respalda este pago ante el SAT.
            Recomendado para cumplimiento fiscal.
          </p>
        </div>
      </label>

      {/* ── Preview de saldo resultante ──────────────────────────────────── */}
      {form.amount > 0 && (
        <div className={`rounded-xl border p-4 ${isFullPayment ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/60'}`}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Saldo actual</span>
            <span className="font-semibold text-gray-900">{formatMXN(balanceDue)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-gray-600">Este pago</span>
            <span className="font-semibold text-blue-700">– {formatMXN(form.amount)}</span>
          </div>
          <div className={`mt-2 flex items-center justify-between border-t pt-2 text-sm font-bold ${isFullPayment ? 'border-emerald-200 text-emerald-700' : 'border-amber-200 text-amber-700'}`}>
            <span>Saldo resultante</span>
            <span>{isFullPayment ? '✅ Liquidada' : formatMXN(remainingAfter)}</span>
          </div>
        </div>
      )}

      {/* ── Acciones ─────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="outline" disabled={submitting || loading}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={submitting || loading}
          className={isFullPayment ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        >
          {submitting || loading
            ? 'Registrando…'
            : isFullPayment
              ? 'Liquidar Factura'
              : 'Registrar Pago Parcial'}
        </Button>
      </div>
    </form>
  );
};

export default PaymentForm;
