'use client';

import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { CreateSupplierDto } from '@/services/suppliers';
import { Building2, Mail, Phone, MapPin, User, FileText, Hash } from 'lucide-react';

interface CreateSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateSupplierDto) => void;
  submitting?: boolean;
}

export function CreateSupplierModal({ isOpen, onClose, onSave, submitting }: CreateSupplierModalProps) {
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

  const handleReset = () => {
    setName('');
    setRfc('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setState('');
    setZipCode('');
    setContactName('');
    setContactPhone('');
    setContactEmail('');
    setNotes('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      rfc: rfc.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      contactName: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    handleReset();
  };

  const initials = name.trim()
    ? name.trim().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : null;

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="xl" noPadding>
      <div className="flex flex-col max-h-[88vh]">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-base transition-all ${
            initials ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-300'
          }`}>
            {initials ?? <Building2 className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">Nuevo Proveedor</h2>
            <p className="text-xs text-gray-400 truncate">
              {name.trim() || 'Completa el nombre para comenzar'}
            </p>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6 space-y-6">

            {/* ── Información General ──────────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-gray-700">Información General</span>
                <div className="flex-1 h-px bg-gray-100 ml-1" />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div className="col-span-2">
                  <label className={labelCls}>
                    Nombre / Razón Social <span className="text-red-400 normal-case tracking-normal">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Distribuidora Nacional SA de CV"
                    className={inputCls}
                    autoFocus
                  />
                </div>
                <div>
                  <label className={labelCls}>RFC</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                    <input
                      type="text"
                      value={rfc}
                      onChange={(e) => setRfc(e.target.value.toUpperCase())}
                      placeholder="XAXX010101000"
                      className={`${inputCls} pl-8 font-mono`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="proveedor@email.com"
                      className={`${inputCls} pl-8`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+52 55 1234 5678"
                      className={`${inputCls} pl-8`}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Dirección ────────────────────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-semibold text-gray-700">Dirección</span>
                <div className="flex-1 h-px bg-gray-100 ml-1" />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div className="col-span-2">
                  <label className={labelCls}>Calle y número</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, número, colonia"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Ciudad</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ciudad de México"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Estado</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="CDMX"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Código Postal</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="06600"
                    className={inputCls}
                  />
                </div>
              </div>
            </section>

            {/* ── Contacto ─────────────────────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-gray-700">Persona de Contacto</span>
                <div className="flex-1 h-px bg-gray-100 ml-1" />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div className="col-span-2">
                  <label className={labelCls}>Nombre del Contacto</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Juan Pérez"
                      className={`${inputCls} pl-8`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+52 55 1234 5678"
                      className={`${inputCls} pl-8`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="contacto@email.com"
                      className={`${inputCls} pl-8`}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Notas ────────────────────────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Notas</span>
                <div className="flex-1 h-px bg-gray-100 ml-1" />
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Información adicional sobre el proveedor, condiciones de pago, etc."
                className={`${inputCls} resize-none`}
              />
            </section>

          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">
          <Button variant="outline" onClick={handleClose} className="flex-1" disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={!name.trim() || submitting}
          >
            {submitting ? 'Guardando...' : 'Crear Proveedor'}
          </Button>
        </div>

      </div>
    </Modal>
  );
}
