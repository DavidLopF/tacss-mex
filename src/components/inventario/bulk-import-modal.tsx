'use client';

/**
 * BulkImportModal
 * Modal de cargue masivo de productos vía Excel (.xlsx).
 *
 * Flujo:
 *  1. El usuario descarga el template o arrastra un Excel.
 *  2. Se parsea con SheetJS en el cliente.
 *  3. Se muestra preview de filas con validación básica.
 *  4. Al confirmar, se envía a POST /api/products/bulk-import.
 *  5. Se muestran los resultados (creados / errores).
 */

import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, X, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { bulkImportProducts } from '@/services/products';

// ── Columnas del template ────────────────────────────────────────────────────
const TEMPLATE_HEADERS = [
  'Nombre',
  'SKU',
  'Precio',
  'Categoria',
  'Descripcion',
  'NombreVariante',
  'Barcode',
  'Stock',
  'Moneda',
  'RequiereIVA',
];

interface ParsedRow {
  name: string;
  sku: string;
  defaultPrice: number;
  categoryName: string;
  description?: string;
  variantName?: string;
  barcode?: string;
  stock?: number;
  currency?: string;
  requiresIva?: boolean;
  _rowIndex: number;
  _error?: string;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (created: number) => void;
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: { sku: string; reason: string }[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // ── Descargar template ───────────────────────────────────────────────────
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const exampleRow = [
      'Producto Ejemplo', 'SKU-001', 100.00, 'Categoria A',
      'Descripción opcional', 'Variante 1', '', 50, 'MXN', 'NO',
    ];
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, exampleRow]);
    ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    XLSX.writeFile(wb, 'template_cargue_masivo.xlsx');
  };

  // ── Parsear archivo ──────────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];

      const dataRows = raw.slice(1).filter((r) => r.some((c) => c !== '' && c !== undefined));

      const parsed: ParsedRow[] = dataRows.map((row, i) => {
        const [nombre, sku, precio, categoria, desc, variante, barcode, stock, moneda, iva] = row;
        const errors: string[] = [];

        if (!nombre) errors.push('Nombre requerido');
        if (!sku) errors.push('SKU requerido');
        const price = parseFloat(String(precio));
        if (isNaN(price) || price < 0) errors.push('Precio inválido');
        if (!categoria) errors.push('Categoría requerida');

        return {
          name: String(nombre ?? ''),
          sku: String(sku ?? ''),
          defaultPrice: isNaN(price) ? 0 : price,
          categoryName: String(categoria ?? ''),
          description: desc ? String(desc) : undefined,
          variantName: variante ? String(variante) : undefined,
          barcode: barcode ? String(barcode) : undefined,
          stock: stock !== undefined && stock !== '' ? parseInt(String(stock)) : undefined,
          currency: moneda ? String(moneda) : 'MXN',
          requiresIva: String(iva ?? '').toLowerCase() === 'si' || String(iva ?? '').toLowerCase() === 'yes',
          _rowIndex: i + 2,
          _error: errors.length > 0 ? errors.join(', ') : undefined,
        };
      });

      setRows(parsed);
      setResult(null);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('Solo se aceptan archivos Excel (.xlsx, .xls)');
      return;
    }
    parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── Enviar ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const validRows = rows.filter((r) => !r._error);
    if (validRows.length === 0) return;

    setLoading(true);
    try {
      const res = await bulkImportProducts(
        validRows.map(({ _rowIndex, _error, ...r }) => r),
      );
      setResult(res);
      if (res.created > 0) onSuccess?.(res.created);
    } catch (err) {
      console.error('Error en bulk import:', err);
      alert('Error al enviar los datos al servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const validRows = rows.filter((r) => !r._error);
  const invalidRows = rows.filter((r) => r._error);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Cargue masivo de productos</h2>
              <p className="text-xs text-gray-500">Importa múltiples productos desde un archivo Excel</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Descarga el template</p>
                <p className="text-xs text-blue-600">Usa el formato correcto con todas las columnas requeridas</p>
              </div>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar template
            </button>
          </div>

          {/* Drop zone */}
          {rows.length === 0 && !result && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">Arrastra tu Excel aquí o haz clic para seleccionar</p>
              <p className="text-xs text-gray-400 mt-1">Soporta .xlsx y .xls</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
            </div>
          )}

          {/* Preview de filas */}
          {rows.length > 0 && !result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">{rows.length} filas encontradas</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{validRows.length} válidas</span>
                  {invalidRows.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{invalidRows.length} con errores</span>
                  )}
                </div>
                <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-700 underline">
                  Cambiar archivo
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100 max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">#</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Nombre</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">SKU</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Precio</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Categoría</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Stock</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row) => (
                      <tr key={row._rowIndex} className={row._error ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 text-gray-400">{row._rowIndex}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{row.name || '—'}</td>
                        <td className="px-3 py-2 font-mono text-gray-600">{row.sku || '—'}</td>
                        <td className="px-3 py-2 text-gray-900">${row.defaultPrice.toFixed(2)}</td>
                        <td className="px-3 py-2 text-gray-600">{row.categoryName || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{row.stock ?? 0}</td>
                        <td className="px-3 py-2">
                          {row._error ? (
                            <span className="text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              {row._error}
                            </span>
                          ) : (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="space-y-3">
              <div className={`rounded-xl p-4 flex items-start gap-3 ${result.created > 0 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                {result.created > 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {result.created} producto(s) importados exitosamente
                  </p>
                  {result.errors.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">{result.errors.length} fila(s) con errores</p>
                  )}
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-red-100 max-h-48">
                  <table className="w-full text-xs">
                    <thead className="bg-red-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-red-700 font-medium">SKU</th>
                        <th className="text-left px-3 py-2 text-red-700 font-medium">Motivo del error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50">
                      {result.errors.map((e) => (
                        <tr key={e.sku}>
                          <td className="px-3 py-2 font-mono text-gray-700">{e.sku}</td>
                          <td className="px-3 py-2 text-red-600">{e.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            {result ? 'Cerrar' : 'Cancelar'}
          </button>
          {!result && rows.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={loading || validRows.length === 0}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importando...
                </>
              ) : (
                `Importar ${validRows.length} producto(s)`
              )}
            </button>
          )}
          {result && (
            <button
              onClick={reset}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nuevo cargue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
