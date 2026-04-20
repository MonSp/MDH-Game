export enum RealmLevel {
  Mortal = 'mortal',
  QiRefining = 'qi_refining',
  FoundationBuilding = 'foundation_building',
  GoldenCore = 'golden_core',
  YuanInfant = 'yuan_infant',
  Transcension = 'transcension'
}

export interface LifespanConfig {
  realm: RealmLevel;
  baseLifespan: number;
  maxLifespan: number;
  deathProbabilityPerYear: number;
}

export const REALM_LIFESPANS: Record<RealmLevel, LifespanConfig> = {
  [RealmLevel.Mortal]: { realm: RealmLevel.Mortal, baseLifespan: 80, maxLifespan: 100, deathProbabilityPerYear: 0.1 },
  [RealmLevel.QiRefining]: { realm: RealmLevel.QiRefining, baseLifespan: 100, maxLifespan: 120, deathProbabilityPerYear: 0.15 },
  [RealmLevel.FoundationBuilding]: { realm: RealmLevel.FoundationBuilding, baseLifespan: 150, maxLifespan: 200, deathProbabilityPerYear: 0.08 },
  [RealmLevel.GoldenCore]: { realm: RealmLevel.GoldenCore, baseLifespan: 300, maxLifespan: 400, deathProbabilityPerYear: 0.05 },
  [RealmLevel.YuanInfant]: { realm: RealmLevel.YuanInfant, baseLifespan: 800, maxLifespan: 1000, deathProbabilityPerYear: 0.03 },
  [RealmLevel.Transcension]: { realm: RealmLevel.Transcension, baseLifespan: 2000, maxLifespan: 3000, deathProbabilityPerYear: 0.01 }
};

export enum DeathCause {
  AgeLimit = 'age_limit',
  Battle = 'battle',
  CultivationFail = 'cultivation_fail',
  MonsterAttack = 'monster_attack',
  Robbery = 'robbery',
  LawEnforcement = 'law_enforcement',
  TribulationFail = 'tribulation_fail',
  FireDeviation = 'fire_deviation'
}

export interface DeathConfig {
  cause: DeathCause;
  playerInfluence: boolean;
  baseFrequency: 'high' | 'medium' | 'low';
  triggers?: string[];
}

export const DEATH_CONFIGS: Record<DeathCause, DeathConfig> = {
  [DeathCause.Battle]: {
    cause: DeathCause.Battle,
    playerInfluence: true,
    baseFrequency: 'high',
    triggers: ['nation_war', 'family_war']
  },
  [DeathCause.MonsterAttack]: {
    cause: DeathCause.MonsterAttack,
    playerInfluence: true,
    baseFrequency: 'medium',
    triggers: ['exploration', 'resource_collection']
  },
  [DeathCause.Robbery]: {
    cause: DeathCause.Robbery,
    playerInfluence: true,
    baseFrequency: 'medium',
    triggers: ['resource_competition']
  },
  [DeathCause.LawEnforcement]: {
    cause: DeathCause.LawEnforcement,
    playerInfluence: true,
    baseFrequency: 'high',
    triggers: ['family_reputation_zero']
  },
  [DeathCause.TribulationFail]: {
    cause: DeathCause.TribulationFail,
    playerInfluence: false,
    baseFrequency: 'low'
  },
  [DeathCause.AgeLimit]: {
    cause: DeathCause.AgeLimit,
    playerInfluence: false,
    baseFrequency: 'low'
  },
  [DeathCause.FireDeviation]: {
    cause: DeathCause.FireDeviation,
    playerInfluence: false,
    baseFrequency: 'low'
  },
  [DeathCause.CultivationFail]: {
    cause: DeathCause.CultivationFail,
    playerInfluence: false,
    baseFrequency: 'low'
  }
};

export interface SoulData {
  originalNpcId: string;
  originalClanId: string;
  originalNation: string;
  originalRealm: RealmLevel;
  deathCause: DeathCause;
  deathTime: number;
  poolEntryTime?: number;
  inheritedResources?: number;
}

export interface PoolStatus {
  totalCount: number;
  byRealm: Record<RealmLevel, number>;
  byNation: Record<string, number>;
  byDeathCause: Record<DeathCause, number>;
}

export interface BirthResult {
  shouldBorn: boolean;
  count?: number;
  nation?: string;
  family?: string;
}

export interface DeathDropConfig {
  baseSpiritStoneDropRate: number;
  baseItemDropCount: { min: number; max: number };
  equipmentDropRate: number;
  spaceTurbulenceRate: number;
  familyContributionRefundRate: number;
  worldRecoveryRate: number;
}

export const DEATH_DROP_CONFIG: DeathDropConfig = {
  baseSpiritStoneDropRate: 0.5,
  baseItemDropCount: { min: 1, max: 3 },
  equipmentDropRate: 0.3,
  spaceTurbulenceRate: 0.1,
  familyContributionRefundRate: 0.5,
  worldRecoveryRate: 0.175
};

export interface DropItem {
  type: 'spirit_stones' | 'item' | 'equipment';
  amount?: number;
  item?: any;
  equipment?: any;
  recipient: string;
}

export interface DropResult {
  drops: DropItem[];
  worldRecovery: DropItem[];
  actualWorldRecovery: number;
  familyFavorabilityChange: number;
}

export interface BirthDecision {
  action: 'none' | 'batch_birth' | 'nation_targeted_birth' | 'family_targeted_birth' | 'forced_birth';
  count?: number;
  nation?: string;
  familyId?: string;
  distribution?: Record<string, number>;
}

export interface PopulationTarget {
  layerId: string;
  totalTarget: number;
  nationTargets: Record<string, number>;
  familyTargets: Record<string, { min: number; max: number }>;
}

export interface ResourceCycleStats {
  totalNpcs: number;
  avgResourcesPerNpc: number;
  worldRecoveryPool: { totalSpiritStones: number; itemCount: number; equipmentCount: number };
  reincarnationPoolSize: number;
  deathRate: number;
  birthRate: number;
}