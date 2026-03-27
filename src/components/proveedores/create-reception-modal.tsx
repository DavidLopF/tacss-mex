'use client';

import { useState, useEffect } from 'react';
import { Loader2, Package, AlertCircle, CheckCircle2, Warehouse } from 'lucide-react';
import { Modal, Button } from '@/src/components/ui';
import { createReception, getWarehouses } from '@/src/services/receptions';
import type { CreateReceptionDto, CreateReceptionResponse, WarehouseListItem } from '@/src/services/receptions';
import type { PurchaseOrder, PurchaseOrderItem } from '@/src/services/suppliers';
import { formatDateTime } from '@/src/lib/utils';

interface CreateReceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  onCreated?: () => void;
}

interface ReceptionLineItem {
  poItem: PurchaseOrderItem;
  selected: boolean;
  qtyToReceive: number;
  qtyPending: number;
  notes: string;
}

export function CreateReceptionModal({ isOpen, onClose, order, onCreated }: CreateReceptionModalProps) {
  const [warehouses, setWarehouses] = useState<WarehouseListItem[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [warehouseId, setWarehouseId] = useState<number | ''>('');
  const [receivedDate, setReceivedDate] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [lines, setLines] = useState<ReceptionLineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Pantalla de confirmación tras crear exitosamente
  const [confirmResult, setConfirmResult] = useState<CreateReceptionResponse | null>(null);

  // Load warehouses on mount
  useEffect(() => {
    if (!isOpen) return;
    setConfirmResult(null);
    (async () => {
      setLoadingWarehouses(true);
      try {
        const wh = await getWarehouses();
        setWarehouses(wh);
        if (wh.length === 1) setWarehouseId(wh[0].id);
      } catch {
        // allow manual input fallback
      } finally {
        setLoadingWarehouses(false);
      }
    })();
  }, [isOpen]);

  // Build line items from PO items
  useEffect(() => {
    if (!isOpen || !order) return;
    const pendingItems = order.items
      .map((item) => {
        const pending = item.qty - item.qtyReceived;
        return {
          poItem: item,
          selected: pending > 0,
          qtyToReceive: pending > 0 ? pending : 0,
          qtyPending: pending,
          notes: '',
        };
      })
      .filter((l) => l.qtyPending > 0);
    setLines(pendingItems);
    setWarehouseId('');
    setReceivedDate('');
    setGeneralNotes('');
    setError(null);
  }, [isOpen, order]);

  const selectedLines = lines.filter((l) => l.selected && l.qtyToReceive > 0);
  const totalUnits = selectedLines.reduce((s, l) => s + l.qtyToReceive, 0);

  const toggleLine = (idx: number) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, selected: !l.selected } : l)),
    );
  };

  const updateQty = (idx: number, qty: number) => {
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, qtyToReceive: Math.min(Math.max(0, qty), l.qtyPending) } : l,
      ),
    );
  };

  const updateLineNotes = (idx: number, notes: string) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, notes } : l)),
    );
  };

  const selectAll = () => {
    const allSelected = lines.every((l) => l.selected);
    setLines((prev) => prev.map((l) => ({ ...l, selected: !allSelected })));
  };

  const handleSubmit = async () => {
    if (!order) return;
    setError(null);

    // Validate
    if (!warehouseId) {
      setError('Selecciona un almacén');
      return;
    }
    if (selectedLines.length === 0) {
      setError('Selecciona al menos un artículo para recibir');
      return;
    }

    const invalidLine = selectedLines.find((l) => l.qtyToReceive <= 0 || l.qtyToReceive > l.qtyPending);
    if (invalidLine) {
      setError(`Cantidad inválida para artículo: ${invalidLine.poItem.description || `Variante #${invalidLine.poItem.variantId}`}`);
      return;
    }

    const dto: CreateReceptionDto = {
      warehouseId: warehouseId as number,
      receivedDate: receivedDate || undefined,
      notes: generalNotes || undefined,
      items: selectedLines.map((l) => ({
        purchaseOrderItemId: l.poItem.id,
        qtyReceived: l.qtyToReceive,
        notes: l.notes || undefined,
      })),
    };

    setSubmitting(true);
    try {
      const result = await createReception(order.id, dto);
      setConfirmResult(result);
      // Notificar al padre para que recargue datos, pero NO cerrar aún
      if (onCreated) onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear recepción');
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  const handleClose = () => {
    setConfirmResult(null);
    onClose();
  };

  // ── Pantalla de confirmación exitosa ──────────────────────────────
  if (confirmResult) {
    const { receipt, progress } = confirmResult;
    const warehouseName =
      warehouses.find((w) => w.id === receipt.warehouseId)?.name ||
      receipt.warehouse?.name ||
      `Almacén #${receipt.warehouseId}`;
    const totalReceived = receipt.items.reduce((s, i) => s + i.qtyReceived, 0);

    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Recepción Registrada" size="xl">
        <div className="space-y-5">
          {/* Éxito header */}
          <div className="flex flex-col items-center py-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Recepción creada exitosamente</h3>
            <p className="text-sm text-gray-500 mt-1 font-mono font-semibold text-green-700">
              {receipt.code}
            </p>
          </div>

          {/* Info de la recepción */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-[10px] text-gray-400 mb-0.5">Almacén</p>
              <div className="flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-sm font-medium text-gray-900">{warehouseName}</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-[10px] text-gray-400 mb-0.5">Fecha</p>
              <span className="text-sm font-medium text-gray-900">
                {receipt.receivedDate ? formatDateTime(receipt.receivedDate) : 'Hoy'}
              </span>
            </div>
          </div>

          {/* Artículos recibidos */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-100/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">Artículos Recibidos</span>
              <span className="text-xs font-bold text-green-700">{totalReceived} unidades totales</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
              {receipt.items.map((item) => {
                const line = lines.find((l) => l.poItem.id === item.purchaseOrderItemId);
                const name = line?.poItem.description || `Variante #${item.purchaseOrderItemId}`;
                return (
                  <div key={item.id} className="px-4 py-2.5 flex items-center justify-between bg-white">
                    <span className="text-sm text-gray-800">{name}</span>
                    <span className="text-sm font-bold text-gray-900 tabular-nums">
                      ×{item.qtyReceived}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progreso actualizado */}
          {progress && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">Progreso de la Orden</span>
                <span className={`text-xs font-bold ${progress.isComplete ? 'text-green-600' : 'text-gray-700'}`}>
                  {progress.percentComplete}%
                  {progress.isComplete && ' — Completa ✓'}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${progress.isComplete ? 'bg-green-500' : 'bg-yellow-500'}`}
                  style={{ width: `${Math.min(progress.percentComplete, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-gray-400">
                  {progress.totalReceived} recibidas de {progress.totalQty}
                </span>
                <span className="text-[10px] text-orange-500">
                  {progress.totalPending > 0 ? `${progress.totalPending} pendientes` : ''}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1 border-t border-gray-100">
            <Button onClick={handleClose} className="px-6">
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Registrar Recepción" size="xl">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Header info */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <p className="text-sm font-medium text-blue-900">
            Orden: <span className="font-mono">{order.code}</span>
          </p>
          <p className="text-xs text-blue-600 mt-0.5">Proveedor: {order.supplierName}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Almacén <span className="text-red-500">*</span>
            </label>
            {loadingWarehouses ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                <span className="text-xs text-gray-400">Cargando almacenes...</span>
              </div>
            ) : warehouses.length > 0 ? (
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona almacén</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            ) : (
              /* Fallback: input numérico cuando el endpoint de warehouses no está disponible */
              <input
                type="number"
                min={1}
                placeholder="ID del almacén (ej: 1)"
                value={warehouseId || ''}
                onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de Recepción</label>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notas Generales</label>
          <textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            rows={2}
            placeholder="Notas sobre esta recepción..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Items table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-700">Artículos Pendientes</h4>
            <button
              onClick={selectAll}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              {lines.every((l) => l.selected) ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>

          {lines.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <Package className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-green-700 font-medium">Todos los artículos han sido recibidos</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {lines.map((line, idx) => (
                <div
                  key={line.poItem.id}
                  className={`bg-white rounded-lg p-3 border transition-colors ${
                    line.selected ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={line.selected}
                      onChange={() => toggleLine(idx)}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {line.poItem.description ?? `Variante #${line.poItem.variantId}`}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Pedido: {line.poItem.qty} · Recibido: {line.poItem.qtyReceived} · Pendiente: {line.qtyPending}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <label className="text-[10px] text-gray-500">Recibir:</label>
                      <input
                        type="number"
                        min={0}
                        max={line.qtyPending}
                        value={line.qtyToReceive || ''}
                        onChange={(e) => updateQty(idx, parseInt(e.target.value) || 0)}
                        disabled={!line.selected}
                        className="w-16 border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  {line.selected && (
                    <div className="mt-2 ml-7">
                      <input
                        type="text"
                        value={line.notes}
                        onChange={(e) => updateLineNotes(idx, e.target.value)}
                        placeholder="Notas del artículo (opcional)"
                        className="w-full border border-gray-100 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {selectedLines.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">
                {selectedLines.length} artículo{selectedLines.length > 1 ? 's' : ''} seleccionado{selectedLines.length > 1 ? 's' : ''}
              </span>
              <span className="text-sm font-bold text-gray-900">{totalUnits} unidades a recibir</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedLines.length === 0 || !warehouseId}
            className="flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Package className="w-4 h-4" />
                Confirmar Recepción
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
