import type { CultivationRealm } from '../../shared/types/cultivation';
import type { Equipment, EquipmentAffix, EquipmentSlot, EquipmentRarity } from '../../shared/types/cultivation';
import type { CraftRecipe } from '../../shared/types/items';

// ─── Damage Formula ─────────────────────────────────────────────
// Matches gameConstants.ts:483 exactly

export function calculateDamage(attack: number, defense: number): number {
  if (attack <= 0) return 1;
  return Math.max(1, Math.floor(attack * attack / (attack + defense)));
}

// ─── Monster Data ───────────────────────────────────────────────

export interface MonsterTemplate {
  name: string;
  realm: string;
  hp: number;
  attack: number;
  defense: number;
  expReward: number;
  spiritStoneDrop: number;
}

export const MONSTER_TEMPLATES: Record<string, MonsterTemplate> = {
  '赤焰蛇': { name: '赤焰蛇', realm: '练气', hp: 200, attack: 15, defense: 5, expReward: 30, spiritStoneDrop: 50 },
  '冰晶蝎': { name: '冰晶蝎', realm: '筑基', hp: 800, attack: 40, defense: 15, expReward: 80, spiritStoneDrop: 150 },
  '幽冥狼': { name: '幽冥狼', realm: '金丹', hp: 3000, attack: 120, defense: 40, expReward: 200, spiritStoneDrop: 300 },
  '雷纹虎': { name: '雷纹虎', realm: '元婴', hp: 10000, attack: 400, defense: 120, expReward: 500, spiritStoneDrop: 800 },
  '血玉蛛': { name: '血玉蛛', realm: '化神', hp: 50000, attack: 1500, defense: 400, expReward: 2000, spiritStoneDrop: 3000 },
  '玄冰蟒': { name: '玄冰蟒', realm: '炼虚', hp: 200000, attack: 5000, defense: 1500, expReward: 8000, spiritStoneDrop: 10000 },
  '金翅大鹏': { name: '金翅大鹏', realm: '合体', hp: 800000, attack: 20000, defense: 5000, expReward: 30000, spiritStoneDrop: 50000 },
};

const REALM_ORDER = ['凡人', '练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫'];

export function getMonstersForPlayerRealm(playerRealm: string): MonsterTemplate[] {
  const idx = REALM_ORDER.indexOf(playerRealm);
  if (idx <= 0) return [MONSTER_TEMPLATES['赤焰蛇']];
  return Object.values(MONSTER_TEMPLATES).filter(m => {
    const mIdx = REALM_ORDER.indexOf(m.realm);
    return Math.abs(mIdx - idx) <= 1;
  });
}

// ─── Realm Config ───────────────────────────────────────────────

export interface RealmConfig {
  realm: CultivationRealm;
  name: string;
  requiredCultivation: number;
  spiritStoneCost: number;
  healthMultiplier: number;
  spiritMultiplier: number;
  powerMultiplier: number;
}

export const REALM_CONFIGS: Record<number, RealmConfig> = {
  1:  { realm: 1,  name: '凡人', requiredCultivation: 100,    spiritStoneCost: 100,     healthMultiplier: 1,    spiritMultiplier: 1,    powerMultiplier: 1 },
  2:  { realm: 2,  name: '练气', requiredCultivation: 300,    spiritStoneCost: 300,     healthMultiplier: 2,    spiritMultiplier: 2,    powerMultiplier: 2 },
  3:  { realm: 3,  name: '筑基', requiredCultivation: 600,    spiritStoneCost: 600,     healthMultiplier: 4,    spiritMultiplier: 4,    powerMultiplier: 4 },
  4:  { realm: 4,  name: '金丹', requiredCultivation: 1200,   spiritStoneCost: 1200,    healthMultiplier: 8,    spiritMultiplier: 8,    powerMultiplier: 8 },
  5:  { realm: 5,  name: '元婴', requiredCultivation: 2400,   spiritStoneCost: 2400,    healthMultiplier: 16,   spiritMultiplier: 16,   powerMultiplier: 16 },
  6:  { realm: 6,  name: '化神', requiredCultivation: 4800,   spiritStoneCost: 4800,    healthMultiplier: 32,   spiritMultiplier: 32,   powerMultiplier: 32 },
  7:  { realm: 7,  name: '炼虚', requiredCultivation: 9600,   spiritStoneCost: 9600,    healthMultiplier: 64,   spiritMultiplier: 64,   powerMultiplier: 64 },
  8:  { realm: 8,  name: '合体', requiredCultivation: 19200,  spiritStoneCost: 19200,   healthMultiplier: 128,  spiritMultiplier: 128,  powerMultiplier: 128 },
  9:  { realm: 9,  name: '大乘', requiredCultivation: 38400,  spiritStoneCost: 38400,   healthMultiplier: 256,  spiritMultiplier: 256,  powerMultiplier: 256 },
  10: { realm: 10, name: '渡劫', requiredCultivation: Infinity, spiritStoneCost: Infinity, healthMultiplier: 512,  spiritMultiplier: 512,  powerMultiplier: 512 },
};

export const REALM_MAX_EXP: Record<string, number> = {
  '凡人': 100, '练气': 300, '筑基': 1000, '金丹': 3000, '元婴': 10000,
  '化神': 30000, '炼虚': 100000, '合体': 300000, '大乘': 1000000, '渡劫': 0,
};

export const REALM_BREAKTHROUGH_COST: Record<string, number> = {
  '凡人': 100, '练气': 300, '筑基': 1000, '金丹': 3000, '元婴': 10000,
  '化神': 30000, '炼虚': 100000, '合体': 300000, '大乘': 1000000, '渡劫': 0,
};

export function getRealmNumeric(realmName: string): number {
  return REALM_ORDER.indexOf(realmName) + 1;
}

// ─── Equipment Generation ───────────────────────────────────────

const SLOT_MULTIPLIER: Record<string, number> = {
  weapon: 1.5, armor: 1.2, artifact: 1.0, accessory: 1.0, pill: 1.0,
};

const RARITY_MULTIPLIER: Record<string, number> = {
  '凡品': 1, '灵品': 1.5, '仙品': 2.5, '神品': 4.0,
};

const AFFIX_STATS = ['attack', 'defense', 'hp', 'mp', 'critRate', 'critDamage', 'expRate', 'lifesteal'] as const;

function computeAffixValue(stat: string, baseValue: number, rarity: string): number {
  const scale = RARITY_MULTIPLIER[rarity] ?? 1;
  switch (stat) {
    case 'attack': return Math.floor(baseValue * 0.3 * scale);
    case 'defense': return Math.floor(baseValue * 0.3 * scale);
    case 'hp': return Math.floor(baseValue * 1.5 * scale);
    case 'mp': return Math.floor(baseValue * 0.8 * scale);
    case 'critRate': return Math.floor(5 * scale);
    case 'critDamage': return Math.floor(20 * scale);
    case 'expRate': return Math.floor(5 * scale);
    case 'lifesteal': return Math.floor(3 * scale);
    default: return 0;
  }
}

function randomAffix(baseValue: number, rarity: string): EquipmentAffix {
  const stat = AFFIX_STATS[Math.floor(Math.random() * AFFIX_STATS.length)];
  return { stat, value: computeAffixValue(stat, baseValue, rarity), label: `${stat}+${computeAffixValue(stat, baseValue, rarity)}` };
}

export function generateEquipment(
  recipeId: string,
  recipeName: string,
  slot: string,
  realmValue: number,
  rarity: string,
): Equipment {
  const slotMult = SLOT_MULTIPLIER[slot] ?? 1.0;
  const rarityMult = RARITY_MULTIPLIER[rarity] ?? 1.0;
  const baseValue = Math.floor(10 * realmValue * slotMult * rarityMult);

  const baseStats: Partial<Record<string, number>> = {};
  if (slot === 'weapon') { baseStats.attack = baseValue; }
  else if (slot === 'armor') { baseStats.defense = baseValue; }
  else if (slot === 'artifact') { baseStats.attack = Math.floor(baseValue * 0.7); baseStats.defense = Math.floor(baseValue * 0.7); }
  else if (slot === 'accessory') { baseStats.hp = baseValue * 5; baseStats.mp = baseValue * 3; }

  let affixCount = 0;
  if (rarity === '灵品') affixCount = Math.random() < 0.5 ? 1 : 0;
  else if (rarity === '仙品') affixCount = 1 + Math.floor(Math.random() * 2);
  else if (rarity === '神品') affixCount = 2 + Math.floor(Math.random() * 2);

  const affixes: EquipmentAffix[] = [];
  for (let i = 0; i < affixCount; i++) {
    affixes.push(randomAffix(baseValue, rarity));
  }

  return {
    id: `${recipeId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: recipeName,
    slot: slot as EquipmentSlot,
    rarity: rarity as EquipmentRarity,
    baseStats,
    affixes,
    requiredRealm: realmValue,
    price: Math.floor(baseValue * 10),
    isCrafted: true,
  };
}

// ─── Crafting ───────────────────────────────────────────────────

export interface CraftResult {
  success: boolean;
  product?: string;
  equipment?: Equipment;
  message: string;
}

export function attemptCraft(
  recipe: CraftRecipe,
  inventory: Record<string, number>,
  buffMultiplier: number = 1.0,
): { success: boolean; materialsConsumed: boolean; product?: string; message: string } {
  // Check materials
  for (const [mat, needed] of Object.entries(recipe.materials)) {
    if ((inventory[mat] || 0) < needed) {
      return { success: false, materialsConsumed: false, message: `材料不足：缺少 ${mat} x${needed - (inventory[mat] || 0)}` };
    }
  }

  // Consume materials (always consumed, even on failure)
  for (const [mat, needed] of Object.entries(recipe.materials)) {
    inventory[mat] = (inventory[mat] || 0) - needed;
    if (inventory[mat] <= 0) delete inventory[mat];
  }

  const effectiveRate = Math.min(recipe.baseSuccessRate * buffMultiplier, 0.95);
  const success = Math.random() < effectiveRate;

  if (success) {
    return { success: true, materialsConsumed: true, product: recipe.product, message: `炼制成功！获得 ${recipe.product}` };
  }
  return { success: false, materialsConsumed: true, message: '炼制失败，材料化为灰烬……' };
}

// ─── Technique Catalog ──────────────────────────────────────────

export interface TechniqueDef {
  id: string;
  name: string;
  grade: string;
  type: 'passive' | 'active';
  effects: Array<{ stat: string; value: number; perLevel: number }>;
  learnCost: number;
  levelUpCost: number;
  maxLevel: number;
  requiredRealm: number;
  skill?: { name: string; damageMultiplier: number; cooldown: number; mpCost: number; range: number; aoe?: number };
}

export const TECHNIQUES: TechniqueDef[] = [
  // MORTAL
  { id: 'basic_stance', name: '基础吐纳', grade: '凡品', type: 'passive', effects: [{ stat: 'hp', value: 10, perLevel: 5 }], learnCost: 100, levelUpCost: 50, maxLevel: 5, requiredRealm: 1 },
  { id: 'stone_skin', name: '石肤术', grade: '凡品', type: 'passive', effects: [{ stat: 'defense', value: 3, perLevel: 2 }], learnCost: 150, levelUpCost: 80, maxLevel: 5, requiredRealm: 1 },
  { id: 'qi_gathering', name: '聚气诀', grade: '凡品', type: 'passive', effects: [{ stat: 'cultivationRate', value: 5, perLevel: 3 }], learnCost: 120, levelUpCost: 60, maxLevel: 5, requiredRealm: 1 },
  { id: 'vital_strike', name: '猛击', grade: '凡品', type: 'active', effects: [{ stat: 'attack', value: 5, perLevel: 3 }], learnCost: 200, levelUpCost: 100, maxLevel: 3, requiredRealm: 1, skill: { name: '猛击', damageMultiplier: 1.5, cooldown: 3, mpCost: 5, range: 1 } },
  // SPIRIT
  { id: 'spirit_shield', name: '灵气护盾', grade: '灵品', type: 'active', effects: [{ stat: 'defense', value: 10, perLevel: 5 }], learnCost: 500, levelUpCost: 200, maxLevel: 5, requiredRealm: 2, skill: { name: '灵气护盾', damageMultiplier: 2.0, cooldown: 5, mpCost: 20, range: 0 } },
  { id: 'swift_wind', name: '御风术', grade: '灵品', type: 'passive', effects: [{ stat: 'defense', value: 5, perLevel: 3 }], learnCost: 400, levelUpCost: 150, maxLevel: 5, requiredRealm: 2 },
  { id: 'flame_slash', name: '炎斩', grade: '灵品', type: 'active', effects: [{ stat: 'attack', value: 15, perLevel: 8 }], learnCost: 600, levelUpCost: 250, maxLevel: 5, requiredRealm: 2, skill: { name: '炎斩', damageMultiplier: 2.0, cooldown: 4, mpCost: 15, range: 1 } },
  { id: 'meditation', name: '静心诀', grade: '灵品', type: 'passive', effects: [{ stat: 'expRate', value: 5, perLevel: 3 }], learnCost: 350, levelUpCost: 150, maxLevel: 5, requiredRealm: 2 },
  // EARTH
  { id: 'earth_shaker', name: '地裂斩', grade: '地品', type: 'active', effects: [{ stat: 'attack', value: 30, perLevel: 15 }], learnCost: 1500, levelUpCost: 500, maxLevel: 5, requiredRealm: 3, skill: { name: '地裂斩', damageMultiplier: 2.5, cooldown: 6, mpCost: 30, range: 2, aoe: 1 } },
  { id: 'iron_body', name: '铁骨功', grade: '地品', type: 'passive', effects: [{ stat: 'defense', value: 20, perLevel: 10 }], learnCost: 1200, levelUpCost: 400, maxLevel: 5, requiredRealm: 3 },
  { id: 'soul_fire', name: '魂火术', grade: '地品', type: 'active', effects: [{ stat: 'attack', value: 25, perLevel: 12 }], learnCost: 1800, levelUpCost: 600, maxLevel: 5, requiredRealm: 3, skill: { name: '魂火术', damageMultiplier: 3.0, cooldown: 5, mpCost: 35, range: 2 } },
  { id: 'flowing_water', name: '流水诀', grade: '地品', type: 'passive', effects: [{ stat: 'mp', value: 20, perLevel: 10 }], learnCost: 1000, levelUpCost: 350, maxLevel: 5, requiredRealm: 3 },
  // HEAVEN
  { id: 'heavenly_blade', name: '天刀', grade: '天品', type: 'active', effects: [{ stat: 'attack', value: 50, perLevel: 25 }], learnCost: 5000, levelUpCost: 1500, maxLevel: 5, requiredRealm: 5, skill: { name: '天刀', damageMultiplier: 4.0, cooldown: 8, mpCost: 60, range: 3 } },
  { id: 'phoenix_rebirth', name: '凤涅诀', grade: '天品', type: 'passive', effects: [{ stat: 'hp', value: 100, perLevel: 50 }], learnCost: 4000, levelUpCost: 1200, maxLevel: 5, requiredRealm: 5 },
  { id: 'void_step', name: '虚空步', grade: '天品', type: 'active', effects: [{ stat: 'defense', value: 40, perLevel: 20 }], learnCost: 4500, levelUpCost: 1300, maxLevel: 3, requiredRealm: 5, skill: { name: '虚空步', damageMultiplier: 1.0, cooldown: 10, mpCost: 40, range: 5 } },
  // IMMORTAL
  { id: 'immortal_palm', name: '混元掌', grade: '仙品', type: 'active', effects: [{ stat: 'attack', value: 100, perLevel: 50 }], learnCost: 20000, levelUpCost: 5000, maxLevel: 5, requiredRealm: 7, skill: { name: '混元掌', damageMultiplier: 5.0, cooldown: 12, mpCost: 100, range: 3, aoe: 2 } },
  { id: 'eternal_life', name: '长生诀', grade: '仙品', type: 'passive', effects: [{ stat: 'hp', value: 500, perLevel: 250 }, { stat: 'mp', value: 200, perLevel: 100 }], learnCost: 30000, levelUpCost: 8000, maxLevel: 3, requiredRealm: 7 },
  { id: 'chaos_orb', name: '混沌元珠', grade: '仙品', type: 'active', effects: [{ stat: 'attack', value: 150, perLevel: 75 }], learnCost: 50000, levelUpCost: 12000, maxLevel: 3, requiredRealm: 7, skill: { name: '混沌元珠', damageMultiplier: 8.0, cooldown: 15, mpCost: 200, range: 4, aoe: 3 } },
];

export function getTechniqueById(id: string): TechniqueDef | undefined {
  return TECHNIQUES.find(t => t.id === id);
}

export function computeTechniqueEffects(learned: Array<{ techniqueId: string; level: number }>): Record<string, number> {
  const effects: Record<string, number> = {};
  for (const l of learned) {
    const def = getTechniqueById(l.techniqueId);
    if (!def) continue;
    for (const e of def.effects) {
      effects[e.stat] = (effects[e.stat] || 0) + e.value + e.perLevel * (l.level - 1);
    }
  }
  return effects;
}

// ─── Material Drop System ───────────────────────────────────────

export interface MaterialDrop {
  itemId: string;
  name: string;
  chance: number;
  minCount: number;
  maxCount: number;
}

// Monster material drops (in addition to spirit stones + exp)
export const MONSTER_MATERIAL_DROPS: MaterialDrop[] = [
  { itemId: 'monster_core', name: '妖兽内丹', chance: 0.30, minCount: 1, maxCount: 1 },
  { itemId: 'spirit_herb', name: '灵草', chance: 0.50, minCount: 1, maxCount: 3 },
  { itemId: 'spirit_spring', name: '灵泉水', chance: 0.40, minCount: 1, maxCount: 2 },
];

// Resource gathering drops
export const RESOURCE_DROPS: Record<string, MaterialDrop[]> = {
  '灵田': [
    { itemId: 'herb', name: '甘草', chance: 0.80, minCount: 1, maxCount: 3 },
    { itemId: 'mint', name: '薄荷', chance: 0.60, minCount: 1, maxCount: 2 },
    { itemId: 'ginseng', name: '人参', chance: 0.30, minCount: 1, maxCount: 1 },
    { itemId: 'spirit_spring', name: '灵泉水', chance: 0.50, minCount: 1, maxCount: 2 },
  ],
  '矿脉': [
    { itemId: 'iron', name: '精铁', chance: 0.70, minCount: 1, maxCount: 3 },
    { itemId: 'charcoal', name: '木炭', chance: 0.60, minCount: 1, maxCount: 2 },
    { itemId: 'dark_iron', name: '玄铁', chance: 0.30, minCount: 1, maxCount: 2 },
    { itemId: 'star_sand', name: '星辰砂', chance: 0.10, minCount: 1, maxCount: 1 },
  ],
  '遗迹': [
    { itemId: 'ancient_lingzhi', name: '千年灵芝', chance: 0.20, minCount: 1, maxCount: 1 },
    { itemId: 'dragon_blood', name: '龙血藤', chance: 0.15, minCount: 1, maxCount: 1 },
    { itemId: 'spirit_stone_powder', name: '灵石粉末', chance: 0.50, minCount: 1, maxCount: 3 },
  ],
};

export function rollDrops(drops: MaterialDrop[]): Array<{ itemId: string; name: string; count: number }> {
  const results: Array<{ itemId: string; name: string; count: number }> = [];
  for (const drop of drops) {
    if (Math.random() < drop.chance) {
      const count = drop.minCount + Math.floor(Math.random() * (drop.maxCount - drop.minCount + 1));
      results.push({ itemId: drop.itemId, name: drop.name, count });
    }
  }
  return results;
}
