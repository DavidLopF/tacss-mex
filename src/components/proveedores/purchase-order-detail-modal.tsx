'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Truck, Package, ArrowRight, Loader2, Percent, Save, ClipboardCheck, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_ORDER_STATUS_COLORS,
  PO_STATUS_TRANSITION_RULES,
  getAvailablePOTransitions,
  LANDED_COST_FIELDS,
} from '@/services/suppliers';
import type { UpdatePurchaseOrderCostsDto } from '@/services/suppliers';
import {
  getReceptions,
  getReceptionProgress,
} from '@/services/receptions';
import type { PartialReceipt, ReceptionProgress } from '@/services/receptions';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { CreateReceptionModal } from './create-reception-modal';
import { ReceptionDetailModal } from './reception-detail-modal';

interface PurchaseOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  onStatusChange?: (newStatus: PurchaseOrderStatus) => Promise<void>;
  onCostsUpdate?: (id: number, data: UpdatePurchaseOrderCostsDto) => Promise<PurchaseOrder | void>;
  /** Callback when a reception is created — parent can refresh PO data */
  onReceptionCreated?: () => void;
}

/** Colores para los botones de transición */
const TRANSITION_BUTTON_STYLES: Record<PurchaseOrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200',
  sent: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
  confirmed: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200',
  partial: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200',
  received: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
  cancelled: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200',
};

export function PurchaseOrderDetailModal({ isOpen, onClose, order, onStatusChange, onCostsUpdate, onReceptionCreated }: PurchaseOrderDetailModalProps) {
  const [changingStatus, setChangingStatus] = useState(false);
  const [editingCosts, setEditingCosts] = useState(false);
  const [savingCosts, setSavingCosts] = useState(false);

  // Reception state
  const [receptions, setReceptions] = useState<PartialReceipt[]>([]);
  const [progress, setProgress] = useState<ReceptionProgress | null>(null);
  const [loadingReceptions, setLoadingReceptions] = useState(false);
  const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
  const [isReceptionDetailOpen, setIsReceptionDetailOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PartialReceipt | null>(null);
  const [showItemsProgress, setShowItemsProgress] = useState(false);

  // Load receptions data when order changes
  const fetchReceptions = useCallback(async () => {
    if (!order) return;
    setLoadingReceptions(true);
    try {
      const [recs, prog] = await Promise.all([
        getReceptions(order.id),
        getReceptionProgress(order.id),
      ]);
      setReceptions(recs);
      setProgress(prog);
    } catch {
      // silently fail — data will be empty
    } finally {
      setLoadingReceptions(false);
    }
  }, [order]);

  useEffect(() => {
    if (isOpen && order) {
      fetchReceptions();
    }
    if (!isOpen) {
      setReceptions([]);
      setProgress(null);
      setShowItemsProgress(false);
    }
  }, [isOpen, order, fetchReceptions]);

  // Statuses that allow creating receptions
  const canReceive = order ? ['sent', 'confirmed', 'partial'].includes(order.status) : false;

  const handleReceptionCreated = () => {
    // Solo recargamos datos — NO cerramos el modal aquí.
    // El CreateReceptionModal muestra la pantalla de confirmación y
    // el usuario lo cierra manualmente con su propio botón "Cerrar".
    fetchReceptions();
    if (onReceptionCreated) onReceptionCreated();
  };

  const handleViewReceipt = (receipt: PartialReceipt) => {
    setSelectedReceipt(receipt);
    setIsReceptionDetailOpen(true);
  };

  // Editable cost percentages (initialised when editing starts)
  const [editFreight, setEditFreight] = useState(0);
  const [editCustoms, setEditCustoms] = useState(0);
  const [editTax, setEditTax] = useState(0);
  const [editHandling, setEditHandling] = useState(0);
  const [editOther, setEditOther] = useState(0);

  if (!order) return null;

  const statusLabel = PURCHASE_ORDER_STATUS_LABELS[order.status];
  const statusColor = PURCHASE_ORDER_STATUS_COLORS[order.status];
  const availableTransitions = getAvailablePOTransitions(order.status);

  // Cost data from order
  const hasCosts = (order.freightPct + order.customsPct + order.taxPct + order.handlingPct + order.otherPct) > 0;
  const totalCostPct = order.freightPct + order.customsPct + order.taxPct + order.handlingPct + order.otherPct;
  const totalLandedCosts = order.freightCost + order.customsCost + order.taxCost + order.handlingCost + order.otherCost;

  const costDisplayFields = LANDED_COST_FIELDS.map(f => {
    const pctMap: Record<string, number> = { freightPct: order.freightPct, customsPct: order.customsPct, taxPct: order.taxPct, handlingPct: order.handlingPct, otherPct: order.otherPct };
    const costMap: Record<string, number> = { freightPct: order.freightCost, customsPct: order.customsCost, taxPct: order.taxCost, handlingPct: order.handlingCost, otherPct: order.otherCost };
    return { ...f, pct: pctMap[f.key] ?? 0, cost: costMap[f.key] ?? 0 };
  });

  const editFields = [
    { key: 'freightPct', label: 'Flete', icon: '🚛', value: editFreight, setter: setEditFreight },
    { key: 'customsPct', label: 'Aduana', icon: '🏛️', value: editCustoms, setter: setEditCustoms },
    { key: 'taxPct', label: 'Impuestos', icon: '📋', value: editTax, setter: setEditTax },
    { key: 'handlingPct', label: 'Manejo', icon: '📦', value: editHandling, setter: setEditHandling },
    { key: 'otherPct', label: 'Otros', icon: '➕', value: editOther, setter: setEditOther },
  ];
  const editTotalPct = editFreight + editCustoms + editTax + editHandling + editOther;

  const startEditCosts = () => {
    setEditFreight(order.freightPct);
    setEditCustoms(order.customsPct);
    setEditTax(order.taxPct);
    setEditHandling(order.handlingPct);
    setEditOther(order.otherPct);
    setEditingCosts(true);
  };

  const handleSaveCosts = async () => {
    if (!onCostsUpdate) return;
    setSavingCosts(true);
    try {
      await onCostsUpdate(order.id, {
        freightPct: editFreight,
        customsPct: editCustoms,
        taxPct: editTax,
        handlingPct: editHandling,
        otherPct: editOther,
      });
      setEditingCosts(false);
    } catch (error) {
      console.error('Error al guardar costos:', error);
    } finally {
      setSavingCosts(false);
    }
  };

  const handleStatusChange = async (newStatus: PurchaseOrderStatus) => {
    // Si el destino es 'partial' o 'received', abrir el modal de recepción
    // en vez de cambiar estado directamente. El backend transiciona automáticamente.
    if (newStatus === 'partial' || newStatus === 'received') {
      setIsReceptionModalOpen(true);
      return;
    }
    if (!onStatusChange) return;
    try {
      setChangingStatus(true);
      await onStatusChange(newStatus);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert(error instanceof Error ? error.message : 'Error al cambiar estado');
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle de Orden de Compra" size="xl">
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{order.code}</h3>
            <p className="text-sm text-gray-500 mt-1">Proveedor: {order.supplierName}</p>
          </div>
          <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {/* Botones de transición de estado */}
        {onStatusChange && availableTransitions.length > 0 && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <h4 className="text-sm font-semibold text-slate-700">Cambiar Estado</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTransitions.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={changingStatus}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${TRANSITION_BUTTON_STYLES[status]}`}
                >
                  {changingStatus ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${PURCHASE_ORDER_STATUS_COLORS[status].split(' ')[0]}`} />
                  )}
                  {PO_STATUS_TRANSITION_RULES[status].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Resumen financiero */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
            <p className="text-xs text-gray-500 mb-1">Subtotal</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(order.subtotal)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
            <p className="text-xs text-gray-500 mb-1">Costos Internación</p>
            <p className="text-lg font-bold text-gray-900">
              {totalLandedCosts > 0 ? formatCurrency(totalLandedCosts) : '—'}
            </p>
            {totalCostPct > 0 && (
              <p className="text-[10px] text-gray-400">{totalCostPct.toFixed(1)}%</p>
            )}
          </div>
          <div className="bg-primary/10 rounded-lg p-4 border border-primary/20 text-center">
            <p className="text-xs text-primary mb-1">Total</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(order.total)}</p>
          </div>
        </div>

        {/* Costos de internación — vista/edición */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-700">Costos de Internación</h4>
            </div>
            {onCostsUpdate && !editingCosts && (
              <button
                onClick={startEditCosts}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Editar
              </button>
            )}
          </div>

          {editingCosts ? (
            <div className="space-y-2">
              {editFields.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <span className="text-sm w-5 flex-shrink-0">{field.icon}</span>
                  <span className="text-xs text-gray-600 w-20 flex-shrink-0">{field.label}</span>
                  <div className="relative flex-shrink-0 w-24">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={field.value || ''}
                      placeholder="0"
                      onChange={(e) => field.setter(parseFloat(e.target.value) || 0)}
                      className="w-full pl-2 pr-6 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                  </div>
                  <span className="text-xs text-gray-500 ml-auto tabular-nums">
                    {order.subtotal * field.value / 100 > 0
                      ? formatCurrency(order.subtotal * field.value / 100)
                      : '—'}
                  </span>
                </div>
              ))}

              {editTotalPct > 0 && (
                <div className="pt-2 mt-1 border-t border-dashed border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Total ({editTotalPct.toFixed(1)}%)</span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(order.subtotal * editTotalPct / 100)}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={handleSaveCosts}
                  disabled={savingCosts}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5"
                >
                  {savingCosts ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {savingCosts ? 'Guardando...' : 'Guardar Costos'}
                </Button>
                <button
                  onClick={() => setEditingCosts(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : hasCosts ? (
            <div className="space-y-1.5">
              {costDisplayFields.filter(f => f.pct > 0).map((field) => (
                <div key={field.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{field.icon}</span>
                    <span className="text-xs text-gray-600">{field.label}</span>
                    <span className="text-[10px] text-gray-400">({field.pct}%)</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 tabular-nums">
                    {formatCurrency(field.cost)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Sin costos de internación configurados.</p>
          )}
        </div>

        {/* Fechas */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Fechas</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <span className="text-xs text-gray-500 block">Fecha de Creación</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDateTime(order.createdAt)}
                </span>
              </div>
            </div>
            {order.expectedDeliveryDate && (
              <div className="flex items-center gap-3">
                <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <span className="text-xs text-gray-500 block">Entrega Esperada</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDateTime(order.expectedDeliveryDate)}
                  </span>
                </div>
              </div>
            )}
            {order.receivedDate && (
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div>
                  <span className="text-xs text-gray-500 block">Fecha de Recepción</span>
                  <span className="text-sm font-medium text-green-700">
                    {formatDateTime(order.receivedDate)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Artículos */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Artículos ({order.items.length})
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {item.description ?? `Variante #${item.variantId}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {item.qty} × {formatCurrency(item.unitCost)}
                    </span>
                    {hasCosts && item.landedUnitCost > item.unitCost && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                        Internado: {formatCurrency(item.landedUnitCost)}
                      </span>
                    )}
                  </div>
                  {item.qtyReceived > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Recibidos: {item.qtyReceived} / {item.qty}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(item.lineTotal)}</p>
                  {hasCosts && item.landedLineTotal > item.lineTotal && (
                    <p className="text-[10px] text-blue-600 font-medium">
                      {formatCurrency(item.landedLineTotal)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ RECEPCIONES ══ */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-700">Recepciones</h4>
            </div>
            {canReceive && !(progress?.isComplete) && (
              <Button
                onClick={() => setIsReceptionModalOpen(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5"
              >
                <Package className="w-3 h-3" />
                Registrar Recepción
              </Button>
            )}
          </div>

          {loadingReceptions ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : progress ? (
            <div className="space-y-4">
              {/* Progress summary */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">
                    {progress.totalReceived} de {progress.totalQty} unidades recibidas
                  </span>
                  <span className={`text-xs font-bold ${progress.isComplete ? 'text-green-600' : 'text-gray-700'}`}>
                    {progress.percentComplete}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      progress.isComplete
                        ? 'bg-green-500'
                        : progress.percentComplete >= 50
                          ? 'bg-yellow-500'
                          : progress.percentComplete > 0
                            ? 'bg-orange-400'
                            : 'bg-gray-300'
                    }`}
                    style={{ width: `${Math.min(progress.percentComplete, 100)}%` }}
                  />
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-lg p-2.5 border border-gray-200 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">Solicitado</p>
                  <p className="text-sm font-bold text-gray-900">{progress.totalQty}</p>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-green-200 text-center">
                  <p className="text-[10px] text-green-500 mb-0.5">Recibido</p>
                  <p className="text-sm font-bold text-green-700">{progress.totalReceived}</p>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-orange-200 text-center">
                  <p className="text-[10px] text-orange-500 mb-0.5">Pendiente</p>
                  <p className="text-sm font-bold text-orange-700">{progress.totalPending}</p>
                </div>
              </div>

              {/* Items progress (collapsible) */}
              {progress.items.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowItemsProgress(!showItemsProgress)}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    {showItemsProgress ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Progreso por artículo
                  </button>
                  {showItemsProgress && (
                    <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                      {progress.items.map((pi) => (
                        <div key={pi.id} className="bg-white rounded p-2 border border-gray-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-800 truncate flex-1 mr-2">
                              {pi.productName || pi.variantSku || pi.description || `Variante #${pi.variantId}`}
                            </span>
                            <span className="text-[10px] text-gray-500 flex-shrink-0">
                              {pi.qtyReceived}/{pi.qty} ({pi.percentComplete}%)
                            </span>
                          </div>
                          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pi.qtyPending === 0
                                  ? 'bg-green-500'
                                  : pi.percentComplete >= 50
                                    ? 'bg-yellow-500'
                                    : 'bg-orange-400'
                              }`}
                              style={{ width: `${Math.min(pi.percentComplete, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Receipts history */}
              {receptions.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-gray-600 mb-2">Historial de Recepciones</h5>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {receptions.map((rec) => {
                      const totalItems = rec.items.reduce((s, i) => s + i.qtyReceived, 0);
                      return (
                        <button
                          key={rec.id}
                          onClick={() => handleViewReceipt(rec)}
                          className="w-full bg-white rounded-lg p-2.5 border border-gray-200 flex items-center justify-between hover:border-blue-300 hover:bg-blue-50/30 transition-colors text-left"
                        >
                          <div>
                            <span className="text-xs font-mono font-semibold text-blue-600">{rec.code}</span>
                            <span className="text-[10px] text-gray-400 ml-2">
                              {formatDateTime(rec.receivedDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">
                              {totalItems} uds · {rec.warehouse?.name || `Almacén #${rec.warehouseId}`}
                            </span>
                            <Eye className="w-3 h-3 text-gray-400" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-2">Sin recepciones registradas.</p>
          )}
        </div>

        {/* Notas */}
        {order.notes && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Notas</h4>
            <p className="text-sm text-gray-600 whitespace-pre-line">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Reception sub-modals */}
      <CreateReceptionModal
        isOpen={isReceptionModalOpen}
        onClose={() => setIsReceptionModalOpen(false)}
        order={order}
        onCreated={handleReceptionCreated}
      />
      <ReceptionDetailModal
        isOpen={isReceptionDetailOpen}
        onClose={() => { setIsReceptionDetailOpen(false); setSelectedReceipt(null); }}
        receipt={selectedReceipt}
      />
    </Modal>
  );
}
