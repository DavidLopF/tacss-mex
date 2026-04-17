// ── Price Tiers (by variant) ────────────────────────────────────────
export interface PriceTierItem {
  id: number;
  variantId: number;
  priceZoneId: number | null;
  minQty: number;
  price: number;
  tierLabel: string;
}

export interface CreatePriceTierDto {
  priceZoneId?: number | null;
  minQty: number;
  price: number;
  tierLabel: string;
}

export interface UpdatePriceTierDto {
  priceZoneId?: number | null;
  minQty?: number;
  price?: number;
  tierLabel?: string;
}

// ── Category Discounts ──────────────────────────────────────────────
export interface CategoryDiscount {
  id: number;
  categoryId: number;
  categoryName?: string;
  minQty: number;
  discountPercent: number;
  label: string;
}

export interface CreateCategoryDiscountDto {
  categoryId: number;
  minQty: number;
  discountPercent: number;
  label?: string;
}

export interface UpdateCategoryDiscountDto {
  minQty?: number;
  discountPercent?: number;
  label?: string;
}
