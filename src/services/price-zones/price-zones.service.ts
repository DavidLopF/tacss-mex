import { get } from '../http-client';
import { PriceZone, ProductPriceTier } from './price-zones.types';

export async function getPriceZones(): Promise<PriceZone[]> {
  return get<PriceZone[]>('/api/price-zones');
}

export async function getProductPriceTiers(variantId: number): Promise<ProductPriceTier[]> {
  return get<ProductPriceTier[]>(`/api/products/${variantId}/price-tiers`);
}
