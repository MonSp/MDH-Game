export enum ResourceType {
  SpiritField = 'spirit_field',
  OreVein = 'ore_vein',
  Ruins = 'ruins'
}

export interface ResourceConfig {
  type: ResourceType;
  color: string;
  cultivationReward: number;
  spiritStoneReward: number;
  specialDropChance?: number;
  specialDropItem?: string;
}

export const RESOURCE_CONFIGS: Record<ResourceType, ResourceConfig> = {
  [ResourceType.SpiritField]: {
    type: ResourceType.SpiritField,
    color: '#00FF00',
    cultivationReward: 30,
    spiritStoneReward: 0
  },
  [ResourceType.OreVein]: {
    type: ResourceType.OreVein,
    color: '#808080',
    cultivationReward: 0,
    spiritStoneReward: 50
  },
  [ResourceType.Ruins]: {
    type: ResourceType.Ruins,
    color: '#800080',
    cultivationReward: 0,
    spiritStoneReward: 100,
    specialDropChance: 0.3,
    specialDropItem: 'WashMarrowPill'
  }
};

export interface ResourceNode {
  id: string;
  type: ResourceType;
  x: number;
  y: number;
  respawnTimer: number;
  lastCollectedAt?: number;
}

export interface CollectResult {
  success: boolean;
  reason?: 'resource_not_found' | 'too_far' | 'already_collected';
  rewards?: {
    cultivation: number;
    spiritStones: number;
    specialDrop: string | null;
  };
}