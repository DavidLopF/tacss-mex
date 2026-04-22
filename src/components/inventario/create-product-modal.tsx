'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Plus, Minus, X, Upload, MapPin, Tag, Layers,
  Package, DollarSign, Check, AlertTriangle,
} from 'lucide-react';
import { Modal, Button, Card, CardContent, Select } from '@/components/ui';
import { Producto, ProductoVariacion } from '@/types';
import { getCategories, createProduct, CategoryDto, CreateProductDto } from '@/services/products';
import { getPriceZones, PriceZone } from '@/services/price-zones';
import {
  getCategoryDiscounts, createCategoryDiscount, createVariantPriceTier,
  CategoryDiscount,
} from '@/services/discounts';
import { useCompany } from '@/lib/company-context';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (producto: Omit<Producto, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onError?: (message: string) => void;
}

type Tab = 'info' | 'precios' | 'descuentos';

interface TierRow { minQty: number; price: number; label: string }
interface PendingCatDiscount { minQty: number; discountPercent: number; label: string }

const variacionesTemplate = [
  { nombre: 'Talla', valores: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { nombre: 'Color', valores: ['Rojo', 'Azul', 'Verde', 'Negro', 'Blanco', 'Gris'] },
  { nombre: 'Talla Calzado', valores: ['22', '23', '24', '25', '26', '27', '28', '29', '30'] },
];

const TIER_LABEL_PRESETS = ['Menudeo', 'Crédito', 'Mayoreo', 'Caja', 'Especial'];

export function CreateProductModal({ isOpen, onClose, onSave, onError }: CreateProductModalProps) {
  const { settings } = useCompany();
  const primary = settings.primaryColor;

  // ── Tab activo ────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('info');

  // ── Info básica ───────────────────────────────────────────────────────
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [sku, setSku] = useState('');
  const [precio, setPrecio] = useState<number>(0);
  const [costo, setCosto] = useState<number>(0);
  const [categoriaId, setCategoriaId] = useState<number | ''>('');
  const [imagen, setImagen] = useState('');
  const [variaciones, setVariaciones] = useState<ProductoVariacion[]>([]);
  const [tipoVariacion, setTipoVariacion] = useState('');
  const [valorVariacion, setValorVariacion] = useState('');
  const [stockVariacion, setStockVariacion] = useState<number>(0);

  // ── Catálogos ─────────────────────────────────────────────────────────
  const [categorias, setCategorias] = useState<CategoryDto[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [priceZones, setPriceZones] = useState<PriceZone[]>([]);
  const [existingCatDiscounts, setExistingCatDiscounts] = useState<CategoryDiscount[]>([]);

  // ── Tab 2: Precios por zona ───────────────────────────────────────────
  // zonePrices[zoneCode] = array de tiers
  const [zonePrices, setZonePrices] = useState<Record<string, TierRow[]>>({});
  const [activeZoneTab, setActiveZoneTab] = useState<string>('');
  // Form de nuevo tier
  const [newTierMinQty, setNewTierMinQty] = useState<number>(1);
  const [newTierPrice, setNewTierPrice] = useState<number>(0);
  const [newTierLabel, setNewTierLabel] = useState('');

  // ── Tab 3: Descuentos por categoría ──────────────────────────────────
  const [pendingCatDiscounts, setPendingCatDiscounts] = useState<PendingCatDiscount[]>([]);
  const [newDiscMinQty, setNewDiscMinQty] = useState<number>(1);
  const [newDiscPct, setNewDiscPct] = useState<number>(0);
  const [newDiscLabel, setNewDiscLabel] = useState('');

  // ── Submitting ────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState('');

  // ── Cargar datos al abrir ─────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setLoadingCategorias(true);
    Promise.all([
      getCategories(),
      getPriceZones(),
    ]).then(([cats, zones]) => {
      setCategorias(cats);
      setPriceZones(zones);
      if (zones.length > 0 && !activeZoneTab) setActiveZoneTab(zones[0].code);
    }).catch(() => {}).finally(() => setLoadingCategorias(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Cargar descuentos existentes cuando cambia la categoría
  useEffect(() => {
    if (!categoriaId) { setExistingCatDiscounts([]); return; }
    getCategoryDiscounts().then(all => {
      setExistingCatDiscounts(all.filter(d => d.categoryId === Number(categoriaId)));
    }).catch(() => {});
  }, [categoriaId]);

  // ── Reset ─────────────────────────────────────────────────────────────
  const handleReset = () => {
    setTab('info');
    setNombre(''); setDescripcion(''); setSku('');
    setPrecio(0); setCosto(0); setCategoriaId(''); setImagen('');
    setVariaciones([]); setTipoVariacion(''); setValorVariacion(''); setStockVariacion(0);
    setZonePrices({}); setNewTierMinQty(1); setNewTierPrice(0); setNewTierLabel('');
    setPendingCatDiscounts([]); setNewDiscMinQty(1); setNewDiscPct(0); setNewDiscLabel('');
    setSubmitting(false); setSubmitStep('');
  };

  const handleClose = () => { handleReset(); onClose(); };

  // ── Variaciones ───────────────────────────────────────────────────────
  const handleAddVariacion = () => {
    if (!tipoVariacion || !valorVariacion) return;
    setVariaciones(prev => [...prev, {
      id: `var-${Date.now()}`,
      nombre: tipoVariacion, valor: valorVariacion, stock: stockVariacion,
    }]);
    setValorVariacion(''); setStockVariacion(0);
  };

  // ── Tier helpers ──────────────────────────────────────────────────────
  const addTier = () => {
    if (!activeZoneTab || newTierPrice <= 0) return;
    const label = newTierLabel || `≥${newTierMinQty} pz`;
    setZonePrices(prev => ({
      ...prev,
      [activeZoneTab]: [
        ...(prev[activeZoneTab] ?? []),
        { minQty: newTierMinQty, price: newTierPrice, label },
      ].sort((a, b) => a.minQty - b.minQty),
    }));
    setNewTierMinQty(1); setNewTierPrice(0); setNewTierLabel('');
  };

  const removeTier = (zoneCode: string, idx: number) => {
    setZonePrices(prev => ({
      ...prev,
      [zoneCode]: (prev[zoneCode] ?? []).filter((_, i) => i !== idx),
    }));
  };

  // ── Discount helpers ──────────────────────────────────────────────────
  const addDiscount = () => {
    if (newDiscPct <= 0 || newDiscMinQty < 1) return;
    const label = newDiscLabel || `Desc. ${newDiscPct}% ≥${newDiscMinQty} pz`;
    setPendingCatDiscounts(prev => [...prev, { minQty: newDiscMinQty, discountPercent: newDiscPct, label }]
      .sort((a, b) => a.minQty - b.minQty));
    setNewDiscMinQty(1); setNewDiscPct(0); setNewDiscLabel('');
  };

  // ── Validación por tab ────────────────────────────────────────────────
  const infoValid = !!(nombre && sku && categoriaId && variaciones.length > 0);
  const totalTiersConfigured = Object.values(zonePrices).reduce((s, t) => s + t.length, 0);
  const pricesValid = totalTiersConfigured > 0;

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!infoValid) { setTab('info'); return; }
    if (!pricesValid) { setTab('precios'); return; }
    setSubmitting(true);
    try {
      // 1. Crear producto
      setSubmitStep('Creando producto...');
      const createDto: CreateProductDto = {
        name: nombre,
        description: descripcion || undefined,
        sku,
        categoryId: Number(categoriaId),
        defaultPrice: precio,
        cost: costo || undefined,
        currency: 'MXN',
        image: imagen || undefined,
        variants: variaciones.map(v => ({
          variantName: `${v.nombre}: ${v.valor}`,
          stock: v.stock,
        })),
      };
      const created = await createProduct(createDto);

      // 2. Crear price tiers por zona (para cada variante)
      const tierCount = Object.values(zonePrices).reduce((s, t) => s + t.length, 0);
      if (tierCount > 0 && created.variants?.length > 0) {
        setSubmitStep('Configurando precios por zona...');
        const zoneMap = new Map(priceZones.map(z => [z.code, z.id]));
        for (const variant of created.variants) {
          for (const [zoneCode, tiers] of Object.entries(zonePrices)) {
            const priceZoneId = zoneMap.get(zoneCode);
            if (!priceZoneId) continue;
            for (let i = 0; i < tiers.length; i++) {
              const t = tiers[i];
              await createVariantPriceTier(variant.id, {
                priceZoneId,
                minQty: t.minQty,
                price: t.price,
                tierLabel: t.label,
              });
            }
          }
        }
      }

      // 3. Crear descuentos por categoría pendientes
      if (pendingCatDiscounts.length > 0 && categoriaId) {
        setSubmitStep('Configurando descuentos por categoría...');
        for (const d of pendingCatDiscounts) {
          await createCategoryDiscount({
            categoryId: Number(categoriaId),
            minQty: d.minQty,
            discountPercent: d.discountPercent,
            label: d.label,
          });
        }
      }

      // 4. Actualizar UI
      const stockTotal = variaciones.reduce((s, v) => s + v.stock, 0);
      const categoriaSeleccionada = categorias.find(c => c.id === categoriaId);
      onSave({
        nombre, descripcion, sku, precio, costo,
        categoria: categoriaSeleccionada?.name || '',
        imageUrl: imagen || undefined,
        variaciones, stockTotal, activo: true,
      });

      handleReset(); onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      if (onError) onError(`Error: ${msg}`);
    } finally {
      setSubmitting(false); setSubmitStep('');
    }
  };

  const stockTotal = variaciones.reduce((sum, v) => sum + v.stock, 0);
  const valoresDisponibles = variacionesTemplate.find(v => v.nombre === tipoVariacion)?.valores || [];
  const categoriaSeleccionada = categorias.find(c => c.id === categoriaId);

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'info', label: 'Info básica', icon: <Package className="w-3.5 h-3.5" /> },
    { id: 'precios', label: 'Precios por zona', icon: <MapPin className="w-3.5 h-3.5" />, badge: totalTiersConfigured || undefined },
    { id: 'descuentos', label: 'Descuentos', icon: <Tag className="w-3.5 h-3.5" />, badge: pendingCatDiscounts.length || undefined },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Crear Nuevo Producto" size="2xl">
      <div className="flex flex-col" style={{ minHeight: '520px' }}>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 border-b border-gray-200 mb-6 -mt-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px relative"
              style={tab === t.id
                ? { color: primary, borderColor: primary }
                : { color: '#6b7280', borderColor: 'transparent' }
              }
            >
              {t.icon}
              {t.label}
              {t.badge ? (
                <span
                  className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: primary }}
                >
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ══════════════════ TAB 1: Info básica ══════════════════ */}
        {tab === 'info' && (
          <div className="space-y-6 flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Producto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                    placeholder="Ej: Varilla 3/8 x 12m"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" value={sku} onChange={e => setSku(e.target.value.toUpperCase())}
                    placeholder="Ej: VAR-038-12"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <Select value={categoriaId} onChange={e => setCategoriaId(e.target.value ? Number(e.target.value) : '')} disabled={loadingCategorias}>
                    <option value="">{loadingCategorias ? 'Cargando...' : 'Seleccione una categoría'}</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={descripcion} onChange={e => setDescripcion(e.target.value)}
                    rows={3} placeholder="Descripción del producto..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL de Imagen</label>
                  <div className="flex gap-2">
                    <input
                      type="text" value={imagen} onChange={e => setImagen(e.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                      <Upload className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  {imagen && (
                    <div className="mt-3 aspect-square rounded-lg overflow-hidden bg-gray-100 max-w-[120px]">
                      <Image src={imagen} alt="Preview" width={120} height={120} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Venta</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                      <input type="number" value={precio || ''} onChange={e => setPrecio(parseFloat(e.target.value) || 0)}
                        placeholder="0.00" step="0.01" min="0"
                        className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                      <input type="number" value={costo || ''} onChange={e => setCosto(parseFloat(e.target.value) || 0)}
                        placeholder="0.00" step="0.01" min="0"
                        className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
                {precio > 0 && costo > 0 && (
                  <div className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="text-gray-600">Margen:</span>
                    <span className={`font-semibold ${precio > costo ? 'text-green-600' : 'text-red-600'}`}>
                      {((precio - costo) / precio * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Variaciones */}
            <div className="border-t pt-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Variaciones y Stock <span className="text-red-500">*</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <Select value={tipoVariacion} onChange={e => { setTipoVariacion(e.target.value); setValorVariacion(''); }}>
                  <option value="">Tipo de variación</option>
                  {variacionesTemplate.map(t => <option key={t.nombre} value={t.nombre}>{t.nombre}</option>)}
                </Select>
                {tipoVariacion ? (
                  <Select value={valorVariacion} onChange={e => setValorVariacion(e.target.value)}>
                    <option value="">Seleccione valor</option>
                    {valoresDisponibles.map(v => <option key={v} value={v}>{v}</option>)}
                  </Select>
                ) : (
                  <input type="text" value={valorVariacion} onChange={e => setValorVariacion(e.target.value)}
                    placeholder="Valor" disabled
                    className="px-3 py-2 border border-gray-200 rounded-lg opacity-50 bg-gray-50" />
                )}
                <input type="number" value={stockVariacion || ''} onChange={e => setStockVariacion(parseInt(e.target.value) || 0)}
                  placeholder="Stock inicial" min="0"
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <Button onClick={handleAddVariacion} disabled={!tipoVariacion || !valorVariacion} className="flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Agregar
                </Button>
              </div>

              {variaciones.length > 0 ? (
                <div className="space-y-2">
                  {variaciones.map(v => (
                    <div key={v.id} className="flex items-center justify-between gap-3 px-3 py-2 border border-gray-200 rounded-lg bg-white">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primary }} />
                        <span className="text-sm font-medium text-gray-900">{v.nombre}: {v.valor}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                          <button onClick={() => setVariaciones(p => p.map(x => x.id === v.id ? { ...x, stock: Math.max(0, x.stock - 1) } : x))}
                            className="px-2 py-1 hover:bg-gray-100 transition-colors">
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>
                          <input type="number" value={v.stock}
                            onChange={e => setVariaciones(p => p.map(x => x.id === v.id ? { ...x, stock: parseInt(e.target.value) || 0 } : x))}
                            className="w-14 text-center border-x border-gray-200 py-1 text-sm focus:outline-none" min="0" />
                          <button onClick={() => setVariaciones(p => p.map(x => x.id === v.id ? { ...x, stock: x.stock + 1 } : x))}
                            className="px-2 py-1 hover:bg-gray-100 transition-colors">
                            <Plus className="w-3 h-3 text-gray-600" />
                          </button>
                        </div>
                        <span className="text-xs text-gray-500 w-6">uds</span>
                        <button onClick={() => setVariaciones(p => p.filter(x => x.id !== v.id))} className="p-1 hover:bg-red-50 rounded text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
                    <span className="text-sm font-medium text-gray-700">Stock Total:</span>
                    <span className="text-base font-bold" style={{ color: primary }}>{stockTotal} unidades</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-sm text-gray-500">No hay variaciones agregadas</p>
                  <p className="text-xs text-gray-400 mt-1">Agrega al menos una variación para continuar</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setTab('precios')} disabled={!infoValid} className="flex items-center gap-2">
                Siguiente: Precios por zona <MapPin className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ══════════════════ TAB 2: Precios por zona ══════════════════ */}
        {tab === 'precios' && (
          <div className="flex-1 space-y-4">
            {!infoValid && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Completa la info básica primero (nombre, SKU, categoría y al menos una variación).
              </div>
            )}

            <p className="text-xs text-gray-500">
              Define los precios por cantidad para cada zona de entrega. Cada variante creada recibirá los mismos tiers.
            </p>

            {priceZones.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Cargando zonas...</div>
            ) : (
              <>
                {/* Zone tabs */}
                <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-lg p-0.5 w-fit">
                  {priceZones.map(z => {
                    const count = zonePrices[z.code]?.length ?? 0;
                    return (
                      <button
                        key={z.code}
                        onClick={() => setActiveZoneTab(z.code)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                        style={activeZoneTab === z.code
                          ? { background: 'white', color: '#111827', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
                          : { color: '#6b7280' }
                        }
                      >
                        <MapPin className="w-3 h-3" />
                        {z.label}
                        {count > 0 && (
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: primary }}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Tiers de la zona activa */}
                {activeZoneTab && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Tiers existentes */}
                    {(zonePrices[activeZoneTab] ?? []).length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-400 tracking-wide">
                            <th className="text-left px-4 py-2">Cantidad mínima</th>
                            <th className="text-left px-4 py-2">Precio unitario</th>
                            <th className="text-left px-4 py-2">Etiqueta</th>
                            <th className="px-4 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(zonePrices[activeZoneTab] ?? []).map((t, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-2.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: `${primary}18`, color: primary }}>
                                  ≥ {t.minQty} pz
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-mono font-semibold text-gray-900">${t.price.toFixed(2)}</td>
                              <td className="px-4 py-2.5 text-gray-500">{t.label}</td>
                              <td className="px-4 py-2.5 text-right">
                                <button onClick={() => removeTier(activeZoneTab, i)} className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-6 text-gray-400 text-sm">
                        Sin tiers para esta zona. Agrega uno abajo.
                      </div>
                    )}

                    {/* Form nuevo tier */}
                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Agregar tier</p>
                      <div className="flex items-end gap-2 flex-wrap">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">Cant. mínima</label>
                          <input type="number" value={newTierMinQty} onChange={e => setNewTierMinQty(parseInt(e.target.value) || 1)}
                            min="1" className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white" style={{ '--tw-ring-color': primary } as React.CSSProperties} />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-1">Precio unitario</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                            <input type="number" value={newTierPrice || ''} onChange={e => setNewTierPrice(parseFloat(e.target.value) || 0)}
                              step="0.01" min="0" placeholder="0.00"
                              className="w-28 pl-5 pr-2 py-1.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 bg-white" style={{ '--tw-ring-color': primary } as React.CSSProperties} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-[140px]">
                          <label className="block text-[10px] text-gray-500 mb-1">Etiqueta</label>
                          <div className="flex gap-1">
                            <input type="text" value={newTierLabel} onChange={e => setNewTierLabel(e.target.value)}
                              placeholder={`≥${newTierMinQty} pz`}
                              className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white" style={{ '--tw-ring-color': primary } as React.CSSProperties} />
                          </div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {TIER_LABEL_PRESETS.map(p => (
                              <button key={p} onClick={() => setNewTierLabel(p)}
                                className="px-1.5 py-0.5 rounded text-[10px] border border-gray-200 text-gray-500 hover:border-gray-400 transition-colors bg-white">
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={addTier}
                          disabled={newTierPrice <= 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all hover:opacity-90"
                          style={{ backgroundColor: primary }}
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resumen de todos los tiers */}
                {totalTiersConfigured > 0 && (
                  <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    {totalTiersConfigured} tier{totalTiersConfigured !== 1 ? 's' : ''} configurado{totalTiersConfigured !== 1 ? 's' : ''} en {Object.keys(zonePrices).filter(k => zonePrices[k].length > 0).length} zona{Object.keys(zonePrices).filter(k => zonePrices[k].length > 0).length !== 1 ? 's' : ''}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setTab('info')}>← Info básica</Button>
              <Button onClick={() => setTab('descuentos')} className="flex items-center gap-2">
                Siguiente: Descuentos <Tag className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ══════════════════ TAB 3: Descuentos ══════════════════ */}
        {tab === 'descuentos' && (
          <div className="flex-1 space-y-5">
            <p className="text-xs text-gray-500">
              Los descuentos por categoría aplican a <b>todos los productos</b> de la categoría seleccionada.
              {categoriaSeleccionada && <> Categoría actual: <b>{categoriaSeleccionada.name}</b>.</>}
            </p>

            {!categoriaId && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Selecciona una categoría en la pestaña "Info básica" primero.
              </div>
            )}

            {/* Descuentos existentes */}
            {existingCatDiscounts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Descuentos ya configurados para esta categoría
                </p>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-400 tracking-wide">
                        <th className="text-left px-4 py-2">Cant. mínima</th>
                        <th className="text-left px-4 py-2">Descuento</th>
                        <th className="text-left px-4 py-2">Etiqueta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {existingCatDiscounts.map(d => (
                        <tr key={d.id} className="bg-white">
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">≥ {d.minQty} pz</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">−{d.discountPercent}%</span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{d.label}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Nuevos descuentos a crear */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Nuevos descuentos a agregar
              </p>

              {pendingCatDiscounts.length > 0 ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-400 tracking-wide">
                        <th className="text-left px-4 py-2">Cant. mínima</th>
                        <th className="text-left px-4 py-2">Descuento %</th>
                        <th className="text-left px-4 py-2">Etiqueta</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pendingCatDiscounts.map((d, i) => (
                        <tr key={i} className="bg-white">
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: `${primary}18`, color: primary }}>≥ {d.minQty} pz</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">−{d.discountPercent}%</span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{d.label}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button onClick={() => setPendingCatDiscounts(p => p.filter((_, j) => j !== i))}
                              className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5 bg-gray-50 rounded-xl border border-dashed border-gray-200 mb-3 text-sm text-gray-400">
                  Sin descuentos nuevos. Agrega uno abajo.
                </div>
              )}

              {/* Form nuevo descuento */}
              <div className="border border-gray-200 rounded-xl bg-gray-50 px-4 py-3">
                <div className="flex items-end gap-2 flex-wrap">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Cant. mínima</label>
                    <input type="number" value={newDiscMinQty} onChange={e => setNewDiscMinQty(parseInt(e.target.value) || 1)}
                      min="1" className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white" style={{ '--tw-ring-color': primary } as React.CSSProperties} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Descuento %</label>
                    <div className="relative">
                      <input type="number" value={newDiscPct || ''} onChange={e => setNewDiscPct(parseFloat(e.target.value) || 0)}
                        step="0.1" min="0" max="100" placeholder="5"
                        className="w-24 px-2 pr-6 py-1.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 bg-white" style={{ '--tw-ring-color': primary } as React.CSSProperties} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-[10px] text-gray-500 mb-1">Etiqueta</label>
                    <input type="text" value={newDiscLabel} onChange={e => setNewDiscLabel(e.target.value)}
                      placeholder={`Desc. ${newDiscPct || 0}% ≥${newDiscMinQty} pz`}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white" style={{ '--tw-ring-color': primary } as React.CSSProperties} />
                  </div>
                  <button
                    onClick={addDiscount}
                    disabled={!categoriaId || newDiscPct <= 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all hover:opacity-90"
                    style={{ backgroundColor: primary }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setTab('precios')}>← Precios por zona</Button>
              <div className="flex flex-col items-end gap-1">
                {!pricesValid && !submitting && (
                  <p className="text-xs text-amber-600">Configura al menos un precio por zona</p>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={!infoValid || !pricesValid || submitting}
                  className="flex items-center gap-2"
                  style={{ backgroundColor: primary }}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      {submitStep || 'Creando...'}
                    </>
                  ) : (
                    <><DollarSign className="w-4 h-4" /> Crear Producto</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Botón guardar global (siempre visible en tab info) */}
        {tab !== 'descuentos' && tab !== 'precios' && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
            <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!infoValid || !pricesValid || submitting} className="flex items-center gap-2">
              {submitting ? submitStep || 'Creando...' : 'Crear Producto'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
