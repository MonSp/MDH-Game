import { create } from 'zustand';

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

export interface Player {
  id: string;
  name: string;
  heavenLevel: HeavenLevel;
  realm: Realm;
  bodyType: BodyType;
  potential: string;
  country: string;
  clanId: string;
  stats: { hp: number; maxHp: number; mp: number; maxMp: number; attack: number; exp: number; maxExp: number };
  hiddenStats: { killCount: number; cultivateCount: number; gatherCount: number; ascensionCount: number; merit: number };
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

interface GameState {
  servers: { id: string; name: string; playerCount: number; status: '流畅' | '拥挤' | '爆满' }[];
  currentServer: string | null;
  player: Player | null;
  clans: Clan[];
  nearbyNPCs: NPC[];
  resourcePoints: ResourcePoint[];
  logs: LogEntry[];
  market: Record<string, MarketItem>;
  ascensionQuests: AscensionQuest[];
  
  joinServer: (serverId: string, playerName: string) => void;
  addLog: (log: Omit<LogEntry, 'id' | 'time'>) => void;
  movePlayer: (dx: number, dy: number) => void;
  interactWithNPC: (npcId: string, action: '交谈' | '交易' | '攻击') => void;
  interactWithResource: (resourceId: string) => void;
  useItem: (itemName: string) => void;
  cultivate: () => void;
  updateNPCs: () => void;
  buyItem: (itemName: string, amount: number) => void;
  sellItem: (itemName: string, amount: number) => void;
  updateMarketPrices: () => void;
  attemptAscension: () => void;
  performCycleRebirth: (type: CycleType) => void;
  checkCycleCooldown: () => boolean;
  getAscensionQuests: () => AscensionQuest[];
  completeAscensionQuest: (questName: string) => void;
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

function generateClans(heavenLevel: HeavenLevel): Clan[] {
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

function generateNearbyNPCs(clanId: string, px: number, py: number, country: string = '未知', heavenLevel: HeavenLevel = 9): NPC[] {
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

function generateResourcePoints(px: number, py: number, heavenLevel: HeavenLevel = 9): ResourcePoint[] {
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
function evaluateNPCBehavior(npc: NPC, state: GameState): NPC {
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

export const useGameStore = create<GameState>((set, get) => ({
  servers: [
    { id: 's1-9', name: '太古一区(凡界)', playerCount: 100, status: '爆满' },
    { id: 's2-9', name: '洪荒二区(凡界)', playerCount: 89, status: '拥挤' },
    { id: 's3-8', name: '灵界·汇聚地', playerCount: 45, status: '流畅' },
  ],
  currentServer: null,
  player: null,
  clans: [],
  nearbyNPCs: [],
  resourcePoints: [],
  logs: [],
  market: {
    '洗髓丹': { name: '洗髓丹', basePrice: 500, currentPrice: 500, stock: 10 },
    '低级法器': { name: '低级法器', basePrice: 200, currentPrice: 200, stock: 50 },
    '回血丹': { name: '回血丹', basePrice: 50, currentPrice: 50, stock: 100 },
    '聚气散': { name: '聚气散', basePrice: 100, currentPrice: 100, stock: 80 },
    '飞升令': { name: '飞升令', basePrice: 10000, currentPrice: 10000, stock: 5 },
  },
  ascensionQuests: [],

  joinServer: (serverId, playerName) => {
    const heavenLevel: HeavenLevel = 9;
    const clans = generateClans(heavenLevel);
    const randomClan = clans[Math.floor(Math.random() * clans.length)];
    const spiritMultiplier = HEAVEN_INFO[heavenLevel].spiritMultiplier;
    
    const initialPos = { x: 50, y: 50 };
    const player: Player = {
      id: 'p1',
      name: playerName || '无名修士',
      heavenLevel,
      realm: '凡人',
      bodyType: '凡体',
      potential: '无',
      hiddenStats: { killCount: 0, cultivateCount: 0, gatherCount: 0, ascensionCount: 0, merit: 0 },
      country: randomClan.country,
      clanId: randomClan.id,
      stats: { 
        hp: 100, 
        maxHp: 100 * spiritMultiplier, 
        mp: randomClan.country === '魏' ? Math.floor(22 * spiritMultiplier) : Math.floor(20 * spiritMultiplier), 
        maxMp: randomClan.country === '魏' ? Math.floor(22 * spiritMultiplier) : Math.floor(20 * spiritMultiplier), 
        attack: Math.floor(5 * spiritMultiplier), 
        exp: 0, 
        maxExp: REALM_MAX_EXP['凡人'] 
      },
      position: initialPos,
      inventory: { '灵石': 500 },
      cycleInfo: { type: null },
      isAscending: false,
    };

    set({
      currentServer: serverId,
      clans,
      player,
      nearbyNPCs: generateNearbyNPCs(randomClan.id, initialPos.x, initialPos.y, randomClan.country, heavenLevel),
      resourcePoints: generateResourcePoints(initialPos.x, initialPos.y, heavenLevel),
      logs: [
        { id: Date.now().toString(), time: new Date().toLocaleTimeString(), type: 'system', message: `欢迎来到【${HEAVEN_INFO[heavenLevel].name}】，你出生在${randomClan.country}国 ${randomClan.name} 的支脉。` },
        { id: Date.now().toString() + '2', time: new Date().toLocaleTimeString(), type: 'system', message: `【国家特质】${randomClan.country}国属${COUNTRIES_DATA[randomClan.country].culture}，${COUNTRIES_DATA[randomClan.country].feature}。你获得了专属增益：${COUNTRIES_DATA[randomClan.country].buff}！` },
        { id: Date.now().toString() + '3', time: new Date().toLocaleTimeString(), type: 'system', message: `【灵气倍率】当前世界灵气浓度×${spiritMultiplier}，资源丰度×${HEAVEN_INFO[heavenLevel].resourceMultiplier}。` }
      ],
      ascensionQuests: [
        { name: '完成3次天道任务', description: '参与国家战争、守护家族、探索遗迹', completed: false },
        { name: '达到当前世界最高境界', description: `达到${HEAVEN_MAX_REALM[heavenLevel]}境界`, completed: false },
        { name: '积累足够功德', description: '完成善举，提升功德值', completed: false },
      ]
    });
  },

  addLog: (log) => set(state => ({
    logs: [...state.logs, { ...log, id: Date.now().toString() + Math.random(), time: new Date().toLocaleTimeString() }].slice(-50)
  })),

  movePlayer: (dx, dy) => set(state => {
    if (!state.player) return state;
    
    // 赵国特质：移动速度/距离影响 (这里简单处理为偶尔能移动更远)
    let moveMultiplier = 1;
    if (state.player.country === '赵' && Math.random() < 0.2) {
      moveMultiplier = 2; // 有20%几率触发“游侠身法”，移动2格
    }
    
    return {
      player: {
        ...state.player,
        position: { x: state.player.position.x + dx * moveMultiplier, y: state.player.position.y + dy * moveMultiplier }
      }
    };
  }),

  interactWithNPC: (npcId, action) => {
    const state = get();
    const npc = state.nearbyNPCs.find(n => n.id === npcId);
    if (!npc || !state.player) return;

    if (action === '攻击') {
      state.addLog({ type: 'combat', message: `你向 ${npc.name}(${npc.role}) 发起了攻击！` });
      
      // 秦国战力加成或简单对比
      const playerAttack = state.player.country === '秦' ? state.player.stats.attack * 1.1 : state.player.stats.attack;
      const winChance = playerAttack / (playerAttack + (npc.power / 10));
      const win = Math.random() < Math.max(0.1, Math.min(0.9, winChance));
      
      if (win) {
        // 战斗经验加成
        const expGain = state.player.country === '秦' ? Math.floor(50 * 1.1) : 50;
        
        let dropStones = npc.resources.spiritStone;
        let isMerchant = npc.activity === '坊市跑商';
        if (isMerchant) {
          dropStones += Math.floor(Math.random() * 200) + 100; // 大幅增加掉落
        }
        
        let dropMessage = `你击败了 ${npc.name}，夺取了 ${dropStones} 块灵石！获得 ${expGain} 点修为。`;
        let droppedItem = '';
        if (Math.random() < 0.2) {
          droppedItem = '洗髓丹';
          dropMessage += ` 并在其储物袋中发现了一枚【洗髓丹】！`;
        }

        set(s => {
          let updatedInventory = { ...s.player!.inventory };
          if (droppedItem) {
            updatedInventory[droppedItem] = (updatedInventory[droppedItem] || 0) + 1;
          }
          updatedInventory['灵石'] = (updatedInventory['灵石'] || 0) + dropStones;

          let newPlayer = { 
            ...s.player!, 
            stats: { ...s.player!.stats, exp: s.player!.stats.exp + expGain },
            hiddenStats: { ...s.player!.hiddenStats, killCount: s.player!.hiddenStats.killCount + 1 },
            inventory: updatedInventory
          };

          // @ts-ignore
          if (typeof checkPotentialAwakening === 'function') {
            // @ts-ignore
            newPlayer = checkPotentialAwakening(newPlayer, (msg: string) => state.addLog({ type: 'event', message: msg }));
          }

          state.addLog({ type: 'event', message: dropMessage });

          let updatedClans = [...s.clans];
          let updatedNearbyNPCs = s.nearbyNPCs.filter(n => n.id !== npcId);
          let spawnedEnforcer = false;

          updatedClans = updatedClans.map(c => {
            if (c.id === npc.clanId) {
              const repLoss = isMerchant ? 20 : 10;
              const newReputation = c.reputation - repLoss;
              // 当声望首次低于0，或每低10点时，概率生成执法堂长老
              if (newReputation < 0 && Math.random() > 0.3) {
                spawnedEnforcer = true;
                const enforcerPower = s.player!.stats.attack * 3;
                const enforcer: NPC = {
                  id: `enforcer-${Date.now()}`,
                  clanId: c.id,
                  name: `${c.name.charAt(0)}执法长老`,
                  role: '执法堂长老',
                  realm: '化神', // 执法长老统一化神境界
                  power: enforcerPower, // 强于玩家
                  hp: enforcerPower * 10,
                  maxHp: enforcerPower * 10,
                  mp: enforcerPower * 5,
                  maxMp: enforcerPower * 5,
                  personality: { ambition: 50, caution: 50, loyalty: 100, greed: 10 },
                  resources: { spiritStone: 500 },
                  activity: '追杀中',
                  position: { 
                    x: s.player!.position.x + (Math.random() > 0.5 ? 10 : -10), 
                    y: s.player!.position.y + (Math.random() > 0.5 ? 10 : -10) 
                  },
                  targetPlayerId: s.player!.id
                };
                updatedNearbyNPCs.push(enforcer);
              }
              return { ...c, reputation: newReputation };
            }
            return c;
          });

          return {
            clans: updatedClans,
            nearbyNPCs: updatedNearbyNPCs,
            player: newPlayer
          };
        });
        
        const clan = get().clans.find(c => c.id === npc.clanId);
        if (clan && clan.reputation < 0) {
          get().addLog({ type: 'system', message: `警告！${clan.name} 对你的仇恨已达冰点，已派出执法堂长老前来围剿！` });
        } else if (clan && clan.reputation < 20) {
          get().addLog({ type: 'system', message: `警告！${clan.name} 对你的仇恨极高！` });
        }
      } else {
        get().addLog({ type: 'combat', message: `你不敌 ${npc.name}，重伤逃遁，损失部分修为。` });
        set(s => ({
          player: s.player ? { ...s.player, stats: { ...s.player.stats, hp: Math.max(1, s.player.stats.hp - 30) } } : s.player
        }));
      }
    } else if (action === '交谈') {
      get().addLog({ type: 'event', message: `${npc.name} 看了你一眼：“支脉子弟，也要努力修炼才是。”` });
    } else if (action === '交易') {
      get().addLog({ type: 'event', message: `你与 ${npc.name} 进行了交易，换取了一些低级丹药。` });
    }
  },

  interactWithResource: (resourceId) => {
    const state = get();
    if (!state.player) return;
    
    const resourceIndex = state.resourcePoints.findIndex(r => r.id === resourceId);
    if (resourceIndex === -1) return;
    
    const resource = state.resourcePoints[resourceIndex];
    const dx = Math.abs(resource.position.x - state.player.position.x);
    const dy = Math.abs(resource.position.y - state.player.position.y);
    
    if (dx > 1 || dy > 1) {
      state.addLog({ type: 'system', message: `距离太远，无法采集【${resource.type}】。` });
      return;
    }

    let expGain = 0;
    let logMsg = '';
    
    if (resource.type === '灵田') {
      expGain = 30;
      logMsg = `你在灵田采摘了仙草，获得了 ${expGain} 点修为。`;
    } else if (resource.type === '矿脉') {
      logMsg = `你在矿脉开采了 50 块灵石。`;
      set(s => {
        if (!s.player) return s;
        const newInventory = { ...s.player.inventory };
        newInventory['灵石'] = (newInventory['灵石'] || 0) + 50;
        return { player: { ...s.player, inventory: newInventory } };
      });
    } else if (resource.type === '遗迹') {
      logMsg = `你在遗迹中探索，发现了 100 块灵石`;
      const isLucky = Math.random() < 0.3;
      if (isLucky) {
        logMsg += '，以及一枚珍贵的【洗髓丹】！';
      } else {
        logMsg += '。';
      }
      set(s => {
        if (!s.player) return s;
        const newInventory = { ...s.player.inventory };
        newInventory['灵石'] = (newInventory['灵石'] || 0) + 100;
        if (isLucky) {
          newInventory['洗髓丹'] = (newInventory['洗髓丹'] || 0) + 1;
        }
        return { player: { ...s.player, inventory: newInventory } };
      });
    }

    state.addLog({ type: 'event', message: logMsg });
    state.updateMarketPrices();
    
    set(s => {
      if (!s.player) return s;
      const newPoints = [...s.resourcePoints];
      newPoints.splice(resourceIndex, 1);
      
      // 概率在附近生成新的资源点
      if (Math.random() > 0.3) {
        const types: ('灵田' | '矿脉' | '遗迹')[] = ['灵田', '矿脉', '遗迹'];
        newPoints.push({
          id: `res-${Date.now()}`,
          type: types[Math.floor(Math.random() * types.length)],
          amount: Math.floor(Math.random() * 100) + 50,
          position: { 
            x: s.player.position.x + Math.floor(Math.random() * 20) - 10, 
            y: s.player.position.y + Math.floor(Math.random() * 20) - 10 
          },
          heavenLevel: s.player.heavenLevel
        });
      }
      
      return {
        player: {
          ...s.player,
          stats: { ...s.player.stats, exp: s.player.stats.exp + expGain }
        },
        resourcePoints: newPoints
      };
    });
  },

  useItem: (itemName) => {
    const state = get();
    const player = state.player;
    if (!player || !player.inventory[itemName] || player.inventory[itemName] <= 0) return;

    if (itemName === '洗髓丹') {
      if (player.bodyType !== '凡体') {
        state.addLog({ type: 'system', message: '你已非凡体，洗髓丹对你无效。' });
        return;
      }

      set(s => {
        if (!s.player) return s;
        const newInventory = { ...s.player.inventory };
        newInventory[itemName] -= 1;
        
        // 触发突破试炼：扣除当前 80% 血量
        const damage = Math.floor(s.player.stats.maxHp * 0.8);
        const newHp = s.player.stats.hp - damage;
        
        if (newHp <= 0) {
          return {
            player: {
              ...s.player,
              inventory: newInventory,
              stats: { ...s.player.stats, hp: 1 } // 留 1 滴血
            }
          };
        }

        // 根据潜质决定进阶方向
        let newType: BodyType;
        if (s.player.potential === '剑心潜质') newType = '剑体';
        else if (s.player.potential === '雷灵潜质') newType = '雷灵体';
        else if (s.player.potential === '丹道潜质') newType = '药王体';
        else if (s.player.potential === '战意潜质') newType = '战体';
        else {
          // 无潜质则随机
          const advancedTypes: BodyType[] = ['剑体', '雷灵体', '药王体', '战体'];
          newType = advancedTypes[Math.floor(Math.random() * advancedTypes.length)];
        }

        let buffedStats = { ...s.player.stats, hp: newHp };
        // 战体额外加成生命上限
        if (newType === '战体') buffedStats.maxHp = Math.floor(buffedStats.maxHp * 1.3);
        if (newType === '剑体') buffedStats.attack = Math.floor(buffedStats.attack * 1.3);

        return {
          player: {
            ...s.player,
            bodyType: newType,
            stats: buffedStats,
            inventory: newInventory
          }
        };
      });
      
      const newPlayer = get().player!;
      if (newPlayer.stats.hp <= 1) {
        state.addLog({ type: 'system', message: `【突破失败】洗髓药力狂暴，你气血不足，经脉尽断险些身亡！` });
      } else {
        state.addLog({ type: 'event', message: `【突破成功】你强忍洗髓剧痛，破茧成蝶，进阶为【${newPlayer.bodyType}】！` });
      }
    }
  },

  cultivate: () => {
    const state = get();
    if (!state.player) return;
    const { player } = state;
    
    const spiritMultiplier = HEAVEN_INFO[player.heavenLevel].spiritMultiplier;
    let expGain = Math.floor(10 * spiritMultiplier);
    
    if (player.country === '燕') expGain = Math.floor(expGain * 1.1);
    if (player.country === '齐') expGain = Math.floor(expGain * 1.2);
    
    let newExp = player.stats.exp + expGain;
    const maxRealm = HEAVEN_MAX_REALM[player.heavenLevel];
    const realmIndex = ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫'].indexOf(player.realm);
    const maxRealmIndex = ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫'].indexOf(maxRealm);
    
    if (newExp >= player.stats.maxExp) {
      newExp = player.stats.maxExp;
      
      if (realmIndex < maxRealmIndex) {
        const cost = REALM_BREAKTHROUGH_COST[player.realm] || 0;
        const currentStones = player.inventory['灵石'] || 0;
        
        if (currentStones >= cost) {
          const realms: Realm[] = ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫'];
          const nextRealmIdx = realms.indexOf(player.realm) + 1;
          const nextRealm = realms[nextRealmIdx] || player.realm;
          
          if (nextRealm !== player.realm) {
            state.addLog({ type: 'system', message: `消耗了 ${cost} 灵石，天地灵气汇聚！你突破到了【${nextRealm}】境界！` });
            
            if (nextRealm === maxRealm) {
              state.addLog({ type: 'system', message: `你已达到当前世界【${HEAVEN_INFO[player.heavenLevel].name}】最高境界！可以准备飞升上界了！` });
            }
            
            const newInventory = { ...player.inventory };
            newInventory['灵石'] = currentStones - cost;
            
            set({
              player: {
                ...player,
                realm: nextRealm,
                inventory: newInventory,
                stats: {
                  ...player.stats,
                  hp: player.stats.maxHp * 2,
                  maxHp: Math.floor(player.stats.maxHp * 2 * spiritMultiplier),
                  attack: Math.floor(player.stats.attack * 2 * spiritMultiplier),
                  exp: 0,
                  maxExp: REALM_MAX_EXP[nextRealm]
                }
              }
            });
          }
        } else {
          state.addLog({ type: 'system', message: `【突破失败】需要 ${cost} 灵石，当前仅有 ${currentStones} 灵石。修为保留，无法进阶。` });
          set({
            player: {
              ...player,
              stats: { ...player.stats, exp: newExp }
            }
          });
        }
      } else {
        state.addLog({ type: 'ascension', message: `你已达到凡界巅峰【${maxRealm}】！前往皇城飞升台，准备渡九重天劫，飞升上界！` });
      }
    } else {
      set({
        player: {
          ...player,
          stats: { ...player.stats, exp: newExp }
        }
      });
      if (player.hiddenStats.cultivateCount % 10 === 0) {
        state.addLog({ type: 'event', message: `你运功一个大周天，修为提升了${expGain}点。` });
      }
    }
    
    set(s => ({
      player: s.player ? {
        ...s.player,
        hiddenStats: { ...s.player.hiddenStats, cultivateCount: s.player.hiddenStats.cultivateCount + 1 }
      } : s.player
    }));
  },

  buyItem: (itemName: string, amount: number) => {
    const state = get();
    if (!state.player) return;
    const item = state.market[itemName];
    if (!item || item.stock < amount) {
      state.addLog({ type: 'system', message: `坊市中【${itemName}】库存不足。` });
      return;
    }
    const cost = item.currentPrice * amount;
    const currentStones = state.player.inventory['灵石'] || 0;
    
    // 计算关税（假设如果玩家不是魏国，则加收 15% 关税，因为坊市设在魏国中州）
    const taxRate = state.player.country !== '魏' ? 0.15 : 0;
    const finalCost = Math.floor(cost * (1 + taxRate));

    if (currentStones >= finalCost) {
      set(s => {
        const newInventory = { ...s.player!.inventory };
        newInventory['灵石'] -= finalCost;
        newInventory[itemName] = (newInventory[itemName] || 0) + amount;
        
        const newMarket = { ...s.market };
        newMarket[itemName] = { ...newMarket[itemName], stock: newMarket[itemName].stock - amount };
        
        return {
          player: { ...s.player!, inventory: newInventory },
          market: newMarket
        };
      });
      state.addLog({ type: 'system', message: `花费 ${finalCost} 灵石购买了 ${amount} 个【${itemName}】${taxRate > 0 ? '(含15%跨国关税)' : ''}。` });
      if (amount >= 10) state.updateMarketPrices(); // 大规模交易引起价格波动
    } else {
      state.addLog({ type: 'system', message: `灵石不足，需要 ${finalCost} 灵石。` });
    }
  },

  sellItem: (itemName: string, amount: number) => {
    const state = get();
    if (!state.player) return;
    const currentAmount = state.player.inventory[itemName] || 0;
    if (currentAmount < amount) {
      state.addLog({ type: 'system', message: `你没有足够的【${itemName}】。` });
      return;
    }
    const item = state.market[itemName];
    if (!item) return;

    // 出售价格为当前价格的 80%
    const sellPrice = Math.floor(item.currentPrice * 0.8);
    const totalEarned = sellPrice * amount;

    // 出售不收跨国关税，或按需求也可以收，这里暂定出售收税为扣除利润的 15%
    const taxRate = state.player.country !== '魏' ? 0.15 : 0;
    const finalEarned = Math.floor(totalEarned * (1 - taxRate));

    set(s => {
      const newInventory = { ...s.player!.inventory };
      newInventory['灵石'] = (newInventory['灵石'] || 0) + finalEarned;
      newInventory[itemName] -= amount;
      
      const newMarket = { ...s.market };
      newMarket[itemName] = { ...newMarket[itemName], stock: newMarket[itemName].stock + amount };
      
      return {
        player: { ...s.player!, inventory: newInventory },
        market: newMarket
      };
    });
    state.addLog({ type: 'system', message: `出售 ${amount} 个【${itemName}】，获得 ${finalEarned} 灵石${taxRate > 0 ? '(已扣除15%跨国关税)' : ''}。` });
    if (amount >= 10) state.updateMarketPrices();
  },

  updateMarketPrices: () => {
    set(s => {
      const newMarket = { ...s.market };
      for (const key in newMarket) {
        const item = newMarket[key];
        const fluctuation = (Math.random() * 0.1) - 0.05;
        let priceMultiplier = 1 + fluctuation;
        
        if (item.stock < 20) priceMultiplier += 0.05;
        else if (item.stock > 100) priceMultiplier -= 0.05;

        let newPrice = Math.floor(item.currentPrice * priceMultiplier);
        newPrice = Math.max(Math.floor(item.basePrice * 0.5), Math.min(newPrice, item.basePrice * 2));
        newMarket[key] = { ...item, currentPrice: newPrice };
      }
      return { market: newMarket };
    });
  },

  attemptAscension: () => {
    const state = get();
    if (!state.player) return;
    const { player } = state;
    
    const heavenInfo = HEAVEN_INFO[player.heavenLevel];
    if (!heavenInfo.ascensionRequired) {
      state.addLog({ type: 'ascension', message: `你已在【${heavenInfo.name}】，此处已是飞升终点，无需再飞升。` });
      return;
    }
    
    const maxRealm = HEAVEN_MAX_REALM[player.heavenLevel];
    if (player.realm !== maxRealm) {
      state.addLog({ type: 'system', message: `【飞升条件】必须达到当前世界最高境界【${maxRealm}】才能飞升。` });
      return;
    }
    
    const flypanCost = 100000;
    const flypanStone = player.inventory['飞升令'] || 0;
    if (flypanStone < 1) {
      state.addLog({ type: 'system', message: `【飞升条件】需要【飞升令】×1 才能引动天劫。当前飞升令：${flypanStone}` });
      return;
    }
    if ((player.inventory['灵石'] || 0) < flypanCost) {
      state.addLog({ type: 'system', message: `【飞升条件】需要灵石×${flypanCost}作为飞升消耗。当前灵石：${player.inventory['灵石'] || 0}` });
      return;
    }
    
    const quests = state.ascensionQuests;
    const incompleteQuests = quests.filter(q => !q.completed);
    if (incompleteQuests.length > 0) {
      state.addLog({ type: 'system', message: `【飞升条件】还需完成 ${incompleteQuests.length} 个天道任务才能飞升。` });
      return;
    }
    
    const nextHeavenLevel = (player.heavenLevel - 1) as HeavenLevel;
    const nextHeavenInfo = HEAVEN_INFO[nextHeavenLevel];
    
    state.addLog({ type: 'ascension', message: `━━━━━━━━━━━━━━━` });
    state.addLog({ type: 'ascension', message: `【飞升开始】你立于飞升台，消耗飞升令×1、灵石×${flypanCost}，引动九重天劫！` });
    state.addLog({ type: 'ascension', message: `天劫降临，雷光万丈...` });
    
    const success = Math.random() > 0.1;
    
    if (success) {
      const newInventory = { ...player.inventory };
      newInventory['飞升令'] = (newInventory['飞升令'] || 1) - 1;
      newInventory['灵石'] = (newInventory['灵石'] || flypanCost) - flypanCost;
      
      const ascendingFamily = state.clans.find(c => c.id === player.clanId && c.type !== '皇族');
      const newClans = state.clans.map(c => {
        if (c.id === player.clanId && ascendingFamily && nextHeavenLevel >= 8) {
          return { ...c, isAscendingFamily: true };
        }
        return c;
      });
      
      const nextCountries = nextHeavenLevel <= 2 ? Object.keys(IMMORTAL_DOMAINS_DATA) : COUNTRIES;
      const newCountry = nextCountries[Math.floor(Math.random() * nextCountries.length)];
      const clansInNewHeaven = newClans.filter(c => c.heavenLevel === nextHeavenLevel);
      const randomClan = clansInNewHeaven[Math.floor(Math.random() * clansInNewHeaven.length)] || clansInNewHeaven[0];
      
      const newHeavenClans = generateClans(nextHeavenLevel);
      const newRandomClan = newHeavenClans[Math.floor(Math.random() * newHeavenClans.length)];
      
      set({
        clans: [...newClans, ...newHeavenClans.filter(c => !newClans.some(existing => existing.id === c.id))],
        player: {
          ...player,
          heavenLevel: nextHeavenLevel,
          country: newRandomClan.country,
          clanId: newRandomClan.id,
          inventory: newInventory,
          hiddenStats: {
            ...player.hiddenStats,
            ascensionCount: player.hiddenStats.ascensionCount + 1
          },
          stats: {
            hp: Math.floor(player.stats.maxHp * 0.5),
            maxHp: Math.floor(player.stats.maxHp * 0.5),
            mp: Math.floor(player.stats.maxMp * 0.5),
            maxMp: Math.floor(player.stats.maxMp * 0.5),
            attack: Math.floor(player.stats.attack * 0.5),
            exp: 0,
            maxExp: REALM_MAX_EXP['凡人']
          },
          realm: '化神',
          isAscending: false
        },
        resourcePoints: generateResourcePoints(player.position.x, player.position.y, nextHeavenLevel),
        nearbyNPCs: generateNearbyNPCs(newRandomClan.id, player.position.x, player.position.y, newRandomClan.country, nextHeavenLevel),
        logs: [
          ...state.logs,
          { id: Date.now().toString() + 'a1', time: new Date().toLocaleTimeString(), type: 'ascension', message: `【飞升成功】你渡过九重天劫，肉身重塑，魂魄升华！` },
          { id: Date.now().toString() + 'a2', time: new Date().toLocaleTimeString(), type: 'ascension', message: `你来到了【${nextHeavenInfo.name}】！` },
          { id: Date.now().toString() + 'a3', time: new Date().toLocaleTimeString(), type: 'ascension', message: `灵气倍率×${nextHeavenInfo.spiritMultiplier}，资源丰度×${nextHeavenInfo.resourceMultiplier}！` },
          { id: Date.now().toString() + 'a4', time: new Date().toLocaleTimeString(), type: 'ascension', message: `欢迎来到${newRandomClan.country}国${newRandomClan.name}！` }
        ]
      });
      
      state.addLog({ type: 'ascension', message: `【飞升成功】你渡过九重天劫，来到【${nextHeavenInfo.name}】！` });
    } else {
      state.addLog({ type: 'ascension', message: `【飞升失败】天劫过于强大，你重伤逃遁，损耗30%修为！` });
      set({
        player: {
          ...player,
          stats: {
            ...player.stats,
            hp: Math.floor(player.stats.hp * 0.3),
            exp: Math.floor(player.stats.exp * 0.7)
          }
        }
      });
    }
    state.addLog({ type: 'ascension', message: `━━━━━━━━━━━━━━━` });
  },

  performCycleRebirth: (type: CycleType) => {
    const state = get();
    if (!state.player) return;
    const { player } = state;
    
    if (player.heavenLevel < 6) {
      state.addLog({ type: 'cycle', message: `【轮回转生】只有第6层及以上的高手才能进行轮回转生。` });
      return;
    }
    
    if (state.player.cycleInfo.cooldownEndTime && Date.now() < state.player.cycleInfo.cooldownEndTime) {
      const remaining = Math.ceil((state.player.cycleInfo.cooldownEndTime! - Date.now()) / 1000);
      state.addLog({ type: 'cycle', message: `【轮回转生】转生冷却中，还需 ${remaining} 秒。` });
      return;
    }
    
    if (type === '神念投影') {
      state.addLog({ type: 'cycle', message: `【神念投影】你在凡界创建了一个临时分身，存在2小时。` });
    } else if (type === '真灵转世') {
      state.addLog({ type: 'cycle', message: `【真灵转世】你放弃当前修为，转世于凡界，保留部分记忆与天赋！` });
      
      set({
        player: {
          ...player,
          heavenLevel: 9,
          realm: '凡人',
          country: player.cycleInfo.previousCountry || COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
          clanId: player.cycleInfo.previousClanId || 'unknown',
          bodyType: player.bodyType,
          stats: {
            hp: 100,
            maxHp: 100,
            mp: 20,
            maxMp: 20,
            attack: 5,
            exp: 0,
            maxExp: REALM_MAX_EXP['凡人']
          },
          hiddenStats: {
            killCount: 0,
            cultivateCount: 0,
            gatherCount: 0,
            ascensionCount: 0,
            merit: 0
          },
          inventory: { '灵石': 100, '转世灵童印记': 1 },
          cycleInfo: {
            type: '真灵转世',
            cooldownEndTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
            previousHeavenLevel: player.heavenLevel,
            previousClanId: player.clanId,
            previousCountry: player.country,
          },
          isAscending: false
        },
        clans: generateClans(9),
        resourcePoints: generateResourcePoints(50, 50, 9),
        nearbyNPCs: generateNearbyNPCs('9-秦-1级-1', 50, 50, '秦', 9)
      });
      
      state.addLog({ type: 'cycle', message: `你以【转世灵童】之身重生于凡界，保留了前世的部分记忆与体质！` });
    } else if (type === '道统传承') {
      state.addLog({ type: 'cycle', message: `【道统传承】你在原家族留下了传承石碑，后人可参悟获得功法！` });
      
      const clan = state.clans.find(c => c.id === player.clanId);
      if (clan) {
        set({
          clans: state.clans.map(c => 
            c.id === player.clanId 
              ? { ...c, treasury: c.treasury + Math.floor(player.inventory['灵石'] || 0) * 0.5 } 
              : c
          )
        });
      }
    }
  },

  checkCycleCooldown: () => {
    const state = get();
    if (!state.player) return false;
    if (state.player.cycleInfo.cooldownEndTime) {
      return Date.now() >= state.player.cycleInfo.cooldownEndTime;
    }
    return true;
  },

  getAscensionQuests: () => {
    return get().ascensionQuests;
  },

  completeAscensionQuest: (questName: string) => {
    set(state => ({
      ascensionQuests: state.ascensionQuests.map(q => 
        q.name === questName ? { ...q, completed: true } : q
      )
    }));
  },

  updateNPCs: () => {
    const state = get();
    if (!state.player) return;
    
    let playerHit = false;
    let clanTreasuryUpdates: Record<string, number> = {};

    let npcs = state.nearbyNPCs.map(npc => {
      const updatedNpc = evaluateNPCBehavior(npc, state);
      
      if (updatedNpc.activity === '坊市跑商') {
        const profit = 10; 
        if (updatedNpc.resources.spiritStone >= profit) {
          updatedNpc.resources.spiritStone -= profit;
          clanTreasuryUpdates[updatedNpc.clanId] = (clanTreasuryUpdates[updatedNpc.clanId] || 0) + profit;
        }
      }

      if (updatedNpc.role === '执法堂长老' && updatedNpc.targetPlayerId === state.player!.id) {
        const dx = state.player!.position.x - updatedNpc.position.x;
        const dy = state.player!.position.y - updatedNpc.position.y;
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
          playerHit = true;
        }
      }
      
      return updatedNpc;
    });

    let updatedClans = [...state.clans];
    if (Object.keys(clanTreasuryUpdates).length > 0) {
      updatedClans = updatedClans.map(c => {
        if (clanTreasuryUpdates[c.id]) {
          return { ...c, treasury: c.treasury + clanTreasuryUpdates[c.id] };
        }
        return c;
      });
    }

    set({ nearbyNPCs: npcs, clans: updatedClans });

    if (playerHit) {
      const enforcer = npcs.find(n => n.role === '执法堂长老' && Math.abs(state.player!.position.x - n.position.x) <= 1 && Math.abs(state.player!.position.y - n.position.y) <= 1);
      if (enforcer) {
        get().interactWithNPC(enforcer.id, '攻击');
      }
    }
  }
}));
