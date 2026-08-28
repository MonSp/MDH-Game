import { describe, it, expect, beforeEach } from 'vitest';
import {
  useGameStore,
  generateEquipment,
  EquipmentSlot,
  EquipmentRarity,
  CultivationRealm,
  MONSTER_TYPES_DATA,
  calculateDamage,
} from '../src/store/gameStore';
import type { EquipmentAffix } from '../src/store/gameStore';

function initPlayer(overrides: Record<string, any> = {}) {
  useGameStore.setState({
    player: {
      id: 'test-player',
      name: 'TestPlayer',
      heavenLevel: 9 as const,
      realm: '练气' as const,
      bodyType: '凡体' as const,
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
      ...overrides,
    },
    nearbyNPCs: [],
    wildMonsters: [{
      id: 'mon-1', name: '赤焰蛇', isAlive: true, hp: 500, maxHp: 500, attack: 10, defense: 5,
      position: { x: 50, y: 50 }, realm: '练气', expReward: 30,
    }],
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
  useGameStore.setState({ player: null, wildMonsters: [], logs: [] });
});

// ─── P1a: Affix generation ───

describe('generateEquipment affixes (P1a)', () => {
  it('MORTAL equipment has zero affixes', () => {
    const eq = generateEquipment('test', EquipmentSlot.WEAPON, EquipmentRarity.MORTAL, CultivationRealm.Mortal);
    expect(eq.affixes.length).toBe(0);
  });

  it('DIVINE equipment has at least 2 affixes', () => {
    for (let i = 0; i < 50; i++) {
      const eq = generateEquipment(`test-${i}`, EquipmentSlot.ARMOR, EquipmentRarity.DIVINE, CultivationRealm.Mortal);
      expect(eq.affixes.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('SPIRIT equipment has 0 or 1 affixes', () => {
    const counts = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const eq = generateEquipment(`test-${i}`, EquipmentSlot.ARMOR, EquipmentRarity.SPIRIT, CultivationRealm.Mortal);
      counts.add(eq.affixes.length);
    }
    // Over 100 iterations, both 0 and 1 should appear
    expect(counts.has(0)).toBe(true);
    expect(counts.has(1)).toBe(true);
  });

  it('generated affixes have no duplicate stats', () => {
    for (let i = 0; i < 50; i++) {
      const eq = generateEquipment(`test-${i}`, EquipmentSlot.ARTIFACT, EquipmentRarity.DIVINE, CultivationRealm.GoldenCore);
      const stats = eq.affixes.map(a => a.stat);
      expect(new Set(stats).size).toBe(stats.length);
    }
  });

  it('all affix values are positive', () => {
    for (let i = 0; i < 100; i++) {
      const eq = generateEquipment(`test-${i}`, EquipmentSlot.ACCESSORY, EquipmentRarity.DIVINE, CultivationRealm.GoldenCore);
      for (const affix of eq.affixes) {
        expect(affix.value).toBeGreaterThan(0);
        expect(affix.label.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── P1b: Affix effects in combat ───

describe.skip('Equipment affix effects in combat (P1b) — now server-authoritative', () => {
  it('attack affix adds to effectiveAttack', () => {
    const weapon = generateEquipment('w1', EquipmentSlot.WEAPON, EquipmentRarity.MORTAL, CultivationRealm.Mortal);
    weapon.affixes = [{ stat: 'attack', value: 15, label: '攻击+15' }];
    weapon.baseStats.attack = 0; // isolate affix from baseStats

    initPlayer({
      stats: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, attack: 10, defense: 5, exp: 0, maxExp: 10000 },
      equipmentSlots: { [EquipmentSlot.WEAPON]: weapon },
    });

    useGameStore.getState().updateNPCs();
    const monster = useGameStore.getState().wildMonsters.find(m => m.id === 'mon-1');
    // effectiveAttack = 10 (base) + 15 (affix) = 25
    // baseDmg = calculateDamage(25, 5) = floor(625/30) = 20
    // Monster HP = 500 - 20 = 480
    expect(monster!.hp).toBe(480);
  });

  it('defense affix reduces incoming damage', () => {
    const armor = generateEquipment('a1', EquipmentSlot.ARMOR, EquipmentRarity.MORTAL, CultivationRealm.Mortal);
    armor.affixes = [{ stat: 'defense', value: 20, label: '防御+20' }];
    armor.baseStats.defense = 0;

    initPlayer({
      stats: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, attack: 100, defense: 5, exp: 0, maxExp: 10000 },
      equipmentSlots: { [EquipmentSlot.ARMOR]: armor },
    });

    useGameStore.getState().updateNPCs();
    const player = useGameStore.getState().player;
    // effectiveDefense = 5 (base) + 20 (affix) = 25
    // monsterDmg = calculateDamage(monster.attack=10, 25) = floor(100/35) = 2
    // Player HP = 1000 - 2 = 998 (or could be less from other sources)
    expect(player!.stats.hp).toBeGreaterThanOrEqual(997);
  });

  it('expRate affix increases experience gain', () => {
    const artifact = generateEquipment('art1', EquipmentSlot.ARTIFACT, EquipmentRarity.MORTAL, CultivationRealm.Mortal);
    artifact.affixes = [{ stat: 'expRate', value: 100, label: '经验+100%' }]; // 100% bonus = 2x
    artifact.baseStats = {};

    initPlayer({
      stats: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, attack: 1000, defense: 5, exp: 0, maxExp: 10000 },
      equipmentSlots: { [EquipmentSlot.ARTIFACT]: artifact },
      inventory: { '灵石': 0 },
    });

    useGameStore.getState().updateNPCs();
    const player = useGameStore.getState().player;
    // Monster should be dead (attack=1000, baseDmg=calculateDamage(1000,5)=995 > 500HP)
    // Dead monsters are filtered from wildMonsters, so just verify exp was gained with 100% bonus
    // expGain = 30 * (1 + 100/100) = 60
    expect(player!.stats.exp).toBe(60);
  });

  it('crit increases damage dealt', () => {
    // Force a crit by making critRate 100% via forced affix
    const weapon = generateEquipment('w-crit', EquipmentSlot.WEAPON, EquipmentRarity.MORTAL, CultivationRealm.Mortal);
    weapon.affixes = [{ stat: 'critRate', value: 100, label: '暴击+100%' }];
    weapon.baseStats = { attack: 0 };

    initPlayer({
      stats: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, attack: 100, defense: 5, exp: 0, maxExp: 10000 },
      equipmentSlots: { [EquipmentSlot.WEAPON]: weapon },
    });

    useGameStore.getState().updateNPCs();
    const monster = useGameStore.getState().wildMonsters.find(m => m.id === 'mon-1');
    // With crit: effectiveAttack=100, baseDmg = calculateDamage(100, 5) = floor(10000/105) = 95
    // critBonus = 1.5, finalDmg = floor(95 * 1.5) = 142
    // Monster HP = 500 - 142 = 358
    expect(monster!.hp).toBe(358);
  });

  it('lifesteal affix heals the player on hit', () => {
    const weapon = generateEquipment('w-ls', EquipmentSlot.WEAPON, EquipmentRarity.MORTAL, CultivationRealm.Mortal);
    weapon.affixes = [{ stat: 'lifesteal', value: 100, label: '吸血+100%' }];
    weapon.baseStats = { attack: 0 };

    initPlayer({
      stats: { hp: 500, maxHp: 1000, mp: 100, maxMp: 100, attack: 100, defense: 5, exp: 0, maxExp: 10000 },
      equipmentSlots: { [EquipmentSlot.WEAPON]: weapon },
    });

    useGameStore.getState().updateNPCs();
    const player = useGameStore.getState().player;
    // With lifesteal 100%: should heal for full damage dealt (up to maxHp)
    // effectiveAttack=100, baseDmg = calculateDamage(100, 5) = 95
    // lifesteal = 100% of 95 = 95 hp healed
    // monsterDmg = calculateDamage(10, 5) = floor(100/15) = 6
    // HP = min(1000, 500 - 6 + 95) = min(1000, 589) = 589
    expect(player!.stats.hp).toBe(589);
  });
});
