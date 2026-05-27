const COMMODITY_BASE_PRICE: Record<string, number> = {
  Ore: 5, Food: 3, Equipment: 40, Materials: 4, Pills: 80, SpiritStones: 1,
};

const ELASTICITY = 0.3;
const PRICE_FLOOR_MULT = 0.3;
const PRICE_CEIL_MULT = 3.0;

export interface MarketInfo {
  commodity: string;
  basePrice: number;
  currentPrice: number;
  supply: number;
  demand: number;
}

export class MarketService {
  private static instance: MarketService;
  private supplies: Record<string, number> = {};
  private demands: Record<string, number> = {};

  private constructor() {
    for (const key of Object.keys(COMMODITY_BASE_PRICE)) {
      this.supplies[key] = 100;
      this.demands[key] = 50;
    }
  }

  static getInstance(): MarketService {
    if (!MarketService.instance) MarketService.instance = new MarketService();
    return MarketService.instance;
  }

  getPrice(commodity: string): number {
    const base = COMMODITY_BASE_PRICE[commodity] ?? 1;
    const supply = Math.max(this.supplies[commodity] ?? 100, 1);
    const demand = Math.max(this.demands[commodity] ?? 50, 0);
    const ratio = demand / supply;
    const clampedRatio = Math.max(0.01, ratio);
    let price = base * (1 + ELASTICITY * Math.log(clampedRatio));
    price = Math.max(base * PRICE_FLOOR_MULT, Math.min(price, base * PRICE_CEIL_MULT));
    return Math.floor(price);
  }

  adjustSupply(commodity: string, delta: number): void {
    this.supplies[commodity] = Math.max(1, (this.supplies[commodity] ?? 100) + delta);
  }

  adjustDemand(commodity: string, delta: number): void {
    this.demands[commodity] = Math.max(0, (this.demands[commodity] ?? 50) + delta);
  }

  getAllMarketInfo(): MarketInfo[] {
    return Object.keys(COMMODITY_BASE_PRICE).map(key => ({
      commodity: key,
      basePrice: COMMODITY_BASE_PRICE[key],
      currentPrice: this.getPrice(key),
      supply: this.supplies[key] ?? 100,
      demand: this.demands[key] ?? 50,
    }));
  }
}
