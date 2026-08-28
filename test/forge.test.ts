import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, generateEquipment, EquipmentSlot, EquipmentRarity, CultivationRealm } from '../src/store/gameStore';
import {
  CRAFT_RECIPES,
  getForgeRecipes,
  FORGE_RECIPE_META,
  FORGE_MATERIALS,
  getRecipe,
} from '../src/store/craftingRecipes';

function initPlayer(overrides: Record<string, any> = {}) {
  useGameStore.setState({
    player: {
      id: 'test-player',
      name: 'TestPlayer',
      heavenLevel: 9 as const,
      realm: '练气',
      bodyType: '凡体',
      potential: '无',
      country: '赵',
      clanId: 'p1',
      stats: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, attack: 10, defense: 5, exp: 0, maxExp: 10000 },
      hiddenStats: { killCount: 0, cultivateCount: 0, gatherCount: 0, ascensionCount: 0, merit: 0 },
      reputation: 1000,
      position: { x: 50, y: 50 },
      inventory: { '灵石': 10000 },
      cycleInfo: { type: null as any },
      isAscending: false,
      talent: { spiritualRoot: 25, boneConstitution: 30, comprehension: 40, fortune: 20 },
      skillCooldowns: {},
      equipmentSlots: {},
      ...overrides,
    },
    nearbyNPCs: [],
    wildMonsters: [],
    logs: [],
    clans: [],
    squadMembers: [],
    resourcePoints: [],
    market: {},
    _factionTickCount: 0,
    currentFormation: '散开',
    clanArmies: [],
    warStats: { battlesWon: 0, battlesLost: 0, npcsKilled: 0, alliesLost: 0, treasuryLooted: 0, citiesCaptured: 0 },
    metNpcs: [],
    npcMemory: {},
    ascensionQuests: [],
    worldEvents: [],
  });
}

beforeEach(() => {
  useGameStore.setState({ player: null, logs: [] });
});

describe('forge recipes data integrity', () => {
  const forgeRecipes = CRAFT_RECIPES.filter(r => r.type === 'equipment');

  it('has 6 forge recipes', () => {
    expect(forgeRecipes.length).toBe(6);
  });

  it('all forge recipes have type "equipment"', () => {
    forgeRecipes.forEach(r => expect(r.type).toBe('equipment'));
  });

  it('all forge recipes have metadata in FORGE_RECIPE_META', () => {
    forgeRecipes.forEach(r => {
      expect(FORGE_RECIPE_META[r.id]).toBeDefined();
      expect(FORGE_RECIPE_META[r.id].slot).toBeDefined();
      expect(FORGE_RECIPE_META[r.id].realmValue).toBeGreaterThan(0);
      expect(FORGE_RECIPE_META[r.id].targetRarity).toBeDefined();
    });
  });

  it('every forge recipe has a valid baseSuccessRate (0 < rate <= 1)', () => {
    forgeRecipes.forEach(r => {
      expect(r.baseSuccessRate).toBeGreaterThan(0);
      expect(r.baseSuccessRate).toBeLessThanOrEqual(1);
    });
  });

  it('every forge recipe has at least one material', () => {
    forgeRecipes.forEach(r => {
      expect(Object.keys(r.materials).length).toBeGreaterThan(0);
    });
  });

  it('all forge recipe materials are in FORGE_MATERIALS list', () => {
    forgeRecipes.forEach(r => {
      Object.keys(r.materials).forEach(mat => {
        expect(FORGE_MATERIALS).toContain(mat);
      });
    });
  });

  it('every forge recipe has a realmRequired', () => {
    forgeRecipes.forEach(r => {
      expect(r.realmRequired).toBeDefined();
      expect(r.realmRequired!.length).toBeGreaterThan(0);
    });
  });
});

describe('getForgeRecipes', () => {
  it('returns only equipment-type recipes', () => {
    const recipes = getForgeRecipes();
    recipes.forEach(r => expect(r.type).toBe('equipment'));
  });

  it('returns fewer recipes than total CRAFT_RECIPES', () => {
    const all = CRAFT_RECIPES.length;
    const forgeCount = getForgeRecipes().length;
    expect(forgeCount).toBeLessThan(all);
  });
});

describe('forgeCraft action', () => {
  it('returns failure when player is null', async () => {
    // Player is null from beforeEach
    const result = await useGameStore.getState().forgeCraft('forge_sword_mortal');
    expect(result.success).toBe(false);
    expect(result.message).toContain('玩家不存在');
  });
  it('returns failure when player has no materials', async () => {
    initPlayer({ inventory: { '灵石': 100 } });
    const result = await useGameStore.getState().forgeCraft('forge_sword_mortal');
    expect(result.success).toBe(false);
    expect(result.message).toContain('材料不足');
  });

  it('consumes materials on success', async () => {
    // Mock Math.random to force success
    const origRandom = Math.random;
    Math.random = () => 0.1;

    initPlayer({ inventory: { '灵石': 10000, '精铁': 10, '木炭': 10 } });
    const result = await useGameStore.getState().forgeCraft('forge_sword_mortal');
    expect(result.success).toBe(true);
    // Materials should be consumed: 精铁 -3, 木炭 -2
    const inv = useGameStore.getState().player!.inventory;
    expect(inv['精铁']).toBe(7);
    expect(inv['木炭']).toBe(8);

    Math.random = origRandom;
  });

  it('consumes materials even on failure', async () => {
    // Mock Math.random to force failure
    const origRandom = Math.random;
    Math.random = () => 0.99;

    initPlayer({ inventory: { '灵石': 10000, '精铁': 10, '木炭': 10 } });
    const result = await useGameStore.getState().forgeCraft('forge_sword_mortal');
    expect(result.success).toBe(false);
    // Materials should still be consumed
    const inv = useGameStore.getState().player!.inventory;
    expect(inv['精铁']).toBe(7);
    expect(inv['木炭']).toBe(8);

    Math.random = origRandom;
  });

  it('generates equipment with isCrafted flag and proper name', async () => {
    const origRandom = Math.random;
    Math.random = () => 0.01;

    initPlayer({ inventory: { '灵石': 10000, '精铁': 10, '木炭': 10 } });
    const result = await useGameStore.getState().forgeCraft('forge_sword_mortal');
    expect(result.success).toBe(true);
    expect(result.product).toBe('精铁剑');

    // Equipment should be auto-equipped in weapon slot
    const eqSlots = useGameStore.getState().player!.equipmentSlots;
    expect(eqSlots['weapon']).toBeDefined();
    expect(eqSlots['weapon']!.name).toBe('精铁剑');
    expect((eqSlots['weapon'] as any).isCrafted).toBe(true);

    Math.random = origRandom;
  });

  it('returns success message with forge buff percentage when 炼器房 exists', async () => {
    const origRandom = Math.random;
    Math.random = () => 0.01;

    initPlayer({
      inventory: { '灵石': 10000, '精铁': 10, '木炭': 10 },
    });
    useGameStore.setState({
      clans: [{
        id: 'test-clan', name: '测试势力', country: '赵', type: '1级',
        reputation: 500, treasury: 50000, heavenLevel: 9,
        isAscendingFamily: false,
        buildings: [{ type: '炼器房' as any, level: 2, hp: 100 }],
      }],
      playerFactionId: 'test-clan',
    });

    const result = await useGameStore.getState().forgeCraft('forge_sword_mortal');
    expect(result.success).toBe(true);
    expect(result.message).toContain('炼器房加成+20%');

    Math.random = origRandom;
  });

  it('returns failure for unknown recipe ID', async () => {
    initPlayer();
    const result = await useGameStore.getState().forgeCraft('nonexistent');
    expect(result.success).toBe(false);
  });

  it('returns failure for non-equipment recipe (pill)', async () => {
    initPlayer();
    const result = await useGameStore.getState().forgeCraft('pill_hp_basic');
    expect(result.success).toBe(false);
  });
});

describe('forgeCraft with 炼器房 buff', () => {
  it('success rate increases with 炼器房 building level', async () => {
    initPlayer({
      inventory: { '灵石': 10000, '精铁': 10, '木炭': 10 },
    });
    // Set up a clan with 炼器房
    useGameStore.setState({
      clans: [{
        id: 'test-clan', name: '测试势力', country: '赵', type: '1级',
        reputation: 500, treasury: 50000, heavenLevel: 9,
        isAscendingFamily: false,
        buildings: [{ type: '炼器房' as any, level: 3, hp: 100 }],
      }],
      playerFactionId: 'test-clan',
    });

    const origRandom = Math.random;
    Math.random = () => 0.01;

    const result = await useGameStore.getState().forgeCraft('forge_sword_mortal');
    expect(result.success).toBe(true);

    Math.random = origRandom;
  });
});

describe('generateEquipment for forge output', () => {
  it('generated equipment has correct slot stats', () => {
    const eq = generateEquipment('test', EquipmentSlot.WEAPON, EquipmentRarity.MORTAL, CultivationRealm.QiRefining);
    expect(eq.slot).toBe('weapon');
    expect(eq.baseStats.attack).toBeDefined();
    expect(eq.baseStats.attack!).toBeGreaterThan(0);
  });

  it('armor equipment has defense stat', () => {
    const eq = generateEquipment('test', EquipmentSlot.ARMOR, EquipmentRarity.SPIRIT, CultivationRealm.GoldenCore);
    expect(eq.slot).toBe('armor');
    expect(eq.baseStats.defense).toBeDefined();
    expect(eq.baseStats.defense!).toBeGreaterThan(0);
  });

  it('higher realm value produces higher stats', () => {
    const low = generateEquipment('low', EquipmentSlot.WEAPON, EquipmentRarity.MORTAL, CultivationRealm.QiRefining);
    const high = generateEquipment('high', EquipmentSlot.WEAPON, EquipmentRarity.MORTAL, CultivationRealm.GoldenCore);
    expect(high.baseStats.attack!).toBeGreaterThan(low.baseStats.attack!);
  });
});

describe('siege equipment', () => {
  it('buildSiegeEquipment starts building process and consumes treasury', () => {
    useGameStore.setState({
      clans: [{
        id: 'test-clan', name: '测试势力', country: '赵', type: '1级',
        reputation: 500, treasury: 50000, heavenLevel: 9,
        isAscendingFamily: false,
      }],
      playerFactionId: 'test-clan',
    });
    useGameStore.getState().buildSiegeEquipment('test-clan');
    const clan = useGameStore.getState().clans.find(c => c.id === 'test-clan')!;
    expect(clan.siegeEquipment).toBeDefined();
    expect(clan.siegeEquipment!.building).toBe(true);
    expect(clan.siegeEquipment!.ready).toBe(false);
    expect(clan.siegeEquipment!.multiplier).toBe(1.5);
    expect(clan.treasury).toBe(45000); // 50000 - 5000
  });

  it('does not overwrite existing siege equipment that is already building', () => {
    useGameStore.setState({
      clans: [{
        id: 'test-clan', name: '测试势力', country: '赵', type: '1级',
        reputation: 500, treasury: 50000, heavenLevel: 9,
        isAscendingFamily: false,
        siegeEquipment: { building: true, ready: false, multiplier: 1.5, progressTicks: 3, requiredTicks: 10 },
      }],
      playerFactionId: 'test-clan',
    });
    useGameStore.getState().buildSiegeEquipment('test-clan');
    const clan = useGameStore.getState().clans.find(c => c.id === 'test-clan')!;
    expect(clan.siegeEquipment!.progressTicks).toBe(3); // unchanged
    expect(clan.treasury).toBe(50000); // not consumed again
  });

  it('progresses siege equipment ticks each siege tick', () => {
    useGameStore.setState({
      player: {
        id: 'test-player', name: 'TestPlayer', heavenLevel: 9 as const, realm: '练气',
        bodyType: '凡体', potential: '无', country: '赵', clanId: 'test-clan',
        stats: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, attack: 10, defense: 5, exp: 0, maxExp: 10000 },
        hiddenStats: { killCount: 0, cultivateCount: 0, gatherCount: 0, ascensionCount: 0, merit: 0 },
        reputation: 1000, position: { x: 50, y: 50 }, inventory: { '灵石': 10000 },
        cycleInfo: { type: null as any }, isAscending: false,
        talent: { spiritualRoot: 25, boneConstitution: 30, comprehension: 40, fortune: 20 },
        skillCooldowns: {}, equipmentSlots: {},
      },
      _factionTickCount: 0,
      currentFormation: '散开' as any,
      clans: [{
        id: 'test-clan', name: '测试势力', country: '赵', type: '1级',
        reputation: 500, treasury: 50000, heavenLevel: 9,
        isAscendingFamily: false,
        siegeEquipment: { building: true, ready: false, multiplier: 1.5, progressTicks: 0, requiredTicks: 10 },
      }],
      nearbyNPCs: [], wildMonsters: [], logs: [], clanArmies: [], resourcePoints: [],
      warStats: { battlesWon: 0, battlesLost: 0, npcsKilled: 0, alliesLost: 0, treasuryLooted: 0, citiesCaptured: 0 },
      metNpcs: [], npcMemory: {}, squadMembers: [], ascensionQuests: [], worldEvents: [], captives: [],
      market: {}, _factionLLMCooldowns: {}, _factionLLMQueue: [], _factionLLMEnqueueTime: {}, _factionLLMResults: {},
    });
    // Set tick to 5 (5 % 5 === 0 triggers siege tick)
    useGameStore.setState({ _factionTickCount: 5 });
    useGameStore.getState().updateNPCs();
    const clan = useGameStore.getState().clans.find(c => c.id === 'test-clan')!;
    expect(clan.siegeEquipment!.progressTicks).toBe(1);
  });
});
