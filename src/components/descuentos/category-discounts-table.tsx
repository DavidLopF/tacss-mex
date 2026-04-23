'use client';

/**
 * CategoryDiscountsTable
 * Tabla inline-editable de reglas de descuento por categoría.
 *
 * Funcionalidades:
 *  - Listar todas las reglas agrupadas por categoría.
 *  - Crear nuevas reglas directamente desde una fila vacía.
 *  - Editar valores (minQty, discountPercent, label, isActive) inline.
 *  - Eliminar reglas con confirmación inline.
 *  - Guardar individualmente o en batch.
 *
 * Patrón Command + Repository: cada fila acumula cambios en estado local;
 * el botón "Guardar todo" hace bulk-upsert en un solo request.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Save, Trash2, RefreshCw, Tag, AlertCircle, CheckCircle,
} from 'lucide-react';
import { getCategoryDiscounts, bulkUpsertCategoryDiscounts } from '@/services/discounts';
import { getCategories } from '@/services/products';
import type { CategoryDto } from '@/services/products/products.types';

interface DiscountRow {
  _localId: string; // key local único para React
  id?: number;      // si existe = actualización; si no = creación
  _delete?: boolean;
  categoryId: number;
  categoryName: string;
  minQty: number;
  discountPercent: number;
  label: string;
  isActive: boolean;
  sortOrder: number;
  _dirty: boolean;  // tiene cambios no guardados
  _isNew: boolean;  // fila nueva (aún no en BD)
}

interface CategoryDiscountsTableProps {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

let _localCounter = 0;
const newLocalId = () => `local-${++_localCounter}`;

export function CategoryDiscountsTable({ onSuccess, onError }: CategoryDiscountsTableProps) {
  const [rows, setRows] = useState<DiscountRow[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ upserted: number; deleted: number; errors: { index: number; reason: string }[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [discounts, cats] = await Promise.all([
        getCategoryDiscounts(),
        getCategories(),
      ]);
      setCategories(cats);

      const mapped: DiscountRow[] = discounts.map((d: any) => ({
        _localId: newLocalId(),
        id: d.id,
        categoryId: d.categoryId ?? d.category?.id,
        categoryName: d.category?.name ?? d.categoryName ?? '',
        minQty: d.minQty,
        discountPercent: Number(d.discountPercent),
        label: d.label ?? '',
        isActive: d.isActive ?? true,
        sortOrder: d.sortOrder ?? 0,
        _dirty: false,
        _isNew: false,
      }));
      setRows(mapped);
      setResult(null);
    } catch (err) {
      console.error('Error cargando descuentos:', err);
      onError?.('No se pudieron cargar los descuentos por categoría');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { load(); }, [load]);

  const addRow = () => {
    const defaultCat = categories[0];
    setRows((prev) => [
      ...prev,
      {
        _localId: newLocalId(),
        categoryId: defaultCat?.id ?? 0,
        categoryName: defaultCat?.name ?? '',
        minQty: 1,
        discountPercent: 5,
        label: '',
        isActive: true,
        sortOrder: prev.length,
        _dirty: true,
        _isNew: true,
      },
    ]);
  };

  const updateRow = (localId: string, patch: Partial<DiscountRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._localId !== localId) return r;
        const updated = { ...r, ...patch, _dirty: true };
        // Sync categoryName when categoryId changes
        if (patch.categoryId !== undefined) {
          updated.categoryName = categories.find((c) => c.id === patch.categoryId)?.name ?? '';
        }
        return updated;
      }),
    );
  };

  const markDelete = (localId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._localId !== localId) return r;
        // Si es nuevo (sin id en BD) simplemente lo quitamos
        if (r._isNew) return null as unknown as DiscountRow;
        return { ...r, _delete: !r._delete, _dirty: true };
      }).filter(Boolean),
    );
  };

  const hasDirty = rows.some((r) => r._dirty);

  const handleSave = async () => {
    const payload = rows
      .filter((r) => r._dirty)
      .map((r) => ({
        id: r.id,
        _delete: r._delete,
        categoryId: r.categoryId,
        minQty: r.minQty,
        discountPercent: r.discountPercent,
        label: r.label || undefined,
        isActive: r.isActive,
        sortOrder: r.sortOrder,
      }));

    if (payload.length === 0) return;

    setSaving(true);
    try {
      const res = await bulkUpsertCategoryDiscounts(payload);
      setResult(res);
      if (res.errors.length === 0) {
        onSuccess?.(`${res.upserted} regla(s) guardadas, ${res.deleted} eliminadas`);
        await load(); // Recargar para sincronizar IDs generados
      } else {
        onError?.(`${res.errors.length} error(es) al guardar`);
      }
    } catch (err) {
      console.error('Error en bulk-upsert:', err);
      onError?.('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  // Agrupar por categoría para presentación
  const grouped = rows.reduce<Record<string, DiscountRow[]>>((acc, row) => {
    const key = row.categoryName || 'Sin categoría';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Define descuentos automáticos por volumen. Se aplican cuando un pedido alcanza la cantidad mínima en esa categoría.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva regla
          </button>
        </div>
      </div>

      {/* Resultado del último guardado */}
      {result && result.errors.length > 0 && (
        <div className="bg-red-50 rounded-xl p-3 space-y-1">
          {result.errors.map((e) => (
            <p key={e.index} className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              Regla #{e.index + 1}: {e.reason}
            </p>
          ))}
        </div>
      )}

      {/* Tabla por grupos */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Categoría</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Cant. mínima</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Descuento %</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Etiqueta</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Activo</th>
              <th className="px-4 py-3 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  <Tag className="w-7 h-7 mx-auto mb-2 opacity-30" />
                  No hay reglas de descuento. Agrega la primera con el botón "Nueva regla".
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row._localId}
                className={`transition-colors ${
                  row._delete
                    ? 'bg-red-50 opacity-60'
                    : row._isNew
                    ? 'bg-blue-50/40'
                    : row._dirty
                    ? 'bg-yellow-50/40'
                    : 'hover:bg-gray-50'
                }`}
              >
                {/* Categoría */}
                <td className="px-4 py-2.5">
                  {row._isNew ? (
                    <select
                      value={row.categoryId}
                      onChange={(e) => updateRow(row._localId, { categoryId: Number(e.target.value) })}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 w-44"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Tag className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{row.categoryName}</span>
                    </div>
                  )}
                </td>

                {/* Cantidad mínima */}
                <td className="px-4 py-2.5">
                  <input
                    type="number"
                    min="1"
                    value={row.minQty}
                    onChange={(e) => updateRow(row._localId, { minQty: parseInt(e.target.value) || 1 })}
                    disabled={!!row._delete}
                    className="w-24 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:bg-gray-50"
                  />
                </td>

                {/* Descuento % */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.01"
                      max="100"
                      step="0.5"
                      value={row.discountPercent}
                      onChange={(e) => updateRow(row._localId, { discountPercent: parseFloat(e.target.value) || 0 })}
                      disabled={!!row._delete}
                      className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:bg-gray-50"
                    />
                    <span className="text-gray-400 text-sm">%</span>
                  </div>
                </td>

                {/* Etiqueta */}
                <td className="px-4 py-2.5">
                  <input
                    type="text"
                    value={row.label}
                    placeholder="Ej: Descuento mayoreo"
                    onChange={(e) => updateRow(row._localId, { label: e.target.value })}
                    disabled={!!row._delete}
                    className="w-44 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:bg-gray-50"
                  />
                </td>

                {/* Activo */}
                <td className="px-4 py-2.5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(e) => updateRow(row._localId, { isActive: e.target.checked })}
                      disabled={!!row._delete}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50" />
                  </label>
                </td>

                {/* Delete */}
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => markDelete(row._localId)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      row._delete
                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                        : 'text-gray-400 hover:bg-red-50 hover:text-red-500'
                    }`}
                    title={row._delete ? 'Deshacer eliminación' : 'Eliminar regla'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer con indicadores de cambio y botón guardar */}
      {hasDirty && (
        <div className="flex items-center justify-between bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-yellow-800">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            Tienes cambios sin guardar.
            {rows.filter((r) => r._dirty && !r._delete && !r._isNew).length > 0 && (
              <span>{rows.filter((r) => r._dirty && !r._delete && !r._isNew).length} modificadas</span>
            )}
            {rows.filter((r) => r._isNew && !r._delete).length > 0 && (
              <span>· {rows.filter((r) => r._isNew && !r._delete).length} nuevas</span>
            )}
            {rows.filter((r) => r._delete).length > 0 && (
              <span>· {rows.filter((r) => r._delete).length} a eliminar</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="text-xs text-yellow-700 hover:text-yellow-900 underline"
            >
              Descartar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Guardar todo
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {result && result.errors.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-4 py-2.5">
          <CheckCircle className="w-4 h-4 text-green-600" />
          {result.upserted} regla(s) guardadas, {result.deleted} eliminadas correctamente.
        </div>
      )}
    </div>
  );
}
