'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import {
  CreatePurchaseOrderDto,
  SupplierListItem,
} from '@/services/suppliers';
import { getAllSuppliers } from '@/services/suppliers/suppliers.service';

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreatePurchaseOrderDto) => void;
  submitting?: boolean;
}

interface LocalItem {
  key: number;
  variantId: number | '';
  qty: number;
  unitCost: number;
}

export function CreatePurchaseOrderModal({ isOpen, onClose, onSave, submitting }: CreatePurchaseOrderModalProps) {
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [items, setItems] = useState<LocalItem[]>([
    { key: 1, variantId: '', qty: 1, unitCost: 0 },
  ]);
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [nextKey, setNextKey] = useState(2);

  // Cargar proveedores desde /api/suppliers/list cuando el modal se abre
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getAllSuppliers()
      .then((data) => {
        if (cancelled) return;
        // El backend puede retornar el array directamente o envuelto en { suppliers: [...] }
        const list = Array.isArray(data)
          ? data
          : Array.isArray((data as unknown as { suppliers: SupplierListItem[] }).suppliers)
            ? (data as unknown as { suppliers: SupplierListItem[] }).suppliers
            : [];
        setSuppliers(list);
        setLoadingSuppliers(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSuppliers([]);
        setLoadingSuppliers(false);
      });
    return () => { cancelled = true; };
  }, [isOpen]);

  const handleReset = () => {
    setSupplierId('');
    setNotes('');
    setExpectedDeliveryDate('');
    setItems([{ key: 1, variantId: '', qty: 1, unitCost: 0 }]);
    setNextKey(2);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const addItem = () => {
    setItems([...items, { key: nextKey, variantId: '', qty: 1, unitCost: 0 }]);
    setNextKey(nextKey + 1);
  };

  const removeItem = (key: number) => {
    if (items.length <= 1) return;
    setItems(items.filter(i => i.key !== key));
  };

  const updateItem = (key: number, field: keyof LocalItem, value: string | number) => {
    setItems(items.map(i => i.key === key ? { ...i, [field]: value } : i));
  };

  const totalAmount = items.reduce((sum, i) => sum + (i.qty * i.unitCost), 0);

  const canSubmit = supplierId !== '' && items.every(i => i.variantId !== '' && i.qty > 0 && i.unitCost > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;

    const dto: CreatePurchaseOrderDto = {
      supplierId: Number(supplierId),
      items: items.map(i => ({
        variantId: Number(i.variantId),
        qty: i.qty,
        unitCost: i.unitCost,
      })),
      notes: notes.trim() || undefined,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
    };

    onSave(dto);
    handleReset();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nueva Orden de Compra" size="xl">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Proveedor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Proveedor <span className="text-red-500">*</span>
          </label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={loadingSuppliers}
          >
            <option value="">
              {loadingSuppliers ? 'Cargando proveedores...' : 'Seleccionar proveedor'}
            </option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Fecha estimada de entrega */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Estimada de Entrega
          </label>
          <input
            type="date"
            value={expectedDeliveryDate}
            onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Artículos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">
              Artículos <span className="text-red-500">*</span>
            </h4>
            <Button onClick={addItem} variant="outline" className="flex items-center gap-1 text-xs py-1 px-2">
              <Plus className="w-3 h-3" /> Agregar
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.key} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">Artículo #{index + 1}</span>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(item.key)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">ID Variante</label>
                    <input
                      type="number"
                      value={item.variantId}
                      onChange={(e) => updateItem(item.key, 'variantId', e.target.value ? Number(e.target.value) : '')}
                      placeholder="ID de variante"
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => updateItem(item.key, 'qty', Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Costo Unit.</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitCost}
                      onChange={(e) => updateItem(item.key, 'unitCost', Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {item.qty > 0 && item.unitCost > 0 && (
                  <p className="text-xs text-gray-500 mt-2 text-right">
                    Subtotal: <span className="font-semibold text-gray-700">${(item.qty * item.unitCost).toFixed(2)}</span>
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Total */}
          {totalAmount > 0 && (
            <div className="mt-3 flex justify-end">
              <div className="bg-primary/10 rounded-lg px-4 py-2 border border-primary/20">
                <span className="text-sm text-primary font-medium">Total Estimado: </span>
                <span className="text-lg font-bold text-primary">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Instrucciones o información adicional..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex items-center gap-3 pt-5 border-t mt-5">
        <Button variant="outline" onClick={handleClose} className="flex-1" disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} className="flex-1" disabled={!canSubmit || submitting}>
          {submitting ? 'Guardando...' : 'Crear Orden de Compra'}
        </Button>
      </div>
    </Modal>
  );
}
