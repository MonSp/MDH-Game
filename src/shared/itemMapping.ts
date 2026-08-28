/**
 * Bidirectional mapping between client Chinese item names and server English item IDs.
 * Used by serverAdapter to translate buy/sell/craft requests.
 */

// ─── Item ID ↔ Chinese Name ─────────────────────────────────────

export const ITEM_ID_TO_NAME: Record<string, string> = {
  // Pills
  'WashMarrowPill': '洗髓丹',
  'QiRefiningPill': '练气丹',
  'FoundationPill': '筑基丹',
  'hp_pill_basic': '回血丹',
  'hp_pill_adv': '续命丹',
  'mp_pill_basic': '聚气散',
  'exp_pill': '培元丹',
  'breakthrough_pill_mortal': '筑基丹',
  'breakthrough_pill_spirit': '凝婴丹',
  // Materials
  'SpiritStoneFragment': '灵石碎片',
  'SpiritHerb': '灵草',
  'MonsterMaterial': '妖兽材料',
  'monster_core': '妖兽内丹',
  'spirit_herb': '灵草',
  'spirit_spring': '灵泉水',
  'spirit_stone_powder': '灵石粉末',
  'herb': '甘草',
  'mint': '薄荷',
  'ginseng': '人参',
  'vermillion_fruit': '朱果',
  'ancient_lingzhi': '千年灵芝',
  'nine_leaf_sword_grass': '九叶剑草',
  'dragon_blood': '龙血藤',
  'iron': '精铁',
  'charcoal': '木炭',
  'dark_iron': '玄铁',
  'spirit_silk': '灵蚕丝',
  'star_sand': '星辰砂',
  'phoenix_feather': '凤羽',
  'dragon_bone': '龙骨',
  // Equipment
  'LowGradeArtifact': '低级法器',
  'MidGradeArtifact': '中级法器',
  // Special
  'spirit_stone': '灵石',
  // Forge recipe products
  'forge_sword_mortal': '精铁剑',
  'forge_armor_mortal': '玄铁重甲',
  'forge_sword_spirit': '星辰剑',
  'forge_armor_spirit': '凤羽甲',
  'forge_sword_immortal': '帝剑·轩辕',
  'forge_armor_immortal': '天玄神甲',
};

// Reverse mapping: Chinese name → server item ID
export const NAME_TO_ITEM_ID: Record<string, string> = {};
for (const [id, name] of Object.entries(ITEM_ID_TO_NAME)) {
  // First-wins to avoid overwrites from duplicate Chinese names
  if (!NAME_TO_ITEM_ID[name]) NAME_TO_ITEM_ID[name] = id;
}

/** Convert Chinese item name to server ID. Returns input if no mapping found. */
export function toServerId(chineseName: string): string {
  return NAME_TO_ITEM_ID[chineseName] || chineseName;
}

/** Convert server item ID to Chinese name. Returns input if no mapping found. */
export function toClientName(serverId: string): string {
  return ITEM_ID_TO_NAME[serverId] || serverId;
}

// ─── Recipe ID ↔ Chinese Name ───────────────────────────────────

export const RECIPE_ID_MAP: Record<string, string> = {
  'pill_hp_basic': '回血丹',
  'pill_hp_adv': '续命丹',
  'pill_mp_basic': '聚气散',
  'pill_exp': '培元丹',
  'pill_breakthrough_mortal': '筑基丹',
  'pill_breakthrough_spirit': '凝婴丹',
  'forge_sword_mortal': '精铁剑',
  'forge_armor_mortal': '玄铁重甲',
  'forge_sword_spirit': '星辰剑',
  'forge_armor_spirit': '凤羽甲',
  'forge_sword_immortal': '帝剑·轩辕',
  'forge_armor_immortal': '天玄神甲',
};

/** Find recipe ID from product Chinese name. */
export function findRecipeIdByProductName(productName: string): string | undefined {
  for (const [id, name] of Object.entries(RECIPE_ID_MAP)) {
    if (name === productName) return id;
  }
  return undefined;
}
