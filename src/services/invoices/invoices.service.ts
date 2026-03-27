// ─────────────────────────────────────────────────────────────────────────────
// invoices.service.ts — Capa de servicio HTTP para Facturación CFDI 4.0
// ─────────────────────────────────────────────────────────────────────────────
import { get, post, del, HttpError } from '@/services/http-client';
import {
  CfdiInvoice,
  CfdiCustomer,
  PaginatedInvoicesResponse,
  InvoiceFilters,
  UpsertFiscalDataDto,
  CreateInvoiceDto,
  RegisterPaymentDto,
  RequestCancellationDto,
  CreateCreditNoteDto,
} from './invoices.types';

const BASE = '/api/invoice';

// ── Datos Fiscales ─────────────────────────────────────────────────────────────

/**
 * Crear o actualizar datos fiscales (RFC, razón social, CP, régimen) de un cliente.
 * POST /api/invoices/fiscal-data
 */
export async function upsertFiscalData(data: UpsertFiscalDataDto): Promise<CfdiCustomer> {
  try {
    const response = await post<CfdiCustomer>(`${BASE}/fiscal-data`, data);
    return response;
  } catch (err) {
    console.error('[InvoicesService] upsertFiscalData:', err);
    throw err;
  }
}

/**
 * Obtener datos fiscales registrados para un cliente.
 * GET /api/invoices/fiscal-data/:clientId
 */
export async function getFiscalData(clientId: string | number): Promise<CfdiCustomer | null> {
  try {
    const response = await get<CfdiCustomer>(`${BASE}/fiscal-data/${clientId}`);
    return response;
  } catch (err: unknown) {
    // 404 → el cliente aún no tiene datos fiscales registrados (null = sin datos, no error)
    if (err instanceof HttpError && err.status === 404) return null;
    console.error('[InvoicesService] getFiscalData:', err);
    throw err;
  }
}

// ── Listado y Detalle ──────────────────────────────────────────────────────────

/**
 * Obtener facturas paginadas con filtros opcionales.
 * GET /api/invoices?clientId=&status=&page=&limit=
 */
export async function getInvoices(filters: InvoiceFilters = {}): Promise<PaginatedInvoicesResponse> {
  try {
    const params: Record<string, unknown> = {};
    if (filters.clientId)    params.clientId    = filters.clientId;
    if (filters.status)      params.status      = filters.status;
    if (filters.invoiceType) params.invoiceType = filters.invoiceType;
    if (filters.page)        params.page        = filters.page;
    if (filters.limit)       params.limit       = filters.limit;

    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
    ).toString();

    const response = await get<{ data: CfdiInvoice[]; pagination: PaginatedInvoicesResponse['pagination'] }>(
      qs ? `${BASE}?${qs}` : BASE
    );
    return response as unknown as PaginatedInvoicesResponse;
  } catch (err) {
    console.error('[InvoicesService] getInvoices:', err);
    throw err;
  }
}

/**
 * Obtener detalle de una factura por ID.
 * GET /api/invoices/:id
 */
export async function getInvoiceById(id: string): Promise<CfdiInvoice> {
  try {
    const response = await get<CfdiInvoice>(`${BASE}/${id}`);
    return response;
  } catch (err) {
    console.error('[InvoicesService] getInvoiceById:', err);
    throw err;
  }
}

// ── Timbrado ───────────────────────────────────────────────────────────────────

/**
 * Timbrar factura PUE (Pago en Una Exhibición).
 * POST /api/invoices/pue
 */
export async function createPueInvoice(data: CreateInvoiceDto): Promise<CfdiInvoice> {
  try {
    const response = await post<CfdiInvoice>(`${BASE}/pue`, data);
    return response;
  } catch (err) {
    console.error('[InvoicesService] createPueInvoice:', err);
    throw err;
  }
}

/**
 * Timbrar factura PPD (Pago en Parcialidades o Diferido).
 * POST /api/invoices/ppd
 */
export async function createPpdInvoice(data: CreateInvoiceDto): Promise<CfdiInvoice> {
  try {
    const response = await post<CfdiInvoice>(`${BASE}/ppd`, data);
    return response;
  } catch (err) {
    console.error('[InvoicesService] createPpdInvoice:', err);
    throw err;
  }
}

// ── Pagos y REP ────────────────────────────────────────────────────────────────

/**
 * Registrar pago parcial o total en una factura PPD.
 * POST /api/invoices/:id/payments
 */
export async function registerPayment(
  invoiceId: string,
  data: RegisterPaymentDto
): Promise<{ invoiceFullyPaid: boolean; remainingBalance: number }> {
  try {
    const response = await post<{ invoiceFullyPaid: boolean; remainingBalance: number }>(
      `${BASE}/${invoiceId}/payments`,
      data
    );
    return response;
  } catch (err) {
    console.error('[InvoicesService] registerPayment:', err);
    throw err;
  }
}

/**
 * Obtener pagos registrados para una factura PPD.
 * GET /api/invoices/:id/payments
 */
export async function getPayments(invoiceId: string): Promise<unknown[]> {
  try {
    const response = await get<unknown[]>(`${BASE}/${invoiceId}/payments`);
    return response;
  } catch (err) {
    console.error('[InvoicesService] getPayments:', err);
    throw err;
  }
}

// ── Cancelación ────────────────────────────────────────────────────────────────

/**
 * Obtener motivos de cancelación SAT.
 * GET /api/invoices/cancellation-motives
 */
export async function getCancellationMotives(): Promise<
  Array<{ motive: string; label: string; requiresUuid: boolean }>
> {
  try {
    const response = await get<Array<{ motive: string; label: string; requiresUuid: boolean }>>(
      `${BASE}/cancellation-motives`
    );
    return response;
  } catch (err) {
    console.error('[InvoicesService] getCancellationMotives:', err);
    throw err;
  }
}

/**
 * Solicitar cancelación de una factura ante el SAT.
 * DELETE /api/invoices/:id  (body: { motive, substitutionUuid? })
 */
export async function requestCancellation(
  invoiceId: string,
  data: RequestCancellationDto
): Promise<{ id: string; status: string; immediate: boolean }> {
  try {
    const response = await del<{ id: string; status: string; immediate: boolean }>(
      `${BASE}/${invoiceId}`,
      data
    );
    return response;
  } catch (err) {
    console.error('[InvoicesService] requestCancellation:', err);
    throw err;
  }
}

// ── Nota de Crédito ────────────────────────────────────────────────────────────

/**
 * Emitir nota de crédito (CFDI Egreso) sobre una factura existente.
 * POST /api/invoices/:id/credit-note
 */
export async function createCreditNote(
  invoiceId: string,
  data: CreateCreditNoteDto
): Promise<CfdiInvoice> {
  try {
    const response = await post<CfdiInvoice>(`${BASE}/${invoiceId}/credit-note`, data);
    return response;
  } catch (err) {
    console.error('[InvoicesService] createCreditNote:', err);
    throw err;
  }
}

/**
 * Obtener notas de crédito asociadas a una factura.
 * GET /api/invoices/:id/credit-notes
 */
export async function getCreditNotes(invoiceId: string): Promise<CfdiInvoice[]> {
  try {
    const response = await get<CfdiInvoice[]>(`${BASE}/${invoiceId}/credit-notes`);
    return response;
  } catch (err) {
    console.error('[InvoicesService] getCreditNotes:', err);
    throw err;
  }
}

// ── Sync ───────────────────────────────────────────────────────────────────────

/**
 * Sincronizar estado de una factura con Facturapi (útil para CANCEL_PENDING).
 * POST /api/invoices/:id/sync
 */
export async function syncInvoiceStatus(invoiceId: string): Promise<{ id: string; status: string }> {
  try {
    const response = await post<{ id: string; status: string }>(`${BASE}/${invoiceId}/sync`, {});
    return response;
  } catch (err) {
    console.error('[InvoicesService] syncInvoiceStatus:', err);
    throw err;
  }
}
