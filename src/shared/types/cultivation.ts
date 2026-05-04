export enum CultivationRealm {
  Mortal = 1,
  QiRefining = 2,
  Foundation = 3,
  GoldenCore = 4,
  YuanYing = 5,
  Transcendent = 6,
  VoidRefining = 7,
  Unity = 8,
  GreatCircle = 9,
  Tribulation = 10
}

export interface RealmConfig {
  realm: CultivationRealm;
  name: string;
  requiredCultivation: number;
  spiritStoneCost: number;
  healthMultiplier: number;
  spiritMultiplier: number;
  powerMultiplier: number;
}

export const REALM_CONFIGS: Record<CultivationRealm, RealmConfig> = {
  [CultivationRealm.Mortal]: {
    realm: CultivationRealm.Mortal,
    name: '凡人',
    requiredCultivation: 100,
    spiritStoneCost: 100,
    healthMultiplier: 1,
    spiritMultiplier: 1,
    powerMultiplier: 1
  },
  [CultivationRealm.QiRefining]: {
    realm: CultivationRealm.QiRefining,
    name: '练气',
    requiredCultivation: 300,
    spiritStoneCost: 300,
    healthMultiplier: 2,
    spiritMultiplier: 2,
    powerMultiplier: 2
  },
  [CultivationRealm.Foundation]: {
    realm: CultivationRealm.Foundation,
    name: '筑基',
    requiredCultivation: 600,
    spiritStoneCost: 600,
    healthMultiplier: 4,
    spiritMultiplier: 4,
    powerMultiplier: 4
  },
  [CultivationRealm.GoldenCore]: {
    realm: CultivationRealm.GoldenCore,
    name: '金丹',
    requiredCultivation: 1200,
    spiritStoneCost: 1200,
    healthMultiplier: 8,
    spiritMultiplier: 8,
    powerMultiplier: 8
  },
  [CultivationRealm.YuanYing]: {
    realm: CultivationRealm.YuanYing,
    name: '元婴',
    requiredCultivation: 2400,
    spiritStoneCost: 2400,
    healthMultiplier: 16,
    spiritMultiplier: 16,
    powerMultiplier: 16
  },
  [CultivationRealm.Transcendent]: {
    realm: CultivationRealm.Transcendent,
    name: '化神',
    requiredCultivation: 4800,
    spiritStoneCost: 4800,
    healthMultiplier: 32,
    spiritMultiplier: 32,
    powerMultiplier: 32
  },
  [CultivationRealm.VoidRefining]: {
    realm: CultivationRealm.VoidRefining,
    name: '炼虚',
    requiredCultivation: 9600,
    spiritStoneCost: 9600,
    healthMultiplier: 64,
    spiritMultiplier: 64,
    powerMultiplier: 64
  },
  [CultivationRealm.Unity]: {
    realm: CultivationRealm.Unity,
    name: '合体',
    requiredCultivation: 19200,
    spiritStoneCost: 19200,
    healthMultiplier: 128,
    spiritMultiplier: 128,
    powerMultiplier: 128
  },
  [CultivationRealm.GreatCircle]: {
    realm: CultivationRealm.GreatCircle,
    name: '大乘',
    requiredCultivation: 38400,
    spiritStoneCost: 38400,
    healthMultiplier: 256,
    spiritMultiplier: 256,
    powerMultiplier: 256
  },
  [CultivationRealm.Tribulation]: {
    realm: CultivationRealm.Tribulation,
    name: '渡劫',
    requiredCultivation: Infinity,
    spiritStoneCost: Infinity,
    healthMultiplier: 512,
    spiritMultiplier: 512,
    powerMultiplier: 512
  }
};

export interface BreakthroughResult {
  success: boolean;
  newRealm?: CultivationRealm;
  reason?: 'cultivation_insufficient' | 'spirit_stones_insufficient' | 'max_realm_reached';
}

// === Phase 3: Technique (功法) System ===

export enum TechniqueGrade {
  MORTAL = '凡品',
  SPIRIT = '灵品',
  EARTH = '地品',
  HEAVEN = '天品',
  IMMORTAL = '仙品',
}

export enum TechniqueType {
  PASSIVE = 'passive',
  ACTIVE = 'active',
}

export interface TechniqueEffect {
  stat: 'attack' | 'defense' | 'hp' | 'mp' | 'expRate' | 'cultivationRate';
  value: number; // flat bonus per level
  perLevel: number; // additional per technique level
}

export interface TechniqueSkill {
  name: string;
  description: string;
  cooldown: number; // ticks
  damageMultiplier: number;
  cost: { mp?: number; spiritStones?: number };
  range: number;
  aoe?: number;
}

export interface Technique {
  id: string;
  name: string;
  grade: TechniqueGrade;
  type: TechniqueType;
  description: string;
  effects: TechniqueEffect[];
  /** Required cultivation realm index to learn */
  requiredRealm: CultivationRealm;
  /** Spirit stone cost to learn */
  learnCost: number;
  /** Spirit stone cost per level-up */
  levelUpCost: number;
  maxLevel: number;
  /** Active skill granted (if type=ACTIVE) */
  skill?: TechniqueSkill;
}

/** A technique the player has learned */
export interface LearnedTechnique {
  techniqueId: string;
  level: number;
  slotIndex: number; // -1 = passive (not in active slot)
}

// === Phase 3: Equipment Expansion ===

export enum EquipmentSlot {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  ARTIFACT = 'artifact',
  ACCESSORY = 'accessory',
  PILL = 'pill',
}

export enum EquipmentRarity {
  MORTAL = '凡品',
  SPIRIT = '灵品',
  IMMORTAL = '仙品',
  DIVINE = '神品',
}

export const RARITY_MULTIPLIER: Record<EquipmentRarity, number> = {
  [EquipmentRarity.MORTAL]: 1.0,
  [EquipmentRarity.SPIRIT]: 1.5,
  [EquipmentRarity.IMMORTAL]: 2.5,
  [EquipmentRarity.DIVINE]: 4.0,
};

export interface EquipmentAffix {
  stat: 'attack' | 'defense' | 'hp' | 'mp' | 'critRate' | 'critDamage' | 'expRate' | 'lifesteal';
  value: number;
  label: string;
}

export interface Equipment {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  baseStats: Partial<Record<'attack' | 'defense' | 'hp' | 'mp', number>>;
  affixes: EquipmentAffix[];
  requiredRealm: CultivationRealm;
  price: number;
  /** Whether this is a default/generated item vs player-crafted */
  isCrafted?: boolean;
}