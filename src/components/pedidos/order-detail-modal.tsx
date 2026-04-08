'use client';

import { useRef, useState } from 'react';
import { Modal, Badge, Button } from '@/components/ui';
import { Pedido } from '@/types';
import { useCfdiStore } from '@/stores';
import { 
  X, 
  User, 
  Calendar, 
  Package, 
  FileText, 
  Truck,
  CreditCard,
  Edit,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Receipt,
  Hash,
  Building2,
  Printer,
  Download,
  ChevronDown,
  ChevronUp,
  TicketCheck,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface OrderDetailModalProps {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (pedido: Pedido) => void;
  /** Emitir CFDI — disponible cuando el pedido está en estado enviado o pagado */
  onEmitirCFDI?: (pedido: Pedido) => void;
}

interface EstadoConfigItem {
  label: string;
  color: string;
  textColor: string;
  icon: typeof FileText;
  step: number;
}

const estadoConfig: Record<string, EstadoConfigItem> = {
  cotizado: { 
    label: 'Cotizado', 
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    icon: FileText,
    step: 1
  },
  transmitido: { 
    label: 'Transmitido', 
    color: 'bg-purple-500',
    textColor: 'text-purple-700',
    icon: Truck,
    step: 2
  },
  en_curso: { 
    label: 'En Curso', 
    color: 'bg-amber-500',
    textColor: 'text-amber-700',
    icon: Package,
    step: 3
  },
  enviado: { 
    label: 'Enviado', 
    color: 'bg-cyan-500',
    textColor: 'text-cyan-700',
    icon: Truck,
    step: 4
  },
  pagado: { 
    label: 'Pagado', 
    color: 'bg-green-500',
    textColor: 'text-green-700',
    icon: CreditCard,
    step: 5
  },
  cancelado: { 
    label: 'Cancelado', 
    color: 'bg-red-500',
    textColor: 'text-red-700',
    icon: X,
    step: -1
  },
};

const pasos = ['cotizado', 'transmitido', 'en_curso', 'enviado'] as const;

export function OrderDetailModal({ pedido, isOpen, onClose, onEdit, onEmitirCFDI }: OrderDetailModalProps) {
  const [isProductsOpen, setIsProductsOpen] = useState(true);
  const [isClientOpen, setIsClientOpen] = useState(true);
  const [isInfoOpen, setIsInfoOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'detalle' | 'recibo'>('detalle');
  const [isDownloading, setIsDownloading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  const cfdiStatuses = useCfdiStore((s) => s.cfdiStatuses);
  const cfdiStatus = pedido ? cfdiStatuses[pedido.id] || { invoiceStatus: 'no_facturado' } : null;
  
  if (!pedido) return null;

  const config = estadoConfig[pedido.estado];
  const IconEstado = config.icon;
  const isEditable = pedido.estado === 'cotizado' && !pedido.transmitido;
  const cantidadTotal = pedido.lineas.reduce((sum, linea) => sum + linea.cantidad, 0);
  const isCancelled = pedido.estado === 'cancelado';
  const isEnviado = pedido.estado === 'enviado';

  const handleEdit = () => {
    if (onEdit) {
      onEdit(pedido);
    }
  };

  const handlePrintReceipt = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try { return Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); }
        catch { return ''; }
      })
      .join('\n');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Recibo ${pedido.numero}</title>
          <style>
            ${styles}
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>${receiptRef.current.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const handleDownloadPdf = async () => {
    if (!pedido) return;
    setIsDownloading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const contentW = pw - margin * 2;
      let y = 20;

      // ── Helper functions ──
      const hexToRgb = (hex: string): [number, number, number] => {
        const h = hex.replace('#', '');
        return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
      };
      const setColor = (hex: string) => { pdf.setTextColor(...hexToRgb(hex)); };
      const drawRect = (x: number, yy: number, w: number, h: number, hex: string) => {
        pdf.setFillColor(...hexToRgb(hex));
        pdf.rect(x, yy, w, h, 'F');
      };
      const drawLine = (yy: number) => {
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineDashPattern([2, 2], 0);
        pdf.line(margin, yy, pw - margin, yy);
        pdf.setLineDashPattern([], 0);
      };

      // ── Header band ──
      drawRect(margin, y, contentW, 28, '#06b6d4');
      setColor('#ffffff');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('RECIBO DE ENVÍO', margin + 6, y + 7);
      // ENVIADO badge
      drawRect(margin + contentW - 30, y + 3, 24, 6, '#ffffff');
      setColor('#06b6d4');
      pdf.setFontSize(7);
      pdf.text('ENVIADO', margin + contentW - 28, y + 7.2);
      // Order number
      setColor('#ffffff');
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(pedido.numero, margin + 6, y + 17);
      // Date
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatDateTime(pedido.updatedAt), margin + 6, y + 23);
      y += 34;

      // ── Client section ──
      drawLine(y); y += 6;
      setColor('#9ca3af');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CLIENTE', margin, y);
      y += 6;
      // Avatar circle
      drawRect(margin, y - 3, 8, 8, '#06b6d4');
      setColor('#ffffff');
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(pedido.clienteNombre.charAt(0).toUpperCase(), margin + 2.5, y + 2.5);
      // Name
      setColor('#111827');
      pdf.setFontSize(10);
      pdf.text(pedido.clienteNombre, margin + 12, y + 1);
      // Contact info
      const contactParts: string[] = [];
      if (pedido.clienteEmail) contactParts.push(pedido.clienteEmail);
      if (pedido.clienteTelefono) contactParts.push(pedido.clienteTelefono);
      if (contactParts.length > 0) {
        setColor('#6b7280');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(contactParts.join('  •  '), margin + 12, y + 5.5);
      }
      y += 14;

      // ── Products section ──
      drawLine(y); y += 6;
      setColor('#9ca3af');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PRODUCTOS', margin, y);
      y += 6;

      pedido.lineas.forEach((linea) => {
        // Check for page break
        if (y > 260) { pdf.addPage(); y = 20; }
        // Product name
        setColor('#111827');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        const nameText = linea.productoNombre.length > 45
          ? linea.productoNombre.substring(0, 42) + '...'
          : linea.productoNombre;
        pdf.text(nameText, margin, y);
        // Subtotal right-aligned
        pdf.text(formatCurrency(linea.subtotal), pw - margin, y, { align: 'right' });
        y += 4;
        // Variation
        if (linea.variacionNombre) {
          setColor('#9ca3af');
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.text(linea.variacionNombre, margin, y);
          y += 3.5;
        }
        // Qty x unit price
        setColor('#9ca3af');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${linea.cantidad} × ${formatCurrency(linea.precioUnitario)}`, margin, y);
        y += 6;
      });

      // ── Totals section ──
      drawLine(y); y += 6;
      setColor('#4b5563');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Subtotal (${cantidadTotal} unidades)`, margin, y);
      pdf.text(formatCurrency(pedido.subtotal), pw - margin, y, { align: 'right' });
      y += 5;

      if (pedido.impuestos > 0) {
        pdf.text('Impuestos', margin, y);
        pdf.text(formatCurrency(pedido.impuestos), pw - margin, y, { align: 'right' });
        y += 5;
      }

      // Total line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineDashPattern([], 0);
      pdf.line(margin, y, pw - margin, y);
      y += 5;
      setColor('#111827');
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total', margin, y);
      pdf.text(formatCurrency(pedido.total), pw - margin, y, { align: 'right' });
      y += 8;

      // ── Notes ──
      if (pedido.notas) {
        drawLine(y); y += 6;
        setColor('#9ca3af');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text('NOTAS', margin, y);
        y += 5;
        setColor('#4b5563');
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        const splitNotes = pdf.splitTextToSize(pedido.notas, contentW);
        pdf.text(splitNotes, margin, y);
        y += splitNotes.length * 4 + 4;
      }

      // ── Footer ──
      drawLine(y); y += 6;
      setColor('#9ca3af');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      const today = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
      pdf.text(`Recibo generado el ${today}`, margin, y);
      setColor('#06b6d4');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text('✓ Enviado', pw - margin, y, { align: 'right' });

      pdf.save(`recibo-${pedido.numero}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  };

  const getRingColor = (paso: string) => {
    const colors: Record<string, string> = {
      cotizado: 'ring-blue-500',
      transmitido: 'ring-purple-500',
      en_curso: 'ring-amber-500',
      enviado: 'ring-cyan-500',
    };
    return colors[paso] || 'ring-gray-500';
  };

  // ── Estado color helpers ──────────────────────────────────────────
  const statusBorderColor: Record<string, string> = {
    cotizado: 'border-l-blue-500',
    transmitido: 'border-l-purple-500',
    en_curso: 'border-l-amber-500',
    enviado: 'border-l-cyan-500',
    pagado: 'border-l-green-500',
    cancelado: 'border-l-red-500',
  };
  const statusDotColor: Record<string, string> = {
    cotizado: 'bg-blue-500',
    transmitido: 'bg-purple-500',
    en_curso: 'bg-amber-500',
    enviado: 'bg-cyan-500',
    pagado: 'bg-green-500',
    cancelado: 'bg-red-500',
  };
  const cfdiLabel =
    cfdiStatus?.invoiceStatus === 'facturado' ? { text: 'Facturado', cls: 'bg-green-100 text-green-700' } :
    cfdiStatus?.invoiceStatus === 'en_proceso' ? { text: 'En proceso', cls: 'bg-yellow-100 text-yellow-700' } :
    cfdiStatus?.invoiceStatus === 'cancelado'  ? { text: 'CFDI Cancelado', cls: 'bg-red-100 text-red-700' } :
    { text: 'Sin facturar', cls: 'bg-gray-100 text-gray-500' };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" title="" noPadding>
      {/* ── Shell ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col h-full">

        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <div className={`flex items-center justify-between px-6 py-4 border-b-4 border-b-transparent border-l-4 ${statusBorderColor[pedido.estado]} bg-white`}>
          <div className="flex items-center gap-4">
            {/* Avatar inicial */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0 ${statusDotColor[pedido.estado]}`}>
              {pedido.clienteNombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 font-mono tracking-tight">{pedido.numero}</h2>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isCancelled ? 'bg-red-100 text-red-700' : `bg-opacity-10 ${config.textColor}`
                }`}
                  style={{ backgroundColor: isCancelled ? undefined : 'transparent', border: '1px solid currentColor', opacity: 1 }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor[pedido.estado]}`} />
                  {config.label}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfdiLabel.cls}`}>
                  {cfdiLabel.text}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />{pedido.clienteNombre}
                </span>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />{formatDateTime(pedido.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Tab pills — only when enviado */}
          {isEnviado && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('detalle')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'detalle' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Detalle
              </button>
              <button
                onClick={() => setActiveTab('recibo')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'recibo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <TicketCheck className="w-3.5 h-3.5" />
                Recibo
              </button>
            </div>
          )}
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        {isEnviado && activeTab === 'recibo' ? (
          /* ── RECIBO VIEW ─────────────────────────────────────────────── */
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div ref={receiptRef} className="max-w-lg mx-auto bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">
              <div className="bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-5 text-white">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <TicketCheck className="w-5 h-5 text-white/80" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-white/80">Recibo de Envío</span>
                  </div>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">ENVIADO</span>
                </div>
                <p className="text-2xl font-bold tracking-tight">{pedido.numero}</p>
                <p className="text-sm text-white/70 mt-0.5">{formatDateTime(pedido.updatedAt)}</p>
              </div>
              <div className="relative">
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full border border-gray-200" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50 rounded-full border border-gray-200" />
                <div className="mx-4 border-t-2 border-dashed border-gray-200" />
              </div>
              <div className="px-6 py-4 border-b border-dashed border-gray-200">
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-2">Cliente</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {pedido.clienteNombre.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{pedido.clienteNombre}</p>
                    <div className="flex flex-wrap gap-x-3 mt-0.5">
                      {pedido.clienteEmail && (
                        <span className="flex items-center gap-1 text-xs text-gray-500"><Mail className="w-3 h-3" />{pedido.clienteEmail}</span>
                      )}
                      {pedido.clienteTelefono && (
                        <span className="flex items-center gap-1 text-xs text-gray-500"><Phone className="w-3 h-3" />{pedido.clienteTelefono}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-b border-dashed border-gray-200 space-y-2">
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-3">Productos</p>
                {pedido.lineas.map((linea) => (
                  <div key={linea.id} className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{linea.productoNombre}</p>
                      {linea.variacionNombre && <p className="text-xs text-gray-400">{linea.variacionNombre}</p>}
                      <p className="text-xs text-gray-400">{linea.cantidad} × {formatCurrency(linea.precioUnitario)}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 flex-shrink-0">{formatCurrency(linea.subtotal)}</p>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-b border-dashed border-gray-200 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal ({cantidadTotal} unidades)</span>
                  <span>{formatCurrency(pedido.subtotal)}</span>
                </div>
                {pedido.impuestos > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Impuestos</span>
                    <span>{formatCurrency(pedido.impuestos)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200 mt-1">
                  <span>Total</span>
                  <span>{formatCurrency(pedido.total)}</span>
                </div>
              </div>
              {pedido.notas && (
                <div className="px-6 py-4 border-b border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-1">Notas</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{pedido.notas}</p>
                </div>
              )}
              <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span>Generado el {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />Enviado
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── DETALLE VIEW ────────────────────────────────────────────── */
          <div className="flex-1 flex min-h-0">

            {/* ── Left sidebar ───────────────────────────────────────────── */}
            <div className="w-64 flex-shrink-0 border-r border-gray-100 bg-gray-50/60 flex flex-col overflow-y-auto">

              {/* Client card */}
              <div className="p-4 border-b border-gray-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Cliente</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {pedido.clienteNombre.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{pedido.clienteNombre}</p>
                    <p className="text-xs text-gray-400">Cliente registrado</p>
                  </div>
                </div>
                {(pedido.clienteEmail || pedido.clienteTelefono) && (
                  <div className="mt-3 space-y-1.5">
                    {pedido.clienteEmail && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Mail className="w-3 h-3 flex-shrink-0 text-gray-400" />
                        <span className="truncate">{pedido.clienteEmail}</span>
                      </div>
                    )}
                    {pedido.clienteTelefono && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Phone className="w-3 h-3 flex-shrink-0 text-gray-400" />
                        <span>{pedido.clienteTelefono}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Summary stats */}
              <div className="p-4 border-b border-gray-100 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Resumen</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-gray-400" />Productos
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{pedido.lineas.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-gray-400" />Unidades
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{cantidadTotal}</span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Total</span>
                    <span className="text-base font-bold text-gray-900">{formatCurrency(pedido.total)}</span>
                  </div>
                  {pedido.subtotal !== pedido.total && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">Subtotal</span>
                      <span className="text-xs text-gray-500">{formatCurrency(pedido.subtotal)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dates & transmission */}
              <div className="p-4 border-b border-gray-100 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Información</p>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-medium flex items-center gap-1 mb-0.5">
                    <Clock className="w-3 h-3" />Creado
                  </span>
                  <p className="text-xs font-medium text-gray-700">{formatDateTime(pedido.createdAt)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-medium flex items-center gap-1 mb-0.5">
                    <Clock className="w-3 h-3" />Actualizado
                  </span>
                  <p className="text-xs font-medium text-gray-700">{formatDateTime(pedido.updatedAt)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-medium flex items-center gap-1 mb-0.5">
                    <Truck className="w-3 h-3" />Transmisión
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${pedido.transmitido ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={`text-xs font-medium ${pedido.transmitido ? 'text-green-700' : 'text-gray-500'}`}>
                      {pedido.transmitido ? 'Transmitido' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {pedido.notas && (
                <div className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Notas</p>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{pedido.notas}</p>
                </div>
              )}
            </div>

            {/* ── Main content ───────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

              {/* Status stepper */}
              {!isCancelled ? (
                <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-0">
                    {pasos.map((paso, index) => {
                      const pasoConfig = estadoConfig[paso];
                      const isActive = pasoConfig.step <= config.step;
                      const isCurrent = paso === pedido.estado;
                      const PasoIcon = pasoConfig.icon;
                      return (
                        <div key={paso} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              isCurrent
                                ? pasoConfig.color + ' text-white ring-4 ring-offset-1 ring-opacity-20 ' + getRingColor(paso)
                                : isActive
                                  ? pasoConfig.color + ' text-white'
                                  : 'bg-gray-100 text-gray-300'
                            }`}>
                              {isActive && !isCurrent
                                ? <CheckCircle2 className="w-4 h-4" />
                                : <PasoIcon className="w-4 h-4" />}
                            </div>
                            <span className={`text-[10px] mt-1.5 font-medium whitespace-nowrap ${
                              isCurrent ? pasoConfig.textColor : isActive ? 'text-gray-600' : 'text-gray-300'
                            }`}>
                              {pasoConfig.label}
                            </span>
                          </div>
                          {index < pasos.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-colors ${
                              estadoConfig[pasos[index + 1]].step <= config.step ? 'bg-green-300' : 'bg-gray-150 bg-gray-100'
                            }`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="px-6 py-3 bg-red-50 border-b border-red-100">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Este pedido ha sido cancelado</span>
                  </div>
                </div>
              )}

              {/* Products table — scrollable area */}
              <div className="flex-1 overflow-y-auto min-h-0 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-500" />
                    Productos del pedido
                  </h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {pedido.lineas.length} {pedido.lineas.length === 1 ? 'ítem' : 'ítems'}
                  </span>
                </div>

                {pedido.lineas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-300 border border-dashed border-gray-200 rounded-xl">
                    <Package className="w-8 h-8 mb-2" />
                    <p className="text-sm">Sin productos</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 w-8">#</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Producto</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 w-20">Cant.</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 w-28">P. Unit.</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 w-28">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pedido.lineas.map((linea, index) => (
                          <tr key={linea.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3 text-xs text-gray-400 font-mono">{index + 1}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 text-sm leading-tight">{linea.productoNombre}</p>
                              {linea.variacionNombre && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-[11px] text-gray-500 mt-0.5">
                                  {linea.variacionNombre}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-6 rounded bg-gray-100 text-xs font-semibold text-gray-700">
                                {linea.cantidad}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-600">
                              {formatCurrency(linea.precioUnitario)}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                              {formatCurrency(linea.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        {pedido.subtotal !== pedido.total && (
                          <tr className="border-t border-gray-100 bg-gray-50/50">
                            <td colSpan={4} className="px-4 py-2.5 text-right text-xs text-gray-500">Subtotal</td>
                            <td className="px-4 py-2.5 text-right text-sm text-gray-700">{formatCurrency(pedido.subtotal)}</td>
                          </tr>
                        )}
                        {pedido.impuestos > 0 && (
                          <tr className="bg-gray-50/50">
                            <td colSpan={4} className="px-4 py-2.5 text-right text-xs text-gray-500">Impuestos</td>
                            <td className="px-4 py-2.5 text-right text-sm text-gray-700">{formatCurrency(pedido.impuestos)}</td>
                          </tr>
                        )}
                        <tr className="border-t border-gray-200 bg-gray-50">
                          <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                            Total — {cantidadTotal} unidades
                          </td>
                          <td className="px-4 py-3 text-right text-base font-bold text-gray-900">
                            {formatCurrency(pedido.total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            {isEnviado && activeTab === 'recibo' ? (
              <>
                <Button variant="outline" size="sm" className="flex items-center gap-1.5" onClick={handlePrintReceipt}>
                  <Printer className="w-3.5 h-3.5" />Imprimir
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1.5" onClick={handleDownloadPdf} disabled={isDownloading}>
                  <Download className="w-3.5 h-3.5" />
                  {isDownloading ? 'Generando...' : 'Descargar PDF'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" />Imprimir
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />Exportar
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cerrar
            </Button>
            {isEditable && (
              <Button size="sm" onClick={handleEdit} className="flex items-center gap-1.5">
                <Edit className="w-3.5 h-3.5" />
                Editar Pedido
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
            {(isEnviado || pedido.estado === 'pagado') && onEmitirCFDI && (
              <Button
                size="sm"
                onClick={() => onEmitirCFDI(pedido)}
                disabled={cfdiStatus?.invoiceStatus === 'facturado'}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Receipt className="w-3.5 h-3.5" />
                {cfdiStatus?.invoiceStatus === 'facturado' ? 'Facturado' : 'Emitir CFDI'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );

}