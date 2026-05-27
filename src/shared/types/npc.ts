import { Position } from './country';

export enum NPCRole {
  FamilyHead = 'family_head',
  Elder = 'elder',
  CoreDisciple = 'core_disciple',
  InnerDisciple = 'inner_disciple',
  BranchDisciple = 'branch_disciple',
  LawEnforcementElder = 'law_enforcement_elder'
}

export enum RealmLevel {
  Mortal = 'mortal',
  QiRefining = 'qi_refining',
  FoundationBuilding = 'foundation_building',
  GoldenCore = 'golden_core',
  YuanInfant = 'yuan_infant',
  Transcension = 'transcension'
}

export enum NPCActivity {
  Patrol = 'patrol',
  Retreat = 'retreat',
  Logistics = 'logistics',
  Compete = 'compete',
  Work = 'work',
  Rest = 'rest',
  Trade = 'trade',
  Flee = 'flee',
  Chase = 'chase',
  Dead = 'dead'
}

export interface NPCPersonality {
  ambition: number;
  caution: number;
  loyalty: number;
  greed: number;
}

export interface NPCBaseAttributes {
  id: string;
  name: string;
  clanId: string;
  role: NPCRole;
  realm: RealmLevel;
  power: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  activity: NPCActivity;
  position: Position;
}

export interface NPCItemEntry {
  itemId: number;
  name: string;
  count: number;
}

export interface NPCResources {
  spiritStones: number;
  items: NPCItemEntry[];
  equipment: string | null;
  familyContribution: number;
}

export interface NPCEntity extends NPCBaseAttributes {
  nation: string;
  personality: NPCPersonality;
  birthTime: number;
  age: number;
  birthType: BirthType;
  layer: number;
  resources: NPCResources;
  state: NPCLifeState;
}

export enum NPCLifeState {
  Waiting = 'waiting',
  Born = 'born',
  Growing = 'growing',
  Active = 'active',
  Dying = 'dying',
  Dead = 'dead'
}

export enum BirthType {
  Natural = 'natural',
  WarOrphan = 'war_orphan',
  Wanderer = 'wanderer',
  DemonBeast = 'demon_beast'
}

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

export interface LayerConfig {
  layer: number;
  name: string;
  spiritMultiplier: number;
  resourceMultiplier: number;
  npcPowerRange: { min: number; max: number };
  maxRealm: RealmLevel;
}

export const LAYER_CONFIGS: LayerConfig[] = [
  { layer: 9, name: '凡界·新生地', spiritMultiplier: 1.0, resourceMultiplier: 1.0, npcPowerRange: { min: 500, max: 10000 }, maxRealm: RealmLevel.Transcension },
  { layer: 8, name: '灵界·汇聚地', spiritMultiplier: 1.5, resourceMultiplier: 1.5, npcPowerRange: { min: 750, max: 15000 }, maxRealm: RealmLevel.Transcension },
  { layer: 7, name: '灵界·争锋地', spiritMultiplier: 2.0, resourceMultiplier: 2.0, npcPowerRange: { min: 1000, max: 20000 }, maxRealm: RealmLevel.Transcension },
  { layer: 6, name: '灵界·霸业地', spiritMultiplier: 3.0, resourceMultiplier: 2.5, npcPowerRange: { min: 1500, max: 30000 }, maxRealm: RealmLevel.Transcension },
  { layer: 5, name: '太虚·问道境', spiritMultiplier: 4.0, resourceMultiplier: 3.0, npcPowerRange: { min: 2000, max: 40000 }, maxRealm: RealmLevel.Transcension },
  { layer: 4, name: '太虚·明道境', spiritMultiplier: 5.0, resourceMultiplier: 4.0, npcPowerRange: { min: 2500, max: 50000 }, maxRealm: RealmLevel.Transcension },
  { layer: 3, name: '太虚·证道境', spiritMultiplier: 7.0, resourceMultiplier: 5.0, npcPowerRange: { min: 3000, max: 60000 }, maxRealm: RealmLevel.Transcension },
  { layer: 2, name: '仙界·门槛', spiritMultiplier: 10.0, resourceMultiplier: 8.0, npcPowerRange: { min: 5000, max: 100000 }, maxRealm: RealmLevel.Transcension },
  { layer: 1, name: '混元仙界', spiritMultiplier: 20.0, resourceMultiplier: 15.0, npcPowerRange: { min: 10000, max: 200000 }, maxRealm: RealmLevel.Transcension }
];

export const NATIONALITY_PERSONALITY_BONUS: Record<string, Partial<NPCPersonality>> = {
  '秦国': { ambition: 20, loyalty: 20 },
  '楚国': { caution: 20 },
  '齐国': { caution: 10, ambition: 10 },
  '燕国': { caution: 20, greed: -10 },
  '赵国': { ambition: 10, greed: 10 },
  '魏国': { loyalty: 20 },
  '韩国': { greed: 20, caution: 10 }
};

export enum BehaviorPriority {
  SURVIVAL = 1,
  FAMILY_DUTY = 2,
  OPPORTUNISM = 3,
  DAILY = 4
}

export interface BehaviorWeight {
  patrol: number;
  retreat: number;
  logistics: number;
  explore: number;
  work: number;
  rest: number;
  trade: number;
}

export const BASE_WEIGHTS: BehaviorWeight = {
  patrol: 10,
  retreat: 10,
  logistics: 10,
  explore: 10,
  work: 10,
  rest: 10,
  trade: 0
};