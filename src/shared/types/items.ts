export enum ItemQuality {
  MORTAL = '凡品',
  SPIRIT = '灵品',
  MYSTIC = '玄品',
  EARTH = '地品',
  HEAVEN = '天品',
}

export interface PillEffect {
  stat: 'hp' | 'mp' | 'exp' | 'breakthrough';
  value: number;
}

export interface CraftRecipe {
  id: string;
  name: string;
  type: 'pill' | 'equipment';
  quality: ItemQuality;
  materials: Record<string, number>; // item name → count
  product: string;                   // output item name
  baseSuccessRate: number;           // 0-1
  realmRequired?: string;            // minimum realm
  effects?: PillEffect[];
  description: string;
}
