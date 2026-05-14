/**
 * export-pedido.ts
 * ────────────────────────────────────────────────────────────────────
 * Utilidades para exportar un Pedido como PDF o Excel.
 *
 * Dependencias ya instaladas:
 *   - jspdf   ^4.2.0  →  exportPedidoPDF
 *   - xlsx    ^0.18.5 →  exportPedidoExcel
 *
 * Ambas funciones son async y hacen dynamic import para que el bundle
 * principal no cargue las librerías hasta que el usuario las necesite.
 */

import type { Pedido } from '@/types';
import { formatCurrency } from '@/lib/utils';

// ─── Helpers internos ─────────────────────────────────────────────────────────

type RgbTuple = [number, number, number];

const hexToRgb = (hex: string): RgbTuple => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
};

const formatDateMX = (date: Date | string) =>
  new Date(date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const formatDateLongMX = (date: Date | string) =>
  new Date(date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

// ─── PDF ──────────────────────────────────────────────────────────────────────

/**
 * Genera y descarga un PDF con el detalle del pedido.
 * Diseño tipo "documento comercial genérico" (sin logos ni datos fiscales).
 *
 * Layout:
 *   ┌──────────────────────────────┬────────────────┐
 *   │  PEDIDO DE VENTA             │  PEDIDO [NUM]  │
 *   │  Documento interno           ├────────────────┤
 *   │                              │  FECHA [fecha] │
 *   └──────────────────────────────┴────────────────┘
 *   CLIENTE: [nombre]  [email] · [tel]
 *   ┌──────┬────────┬────────────────────────┬──────────┬──────────┐
 *   │CANT. │ UNIDAD │ DESCRIPCIÓN            │ P. UNIT. │ IMPORTE  │
 *   ├──────┼────────┼────────────────────────┼──────────┼──────────┤
 *   │  ...                                                         │
 *   └──────────────────────────────────────────────────────────────┘
 *                              Subtotal  $x,xxx.xx
 *                              IVA 16%   $x,xxx.xx
 *                              ─────────────────────
 *                    ╔══════════════════════════════╗
 *                    ║  TOTAL          $x,xxx.xx    ║
 *                    ╚══════════════════════════════╝
 */
export async function exportPedidoPDF(pedido: Pedido): Promise<void> {
  const { default: jsPDF } = await import('jspdf');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth();   // 210 mm
  const ph = pdf.internal.pageSize.getHeight();  // 297 mm
  const M  = 18;                                 // margin
  const CW = pw - M * 2;                         // content width = 174 mm
  let y = 15;

  // ── Helpers locales ──────────────────────────────────────────────────

  const fill = (x: number, yy: number, w: number, h: number, hex: string) => {
    pdf.setFillColor(...hexToRgb(hex));
    pdf.rect(x, yy, w, h, 'F');
  };

  const hLine = (yy: number, hex = '#d1d5db', x1 = M, x2 = pw - M) => {
    pdf.setDrawColor(...hexToRgb(hex));
    pdf.setLineWidth(0.3);
    pdf.line(x1, yy, x2, yy);
  };

  const txt = (
    text: string,
    x: number,
    yy: number,
    hex: string,
    size: number,
    bold = false,
    align: 'left' | 'center' | 'right' = 'left',
  ) => {
    pdf.setTextColor(...hexToRgb(hex));
    pdf.setFontSize(size);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.text(text, x, yy, { align });
  };

  // ── BLOQUE ENCABEZADO ────────────────────────────────────────────────
  const headerH = 28;
  const rightW  = 50;
  const leftW   = CW - rightW;
  const rightX  = M + leftW;

  // Caja izquierda — gris claro
  fill(M, y, leftW, headerH, '#f3f4f6');
  pdf.setDrawColor(...hexToRgb('#d1d5db'));
  pdf.setLineWidth(0.3);
  pdf.rect(M, y, CW, headerH, 'S');

  // Caja derecha superior — oscura (número de pedido)
  fill(rightX, y, rightW, headerH / 2, '#111827');

  // Caja derecha inferior — clara (fecha)
  fill(rightX, y + headerH / 2, rightW, headerH / 2, '#f9fafb');

  // Divisor interno derecho
  pdf.setDrawColor(...hexToRgb('#d1d5db'));
  pdf.line(rightX, y + headerH / 2, rightX + rightW, y + headerH / 2);

  // Texto caja izquierda
  txt('PEDIDO DE VENTA', M + 5, y + 10, '#111827', 14, true);
  txt('Documento interno · sin validez fiscal', M + 5, y + 17, '#6b7280', 7.5);

  // Texto caja derecha — superior
  txt('PEDIDO', rightX + rightW / 2, y + 5, '#ffffff', 7, true, 'center');
  txt(pedido.numero, rightX + rightW / 2, y + 12, '#ffffff', 11, true, 'center');

  // Texto caja derecha — inferior
  txt('FECHA', rightX + rightW / 2, y + headerH / 2 + 5, '#374151', 7, true, 'center');
  txt(formatDateMX(pedido.createdAt), rightX + rightW / 2, y + headerH / 2 + 11, '#111827', 9, false, 'center');

  y += headerH + 8;

  // ── SECCIÓN CLIENTE ──────────────────────────────────────────────────
  const clienteLabelW = 30;
  const clienteRowH = 6.5;
  fill(M, y, clienteLabelW, clienteRowH, '#111827');
  txt('CLIENTE:', M + 2, y + 4.5, '#ffffff', 7, true);

  const clienteTextX = M + clienteLabelW + 4;
  const clienteTextW = CW - clienteLabelW - 4;
  const clienteLines = pdf.splitTextToSize(pedido.clienteNombre, clienteTextW) as string[];
  txt(clienteLines[0] ?? '', clienteTextX, y + 4.5, '#111827', 10.5, true);
  y += clienteRowH + 2;

  if (clienteLines.length > 1) {
    clienteLines.slice(1).forEach((line) => {
      txt(line, clienteTextX, y + 4.5, '#111827', 10.5, true);
      y += 5;
    });
  }

  const contactParts = [pedido.clienteEmail, pedido.clienteTelefono].filter(Boolean) as string[];
  if (contactParts.length) {
    txt(contactParts.join('   ·   '), clienteTextX, y + 4.2, '#6b7280', 8);
    y += 5.2;
  }

  y += 6;

  // ── TABLA DE PRODUCTOS ───────────────────────────────────────────────
  // Columnas (suma = CW = 174 mm):
  //   Cant(18) | Unidad(18) | Descripción(74) | P.Unit(32) | Importe(32)
  const cols = [
    { x: M,       w: 18, label: 'CANTIDAD',    align: 'center' as const },
    { x: M + 18,  w: 18, label: 'UNIDAD',      align: 'center' as const },
    { x: M + 36,  w: 74, label: 'DESCRIPCIÓN', align: 'left'   as const },
    { x: M + 110, w: 32, label: 'P. UNITARIO', align: 'right'  as const },
    { x: M + 142, w: 32, label: 'IMPORTE',     align: 'right'  as const },
  ];
  const rowH = 7.5;

  // Encabezado de tabla
  fill(M, y, CW, rowH, '#111827');
  pdf.setTextColor(...hexToRgb('#ffffff'));
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  cols.forEach((c) => {
    const tx =
      c.align === 'center' ? c.x + c.w / 2 :
      c.align === 'right'  ? c.x + c.w - 2 :
                             c.x + 2;
    pdf.text(c.label, tx, y + 5, { align: c.align });
  });
  y += rowH;

  // Filas de datos
  const cantidadTotal = pedido.lineas.reduce((sum, l) => sum + l.cantidad, 0);

  pedido.lineas.forEach((linea, idx) => {
    if (y > ph - 55) {
      pdf.addPage();
      y = 20;
    }

    // Fondo alterno
    fill(M, y, CW, rowH + 0.5, idx % 2 === 0 ? '#ffffff' : '#f9fafb');

    // Borde inferior de fila
    pdf.setDrawColor(...hexToRgb('#e5e7eb'));
    pdf.setLineWidth(0.2);
    pdf.line(M, y + rowH + 0.5, M + CW, y + rowH + 0.5);

    // Cantidad
    txt(linea.cantidad.toString(), cols[0].x + cols[0].w / 2, y + 5.2, '#111827', 8.5, false, 'center');

    // Unidad
    txt('PZAS', cols[1].x + cols[1].w / 2, y + 5.2, '#9ca3af', 7.5, false, 'center');

    // Descripción (truncada a 1 línea si excede ancho)
    const desc = linea.variacionNombre
      ? `${linea.productoNombre} — ${linea.variacionNombre}`
      : linea.productoNombre;
    const descFit = pdf.splitTextToSize(desc, cols[2].w - 4)[0] as string;
    txt(descFit, cols[2].x + 2, y + 5.2, '#111827', 8.5, false, 'left');

    // Precio unitario
    txt(formatCurrency(linea.precioUnitario), cols[3].x + cols[3].w - 2, y + 5.2, '#374151', 8.5, false, 'right');

    // Importe (bold)
    txt(formatCurrency(linea.subtotal), cols[4].x + cols[4].w - 2, y + 5.2, '#111827', 8.5, true, 'right');

    y += rowH + 0.5;
  });

  // Borde exterior de tabla (completo)
  pdf.setDrawColor(...hexToRgb('#d1d5db'));
  pdf.setLineWidth(0.3);
  pdf.rect(M, y - (pedido.lineas.length * (rowH + 0.5)) - rowH, CW, pedido.lineas.length * (rowH + 0.5) + rowH, 'S');

  y += 6;

  // ── BLOQUE DE TOTALES ────────────────────────────────────────────────
  const totX = M + CW - 82;

  // Subtotal
  txt(`Subtotal (${cantidadTotal} unidades)`, totX, y, '#6b7280', 8.5);
  txt(formatCurrency(pedido.subtotal), M + CW - 2, y, '#374151', 8.5, false, 'right');
  y += 5.5;

  // IVA (solo si aplica)
  if (pedido.impuestos > 0) {
    const ivaLabel = pedido.taxRate
      ? `IVA ${(pedido.taxRate * 100).toFixed(0)}%`
      : 'IVA';
    txt(ivaLabel, totX, y, '#6b7280', 8.5);
    txt(formatCurrency(pedido.impuestos), M + CW - 2, y, '#374151', 8.5, false, 'right');
    y += 5.5;
  }

  // Línea divisoria antes del total
  hLine(y, '#9ca3af', totX - 3, M + CW);
  y += 2;

  // Caja TOTAL — fondo oscuro
  fill(totX - 3, y, 82 + 3, 10, '#111827');
  txt('TOTAL', totX, y + 7, '#ffffff', 9, true);
  txt(formatCurrency(pedido.total), M + CW - 2, y + 7, '#ffffff', 9, true, 'right');
  y += 17;

  // ── NOTAS ────────────────────────────────────────────────────────────
  if (pedido.notas) {
    if (y > ph - 50) { pdf.addPage(); y = 20; }
    hLine(y);
    y += 6;
    txt('NOTAS', M, y, '#6b7280', 7, true);
    y += 4.5;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...hexToRgb('#374151'));
    const notasLines = pdf.splitTextToSize(pedido.notas, CW) as string[];
    pdf.text(notasLines, M, y);
    y += notasLines.length * 4.5;
  }

  // ── PIE DE PÁGINA ────────────────────────────────────────────────────
  fill(M, ph - 18, CW, 0.4, '#d1d5db');
  txt(
    `Generado el ${formatDateLongMX(new Date())} · Este documento no tiene validez fiscal.`,
    M,
    ph - 11,
    '#9ca3af',
    6.5,
  );
  txt(
    pedido.estado.replace('_', ' ').toUpperCase(),
    M + CW,
    ph - 11,
    '#9ca3af',
    6.5,
    true,
    'right',
  );

  pdf.save(`pedido-${pedido.numero}.pdf`);
}

// ─── Excel ────────────────────────────────────────────────────────────────────

/**
 * Genera y descarga un archivo Excel (.xlsx) con el detalle del pedido.
 *
 * Hoja "Pedido":
 *   Fila 1–N  → encabezado con metadatos del pedido
 *   Fila N+1  → encabezados de tabla
 *   Fila N+2… → líneas de productos (valores numéricos raw para que Excel
 *                pueda calcular, filtrar y graficar)
 *   Últimas filas → totales (Subtotal, IVA, TOTAL)
 */
export async function exportPedidoExcel(pedido: Pedido): Promise<void> {
  const { utils, writeFile } = await import('xlsx');

  const wb = utils.book_new();

  // ── Filas de metadatos ───────────────────────────────────────────────
  type Row = (string | number | null)[];
  const rows: Row[] = [
    ['PEDIDO DE VENTA', null, null, null, null],
    [
      `Número: ${pedido.numero}`,
      null,
      null,
      `Fecha: ${formatDateMX(pedido.createdAt)}`,
      null,
    ],
    [
      `Cliente: ${pedido.clienteNombre}`,
      null,
      null,
      `Estado: ${pedido.estado.replace('_', ' ').toUpperCase()}`,
      null,
    ],
  ];

  if (pedido.clienteEmail)
    rows.push([`Email: ${pedido.clienteEmail}`, null, null, null, null]);
  if (pedido.clienteTelefono)
    rows.push([`Teléfono: ${pedido.clienteTelefono}`, null, null, null, null]);

  // Fila vacía separadora
  rows.push([null, null, null, null, null]);

  // ── Encabezado de tabla ──────────────────────────────────────────────
  rows.push(['#', 'Descripción', 'Cantidad', 'Precio Unitario', 'Importe']);

  // ── Líneas de productos ──────────────────────────────────────────────
  pedido.lineas.forEach((linea, i) => {
    rows.push([
      i + 1,
      linea.variacionNombre
        ? `${linea.productoNombre} — ${linea.variacionNombre}`
        : linea.productoNombre,
      linea.cantidad,
      linea.precioUnitario,   // valor numérico → Excel puede formatear
      linea.subtotal,
    ]);
  });

  // ── Totales ──────────────────────────────────────────────────────────
  const cantidadTotal = pedido.lineas.reduce((sum, l) => sum + l.cantidad, 0);
  rows.push([null, null, null, null, null]);
  rows.push([null, null, `Total unidades: ${cantidadTotal}`, 'Subtotal', pedido.subtotal]);

  if (pedido.impuestos > 0) {
    const ivaLabel = pedido.taxRate
      ? `IVA ${(pedido.taxRate * 100).toFixed(0)}%`
      : 'IVA';
    rows.push([null, null, null, ivaLabel, pedido.impuestos]);
  }

  rows.push([null, null, null, 'TOTAL', pedido.total]);

  if (pedido.notas) {
    rows.push([null, null, null, null, null]);
    rows.push([`Notas: ${pedido.notas}`, null, null, null, null]);
  }

  // ── Construir hoja ───────────────────────────────────────────────────
  const ws = utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 4  }, // #
    { wch: 55 }, // Descripción
    { wch: 12 }, // Cantidad
    { wch: 18 }, // Precio Unitario
    { wch: 18 }, // Importe
  ];

  utils.book_append_sheet(wb, ws, 'Pedido');
  writeFile(wb, `pedido-${pedido.numero}.xlsx`);
}
