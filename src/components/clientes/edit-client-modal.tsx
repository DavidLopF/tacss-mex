'use client';

import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { ClientDetail, UpdateClientDto } from '@/services/clients';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: UpdateClientDto) => void;
  client: ClientDetail | null;
  submitting?: boolean;
}

export function EditClientModal({ isOpen, onClose, onSave, client, submitting }: EditClientModalProps) {
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [lastClientId, setLastClientId] = useState<number | null>(null);

  // Sync state when client changes (replaces useEffect)
  if (client && client.id !== lastClientId) {
    setName(client.name);
    setDocument(client.document || '');
    setIsActive(client.isActive);
    setLastClientId(client.id);
  }

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    if (!client || !name.trim()) return;

    const updates: UpdateClientDto = {};

    if (name.trim() !== client.name) {
      updates.name = name.trim();
    }
    if ((document.trim() || null) !== client.document) {
      updates.document = document.trim() || undefined;
    }
    if (isActive !== client.isActive) {
      updates.isActive = isActive;
    }

    // Si no hay cambios reales, solo cerramos
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    onSave(client.id, updates);
  };

  if (!client) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Editar Cliente"
      size="md"
    >
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

        {/* Documento */}
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

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsActive(true)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                isActive
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              ✅ Activo
            </button>
            <button
              type="button"
              onClick={() => setIsActive(false)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                !isActive
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              ❌ Inactivo
            </button>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={!name.trim() || submitting}
          >
            {submitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
