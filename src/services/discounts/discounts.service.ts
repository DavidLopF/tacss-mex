import { get, post, put, del } from '../http-client';
import {
  PriceTierItem,
  CreatePriceTierDto,
  UpdatePriceTierDto,
  CategoryDiscount,
  CreateCategoryDiscountDto,
  UpdateCategoryDiscountDto,
  PriceZone,
  UpdatePriceZoneDto,
} from './discounts.types';

// ── Price Zones ─────────────────────────────────────────────────────

export async function getPriceZones(): Promise<PriceZone[]> {
  return get<PriceZone[]>('/api/price-zones?withMultipliers=true');
}

export async function updatePriceZone(id: number, dto: UpdatePriceZoneDto): Promise<PriceZone> {
  return put<PriceZone>(`/api/price-zones/${id}`, dto);
}

// ── Bulk Category Discounts ─────────────────────────────────────────

export interface BulkUpsertDiscountItem {
  id?: number;
  _delete?: boolean;
  categoryId: number;
  minQty: number;
  discountPercent: number;
  label?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export async function bulkUpsertCategoryDiscounts(
  discounts: BulkUpsertDiscountItem[],
): Promise<{ upserted: number; deleted: number; errors: { index: number; reason: string }[] }> {
  return post('/api/category-discounts/bulk-upsert', { discounts });
}

// ── Price Tiers ─────────────────────────────────────────────────────
export async function getVariantPriceTiers(variantId: number): Promise<PriceTierItem[]> {
  return get<PriceTierItem[]>(`/api/products/variants/${variantId}/price-tiers`);
}

export async function createVariantPriceTier(
  variantId: number,
  dto: CreatePriceTierDto
): Promise<PriceTierItem> {
  return post<PriceTierItem>(`/api/products/variants/${variantId}/price-tiers`, dto);
}

export async function updatePriceTier(
  tierId: number,
  dto: UpdatePriceTierDto
): Promise<PriceTierItem> {
  return put<PriceTierItem>(`/api/products/price-tiers/${tierId}`, dto);
}

export async function deletePriceTier(tierId: number): Promise<void> {
  return del<void>(`/api/products/price-tiers/${tierId}`);
}

// ── Category Discounts ──────────────────────────────────────────────
export async function getCategoryDiscounts(): Promise<CategoryDiscount[]> {
  return get<CategoryDiscount[]>('/api/category-discounts');
}

export async function createCategoryDiscount(
  dto: CreateCategoryDiscountDto
): Promise<CategoryDiscount> {
  return post<CategoryDiscount>('/api/category-discounts', dto);
}

export async function updateCategoryDiscount(
  id: number,
  dto: UpdateCategoryDiscountDto
): Promise<CategoryDiscount> {
  return put<CategoryDiscount>(`/api/category-discounts/${id}`, dto);
}

export async function deleteCategoryDiscount(id: number): Promise<void> {
  return del<void>(`/api/category-discounts/${id}`);
}
