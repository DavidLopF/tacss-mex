'use client';

/**
 * ZoneMultipliersTable
 * Tabla inline-editable para ajustar los multiplicadores de precio por zona.
 *
 * Patrón: edición optimista con confirmación por fila (no modal).
 * Cada fila puede entrar en modo edición independientemente.
 *
 * Campos editables:
 *  - label: etiqueta de la zona
 *  - wholesaleMultiplier: multiplicador mayoreo (e.g. 0.85 = 85% del precio)
 *  - superWholesaleMultiplier: multiplicador super-mayoreo
 */

import { useState, useEffect } from 'react';
import { Edit2, Save, X, RefreshCw, MapPin } from 'lucide-react';
import { getPriceZones, updatePriceZone } from '@/services/discounts';
import type { PriceZone } from '@/services/discounts/discounts.types';

interface ZoneRow extends PriceZone {
  _editing: boolean;
  _draft: {
    label: string;
    wholesaleMultiplier: string;
    superWholesaleMultiplier: string;
  };
  _saving: boolean;
  _error?: string;
}

interface ZoneMultipliersTableProps {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export function ZoneMultipliersTable({ onSuccess, onError }: ZoneMultipliersTableProps) {
  const [rows, setRows] = useState<ZoneRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const zones = await getPriceZones();
      setRows(
        zones.map((z) => ({
          ...z,
          wholesaleMultiplier: Number(z.wholesaleMultiplier),
          superWholesaleMultiplier: Number(z.superWholesaleMultiplier),
          _editing: false,
          _saving: false,
          _draft: {
            label: z.label,
            wholesaleMultiplier: String(Number(z.wholesaleMultiplier)),
            superWholesaleMultiplier: String(Number(z.superWholesaleMultiplier)),
          },
        })),
      );
    } catch (err) {
      console.error('Error cargando zonas:', err);
      onError?.('No se pudieron cargar las zonas de precio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = (id: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              _editing: true,
              _error: undefined,
              _draft: {
                label: r.label,
                wholesaleMultiplier: String(r.wholesaleMultiplier),
                superWholesaleMultiplier: String(r.superWholesaleMultiplier),
              },
            }
          : r,
      ),
    );
  };

  const cancelEdit = (id: number) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, _editing: false, _error: undefined } : r)));
  };

  const updateDraft = (id: number, field: keyof ZoneRow['_draft'], value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, _draft: { ...r._draft, [field]: value } } : r,
      ),
    );
  };

  const saveRow = async (id: number) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;

    const wholesale = parseFloat(row._draft.wholesaleMultiplier);
    const superWholesale = parseFloat(row._draft.superWholesaleMultiplier);

    if (isNaN(wholesale) || wholesale < 0) {
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, _error: 'Multiplicador mayoreo inválido' } : r));
      return;
    }
    if (isNaN(superWholesale) || superWholesale < 0) {
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, _error: 'Multiplicador super-mayoreo inválido' } : r));
      return;
    }
    if (!row._draft.label.trim()) {
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, _error: 'La etiqueta es requerida' } : r));
      return;
    }

    setRows((prev) => prev.map((r) => r.id === id ? { ...r, _saving: true, _error: undefined } : r));

    try {
      const updated = await updatePriceZone(id, {
        label: row._draft.label.trim(),
        wholesaleMultiplier: wholesale,
        superWholesaleMultiplier: superWholesale,
      });

      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                ...updated,
                wholesaleMultiplier: Number(updated.wholesaleMultiplier),
                superWholesaleMultiplier: Number(updated.superWholesaleMultiplier),
                _editing: false,
                _saving: false,
              }
            : r,
        ),
      );
      onSuccess?.(`Zona "${updated.label}" actualizada`);
    } catch (err) {
      console.error('Error actualizando zona:', err);
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, _saving: false, _error: 'Error al guardar' } : r));
      onError?.('No se pudo actualizar la zona');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No hay zonas de precio configuradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          Los multiplicadores afectan el precio base del producto. Ej: 0.85 = 15% de descuento sobre precio base.
        </p>
        <button
          onClick={load}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Recargar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Zona</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Código</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Etiqueta</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                Mult. Mayoreo
                <span className="ml-1 text-gray-400 font-normal">(×precio)</span>
              </th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">
                Mult. Super-Mayoreo
                <span className="ml-1 text-gray-400 font-normal">(×precio)</span>
              </th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Estado</th>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => (
              <tr key={row.id} className={`${row._editing ? 'bg-indigo-50/30' : 'hover:bg-gray-50'} transition-colors`}>
                {/* Zona # */}
                <td className="px-4 py-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                </td>

                {/* Código */}
                <td className="px-4 py-3">
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">{row.code}</span>
                </td>

                {/* Etiqueta */}
                <td className="px-4 py-3">
                  {row._editing ? (
                    <input
                      type="text"
                      value={row._draft.label}
                      onChange={(e) => updateDraft(row.id, 'label', e.target.value)}
                      className="w-full text-sm border border-indigo-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-900">{row.label}</span>
                  )}
                </td>

                {/* Mayoreo */}
                <td className="px-4 py-3">
                  {row._editing ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row._draft.wholesaleMultiplier}
                      onChange={(e) => updateDraft(row.id, 'wholesaleMultiplier', e.target.value)}
                      className="w-28 text-sm border border-indigo-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{row.wholesaleMultiplier.toFixed(4)}</span>
                      <span className="text-xs text-gray-400">
                        ({Math.round((1 - row.wholesaleMultiplier) * 100)}% desc)
                      </span>
                    </div>
                  )}
                </td>

                {/* Super-mayoreo */}
                <td className="px-4 py-3">
                  {row._editing ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row._draft.superWholesaleMultiplier}
                      onChange={(e) => updateDraft(row.id, 'superWholesaleMultiplier', e.target.value)}
                      className="w-28 text-sm border border-indigo-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{row.superWholesaleMultiplier.toFixed(4)}</span>
                      <span className="text-xs text-gray-400">
                        ({Math.round((1 - row.superWholesaleMultiplier) * 100)}% desc)
                      </span>
                    </div>
                  )}
                </td>

                {/* Estado */}
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    row.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {row.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </td>

                {/* Acciones */}
                <td className="px-4 py-3">
                  {row._error && (
                    <p className="text-xs text-red-500 mb-1">{row._error}</p>
                  )}
                  <div className="flex items-center gap-1">
                    {row._editing ? (
                      <>
                        <button
                          onClick={() => saveRow(row.id)}
                          disabled={row._saving}
                          className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          title="Guardar"
                        >
                          {row._saving
                            ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                            : <Save className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => cancelEdit(row.id)}
                          disabled={row._saving}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50 transition-colors"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(row.id)}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
