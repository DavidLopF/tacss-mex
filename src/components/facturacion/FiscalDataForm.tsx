// ─────────────────────────────────────────────────────────────────────────────
// FiscalDataForm — Captura de Datos Fiscales del Receptor (CFDI 4.0)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Button } from '@/components/ui';

const TAX_REGIMES = [
  { code: '601', label: '601 – General de Ley Personas Morales' },
  { code: '603', label: '603 – Personas Morales con Fines no Lucrativos' },
  { code: '605', label: '605 – Sueldos y Salarios' },
  { code: '606', label: '606 – Arrendamiento' },
  { code: '612', label: '612 – Personas Físicas con Actividades Empresariales' },
  { code: '616', label: '616 – Sin obligaciones fiscales' },
  { code: '621', label: '621 – Incorporación Fiscal' },
  { code: '626', label: '626 – Régimen Simplificado de Confianza (RESICO)' },
];

export interface FiscalDataInput {
  customerId: string;
  rfc: string;
  legalName: string;
  taxZip: string;
  taxRegime: string;
  email?: string;
  phone?: string;
}

interface Props {
  customerId: string;
  initialData?: Partial<FiscalDataInput>;
  onSubmit: (data: FiscalDataInput) => Promise<void>;
  onCancel?: () => void;
}

export const FiscalDataForm: React.FC<Props> = ({ customerId, initialData, onSubmit, onCancel }) => {
  const [form, setForm] = useState<FiscalDataInput>({
    customerId,
    rfc: initialData?.rfc ?? '',
    legalName: initialData?.legalName ?? '',
    taxZip: initialData?.taxZip ?? '',
    taxRegime: initialData?.taxRegime ?? '612',
    email: initialData?.email ?? '',
    phone: initialData?.phone ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/i.test(form.rfc.trim()))
      e.rfc = 'Formato inválido. Ej: XAXX010101000 (persona moral) o XEXX010101000 (persona física)';
    if (form.legalName.trim().length < 2) e.legalName = 'El nombre es requerido';
    if (!/^\d{5}$/.test(form.taxZip)) e.taxZip = 'Debe tener exactamente 5 dígitos';
    if (!form.taxRegime) e.taxRegime = 'Seleccione un régimen fiscal';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const set = (k: keyof FiscalDataInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try { await onSubmit({ ...form, rfc: form.rfc.toUpperCase().trim() }); }
    finally { setSubmitting(false); }
  };

  const baseInput = 'h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">RFC *</label>
          <input className={`${baseInput} ${errors.rfc ? 'border-red-300 focus:ring-red-500' : ''}`} value={form.rfc} onChange={(e) => set('rfc', e.target.value.toUpperCase())}
            placeholder="XAXX010101000" maxLength={13} />
          {errors.rfc && <p className="mt-1 text-xs text-red-600">{errors.rfc}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Codigo Postal Fiscal *</label>
          <input className={`${baseInput} ${errors.taxZip ? 'border-red-300 focus:ring-red-500' : ''}`} value={form.taxZip} onChange={(e) => set('taxZip', e.target.value.replace(/\D/g, '').slice(0,5))}
            placeholder="06600" maxLength={5} />
          {errors.taxZip && <p className="mt-1 text-xs text-red-600">{errors.taxZip}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nombre / Razon Social * <span className="font-normal text-gray-400">(sin S.A., S.R.L., etc.)</span>
          </label>
          <input className={`${baseInput} ${errors.legalName ? 'border-red-300 focus:ring-red-500' : ''}`} value={form.legalName} onChange={(e) => set('legalName', e.target.value)}
            placeholder="Empresa Ejemplo" maxLength={300} />
          {errors.legalName && <p className="mt-1 text-xs text-red-600">{errors.legalName}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Regimen Fiscal *</label>
          <select className={`${baseInput} ${errors.taxRegime ? 'border-red-300 focus:ring-red-500' : ''}`}
            value={form.taxRegime} onChange={(e) => set('taxRegime', e.target.value)}>
            {TAX_REGIMES.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
          {errors.taxRegime && <p className="mt-1 text-xs text-red-600">{errors.taxRegime}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email <span className="font-normal text-gray-400">(opcional)</span></label>
          <input className={`${baseInput} ${errors.email ? 'border-red-300 focus:ring-red-500' : ''}`} type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
            placeholder="cliente@ejemplo.com" />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Telefono <span className="font-normal text-gray-400">(opcional)</span></label>
          <input className={baseInput} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+52 55 1234 5678" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="outline">
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Guardando...' : 'Guardar Datos Fiscales'}
        </Button>
      </div>
    </form>
  );
};

export default FiscalDataForm;
