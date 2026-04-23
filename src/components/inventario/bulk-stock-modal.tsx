'use client';

/**
 * BulkStockModal
 * Ajuste masivo de existencias por medio de OC (Orden de Compra interna).
 *
 * Flujo:
 *  1. El usuario descarga el template Excel.
 *  2. Carga el archivo con SKU | Cantidad | Tipo (set/increment).
 *  3. Preview con validación.
 *  4. Envío a POST /api/products/bulk-stock-oc.
 *  5. Resultado con filas exitosas / errores.
 */

import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { BarChart2, Download, Upload, X, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { bulkStockFromOC } from '@/services/products';

const TEMPLATE_HEADERS = ['SKU', 'Cantidad', 'TipoAjuste'];
const TIPO_OPTIONS = ['set', 'increment'];

interface ParsedRow {
  sku: string;
  qty: number;
  adjustmentType: 'set' | 'increment';
  _rowIndex: number;
  _error?: string;
}

interface BulkStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updated: number) => void;
}

export function BulkStockModal({ isOpen, onClose, onSuccess }: BulkStockModalProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ updated: number; errors: { sku: string; reason: string }[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setRows([]); setResult(null); };
  const handleClose = () => { reset(); onClose(); };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const example = [['SKU-001', 100, 'set'], ['SKU-002', 25, 'increment']];
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...example]);
    const notes = XLSX.utils.aoa_to_sheet([
      ['Instrucciones:'],
      ['TipoAjuste = "set" → establece el stock al valor indicado'],
      ['TipoAjuste = "increment" → suma la cantidad al stock actual'],
    ]);
    ws['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Ajuste Stock');
    XLSX.utils.book_append_sheet(wb, notes, 'Instrucciones');
    XLSX.writeFile(wb, 'template_ajuste_stock_oc.xlsx');
  };

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];
      const dataRows = raw.slice(1).filter((r) => r.some((c) => c !== '' && c !== undefined));

      const parsed: ParsedRow[] = dataRows.map((row, i) => {
        const [sku, cantidadRaw, tipoRaw] = row;
        const errors: string[] = [];
        const qty = parseFloat(String(cantidadRaw));
        const tipo = String(tipoRaw ?? '').toLowerCase().trim() as 'set' | 'increment';

        if (!sku) errors.push('SKU requerido');
        if (isNaN(qty) || qty < 0) errors.push('Cantidad inválida');
        if (!TIPO_OPTIONS.includes(tipo)) errors.push('TipoAjuste debe ser "set" o "increment"');

        return {
          sku: String(sku ?? '').trim(),
          qty: isNaN(qty) ? 0 : qty,
          adjustmentType: TIPO_OPTIONS.includes(tipo) ? tipo : 'set',
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
    if (!file.name.match(/\.(xlsx|xls)$/i)) { alert('Solo se aceptan archivos Excel'); return; }
    parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSubmit = async () => {
    const validRows = rows.filter((r) => !r._error);
    if (validRows.length === 0) return;
    setLoading(true);
    try {
      const res = await bulkStockFromOC(
        validRows.map(({ _rowIndex, _error, ...r }) => r),
      );
      setResult(res);
      if (res.updated > 0) onSuccess?.(res.updated);
    } catch (err) {
      console.error('Error en bulk-stock-oc:', err);
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Ajuste de existencias por OC</h2>
              <p className="text-xs text-gray-500">Carga masiva de stock vía archivo Excel</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Template */}
          <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-900">Descarga el template de ajuste de stock</p>
                <p className="text-xs text-emerald-600">Columnas: SKU | Cantidad | TipoAjuste (set / increment)</p>
              </div>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar
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
                dragging ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
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

          {/* Preview */}
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
                <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-700 underline">Cambiar archivo</button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-100 max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">#</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">SKU</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Cantidad</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Tipo</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row) => (
                      <tr key={row._rowIndex} className={row._error ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 text-gray-400">{row._rowIndex}</td>
                        <td className="px-3 py-2 font-mono text-gray-900">{row.sku || '—'}</td>
                        <td className="px-3 py-2 text-gray-900">{row.qty}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.adjustmentType === 'increment'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {row.adjustmentType === 'increment' ? '+ Incremento' : '= Establecer'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {row._error ? (
                            <span className="text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              {row._error}
                            </span>
                          ) : (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> OK
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
              <div className={`rounded-xl p-4 flex items-start gap-3 ${result.updated > 0 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                {result.updated > 0
                  ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  : <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {result.updated} SKU(s) actualizados exitosamente
                  </p>
                  {result.errors.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">{result.errors.length} con errores</p>
                  )}
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-red-100 max-h-40">
                  <table className="w-full text-xs">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-red-700">SKU</th>
                        <th className="text-left px-3 py-2 text-red-700">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((e) => (
                        <tr key={e.sku}>
                          <td className="px-3 py-2 font-mono">{e.sku}</td>
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
              className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Aplicando...
                </>
              ) : (
                `Aplicar ajuste a ${validRows.length} SKU(s)`
              )}
            </button>
          )}
          {result && (
            <button onClick={reset} className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
              Nuevo ajuste
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
