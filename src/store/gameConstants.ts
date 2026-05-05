import type { SaveSlotInfo } from './saveManager';
import {
  TechniqueGrade, TechniqueType,
  EquipmentSlot, EquipmentRarity,
  CultivationRealm,
} from '../shared/types/cultivation';
import type {
  Technique, LearnedTechnique,
  Equipment, EquipmentAffix,
  TechniqueEffect, TechniqueSkill,
} from '../shared/types/cultivation';

// Re-export cultivation enums so they're available through export * from gameStore
export { TechniqueGrade, TechniqueType, EquipmentSlot, EquipmentRarity, CultivationRealm };
export type { Technique, LearnedTechnique, Equipment, EquipmentAffix, TechniqueEffect, TechniqueSkill };

export type HeavenLevel = 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1;

export const HEAVEN_INFO: Record<HeavenLevel, {
  name: string;
  spiritMultiplier: number;
  resourceMultiplier: number;
  maxCapacity: number;
  familyCount: number;
  isTranscendent: boolean;
  ascensionRequired: boolean;
  canCycleBack: boolean;
}> = {
  9: { name: '凡界·新生地', spiritMultiplier: 1.0, resourceMultiplier: 1.0, maxCapacity: 100, familyCount: 16, isTranscendent: false, ascensionRequired: true, canCycleBack: false },
  8: { name: '灵界·汇聚地', spiritMultiplier: 1.5, resourceMultiplier: 1.5, maxCapacity: 200, familyCount: 24, isTranscendent: false, ascensionRequired: true, canCycleBack: true },
  7: { name: '灵界·争锋地', spiritMultiplier: 2.0, resourceMultiplier: 2.0, maxCapacity: 300, familyCount: 32, isTranscendent: false, ascensionRequired: true, canCycleBack: true },
  6: { name: '灵界·霸业地', spiritMultiplier: 3.0, resourceMultiplier: 2.5, maxCapacity: 400, familyCount: 40, isTranscendent: false, ascensionRequired: true, canCycleBack: true },
  5: { name: '太虚·问道境', spiritMultiplier: 4.0, resourceMultiplier: 3.0, maxCapacity: 500, familyCount: 48, isTranscendent: true, ascensionRequired: true, canCycleBack: true },
  4: { name: '太虚·明道境', spiritMultiplier: 5.0, resourceMultiplier: 4.0, maxCapacity: 600, familyCount: 56, isTranscendent: true, ascensionRequired: true, canCycleBack: true },
  3: { name: '太虚·证道境', spiritMultiplier: 7.0, resourceMultiplier: 5.0, maxCapacity: 800, familyCount: 64, isTranscendent: true, ascensionRequired: true, canCycleBack: true },
  2: { name: '仙界·门槛', spiritMultiplier: 10.0, resourceMultiplier: 8.0, maxCapacity: 1000, familyCount: 0, isTranscendent: true, ascensionRequired: false, canCycleBack: true },
  1: { name: '混元仙界', spiritMultiplier: 20.0, resourceMultiplier: 15.0, maxCapacity: 999999, familyCount: 0, isTranscendent: true, ascensionRequired: false, canCycleBack: true },
};

export type Realm = '凡人' | '练气' | '筑基' | '金丹' | '元婴' | '化神' | '炼虚' | '合体' | '大乘' | '渡劫';

export const REALM_LIST: Realm[] = ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫'];

export const REALM_BREAKTHROUGH_COST: Record<Realm, number> = {
  '凡人': 100,
  '练气': 300,
  '筑基': 1000,
  '金丹': 3000,
  '元婴': 10000,
  '化神': 30000,
  '炼虚': 100000,
  '合体': 300000,
  '大乘': 1000000,
  '渡劫': 0
};

export const REALM_MAX_EXP: Record<Realm, number> = {
  '凡人': 100,
  '练气': 300,
  '筑基': 1000,
  '金丹': 3000,
  '元婴': 10000,
  '化神': 30000,
  '炼虚': 100000,
  '合体': 300000,
  '大乘': 1000000,
  '渡劫': 0
};

export const HEAVEN_MAX_REALM: Record<HeavenLevel, Realm> = {
  9: '化神',
  8: '炼虚',
  7: '合体',
  6: '大乘',
  5: '渡劫',
  4: '渡劫',
  3: '渡劫',
  2: '渡劫',
  1: '渡劫',
};

export type BodyType = '凡体' | '仙体' | '神体' | '剑体' | '雷灵体' | '药王体' | '战体';

export interface BodyTypeInfo {
  name: BodyType;
  description: string;
  buff: string;
}

export const BODY_TYPES_DATA: Record<BodyType, { name: string; desc: string; buff: string }> = {
  '凡体': { name: '凡体', desc: '芸芸众生，资质平平。', buff: '无特殊加成' },
  '剑体': { name: '剑体', desc: '天生剑骨，杀伐果断。', buff: '战力计算+25%，御剑飞行(移速)+15%' },
  '战体': { name: '战体', desc: '百战不殆，肉身成圣。', buff: '生命上限+30%，受击硬直减免' },
  '雷灵体': { name: '雷灵体', desc: '亲和雷电，法术狂暴。', buff: '雷系伤害+30%，施法速度+15%' },
  '药王体': { name: '药王体', desc: '草木皆兵，丹心长存。', buff: '采集灵草双倍，炼丹成功率+20%' },
  '仙体': { name: '仙体', desc: '飘飘欲仙，超凡脱俗。', buff: '全属性+10%' },
  '神体': { name: '神体', desc: '天神下凡，万法不侵。', buff: '全属性+20%' },
};

export type CycleType = '神念投影' | '真灵转世' | '道统传承' | null;

// 资质系统
export interface TalentAttributes {
  spiritualRoot: number;      // 灵根 0-100 → 修炼速度
  boneConstitution: number;   // 根骨 0-100 → 战力/生命
  comprehension: number;      // 悟性 0-100 → 突破概率
  fortune: number;            // 机缘 0-100 → 随机事件
}

export const TALENT_GRADE_TABLE = [
  { min: 0, max: 20, spiritual: '废灵根', bone: '凡骨', comprehension: '愚钝', fortune: '霉运' },
  { min: 21, max: 40, spiritual: '下品灵根', bone: '灵骨', comprehension: '普通', fortune: '普通' },
  { min: 41, max: 60, spiritual: '中品灵根', bone: '玉骨', comprehension: '聪明', fortune: '小运' },
  { min: 61, max: 80, spiritual: '上品灵根', bone: '圣骨', comprehension: '聪慧', fortune: '大运' },
  { min: 81, max: 100, spiritual: '天灵根', bone: '仙骨', comprehension: '天慧', fortune: '天眷' },
];

export function computeTalentGrade(value: number, gradeKey: 'spiritual' | 'bone' | 'comprehension' | 'fortune'): string {
  const clamped = Math.max(0, Math.min(100, value));
  return TALENT_GRADE_TABLE.find(t => clamped >= t.min && clamped <= t.max)?.[gradeKey] ?? '未知';
}

// 声望系统
export const REPUTATION_TITLES = [
  { min: 50000, title: '千古流芳' },
  { min: 20000, title: '名满天下' },
  { min: 10000, title: '威震四海' },
  { min: 5000, title: '声名远扬' },
  { min: 2000, title: '名动一方' },
  { min: 500, title: '小有名气' },
  { min: 100, title: '初出茅庐' },
  { min: 0, title: '无名小卒' },
];

export function getReputationTitle(reputation: number): string {
  return REPUTATION_TITLES.find(t => reputation >= t.min)?.title ?? '无名小卒';
}

export const REPUTATION_SOURCES: Record<string, { base: number; label: string }> = {
  monster_kill: { base: 5, label: '斩妖除魔' },
  npc_combat_win: { base: 10, label: '击败修士' },
  breakthrough: { base: 100, label: '境界突破' },
  gather: { base: 2, label: '采集资源' },
};

// 小队系统
export type SquadRole = '战斗型' | '斥候型' | '军师型' | '后勤型';

export const SQUAD_ROLE_INFO: Record<SquadRole, { label: string; description: string; statBonus: string }> = {
  '战斗型': { label: '战斗型', description: '擅长正面作战', statBonus: '队伍战力+15%' },
  '斥候型': { label: '斥候型', description: '擅长侦察探索', statBonus: '采集量+20%，预警危险' },
  '军师型': { label: '军师型', description: '擅长谋略布局', statBonus: '修炼速度+10%' },
  '后勤型': { label: '后勤型', description: '擅长后勤支援', statBonus: '丹药效果+15%' },
};

// 外交辅助函数
export function getDiplomaticStatusFrom(state: GameState, fromClanId: string, toClanId: string): DiplomaticStatus {
  const clan = state.clans.find(c => c.id === fromClanId);
  if (!clan || !clan.diplomacy) return '中立';
  const entry = clan.diplomacy[toClanId];
  if (!entry) return '中立';
  return entry.status;
}

export function getDiplomaticStatusFromClans(clans: Clan[], fromClanId: string, toClanId: string): DiplomaticStatus {
  const clan = clans.find(c => c.id === fromClanId);
  if (!clan || !clan.diplomacy) return '中立';
  const entry = clan.diplomacy[toClanId];
  if (!entry) return '中立';
  return entry.status;
}

/** Phase 1.4: compute a clan's territory center based on its country capital + index offset */
export function getClanTerritoryCenter(clan: Clan, clans: Clan[]): { x: number; y: number } {
  const capital = COUNTRIES_DATA[clan.country]?.capital || { x: 50, y: 50 };
  const sameCountry = clans.filter(c => c.country === clan.country);
  const index = sameCountry.findIndex(c => c.id === clan.id);
  return {
    x: capital.x + (index % 5) * 3,
    y: capital.y + Math.floor(index / 5) * 3,
  };
}

export const RECRUIT_REPUTATION_TIER: Record<SquadRole, number> = {
  '战斗型': 100,
  '斥候型': 500,
  '军师型': 2000,
  '后勤型': 500,
};

export const EQUIPPABLE_ITEMS: Record<string, number> = {
  '低级法器': 10,
};

export const RECRUIT_SPIRITSTONE_COST: Record<SquadRole, number> = {
  '战斗型': 200,
  '斥候型': 350,
  '军师型': 500,
  '后勤型': 300,
};

// 势力系统
export type BuildingType = '议事厅' | '练功房' | '丹房' | '藏经阁' | '库房' | '哨塔' | '炼器房';
export type BuildingLevel = 1 | 2 | 3;
export type FactionPosition = '家主' | '长老' | '供奉' | '核心成员' | '支脉子弟';

export interface FactionBuilding {
  type: BuildingType;
  level: BuildingLevel;
  hp: number;
}

export const BUILDING_EFFECTS: Record<BuildingType, string[]> = {
  '议事厅': ['税率效率+10%', '税率效率+20%', '税率效率+30%，官员上限+2'],
  '练功房': ['修炼速度+10%', '修炼速度+20%', '修炼速度+30%'],
  '丹房': ['丹药效果+10%', '丹药效果+20%', '丹药效果+30%'],
  '藏经阁': ['队伍战力+5%', '队伍战力+10%', '队伍战力+15%'],
  '库房': ['被动收入+5/ tick', '被动收入+10/ tick', '被动收入+20/ tick'],
  '哨塔': ['视野范围+2格', '视野范围+4格', '视野范围+6格'],
  '炼器房': ['锻造成功率+10%', '锻造成功率+20%', '锻造成功率+30%'],
};

export const BUILDING_UPGRADE_COST: Record<BuildingType, number[]> = {
  '议事厅': [5000, 20000, 50000],
  '练功房': [3000, 10000, 30000],
  '丹房': [3000, 10000, 30000],
  '藏经阁': [5000, 20000, 50000],
  '库房': [2000, 8000, 20000],
  '哨塔': [2000, 8000, 20000],
  '炼器房': [3000, 10000, 30000],
};

// Building effect multipliers per level (index 0 = level 1)
export const BUILDING_SPEED_MULTIPLIERS: Partial<Record<BuildingType, number[]>> = {
  '练功房': [1.1, 1.2, 1.3],
  '丹房': [1.1, 1.2, 1.3],
  '藏经阁': [1.05, 1.10, 1.15],
  '炼器房': [1.1, 1.2, 1.3],
};
export const BUILDING_TREASURY_CAP_BASE = 10000;
export const BUILDING_TREASURY_CAP_PER_LEVEL = 5000;
export const BUILDING_VISION_BONUS: Record<number, number> = { 1: 2, 2: 4, 3: 6 };

export function getFactionBuildingLevel(clans: Clan[], factionId: string | null, type: BuildingType): number {
  if (!factionId) return 0;
  const faction = clans.find(c => c.id === factionId);
  if (!faction || !faction.buildings) return 0;
  return faction.buildings.find(b => b.type === type)?.level || 0;
}

export const FACTION_CREATE_REQUIREMENTS = {
  reputation: 500,
  spiritStones: 100000,
  minSquadMembers: 3,
};

export interface ActiveDebuff {
  id: string;
  name: string;
  expiresAt: number;
  attackPenalty: number;
  defensePenalty: number;
}

export interface Player {
  id: string;
  name: string;
  heavenLevel: HeavenLevel;
  realm: Realm;
  bodyType: BodyType;
  potential: string;
  country: string;
  clanId: string;
  stats: { hp: number; maxHp: number; mp: number; maxMp: number; attack: number; defense: number; exp: number; maxExp: number };
  hiddenStats: { killCount: number; cultivateCount: number; gatherCount: number; ascensionCount: number; merit: number };
  reputation: number;
  position: { x: number; y: number };
  inventory: Record<string, number>;
  cycleInfo: {
    type: CycleType;
    cooldownEndTime?: number;
    previousHeavenLevel?: HeavenLevel;
    previousClanId?: string;
    previousCountry?: string;
    inheritanceStone?: number;
  };
  isAscending: boolean;
  ascensionTarget?: HeavenLevel;
  talent: TalentAttributes;
  activeDebuffs: ActiveDebuff[];
  // Phase 3: Techniques & Equipment
  learnedTechniques: LearnedTechnique[];
  equipmentSlots: Partial<Record<EquipmentSlot, Equipment>>;
  skillCooldowns: Record<string, number>;  // techniqueId → remaining cooldown ticks
}

export interface SquadMember {
  id: string;
  npcId: string;
  name: string;
  clanId: string;
  role: SquadRole;
  realm: Realm;
  power: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  personality: { ambition: number; caution: number; loyalty: number; greed: number };
  joinDate: number;
  kills: number;
  isAlive: boolean;
  position: { x: number; y: number };
  activity: string;
  // P1 enhancements
  equipment: string[];
  level: number;
  exp: number;
  maxExp: number;
  // Phase 4
  combatStance?: SquadCombatStance;
}

// 阵型类型
export type FormationType = '散开' | '锋矢' | '方圆' | '雁行' | '鱼鳞';

export interface FormationConfig {
  name: string;
  description: string;
  statBonus: Partial<Record<string, number>>; // attack/defense/power multiplier
  allowedRoles: SquadRole[];
}

export const FORMATION_DATA: Record<FormationType, FormationConfig> = {
  '散开': { name: '散开', description: '无阵型，自由作战', statBonus: {}, allowedRoles: ['战斗型', '斥候型', '军师型', '后勤型'] },
  '锋矢': { name: '锋矢阵', description: '攻击阵型，战斗型+40%攻击', statBonus: { attack: 0.4, power: 0.2 }, allowedRoles: ['战斗型'] },
  '方圆': { name: '方圆阵', description: '防御阵型，全体+25%防御', statBonus: { defense: 0.25 }, allowedRoles: ['战斗型', '斥候型', '军师型', '后勤型'] },
  '雁行': { name: '雁行阵', description: '远程阵型，斥候型+50%攻击', statBonus: { attack: 0.5 }, allowedRoles: ['斥候型'] },
  '鱼鳞': { name: '鱼鳞阵', description: '均衡阵型，全体+15%全属性', statBonus: { attack: 0.15, defense: 0.15, power: 0.15 }, allowedRoles: ['战斗型', '斥候型', '军师型', '后勤型'] },
};

export type SquadCombatStance = '进攻' | '集中火力' | '撤退' | '防御阵型';

export interface ClanArmy {
  id: string;
  clanId: string;
  name: string;
  size: number;
  totalPower: number;
  position: { x: number; y: number };
  targetPosition?: { x: number; y: number };
  activity: string;
  siegeTarget?: string;
}

export interface WarStats {
  battlesWon: number;
  battlesLost: number;
  npcsKilled: number;
  alliesLost: number;
  treasuryLooted: number;
  citiesCaptured: number;
}

// 外交/战争类型
export type DiplomaticStatus = '中立' | '同盟' | '战争' | '停战' | '臣服' | '皇族';
export type ConflictLevel = '和平' | '摩擦' | '局部冲突' | '全面战争';

export interface ClanDiplomacy {
  status: DiplomaticStatus;
  conflictLevel: ConflictLevel;
  declaredBy: string;        // 发起方clanId
  truceUntil?: number;       // 停战到期tick（仅停战状态）
  allianceDate?: number;     // 结盟时间
  vassalTribute?: number;    // 臣服方每周期进贡灵石数
}

export interface Clan {
  id: string;
  name: string;
  country: string;
  type: '皇族' | '1级' | '2级' | '3级' | '飞升家族';
  reputation: number;
  treasury: number;
  heavenLevel: HeavenLevel;
  isAscendingFamily: boolean;
  buildings?: FactionBuilding[];
  territory?: number;
  morale?: number;
  diplomacy?: Record<string, ClanDiplomacy>;  // key = target clanId
  // Phase 4: siege warfare
  garrison?: number;      // defensive power (0 = no defense)
  fortification?: number; // wall HP (0 = undefended)
  // Phase 4.2b: siege equipment build progress
  siegeEquipment?: { building: boolean; ready: boolean; multiplier: number; progressTicks: number; requiredTicks: number };
}

/** A captured NPC held prisoner — can be recruited, released, or executed */
export interface CaptiveNPC {
  npc: NPC;
  capturedAtTick: number;
  loyalty: number;
  originalClanId: string;
}

export interface NPC {
  id: string;
  clanId: string;
  name: string;
  role: '家主' | '长老' | '核心子弟' | '内门子弟' | '支脉子弟' | '执法堂长老';
  realm: Realm;
  power: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  personality: {
    ambition: number;
    caution: number;
    loyalty: number;
    greed: number;
  };
  resources: {
    spiritStone: number;
  };
  activity: string;
  position: { x: number; y: number };
  targetPlayerId?: string;
  tradeTarget?: string;
  retreatTicksRemaining?: number;
}

export type MonsterType = '赤焰蛇' | '冰晶蝎' | '幽冥狼' | '雷纹虎' | '血玉蛛' | '玄冰蟒' | '金翅大鹏';

export interface WildMonster {
  id: string;
  name: MonsterType;
  realm: Realm;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  expReward: number;
  position: { x: number; y: number };
  isAlive: boolean;
  targetId?: string;
}

export const MONSTER_TYPES_DATA: Record<MonsterType, {
  name: string;
  realm: Realm;
  hp: number;
  attack: number;
  defense: number;
  expReward: number;
  spiritStoneDrop: number;
}> = {
  '赤焰蛇': { name: '赤焰蛇', realm: '练气', hp: 200, attack: 15, defense: 5, expReward: 30, spiritStoneDrop: 50 },
  '冰晶蝎': { name: '冰晶蝎', realm: '筑基', hp: 800, attack: 40, defense: 15, expReward: 80, spiritStoneDrop: 150 },
  '幽冥狼': { name: '幽冥狼', realm: '金丹', hp: 3000, attack: 120, defense: 40, expReward: 200, spiritStoneDrop: 300 },
  '雷纹虎': { name: '雷纹虎', realm: '元婴', hp: 10000, attack: 400, defense: 120, expReward: 500, spiritStoneDrop: 800 },
  '血玉蛛': { name: '血玉蛛', realm: '化神', hp: 50000, attack: 1500, defense: 400, expReward: 2000, spiritStoneDrop: 3000 },
  '玄冰蟒': { name: '玄冰蟒', realm: '炼虚', hp: 200000, attack: 5000, defense: 1500, expReward: 8000, spiritStoneDrop: 10000 },
  '金翅大鹏': { name: '金翅大鹏', realm: '合体', hp: 800000, attack: 20000, defense: 5000, expReward: 30000, spiritStoneDrop: 50000 },
};

export const MONSTER_REALM_ORDER: { realm: Realm; types: MonsterType[] }[] = [
  { realm: '练气', types: ['赤焰蛇'] },
  { realm: '筑基', types: ['冰晶蝎'] },
  { realm: '金丹', types: ['幽冥狼'] },
  { realm: '元婴', types: ['雷纹虎'] },
  { realm: '化神', types: ['血玉蛛'] },
  { realm: '炼虚', types: ['玄冰蟒'] },
  { realm: '合体', types: ['金翅大鹏'] },
];

export const MAX_MONSTERS = 6;
export const SPAWN_CHANCE = 0.15;
export const SPAWN_MIN_DIST = 5;
export const SPAWN_MAX_DIST = 10;
export const DESPAWN_DIST = 20;

export function calculateDamage(attack: number, defense: number): number {
  if (attack <= 0) return 1;
  return Math.max(1, Math.floor(attack * attack / (attack + defense)));
}

export function getMonstersForPlayerRealm(playerRealm: Realm): MonsterType[] {
  const playerIdx = REALM_LIST.indexOf(playerRealm);
  const available: MonsterType[] = [];
  for (const entry of MONSTER_REALM_ORDER) {
    const monsterIdx = REALM_LIST.indexOf(entry.realm);
    if (Math.abs(monsterIdx - playerIdx) <= 1) {
      available.push(...entry.types);
    }
  }
  // Fallback: if player is too high (渡劫), use highest tier
  if (available.length === 0 && MONSTER_REALM_ORDER.length > 0) {
    available.push(...MONSTER_REALM_ORDER[MONSTER_REALM_ORDER.length - 1].types);
  }
  // Fallback: if player is too low (凡人), use lowest tier
  if (available.length === 0 && MONSTER_REALM_ORDER.length > 0) {
    available.push(...MONSTER_REALM_ORDER[0].types);
  }
  return available;
}

export function createWildMonster(playerPos: { x: number; y: number }, playerRealm: Realm): WildMonster | null {
  const availableTypes = getMonstersForPlayerRealm(playerRealm);
  if (availableTypes.length === 0) return null;

  const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
  const data = MONSTER_TYPES_DATA[type];

  // Spawn within 5-10 tiles of player (not right on top)
  const angle = Math.random() * Math.PI * 2;
  const dist = SPAWN_MIN_DIST + Math.random() * (SPAWN_MAX_DIST - SPAWN_MIN_DIST);
  const pos = {
    x: Math.round(playerPos.x + Math.cos(angle) * dist),
    y: Math.round(playerPos.y + Math.sin(angle) * dist),
  };

  return {
    id: `monster-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: type,
    realm: data.realm,
    hp: data.hp,
    maxHp: data.hp,
    attack: data.attack,
    defense: data.defense,
    expReward: data.expReward,
    position: pos,
    isAlive: true,
  };
}

// === Phase 3: Technique Catalog ===

export const TECHNIQUES_DATA: Technique[] = [
  // MORTAL grade — basic
  { id: 'basic_stance', name: '基础吐纳', grade: TechniqueGrade.MORTAL, type: TechniqueType.PASSIVE, description: '最基本的灵气吐纳法门，缓慢改善体质。', effects: [{ stat: 'hp', value: 10, perLevel: 5 }], requiredRealm: 1, learnCost: 100, levelUpCost: 50, maxLevel: 5 },
  { id: 'stone_skin', name: '石肤术', grade: TechniqueGrade.MORTAL, type: TechniqueType.PASSIVE, description: '将灵气遍布体表，硬化肌肤。', effects: [{ stat: 'defense', value: 3, perLevel: 2 }], requiredRealm: 1, learnCost: 150, levelUpCost: 80, maxLevel: 5 },
  { id: 'qi_gathering', name: '聚气诀', grade: TechniqueGrade.MORTAL, type: TechniqueType.PASSIVE, description: '加快灵气吸收速度。', effects: [{ stat: 'cultivationRate', value: 5, perLevel: 3 }], requiredRealm: 1, learnCost: 120, levelUpCost: 60, maxLevel: 5 },
  { id: 'vital_strike', name: '猛击', grade: TechniqueGrade.MORTAL, type: TechniqueType.ACTIVE, description: '凝聚灵气于拳掌，猛击对手要害。', effects: [{ stat: 'attack', value: 5, perLevel: 3 }], requiredRealm: 1, learnCost: 200, levelUpCost: 100, maxLevel: 3, skill: { name: '猛击', description: '对单体目标造成150%伤害', cooldown: 3, damageMultiplier: 1.5, cost: { mp: 5 }, range: 1 } },
  // SPIRIT grade
  { id: 'spirit_shield', name: '灵气护盾', grade: TechniqueGrade.SPIRIT, type: TechniqueType.ACTIVE, description: '凝聚灵气形成护盾，抵御伤害。', effects: [{ stat: 'defense', value: 10, perLevel: 5 }], requiredRealm: 2, learnCost: 500, levelUpCost: 200, maxLevel: 5, skill: { name: '灵气护盾', description: '生成护盾抵消200%防御值的伤害', cooldown: 5, damageMultiplier: 2.0, cost: { mp: 20 }, range: 0 } },
  { id: 'swift_wind', name: '御风术', grade: TechniqueGrade.SPIRIT, type: TechniqueType.PASSIVE, description: '身轻如燕，提高闪避与移动。', effects: [{ stat: 'defense', value: 5, perLevel: 3 }], requiredRealm: 2, learnCost: 400, levelUpCost: 150, maxLevel: 5 },
  { id: 'flame_slash', name: '炎斩', grade: TechniqueGrade.SPIRIT, type: TechniqueType.ACTIVE, description: '将火焰灵气附着兵器，发出灼热一击。', effects: [{ stat: 'attack', value: 15, perLevel: 8 }], requiredRealm: 2, learnCost: 600, levelUpCost: 250, maxLevel: 5, skill: { name: '炎斩', description: '对单体目标造成200%火属性伤害', cooldown: 4, damageMultiplier: 2.0, cost: { mp: 15 }, range: 1 } },
  { id: 'meditation', name: '静心诀', grade: TechniqueGrade.SPIRIT, type: TechniqueType.PASSIVE, description: '静心凝神，加快经验获取。', effects: [{ stat: 'expRate', value: 5, perLevel: 3 }], requiredRealm: 2, learnCost: 350, levelUpCost: 150, maxLevel: 5 },
  // EARTH grade
  { id: 'earth_shaker', name: '地裂斩', grade: TechniqueGrade.EARTH, type: TechniqueType.ACTIVE, description: '引动地脉之力，震裂前方大地。', effects: [{ stat: 'attack', value: 30, perLevel: 15 }], requiredRealm: 3, learnCost: 1500, levelUpCost: 500, maxLevel: 5, skill: { name: '地裂斩', description: '对前方范围造成250%土属性伤害', cooldown: 6, damageMultiplier: 2.5, cost: { mp: 30 }, range: 2, aoe: 1 } },
  { id: 'iron_body', name: '铁骨功', grade: TechniqueGrade.EARTH, type: TechniqueType.PASSIVE, description: '淬炼筋骨，大幅提升防御。', effects: [{ stat: 'defense', value: 20, perLevel: 10 }], requiredRealm: 3, learnCost: 1200, levelUpCost: 400, maxLevel: 5 },
  { id: 'soul_fire', name: '魂火术', grade: TechniqueGrade.EARTH, type: TechniqueType.ACTIVE, description: '以灵魂之力引燃灵火，灼烧敌人。', effects: [{ stat: 'attack', value: 25, perLevel: 12 }], requiredRealm: 3, learnCost: 1800, levelUpCost: 600, maxLevel: 5, skill: { name: '魂火术', description: '对单体造成300%灵魂伤害，附带灼烧', cooldown: 5, damageMultiplier: 3.0, cost: { mp: 35 }, range: 2 } },
  { id: 'flowing_water', name: '流水诀', grade: TechniqueGrade.EARTH, type: TechniqueType.PASSIVE, description: '如流水般连绵不绝，提高灵力回复。', effects: [{ stat: 'mp', value: 20, perLevel: 10 }], requiredRealm: 3, learnCost: 1000, levelUpCost: 350, maxLevel: 5 },
  // HEAVEN grade
  { id: 'heavenly_blade', name: '天刀', grade: TechniqueGrade.HEAVEN, type: TechniqueType.ACTIVE, description: '引九天之刀，斩灭一切。', effects: [{ stat: 'attack', value: 50, perLevel: 25 }], requiredRealm: 5, learnCost: 5000, levelUpCost: 1500, maxLevel: 5, skill: { name: '天刀', description: '对单体造成400%金属性伤害，无视30%防御', cooldown: 8, damageMultiplier: 4.0, cost: { mp: 60 }, range: 3 } },
  { id: 'phoenix_rebirth', name: '凤涅诀', grade: TechniqueGrade.HEAVEN, type: TechniqueType.PASSIVE, description: '参悟凤凰涅槃之理，大幅提升生命力。', effects: [{ stat: 'hp', value: 100, perLevel: 50 }], requiredRealm: 5, learnCost: 4000, levelUpCost: 1200, maxLevel: 5 },
  { id: 'void_step', name: '虚空步', grade: TechniqueGrade.HEAVEN, type: TechniqueType.ACTIVE, description: '踏破虚空，瞬息千里。', effects: [{ stat: 'defense', value: 40, perLevel: 20 }], requiredRealm: 5, learnCost: 4500, levelUpCost: 1300, maxLevel: 3, skill: { name: '虚空步', description: '瞬移至目标位置，闪避下回合攻击', cooldown: 10, damageMultiplier: 0, cost: { mp: 40 }, range: 5 } },
  // IMMORTAL grade
  { id: 'immortal_palm', name: '混元掌', grade: TechniqueGrade.IMMORTAL, type: TechniqueType.ACTIVE, description: '混元一体，掌破乾坤。', effects: [{ stat: 'attack', value: 100, perLevel: 50 }], requiredRealm: 7, learnCost: 20000, levelUpCost: 5000, maxLevel: 5, skill: { name: '混元掌', description: '对范围目标造成500%无属性伤害', cooldown: 12, damageMultiplier: 5.0, cost: { mp: 100 }, range: 3, aoe: 2 } },
  { id: 'eternal_life', name: '长生诀', grade: TechniqueGrade.IMMORTAL, type: TechniqueType.PASSIVE, description: '参悟长生大道，生命与灵力无穷。', effects: [{ stat: 'hp', value: 500, perLevel: 250 }, { stat: 'mp', value: 200, perLevel: 100 }], requiredRealm: 7, learnCost: 30000, levelUpCost: 8000, maxLevel: 3 },
  { id: 'chaos_orb', name: '混沌元珠', grade: TechniqueGrade.IMMORTAL, type: TechniqueType.ACTIVE, description: '凝聚混沌元珠，爆裂毁灭一切。', effects: [{ stat: 'attack', value: 150, perLevel: 75 }], requiredRealm: 8, learnCost: 50000, levelUpCost: 12000, maxLevel: 3, skill: { name: '混沌爆裂', description: '对大范围目标造成800%混沌伤害', cooldown: 15, damageMultiplier: 8.0, cost: { mp: 200 }, range: 4, aoe: 3 } },
];

// === Phase 3: Equipment helper ===

/** Compute affix value based on stat type, base item value, and rarity */
function computeAffixValue(stat: string, baseValue: number, rarity: EquipmentRarity): number {
  const rarityScale = rarity === EquipmentRarity.MORTAL ? 1 : rarity === EquipmentRarity.SPIRIT ? 1.5 : rarity === EquipmentRarity.IMMORTAL ? 2.5 : 4.0;
  switch (stat) {
    case 'attack': return Math.max(1, Math.floor(baseValue * 0.3 * rarityScale));
    case 'defense': return Math.max(1, Math.floor(baseValue * 0.3 * rarityScale));
    case 'hp': return Math.max(5, Math.floor(baseValue * 1.5 * rarityScale));
    case 'mp': return Math.max(3, Math.floor(baseValue * 0.8 * rarityScale));
    case 'critRate': return Math.floor(5 * rarityScale); // 5-20%
    case 'critDamage': return Math.floor(20 * rarityScale); // 20-80%
    case 'expRate': return Math.floor(5 * rarityScale); // 5-20%
    case 'lifesteal': return Math.floor(3 * rarityScale); // 3-12%
    default: return 1;
  }
}

function getAffixLabel(stat: string, value: number): string {
  const labels: Record<string, string> = {
    attack: '攻击', defense: '防御', hp: '生命', mp: '灵力',
    critRate: '暴击率', critDamage: '暴击伤害', expRate: '经验加成', lifesteal: '吸血',
  };
  const suffix = stat === 'critRate' || stat === 'expRate' || stat === 'lifesteal' ? '%' : '';
  return `${labels[stat] || stat}+${value}${suffix}`;
}

export function generateEquipment(id: string, slot: EquipmentSlot, rarity: EquipmentRarity, realm: CultivationRealm): Equipment {
  const mult = slot === EquipmentSlot.WEAPON ? 1.5 : slot === EquipmentSlot.ARMOR ? 1.2 : 1.0;
  const rarityMult = rarity === EquipmentRarity.MORTAL ? 1 : rarity === EquipmentRarity.SPIRIT ? 1.5 : rarity === EquipmentRarity.IMMORTAL ? 2.5 : 4.0;
  const baseValue = Math.floor(10 * realm * mult * rarityMult);

  const slotNames: Record<EquipmentSlot, string> = {
    [EquipmentSlot.WEAPON]: '武器',
    [EquipmentSlot.ARMOR]: '护甲',
    [EquipmentSlot.ARTIFACT]: '法宝',
    [EquipmentSlot.ACCESSORY]: '饰品',
    [EquipmentSlot.PILL]: '丹药',
  };

  const rarityNames: Record<EquipmentRarity, string> = {
    [EquipmentRarity.MORTAL]: '凡品',
    [EquipmentRarity.SPIRIT]: '灵品',
    [EquipmentRarity.IMMORTAL]: '仙品',
    [EquipmentRarity.DIVINE]: '神品',
  };

  const baseStats: Partial<Record<'attack' | 'defense' | 'hp' | 'mp', number>> = {};
  if (slot === EquipmentSlot.WEAPON) baseStats.attack = baseValue;
  else if (slot === EquipmentSlot.ARMOR) baseStats.defense = baseValue;
  else if (slot === EquipmentSlot.ARTIFACT) { baseStats.attack = Math.floor(baseValue * 0.7); baseStats.defense = Math.floor(baseValue * 0.7); }
  else if (slot === EquipmentSlot.ACCESSORY) { baseStats.hp = baseValue * 5; baseStats.mp = baseValue * 3; }

  const affixCount = rarity === EquipmentRarity.MORTAL ? 0
    : rarity === EquipmentRarity.SPIRIT ? (Math.random() < 0.5 ? 1 : 0)
    : rarity === EquipmentRarity.IMMORTAL ? (1 + Math.floor(Math.random() * 2))
    : (2 + Math.floor(Math.random() * 2));

  const allAffixStats: EquipmentAffix['stat'][] = ['attack', 'defense', 'hp', 'mp', 'critRate', 'critDamage', 'expRate', 'lifesteal'];
  const chosen = new Set<string>();
  const affixes: EquipmentAffix[] = [];
  for (let i = 0; i < affixCount; i++) {
    const pool = allAffixStats.filter(a => !chosen.has(a));
    if (pool.length === 0) break;
    const stat = pool[Math.floor(Math.random() * pool.length)];
    chosen.add(stat);
    const value = computeAffixValue(stat, baseValue, rarity);
    affixes.push({ stat, value, label: getAffixLabel(stat, value) });
  }

  return {
    id, slot, rarity, baseStats, affixes,
    name: `${rarityNames[rarity]}${slotNames[slot]}`,
    requiredRealm: realm,
    price: Math.floor(baseValue * 3),
  };
}

export interface LogEntry {
  id: string;
  time: string;
  type: 'system' | 'combat' | 'event' | 'ascension' | 'cycle';
  message: string;
}

export interface WorldEvent {
  id: string;
  type: 'trade' | 'duel' | 'alliance' | 'conflict' | 'greet' | 'system';
  npcNameA: string;
  npcNameB: string;
  description: string;
  timestamp: number;
}

export interface ResourcePoint {
  id: string;
  type: '灵田' | '矿脉' | '遗迹';
  amount: number;
  position: { x: number; y: number };
  heavenLevel: HeavenLevel;
  /** Phase 1.4: clan that currently controls this resource point */
  ownerClanId?: string;
}

export interface MarketItem {
  name: string;
  basePrice: number;
  currentPrice: number;
  stock: number;
}

export interface AscensionQuest {
  name: string;
  description: string;
  completed: boolean;
}

export interface GameState {
  servers: { id: string; name: string; playerCount: number; status: '流畅' | '拥挤' | '爆满' }[];
  currentServer: string | null;
  player: Player | null;
  clans: Clan[];
  nearbyNPCs: NPC[];
  wildMonsters: WildMonster[];
  resourcePoints: ResourcePoint[];
  logs: LogEntry[];
  worldEvents: WorldEvent[];
  market: Record<string, MarketItem>;
  ascensionQuests: AscensionQuest[];
  playerFactionId: string | null;
  /** Phase 1.4: tick counter for faction AI decisions */
  _factionTickCount: number;
  /** Phase 2.2: explored tiles for fog of war ("x,y" strings) */
  exploredTiles: string[];
  /** Phase 4: current squad formation */
  currentFormation: FormationType;
  /** Phase 4: clan armies for NPC group combat */
  clanArmies: ClanArmy[];
  /** Phase 4: war statistics */
  warStats: WarStats;
  /** Phase 1.4a: per-faction LLM decision cooldown timestamps */
  _factionLLMCooldowns: Record<string, number>;
  /** Phase 1.4a: faction IDs currently awaiting LLM response */
  _factionLLMQueue: string[];
  /** Phase 1.4a: enqueue timestamps for stale entry cleanup */
  _factionLLMEnqueueTime: Record<string, number>;
  /** Phase 1.4a: cached LLM decisions for factions */
  _factionLLMResults: Record<string, { targetClanId: string; action: 'war' | 'alliance' | 'truce' | 'none'; reason: string } | null>;

  joinServer: (serverId: string, playerName: string) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'time'>) => void;
  addWorldEvent: (event: Omit<WorldEvent, 'id'>) => void;
  movePlayer: (dx: number, dy: number) => void;
  interactWithNPC: (npcId: string, action: '交谈' | '交易' | '攻击') => void;
  interactWithResource: (resourceId: string) => void;
  useItem: (itemName: string) => void;
  cultivate: () => void;
  modifyTalent: (effect: Partial<TalentAttributes>) => void;
  updateNPCs: () => void;
  addReputation: (amount: number, source: string) => void;
  buyItem: (itemName: string, amount: number) => void;
  sellItem: (itemName: string, amount: number) => void;
  updateMarketPrices: () => void;
  attemptAscension: () => void;
  performCycleRebirth: (type: CycleType) => void;
  checkCycleCooldown: () => boolean;
  getAscensionQuests: () => AscensionQuest[];
  completeAscensionQuest: (questName: string) => void;
  markNpcMet: (npcId: string) => void;
  metNpcs: string[];
  setNpcMemory: (npcId: string, state: string) => void;
  npcMemory: Record<string, string>;
  squadMembers: SquadMember[];
  recruitToSquad: (npcId: string) => void;
  dismissFromSquad: (squadMemberId: string) => void;
  assignSquadRole: (squadMemberId: string, role: SquadRole) => void;
  equipMember: (squadMemberId: string, itemName: string) => void;
  unequipMember: (squadMemberId: string, itemName: string) => void;
  getMaxSquadSize: () => number;
  getRecruitCost: (npc: NPC) => { reputationRequired: number; spiritStoneCost: number; canRecruit: boolean; reason: string };

  // 势力系统
  createFaction: (name: string) => boolean;
  upgradeBuilding: (buildingType: BuildingType) => void;
  appointOfficer: (squadMemberId: string, position: FactionPosition) => void;
  collectTax: () => number;
  getFactionUpgradeCost: () => { reputation: number; stones: number };

  // 外交/战争系统
  setDiplomacy: (clanId: string, targetId: string, diplomacy: ClanDiplomacy) => void;
  removeDiplomacy: (clanId: string, targetId: string) => void;
  declareWar: (clanId: string) => void;
  proposeAlliance: (clanId: string) => void;
  proposeTruce: (clanId: string) => void;
  surrenderTo: (clanId: string) => void;
  breakAlliance: (clanId: string) => void;
  getDiplomaticRelations: () => (Clan & { diplomacyStatus: DiplomaticStatus; conflictLevel: ConflictLevel })[];
  getDiplomaticStatus: (clanId: string) => DiplomaticStatus;

  // Save / Load
  saveToSlot: (slot: number) => void;
  loadFromSlot: (slot: number) => boolean;
  getSaveSlots: () => SaveSlotInfo[];
  deleteSaveSlot: (slot: number) => void;

  // Phase 3: Techniques & Equipment
  learnTechnique: (techniqueId: string) => void;
  cultivateTechnique: (techniqueId: string) => void;
  equipItem: (item: Equipment) => void;
  unequipItem: (slot: EquipmentSlot) => void;
  getTechniqueEffects: () => TechniqueEffect[];

  // Phase 1.1d: Server NPC state sync
  mergeServerNPCs: (serverNpcs: NPC[]) => void;

  // Phase 3.3: Inventory management
  addItem: (itemName: string) => void;
  removeItem: (itemName: string) => void;

  // Phase 3.3d: Forge (equipment crafting)
  forgeCraft: (recipeId: string) => { success: boolean; product?: string; message: string };

  // Phase 1.4a: Faction AI with LLM
  enqueueFactionAI: (factionId: string) => void;
  resolveFactionAI: (factionId: string, decision: { targetClanId: string; action: 'war' | 'alliance' | 'truce' | 'none'; reason: string } | null) => void;
  clearFactionAIResult: (factionId: string) => void;
  clearStaleFactionAI: (factionId: string) => void;

  // Phase 4: Formation & Combat
  setFormation: (formation: FormationType) => void;
  setSquadCombatStance: (stance: SquadCombatStance) => void;

  // Phase 4.2b: Siege equipment
  buildSiegeEquipment: (clanId: string) => void;

  // Phase 4.3b: Captive system
  captives: CaptiveNPC[];
  captureNPC: (npc: NPC, realmDiff: number) => void;
  releaseCaptive: (index: number) => void;
  executeCaptive: (index: number) => void;
  recruitCaptive: (index: number) => void;
}

export interface CountryInfo {
  name: string;
  culture: string;
  feature: string;
  buff: string;
  capital: { x: number; y: number };
  heavenLevel: HeavenLevel;
}

export const COUNTRIES_DATA: Record<string, CountryInfo> = {
  '秦': { name: '秦', culture: '法家、重农战', feature: '兵甲修仙', buff: '战斗经验获取+10%', capital: { x: 20, y: 50 }, heavenLevel: 9 },
  '楚': { name: '楚', culture: '巫楚文化', feature: '巫祝修仙', buff: '炼丹成功率+15%', capital: { x: 50, y: 80 }, heavenLevel: 9 },
  '齐': { name: '齐', culture: '稷下学宫', feature: '学术修仙', buff: '功法领悟速度+20%', capital: { x: 80, y: 50 }, heavenLevel: 9 },
  '燕': { name: '燕', culture: '苦寒之地', feature: '苦修之士', buff: '灵气吸收效率+10%', capital: { x: 70, y: 20 }, heavenLevel: 9 },
  '赵': { name: '赵', culture: '胡服骑射', feature: '游侠修仙', buff: '移动速度+5%', capital: { x: 50, y: 30 }, heavenLevel: 9 },
  '魏': { name: '魏', culture: '中原正统', feature: '王道修仙', buff: '灵力上限+10%', capital: { x: 45, y: 50 }, heavenLevel: 9 },
  '韩': { name: '韩', culture: '纵横之术', feature: '奇技修仙', buff: '制作成本-10%', capital: { x: 40, y: 60 }, heavenLevel: 9 },
};

export const IMMORTAL_DOMAINS_DATA: Record<string, { name: string; culture: string; feature: string; buff: string; heavenLevel: HeavenLevel }> = {
  '太虚仙域': { name: '太虚仙域', culture: '太虚道统', feature: '道法自然', buff: '全属性+15%', heavenLevel: 5 },
  '大罗仙域': { name: '大罗仙域', culture: '大罗道统', feature: '万法归一', buff: '修炼速度+25%', heavenLevel: 3 },
};

export const COUNTRIES = Object.keys(COUNTRIES_DATA);
export const SURNAMES = ['赢', '芈', '姜', '姬', '赵', '魏', '韩', '李', '王', '白', '蒙', '项', '田', '林'];

/** Country colors for territory map overlay */
export const COUNTRY_COLORS: Record<string, string> = {
  '秦': '#e11d48', // rose/red
  '楚': '#a855f7', // purple
  '齐': '#3b82f6', // blue
  '燕': '#06b6d4', // cyan
  '赵': '#f97316', // orange
  '魏': '#22c55e', // green
  '韩': '#eab308', // yellow
};

export function generateClans(heavenLevel: HeavenLevel): Clan[] {
  const clans: Clan[] = [];
  const familyCount = HEAVEN_INFO[heavenLevel].familyCount;
  const countries = heavenLevel <= 2 ? Object.keys(IMMORTAL_DOMAINS_DATA) : COUNTRIES;

  countries.forEach(country => {
    clans.push({
      id: `${heavenLevel}-${country}-皇族`,
      name: `${country}国王室`,
      country,
      type: '皇族',
      reputation: 50,
      treasury: 100000 * HEAVEN_INFO[heavenLevel].resourceMultiplier,
      heavenLevel,
      isAscendingFamily: false
    });

    const firstCount = Math.floor(familyCount / 4);
    for (let i = 1; i <= firstCount; i++) {
      clans.push({
        id: `${heavenLevel}-${country}-1级-${i}`,
        name: `${SURNAMES[Math.floor(Math.random() * SURNAMES.length)]}家`,
        country,
        type: '1级',
        reputation: 50,
        treasury: 50000 * HEAVEN_INFO[heavenLevel].resourceMultiplier,
        heavenLevel,
        isAscendingFamily: false
      });
    }

    const secondCount = Math.floor(familyCount / 3);
    for (let i = 1; i <= secondCount; i++) {
      clans.push({
        id: `${heavenLevel}-${country}-2级-${i}`,
        name: `${SURNAMES[Math.floor(Math.random() * SURNAMES.length)]}氏`,
        country,
        type: '2级',
        reputation: 50,
        treasury: 10000 * HEAVEN_INFO[heavenLevel].resourceMultiplier,
        heavenLevel,
        isAscendingFamily: false
      });
    }

    const thirdCount = familyCount - firstCount - secondCount - 1;
    for (let i = 1; i <= thirdCount; i++) {
      clans.push({
        id: `${heavenLevel}-${country}-3级-${i}`,
        name: `${SURNAMES[Math.floor(Math.random() * SURNAMES.length)]}族`,
        country,
        type: '3级',
        reputation: 50,
        treasury: 5000 * HEAVEN_INFO[heavenLevel].resourceMultiplier,
        heavenLevel,
        isAscendingFamily: false
      });
    }
  });
  return clans.map(c => ({
    ...c,
    territory: c.type === '皇族' ? 8 : c.type === '1级' ? 5 : c.type === '2级' ? 3 : 2,
    garrison: Math.max(20, Math.floor(c.reputation * 0.5)),
    fortification: Math.max(10, Math.floor(c.reputation * 0.3)),
  }));
}

export function generateNearbyNPCs(clanId: string, px: number, py: number, country: string = '未知', heavenLevel: HeavenLevel = 9): NPC[] {
  const npcs: NPC[] = [];
  const roles = ['家主', '长老', '核心子弟', '内门子弟', '支脉子弟'] as const;
  const spiritMultiplier = HEAVEN_INFO[heavenLevel].spiritMultiplier;
  
  for (let i = 0; i < 20; i++) {
    const role = roles[Math.floor(Math.random() * roles.length)];
    const basePower = role === '家主' ? 10000 : role === '长老' ? 5000 : 500;
    const power = Math.floor(basePower * spiritMultiplier);
    
    let ambition = Math.floor(Math.random() * 100);
    let caution = Math.floor(Math.random() * 100);
    let loyalty = Math.floor(Math.random() * 100);
    let greed = Math.floor(Math.random() * 100);

    if (country === '秦') { ambition += 20; loyalty += 20; }
    else if (country === '楚') { caution += 20; }
    else if (country === '齐') { caution += 10; ambition += 10; }
    else if (country === '燕') { caution += 20; greed -= 10; }
    else if (country === '赵') { ambition += 10; greed += 10; }
    else if (country === '魏') { loyalty += 20; }
    else if (country === '韩') { greed += 20; caution += 10; }

    ambition = Math.max(0, Math.min(100, ambition));
    caution = Math.max(0, Math.min(100, caution));
    loyalty = Math.max(0, Math.min(100, loyalty));
    greed = Math.max(0, Math.min(100, greed));

    const maxHp = power * 10;
    const maxMp = power * 5;

    let realm: Realm = '凡人';
    if (power >= 10000 * spiritMultiplier) realm = '元婴';
    else if (power >= 5000 * spiritMultiplier) realm = '金丹';
    else if (power >= 1000 * spiritMultiplier) realm = '筑基';
    else if (power >= 500 * spiritMultiplier) realm = '练气';

    npcs.push({
      id: `npc-${Date.now()}-${i}`,
      clanId,
      name: `${SURNAMES[Math.floor(Math.random() * SURNAMES.length)]}某某`,
      role,
      realm,
      power: power + Math.floor(Math.random() * 100),
      hp: maxHp,
      maxHp: maxHp,
      mp: maxMp,
      maxMp: maxMp,
      personality: { ambition, caution, loyalty, greed },
      resources: { spiritStone: Math.floor(Math.random() * 100) + 10 },
      activity: '巡逻中',
      position: { x: px + Math.floor(Math.random() * 10) - 5, y: py + Math.floor(Math.random() * 10) - 5 }
    });
  }
  return npcs;
}

export function generateResourcePoints(px: number, py: number, heavenLevel: HeavenLevel = 9): ResourcePoint[] {
  const points: ResourcePoint[] = [];
  const types: ('灵田' | '矿脉' | '遗迹')[] = ['灵田', '矿脉', '遗迹'];
  const resourceMultiplier = HEAVEN_INFO[heavenLevel].resourceMultiplier;
  
  for (let i = 0; i < 15; i++) {
    points.push({
      id: `res-${Date.now()}-${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      amount: Math.floor((Math.random() * 100 + 50) * resourceMultiplier),
      position: { x: px + Math.floor(Math.random() * 20) - 10, y: py + Math.floor(Math.random() * 20) - 10 },
      heavenLevel
    });
  }
  return points;
}

// 辅助函数：行为树评估
export function evaluateNPCBehavior(npc: NPC, state: GameState): NPC {
  // 执法堂长老特殊逻辑
  if (npc.role === '执法堂长老' && npc.targetPlayerId === state.player?.id) {
    const dx = state.player!.position.x - npc.position.x;
    const dy = state.player!.position.y - npc.position.y;
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
      return npc; // 保持不动，交由外部处理战斗
    }
    return {
      ...npc,
      activity: '追杀中',
      position: {
        x: npc.position.x + (dx > 0 ? 1 : dx < 0 ? -1 : 0),
        y: npc.position.y + (dy > 0 ? 1 : dy < 0 ? -1 : 0)
      }
    };
  }

  // 优先级1：生存应急
  if (npc.hp < npc.maxHp * 0.3) {
    // 极低血量，逃跑/重伤疗伤
    // 远离危险源（假设玩家是危险源）
    let moveX = 0;
    let moveY = 0;
    if (state.player) {
      const dx = npc.position.x - state.player.position.x;
      const dy = npc.position.y - state.player.position.y;
      // 向远离玩家的方向移动
      moveX = dx > 0 ? 1 : dx < 0 ? -1 : (Math.random() > 0.5 ? 1 : -1);
      moveY = dy > 0 ? 1 : dy < 0 ? -1 : (Math.random() > 0.5 ? 1 : -1);
    }
    
    return {
      ...npc,
      activity: '重伤逃遁',
      hp: Math.min(npc.maxHp, npc.hp + npc.maxHp * 0.05), // 缓慢回血
      position: { x: npc.position.x + moveX, y: npc.position.y + moveY }
    };
  }

  // 优先级2, 3, 4的综合概率评估
  // 结合国家特质
  const clan = state.clans.find(c => c.id === npc.clanId);
  const country = clan ? clan.country : '未知';

  // --- 优先级 2：家族职责（包含坊市跑商） ---
  // 家主和长老的专属行为
  if (npc.role === '家主' || npc.role === '长老') {
    const isAmbitious = npc.personality.ambition > 70;
    const isGreedy = npc.personality.greed > 70;

    // 外务长老：坊市跑商（高贪婪、高野心易触发）
    if (isGreedy && Math.random() < 0.1 && !npc.tradeTarget) {
      // 选择一个随机的外国都城作为贸易目标
      const otherCountries = COUNTRIES.filter(c => c !== country);
      if (otherCountries.length > 0) {
        const targetCountry = otherCountries[Math.floor(Math.random() * otherCountries.length)];
        return { ...npc, activity: '坊市跑商', tradeTarget: targetCountry };
      }
    }

    if (npc.activity === '坊市跑商' && npc.tradeTarget) {
      const targetCapital = COUNTRIES_DATA[npc.tradeTarget].capital;
      const distToCapital = Math.abs(npc.position.x - targetCapital.x) + Math.abs(npc.position.y - targetCapital.y);
      
      if (distToCapital <= 1) {
        // 到达目的地，完成交易，返回家族或取消状态
        return { ...npc, activity: '巡逻边界', tradeTarget: undefined, resources: { spiritStone: npc.resources.spiritStone + 500 } };
      } else {
        // 向目的地移动
        const dx = Math.sign(targetCapital.x - npc.position.x);
        const dy = Math.sign(targetCapital.y - npc.position.y);
        return { ...npc, position: { x: npc.position.x + dx, y: npc.position.y + dy } };
      }
    }

    if (isAmbitious && Math.random() < 0.2) {
      return { ...npc, activity: '闭关突破' };
    } else if (npc.personality.loyalty > 60 && Math.random() < 0.3) {
      return { ...npc, activity: '巡逻边界', position: { x: npc.position.x + Math.floor(Math.random() * 3) - 1, y: npc.position.y + Math.floor(Math.random() * 3) - 1 } };
    }
  }

  let weights = {
    patrol: 10,   // 巡逻
    retreat: 10,  // 闭关
    logistics: 10,// 后勤
    explore: 10,  // 探索/采集机缘
    work: 10,     // 打工
    rest: 10,     // 打坐
    trade: 0      // 跑商
  };

  // 根据职位调整权重
  if (npc.role === '家主' || npc.role === '长老') {
    weights.retreat += 30; // 容易闭关
    weights.patrol += 10;
    weights.trade += 30; // 家主/长老会跑商
  } else if (npc.role === '核心子弟' || npc.role === '内门子弟') {
    weights.explore += 20;
    weights.patrol += 10;
  } else if (npc.role === '支脉子弟') {
    weights.work += 20;
    weights.logistics += 20;
  }

  // 根据国家特质调整
  if (country === '秦') { weights.patrol += 20; }
  else if (country === '楚') { weights.logistics += 20; } // 楚国增加炼丹/后勤权重
  else if (country === '齐') { weights.retreat += 20; }
  else if (country === '燕') { weights.rest += 20; }
  else if (country === '赵') { weights.explore += 20; }
  else if (country === '魏') { weights.patrol += 10; weights.retreat += 10; }
  else if (country === '韩') { weights.work += 20; }

  // 根据个人性格调整
  weights.explore += npc.personality.ambition * 0.2;
  weights.work += npc.personality.greed * 0.2;
  weights.retreat += npc.personality.caution * 0.2;
  weights.logistics += npc.personality.loyalty * 0.2;

  // 如果附近有机缘，增加探索权重
  const nearbyResource = state.resourcePoints.find(r => 
    Math.abs(r.position.x - npc.position.x) <= 3 && Math.abs(r.position.y - npc.position.y) <= 3
  );
  if (nearbyResource) {
    weights.explore += 50;
  }

  // 如果灵石少，增加打工权重
  if (npc.resources.spiritStone < 20) {
    weights.work += 30;
  }

  // 轮盘赌选择行为
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  let selectedAction = 'patrol';
  for (const [action, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) {
      selectedAction = action;
      break;
    }
  }

  // 执行选择的行为
  let newPosition = { ...npc.position };
  let newActivity = npc.activity;
  let newResources = { ...npc.resources };
  let newPower = npc.power;

  switch (selectedAction) {
    case 'patrol':
      newActivity = '巡逻边界';
      newPosition.x += Math.floor(Math.random() * 3) - 1;
      newPosition.y += Math.floor(Math.random() * 3) - 1;
      break;
    case 'retreat':
      newActivity = '闭关突破';
      if (Math.random() < 0.1) newPower += 5; // 闭关有几率增加战力
      break;
    case 'logistics':
      newActivity = '后勤炼丹';
      break;
    case 'explore':
      newActivity = '争夺机缘';
      if (nearbyResource) {
        // 向机缘移动
        const dx = nearbyResource.position.x - npc.position.x;
        const dy = nearbyResource.position.y - npc.position.y;
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
          // 采集机缘
          newResources.spiritStone += 10;
        } else {
          newPosition.x += dx > 0 ? 1 : dx < 0 ? -1 : 0;
          newPosition.y += dy > 0 ? 1 : dy < 0 ? -1 : 0;
        }
      } else {
        newPosition.x += Math.floor(Math.random() * 3) - 1;
        newPosition.y += Math.floor(Math.random() * 3) - 1;
      }
      break;
    case 'work':
      newActivity = '坊市打工';
      newResources.spiritStone += 5;
      break;
    case 'rest':
      newActivity = '打坐吐纳';
      break;
    case 'trade':
      newActivity = '坊市跑商';
      // 简单模拟低买高卖：消耗自己部分灵石，获得利润
      if (newResources.spiritStone >= 50) {
        const profit = Math.floor(Math.random() * 50) + 20;
        newResources.spiritStone += profit;
        
        // 更新家族 treasury，需要将这个修改反映到 state 中
        // 由于这里只返回 updatedNPC，我们可以在外部的 map 里更新
      }
      // 跑到某个较远的地方
      newPosition.x += Math.floor(Math.random() * 10) - 5;
      newPosition.y += Math.floor(Math.random() * 10) - 5;
      break;
  }

  return {
    ...npc,
    activity: newActivity,
    position: newPosition,
    resources: newResources,
    power: newPower
  };
}

