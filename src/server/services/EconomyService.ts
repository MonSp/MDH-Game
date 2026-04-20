import { CurrencyType, TransactionType, EconomyEvent, ItemType, ItemQuality, Item, PurchaseResult } from '../../shared';
import { EventBus } from '../../shared';

interface TransactionRecord {
  playerId: string;
  type: TransactionType;
  currencyType: CurrencyType;
  amount: number;
  targetPlayerId?: string;
  timestamp: number;
}

export class EconomyService {
  private static instance: EconomyService;
  private playerCurrency: Map<string, number>;
  private transactionHistory: TransactionRecord[];

  private constructor() {
    this.playerCurrency = new Map();
    this.transactionHistory = [];
  }

  static getInstance(): EconomyService {
    if (!EconomyService.instance) {
      EconomyService.instance = new EconomyService();
    }
    return EconomyService.instance;
  }

  initializePlayerCurrency(playerId: string, initialAmount: number = 0): void {
    this.playerCurrency.set(playerId, initialAmount);
  }

  getCurrency(playerId: string): number {
    return this.playerCurrency.get(playerId) ?? 0;
  }

  addCurrency(playerId: string, type: CurrencyType, amount: number): void {
    const current = this.getCurrency(playerId);
    this.playerCurrency.set(playerId, current + amount);
    this.recordTransaction(playerId, TransactionType.Gain, type, amount);
    EventBus.emit(EconomyEvent.CURRENCY_CHANGED, { playerId, type, amount, balance: current + amount });
  }

  spendCurrency(playerId: string, type: CurrencyType, amount: number): boolean {
    const current = this.getCurrency(playerId);
    if (current < amount) {
      return false;
    }
    this.playerCurrency.set(playerId, current - amount);
    this.recordTransaction(playerId, TransactionType.Spend, type, amount);
    EventBus.emit(EconomyEvent.CURRENCY_CHANGED, { playerId, type, amount: -amount, balance: current - amount });
    return true;
  }

  transferCurrency(fromPlayerId: string, toPlayerId: string, type: CurrencyType, amount: number): boolean {
    if (!this.spendCurrency(fromPlayerId, type, amount)) {
      return false;
    }
    this.addCurrency(toPlayerId, type, amount);
    this.recordTransaction(fromPlayerId, TransactionType.Transfer, type, amount, toPlayerId);
    return true;
  }

  calculateCraftCost(basePrice: number, countryTrait?: { type: string; value: number }): number {
    if (countryTrait?.type === 'craft_cost') {
      return Math.floor(basePrice * (1 - countryTrait.value / 100));
    }
    return basePrice;
  }

  private recordTransaction(playerId: string, type: TransactionType, currency: CurrencyType, amount: number, toPlayerId?: string): void {
    this.transactionHistory.push({
      playerId,
      type,
      currencyType: currency,
      amount,
      targetPlayerId: toPlayerId,
      timestamp: Date.now()
    });
  }

  getTransactionHistory(playerId: string): TransactionRecord[] {
    return this.transactionHistory.filter(t => t.playerId === playerId);
  }
}

export class ItemService {
  private static instance: ItemService;
  private itemDatabase: Map<string, Item>;
  private playerItems: Map<string, Map<string, number>>;

  private constructor() {
    this.itemDatabase = new Map();
    this.playerItems = new Map();
    this.initializeItems();
  }

  static getInstance(): ItemService {
    if (!ItemService.instance) {
      ItemService.instance = new ItemService();
    }
    return ItemService.instance;
  }

  private initializeItems(): void {
    const items: Item[] = [
      { id: 'WashMarrowPill', name: '洗髓丹', type: ItemType.Pill, quality: ItemQuality.Good, price: 500, description: '服用后可改善体质' },
      { id: 'QiRefiningPill', name: '练气丹', type: ItemType.Pill, quality: ItemQuality.Common, price: 100, description: '辅助练气修炼' },
      { id: 'FoundationPill', name: '筑基丹', type: ItemType.Pill, quality: ItemQuality.Excellent, price: 1000, description: '辅助筑基突破' },
      { id: 'SpiritStoneFragment', name: '灵石碎片', type: ItemType.Material, quality: ItemQuality.Common, price: 10 },
      { id: 'SpiritHerb', name: '灵草', type: ItemType.Material, quality: ItemQuality.Good, price: 50 },
      { id: 'LowGradeArtifact', name: '低级法器', type: ItemType.Equipment, quality: ItemQuality.Common, price: 200 },
      { id: 'MidGradeArtifact', name: '中级法器', type: ItemType.Equipment, quality: ItemQuality.Excellent, price: 800 },
      { id: 'MonsterMaterial', name: '妖兽材料', type: ItemType.Material, quality: ItemQuality.Good, price: 150 }
    ];

    for (const item of items) {
      this.itemDatabase.set(item.id, item);
    }
  }

  addItem(playerId: string, itemId: string, count: number = 1): void {
    if (!this.playerItems.has(playerId)) {
      this.playerItems.set(playerId, new Map());
    }
    const items = this.playerItems.get(playerId)!;
    items.set(itemId, (items.get(itemId) || 0) + count);
    EventBus.emit('item:added', { playerId, itemId, count });
  }

  removeItem(playerId: string, itemId: string, count: number = 1): boolean {
    const items = this.playerItems.get(playerId);
    if (!items) return false;
    const currentCount = items.get(itemId) || 0;
    if (currentCount < count) return false;
    if (currentCount === count) {
      items.delete(itemId);
    } else {
      items.set(itemId, currentCount - count);
    }
    EventBus.emit('item:removed', { playerId, itemId, count });
    return true;
  }

  getItemCount(playerId: string, itemId: string): number {
    return this.playerItems.get(playerId)?.get(itemId) || 0;
  }

  hasItem(playerId: string, itemId: string): boolean {
    return this.getItemCount(playerId, itemId) > 0;
  }

  getPlayerItems(playerId: string): Array<{ item: Item; count: number }> {
    const items = this.playerItems.get(playerId);
    if (!items) return [];
    return Array.from(items.entries()).map(([itemId, count]) => ({
      item: this.itemDatabase.get(itemId)!,
      count
    })).filter(pi => pi.item);
  }

  getItem(itemId: string): Item | undefined {
    return this.itemDatabase.get(itemId);
  }

  getAllItems(): Item[] {
    return Array.from(this.itemDatabase.values());
  }
}

export class MarketService {
  private static instance: MarketService;

  private constructor() {}

  static getInstance(): MarketService {
    if (!MarketService.instance) {
      MarketService.instance = new MarketService();
    }
    return MarketService.instance;
  }

  purchaseItem(buyerId: string, sellerId: string, itemId: string, price: number): PurchaseResult {
    if (!EconomyService.getInstance().spendCurrency(buyerId, CurrencyType.SpiritStone, price)) {
      return { success: false, reason: 'insufficient_funds' };
    }

    if (!ItemService.getInstance().hasItem(sellerId, itemId)) {
      EconomyService.getInstance().addCurrency(buyerId, CurrencyType.SpiritStone, price);
      return { success: false, reason: 'item_not_available' };
    }

    ItemService.getInstance().removeItem(sellerId, itemId);
    ItemService.getInstance().addItem(buyerId, itemId);
    EconomyService.getInstance().addCurrency(sellerId, CurrencyType.SpiritStone, price);

    EventBus.emit(EconomyEvent.PURCHASE_COMPLETED, { buyerId, sellerId, itemId, price });
    return { success: true };
  }

  sellToNPC(playerId: string, itemId: string): boolean {
    const item = ItemService.getInstance().getItem(itemId);
    if (!item) return false;

    const sellPrice = Math.floor(item.price * 0.5);
    ItemService.getInstance().removeItem(playerId, itemId);
    EconomyService.getInstance().addCurrency(playerId, CurrencyType.SpiritStone, sellPrice);
    EventBus.emit(EconomyEvent.SALE_COMPLETED, { playerId, itemId, price: sellPrice });
    return true;
  }
}