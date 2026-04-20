export enum CurrencyType {
  SpiritStone = 'spirit_stone'
}

export enum TransactionType {
  Gain = 'gain',
  Spend = 'spend',
  Transfer = 'transfer'
}

export enum ItemType {
  Material = 'material',
  Pill = 'pill',
  Equipment = 'equipment',
  Quest = 'quest'
}

export enum ItemQuality {
  Common = 1,
  Good = 2,
  Excellent = 3,
  Legendary = 4
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  quality: ItemQuality;
  price: number;
  description?: string;
}

export interface PurchaseResult {
  success: boolean;
  reason?: 'insufficient_funds' | 'item_not_available';
}