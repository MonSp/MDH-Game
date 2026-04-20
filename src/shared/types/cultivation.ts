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