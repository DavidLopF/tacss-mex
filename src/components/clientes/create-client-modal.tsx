'use client';

import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { CreateClientDto } from '@/services/clients';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateClientDto) => void;
  submitting?: boolean;
}

export function CreateClientModal({ isOpen, onClose, onSave, submitting }: CreateClientModalProps) {
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');

  const handleReset = () => {
    setName('');
    setDocument('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }

    onSave({
      name: name.trim(),
      document: document.trim() || undefined,
    });

    handleReset();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nuevo Cliente"
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
            {submitting ? 'Creando...' : 'Crear Cliente'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
