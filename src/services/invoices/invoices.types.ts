// ─────────────────────────────────────────────────────────────────────────────
// invoices.types.ts — Tipos del módulo de Facturación CFDI 4.0
// ─────────────────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'DRAFT' | 'STAMPED' | 'CANCEL_PENDING' | 'CANCELLED' | 'PAID' | 'ERROR';
export type InvoiceType   = 'I' | 'E' | 'P' | 'T';
export type MetodoPago    = 'PUE' | 'PPD';

export interface CfdiCustomer {
  id: string;
  clientId: number;
  facturapiCustomerId?: string | null;
  rfc: string;
  legalName: string;
  taxZip: string;
  taxRegime: string;
  isActive: boolean;
  lastSyncAt?: string | null;
  syncError?: string | null;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  productCode: string;
  unitCode: string;
  unitName: string;
}

export interface CfdiInvoice {
  id: string;
  facturapiId: string;
  uuidFiscal: string | null;
  status: InvoiceStatus;
  invoiceType: InvoiceType;
  serie?: string | null;
  folio?: number | null;
  metodoPago: MetodoPago;
  formaPago: string;
  usoCfdi: string;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  discount: number;
  totalTaxes: number;
  totalRetentions: number;
  total: number;
  balanceDue: number;
  facturapiPdfUrl?: string | null;
  facturapiXmlUrl?: string | null;
  cancellationReason?: string | null;
  errorMessage?: string | null;
  stampedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  cfdiCustomer?: CfdiCustomer;
  items?: InvoiceItem[];
}

export interface TaxConfig {
  type: 'IVA' | 'ISR' | 'IEPS';
  rate: number;
  factor: 'Tasa' | 'Cuota' | 'Exento';
  withholding: boolean;
}

export interface InvoiceItemInput {
  productCode: string;
  unitCode: string;
  unitName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxes: TaxConfig[];
  objetoImp?: '01' | '02' | '03';
}

// ─── DTOs de request ──────────────────────────────────────────────────────────
export interface UpsertFiscalDataDto {
  customerId: string;
  rfc: string;
  legalName: string;
  taxZip: string;
  taxRegime: string;
  email?: string;
  phone?: string;
}

export interface CreateInvoiceDto {
  customerFiscalId: string;
  saleId?: number;
  usoCfdi: string;
  formaPago: string;
  serie?: string;
  folioNumber?: number;
  currency?: string;
  exchangeRate?: number;
  conditions?: string;
  items: InvoiceItemInput[];
}

export interface RegisterPaymentDto {
  amount: number;
  formaPago: string;
  paymentDate: string; // ISO 8601
  operationNumber?: string;
  currency?: string;
  exchangeRate?: number;
  generateRep?: boolean;
  parciality?: number;  // Número de parcialidad (1, 2, 3...)
}

export interface RequestCancellationDto {
  motive: '01' | '02' | '03' | '04';
  substitutionUuid?: string;
}

export interface CreateCreditNoteDto {
  items: InvoiceItemInput[];
  usoCfdi?: string;
  reason?: string;
}

// ─── DTOs de response ─────────────────────────────────────────────────────────
export interface PaginatedInvoicesResponse {
  data: CfdiInvoice[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export interface InvoiceFilters {
  clientId?: string;
  status?: InvoiceStatus;
  invoiceType?: InvoiceType;  // I=Factura, E=NC, P=Complemento de Pago, T=Traslado
  page?: number;
  limit?: number;
}
