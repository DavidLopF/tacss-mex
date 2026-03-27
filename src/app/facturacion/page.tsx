'use client';
import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { InvoiceList }       from '@/src/components/facturacion/InvoiceList';
import { InvoiceForm }       from '@/src/components/facturacion/InvoiceForm';
import { FiscalDataForm }    from '@/src/components/facturacion/FiscalDataForm';
import { CFDIViewer }        from '@/src/components/facturacion/CFDIViewer';
import { PaymentForm }       from '@/src/components/facturacion/PaymentForm';
import { CancellationModal } from '@/src/components/facturacion/CancellationModal';

import {
  createPueInvoice,
  createPpdInvoice,
  upsertFiscalData,
  registerPayment,
  requestCancellation,
  createCreditNote,
  getFiscalData,
  syncInvoiceStatus,
} from '@/src/services/invoices/invoices.service';

import {
  CfdiInvoice,
  MetodoPago,
  CreateInvoiceDto,
  RegisterPaymentDto,
  RequestCancellationDto,
  CreateCreditNoteDto,
  InvoiceItemInput,
} from '@/src/services/invoices/invoices.types';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Modal,
  ToastContainer,
} from '@/src/components/ui';
import { useToast } from '@/src/lib/hooks';

type Tab = 'list' | 'new-pue' | 'new-ppd';
type ModalType = 'view' | 'pay' | 'cancel' | 'credit-note' | 'fiscal' | null;

/** Contexto de un pedido recibido por URL para pre-rellenar el formulario */
interface OrderContext {
  saleId:    number;
  saleCode:  string;
  items:     InvoiceItemInput[];
}

/** Mapper: objeto plano de la URL → InvoiceItemInput completo */
function mapUrlItemsToInvoiceItems(
  raw: Array<{ description: string; quantity: number; unitPrice: number }>
): InvoiceItemInput[] {
  return raw.map((r) => ({
    productCode: '43211501',  // SAT: "Programas de software para computadoras" — válido en test y live
    unitCode:    'H87',
    unitName:    'Pieza',
    description: r.description,
    quantity:    r.quantity,
    unitPrice:   r.unitPrice,
    discount:    0,
    objetoImp:   '02' as const,
    taxes:       [{ type: 'IVA' as const, rate: 0.16, factor: 'Tasa' as const, withholding: false }],
  }));
}

// ── Inner page con acceso a useSearchParams (requiere Suspense en el padre) ──
function FacturacionInner() {
  const searchParams                  = useSearchParams();
  const [activeTab, setActiveTab]     = useState<Tab>('list');
  const [modal, setModal]             = useState<ModalType>(null);
  const [selected, setSelected]       = useState<CfdiInvoice | null>(null);
  const [refreshKey, setRefreshKey]   = useState(0);
  const [loading, setLoading]         = useState(false);
  const toast = useToast();

  const [clientId, setClientId]       = useState('');
  const [fiscalId, setFiscalId]       = useState('');
  const [fiscalLabel, setFiscalLabel] = useState('');   // "RFC — Razón Social" para mostrar en UI

  /** Contexto del pedido de origen (solo cuando se navega desde /pedidos) */
  const [orderCtx, setOrderCtx]       = useState<OrderContext | null>(null);

  const refresh = () => setRefreshKey((k) => k + 1);

  // ── Intenta cargar datos fiscales de un cliente ──────────────────────────────
  // Si no existen, abre el modal para crearlos.
  const loadFiscalData = useCallback(async (id: string, afterLoad?: () => void) => {
    if (!id.trim()) return;
    try {
      const data = await getFiscalData(id);
      if (data) {
        setFiscalId(data.id);
        setFiscalLabel(`${data.rfc} — ${data.legalName}`);
        toast.success(`Datos fiscales cargados: ${data.rfc}`);
        afterLoad?.();
      } else {
        // Sin datos fiscales → abrir modal de registro
        setModal('fiscal');
      }
    } catch {
      toast.error('Error al consultar datos fiscales del cliente.');
    }
  }, [toast]);

  // ── Bootstrap desde pedido (URL params) ─────────────────────────────────────
  useEffect(() => {
    const saleIdParam   = searchParams.get('saleId');
    const clientIdParam = searchParams.get('clientId');
    const saleCodeParam = searchParams.get('saleCode');
    const itemsParam    = searchParams.get('items');

    if (!saleIdParam || !clientIdParam) return;

    setClientId(clientIdParam);

    loadFiscalData(clientIdParam, () => {
      // Parsear items si vienen en la URL
      if (itemsParam) {
        try {
          const rawItems = JSON.parse(itemsParam);
          const mappedItems = mapUrlItemsToInvoiceItems(rawItems);
          setOrderCtx({
            saleId:   parseInt(saleIdParam),
            saleCode: saleCodeParam ?? saleIdParam,
            items:    mappedItems,
          });
        } catch { /* silencioso */ }
      }
      setActiveTab('new-pue');
    });
  // Solo ejecutar una vez al montar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = (m: ModalType, invoice?: CfdiInvoice) => {
    setSelected(invoice ?? null);
    setModal(m);
  };

  const closeModal = () => { setModal(null); setSelected(null); };

  // ── Guardar datos fiscales (desde modal o desde búsqueda manual) ─────────────
  const handleFiscalSubmit = useCallback(async (data: Parameters<typeof upsertFiscalData>[0]) => {
    try {
      // data.customerId viene del FiscalDataForm (prop customerId), lo usamos tal cual
      const result = await upsertFiscalData(data);
      setFiscalId(result.id);
      setFiscalLabel(`${result.rfc} — ${result.legalName}`);
      toast.success('Datos fiscales guardados. Ya puedes emitir facturas.');
      closeModal();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? 'Error al guardar datos fiscales.');
    }
  }, [toast]);

  const handleCreateInvoice = useCallback(async (data: CreateInvoiceDto, metodo: MetodoPago) => {
    setLoading(true);
    try {
      if (metodo === 'PUE') {
        await createPueInvoice(data);
        toast.success('Factura PUE timbrada exitosamente.');
      } else {
        await createPpdInvoice(data);
        toast.success('Factura PPD timbrada. Recuerde registrar el pago para generar el REP.');
      }
      refresh();
      setActiveTab('list');
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? 'Error al timbrar la factura.');
    } finally { setLoading(false); }
  }, [toast]);

  const handleRegisterPayment = useCallback(async (data: RegisterPaymentDto) => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await registerPayment(selected.id, data);
      toast.success(res.invoiceFullyPaid
        ? 'Factura completamente liquidada.'
        : `Pago registrado. Saldo pendiente: $${res.remainingBalance.toFixed(2)}`);
      refresh();
      closeModal();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? 'Error al registrar pago.');
    } finally { setLoading(false); }
  }, [selected, toast]);

  const handleCancellation = useCallback(async (data: RequestCancellationDto) => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await requestCancellation(selected.id, data);
      toast.success(res.immediate
        ? 'Factura cancelada inmediatamente.'
        : 'Solicitud enviada al SAT. Estatus: CANCEL_PENDING.');
      refresh();
      closeModal();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? 'Error al solicitar cancelación.');
    } finally { setLoading(false); }
  }, [selected, toast]);

  const handleCreditNote = useCallback(async (data: CreateCreditNoteDto) => {
    if (!selected) return;
    setLoading(true);
    try {
      await createCreditNote(selected.id, data);
      toast.success('Nota de crédito emitida correctamente.');
      refresh();
      closeModal();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? 'Error al emitir nota de crédito.');
    } finally { setLoading(false); }
  }, [selected, toast]);

  return (
    <main className="p-6">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturación CFDI 4.0</h1>
            <p className="text-gray-500">Gestión de facturas electrónicas, datos fiscales y complementos de pago</p>
          </div>

          <Card className="w-full md:w-auto">
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
              <input
                value={clientId}
                onChange={(e) => { setClientId(e.target.value); setFiscalId(''); setFiscalLabel(''); }}
                placeholder="ID de cliente"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 sm:w-48"
              />
              <Button onClick={() => loadFiscalData(clientId)} size="md" className="h-10">
                Cargar cliente
              </Button>
            </CardContent>
            {fiscalLabel && (
              <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs text-gray-600">{fiscalLabel}</span>
                <button
                  onClick={() => openModal('fiscal')}
                  className="ml-auto text-xs text-blue-600 hover:underline"
                >
                  Editar RFC
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* ── Tabs ── */}
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'list',    label: 'Comprobantes' },
            { id: 'new-pue', label: 'Nueva PUE' },
            { id: 'new-ppd', label: 'Nueva PPD' },
          ] as { id: Tab; label: string }[]).map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'primary' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
              className="rounded-full"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* ── Aviso: sin datos fiscales al intentar facturar ── */}
        {(activeTab === 'new-pue' || activeTab === 'new-ppd') && !fiscalId && (
          <Card className="mx-auto w-full max-w-5xl border-amber-200 bg-amber-50/80">
            <CardContent className="flex items-center justify-between py-4">
              <p className="text-sm text-amber-800">
                Ingresa el ID del cliente y carga sus datos fiscales (RFC) antes de emitir una factura.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => clientId ? openModal('fiscal') : undefined}
                className="ml-4 shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100"
              >
                Registrar RFC
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Lista de facturas ── */}
        {activeTab === 'list' && (
          <Card>
            <CardContent className="p-0 pt-5 px-5 pb-5">
              <InvoiceList
                refreshTrigger={refreshKey}
                onView={(inv) => openModal('view', inv)}
                onPay={(inv) => openModal('pay', inv)}
                onCancel={(inv) => openModal('cancel', inv)}
                onCreditNote={(inv) => openModal('credit-note', inv)}
              />
            </CardContent>
          </Card>
        )}

        {/* ── Nueva PUE ── */}
        {activeTab === 'new-pue' && fiscalId && (
          <Card className="mx-auto w-full max-w-5xl">
            <CardHeader>
              <CardTitle>Nueva Factura PUE</CardTitle>
              <CardDescription>Pago en una sola exhibición. {fiscalLabel && <span className="text-green-600 font-medium">{fiscalLabel}</span>}</CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceForm
                customerFiscalId={fiscalId}
                metodoPago="PUE"
                onSubmit={(data) => handleCreateInvoice(data, 'PUE')}
                onCancel={() => { setActiveTab('list'); setOrderCtx(null); }}
                initialItems={orderCtx?.items}
                saleId={orderCtx?.saleId}
                saleCode={orderCtx?.saleCode}
              />
            </CardContent>
          </Card>
        )}

        {/* ── Nueva PPD ── */}
        {activeTab === 'new-ppd' && fiscalId && (
          <Card className="mx-auto w-full max-w-5xl">
            <CardHeader>
              <CardTitle>Nueva Factura PPD</CardTitle>
              <CardDescription>Pago en parcialidades o diferido. {fiscalLabel && <span className="text-green-600 font-medium">{fiscalLabel}</span>}</CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceForm
                customerFiscalId={fiscalId}
                metodoPago="PPD"
                onSubmit={(data) => handleCreateInvoice(data, 'PPD')}
                onCancel={() => { setActiveTab('list'); setOrderCtx(null); }}
                initialItems={orderCtx?.items}
                saleId={orderCtx?.saleId}
                saleCode={orderCtx?.saleCode}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* ───────────────── Modales ───────────────── */}

      {/* Modal: datos fiscales (crear / editar RFC) */}
      <Modal
        isOpen={modal === 'fiscal'}
        onClose={closeModal}
        title={fiscalId ? 'Editar datos fiscales' : 'Registrar datos fiscales del receptor'}
        size="lg"
      >
        <div className="space-y-3 pb-1">
          {!fiscalId && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Este cliente aún no tiene RFC registrado en el sistema. Completa los datos fiscales para poder emitir facturas CFDI 4.0.
            </p>
          )}
          <FiscalDataForm
            customerId={clientId || '0'}
            onSubmit={handleFiscalSubmit}
            onCancel={closeModal}
          />
        </div>
      </Modal>

      {/* Modal: ver detalle de factura */}
      <Modal
        isOpen={modal === 'view' && !!selected}
        onClose={closeModal}
        title="Detalle de factura"
        size="2xl"
      >
        {selected && (
          <CFDIViewer
            invoice={{
              id: selected.id,
              uuidFiscal: selected.uuidFiscal,
              status: selected.status,
              invoiceType: selected.invoiceType,
              serie: selected.serie,
              folio: selected.folio,
              total: selected.total,
              subtotal: selected.subtotal,
              totalTaxes: selected.totalTaxes,
              totalRetentions: selected.totalRetentions,
              currency: selected.currency,
              metodoPago: selected.metodoPago,
              formaPago: selected.formaPago,
              usoCfdi: selected.usoCfdi,
              stampedAt: selected.stampedAt,
              pdfUrl: selected.facturapiPdfUrl,
              xmlUrl: selected.facturapiXmlUrl,
              receptor: selected.cfdiCustomer
                ? {
                    rfc: selected.cfdiCustomer.rfc,
                    legalName: selected.cfdiCustomer.legalName,
                    taxZip: selected.cfdiCustomer.taxZip,
                    taxRegime: selected.cfdiCustomer.taxRegime,
                  }
                : undefined,
              items: selected.items,
              errorMessage: selected.errorMessage,
            }}
            onRequestCancel={() => { closeModal(); openModal('cancel', selected); }}
            onSyncStatus={async () => { await syncInvoiceStatus(selected.id); refresh(); }}
          />
        )}
      </Modal>

      {/* Modal: registrar pago PPD */}
      <Modal
        isOpen={modal === 'pay' && !!selected}
        onClose={closeModal}
        title="Registrar pago"
        size="lg"
      >
        {selected && (
          <PaymentForm
            invoiceId={selected.id}
            invoiceFolio={`${selected.serie ? `${selected.serie}-` : ''}${selected.folio ?? selected.id}`}
            balanceDue={selected.balanceDue}
            invoiceCurrency={selected.currency}
            onSubmit={handleRegisterPayment}
            onCancel={closeModal}
          />
        )}
      </Modal>

      {/* Modal: cancelación */}
      {selected && (
        <CancellationModal
          invoiceId={selected.id}
          invoiceFolio={`${selected.serie ? `${selected.serie}-` : ''}${selected.folio ?? selected.id}`}
          invoiceTotal={selected.total}
          invoiceCurrency={selected.currency}
          isOpen={modal === 'cancel'}
          isLoading={loading}
          onConfirm={(motive, substitutionUuid) => handleCancellation({ motive, substitutionUuid })}
          onClose={closeModal}
        />
      )}

      {/* Modal: nota de crédito */}
      <Modal
        isOpen={modal === 'credit-note' && !!selected}
        onClose={closeModal}
        title="Emitir nota de crédito"
        size="2xl"
      >
        {selected && (
          <InvoiceForm
            customerFiscalId={selected.cfdiCustomer?.id ?? ''}
            metodoPago="PUE"
            onSubmit={(data) => handleCreditNote({ items: data.items, usoCfdi: data.usoCfdi })}
            onCancel={closeModal}
          />
        )}
      </Modal>
    </main>
  );
}

// ── Wrapper con Suspense (requerido por useSearchParams en App Router) ────────
export default function FacturacionPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    }>
      <FacturacionInner />
    </Suspense>
  );
}
