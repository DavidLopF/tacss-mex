'use client';

import React, { useState } from 'react';
import { Badge, Button } from '@/src/components/ui';
import { CreateInvoiceDto, InvoiceItemInput, TaxConfig, MetodoPago } from '@/src/services/invoices/invoices.types';

const USO_CFDI = [
  { code: 'G01', label: 'G01 - Adquisicion de mercancias' },
  { code: 'G03', label: 'G03 - Gastos en general' },
  { code: 'I01', label: 'I01 - Construcciones' },
  { code: 'I03', label: 'I03 - Equipo de transporte' },
  { code: 'I04', label: 'I04 - Equipo de computo y accesorios' },
  { code: 'I06', label: 'I06 - Comunicaciones telefonicas' },
  { code: 'D01', label: 'D01 - Honorarios medicos, dentales y gastos hospitalarios' },
  { code: 'D10', label: 'D10 - Pagos por servicios educativos' },
  { code: 'S01', label: 'S01 - Sin efectos fiscales' },
  { code: 'CP01', label: 'CP01 - Pagos' },
];

const FORMAS_PAGO = [
  { code: '01', label: '01 - Efectivo' },
  { code: '02', label: '02 - Cheque nominativo' },
  { code: '03', label: '03 - Transferencia electronica' },
  { code: '04', label: '04 - Tarjeta de credito' },
  { code: '28', label: '28 - Tarjeta de debito' },
  { code: '99', label: '99 - Por definir (PPD)' },
];

const UNIT_CODES = [
  { code: 'E48', label: 'E48 - Unidad de servicio' },
  { code: 'H87', label: 'H87 - Pieza' },
  { code: 'KGM', label: 'KGM - Kilogramo' },
  { code: 'LTR', label: 'LTR - Litro' },
  { code: 'MTR', label: 'MTR - Metro' },
  { code: 'XBX', label: 'XBX - Caja' },
];

const EMPTY_ITEM: InvoiceItemInput = {
  productCode: '43211501',  // SAT: "Programas de software" — válido en test y live
  unitCode: 'E48',
  unitName: 'Unidad de servicio',
  description: '',
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  objetoImp: '02',
  taxes: [{ type: 'IVA', rate: 0.16, factor: 'Tasa', withholding: false }],
};

interface Props {
  customerFiscalId: string;
  metodoPago: MetodoPago;
  onSubmit: (data: CreateInvoiceDto) => Promise<void>;
  onCancel?: () => void;
  /** Conceptos pre-cargados desde un pedido (opcional) */
  initialItems?: InvoiceItemInput[];
  /** ID del pedido de origen para vincular la factura (opcional) */
  saleId?: number;
  /** Código del pedido de origen para mostrar en el banner (opcional) */
  saleCode?: string;
}

export const InvoiceForm: React.FC<Props> = ({
  customerFiscalId, metodoPago, onSubmit, onCancel,
  initialItems, saleId, saleCode,
}) => {
  const [form, setForm] = useState<Omit<CreateInvoiceDto, 'customerFiscalId' | 'items'>>({
    usoCfdi: 'G01',   // Adquisición de mercancías — default para pedidos
    formaPago: metodoPago === 'PPD' ? '99' : '03',
    serie: '',
    currency: 'MXN',
    exchangeRate: 1,
    saleId,
  });
  const [items, setItems] = useState<InvoiceItemInput[]>(
    initialItems && initialItems.length > 0 ? initialItems : [{ ...EMPTY_ITEM }]
  );
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const updateItem = (i: number, field: keyof InvoiceItemInput, value: unknown) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  };

  const updateTax = (i: number, taxIdx: number, field: keyof TaxConfig, value: unknown) => {
    setItems((prev) => prev.map((it, idx) => {
      if (idx !== i) return it;
      const taxes = it.taxes.map((t, ti) => (ti === taxIdx ? { ...t, [field]: value } : t));
      return { ...it, taxes };
    }));
  };

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice - (it.discount ?? 0), 0);
  const totalTax = items.reduce((s, it) => {
    const base = it.quantity * it.unitPrice - (it.discount ?? 0);
    return s + it.taxes.filter((t) => !t.withholding).reduce((a, t) => a + base * t.rate, 0);
  }, 0);
  const total = subtotal + totalTax;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.usoCfdi) e.usoCfdi = 'Seleccione uso de CFDI';
    if (!form.formaPago) e.formaPago = 'Seleccione forma de pago';
    items.forEach((it, i) => {
      if (!it.description.trim()) e[`item_${i}_desc`] = 'Descripcion requerida';
      if (it.unitPrice <= 0) e[`item_${i}_price`] = 'Precio debe ser mayor a 0';
      if (it.quantity <= 0) e[`item_${i}_qty`] = 'Cantidad debe ser mayor a 0';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({ ...form, customerFiscalId, items });
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase = 'h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <>
    {/* Banner de pedido origen */}
    {saleCode && (
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3">
        <span className="text-xl">📦</span>
        <div>
          <p className="text-sm font-semibold text-blue-800">Facturando pedido <span className="font-mono">{saleCode}</span></p>
          <p className="text-xs text-blue-600">Los conceptos fueron pre-cargados. Revisa precios, impuestos y uso de CFDI antes de timbrar.</p>
        </div>
      </div>
    )}

    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Datos de la Factura</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Uso de CFDI *</label>
            <select
              className={`${inputBase} ${errors.usoCfdi ? 'border-red-300 focus:ring-red-500' : ''}`}
              value={form.usoCfdi}
              onChange={(e) => setForm((f) => ({ ...f, usoCfdi: e.target.value }))}
            >
              {USO_CFDI.map((u) => <option key={u.code} value={u.code}>{u.label}</option>)}
            </select>
            {errors.usoCfdi && <p className="mt-1 text-xs text-red-600">{errors.usoCfdi}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Forma de Pago *</label>
            <select
              className={`${inputBase} ${errors.formaPago ? 'border-red-300 focus:ring-red-500' : ''}`}
              value={form.formaPago}
              onChange={(e) => setForm((f) => ({ ...f, formaPago: e.target.value }))}
            >
              {FORMAS_PAGO.map((fp) => <option key={fp.code} value={fp.code}>{fp.label}</option>)}
            </select>
            {errors.formaPago && <p className="mt-1 text-xs text-red-600">{errors.formaPago}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Serie</label>
            <input
              className={inputBase}
              value={form.serie ?? ''}
              maxLength={10}
              onChange={(e) => setForm((f) => ({ ...f, serie: e.target.value }))}
              placeholder="A"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Moneda</label>
            <select
              className={inputBase}
              value={form.currency ?? 'MXN'}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
            >
              <option value="MXN">MXN - Peso Mexicano</option>
              <option value="USD">USD - Dolar Americano</option>
            </select>
          </div>

          {form.currency !== 'MXN' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de Cambio</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className={inputBase}
                value={form.exchangeRate ?? 1}
                onChange={(e) => setForm((f) => ({ ...f, exchangeRate: parseFloat(e.target.value) }))}
              />
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Conceptos</h3>
          <Badge variant={metodoPago === 'PUE' ? 'info' : 'warning'}>{metodoPago}</Badge>
        </div>

        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Concepto #{i + 1}</p>
              {items.length > 1 && (
                <Button type="button" onClick={() => removeItem(i)} variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
                  Eliminar
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Descripcion *</label>
                <input
                  className={`${inputBase} ${errors[`item_${i}_desc`] ? 'border-red-300 focus:ring-red-500' : ''}`}
                  value={item.description}
                  onChange={(e) => updateItem(i, 'description', e.target.value)}
                  placeholder="Servicio de consultoria"
                />
                {errors[`item_${i}_desc`] && <p className="mt-1 text-xs text-red-600">{errors[`item_${i}_desc`]}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Clave Producto SAT</label>
                <input
                  className={inputBase}
                  value={item.productCode}
                  onChange={(e) => updateItem(i, 'productCode', e.target.value)}
                  placeholder="01010101"
                  maxLength={8}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Unidad de Medida</label>
                <select
                  className={inputBase}
                  value={item.unitCode}
                  onChange={(e) => {
                    const opt = UNIT_CODES.find((u) => u.code === e.target.value);
                    updateItem(i, 'unitCode', e.target.value);
                    if (opt) updateItem(i, 'unitName', opt.label.split(' - ')[1]);
                  }}
                >
                  {UNIT_CODES.map((u) => <option key={u.code} value={u.code}>{u.label}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Cantidad *</label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  className={`${inputBase} ${errors[`item_${i}_qty`] ? 'border-red-300 focus:ring-red-500' : ''}`}
                  value={item.quantity}
                  onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value))}
                />
                {errors[`item_${i}_qty`] && <p className="mt-1 text-xs text-red-600">{errors[`item_${i}_qty`]}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Precio Unitario *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className={`${inputBase} ${errors[`item_${i}_price`] ? 'border-red-300 focus:ring-red-500' : ''}`}
                  value={item.unitPrice}
                  onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value))}
                />
                {errors[`item_${i}_price`] && <p className="mt-1 text-xs text-red-600">{errors[`item_${i}_price`]}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Descuento</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputBase}
                  value={item.discount ?? 0}
                  onChange={(e) => updateItem(i, 'discount', parseFloat(e.target.value))}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Objeto Imp.</label>
                <select
                  className={inputBase}
                  value={item.objetoImp ?? '02'}
                  onChange={(e) => updateItem(i, 'objetoImp', e.target.value as '01' | '02' | '03')}
                >
                  <option value="01">01 - No objeto de impuesto</option>
                  <option value="02">02 - Si objeto de impuesto</option>
                  <option value="03">03 - Si objeto, no obligado al desglose</option>
                </select>
              </div>
            </div>

            {item.objetoImp !== '01' && item.taxes.map((tax, ti) => (
              <div key={ti} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Impuesto</label>
                  <select
                    className={inputBase}
                    value={tax.type}
                    onChange={(e) => updateTax(i, ti, 'type', e.target.value as 'IVA' | 'ISR' | 'IEPS')}
                  >
                    <option value="IVA">IVA</option>
                    <option value="ISR">ISR</option>
                    <option value="IEPS">IEPS</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Tasa</label>
                  <select
                    className={inputBase}
                    value={String(tax.rate)}
                    onChange={(e) => updateTax(i, ti, 'rate', parseFloat(e.target.value))}
                  >
                    <option value="0.16">16 %</option>
                    <option value="0.08">8 %</option>
                    <option value="0">0 % (exento)</option>
                    <option value="0.106667">10.6667 % (IEPS)</option>
                  </select>
                </div>

                <label className="mt-6 inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={tax.withholding}
                    onChange={(e) => updateTax(i, ti, 'withholding', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Retencion
                </label>
              </div>
            ))}

            <p className="mt-3 text-right text-xs text-gray-500">
              Subtotal partida: <span className="font-semibold text-gray-900">${((item.quantity * item.unitPrice) - (item.discount ?? 0)).toFixed(2)}</span>
            </p>
          </div>
        ))}

        <Button type="button" onClick={addItem} variant="outline" className="w-full border-dashed">
          Agregar concepto
        </Button>
      </section>

      <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex justify-between text-sm text-gray-700">
          <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm text-gray-700">
          <span>IVA estimado</span><span>${totalTax.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-emerald-200 pt-2 text-base font-bold text-emerald-700">
          <span>Total</span><span>${total.toFixed(2)} {form.currency ?? 'MXN'}</span>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="outline">
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Timbrando...' : metodoPago === 'PUE' ? 'Timbrar Factura PUE' : 'Timbrar Factura PPD'}
        </Button>
      </div>
    </form>
    </>
  );
};

export default InvoiceForm;
