import { get, post, put, del } from '../http-client';
import {
  PriceTierItem,
  CreatePriceTierDto,
  UpdatePriceTierDto,
  CategoryDiscount,
  CreateCategoryDiscountDto,
  UpdateCategoryDiscountDto,
} from './discounts.types';

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
