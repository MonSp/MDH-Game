import { ItemQuality } from '../shared/types/items';
import type { CraftRecipe } from '../shared/types/items';

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
];

/** Look up a recipe by ID */
export function getRecipe(id: string): CraftRecipe | undefined {
  return CRAFT_RECIPES.find(r => r.id === id);
}

/** Get all recipes available to a given realm */
export function getAvailableRecipes(realm?: string): CraftRecipe[] {
  if (!realm) return CRAFT_RECIPES.filter(r => !r.realmRequired);
  return CRAFT_RECIPES.filter(r => !r.realmRequired || realm.includes(r.realmRequired));
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
      message: success
        ? `炼制成功！获得 ${recipe.product}${recipe.quality !== '凡品' ? `（${recipe.quality}）` : ''}`
        : '炼制失败，材料化为灰烬……',
    };
  }
  return { success: false, message: '炼制失败，材料化为灰烬……' };
}
