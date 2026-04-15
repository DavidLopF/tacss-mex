'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/ui';
import { CreateClientDto } from '@/services/clients';
import { getPriceZones, PriceZone } from '@/services/price-zones';
import { MapPin } from 'lucide-react';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateClientDto) => void;
  submitting?: boolean;
}

const ZONE_COLORS: Record<string, string> = {
  CDMX_VER: 'bg-blue-50 border-blue-300 text-blue-700',
  PUEBLA: 'bg-green-50 border-green-300 text-green-700',
  OAX_ORZ: 'bg-orange-50 border-orange-300 text-orange-700',
};

export function CreateClientModal({ isOpen, onClose, onSave, submitting }: CreateClientModalProps) {
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [priceZoneId, setPriceZoneId] = useState<number | null>(null);
  const [zones, setZones] = useState<PriceZone[]>([]);

  useEffect(() => {
    if (isOpen) {
      getPriceZones().then(setZones).catch(() => setZones([]));
    }
  }, [isOpen]);

  const handleReset = () => {
    setName('');
    setDocument('');
    setPriceZoneId(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      document: document.trim() || undefined,
      priceZoneId: priceZoneId ?? undefined,
    });

    handleReset();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nuevo Cliente" size="md">
      <div className="space-y-5">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Juan Pérez / Empresa SA de CV"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* Documento (RFC / CURP / ID) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Documento (RFC / CURP / ID)
          </label>
          <input
            type="text"
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            placeholder="Ej: XAXX010101000"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Opcional. Puede ser RFC, CURP o cualquier documento de identidad.
          </p>
        </div>

        {/* Zona de Precio */}
        {zones.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline w-3.5 h-3.5 mr-1 text-gray-400" />
              Zona de Precio
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPriceZoneId(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  priceZoneId === null
                    ? 'bg-gray-100 border-gray-400 text-gray-700'
                    : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                }`}
              >
                Sin zona
              </button>
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setPriceZoneId(zone.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    priceZoneId === zone.id
                      ? (ZONE_COLORS[zone.code] ?? 'bg-gray-100 border-gray-400 text-gray-700')
                      : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {zone.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={handleClose} className="flex-1" disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={!name.trim() || submitting}>
            {submitting ? 'Creando...' : 'Crear Cliente'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
