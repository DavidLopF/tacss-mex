'use client';

import { useState, useEffect } from 'react';
import { X, Tag, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { getCategories } from '@/services/products';
import type { CategoryDto } from '@/services/products';

interface CategoryFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: number[];
  onApply: (ids: number[]) => void;
}

export function CategoryFilterModal({ isOpen, onClose, selectedIds, onApply }: CategoryFilterModalProps) {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Set<number>>(new Set(selectedIds));

  useEffect(() => {
    if (!isOpen) return;
    setDraft(new Set(selectedIds));
    if (categories.length > 0) return;
    setLoading(true);
    getCategories()
      .then(setCategories)
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const toggle = (id: number) => {
    setDraft((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleApply = () => {
    onApply(Array.from(draft));
    onClose();
  };

  const handleClear = () => {
    setDraft(new Set());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900">Filtrar por categoría</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No hay categorías disponibles</p>
          ) : (
            <div className="space-y-1">
              {categories.map((cat) => {
                const checked = draft.has(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggle(cat.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                      checked ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-colors ${
                      checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}>
                      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <span className={`text-sm ${checked ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleClear}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Limpiar filtro
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleApply}>
              Aplicar
              {draft.size > 0 && (
                <span className="ml-1.5 bg-white/20 text-white text-xs rounded-full px-1.5">
                  {draft.size}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
