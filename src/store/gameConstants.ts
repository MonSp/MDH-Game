import type { SaveSlotInfo } from './saveManager';

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
export type BuildingType = '议事厅' | '练功房' | '丹房' | '藏经阁' | '库房' | '哨塔';
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
};

export const BUILDING_UPGRADE_COST: Record<BuildingType, number[]> = {
  '议事厅': [5000, 20000, 50000],
  '练功房': [3000, 10000, 30000],
  '丹房': [3000, 10000, 30000],
  '藏经阁': [5000, 20000, 50000],
  '库房': [2000, 8000, 20000],
  '哨塔': [2000, 8000, 20000],
};

// Building effect multipliers per level (index 0 = level 1)
export const BUILDING_SPEED_MULTIPLIERS: Partial<Record<BuildingType, number[]>> = {
  '练功房': [1.1, 1.2, 1.3],
  '丹房': [1.1, 1.2, 1.3],
  '藏经阁': [1.05, 1.10, 1.15],
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
}

// 外交/战争类型
export type DiplomaticStatus = '中立' | '同盟' | '战争' | '停战' | '臣服';
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

export interface LogEntry {
  id: string;
  time: string;
  type: 'system' | 'combat' | 'event' | 'ascension' | 'cycle';
  message: string;
}

export interface ResourcePoint {
  id: string;
  type: '灵田' | '矿脉' | '遗迹';
  amount: number;
  position: { x: number; y: number };
  heavenLevel: HeavenLevel;
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
  market: Record<string, MarketItem>;
  ascensionQuests: AscensionQuest[];
  playerFactionId: string | null;

  joinServer: (serverId: string, playerName: string) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'time'>) => void;
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
  return clans;
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

