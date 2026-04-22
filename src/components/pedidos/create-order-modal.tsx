'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '@/components/ui';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, DollarSign, History,
  Package, FileText, Download, ChevronLeft, ChevronRight, Warehouse,
  X, User, MapPin, Layers, Tag, Info, RotateCcw, AlertTriangle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks';
import { useCompany } from '@/lib/company-context';
import { getOrderProducts, OrderProductItem, CreateOrderDto } from '@/services/orders';
import { getClients, getClientPriceHistory, ClientDetail, PriceHistoryItem } from '@/services/clients';
import { getProductPriceTiers, getPriceZones, ProductPriceTier, PriceZone } from '@/services/price-zones';
import { getCategoryDiscounts, CategoryDiscount } from '@/services/discounts';
import { Pedido } from '@/types';

// ── Helpers (fuera del componente para evitar re-creaciones) ──────────────────

function resolveZoneTier(
  tiers: ProductPriceTier[],
  zoneCode: string,
  qty: number
): { price: number; label: string; minQty: number } | null {
  const zoneData = tiers.find(t => t.zone?.code === zoneCode);
  if (!zoneData || zoneData.tiers.length === 0) return null;
  const sorted = [...zoneData.tiers].sort((a, b) => b.minQty - a.minQty);
  const match = sorted.find(t => qty >= t.minQty);
  return match ? { price: match.price, label: match.tierLabel, minQty: match.minQty } : null;
}

function nextZoneTier(
  tiers: ProductPriceTier[],
  zoneCode: string,
  qty: number
): { minQty: number; price: number; label: string } | null {
  const zoneData = tiers.find(t => t.zone?.code === zoneCode);
  if (!zoneData) return null;
  const sorted = [...zoneData.tiers].sort((a, b) => a.minQty - b.minQty);
  const t = sorted.find(t => t.minQty > qty);
  return t ? { minQty: t.minQty, price: t.price, label: t.tierLabel } : null;
}

function bestCategoryDiscount(
  categoryDiscounts: CategoryDiscount[],
  categoryName: string,
  qty: number
): CategoryDiscount | null {
  const catLower = categoryName.toLowerCase();
  const matching = categoryDiscounts.filter(d =>
    d.categoryName?.toLowerCase() === catLower
  );
  const sorted = [...matching].sort((a, b) => b.minQty - a.minQty);
  return sorted.find(d => qty >= d.minQty) ?? null;
}

interface PricingResult {
  tierPrice: number;
  tierLabel: string | null;
  catDiscount: CategoryDiscount | null;
  catDiscountAmt: number;
  finalPrice: number;
  savingsPct: number;
  nextTier: { minQty: number; price: number; label: string } | null;
}

function computeProductPrice(
  listPrice: number,
  tiers: ProductPriceTier[],
  categoryDiscounts: CategoryDiscount[],
  categoryName: string,
  zoneCode: string,
  qty: number
): PricingResult {
  const tier = resolveZoneTier(tiers, zoneCode, qty);
  const tierPrice = tier?.price ?? listPrice;
  const cat = bestCategoryDiscount(categoryDiscounts, categoryName, qty);
  const catDiscountAmt = cat ? Math.round(tierPrice * (cat.discountPercent / 100) * 100) / 100 : 0;
  const finalPrice = Math.round((tierPrice - catDiscountAmt) * 100) / 100;
  const savingsPct = listPrice > 0 ? ((listPrice - finalPrice) / listPrice) * 100 : 0;
  const nt = nextZoneTier(tiers, zoneCode, qty);
  return { tierPrice, tierLabel: tier?.label ?? null, catDiscount: cat, catDiscountAmt, finalPrice, savingsPct, nextTier: nt };
}

// ── Client Picker Modal ───────────────────────────────────────────────────────

const CLIENTS_PER_PAGE = 8;

interface ClientPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (client: ClientDetail) => void;
  primary: string;
}

function ClientPickerModal({ isOpen, onClose, onSelect, primary }: ClientPickerModalProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [clients, setClients] = useState<ClientDetail[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    if (!isOpen) return;
    setPage(1);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getClients({ page, limit: CLIENTS_PER_PAGE, search: debouncedSearch || undefined })
      .then(res => {
        setClients(res.items);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, [isOpen, page, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div
        className="fixed z-[70] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-h-[80vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" style={{ color: primary }} />
            <h3 className="text-sm font-semibold text-gray-900">Seleccionar cliente</h3>
            {!loading && <span className="text-xs text-gray-400">{total} clientes</span>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar por nombre, teléfono..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white"
              style={{ '--tw-ring-color': primary } as React.CSSProperties}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: primary }} />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">Sin resultados</div>
          ) : (
            <div className="space-y-1">
              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => { onSelect(client); onClose(); }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors group"
                >
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: primary }}
                  >
                    {client.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{client.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {client.phone && (
                        <span className="text-[11px] text-gray-400">{client.phone}</span>
                      )}
                      {client.address && (
                        <span className="text-[11px] text-gray-400 truncate max-w-[160px]">{client.address}</span>
                      )}
                    </div>
                  </div>
                  {client.priceZone ? (
                    <span
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: `${primary}18`, color: primary }}
                    >
                      <MapPin className="w-2.5 h-2.5" />
                      {client.priceZone.label}
                    </span>
                  ) : (
                    <span className="flex-shrink-0 text-[11px] text-gray-300 italic">Sin zona</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Pág. {page} de {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Zone Price Panel ──────────────────────────────────────────────────────────

interface ZonePricePanelProps {
  product: OrderProductItem;
  tiers: ProductPriceTier[];
  allCategoryDiscounts: CategoryDiscount[];
  clientZoneCode: string;
  qty: number;
  primary: string;
}

function ZonePricePanel({ product, tiers, allCategoryDiscounts, clientZoneCode, qty, primary }: ZonePricePanelProps) {
  const pricing = computeProductPrice(
    product.price, tiers, allCategoryDiscounts, product.category, clientZoneCode, qty
  );

  // All unique minQty levels across all zones, sorted
  const allQtyLevels = Array.from(
    new Set(tiers.flatMap(z => z.tiers.map(t => t.minQty)))
  ).sort((a, b) => a - b);

  // Category discounts for this product
  const catDiscounts = allCategoryDiscounts
    .filter(d => d.categoryName?.toLowerCase() === product.category.toLowerCase())
    .sort((a, b) => a.minQty - b.minQty);

  if (tiers.length === 0) {
    return (
      <div className="mt-2 p-3 rounded-xl border border-gray-200 bg-gray-50 text-center">
        <p className="text-xs text-gray-500">Sin tiers de precio configurados para este producto</p>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-gray-200 overflow-hidden" style={{ fontSize: '10.5px' }}>

      {/* ── SECCIÓN 1: Precios por cantidad y zona ── */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b-2 border-gray-200"
        style={{ background: `${primary}12` }}
      >
        <div className="flex items-center gap-1.5 font-bold" style={{ color: primary }}>
          <Layers className="w-3.5 h-3.5" />
          <span>1 · Precio por cantidad (zona)</span>
        </div>
        <span className="text-gray-500">Cant.: <b className="text-gray-800">{qty}</b></span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" style={{ fontSize: '10.5px' }}>
          <thead>
            <tr className="bg-gray-50 text-gray-400 uppercase border-b border-gray-100" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>
              <th className="text-left pl-3 py-1.5 font-bold">Zona</th>
              {allQtyLevels.map(q => (
                <th key={q} className="text-right py-1.5 pr-2 font-bold whitespace-nowrap">≥{q} pz</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tiers.map(({ zone, tiers: zoneTiers }) => {
              const applied = resolveZoneTier(tiers, zone.code, qty);
              const isClient = zone.code === clientZoneCode;
              return (
                <tr
                  key={zone.code}
                  className="border-t border-gray-100"
                  style={isClient
                    ? { background: `${primary}07`, boxShadow: `inset 3px 0 0 ${primary}` }
                    : {}}
                >
                  <td className="pl-3 py-1.5">
                    <span className={`inline-flex items-center gap-1.5 ${isClient ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                      {isClient && <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: primary }} />}
                      {zone.label}
                    </span>
                  </td>
                  {allQtyLevels.map(q => {
                    const t = zoneTiers.find(t => t.minQty === q);
                    const isApplied = isClient && t && applied?.minQty === t.minQty;
                    return (
                      <td key={q} className="py-1.5 pr-2 text-right">
                        {t ? (
                          <span
                            className="inline-block font-mono px-1.5 py-0.5 rounded"
                            style={isApplied
                              ? { background: primary, color: 'white', fontWeight: 700 }
                              : isClient
                                ? { color: '#1f2937', fontWeight: 600 }
                                : { color: '#9ca3af' }
                            }
                          >
                            {formatCurrency(t.price)}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-1.5 text-gray-500 bg-gray-50 border-t border-gray-200 flex items-center gap-3" style={{ fontSize: '9.5px' }}>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded" style={{ background: primary }} />
          Aplicado
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-2.5 h-2.5" style={{ color: primary }} />
          Zona cliente
        </span>
      </div>

      {/* ── SECCIÓN 2: Descuentos por categoría ── */}
      <div
        className="border-t-2 border-gray-200 flex items-center justify-between px-3 py-2"
        style={{ background: 'rgba(5,150,105,0.05)' }}
      >
        <div className="flex items-center gap-1.5 font-bold text-emerald-700">
          <Tag className="w-3.5 h-3.5" />
          <span>2 · Descuento por categoría ({product.category})</span>
        </div>
        {pricing.catDiscount ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-emerald-600 text-white" style={{ fontSize: '10px' }}>
            −{pricing.catDiscount.discountPercent}%
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500" style={{ fontSize: '10px' }}>
            No aplica
          </span>
        )}
      </div>
      <div className="px-3 py-2">
        {catDiscounts.length === 0 ? (
          <p className="text-gray-400" style={{ fontSize: '10.5px' }}>Sin descuentos de categoría configurados.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {catDiscounts.map(d => {
              const active = pricing.catDiscount?.id === d.id;
              return (
                <div
                  key={d.id}
                  className={`px-2 py-1 rounded-md border ${active ? 'bg-emerald-600 text-white border-emerald-600 font-semibold' : 'bg-white text-gray-600 border-gray-200'}`}
                  style={{ fontSize: '10.5px' }}
                >
                  <span>≥{d.minQty} pz</span>
                  <span className="mx-1 opacity-50">·</span>
                  <span className="font-semibold">−{d.discountPercent}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SECCIÓN 3: Tu precio ── */}
      <div className="border-t-2 border-gray-200 px-3 py-2 bg-gray-50/80">
        <div className="flex items-center gap-1.5 font-bold text-gray-800 mb-2" style={{ fontSize: '11px' }}>
          <Info className="w-3.5 h-3.5 text-gray-500" />
          3 · Tu precio unitario
        </div>
        <div className="space-y-1" style={{ fontSize: '11px' }}>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Precio lista</span>
            <span className="font-mono text-gray-400 line-through">{formatCurrency(product.price)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Tier zona ({pricing.tierLabel ?? 'base'})</span>
            <span className={`font-mono ${pricing.tierPrice < product.price ? 'text-emerald-600' : 'text-gray-500'}`}>
              {pricing.tierPrice < product.price ? `−${formatCurrency(product.price - pricing.tierPrice)}` : '—'}
            </span>
          </div>
          {pricing.catDiscount && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{pricing.catDiscount.label} (−{pricing.catDiscount.discountPercent}%)</span>
              <span className="font-mono text-emerald-600">−{formatCurrency(pricing.catDiscountAmt)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1 border-t border-gray-200">
            <span className="font-semibold text-gray-900">Tu precio</span>
            <span className="font-mono font-bold text-gray-900">{formatCurrency(pricing.finalPrice)}</span>
          </div>
          {pricing.savingsPct > 0.1 && (
            <div className="flex items-center justify-between text-emerald-600 font-semibold" style={{ fontSize: '10px' }}>
              <span>Ahorro total</span>
              <span className="font-mono">−{formatCurrency(product.price - pricing.finalPrice)} ({pricing.savingsPct.toFixed(1)}%)</span>
            </div>
          )}
        </div>
        {pricing.nextTier && (
          <div className="mt-2 flex items-start gap-1.5 text-amber-600 rounded-lg px-2 py-1.5 bg-amber-50 border border-amber-100" style={{ fontSize: '10.5px' }}>
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>
              Agrega <b>{pricing.nextTier.minQty - qty}</b> más para bajar a{' '}
              <b className="font-mono">{formatCurrency(pricing.nextTier.price)}</b>
              <span className="text-gray-400 ml-1">({pricing.nextTier.label})</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Zone Variant: Chips (client zone hero + collapsible others) ───────────────

interface ZoneVariantChipsProps {
  product: OrderProductItem;
  tiers: ProductPriceTier[];
  allCategoryDiscounts: CategoryDiscount[];
  clientZoneCode: string;
  qty: number;
  primary: string;
  onJumpToTier?: (qty: number) => void;
}

function ZoneVariantChips({ product, tiers, allCategoryDiscounts, clientZoneCode, qty, primary, onJumpToTier }: ZoneVariantChipsProps) {
  const [showOther, setShowOther] = useState(false);
  const pricing = computeProductPrice(product.price, tiers, allCategoryDiscounts, product.category, clientZoneCode, qty);
  const clientZoneData = tiers.find(t => t.zone?.code === clientZoneCode);
  const otherZones = tiers.filter(t => t.zone?.code !== clientZoneCode);

  if (!clientZoneData) return null;

  return (
    <div className="mt-3 rounded-xl border border-gray-200 overflow-hidden" style={{ fontSize: '11px' }}>
      {/* Client zone hero */}
      <div className="px-3 py-2.5 border-b border-gray-200" style={{ background: `${primary}09` }}>
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: primary }} />
          <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: primary }}>
            Zona del cliente · {clientZoneData.zone.label}
          </span>
        </div>
        {/* Tier step cards */}
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${clientZoneData.tiers.length}, 1fr)` }}>
          {clientZoneData.tiers.map((t) => {
            const active = pricing.tierPrice === t.price && (resolveZoneTier(tiers, clientZoneCode, qty)?.minQty === t.minQty);
            return (
              <div
                key={t.minQty}
                className="rounded-lg border px-2 py-1.5"
                style={{
                  background: active ? 'white' : 'rgba(255,255,255,0.6)',
                  borderColor: active ? primary : '#e5e7eb',
                  boxShadow: active ? `0 0 0 1.5px ${primary}` : undefined,
                }}
              >
                <div className="text-[9.5px] font-semibold uppercase tracking-wider text-gray-400">{t.tierLabel}</div>
                <div className="font-mono font-bold mt-0.5" style={{ fontSize: '13px', color: active ? primary : '#374151' }}>{formatCurrency(t.price)}</div>
                <div className="text-[9.5px] text-gray-400">≥ {t.minQty} pz</div>
              </div>
            );
          })}
        </div>
        {pricing.nextTier && (
          <button
            onClick={() => onJumpToTier?.(pricing.nextTier!.minQty)}
            className="mt-2 text-[10.5px] flex items-center gap-1.5 font-medium hover:opacity-80 transition-opacity"
            style={{ color: '#b45309' }}
          >
            <Info className="w-3 h-3 flex-shrink-0" />
            Agrega <b>{pricing.nextTier.minQty - qty}</b> más para el tier siguiente ({formatCurrency(pricing.nextTier.price)})
          </button>
        )}
      </div>

      {/* Price breakdown */}
      <div className="px-3 py-2 bg-white space-y-1 text-[11px] border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Lista</span>
          <span className="font-mono text-gray-400 line-through">{formatCurrency(product.price)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-gray-500">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${primary}18`, color: primary }}>Zona</span>
            {pricing.tierLabel}
          </span>
          <span className="font-mono text-gray-600">{formatCurrency(pricing.tierPrice)}</span>
        </div>
        {pricing.catDiscount ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-gray-500">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">Cat. −{pricing.catDiscount.discountPercent}%</span>
              {pricing.catDiscount.label}
            </span>
            <span className="font-mono text-emerald-600">−{formatCurrency(pricing.catDiscountAmt)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <span className="font-semibold text-gray-900">Tu precio</span>
          <span className="font-mono font-bold text-gray-900" style={{ fontSize: '13px' }}>{formatCurrency(pricing.finalPrice)}</span>
        </div>
        {pricing.savingsPct > 0.1 && (
          <div className="flex items-center justify-between text-[10px] text-emerald-600 font-semibold">
            <span>Ahorro total</span>
            <span className="font-mono">−{formatCurrency(product.price - pricing.finalPrice)} ({pricing.savingsPct.toFixed(1)}%)</span>
          </div>
        )}
      </div>

      {/* Other zones collapsible */}
      {otherZones.length > 0 && (
        <div className="px-3 py-2 bg-gray-50/50">
          <button
            onClick={() => setShowOther(!showOther)}
            className="w-full flex items-center justify-between text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              Precios en otras zonas ({otherZones.length})
            </span>
            <span className="text-[10px]">{showOther ? 'Ocultar' : 'Ver'}</span>
          </button>
          {showOther && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {otherZones.map(z => {
                const t = resolveZoneTier(tiers, z.zone.code, qty);
                return (
                  <div key={z.zone.code} className="px-2 py-1 rounded-md bg-white border border-gray-200" style={{ fontSize: '10.5px' }}>
                    <span className="text-gray-400">{z.zone.label}</span>
                    <span className="ml-1.5 font-mono font-semibold text-gray-600">{formatCurrency(t?.price ?? product.price)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Zone Variant: Price Book (slide-in panel) ─────────────────────────────────

interface ZoneVariantPriceBookProps {
  product: OrderProductItem;
  tiers: ProductPriceTier[];
  allCategoryDiscounts: CategoryDiscount[];
  clientZoneCode: string;
  qty: number;
  primary: string;
  onClose: () => void;
  onAdd: (price: number) => void;
}

function ZoneVariantPriceBook({ product, tiers, allCategoryDiscounts, clientZoneCode, qty, primary, onClose, onAdd }: ZoneVariantPriceBookProps) {
  const pricing = computeProductPrice(product.price, tiers, allCategoryDiscounts, product.category, clientZoneCode, qty);
  const clientZoneData = tiers.find(t => t.zone?.code === clientZoneCode);

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-[460px] bg-white border-l border-gray-200 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
              <Layers className="w-3 h-3" /> Price book
            </div>
            <h3 className="text-[15px] font-bold text-gray-900 leading-tight">{product.name}</h3>
            <p className="text-xs text-gray-400">{product.variantName} · <span className="font-mono">{product.sku}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Client zone hero */}
        <div className="px-5 py-4 border-b border-gray-200" style={{ background: `${primary}08` }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: primary }} />
              <span className="text-[11px] font-semibold" style={{ color: primary }}>
                Zona asignada: {clientZoneData?.zone.label}
              </span>
            </div>
            <span className="text-[10px] text-gray-400">Cant. <b className="text-gray-800">{qty}</b></span>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Tu precio</div>
              <div className="font-mono font-bold text-gray-900 leading-none mt-0.5" style={{ fontSize: '28px' }}>{formatCurrency(pricing.finalPrice)}</div>
            </div>
            {pricing.savingsPct > 0.1 && (
              <div className="mb-0.5 pb-0.5">
                <div className="text-[10px] text-gray-400 line-through font-mono">{formatCurrency(product.price)}</div>
                <div className="text-[11px] font-semibold text-emerald-600">Ahorras {formatCurrency(product.price - pricing.finalPrice)} · {pricing.savingsPct.toFixed(1)}%</div>
              </div>
            )}
          </div>

          {/* Stack breakdown */}
          <div className="mt-3 bg-white rounded-lg border border-gray-200 p-2.5 space-y-1.5" style={{ fontSize: '11.5px' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-1.5 text-gray-400">
                <Tag className="w-3 h-3 mt-0.5" />
                <span>Precio lista</span>
              </div>
              <span className="font-mono text-gray-400 line-through">{formatCurrency(product.price)}</span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-1.5">
                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: primary }} />
                <div>
                  <div className="text-gray-600">Tier de zona · {pricing.tierLabel ?? 'Menudeo'}</div>
                  <div className="text-[10px] text-gray-400">Desde {resolveZoneTier(tiers, clientZoneCode, qty)?.minQty ?? 1} pz</div>
                </div>
              </div>
              <span className="font-mono text-emerald-600 font-semibold flex-shrink-0">
                {pricing.tierPrice < product.price ? `−${formatCurrency(product.price - pricing.tierPrice)}` : '—'}
              </span>
            </div>
            {pricing.catDiscount ? (
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-1.5">
                  <Tag className="w-3 h-3 mt-0.5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <div className="text-gray-600">{pricing.catDiscount.label}</div>
                    <div className="text-[10px] text-gray-400">{pricing.catDiscount.discountPercent}% sobre tier</div>
                  </div>
                </div>
                <span className="font-mono text-emerald-600 font-semibold flex-shrink-0">−{formatCurrency(pricing.catDiscountAmt)}</span>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-1.5 text-gray-400">
                  <Tag className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Descuento por categoría · No aplica</span>
                </div>
                <span className="font-mono text-gray-400">—</span>
              </div>
            )}
            <div className="h-px bg-gray-200 my-0.5" />
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Total unitario</span>
              <span className="font-mono font-bold text-gray-900">{formatCurrency(pricing.finalPrice)}</span>
            </div>
          </div>

          {pricing.nextTier && (
            <div className="mt-2.5 flex items-start gap-2 p-2 rounded-lg bg-amber-50/60 border border-amber-100" style={{ fontSize: '11px' }}>
              <Info className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-amber-600">
                Agrega <b>{pricing.nextTier.minQty - qty}</b> pzs más para bajar a <b className="font-mono">{formatCurrency(pricing.nextTier.price)}</b>
                <span className="text-gray-400 ml-1">({pricing.nextTier.label})</span>
              </div>
            </div>
          )}
        </div>

        {/* All zones */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-3 sticky top-0 bg-white border-b border-gray-200">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
              <Layers className="w-3.5 h-3.5" />
              Todas las zonas ({tiers.length})
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {tiers.map(z => {
              const applied = resolveZoneTier(tiers, z.zone.code, qty);
              const isClient = z.zone.code === clientZoneCode;
              return (
                <div key={z.zone.code} className="px-5 py-3" style={isClient ? { background: `${primary}05` } : {}}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {isClient && <MapPin className="w-3 h-3" style={{ color: primary }} />}
                      <span className="text-xs font-semibold" style={{ color: isClient ? primary : '#111827' }}>{z.zone.label}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">{z.zone.code}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {z.tiers.map((t) => {
                      const active = isClient && applied?.minQty === t.minQty;
                      return (
                        <div
                          key={t.minQty}
                          className="px-2 py-1 rounded-md text-[10.5px] border"
                          style={active
                            ? { background: primary, color: 'white', borderColor: primary, fontWeight: 600 }
                            : { background: 'white', color: '#374151', borderColor: '#e5e7eb' }
                          }
                        >
                          <span>≥{t.minQty}</span>
                          <span className="mx-1 opacity-50">·</span>
                          <span className="font-mono">{formatCurrency(t.price)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center gap-2 bg-gray-50/50">
          <button onClick={onClose} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cerrar
          </button>
          <button
            onClick={() => { onAdd(pricing.finalPrice); onClose(); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar a {formatCurrency(pricing.finalPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Interfaces ────────────────────────────────────────────────────────────────

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dto: CreateOrderDto) => void;
  editPedido?: Pedido;
}

interface LineaCarrito {
  id: string;
  producto: OrderProductItem;
  cantidad: number;
  precioUnitario: number;
  precioLista: number;
  subtotal: number;
  usandoPrecioHistorico: boolean;
  zoneTierLabel?: string;
  suggestedPrice?: number;
  catDiscountLabel?: string;
}

let carritoCounter = 0;
const PRODUCTS_PER_PAGE = 8;
const IVA_RATE = 0.16;

// ── Componente principal ──────────────────────────────────────────────────────

export function CreateOrderModal({ isOpen, onClose, onSave, editPedido }: CreateOrderModalProps) {
  const { settings } = useCompany();
  const primary = settings.primaryColor;
  const primaryBg = primary + '18';
  const primaryBgMid = primary + '30';

  // ── Estado principal
  const [clienteId, setClienteId] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [notas, setNotas] = useState('');

  // ── Cliente seleccionado
  const [selectedCliente, setSelectedCliente] = useState<ClientDetail | null>(null);
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);

  // ── Productos (paginados)
  const [productos, setProductos] = useState<OrderProductItem[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // ── Historial de precios
  const [expandedHistorial, setExpandedHistorial] = useState<number | null>(null);
  const [historialPrecios, setHistorialPrecios] = useState<PriceHistoryItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // ── Price tiers cache (variantId → ProductPriceTier[])
  const [tierCache, setTierCache] = useState<Map<number, ProductPriceTier[]>>(new Map());
  const [loadingTierFor, setLoadingTierFor] = useState<number | null>(null);

  // ── Zona expandida de precios (productId → expanded?)
  const [expandedZoneTable, setExpandedZoneTable] = useState<number | null>(null);

  // ── Descuentos por categoría (cargados una vez)
  const [categoryDiscounts, setCategoryDiscounts] = useState<CategoryDiscount[]>([]);

  // ── Zonas de precio
  const [priceZones, setPriceZones] = useState<PriceZone[]>([]);

  // ── Cantidades por producto en el listado
  const [qtyByProduct, setQtyByProduct] = useState<Record<number, number>>({});

  // ── Variante de visualización de precios
  const [priceVariant, setPriceVariant] = useState<'table' | 'chips' | 'book'>('table');

  // ── Price book panel (variante book)
  const [bookFor, setBookFor] = useState<OrderProductItem | null>(null);

  const historialOrdenado = [...historialPrecios].sort(
    (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
  );
  const precioHistoricoPromedio = historialOrdenado.length
    ? historialOrdenado.reduce((sum, item) => sum + item.unitPrice, 0) / historialOrdenado.length
    : null;

  const debouncedSearch = useDebounce(searchTerm, 400);
  const clienteSeleccionado = selectedCliente;

  // ── Bloquear scroll + Escape
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // ── Pre-rellenar al editar
  useEffect(() => {
    if (isOpen && editPedido) {
      setClienteId(parseInt(editPedido.clienteId));
      setNotas(editPedido.notas || '');
      const items: LineaCarrito[] = editPedido.lineas.map((linea) => {
        carritoCounter++;
        const producto: OrderProductItem = {
          id: parseInt(linea.variacionId),
          productId: parseInt(linea.productoId),
          name: linea.productoNombre,
          description: linea.productoNombre,
          variantName: linea.variacionNombre,
          sku: '', barcode: '', category: '', stock: 0,
          stockStatus: 'in_stock', price: linea.precioUnitario,
          currency: 'MXN', isActive: true, warehouses: [],
        };
        return {
          id: `${linea.variacionId}-${carritoCounter}`,
          producto, cantidad: linea.cantidad,
          precioUnitario: linea.precioUnitario,
          precioLista: linea.precioUnitario,
          subtotal: linea.precioUnitario * linea.cantidad,
          usandoPrecioHistorico: false,
        };
      });
      setCarrito(items);
    }
  }, [isOpen, editPedido]);

  // ── Cargar datos al abrir modal
  useEffect(() => {
    if (!isOpen) return;
    getCategoryDiscounts().then(setCategoryDiscounts).catch(() => {});
    getPriceZones().then(setPriceZones).catch(() => {});
  }, [isOpen]);

  // ── Cargar productos paginados
  const loadProductos = useCallback(async (page: number, search: string) => {
    setLoadingProductos(true);
    try {
      const response = await getOrderProducts({
        page, limit: PRODUCTS_PER_PAGE,
        search: search || undefined,
        stockStatus: search ? 'all' : 'in-stock',
      });
      setProductos(response.items);
      setTotalPages(response.totalPages);
      setTotalProducts(response.total);
      setCurrentPage(response.page);
    } catch {
      console.error('Error al cargar productos');
      setProductos([]);
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && clienteId) {
      setCurrentPage(1);
      loadProductos(1, debouncedSearch);
    }
  }, [debouncedSearch, isOpen, clienteId, loadProductos]);

  // Auto-carga tiers de productos visibles para variantes table/chips
  useEffect(() => {
    if (priceVariant === 'book' || !selectedCliente?.priceZone) return;
    productos.forEach(p => { if (!tierCache.has(p.id)) getTiersForProduct(p.id); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, priceVariant, selectedCliente]);

  // ── Obtener tiers de un producto (con cache)
  const getTiersForProduct = async (variantId: number): Promise<ProductPriceTier[]> => {
    const cached = tierCache.get(variantId);
    if (cached) return cached;
    setLoadingTierFor(variantId);
    try {
      const tiers = await getProductPriceTiers(variantId);
      setTierCache(prev => new Map(prev).set(variantId, tiers));
      return tiers;
    } catch {
      return [];
    } finally {
      setLoadingTierFor(null);
    }
  };

  // ── Toggle zona de precios expandida
  const toggleZoneTable = async (productId: number) => {
    if (expandedZoneTable === productId) {
      setExpandedZoneTable(null);
      return;
    }
    setExpandedZoneTable(productId);
    await getTiersForProduct(productId);
  };

  // ── Historial de precios
  const toggleHistorial = async (variantId: number) => {
    if (expandedHistorial === variantId) {
      setExpandedHistorial(null);
      setHistorialPrecios([]);
      return;
    }
    if (!clienteId) return;
    setExpandedHistorial(variantId);
    setLoadingHistorial(true);
    try {
      const data = await getClientPriceHistory(clienteId, variantId);
      setHistorialPrecios(data);
    } catch {
      setHistorialPrecios([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  // ── Paginación
  const handlePrevPage = () => {
    if (currentPage > 1) loadProductos(currentPage - 1, debouncedSearch);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) loadProductos(currentPage + 1, debouncedSearch);
  };

  // ── Resolver precio desde tiers (compat con función legacy)
  const resolvePriceFromTiers = (tiers: ProductPriceTier[], zoneCode: string, qty: number) => {
    const t = resolveZoneTier(tiers, zoneCode, qty);
    if (!t) return null;
    const zone = tiers.find(z => z.zone.code === zoneCode)?.zone;
    return { price: t.price, label: `Precio ${zone?.label ?? zoneCode} — ${t.label}` };
  };

  // ── Agregar al carrito
  const agregarAlCarrito = async (producto: OrderProductItem, precioPersonalizado?: number) => {
    const precioBase = producto.price;
    let precioFinal = precioPersonalizado ?? precioBase;
    let suggestedPrice: number | undefined;
    let zoneTierLabel: string | undefined;
    let catDiscountLabel: string | undefined;

    const zoneCode = selectedCliente?.priceZone?.code;
    const qty = qtyByProduct[producto.id] ?? 1;

    if (zoneCode && precioPersonalizado === undefined) {
      const tiers = await getTiersForProduct(producto.id);
      const pricing = computeProductPrice(precioBase, tiers, categoryDiscounts, producto.category, zoneCode, qty);
      precioFinal = pricing.finalPrice;
      suggestedPrice = pricing.finalPrice;
      if (pricing.tierLabel) {
        const zone = tiers.find(t => t.zone?.code === zoneCode)?.zone;
        zoneTierLabel = `${zone?.label ?? zoneCode} — ${pricing.tierLabel}`;
      }
      if (pricing.catDiscount) {
        catDiscountLabel = `${pricing.catDiscount.label} −${pricing.catDiscount.discountPercent}%`;
      }
    } else if (precioPersonalizado !== undefined) {
      // precio histórico aplicado manualmente
      suggestedPrice = undefined;
    }

    setCarrito(prev => {
      const idx = prev.findIndex(l => l.producto.id === producto.id && l.precioUnitario === precioFinal);
      if (idx !== -1) {
        return prev.map((linea, i) => i === idx
          ? { ...linea, cantidad: linea.cantidad + qty, subtotal: linea.precioUnitario * (linea.cantidad + qty) }
          : linea
        );
      }
      carritoCounter++;
      const nuevaLinea: LineaCarrito = {
        id: `${producto.id}-${carritoCounter}`,
        producto, cantidad: qty,
        precioUnitario: precioFinal,
        precioLista: precioBase,
        subtotal: precioFinal * qty,
        usandoPrecioHistorico: precioPersonalizado !== undefined,
        zoneTierLabel,
        suggestedPrice,
        catDiscountLabel,
      };
      return [...prev, nuevaLinea];
    });

    setExpandedHistorial(null);
  };

  // ── Actualizar cantidad en carrito
  const actualizarCantidad = useCallback(async (lineaId: string, cantidad: number) => {
    if (!Number.isFinite(cantidad) || cantidad < 1) return;
    const zoneCode = selectedCliente?.priceZone?.code;

    setCarrito(prev =>
      prev.map(linea => {
        if (linea.id !== lineaId) return linea;
        // Recalcular precio sugerido con nueva cantidad
        let suggestedPrice = linea.suggestedPrice;
        if (zoneCode && !linea.usandoPrecioHistorico) {
          const tiers = tierCache.get(linea.producto.id);
          if (tiers) {
            const pricing = computeProductPrice(
              linea.producto.price, tiers, categoryDiscounts, linea.producto.category, zoneCode, cantidad
            );
            suggestedPrice = pricing.finalPrice;
          }
        }
        return { ...linea, cantidad, subtotal: linea.precioUnitario * cantidad, suggestedPrice };
      })
    );
  }, [selectedCliente, tierCache, categoryDiscounts]);

  // ── Actualizar precio unitario
  const actualizarPrecio = (lineaId: string, precio: number) => {
    if (!Number.isFinite(precio) || precio < 0) return;
    setCarrito(prev =>
      prev.map(linea => linea.id === lineaId
        ? { ...linea, precioUnitario: precio, subtotal: precio * linea.cantidad, usandoPrecioHistorico: false }
        : linea
      )
    );
  };

  const usarPrecioSugerido = (lineaId: string, suggested: number) => {
    setCarrito(prev =>
      prev.map(linea => linea.id === lineaId
        ? { ...linea, precioUnitario: suggested, subtotal: suggested * linea.cantidad }
        : linea
      )
    );
  };

  const eliminarDelCarrito = (lineaId: string) => {
    setCarrito(prev => prev.filter(linea => linea.id !== lineaId));
  };

  // ── Totales
  const subtotal = carrito.reduce((sum, linea) => sum + linea.subtotal, 0);
  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva;

  // ── Guardar pedido
  const handleGuardar = () => {
    if (!clienteId || carrito.length === 0) return;
    const dto: CreateOrderDto = {
      clientId: clienteId as number,
      items: carrito.map(linea => ({
        variantId: linea.producto.id,
        qty: linea.cantidad,
        unitPrice: linea.precioUnitario,
        listPrice: linea.precioLista,
        description: linea.producto.variantName
          ? `${linea.producto.name} - ${linea.producto.variantName}`
          : linea.producto.name,
      })),
      currency: 'MXN',
    };
    onSave(dto);
    handleClose();
  };

  const handleClose = () => {
    setClienteId('');
    setSelectedCliente(null);
    setSearchTerm('');
    setCarrito([]);
    setNotas('');
    setExpandedHistorial(null);
    setHistorialPrecios([]);
    setProductos([]);
    setCurrentPage(1);
    setTierCache(new Map());
    setExpandedZoneTable(null);
    setQtyByProduct({});
    setCategoryDiscounts([]);
    setBookFor(null);
    onClose();
  };

  const handleDescargarPDF = () => {
    alert('Funcionalidad de PDF en desarrollo');
  };
  const handleDescargarExcel = () => {
    alert('Funcionalidad de Excel en desarrollo');
  };

  // ── Badge de stock
  const getStockBadge = (status: string) => {
    const cfg: Record<string, [string, string]> = {
      in_stock:     ['En stock',   'bg-green-100 text-green-700'],
      low_stock:    ['Stock bajo', 'bg-yellow-100 text-yellow-700'],
      out_of_stock: ['Sin stock',  'bg-red-100 text-red-700'],
    };
    const [label, cls] = cfg[status] ?? [status, 'bg-gray-100 text-gray-700'];
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
  };

  const handleSelectCliente = (client: ClientDetail) => {
    setSelectedCliente(client);
    setClienteId(client.id);
    setCarrito([]);
    setExpandedHistorial(null);
    setHistorialPrecios([]);
    setExpandedZoneTable(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <ClientPickerModal
        isOpen={isClientPickerOpen}
        onClose={() => setIsClientPickerOpen(false)}
        onSelect={handleSelectCliente}
        primary={primary}
      />

      {/* Price book panel */}
      {bookFor && (() => {
        const bookTiers = tierCache.get(bookFor.id) ?? [];
        const bookZoneCode = selectedCliente?.priceZone?.code ?? '';
        if (bookTiers.length === 0 || !bookZoneCode) return null;
        return (
          <ZoneVariantPriceBook
            product={bookFor}
            tiers={bookTiers}
            allCategoryDiscounts={categoryDiscounts}
            clientZoneCode={bookZoneCode}
            qty={qtyByProduct[bookFor.id] ?? 1}
            primary={primary}
            onClose={() => setBookFor(null)}
            onAdd={(price) => agregarAlCarrito(bookFor, price)}
          />
        );
      })()}

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 animate-in fade-in"
        onClick={handleClose}
      />

      {/* Fullscreen Panel */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom-4 fade-in duration-300">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {editPedido ? `Editar Pedido ${editPedido.numero}` : 'Crear Nuevo Pedido'}
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* ── Body: 3 columnas ── */}
        <div className="flex-1 flex min-h-0">

          {/* ═══ Col 1: Cliente + Búsqueda + Productos ═══ */}
          <div className="w-[26rem] flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/50">

            {/* Cliente */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Cliente</h3>
                </div>
                {selectedCliente && (
                  <button
                    onClick={() => {
                      setSelectedCliente(null);
                      setClienteId('');
                      setCarrito([]);
                      setExpandedHistorial(null);
                      setHistorialPrecios([]);
                      setExpandedZoneTable(null);
                    }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Cambiar
                  </button>
                )}
              </div>

              {selectedCliente ? (
                <div className="rounded-xl border border-gray-200 p-3 bg-white animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: primary }}
                    >
                      {selectedCliente.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{selectedCliente.name}</p>
                      {selectedCliente.phone && (
                        <p className="text-xs text-gray-400">{selectedCliente.phone}</p>
                      )}
                    </div>
                  </div>
                  {selectedCliente.priceZone && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold"
                      style={{ background: `${primary}18`, color: primary }}>
                      <MapPin className="w-3 h-3" />
                      {selectedCliente.priceZone.label}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsClientPickerOpen(true)}
                  className="w-full flex items-center justify-between px-3 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
                >
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    Seleccionar cliente...
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Visualización de precios */}
            {clienteId && (
              <div className="px-3 py-2.5 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Layers className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Visualización de precios</span>
                </div>
                <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-lg p-0.5">
                  {([
                    { k: 'table', n: 'Tabla zonas' },
                    { k: 'chips', n: 'Zona hero' },
                    { k: 'book',  n: 'Price book' },
                  ] as const).map(opt => (
                    <button
                      key={opt.k}
                      onClick={() => setPriceVariant(opt.k)}
                      className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-all"
                      style={priceVariant === opt.k
                        ? { background: 'white', color: '#111827', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
                        : { color: '#6b7280' }
                      }
                    >
                      {opt.n}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  {priceVariant === 'table' && 'Todas las zonas en tabla compacta. La del cliente resaltada.'}
                  {priceVariant === 'chips' && 'Zona del cliente expandida con tiers. Otras zonas colapsables.'}
                  {priceVariant === 'book'  && 'Botón "Ver zonas" abre panel lateral detallado por producto.'}
                </p>
              </div>
            )}

            {/* Buscador */}
            <div className="p-3 border-b border-gray-200 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar producto, SKU..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white transition-all duration-200"
                  style={{ '--tw-ring-color': primary } as React.CSSProperties}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  disabled={!clienteId}
                />
              </div>
            </div>

            {/* Lista de Productos */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {!clienteId ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  Selecciona un cliente
                </div>
              ) : loadingProductos ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: primary }} />
                  <p className="text-xs text-gray-500 mt-2">Cargando...</p>
                </div>
              ) : productos.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">Sin resultados</div>
              ) : (
                productos.map(producto => {
                  const qty = qtyByProduct[producto.id] ?? 1;
                  const tiers = tierCache.get(producto.id) ?? [];
                  const zoneCode = clienteSeleccionado?.priceZone?.code;
                  const isZoneExpanded = expandedZoneTable === producto.id;
                  const loadingThis = loadingTierFor === producto.id;

                  // Compute pricing if tiers loaded and zone known
                  const pricing: PricingResult | null = tiers.length > 0 && zoneCode
                    ? computeProductPrice(producto.price, tiers, categoryDiscounts, producto.category, zoneCode, qty)
                    : null;

                  const displayPrice = pricing?.finalPrice ?? producto.price;
                  const hasDiscount = pricing && pricing.finalPrice < producto.price;

                  return (
                    <div
                      key={producto.id}
                      className="rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md"
                      onMouseEnter={e => (e.currentTarget.style.borderColor = primary)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1.5">
                            <p className="text-sm font-semibold leading-snug text-gray-900 break-words flex-1">{producto.name}</p>
                            {getStockBadge(producto.stockStatus)}
                          </div>
                          {producto.variantName && (
                            <p className="text-xs font-medium break-words" style={{ color: primary }}>{producto.variantName}</p>
                          )}
                          <p className="text-xs text-gray-400 break-words leading-snug">
                            {producto.sku}{producto.category ? ` · ${producto.category}` : ''}
                            {' · Stock: '}<b className="text-gray-600">{producto.stock}</b>
                          </p>

                          {/* Extra variant fields */}
                          {(producto.color || producto.masterBox != null || producto.packingUnit || producto.purchaseUnit || producto.blDescription) && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {producto.color && (
                                <span className="inline-flex items-center px-1.5 py-0 rounded text-[10px] bg-pink-50 text-pink-600 font-medium">{producto.color}</span>
                              )}
                              {producto.masterBox != null && (
                                <span className="inline-flex items-center px-1.5 py-0 rounded text-[10px] bg-amber-50 text-amber-600 font-medium">Caja×{producto.masterBox}</span>
                              )}
                              {producto.packingUnit && (
                                <span className="inline-flex items-center px-1.5 py-0 rounded text-[10px] bg-blue-50 text-blue-600 font-medium">{producto.packingUnit}</span>
                              )}
                              {producto.purchaseUnit && (
                                <span className="inline-flex items-center px-1.5 py-0 rounded text-[10px] bg-purple-50 text-purple-600 font-medium">{producto.purchaseUnit}</span>
                              )}
                              {producto.blDescription && (
                                <span className="w-full text-[10px] text-gray-400 italic truncate">{producto.blDescription}</span>
                              )}
                            </div>
                          )}

                          {/* Precio + chips de descuento */}
                          <div className="flex items-center flex-wrap gap-1.5 mt-1">
                            <div className="flex items-baseline gap-1.5">
                              {hasDiscount && (
                                <span className="text-xs text-gray-400 line-through font-mono">
                                  {formatCurrency(producto.price)}
                                </span>
                              )}
                              <span className="text-sm font-bold text-gray-900 font-mono">
                                {formatCurrency(displayPrice)}
                              </span>
                            </div>
                            {pricing?.tierLabel && pricing.tierPrice < producto.price && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                                    style={{ background: `${primary}18`, color: primary }}>
                                <MapPin className="w-2.5 h-2.5" />
                                {pricing.tierLabel}
                              </span>
                            )}
                            {pricing?.catDiscount && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                                <Tag className="w-2.5 h-2.5" />
                                Cat. −{pricing.catDiscount.discountPercent}%
                              </span>
                            )}
                            {pricing && pricing.savingsPct > 0.1 && (
                              <span className="text-[10px] font-semibold text-emerald-600">
                                Ahorra {pricing.savingsPct.toFixed(1)}%
                              </span>
                            )}
                          </div>

                          {/* Next tier hint */}
                          {pricing?.nextTier && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600">
                              <Info className="w-3 h-3" />
                              <span>
                                Agrega <b>{pricing.nextTier.minQty - qty}</b> más →{' '}
                                <b className="font-mono">{formatCurrency(pricing.nextTier.price)}</b>
                              </span>
                            </div>
                          )}

                          {/* Almacenes */}
                          {producto.warehouses && producto.warehouses.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {producto.warehouses.map((wh, idx) => (
                                <span key={idx} className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">
                                  <Warehouse className="w-2.5 h-2.5" />
                                  {wh.warehouseName}: {wh.qtyOnHand}
                                  {wh.qtyReserved > 0 && (
                                    <span className="text-orange-500">({wh.qtyReserved} res.)</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Controles: qty stepper + "Ver precios" + "Agregar" */}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {/* Qty stepper */}
                            <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden">
                              <button
                                onClick={() => setQtyByProduct(prev => ({ ...prev, [producto.id]: Math.max(1, (prev[producto.id] ?? 1) - 1) }))}
                                className="px-1.5 py-1 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-30"
                                disabled={(qtyByProduct[producto.id] ?? 1) <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                value={qty}
                                onChange={e => setQtyByProduct(prev => ({ ...prev, [producto.id]: Math.max(1, Number(e.target.value) || 1) }))}
                                className="w-10 text-center font-mono text-xs py-1 bg-transparent focus:outline-none"
                              />
                              <button
                                onClick={() => setQtyByProduct(prev => ({ ...prev, [producto.id]: (prev[producto.id] ?? 1) + 1 }))}
                                className="px-1.5 py-1 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Jump to next tier (table/chips) */}
                            {pricing?.nextTier && priceVariant !== 'book' && (
                              <button
                                onClick={() => setQtyByProduct(prev => ({ ...prev, [producto.id]: pricing.nextTier!.minQty }))}
                                className="flex items-center gap-1 text-[10.5px] font-medium hover:opacity-80 transition-opacity"
                                style={{ color: '#b45309' }}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {pricing.nextTier.minQty - qty} más → {formatCurrency(pricing.nextTier.price)}
                              </button>
                            )}

                            <div className="flex-1" />

                            {/* Ver zonas (book variant only) */}
                            {priceVariant === 'book' && zoneCode && (
                              <button
                                onClick={async () => {
                                  await getTiersForProduct(producto.id);
                                  setBookFor(producto);
                                }}
                                className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
                                style={{ color: '#6b7280' }}
                                disabled={loadingThis}
                              >
                                {loadingThis
                                  ? <div className="w-3 h-3 rounded-full border-b-2 animate-spin" style={{ borderColor: primary }} />
                                  : <Layers className="w-3 h-3" />
                                }
                                Ver zonas
                              </button>
                            )}

                            {/* Botón agregar */}
                            <button
                              onClick={() => agregarAlCarrito(producto)}
                              disabled={producto.stock <= 0}
                              className="flex h-8 items-center gap-1.5 px-3 rounded-xl text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:opacity-90 active:scale-95"
                              style={{ backgroundColor: primary }}
                            >
                              <Plus className="w-3 h-3" />
                              Agregar
                            </button>
                          </div>

                          {/* Historial */}
                          {clienteId && (
                            <div className="mt-1.5">
                              <button
                                onClick={() => toggleHistorial(producto.id)}
                                className="text-xs hover:opacity-75 flex items-center gap-1 transition-colors duration-200"
                                style={{ color: primary }}
                              >
                                <History className="w-3 h-3" />
                                {expandedHistorial === producto.id ? 'Ocultar historial' : 'Ver historial'}
                              </button>
                              {expandedHistorial === producto.id && (
                                <div className="mt-2 rounded-xl border border-gray-200/80 bg-white p-2.5 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                  {loadingHistorial ? (
                                    <p className="text-xs" style={{ color: primary }}>Cargando...</p>
                                  ) : historialPrecios.length === 0 ? (
                                    <p className="text-xs text-gray-500">Sin historial para este cliente y producto.</p>
                                  ) : (
                                    <>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: primaryBg }}>
                                          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Último precio</p>
                                          <p className="text-xs font-semibold" style={{ color: primary }}>
                                            {formatCurrency(historialOrdenado[0].unitPrice)}
                                          </p>
                                        </div>
                                        <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: primaryBg }}>
                                          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Promedio</p>
                                          <p className="text-xs font-semibold" style={{ color: primary }}>
                                            {precioHistoricoPromedio != null ? formatCurrency(precioHistoricoPromedio) : 'N/A'}
                                          </p>
                                        </div>
                                      </div>
                                      {historialOrdenado.slice(0, 4).map(h => (
                                        <button
                                          key={h.orderId}
                                          onClick={() => agregarAlCarrito(producto, h.unitPrice)}
                                          className="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-white p-2 text-xs transition-all duration-200 hover:scale-[1.01]"
                                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = primaryBgMid)}
                                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                                        >
                                          <div className="text-left">
                                            <span className="text-gray-600">{new Date(h.orderDate).toLocaleDateString('es-MX')}</span>
                                            <span className="ml-1 text-gray-400">• {h.orderCode}</span>
                                            <p className="text-[10px] text-gray-400">{h.quantity} uds • {h.orderStatus}</p>
                                          </div>
                                          <div className="text-right">
                                            <span className="font-semibold" style={{ color: primary }}>{formatCurrency(h.unitPrice)}</span>
                                            <p className="text-[10px] text-gray-400">Aplicar precio</p>
                                          </div>
                                        </button>
                                      ))}
                                      <button
                                        onClick={() => agregarAlCarrito(producto, historialOrdenado[0].unitPrice)}
                                        className="w-full rounded-lg px-2 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                                        style={{ backgroundColor: primary }}
                                      >
                                        Usar último precio para este producto
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Zona de precios — table variant */}
                      {priceVariant === 'table' && zoneCode && tiers.length > 0 && (
                        <ZonePricePanel
                          product={producto}
                          tiers={tiers}
                          allCategoryDiscounts={categoryDiscounts}
                          clientZoneCode={zoneCode}
                          qty={qty}
                          primary={primary}
                        />
                      )}
                      {/* Zona de precios — chips variant */}
                      {priceVariant === 'chips' && zoneCode && tiers.length > 0 && (
                        <ZoneVariantChips
                          product={producto}
                          tiers={tiers}
                          allCategoryDiscounts={categoryDiscounts}
                          clientZoneCode={zoneCode}
                          qty={qty}
                          primary={primary}
                          onJumpToTier={q => setQtyByProduct(prev => ({ ...prev, [producto.id]: q }))}
                        />
                      )}
                      {/* Loading tiers for table/chips */}
                      {priceVariant !== 'book' && loadingThis && (
                        <div className="mt-2 p-3 rounded-xl border border-gray-200 bg-gray-50 text-center">
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 mb-1" style={{ borderColor: primary }} />
                          <p className="text-xs text-gray-400">Cargando precios...</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Paginación */}
            {clienteId && totalProducts > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between flex-shrink-0 bg-white">
                <span className="text-xs text-gray-500">{totalProducts} resultado{totalProducts !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={handlePrevPage} disabled={currentPage <= 1}
                    className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-gray-600">{currentPage}/{totalPages}</span>
                  <button onClick={handleNextPage} disabled={currentPage >= totalPages}
                    className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ═══ Col 2: Carrito ═══ */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="px-6 py-3 border-b border-gray-200 flex-shrink-0" style={{ background: `linear-gradient(to right, ${primaryBg}, ${primaryBgMid})` }}>
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" style={{ color: primary }} />
                <h3 className="text-sm font-semibold text-gray-900">
                  Carrito ({carrito.length} {carrito.length === 1 ? 'item' : 'items'})
                </h3>
                {carrito.length > 0 && (
                  <span className="text-xs text-gray-500">
                    · {carrito.reduce((s, l) => s + l.cantidad, 0)} unidades
                  </span>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4">
              {carrito.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingCart className="w-12 h-12 text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">El carrito está vacío</p>
                  <p className="text-xs text-gray-300 mt-1">Agrega productos desde el panel izquierdo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {carrito.map(linea => {
                    const isOverride = linea.suggestedPrice !== undefined &&
                      Math.abs(linea.precioUnitario - linea.suggestedPrice) > 0.01;

                    return (
                      <Card key={linea.id} className="animate-in slide-in-from-right-4 fade-in rounded-2xl border border-gray-200/80 p-3 duration-300 transition-shadow hover:shadow-md">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100">
                            <Package className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold leading-snug text-gray-900 break-words">{linea.producto.name}</p>
                                {linea.producto.variantName && (
                                  <p className="text-xs break-words" style={{ color: primary }}>{linea.producto.variantName}</p>
                                )}
                                <p className="text-[11px] text-gray-400">{linea.producto.sku}</p>
                              </div>
                              <button onClick={() => eliminarDelCarrito(linea.id)} className="text-red-400 hover:text-red-600 p-0.5 transition-all duration-200 hover:scale-110 active:scale-95">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Badges: zona, categoría, override */}
                            <div className="flex items-center flex-wrap gap-1 mt-1">
                              {linea.zoneTierLabel && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                                      style={{ background: `${primary}18`, color: primary }}>
                                  <MapPin className="w-2.5 h-2.5" />
                                  {linea.zoneTierLabel}
                                </span>
                              )}
                              {linea.catDiscountLabel && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                                  <Tag className="w-2.5 h-2.5" />
                                  {linea.catDiscountLabel}
                                </span>
                              )}
                              {!linea.zoneTierLabel && linea.usandoPrecioHistorico && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                                      style={{ background: `${primary}18`, color: primary }}>
                                  <History className="w-2.5 h-2.5" />
                                  Precio histórico
                                </span>
                              )}
                              {isOverride && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Precio manual
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {/* Cantidad */}
                              <div>
                                <label className="text-[10px] text-gray-500 block">Cant.</label>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => actualizarCantidad(linea.id, linea.cantidad - 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100"
                                    disabled={linea.cantidad <= 1}
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  <input
                                    type="number" min="1" value={linea.cantidad}
                                    onChange={e => {
                                      const v = Number(e.target.value);
                                      if (!Number.isNaN(v)) actualizarCantidad(linea.id, v);
                                    }}
                                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 transition-all text-center"
                                    style={{ '--tw-ring-color': primary } as React.CSSProperties}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => actualizarCantidad(linea.id, linea.cantidad + 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Precio unitario */}
                              <div>
                                <label className="text-[10px] text-gray-500 block">P. Unit.</label>
                                <div className={`relative flex items-center border rounded-md bg-white h-8 ${isOverride ? 'border-amber-400 bg-amber-50/40' : 'border-gray-200'}`}>
                                  <span className="pl-2 text-xs text-gray-400">$</span>
                                  <input
                                    type="number" min="0" step="0.01"
                                    value={linea.precioUnitario.toFixed(2)}
                                    onChange={e => {
                                      const v = Number(e.target.value);
                                      if (!Number.isNaN(v)) actualizarPrecio(linea.id, v);
                                    }}
                                    className="flex-1 px-1.5 font-mono text-xs text-right bg-transparent focus:outline-none"
                                  />
                                  {/* Botón "Usar sugerido" cuando hay override */}
                                  {isOverride && linea.suggestedPrice !== undefined && (
                                    <button
                                      onClick={() => usarPrecioSugerido(linea.id, linea.suggestedPrice!)}
                                      title={`Volver al precio sugerido ${formatCurrency(linea.suggestedPrice)}`}
                                      className="absolute -top-[9px] right-1 flex items-center gap-0.5 px-1.5 h-[15px] rounded-full text-white text-[9.5px] font-semibold shadow-sm hover:opacity-90 whitespace-nowrap z-10"
                                      style={{ background: primary }}
                                    >
                                      <RotateCcw className="w-2.5 h-2.5" />
                                      {formatCurrency(linea.suggestedPrice)}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Subtotal */}
                              <div>
                                <label className="text-[10px] text-gray-500 block">Subtotal</label>
                                <p className="py-1 text-sm font-bold text-gray-900">{formatCurrency(linea.subtotal)}</p>
                                {linea.precioLista > 0 && linea.precioUnitario < linea.precioLista && (
                                  <p className="text-[10px] text-emerald-600 font-medium">
                                    −{formatCurrency((linea.precioLista - linea.precioUnitario) * linea.cantidad)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notas */}
            <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0">
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Notas del pedido (opcional)..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': primary } as React.CSSProperties}
                rows={2}
              />
            </div>
          </div>

          {/* ═══ Col 3: Resumen ═══ */}
          <div className="w-72 flex-shrink-0 border-l border-gray-200 flex flex-col bg-gray-50/50">
            <div className="p-5 flex-1 flex flex-col justify-center">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Resumen del Pedido</h3>

              {clienteSeleccionado && (
                <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: primaryBg }}>
                  <p className="text-xs text-gray-500">Cliente</p>
                  <p className="text-sm font-medium" style={{ color: primary }}>{clienteSeleccionado.name}</p>
                  {clienteSeleccionado.priceZone && (
                    <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold" style={{ color: primary }}>
                      <MapPin className="w-2.5 h-2.5" />
                      {clienteSeleccionado.priceZone.label}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Productos</span>
                  <span className="font-medium text-gray-900">{carrito.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Unidades</span>
                  <span className="font-medium text-gray-900">{carrito.reduce((s, l) => s + l.cantidad, 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold text-gray-900 font-mono">{formatCurrency(subtotal)}</span>
                </div>
                {(() => {
                  const savings = carrito.reduce((s, l) => {
                    const listTotal = l.precioLista * l.cantidad;
                    const actualTotal = l.precioUnitario * l.cantidad;
                    return s + Math.max(0, listTotal - actualTotal);
                  }, 0);
                  return savings > 0.01 ? (
                    <div className="flex justify-between text-sm text-emerald-600 font-semibold">
                      <span>Ahorro aplicado</span>
                      <span className="font-mono">−{formatCurrency(savings)}</span>
                    </div>
                  ) : null;
                })()}
                <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    IVA
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                      {(IVA_RATE * 100).toFixed(0)}%
                    </span>
                  </span>
                  <span className="font-semibold text-gray-900 font-mono">{formatCurrency(iva)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold font-mono" style={{ color: primary }}>{formatCurrency(total)}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 font-mono">
                  {formatCurrency(subtotal)} + IVA {formatCurrency(iva)}
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDescargarPDF}
                  disabled={!clienteId || carrito.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <FileText className="w-3.5 h-3.5" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDescargarExcel}
                  disabled={!clienteId || carrito.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel
                </Button>
              </div>
              <Button
                onClick={handleGuardar}
                disabled={!clienteId || carrito.length === 0}
                className="w-full flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <DollarSign className="w-4 h-4" />
                {editPedido ? 'Guardar Cambios' : 'Crear Cotización'}
              </Button>
              <Button variant="outline" onClick={handleClose} className="w-full transition-all duration-200 hover:scale-105 active:scale-95">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
