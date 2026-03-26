'use client';

import { useState } from 'react';
import { Building2, Palette, Eye, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { DEFAULT_COMPANY_SETTINGS } from '@/services/company';
import type { CompanySettings, UpdateCompanySettingsDto } from '@/services/company';

interface CompanySettingsFormProps {
  settings: CompanySettings;
  onSave: (data: UpdateCompanySettingsDto) => void;
  submitting?: boolean;
}

/** Presets de color populares */
const COLOR_PRESETS = [
  { name: 'Azul',     primary: '#2563eb', accent: '#3b82f6' },
  { name: 'Índigo',   primary: '#4f46e5', accent: '#6366f1' },
  { name: 'Violeta',  primary: '#7c3aed', accent: '#8b5cf6' },
  { name: 'Rosa',     primary: '#db2777', accent: '#ec4899' },
  { name: 'Rojo',     primary: '#dc2626', accent: '#ef4444' },
  { name: 'Naranja',  primary: '#ea580c', accent: '#f97316' },
  { name: 'Ámbar',    primary: '#d97706', accent: '#f59e0b' },
  { name: 'Verde',    primary: '#16a34a', accent: '#22c55e' },
  { name: 'Teal',     primary: '#0d9488', accent: '#14b8a6' },
  { name: 'Cian',     primary: '#0891b2', accent: '#06b6d4' },
  { name: 'Gris',     primary: '#4b5563', accent: '#6b7280' },
  { name: 'Negro',    primary: '#1f2937', accent: '#374151' },
];

export function CompanySettingsForm({ settings, onSave, submitting }: CompanySettingsFormProps) {
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [accentColor, setAccentColor] = useState(settings.accentColor);

  const hasChanges =
    companyName !== settings.companyName ||
    primaryColor !== settings.primaryColor ||
    accentColor !== settings.accentColor;

  const handleSubmit = () => {
    if (!companyName.trim()) return;

    const updates: UpdateCompanySettingsDto = {};
    if (companyName.trim() !== settings.companyName) updates.companyName = companyName.trim();
    if (primaryColor !== settings.primaryColor) updates.primaryColor = primaryColor;
    if (accentColor !== settings.accentColor) updates.accentColor = accentColor;

    if (Object.keys(updates).length === 0) return;
    onSave(updates);
  };

  const handleReset = () => {
    setPrimaryColor(DEFAULT_COMPANY_SETTINGS.primaryColor);
    setAccentColor(DEFAULT_COMPANY_SETTINGS.accentColor);
    setCompanyName(DEFAULT_COMPANY_SETTINGS.companyName);
  };

  const handlePresetClick = (preset: { primary: string; accent: string }) => {
    setPrimaryColor(preset.primary);
    setAccentColor(preset.accent);
  };

  return (
    <div className="max-w-3xl space-y-8">
      {/* ─── Nombre de la empresa ───────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Nombre de la empresa</h3>
            <p className="text-sm text-gray-500">Este nombre aparecerá en la barra lateral de navegación</p>
          </div>
        </div>

        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Nombre de tu empresa"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
          maxLength={30}
        />
        <p className="mt-1.5 text-xs text-gray-400">{companyName.length}/30 caracteres</p>
      </section>

      {/* ─── Colores del tema ───────────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Palette className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Colores del tema</h3>
            <p className="text-sm text-gray-500">Personaliza los colores principales del CRM</p>
          </div>
        </div>

        {/* Color pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color principal</label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer p-1"
                />
              </div>
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm uppercase"
                maxLength={7}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">Botones, enlaces activos, iconos principales</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color de acento</label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer p-1"
                />
              </div>
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm uppercase"
                maxLength={7}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">Fondos de avatares, badges, elementos secundarios</p>
          </div>
        </div>

        {/* Presets */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Temas rápidos</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetClick(preset)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-400 transition-colors text-xs font-medium text-gray-700"
                title={preset.name}
              >
                <span
                  className="w-4 h-4 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: preset.primary }}
                />
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Vista previa</span>
          </div>

          <div className="flex gap-4">
            {/* Mini sidebar preview */}
            <div className="w-48 bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="text-white text-[10px] font-bold">
                    {companyName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900 truncate">
                  {companyName || 'CRM'}
                </span>
              </div>
              <div className="p-2 space-y-1">
                <div
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium"
                  style={{ backgroundColor: primaryColor + '15', color: primaryColor }}
                >
                  <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: primaryColor }} />
                  Dashboard
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-gray-500">
                  <div className="w-3.5 h-3.5 rounded bg-gray-200" />
                  Inventario
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-gray-500">
                  <div className="w-3.5 h-3.5 rounded bg-gray-200" />
                  Pedidos
                </div>
              </div>
            </div>

            {/* Mini content preview */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: accentColor }}
                >
                  <span className="text-white text-xs font-bold">A</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">Admin</p>
                  <p className="text-[10px] text-gray-400">Administrador</p>
                </div>
              </div>

              <button
                className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                style={{ backgroundColor: primaryColor }}
              >
                Botón primario
              </button>

              <div className="flex gap-2">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: primaryColor + '20', color: primaryColor }}
                >
                  Badge
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: accentColor + '20', color: accentColor }}
                >
                  Acento
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Acciones ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleReset} size="sm" disabled={submitting}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Restaurar valores por defecto
        </Button>

        <Button onClick={handleSubmit} disabled={!hasChanges || !companyName.trim() || submitting}>
          {submitting ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}
