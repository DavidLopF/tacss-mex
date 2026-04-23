'use client';

/**
 * BulkEditModal
 * Permite editar en lote los campos comunes de los productos seleccionados:
 *  - Categoría
 *  - Precio base
 *  - Estado (activo/inactivo)
 *  - Requiere IVA
 *
 * Solo se envían al servidor los campos que el usuario marcó para editar.
 */

import { useState, useEffect } from 'react';
import { Edit, X, AlertCircle, CheckCircle } from 'lucide-react';
import { bulkEditProducts, getCategories } from '@/services/products';
import type { CategoryDto } from '@/services/products/products.types';
import type { Producto } from '@/types';

interface BulkEditModalProps {
  isOpen: boolean;
  selectedProducts: Producto[];
  onClose: () => void;
  onSuccess?: (updated: number) => void;
}

interface PatchFields {
  categoryId?: number;
  defaultPrice?: number;
  isActive?: boolean;
  requiresIva?: boolean;
}

export function BulkEditModal({ isOpen, selectedProducts, onClose, onSuccess }: BulkEditModalProps) {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ updated: number; errors: { id: number; reason: string }[] } | null>(null);

  // Flags que controlan qué campos se incluyen en el patch
  const [editCategory, setEditCategory] = useState(false);
  const [editPrice, setEditPrice] = useState(false);
  const [editActive, setEditActive] = useState(false);
  const [editIva, setEditIva] = useState(false);

  // Valores del patch
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [defaultPrice, setDefaultPrice] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [requiresIva, setRequiresIva] = useState(false);

  useEffect(() => {
    if (isOpen && categories.length === 0) {
      getCategories().then(setCategories).catch(console.error);
    }
  }, [isOpen, categories.length]);

  const reset = () => {
    setResult(null);
    setEditCategory(false);
    setEditPrice(false);
    setEditActive(false);
    setEditIva(false);
    setCategoryId(undefined);
    setDefaultPrice('');
    setIsActive(true);
    setRequiresIva(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const patch: PatchFields = {};
    if (editCategory && categoryId) patch.categoryId = categoryId;
    if (editPrice && defaultPrice !== '') {
      const p = parseFloat(defaultPrice);
      if (isNaN(p) || p < 0) { alert('Precio inválido'); return; }
      patch.defaultPrice = p;
    }
    if (editActive) patch.isActive = isActive;
    if (editIva) patch.requiresIva = requiresIva;

    if (Object.keys(patch).length === 0) {
      alert('Selecciona al menos un campo para editar');
      return;
    }

    const ids = selectedProducts.map((p) => parseInt(p.id));

    setLoading(true);
    try {
      const res = await bulkEditProducts(ids, patch);
      setResult(res);
      if (res.updated > 0) onSuccess?.(res.updated);
    } catch (err) {
      console.error('Error en bulk edit:', err);
      alert('Error al enviar los datos al servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const patchCount = [editCategory, editPrice, editActive, editIva].filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Edit className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Edición masiva de productos</h2>
              <p className="text-xs text-gray-500">
                {selectedProducts.length} producto(s) seleccionado(s)
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!result ? (
            <>
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                Marca los campos que deseas modificar. Solo se actualizarán los campos seleccionados.
              </p>

              {/* Categoría */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editCategory}
                    onChange={(e) => setEditCategory(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Cambiar categoría</span>
                </label>
                {editCategory && (
                  <select
                    value={categoryId ?? ''}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full pl-3 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecciona una categoría...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Precio */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPrice}
                    onChange={(e) => setEditPrice(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Cambiar precio base</span>
                </label>
                {editPrice && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={defaultPrice}
                      onChange={(e) => setDefaultPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Estado activo */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Cambiar estado</span>
                </label>
                {editActive && (
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={isActive}
                        onChange={() => setIsActive(true)}
                        className="text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">Activo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!isActive}
                        onChange={() => setIsActive(false)}
                        className="text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">Inactivo</span>
                    </label>
                  </div>
                )}
              </div>

              {/* IVA */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIva}
                    onChange={(e) => setEditIva(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Cambiar IVA</span>
                </label>
                {editIva && (
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={requiresIva}
                        onChange={() => setRequiresIva(true)}
                        className="text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">Requiere IVA</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!requiresIva}
                        onChange={() => setRequiresIva(false)}
                        className="text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">Sin IVA</span>
                    </label>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Resultado */
            <div className="space-y-3">
              <div className={`rounded-xl p-4 flex items-start gap-3 ${result.updated > 0 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                {result.updated > 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {result.updated} producto(s) actualizados
                  </p>
                  {result.errors.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">{result.errors.length} error(es)</p>
                  )}
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-red-100 max-h-40">
                  <table className="w-full text-xs">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-red-700">ID</th>
                        <th className="text-left px-3 py-2 text-red-700">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((e) => (
                        <tr key={e.id}>
                          <td className="px-3 py-2">{e.id}</td>
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
          {!result && (
            <button
              onClick={handleSubmit}
              disabled={loading || patchCount === 0}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                `Aplicar cambios a ${selectedProducts.length} producto(s)`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
