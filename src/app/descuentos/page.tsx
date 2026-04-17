'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Plus, Check, X, Trash2, Info, Copy, Layers, Tag, ChevronRight,
} from 'lucide-react';
import { PermissionGuard } from '@/components/layout';
import { PriceStepChart } from '@/components/descuentos/price-step-chart';
import { HelpModal } from '@/components/descuentos/help-modal';
import { useToast } from '@/lib/hooks';
import { getPriceZones } from '@/services/price-zones';
import { PriceZone } from '@/services/price-zones/price-zones.types';
import { getOrderProducts } from '@/services/orders';
import { OrderProductItem } from '@/services/orders/orders.types';
import { getCategories } from '@/services/products';
import { CategoryDto } from '@/services/products/products.types';
import {
  PriceTierItem,
  CategoryDiscount,
  getVariantPriceTiers,
  createVariantPriceTier,
  updatePriceTier,
  deletePriceTier,
  getCategoryDiscounts,
  createCategoryDiscount,
  updateCategoryDiscount,
  deleteCategoryDiscount,
} from '@/services/discounts';
import { formatCurrency } from '@/lib/utils';

// ── Helpers ─────────────────────────────────────────────────────────────
const pctOff = (base: number, price: number) =>
  base > 0 ? ((base - price) / base) * 100 : 0;

// ── Shared styled primitives ─────────────────────────────────────────────
const S = {
  field: {
    width: '100%', padding: '6px 10px', fontSize: 13,
    background: 'white', border: '1px solid #e5e7eb', borderRadius: 6,
    fontFamily: 'inherit', color: 'inherit', outline: 'none',
    transition: 'border-color 0.12s, box-shadow 0.12s',
  } as React.CSSProperties,
  fieldNum: {
    fontVariantNumeric: 'tabular-nums', textAlign: 'right',
    fontFamily: 'var(--font-mono, monospace)', fontSize: 12.5,
  } as React.CSSProperties,
};

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      {...props}
      style={{
        ...S.field,
        ...(focus ? { borderColor: 'var(--primary-color, #2563eb)', boxShadow: '0 0 0 3px rgba(37,99,235,0.12)' } : {}),
        ...props.style,
      }}
      onFocus={e => { setFocus(true); props.onFocus?.(e); }}
      onBlur={e => { setFocus(false); props.onBlur?.(e); }}
    />
  );
}

function ActionBtn({ onClick, title, variant, children }: {
  onClick: () => void; title?: string; variant: 'save' | 'cancel' | 'edit' | 'delete';
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const styles: Record<string, React.CSSProperties> = {
    save: { background: 'var(--primary-color, #2563eb)', color: 'white', border: 'none' },
    cancel: { background: 'none', color: '#6b7280', border: '1px solid #e5e7eb' },
    edit: { background: hover ? '#dbeafe' : 'none', color: 'var(--primary-color, #2563eb)', border: 'none' },
    delete: { background: hover ? '#fef2f2' : 'none', color: hover ? '#dc2626' : '#9ca3af', border: 'none' },
  };
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: variant === 'edit' ? 'auto' : 28, height: 28,
        padding: variant === 'edit' ? '0 8px' : 0,
        borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
        fontSize: 11.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.12s',
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────
export default function DescuentosPage() {
  const [tab, setTab] = useState<'cantidad' | 'categoria'>('cantidad');
  const [helpOpen, setHelpOpen] = useState(false);
  const [zones, setZones] = useState<PriceZone[]>([]);
  const toast = useToast();

  useEffect(() => {
    getPriceZones().then(setZones).catch(() => {});
  }, []);

  return (
    <PermissionGuard moduleCode="CONFIG">
      <div style={{ minHeight: '100vh' }}>
        {/* Header */}
        <header style={{ padding: '24px 28px 16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>
                <span>Configuración</span>
                <ChevronRight size={10} />
                <span>Precios &amp; descuentos</span>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: '#1f2937' }}>
                Descuentos
              </h1>
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                Precios escalonados por cantidad y zona. Se aplican automáticamente al crear pedidos.
              </p>
            </div>
            <button
              onClick={() => setHelpOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                color: '#1f2937', background: 'white', border: '1px solid #e5e7eb',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-color, #2563eb)'; e.currentTarget.style.color = 'var(--primary-color, #2563eb)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#1f2937'; }}
            >
              <Info size={13} /> Cómo funciona
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div style={{ padding: '0 28px', borderBottom: '1px solid #e5e7eb', background: 'white', display: 'flex', alignItems: 'center', gap: 24 }}>
          {([
            { key: 'cantidad', label: 'Por cantidad', icon: <Layers size={13} /> },
            { key: 'categoria', label: 'Por categoría', icon: <Tag size={13} /> },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 2px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
                color: tab === t.key ? 'var(--primary-color, #2563eb)' : '#6b7280',
                transition: 'color 0.12s',
              }}
            >
              <span style={{ opacity: 0.7 }}>{t.icon}</span>
              {t.label}
              {tab === t.key && (
                <span style={{
                  position: 'absolute', left: 0, right: 0, bottom: -1,
                  height: 2, background: 'var(--primary-color, #2563eb)', borderRadius: 2,
                }} />
              )}
            </button>
          ))}
        </div>

        {/* View */}
        <div style={{ background: 'white' }}>
          {tab === 'cantidad' && (
            <div key="cantidad" style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <CantidadView zones={zones} toast={toast} />
            </div>
          )}
          {tab === 'categoria' && (
            <div key="categoria" style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <CategoriaView zones={zones} toast={toast} />
            </div>
          )}
        </div>

        {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      </div>
    </PermissionGuard>
  );
}

// ═══ POR CANTIDAD ══════════════════════════════════════════════════════
function CantidadView({ zones, toast }: { zones: PriceZone[]; toast: ReturnType<typeof useToast> }) {
  const [variants, setVariants] = useState<OrderProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    getOrderProducts({ limit: 200 })
      .then(res => {
        setVariants(res.items);
        if (res.items.length > 0) setSelectedId(res.items[0].id);
      })
      .catch(() => toast.error('No se pudieron cargar las variantes'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return variants;
    const q = search.toLowerCase();
    return variants.filter(v =>
      v.sku.toLowerCase().includes(q) ||
      v.name.toLowerCase().includes(q) ||
      v.variantName?.toLowerCase().includes(q)
    );
  }, [variants, search]);

  const selected = variants.find(v => v.id === selectedId) ?? null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', minHeight: 'calc(100vh - 220px)' }}>
      {/* List */}
      <div style={{ borderRight: '1px solid #e5e7eb', background: '#fafbf7' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <Field
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="SKU o producto…"
              style={{ paddingLeft: 30 }}
            />
          </div>
        </div>
        <div style={{ padding: '8px 12px', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
          <span>{filtered.length} variantes</span>
          <span>Tiers</span>
        </div>
        <div style={{ maxHeight: 'calc(100vh - 330px)', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 12.5, color: '#9ca3af' }}>Cargando…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 12.5, color: '#9ca3af' }}>Sin resultados</div>
          ) : filtered.map(v => {
            const isActive = v.id === selectedId;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px',
                  borderBottom: '1px solid #e5e7eb', border: 'none', borderBottomStyle: 'solid',
                  background: isActive ? 'white' : 'transparent', cursor: 'pointer',
                  boxShadow: isActive ? 'inset 3px 0 0 var(--primary-color, #2563eb)' : 'none',
                  transition: 'background 0.14s, box-shadow 0.14s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, color: '#6b7280', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.sku}
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.variantName} · base {formatCurrency(v.price)}
                    </div>
                  </div>
                  <VariantTierBadge variantId={v.id} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      <div style={{ overflowY: 'auto' }}>
        {selected && (
          <div key={selected.id} style={{ animation: 'fadeInUp 0.28s cubic-bezier(0.22,1,0.36,1) both' }}>
            <VariantDetail variant={selected} zones={zones} toast={toast} />
          </div>
        )}
      </div>
    </div>
  );
}

function VariantTierBadge({ variantId }: { variantId: number }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    getVariantPriceTiers(variantId)
      .then(tiers => setCount(tiers.length))
      .catch(() => setCount(0));
  }, [variantId]);
  if (count === null) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 999, fontSize: 11, fontWeight: 500, fontVariantNumeric: 'tabular-nums',
      background: count > 0 ? '#dbeafe' : 'transparent',
      color: count > 0 ? 'var(--primary-color, #2563eb)' : '#9ca3af',
      border: count > 0 ? '1px solid transparent' : '1px solid #e5e7eb',
      flexShrink: 0,
    }}>
      {count}
    </span>
  );
}

// ── Variant Detail ───────────────────────────────────────────────────
interface TierDraft {
  id: number | '__new__';
  priceZoneId: number | null;
  minQty: number;
  price: number;
  tierLabel: string;
}

function VariantDetail({ variant, zones, toast }: {
  variant: OrderProductItem;
  zones: PriceZone[];
  toast: ReturnType<typeof useToast>;
}) {
  const [tiers, setTiers] = useState<PriceTierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | '__new__' | null>(null);
  const [draft, setDraft] = useState<TierDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [justAddedId, setJustAddedId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getVariantPriceTiers(variant.id)
      .then(setTiers)
      .catch(() => toast.error('Error al cargar tiers'))
      .finally(() => setLoading(false));
  }, [variant.id]);

  useEffect(() => { load(); setEditingId(null); setDraft(null); }, [load]);

  const sorted = useMemo(() => [...tiers].sort((a, b) => a.minQty - b.minQty), [tiers]);

  const startEdit = (t: PriceTierItem) => {
    setEditingId(t.id);
    setDraft({ id: t.id, priceZoneId: t.priceZoneId, minQty: t.minQty, price: t.price, tierLabel: t.tierLabel });
  };
  const startAdd = () => {
    const last = sorted[sorted.length - 1];
    setEditingId('__new__');
    setDraft({
      id: '__new__',
      priceZoneId: zones[0]?.id ?? null,
      minQty: last ? last.minQty * 2 : 1,
      price: last ? Math.round(last.price * 0.95) : variant.price,
      tierLabel: '',
    });
  };
  const cancel = () => { setEditingId(null); setDraft(null); };

  const commit = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      if (draft.id === '__new__') {
        const created = await createVariantPriceTier(variant.id, {
          priceZoneId: draft.priceZoneId,
          minQty: draft.minQty,
          price: draft.price,
          tierLabel: draft.tierLabel,
        });
        setTiers(prev => [...prev, created].sort((a, b) => a.minQty - b.minQty));
        setJustAddedId(created.id);
        setTimeout(() => setJustAddedId(null), 1200);
        toast.success('Tier agregado');
      } else {
        const updated = await updatePriceTier(draft.id as number, {
          priceZoneId: draft.priceZoneId,
          minQty: draft.minQty,
          price: draft.price,
          tierLabel: draft.tierLabel,
        });
        setTiers(prev => prev.map(t => t.id === updated.id ? updated : t).sort((a, b) => a.minQty - b.minQty));
        setJustAddedId(updated.id);
        setTimeout(() => setJustAddedId(null), 1200);
        toast.success('Tier actualizado');
      }
      setEditingId(null);
      setDraft(null);
    } catch {
      toast.error('Error al guardar tier');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await deletePriceTier(id);
      setTiers(prev => prev.filter(t => t.id !== id));
      toast.success('Tier eliminado');
    } catch {
      toast.error('Error al eliminar tier');
    }
  };

  const defaultZoneId = zones.find(z => z.code === 'GENERAL')?.id ?? zones[0]?.id ?? 1;

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: '#6b7280' }}>{variant.sku}</span>
            <span style={{
              padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500,
              background: '#f1f2ed', color: '#4b5563', border: '1px solid #e5e7eb',
            }}>
              {variant.category}
            </span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, margin: 0, color: '#1f2937' }}>
            {variant.name}{' '}
            <span style={{ color: '#6b7280', fontWeight: 500 }}>· {variant.variantName}</span>
          </h2>
          <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 6 }}>
            Precio base:{' '}
            <span style={{ fontFamily: 'var(--font-mono, monospace)', color: '#1f2937', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(variant.price)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px',
              borderRadius: 8, fontSize: 12.5, fontWeight: 500, color: '#1f2937',
              background: 'white', border: '1px solid #e5e7eb', cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-color, #2563eb)'; e.currentTarget.style.color = 'var(--primary-color, #2563eb)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#1f2937'; }}
          >
            <Copy size={13} /> Copiar tiers
          </button>
          <button
            onClick={startAdd}
            disabled={editingId === '__new__' || saving}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 13px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'var(--primary-color, #2563eb)', color: 'white',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              opacity: editingId === '__new__' ? 0.5 : 1,
            }}
          >
            <Plus size={14} /> Agregar tier
          </button>
        </div>
      </div>

      {/* Table + Chart */}
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1.5fr 1fr' }}>
        {/* Table */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#fafbf7', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, width: 28 }}>#</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Zona</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Cant. mín.</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Precio</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Ahorro</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Etiqueta</th>
                  <th style={{ padding: '10px 12px', width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: '32px 12px', textAlign: 'center', color: '#9ca3af', fontSize: 12.5 }}>Cargando…</td></tr>
                ) : (
                  <>
                    {sorted.map((t, idx) => {
                      const isEdit = editingId === t.id;
                      const d = isEdit ? draft! : { ...t, id: t.id };
                      const zone = zones.find(z => z.id === d.priceZoneId);
                      const pct = pctOff(variant.price, d.price);
                      const isNew = t.id === justAddedId;
                      return (
                        <tr key={t.id}
                          style={{
                            borderBottom: '1px solid #e5e7eb',
                            background: isEdit
                              ? 'linear-gradient(90deg, rgba(37,99,235,0.04) 0%, transparent 70%)'
                              : isNew ? 'rgba(16,185,129,0.07)' : 'transparent',
                            boxShadow: isEdit ? 'inset 3px 0 0 var(--primary-color, #2563eb)' : 'none',
                            transition: 'background 0.12s',
                            animation: isNew ? 'rowFlash 1.1s ease-out' : 'none',
                          }}
                        >
                          <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 12px' }}>
                            {isEdit ? (
                              <select
                                value={d.priceZoneId ?? ''}
                                onChange={e => setDraft(prev => prev ? { ...prev, priceZoneId: Number(e.target.value) } : prev)}
                                style={{ ...S.field, padding: '5px 8px', width: 'auto' }}
                              >
                                {zones.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                              </select>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 6, height: 6, borderRadius: 999, background: zone?.code === 'GENERAL' ? '#9ca3af' : 'var(--primary-color, #2563eb)', flexShrink: 0 }} />
                                <span style={{ fontSize: 12.5 }}>{zone?.label ?? '—'}</span>
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            {isEdit ? (
                              <Field
                                type="number" min={1} value={d.minQty}
                                onChange={e => setDraft(prev => prev ? { ...prev, minQty: Number(e.target.value) } : prev)}
                                style={{ ...S.fieldNum, width: 96, padding: '5px 8px' }}
                              />
                            ) : (
                              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums', color: '#1f2937' }}>
                                {d.minQty.toLocaleString('es-MX')}+
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            {isEdit ? (
                              <Field
                                type="number" step={0.01} min={0} value={d.price}
                                onChange={e => setDraft(prev => prev ? { ...prev, price: Number(e.target.value) } : prev)}
                                style={{ ...S.fieldNum, width: 112, padding: '5px 8px' }}
                              />
                            ) : (
                              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#1f2937' }}>
                                {formatCurrency(d.price)}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            {pct > 0 ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontVariantNumeric: 'tabular-nums' }}>
                                −{pct.toFixed(1)}%
                              </span>
                            ) : (
                              <span style={{ fontSize: 11.5, color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>base</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {isEdit ? (
                              <Field
                                type="text" value={d.tierLabel} placeholder="Ej. Mayoreo"
                                onChange={e => setDraft(prev => prev ? { ...prev, tierLabel: e.target.value } : prev)}
                                style={{ padding: '5px 8px' }}
                              />
                            ) : (
                              <span style={{ fontSize: 12.5, color: '#4b5563' }}>
                                {d.tierLabel || <em style={{ color: '#9ca3af' }}>—</em>}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            {isEdit ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <ActionBtn onClick={commit} variant="save" title="Guardar">
                                  {saving ? '…' : <Check size={12} />}
                                </ActionBtn>
                                <ActionBtn onClick={cancel} variant="cancel" title="Cancelar">
                                  <X size={12} />
                                </ActionBtn>
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <ActionBtn onClick={() => startEdit(t)} variant="edit">Editar</ActionBtn>
                                <ActionBtn onClick={() => remove(t.id)} variant="delete" title="Eliminar">
                                  <Trash2 size={13} />
                                </ActionBtn>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* New tier row */}
                    {editingId === '__new__' && draft && (
                      <tr style={{ borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(90deg, rgba(37,99,235,0.04) 0%, transparent 70%)', boxShadow: 'inset 3px 0 0 var(--primary-color, #2563eb)' }}>
                        <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 11 }}>+</td>
                        <td style={{ padding: '10px 12px' }}>
                          <select
                            value={draft.priceZoneId ?? ''}
                            onChange={e => setDraft(prev => prev ? { ...prev, priceZoneId: Number(e.target.value) } : prev)}
                            style={{ ...S.field, padding: '5px 8px', width: 'auto' }}
                          >
                            {zones.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <Field
                            type="number" min={1} value={draft.minQty} autoFocus
                            onChange={e => setDraft(prev => prev ? { ...prev, minQty: Number(e.target.value) } : prev)}
                            style={{ ...S.fieldNum, width: 96, padding: '5px 8px' }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <Field
                            type="number" step={0.01} min={0} value={draft.price}
                            onChange={e => setDraft(prev => prev ? { ...prev, price: Number(e.target.value) } : prev)}
                            style={{ ...S.fieldNum, width: 112, padding: '5px 8px' }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontVariantNumeric: 'tabular-nums' }}>
                            −{pctOff(variant.price, draft.price).toFixed(1)}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <Field
                            type="text" value={draft.tierLabel} placeholder="Ej. Mayoreo"
                            onChange={e => setDraft(prev => prev ? { ...prev, tierLabel: e.target.value } : prev)}
                            style={{ padding: '5px 8px' }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <ActionBtn onClick={commit} variant="save" title="Guardar">
                              {saving ? '…' : <Check size={12} />}
                            </ActionBtn>
                            <ActionBtn onClick={cancel} variant="cancel" title="Cancelar">
                              <X size={12} />
                            </ActionBtn>
                          </div>
                        </td>
                      </tr>
                    )}

                    {sorted.length === 0 && editingId !== '__new__' && (
                      <tr>
                        <td colSpan={7} style={{ padding: '48px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 500, marginBottom: 4 }}>Sin tiers de descuento</div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Esta variante se vende al precio base.</div>
                          <button
                            onClick={startAdd}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '7px 13px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                              background: 'var(--primary-color, #2563eb)', color: 'white',
                              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            <Plus size={14} /> Agregar primer tier
                          </button>
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
          {sorted.length > 0 && (
            <div style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', background: '#fafbf7', fontSize: 11.5, color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
              <span>Los tiers se ordenan automáticamente por cantidad mínima.</span>
            </div>
          )}
        </div>

        {/* Chart */}
        <PriceStepChart basePrice={variant.price} tiers={tiers} defaultZoneId={defaultZoneId} />
      </div>
    </div>
  );
}

// ═══ POR CATEGORÍA ══════════════════════════════════════════════════════
function CategoriaView({ zones, toast }: { zones: PriceZone[]; toast: ReturnType<typeof useToast> }) {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [discounts, setDiscounts] = useState<CategoryDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getCategories(), getCategoryDiscounts()])
      .then(([cats, discs]) => {
        setCategories(cats);
        setDiscounts(discs);
        if (cats.length > 0) setSelectedId(cats[0].id);
      })
      .catch(() => toast.error('Error al cargar categorías'))
      .finally(() => setLoading(false));
  }, []);

  const selected = categories.find(c => c.id === selectedId) ?? null;
  const tierCount = (catId: number) => discounts.filter(d => d.categoryId === catId).length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', minHeight: 'calc(100vh - 220px)' }}>
      {/* List */}
      <div style={{ borderRight: '1px solid #e5e7eb', background: '#fafbf7' }}>
        <div style={{ padding: '8px 12px', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb' }}>
          <span>{categories.length} categorías</span>
          <span>Tiers</span>
        </div>
        <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 12.5, color: '#9ca3af' }}>Cargando…</div>
          ) : categories.map(c => {
            const isActive = c.id === selectedId;
            const count = tierCount(c.id);
            const abbr = c.name.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase();
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px',
                  borderBottom: '1px solid #e5e7eb', border: 'none', borderBottomStyle: 'solid',
                  background: isActive ? 'white' : 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: isActive ? 'inset 3px 0 0 var(--primary-color, #2563eb)' : 'none',
                  transition: 'background 0.14s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: '#dbeafe', color: 'var(--primary-color, #2563eb)',
                      fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {abbr}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                    borderRadius: 999, fontSize: 11, fontWeight: 500, fontVariantNumeric: 'tabular-nums',
                    background: count > 0 ? '#dbeafe' : 'transparent',
                    color: count > 0 ? 'var(--primary-color, #2563eb)' : '#9ca3af',
                    border: count > 0 ? '1px solid transparent' : '1px solid #e5e7eb',
                    flexShrink: 0,
                  }}>
                    {count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      <div style={{ overflowY: 'auto' }}>
        {selected && (
          <div key={selected.id} style={{ animation: 'fadeInUp 0.28s cubic-bezier(0.22,1,0.36,1) both' }}>
            <CategoryDetail
              category={selected}
              discounts={discounts.filter(d => d.categoryId === selected.id)}
              zones={zones}
              toast={toast}
              onDiscountsChange={updated => {
                setDiscounts(prev => [...prev.filter(d => d.categoryId !== selected.id), ...updated]);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Category Detail ──────────────────────────────────────────────────
interface CategoryDiscountDraft {
  id: number | '__new__';
  priceZoneId: number | null;
  minQty: number;
  discountPercent: number;
  label: string;
}

function CategoryDetail({ category, discounts, zones, toast, onDiscountsChange }: {
  category: CategoryDto;
  discounts: CategoryDiscount[];
  zones: PriceZone[];
  toast: ReturnType<typeof useToast>;
  onDiscountsChange: (updated: CategoryDiscount[]) => void;
}) {
  const [editingId, setEditingId] = useState<number | '__new__' | null>(null);
  const [draft, setDraft] = useState<CategoryDiscountDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [justAddedId, setJustAddedId] = useState<number | null>(null);

  useEffect(() => { setEditingId(null); setDraft(null); }, [category.id]);

  const sorted = useMemo(() => [...discounts].sort((a, b) => a.minQty - b.minQty), [discounts]);
  const abbr = category.name.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase();

  const startEdit = (d: CategoryDiscount) => {
    setEditingId(d.id);
    setDraft({ id: d.id, priceZoneId: null, minQty: d.minQty, discountPercent: d.discountPercent, label: d.label });
  };
  const startAdd = () => {
    const last = sorted[sorted.length - 1];
    setEditingId('__new__');
    setDraft({ id: '__new__', priceZoneId: zones[0]?.id ?? null, minQty: last ? last.minQty * 2 : 10, discountPercent: last ? last.discountPercent + 2 : 5, label: '' });
  };
  const cancel = () => { setEditingId(null); setDraft(null); };

  const commit = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      if (draft.id === '__new__') {
        const created = await createCategoryDiscount({
          categoryId: category.id,
          minQty: draft.minQty,
          discountPercent: draft.discountPercent,
          label: draft.label,
        });
        const updated = [...discounts, created].sort((a, b) => a.minQty - b.minQty);
        onDiscountsChange(updated);
        setJustAddedId(created.id);
        setTimeout(() => setJustAddedId(null), 1200);
        toast.success('Descuento agregado');
      } else {
        const updated = await updateCategoryDiscount(draft.id as number, {
          minQty: draft.minQty,
          discountPercent: draft.discountPercent,
          label: draft.label,
        });
        const newList = discounts.map(d => d.id === updated.id ? updated : d).sort((a, b) => a.minQty - b.minQty);
        onDiscountsChange(newList);
        setJustAddedId(updated.id);
        setTimeout(() => setJustAddedId(null), 1200);
        toast.success('Descuento actualizado');
      }
      setEditingId(null); setDraft(null);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteCategoryDiscount(id);
      onDiscountsChange(discounts.filter(d => d.id !== id));
      toast.success('Descuento eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: '#dbeafe',
              color: 'var(--primary-color, #2563eb)', fontFamily: 'var(--font-mono, monospace)',
              fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {abbr}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, margin: 0, color: '#1f2937' }}>
              {category.name}
            </h2>
          </div>
          <div style={{ fontSize: 12.5, color: '#6b7280' }}>
            Aplica a variantes de esta categoría sin tiers propios.
          </div>
        </div>
        <button
          onClick={startAdd}
          disabled={editingId === '__new__' || saving}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 13px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'var(--primary-color, #2563eb)', color: 'white',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            opacity: editingId === '__new__' ? 0.5 : 1,
          }}
        >
          <Plus size={14} /> Agregar tier
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 2px rgba(16,24,40,0.04)', maxWidth: 700 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fafbf7', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, width: 28 }}>#</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Cant. mín.</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 600 }}>Descuento</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Etiqueta</th>
              <th style={{ padding: '10px 12px', width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((d, idx) => {
              const isEdit = editingId === d.id;
              const row = isEdit ? draft! : d;
              const isNew = d.id === justAddedId;
              return (
                <tr key={d.id}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    background: isEdit
                      ? 'linear-gradient(90deg, rgba(37,99,235,0.04) 0%, transparent 70%)'
                      : isNew ? 'rgba(16,185,129,0.07)' : 'transparent',
                    boxShadow: isEdit ? 'inset 3px 0 0 var(--primary-color, #2563eb)' : 'none',
                    transition: 'background 0.12s',
                  }}
                >
                  <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {isEdit ? (
                      <Field
                        type="number" min={1} value={row.minQty} autoFocus
                        onChange={e => setDraft(prev => prev ? { ...prev, minQty: Number(e.target.value) } : prev)}
                        style={{ ...S.fieldNum, width: 96, padding: '5px 8px' }}
                      />
                    ) : (
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums', color: '#1f2937' }}>
                        {d.minQty.toLocaleString('es-MX')}+
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {isEdit ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Field
                          type="number" step={0.1} min={0} max={100} value={row.discountPercent}
                          onChange={e => setDraft(prev => prev ? { ...prev, discountPercent: Number(e.target.value) } : prev)}
                          style={{ ...S.fieldNum, width: 80, padding: '5px 8px' }}
                        />
                        <span style={{ fontSize: 12, color: '#6b7280' }}>%</span>
                      </div>
                    ) : d.discountPercent > 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontVariantNumeric: 'tabular-nums' }}>
                        −{d.discountPercent}%
                      </span>
                    ) : (
                      <span style={{ fontSize: 11.5, color: '#9ca3af' }}>sin descuento</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {isEdit ? (
                      <Field
                        type="text" value={row.label} placeholder="Ej. Mayoreo"
                        onChange={e => setDraft(prev => prev ? { ...prev, label: e.target.value } : prev)}
                        style={{ padding: '5px 8px' }}
                      />
                    ) : (
                      <span style={{ fontSize: 12.5, color: '#4b5563' }}>
                        {d.label || <em style={{ color: '#9ca3af' }}>—</em>}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    {isEdit ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ActionBtn onClick={commit} variant="save" title="Guardar">
                          {saving ? '…' : <Check size={12} />}
                        </ActionBtn>
                        <ActionBtn onClick={cancel} variant="cancel" title="Cancelar">
                          <X size={12} />
                        </ActionBtn>
                      </div>
                    ) : (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ActionBtn onClick={() => startEdit(d)} variant="edit">Editar</ActionBtn>
                        <ActionBtn onClick={() => remove(d.id)} variant="delete" title="Eliminar">
                          <Trash2 size={13} />
                        </ActionBtn>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {editingId === '__new__' && draft && (
              <tr style={{ borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(90deg, rgba(37,99,235,0.04) 0%, transparent 70%)', boxShadow: 'inset 3px 0 0 var(--primary-color, #2563eb)' }}>
                <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 11 }}>+</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <Field
                    type="number" min={1} value={draft.minQty} autoFocus
                    onChange={e => setDraft(prev => prev ? { ...prev, minQty: Number(e.target.value) } : prev)}
                    style={{ ...S.fieldNum, width: 96, padding: '5px 8px' }}
                  />
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Field
                      type="number" step={0.1} min={0} max={100} value={draft.discountPercent}
                      onChange={e => setDraft(prev => prev ? { ...prev, discountPercent: Number(e.target.value) } : prev)}
                      style={{ ...S.fieldNum, width: 80, padding: '5px 8px' }}
                    />
                    <span style={{ fontSize: 12, color: '#6b7280' }}>%</span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Field
                    type="text" value={draft.label} placeholder="Ej. Mayoreo"
                    onChange={e => setDraft(prev => prev ? { ...prev, label: e.target.value } : prev)}
                    style={{ padding: '5px 8px' }}
                  />
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <ActionBtn onClick={commit} variant="save" title="Guardar">
                      {saving ? '…' : <Check size={12} />}
                    </ActionBtn>
                    <ActionBtn onClick={cancel} variant="cancel" title="Cancelar">
                      <X size={12} />
                    </ActionBtn>
                  </div>
                </td>
              </tr>
            )}

            {sorted.length === 0 && editingId !== '__new__' && (
              <tr>
                <td colSpan={5} style={{ padding: '48px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 500, marginBottom: 4 }}>Sin descuentos por categoría</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Agrega un tier para aplicar descuento a toda la categoría.</div>
                  <button
                    onClick={startAdd}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 13px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: 'var(--primary-color, #2563eb)', color: 'white',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <Plus size={14} /> Agregar primer tier
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {sorted.length > 0 && (
          <div style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', background: '#fafbf7', fontSize: 11.5, color: '#6b7280' }}>
            El descuento se aplica sobre el precio base de cada variante que no tenga tiers propios.
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: '#6b7280', maxWidth: 700 }}>
        <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Prioridad: los tiers por variante (Por cantidad) siempre ganan sobre los de categoría.</span>
      </div>
    </div>
  );
}
