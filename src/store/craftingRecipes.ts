import { ItemQuality } from '../shared/types/items';
import type { CraftRecipe } from '../shared/types/items';
import { EquipmentSlot, EquipmentRarity, CultivationRealm } from '../shared/types/cultivation';

/** Forge-specific metadata mapping recipe ID → equipment generation params */
export interface ForgeRecipeMeta {
  slot: EquipmentSlot;
  /** The CultivationRealm value used for stat scaling */
  realmValue: CultivationRealm;
  /** The EquipmentRarity to generate (separate from CraftRecipe.quality for display) */
  targetRarity: EquipmentRarity;
}

export const FORGE_RECIPE_META: Record<string, ForgeRecipeMeta> = {};

/** Known forge material items (for reference / seeding) */
export const FORGE_MATERIALS = ['精铁', '木炭', '玄铁', '灵蚕丝', '星辰砂', '凤羽', '龙骨'];

export const CRAFT_RECIPES: CraftRecipe[] = [
  // === Pill Recipes ===
  {
    id: 'pill_hp_basic',
    name: '回血丹',
    type: 'pill',
    quality: ItemQuality.MORTAL,
    materials: { '甘草': 2, '灵泉水': 1 },
    product: '回血丹',
    baseSuccessRate: 0.80,
    effects: [{ stat: 'hp', value: 200 }],
    description: '基础疗伤丹药，恢复少量气血',
  },
  {
    id: 'pill_hp_adv',
    name: '续命丹',
    type: 'pill',
    quality: ItemQuality.SPIRIT,
    materials: { '灵芝': 3, '灵泉水': 2, '灵石粉末': 1 },
    product: '续命丹',
    baseSuccessRate: 0.65,
    effects: [{ stat: 'hp', value: 800 }],
    description: '中品疗伤丹，可快速恢复大量气血',
  },
  {
    id: 'pill_mp_basic',
    name: '聚气散',
    type: 'pill',
    quality: ItemQuality.MORTAL,
    materials: { '薄荷': 2, '灵泉水': 1 },
    product: '聚气散',
    baseSuccessRate: 0.85,
    effects: [{ stat: 'mp', value: 150 }],
    description: '基础回灵丹药，恢复少量灵力',
  },
  {
    id: 'pill_exp',
    name: '培元丹',
    type: 'pill',
    quality: ItemQuality.SPIRIT,
    materials: { '人参': 2, '朱果': 1, '灵泉水': 1 },
    product: '培元丹',
    baseSuccessRate: 0.60,
    effects: [{ stat: 'exp', value: 500 }],
    description: '增进修为的灵丹，可提升修炼速度',
  },
  {
    id: 'pill_breakthrough_mortal',
    name: '筑基丹',
    type: 'pill',
    quality: ItemQuality.MYSTIC,
    materials: { '千年灵芝': 2, '朱果': 3, '妖兽内丹': 1, '灵泉水': 2 },
    product: '筑基丹',
    baseSuccessRate: 0.45,
    realmRequired: '练气',
    effects: [{ stat: 'breakthrough', value: 1 }],
    description: '辅助筑基突破的玄品丹药，可提升突破成功率',
  },
  {
    id: 'pill_breakthrough_spirit',
    name: '凝婴丹',
    type: 'pill',
    quality: ItemQuality.EARTH,
    materials: { '九叶剑草': 2, '妖兽内丹': 3, '龙血藤': 1, '灵泉水': 3 },
    product: '凝婴丹',
    baseSuccessRate: 0.30,
    realmRequired: '金丹',
    effects: [{ stat: 'breakthrough', value: 2 }],
    description: '辅助凝结元婴的地品丹药，极其珍贵',
  },

  // === Forge (Equipment) Recipes ===
  {
    id: 'forge_sword_mortal',
    name: '精铁剑',
    type: 'equipment',
    quality: ItemQuality.MORTAL,
    materials: { '精铁': 3, '木炭': 2 },
    product: '精铁剑',
    baseSuccessRate: 0.85,
    realmRequired: '练气',
    description: '凡品精铁长剑，基础炼器之作',
  },
  {
    id: 'forge_armor_mortal',
    name: '玄铁重甲',
    type: 'equipment',
    quality: ItemQuality.MORTAL,
    materials: { '玄铁': 3, '灵蚕丝': 2 },
    product: '玄铁重甲',
    baseSuccessRate: 0.80,
    realmRequired: '筑基',
    description: '以玄铁打造的厚重铠甲，防御力不俗',
  },
  {
    id: 'forge_sword_spirit',
    name: '星辰剑',
    type: 'equipment',
    quality: ItemQuality.SPIRIT,
    materials: { '星辰砂': 2, '精铁': 5, '玄铁': 3 },
    product: '星辰剑',
    baseSuccessRate: 0.65,
    realmRequired: '金丹',
    description: '融入星辰砂的灵品长剑，锋芒毕露',
  },
  {
    id: 'forge_armor_spirit',
    name: '凤羽甲',
    type: 'equipment',
    quality: ItemQuality.SPIRIT,
    materials: { '凤羽': 2, '玄铁': 5, '灵蚕丝': 3 },
    product: '凤羽甲',
    baseSuccessRate: 0.60,
    realmRequired: '元婴',
    description: '以凤凰羽毛编织的灵甲，轻灵而坚韧',
  },
  {
    id: 'forge_sword_immortal',
    name: '帝剑·轩辕',
    type: 'equipment',
    quality: ItemQuality.EARTH,
    materials: { '星辰砂': 5, '凤羽': 3, '龙骨': 2 },
    product: '帝剑·轩辕',
    baseSuccessRate: 0.40,
    realmRequired: '化神',
    description: '上古神兵仿制品，拥有毁天灭地之威',
  },
  {
    id: 'forge_armor_immortal',
    name: '天玄神甲',
    type: 'equipment',
    quality: ItemQuality.HEAVEN,
    materials: { '龙骨': 3, '凤羽': 5, '星辰砂': 5 },
    product: '天玄神甲',
    baseSuccessRate: 0.35,
    realmRequired: '合体',
    description: '以真龙骸骨锻造的神甲，万法不侵',
  },
];

// Initialize forge recipe metadata
FORGE_RECIPE_META['forge_sword_mortal'] = { slot: EquipmentSlot.WEAPON, realmValue: 2, targetRarity: EquipmentRarity.MORTAL };
FORGE_RECIPE_META['forge_armor_mortal'] = { slot: EquipmentSlot.ARMOR, realmValue: 3, targetRarity: EquipmentRarity.MORTAL };
FORGE_RECIPE_META['forge_sword_spirit'] = { slot: EquipmentSlot.WEAPON, realmValue: 4, targetRarity: EquipmentRarity.SPIRIT };
FORGE_RECIPE_META['forge_armor_spirit'] = { slot: EquipmentSlot.ARMOR, realmValue: 5, targetRarity: EquipmentRarity.SPIRIT };
FORGE_RECIPE_META['forge_sword_immortal'] = { slot: EquipmentSlot.WEAPON, realmValue: 6, targetRarity: EquipmentRarity.IMMORTAL };
FORGE_RECIPE_META['forge_armor_immortal'] = { slot: EquipmentSlot.ARMOR, realmValue: 8, targetRarity: EquipmentRarity.IMMORTAL };

/** Look up a recipe by ID */
export function getRecipe(id: string): CraftRecipe | undefined {
  return CRAFT_RECIPES.find(r => r.id === id);
}

/** Get all recipes available to a given realm */
export function getAvailableRecipes(realm?: string): CraftRecipe[] {
  if (!realm) return CRAFT_RECIPES.filter(r => !r.realmRequired);
  return CRAFT_RECIPES.filter(r => !r.realmRequired || realm.includes(r.realmRequired));
}

/** Get all forge (equipment) recipes available to a given realm */
export function getForgeRecipes(realm?: string): CraftRecipe[] {
  return getAvailableRecipes(realm).filter(r => r.type === 'equipment');
}

export interface CraftResult {
  success: boolean;
  product?: string;
  message: string;
}

/**
 * Attempt to craft a recipe.
 * @param recipe - the recipe to craft
 * @param inventory - player inventory (item name → count)
 * @param pillBuffMultiplier - building buff multiplier (e.g. 1.1 from 丹房)
 * @returns CraftResult with success/failure
 */
export function attemptCraft(
  recipe: CraftRecipe,
  inventory: Record<string, number>,
  pillBuffMultiplier: number = 1.0,
): { success: boolean; product?: string; message: string } {
  // Check materials
  for (const [mat, needed] of Object.entries(recipe.materials)) {
    if ((inventory[mat] || 0) < needed) {
      return { success: false, message: `材料不足：缺少 ${mat} x${needed - (inventory[mat] || 0)}` };
    }
  }

  // Success roll: base rate × pillBuffMultiplier, capped at 0.95
  const effectiveRate = Math.min(recipe.baseSuccessRate * pillBuffMultiplier, 0.95);
  const success = Math.random() < effectiveRate;

  if (success) {
    return {
      success: true,
      product: recipe.product,
      message: `炼制成功！获得 ${recipe.product}${recipe.quality !== '凡品' ? `（${recipe.quality}）` : ''}`,
    };
  }
  return { success: false, message: '炼制失败，材料化为灰烬……' };
}
