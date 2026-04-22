import { get } from '../http-client';
import { PriceZone, ProductPriceTier } from './price-zones.types';

export async function getPriceZones(): Promise<PriceZone[]> {
  return get<PriceZone[]>('/api/price-zones');
}

interface FlatPriceTier {
  id: number;
  variantId: number;
  priceZoneId: number | null;
  minQty: number;
  price: string | number;
  tierLabel: string;
  sortOrder: number;
  isActive: boolean;
  priceZone: { id: number; code: string; label: string } | null;
}

function mapFlatToZoneGroups(flat: FlatPriceTier[]): ProductPriceTier[] {
  const byZone = new Map<string, ProductPriceTier>();
  for (const t of flat) {
    if (!t.priceZone) continue; // ignorar tiers globales sin zona
    const key = t.priceZone.code;
    if (!byZone.has(key)) {
      byZone.set(key, { zone: { code: t.priceZone.code, label: t.priceZone.label }, tiers: [] });
    }
    byZone.get(key)!.tiers.push({
      minQty: t.minQty,
      price: Number(t.price),
      tierLabel: t.tierLabel,
    });
  }
  return Array.from(byZone.values());
}

export async function getProductPriceTiers(variantId: number): Promise<ProductPriceTier[]> {
  const flat = await get<FlatPriceTier[]>(`/api/products/variants/${variantId}/price-tiers`);
  return mapFlatToZoneGroups(flat);
}
