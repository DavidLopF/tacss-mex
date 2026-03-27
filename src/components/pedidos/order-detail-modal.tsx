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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" title="">
      <div className="flex flex-col max-h-[90vh]">
        <div className={`relative px-8 py-6 ${isCancelled ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
          <div className="flex items-start justify-between pr-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Receipt className="w-6 h-6 text-white/80" />
                <h2 className="text-2xl font-bold text-white">{pedido.numero}</h2>
              </div>
              <div className="flex items-center gap-4 text-white/80 text-sm">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDateTime(pedido.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {pedido.clienteNombre}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                <IconEstado className="w-4 h-4 text-white" />
                <span className="font-semibold text-white text-sm">{config.label}</span>
              </div>
              
              {/* CFDI Status Badge */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <Receipt className="w-3 h-3 text-white/70" />
                <span className="font-semibold text-white/80 text-xs">
                  {cfdiStatus?.invoiceStatus === 'facturado' ? '✓ Facturado' : 
                   cfdiStatus?.invoiceStatus === 'en_proceso' ? '⏳ En proceso' :
                   cfdiStatus?.invoiceStatus === 'cancelado' ? '✗ Cancelado' : '📄 Sin facturar'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {!isCancelled && (
          <div className="px-8 py-5 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center">
              {pasos.map((paso, index) => {
                const pasoConfig = estadoConfig[paso];
                const isActive = pasoConfig.step <= config.step;
                const isCurrent = paso === pedido.estado;
                const PasoIcon = pasoConfig.icon;
                
                const circleClass = isCurrent 
                  ? pasoConfig.color + ' text-white ring-4 ring-offset-2 ring-opacity-30 ' + getRingColor(paso)
                  : isActive 
                    ? pasoConfig.color + ' text-white'
                    : 'bg-gray-200 text-gray-400';
                
                return (
                  <div key={paso} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center min-w-[70px]">
                      <div className={'w-10 h-10 rounded-full flex items-center justify-center transition-all ' + circleClass}>
                        {isActive && !isCurrent ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <PasoIcon className="w-5 h-5" />
                        )}
                      </div>
                      <span className={'text-xs mt-2 font-medium ' + (isCurrent ? pasoConfig.textColor : isActive ? 'text-gray-700' : 'text-gray-400')}>
                        {pasoConfig.label}
                      </span>
                    </div>
                    
                    {index < pasos.length - 1 && (
                      <div className={'flex-1 h-1 rounded ' + (estadoConfig[pasos[index + 1]].step <= config.step ? 'bg-green-400' : 'bg-gray-200')} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="px-8 py-3 bg-red-50 border-b border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Este pedido ha sido cancelado</span>
            </div>
          </div>
        )}

        {/* Tabs — only show recibo tab when enviado */}
        {isEnviado && (
          <div className="flex border-b border-gray-200 bg-white">
            <button
              onClick={() => setActiveTab('detalle')}
              className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'detalle'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Detalle
            </button>
            <button
              onClick={() => setActiveTab('recibo')}
              className={`px-6 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'recibo'
                  ? 'border-cyan-600 text-cyan-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <TicketCheck className="w-4 h-4" />
              Recibo de envío
            </button>
          </div>
        )}

        {/* RECIBO TAB */}
        {isEnviado && activeTab === 'recibo' ? (
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
            {/* Receipt card */}
            <div ref={receiptRef} className="max-w-lg mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              {/* Header stripe */}
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

              {/* Dashed separator */}
              <div className="relative">
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-100 rounded-full border border-gray-200" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-100 rounded-full border border-gray-200" />
                <div className="mx-4 border-t-2 border-dashed border-gray-200 my-0" />
              </div>

              {/* Client info */}
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
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail className="w-3 h-3" />{pedido.clienteEmail}
                        </span>
                      )}
                      {pedido.clienteTelefono && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="w-3 h-3" />{pedido.clienteTelefono}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Line items */}
              <div className="px-6 py-4 border-b border-dashed border-gray-200 space-y-2">
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-3">Productos</p>
                {pedido.lineas.map((linea) => (
                  <div key={linea.id} className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{linea.productoNombre}</p>
                      {linea.variacionNombre && (
                        <p className="text-xs text-gray-400">{linea.variacionNombre}</p>
                      )}
                      <p className="text-xs text-gray-400">{linea.cantidad} × {formatCurrency(linea.precioUnitario)}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 flex-shrink-0">{formatCurrency(linea.subtotal)}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
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

              {/* Notes */}
              {pedido.notas && (
                <div className="px-6 py-4 border-b border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-1">Notas</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{pedido.notas}</p>
                </div>
              )}

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span>Recibo generado el {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Enviado
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Productos</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{pedido.lineas.length}</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Hash className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Unidades</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{cantidadTotal}</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200 col-span-2">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <Receipt className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Total del Pedido</span>
              </div>
              <p className="text-3xl font-bold text-green-900">{formatCurrency(pedido.total)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button 
              onClick={() => setIsClientOpen(!isClientOpen)}
              className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Cliente
              </h3>
              {isClientOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {isClientOpen && (
              <div className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                    {pedido.clienteNombre.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{pedido.clienteNombre}</p>
                    <p className="text-sm text-gray-500">Cliente registrado</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button 
              onClick={() => setIsProductsOpen(!isProductsOpen)}
              className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-600" />
                Detalle de Productos
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  {pedido.lineas.length} {pedido.lineas.length === 1 ? 'item' : 'items'}
                </Badge>
                {isProductsOpen ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </button>
            
            {isProductsOpen && (
              <>
                <div className="divide-y divide-gray-100">
                  {pedido.lineas.map((linea, index) => (
                <div key={linea.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500 flex-shrink-0">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{linea.productoNombre}</p>
                      {linea.variacionNombre && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600 mt-1">
                          {linea.variacionNombre}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">{formatCurrency(linea.precioUnitario)}</span>
                        <span>x</span>
                        <span className="font-medium">{linea.cantidad}</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        {formatCurrency(linea.subtotal)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="px-4 py-4 bg-gradient-to-r from-gray-800 to-gray-900">
              <div className="flex items-center justify-between">
                <div className="text-gray-300">
                  <p className="text-sm">Subtotal</p>
                  <p className="text-xs text-gray-400 mt-0.5">{cantidadTotal} unidades</p>
                </div>
                <p className="text-2xl font-bold text-white">{formatCurrency(pedido.total)}</p>
              </div>
            </div>
              </>
            )}
          </div>

          {pedido.notas && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <h3 className="font-semibold text-amber-900 flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-amber-600" />
                Notas del Pedido
              </h3>
              <p className="text-sm text-amber-800 whitespace-pre-wrap">{pedido.notas}</p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button 
              onClick={() => setIsInfoOpen(!isInfoOpen)}
              className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                Información del Pedido
              </h3>
              {isInfoOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {isInfoOpen && (
              <div className="grid grid-cols-2 gap-4 p-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase">Ultima actualizacion</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{formatDateTime(pedido.updatedAt)}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Truck className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase">Transmision</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pedido.transmitido ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-green-700">Transmitido</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-600">Pendiente</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            {isEnviado && activeTab === 'recibo' ? (
              <>
                <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={handlePrintReceipt}>
                  <Printer className="w-4 h-4" />
                  Imprimir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                >
                  <Download className="w-4 h-4" />
                  {isDownloading ? 'Generando PDF...' : 'Descargar PDF'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  Imprimir
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Exportar
                </Button>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {isEditable && (
              <Button onClick={handleEdit} className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Editar Pedido
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            {(isEnviado || pedido.estado === 'pagado') && onEmitirCFDI && (
              <Button
                onClick={() => onEmitirCFDI(pedido)}
                disabled={cfdiStatus?.invoiceStatus === 'facturado'}
                className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Receipt className="w-4 h-4" />
                {cfdiStatus?.invoiceStatus === 'facturado' ? 'Facturado' : 'Emitir CFDI'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );

}