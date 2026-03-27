'use client';

import { useState } from 'react';
import { Modal, Button } from '@/src/components/ui';
import { SupplierDetail, UpdateSupplierDto } from '@/src/services/suppliers';

interface EditSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: UpdateSupplierDto) => void;
  supplier: SupplierDetail | null;
  submitting?: boolean;
}

export function EditSupplierModal({ isOpen, onClose, onSave, supplier, submitting }: EditSupplierModalProps) {
  const [name, setName] = useState('');
  const [rfc, setRfc] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [lastSupplierId, setLastSupplierId] = useState<number | null>(null);

  // Sync state when supplier changes
  if (supplier && supplier.id !== lastSupplierId) {
    setName(supplier.name);
    setRfc(supplier.rfc || '');
    setEmail(supplier.email || '');
    setPhone(supplier.phone || '');
    setAddress(supplier.address || '');
    setCity(supplier.city || '');
    setState(supplier.state || '');
    setZipCode(supplier.zipCode || '');
    setContactName(supplier.contactName || '');
    setContactPhone(supplier.contactPhone || '');
    setContactEmail(supplier.contactEmail || '');
    setNotes(supplier.notes || '');
    setIsActive(supplier.isActive);
    setLastSupplierId(supplier.id);
  }

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    if (!supplier || !name.trim()) return;

    const updates: UpdateSupplierDto = {};

    if (name.trim() !== supplier.name) updates.name = name.trim();
    if ((rfc.trim() || null) !== supplier.rfc) updates.rfc = rfc.trim() || undefined;
    if ((email.trim() || null) !== supplier.email) updates.email = email.trim() || undefined;
    if ((phone.trim() || null) !== supplier.phone) updates.phone = phone.trim() || undefined;
    if ((address.trim() || null) !== supplier.address) updates.address = address.trim() || undefined;
    if ((city.trim() || null) !== supplier.city) updates.city = city.trim() || undefined;
    if ((state.trim() || null) !== supplier.state) updates.state = state.trim() || undefined;
    if ((zipCode.trim() || null) !== supplier.zipCode) updates.zipCode = zipCode.trim() || undefined;
    if ((contactName.trim() || null) !== supplier.contactName) updates.contactName = contactName.trim() || undefined;
    if ((contactPhone.trim() || null) !== supplier.contactPhone) updates.contactPhone = contactPhone.trim() || undefined;
    if ((contactEmail.trim() || null) !== supplier.contactEmail) updates.contactEmail = contactEmail.trim() || undefined;
    if ((notes.trim() || null) !== supplier.notes) updates.notes = notes.trim() || undefined;
    if (isActive !== supplier.isActive) updates.isActive = isActive;

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    onSave(supplier.id, updates);
  };

  if (!supplier) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Editar Proveedor" size="xl">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* ── Información General ─── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">
            Información General
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre / Razón Social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Distribuidora Nacional SA de CV"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
              <input
                type="text"
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                placeholder="Ej: XAXX010101000"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="proveedor@email.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+52 55 1234 5678"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ── Dirección ─── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Dirección</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle, número, colonia"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej: Ciudad de México"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Ej: CDMX"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código Postal
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Ej: 06600"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ── Contacto ─── */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">
            Persona de Contacto
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Contacto
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono del Contacto
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+52 55 1234 5678"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email del Contacto
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contacto@email.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ── Estado ─── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsActive(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Activo
            </button>
            <button
              type="button"
              onClick={() => setIsActive(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !isActive
                  ? 'bg-red-100 text-red-700 ring-2 ring-red-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Inactivo
            </button>
          </div>
        </div>

        {/* ── Notas ─── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Información adicional..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* ── Botones ─── */}
      <div className="flex items-center gap-3 pt-5 border-t mt-5">
        <Button variant="outline" onClick={handleClose} className="flex-1" disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} className="flex-1" disabled={!name.trim() || submitting}>
          {submitting ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </Modal>
  );
}
