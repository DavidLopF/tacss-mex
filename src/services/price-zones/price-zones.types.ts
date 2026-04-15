export interface PriceZone {
  id: number;
  code: string;
  label: string;
  sortOrder: number;
}

export interface PriceTier {
  minQty: number;
  price: number;
  tierLabel: string;
}

export interface ProductPriceTier {
  zone: {
    code: string;
    label: string;
  };
  tiers: PriceTier[];
}
