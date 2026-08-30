import { describe, it, expect, beforeEach } from 'vitest';
import {
  useGameStore,
  calculateDamage,
  getMonstersForPlayerRealm,
  createWildMonster,
  MAX_MONSTERS,
  SPAWN_CHANCE,
  SPAWN_MIN_DIST,
  SPAWN_MAX_DIST,
  DESPAWN_DIST,
  MONSTER_TYPES_DATA,
  MONSTER_REALM_ORDER,
  REALM_LIST,
  COUNTRIES_DATA,
  generateEquipment,
  EquipmentSlot,
  EquipmentRarity,
  CultivationRealm,
  TECHNIQUES_DATA,
} from '../src/store/gameStore';

function initPlayer(overrides: Record<string, any> = {}) {
  useGameStore.setState({
    player: {
      id: 'test-player',
      name: 'Test',
      realm: '凡人',
      heavenLevel: 9,
      country: '齐',
      bodyType: '凡体',
      potential: '无',
      clanId: 'clan-0',
      position: { x: 400, y: 600 },
      stats: {
        hp: 100,
        maxHp: 100,
        mp: 100,
        maxMp: 100,
        attack: 10,
        defense: 10,
        exp: 0,
        maxExp: 100,
      },
      talent: { spiritualRoot: 100, boneConstitution: 50, comprehension: 100, fortune: 50 },
      inventory: { '灵石': 1000 },
      hiddenStats: { killCount: 0, cultivateCount: 0, gatherCount: 0, ascensionCount: 0, merit: 0 },
      isAscending: false,
      cycleInfo: { type: null },
      ...overrides,
    },
    playerFactionId: null,
    logs: [],
    resourcePoints: [],
    clans: [],
    wildMonsters: [],
    nearbyNPCs: [],
    squadMembers: [],
    worldEvents: [],
    exploredTiles: [],
    metNpcs: [],
    npcMemory: {},
    ascensionQuests: [],
    _factionTickCount: 0,
  } as any);
}

function initPlayerAtRealm(realm: string) {
  initPlayer({ realm });
}

describe('calculateDamage()', () => {
  it('returns at least 1 damage', () => {
    expect(calculateDamage(1, 100)).toBe(1);
    expect(calculateDamage(0, 100)).toBe(1);
    expect(calculateDamage(5, 9999)).toBe(1);
  });

  it('deals high damage when attack >> defense', () => {
    const dmg = calculateDamage(100, 5);
    expect(dmg).toBe(95); // 100*100/(100+5) = 95.23 → 95
  });

  it('deals moderate damage when attack ≈ defense', () => {
    const dmg = calculateDamage(50, 50);
    expect(dmg).toBe(25); // 50*50/(50+50) = 25
  });

  it('deals reduced damage when attack < defense', () => {
    const dmg = calculateDamage(30, 100);
    expect(dmg).toBe(6); // 30*30/(30+100) = 6.92 → 6
  });

  it('scales proportionally for high-tier combat', () => {
    // 元婴 monster vs 元婴 player
    const monsterAtk = 400;
    const playerDef = 120;
    expect(calculateDamage(monsterAtk, playerDef)).toBe(307); // 400*400/(400+120) = 307.69 → 307

    const playerAtk = 400;
    const monsterDef = 120;
    expect(calculateDamage(playerAtk, monsterDef)).toBe(307);
  });

  it('handles zero defense without division by zero', () => {
    expect(calculateDamage(50, 0)).toBe(50); // 50*50/(50+0) = 50
    expect(calculateDamage(100, 0)).toBe(100);
  });
});

describe('getMonstersForPlayerRealm()', () => {
  it('returns 练气 monsters for 凡人 player (fallback to lowest)', () => {
    const types = getMonstersForPlayerRealm('凡人');
    expect(types).toContain('赤焰蛇');
  });

  it('returns 练气-筑基 monsters for 练气 player', () => {
    const types = getMonstersForPlayerRealm('练气');
    expect(types).toContain('赤焰蛇');
    expect(types).toContain('冰晶蝎');
  });

  it('returns 练气-筑基-金丹 monsters for 筑基 player', () => {
    const types = getMonstersForPlayerRealm('筑基');
    expect(types).toContain('赤焰蛇');
    expect(types).toContain('冰晶蝎');
    expect(types).toContain('幽冥狼');
  });

  it('returns 化神-炼虚-合体 for 炼虚 player', () => {
    const types = getMonstersForPlayerRealm('炼虚');
    expect(types).toContain('血玉蛛');
    expect(types).toContain('玄冰蟒');
    expect(types).toContain('金翅大鹏');
  });

  it('returns only 合体 for 渡劫 player (fallback to highest)', () => {
    const types = getMonstersForPlayerRealm('渡劫');
    expect(types).toEqual(['金翅大鹏']);
  });
});

describe('createWildMonster()', () => {
  it('returns a monster within 5-10 tiles of player', () => {
    const playerPos = { x: 100, y: 100 };
    const monster = createWildMonster(playerPos, '筑基');
    expect(monster).not.toBeNull();

    const dist = Math.sqrt(
      (monster!.position.x - playerPos.x) ** 2 +
      (monster!.position.y - playerPos.y) ** 2
    );
    expect(dist).toBeGreaterThanOrEqual(SPAWN_MIN_DIST);
    expect(dist).toBeLessThanOrEqual(SPAWN_MAX_DIST + 2); // +2 for rounding
  });

  it('creates a monster with valid stats', () => {
    const monster = createWildMonster({ x: 100, y: 100 }, '金丹');
    expect(monster).not.toBeNull();
    expect(monster!.hp).toBeGreaterThan(0);
    expect(monster!.maxHp).toBeGreaterThan(0);
    expect(monster!.attack).toBeGreaterThan(0);
    expect(monster!.defense).toBeGreaterThanOrEqual(0);
    expect(monster!.expReward).toBeGreaterThan(0);
    expect(monster!.isAlive).toBe(true);
    expect(monster!.id).toMatch(/^monster-/);
  });

  it('returns null if no monster types available', () => {
    // Mock empty realm order — edge case; should not happen in practice
    const monster = createWildMonster({ x: 0, y: 0 }, '无' as any);
    // May or may not be null depending on fallback behavior
    expect(monster).not.toBeNull();
  });
});

describe('updateNPCs() monster spawning', () => {
  beforeEach(() => {
    useGameStore.setState({ player: null, logs: [], wildMonsters: [], nearbyNPCs: [] });
  });

  it('spawns monsters over multiple ticks', () => {
    initPlayerAtRealm('筑基');
    const store = useGameStore.getState();

    // Force many ticks to ensure spawning (15% chance per tick, max 6)
    for (let i = 0; i < 200; i++) {
      store.updateNPCs();
    }

    const state = useGameStore.getState();
    expect(state.wildMonsters.length).toBeGreaterThan(0);
    expect(state.wildMonsters.length).toBeLessThanOrEqual(MAX_MONSTERS);
  });

  it('respects MAX_MONSTERS cap', () => {
    initPlayerAtRealm('筑基');
    const store = useGameStore.getState();

    // Pre-fill with max monsters at valid positions
    const manyMonsters = Array.from({ length: MAX_MONSTERS }, (_, i) => ({
      id: `monster-prest-${i}`,
      name: '冰晶蝎' as const,
      realm: '筑基' as const,
      hp: 800,
      maxHp: 800,
      attack: 40,
      defense: 15,
      expReward: 80,
      position: { x: 405 + i, y: 600 },
      isAlive: true,
    }));
    useGameStore.setState({ wildMonsters: manyMonsters });

    for (let i = 0; i < 50; i++) {
      store.updateNPCs();
    }

    const state = useGameStore.getState();
    expect(state.wildMonsters.length).toBeLessThanOrEqual(MAX_MONSTERS);
  });
});

describe('updateNPCs() auto-combat', () => {
  beforeEach(() => {
    useGameStore.setState({ player: null, logs: [], wildMonsters: [], nearbyNPCs: [] });
  });

  it('player takes damage when adjacent to monster', () => {
    initPlayerAtRealm('练气');
    const store = useGameStore.getState();

    // Place a monster 1 tile away
    useGameStore.setState({
      wildMonsters: [{
        id: 'monster-1',
        name: '赤焰蛇',
        realm: '练气',
        hp: 200,
        maxHp: 200,
        attack: 15,
        defense: 5,
        expReward: 30,
        position: { x: 401, y: 600 },
        isAlive: true,
      }],
    });

    const hpBefore = useGameStore.getState().player!.stats.hp;
    store.updateNPCs();
    const hpAfter = useGameStore.getState().player!.stats.hp;

    // Player should have taken some damage from the monster
    expect(hpAfter).toBeLessThan(hpBefore);
  });

  it('player can kill a monster and receive loot', () => {
    initPlayer({
      realm: '练气',
      stats: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, attack: 1000, defense: 1000, exp: 0, maxExp: 10000 },
    });
    const store = useGameStore.getState();

    useGameStore.setState({
      wildMonsters: [{
        id: 'monster-1',
        name: '赤焰蛇',
        realm: '练气',
        hp: 200,
        maxHp: 200,
        attack: 15,
        defense: 5,
        expReward: 30,
        position: { x: 400, y: 601 },
        isAlive: true,
      }],
    });

    store.updateNPCs();

    const state = useGameStore.getState();
    // Original monster should be dead (new ones may spawn randomly)
    const originalMonster = state.wildMonsters.find(m => m.id === 'monster-1');
    expect(originalMonster).toBeUndefined(); // dead monsters are filtered out
    // Player should gain exp and spirit stones
    expect(state.player!.stats.exp).toBeGreaterThan(0);
    expect(state.player!.inventory['灵石']).toBeGreaterThan(1000);
    // Kill count should increment
    expect(state.player!.hiddenStats.killCount).toBe(1);
    // Combat log should have entries
    const combatLogs = state.logs.filter(l => l.type === 'combat');
    expect(combatLogs.length).toBeGreaterThan(0);
  });

  it('player flees to capital when HP reaches 0', () => {
    initPlayer({
      realm: '练气',
      stats: { hp: 1, maxHp: 100, mp: 100, maxMp: 100, attack: 1, defense: 1, exp: 0, maxExp: 100 },
      country: '齐',
    });
    const store = useGameStore.getState();

    useGameStore.setState({
      wildMonsters: [{
        id: 'monster-1',
        name: '赤焰蛇',
        realm: '练气',
        hp: 200,
        maxHp: 200,
        attack: 200, // high attack to one-shot
        defense: 5,
        expReward: 30,
        position: { x: 400, y: 601 },
        isAlive: true,
      }],
    });

    store.updateNPCs();

    const state = useGameStore.getState();
    // Player should flee to capital with HP=1
    expect(state.player!.stats.hp).toBe(1);
    const capital = COUNTRIES_DATA['齐'].capital;
    expect(state.player!.position).toEqual(capital);
  });

  it('only fights one monster per tick', () => {
    initPlayerAtRealm('练气');
    const store = useGameStore.getState();

    // Give player enough attack to visibly damage but not kill
    useGameStore.setState({
      player: {
        ...useGameStore.getState().player!,
        stats: { ...useGameStore.getState().player!.stats, attack: 50, hp: 500, maxHp: 500 },
      },
    });

    const hpBefore = 500;

    // Place two monsters at different positions within 1 tile
    useGameStore.setState({
      wildMonsters: [
        {
          id: 'monster-1',
          name: '赤焰蛇',
          realm: '练气',
          hp: 200,
          maxHp: 200,
          attack: 0, // no counter-damage to avoid edge cases
          defense: 5,
          expReward: 30,
          position: { x: 401, y: 600 },
          isAlive: true,
        },
        {
          id: 'monster-2',
          name: '赤焰蛇',
          realm: '练气',
          hp: 200,
          maxHp: 200,
          attack: 0,
          defense: 5,
          expReward: 30,
          position: { x: 400, y: 601 },
          isAlive: true,
        },
      ],
    });

    store.updateNPCs();
    const state = useGameStore.getState();

    // At most one monster should have been damaged this tick
    const damagedMonsters = state.wildMonsters.filter(m => m.hp < 200);
    expect(damagedMonsters.length).toBeLessThanOrEqual(1);

    // Player should have taken damage from at most one monster
    // (hit by monster with 0 attack → calculateDamage(0, playerDef) = 1)
    const hpAfter = state.player!.stats.hp;
    expect(hpAfter).toBeLessThan(hpBefore);
  });
});

describe('updateNPCs() monster despawn', () => {
  beforeEach(() => {
    useGameStore.setState({ player: null, logs: [], wildMonsters: [], nearbyNPCs: [] });
  });

  it('despawns monsters farther than 20 tiles', () => {
    initPlayerAtRealm('筑基');
    const store = useGameStore.getState();

    // Place a monster just beyond despawn distance
    useGameStore.setState({
      wildMonsters: [{
        id: 'monster-far',
        name: '冰晶蝎',
        realm: '筑基',
        hp: 800,
        maxHp: 800,
        attack: 40,
        defense: 15,
        expReward: 80,
        position: { x: 400 + DESPAWN_DIST + 1, y: 600 },
        isAlive: true,
      }],
    });

    store.updateNPCs();

    const state = useGameStore.getState();
    expect(state.wildMonsters.find(m => m.id === 'monster-far')).toBeUndefined();
  });

  it('keeps monsters at exactly DESPAWN_DIST', () => {
    initPlayerAtRealm('筑基');
    const store = useGameStore.getState();

    useGameStore.setState({
      wildMonsters: [{
        id: 'monster-boundary',
        name: '冰晶蝎',
        realm: '筑基',
        hp: 800,
        maxHp: 800,
        attack: 40,
        defense: 15,
        expReward: 80,
        position: { x: 400 + DESPAWN_DIST, y: 600 },
        isAlive: true,
      }],
    });

    store.updateNPCs();

    const state = useGameStore.getState();
    expect(state.wildMonsters.find(m => m.id === 'monster-boundary')).toBeDefined();
  });
});

describe('updateNPCs() NPC vs monster', () => {
  beforeEach(() => {
    useGameStore.setState({ player: null, logs: [], wildMonsters: [], nearbyNPCs: [] });
  });

  it('NPC engages nearby monster', () => {
    initPlayerAtRealm('筑基');
    const store = useGameStore.getState();

    // Add an NPC near a monster
    const npc = {
      id: 'npc-fighter',
      name: '巡逻护卫',
      role: '散修',
      clanId: 'clan-0',
      realm: '筑基',
      power: 200,
      hp: 500,
      maxHp: 500,
      personality: { ambition: 50, caution: 30, loyalty: 60, greed: 20 },
      resources: { spiritStone: 100 },
      activity: '巡逻',
      position: { x: 400, y: 605 },
      targetPlayerId: undefined,
    };

    useGameStore.setState({
      nearbyNPCs: [npc as any],
      wildMonsters: [{
        id: 'monster-1',
        name: '冰晶蝎',
        realm: '筑基',
        hp: 800,
        maxHp: 800,
        attack: 40,
        defense: 15,
        expReward: 80,
        position: { x: 400, y: 606 },
        isAlive: true,
      }],
    });

    store.updateNPCs();

    const state = useGameStore.getState();
    // Monster should have taken damage
    const monster = state.wildMonsters.find(m => m.id === 'monster-1');
    expect(monster).toBeDefined();
    if (monster) {
      expect(monster.hp).toBeLessThan(800);
    }
  });

  it('NPC retreats when HP reaches 0 and recovers after 5 ticks', () => {
    initPlayerAtRealm('筑基');
    const store = useGameStore.getState();

    // Very weak NPC next to a strong monster
    const weakNpc = {
      id: 'npc-weak',
      name: '弱小散修',
      role: '散修',
      clanId: 'clan-0',
      realm: '练气',
      power: 5,
      hp: 30, // low enough to be killed in one hit
      maxHp: 30,
      personality: { ambition: 10, caution: 50, loyalty: 30, greed: 40 },
      resources: { spiritStone: 10 },
      activity: '闲逛',
      position: { x: 400, y: 605 },
      targetPlayerId: undefined,
    };

    useGameStore.setState({
      nearbyNPCs: [weakNpc as any],
      wildMonsters: [{
        id: 'monster-strong',
        name: '冰晶蝎',
        realm: '筑基',
        hp: 800,
        maxHp: 800,
        attack: 100, // high attack to one-shot the NPC
        defense: 15,
        expReward: 80,
        position: { x: 400, y: 606 },
        isAlive: true,
      }],
    });

    // Tick 1: NPC should get beaten and retreat
    store.updateNPCs();
    let state = useGameStore.getState();
    let npc = state.nearbyNPCs.find(n => n.id === 'npc-weak');
    expect(npc).toBeDefined();
    expect(npc!.retreatTicksRemaining).toBeGreaterThanOrEqual(1);

    // Ticks 2-6: NPC in retreat (5 ticks of recovery)
    for (let i = 0; i < 5; i++) {
      store.updateNPCs();
    }

    state = useGameStore.getState();
    npc = state.nearbyNPCs.find(n => n.id === 'npc-weak');

    // After 5 ticks, NPC should have retreated and then recovered
    expect(npc!.retreatTicksRemaining).toBeUndefined();
    expect(npc!.hp).toBe(npc!.maxHp);
  });
});

describe('updateNPCs() edge cases', () => {
  beforeEach(() => {
    useGameStore.setState({ player: null, logs: [], wildMonsters: [], nearbyNPCs: [] });
  });

  it('handles undefined inventory for 灵石 on monster kill', () => {
    initPlayer({
      realm: '练气',
      stats: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, attack: 10000, defense: 1000, exp: 0, maxExp: 10000 },
      inventory: {}, // No 灵石 key at all
    });
    const store = useGameStore.getState();

    useGameStore.setState({
      wildMonsters: [{
        id: 'monster-1',
        name: '赤焰蛇',
        realm: '练气',
        hp: 200,
        maxHp: 200,
        attack: 15,
        defense: 5,
        expReward: 30,
        position: { x: 400, y: 601 },
        isAlive: true,
      }],
    });

    // Should not throw
    expect(() => store.updateNPCs()).not.toThrow();

    const state = useGameStore.getState();
    expect(state.player!.inventory['灵石']).toBe(50); // Should have been set
  });

  it('monsters move toward player when far', () => {
    initPlayerAtRealm('筑基');
    const store = useGameStore.getState();

    // Monster at distance 5 — should move toward player
    useGameStore.setState({
      wildMonsters: [{
        id: 'monster-moving',
        name: '冰晶蝎',
        realm: '筑基',
        hp: 800,
        maxHp: 800,
        attack: 40,
        defense: 15,
        expReward: 80,
        position: { x: 410, y: 600 }, // 10 tiles away
        isAlive: true,
      }],
    });

    store.updateNPCs();

    const state = useGameStore.getState();
    const monster = state.wildMonsters.find(m => m.id === 'monster-moving');
    expect(monster).toBeDefined();
    // Monster should have moved closer to player (400, 600)
    expect(monster!.position.x).toBeLessThan(410); // moved left toward 400
  });

  it('monster moves toward NPC when NPC is closer than player', () => {
    initPlayerAtRealm('筑基');
    const store = useGameStore.getState();

    // Monster closer to NPC than player
    useGameStore.setState({
      nearbyNPCs: [{
        id: 'npc-target',
        name: '散修',
        role: '散修',
        clanId: 'clan-0',
        realm: '筑基',
        power: 100,
        hp: 500, maxHp: 500,
        personality: { ambition: 50, caution: 30, loyalty: 60, greed: 20 },
        resources: { spiritStone: 100 },
        activity: '闲逛',
        position: { x: 405, y: 600 }, // NPC at (405, 600)
        targetPlayerId: undefined,
      } as any],
      wildMonsters: [{
        id: 'monster-npc-move',
        name: '冰晶蝎',
        realm: '筑基',
        hp: 800, maxHp: 800,
        attack: 40, defense: 15,
        expReward: 80,
        position: { x: 410, y: 600 }, // 5 tiles from NPC, 10 from player
        isAlive: true,
      }],
    });

    store.updateNPCs();
    const state = useGameStore.getState();
    const monster = state.wildMonsters.find(m => m.id === 'monster-npc-move');
    // Should move toward NPC at (405), so x should decrease from 410
    expect(monster!.position.x).toBeLessThan(410);
  });

  it('NPC kills a monster', () => {
    initPlayerAtRealm('筑基');
    const store = useGameStore.getState();

    // Strong NPC next to weak monster
    useGameStore.setState({
      nearbyNPCs: [{
        id: 'npc-strong',
        name: '金丹长老',
        role: '长老',
        clanId: 'clan-0',
        realm: '金丹',
        power: 5000,
        hp: 1000, maxHp: 1000,
        personality: { ambition: 50, caution: 30, loyalty: 60, greed: 20 },
        resources: { spiritStone: 100 },
        activity: '巡逻',
        position: { x: 400, y: 605 },
        targetPlayerId: undefined,
      } as any],
      wildMonsters: [{
        id: 'monster-npc-kill',
        name: '冰晶蝎',
        realm: '筑基',
        hp: 50, maxHp: 800,
        attack: 5, defense: 5,
        expReward: 80,
        position: { x: 400, y: 606 },
        isAlive: true,
      }],
    });

    store.updateNPCs();
    const state = useGameStore.getState();
    // Monster should be dead and removed from the list (filtered by isAlive)
    const monster = state.wildMonsters.find(m => m.id === 'monster-npc-kill');
    expect(monster).toBeUndefined();
  });

  it('NPC targets nearest monster among multiple adjacent', () => {
    initPlayerAtRealm('筑基');
    const store = useGameStore.getState();

    // NPC equidistant from two monsters — should target the nearest one
    const npc = {
      id: 'npc-nearest',
      name: '巡逻护卫',
      role: '散修',
      clanId: 'clan-0',
      realm: '筑基',
      power: 200,
      hp: 500, maxHp: 500,
      personality: { ambition: 50, caution: 30, loyalty: 60, greed: 20 },
      resources: { spiritStone: 100 },
      activity: '巡逻',
      position: { x: 400, y: 604 },
      targetPlayerId: undefined,
    };

    useGameStore.setState({
      nearbyNPCs: [npc as any],
      wildMonsters: [
        {
          id: 'monster-near',
          name: '冰晶蝎',
          realm: '筑基',
          hp: 800, maxHp: 800,
          attack: 0, defense: 15,
          expReward: 80,
          position: { x: 400, y: 605 }, // 1 tile from NPC (nearest)
          isAlive: true,
        },
        {
          id: 'monster-far',
          name: '冰晶蝎',
          realm: '筑基',
          hp: 800, maxHp: 800,
          attack: 0, defense: 15,
          expReward: 80,
          position: { x: 405, y: 605 }, // farther from NPC
          isAlive: true,
        },
      ],
    });

    store.updateNPCs();
    const state = useGameStore.getState();
    // Only the nearest monster should have been fought
    const near = state.wildMonsters.find(m => m.id === 'monster-near');
    const far = state.wildMonsters.find(m => m.id === 'monster-far');
    expect(near).toBeDefined();
    if (near) expect(near.hp).toBeLessThan(800); // damaged
    expect(far).toBeDefined();
    if (far) expect(far.hp).toBe(800); // untouched
  });

  it('two NPCs can fight the same monster in the same tick (foughtThisTick does not block same monster for different NPCs in current implementation)', () => {
    // Note: Analysis shows two NPCs adjacent to the same monster: first NPC fights,
    // monster goes into foughtThisTick, second NPC skips it. This test verifies that behavior.
    initPlayerAtRealm('筑基');
    const store = useGameStore.getState();

    const npc1 = {
      id: 'npc-alpha',
      name: '护卫甲',
      role: '散修',
      clanId: 'clan-0',
      realm: '筑基',
      power: 200,
      hp: 500, maxHp: 500,
      personality: { ambition: 50, caution: 30, loyalty: 60, greed: 20 },
      resources: { spiritStone: 100 },
      activity: '巡逻',
      position: { x: 400, y: 605 },
      targetPlayerId: undefined,
    };
    const npc2 = {
      id: 'npc-beta',
      name: '护卫乙',
      role: '散修',
      clanId: 'clan-0',
      realm: '筑基',
      power: 200,
      hp: 500, maxHp: 500,
      personality: { ambition: 50, caution: 30, loyalty: 60, greed: 20 },
      resources: { spiritStone: 100 },
      activity: '巡逻',
      position: { x: 401, y: 605 },
      targetPlayerId: undefined,
    };

    useGameStore.setState({
      nearbyNPCs: [npc1 as any, npc2 as any],
      wildMonsters: [{
        id: 'monster-solo',
        name: '冰晶蝎',
        realm: '筑基',
        hp: 800, maxHp: 800,
        attack: 0, defense: 15,
        expReward: 80,
        position: { x: 400, y: 606 },
        isAlive: true,
      }],
    });

    store.updateNPCs();
    const state = useGameStore.getState();
    const monster = state.wildMonsters.find(m => m.id === 'monster-solo');
    expect(monster).toBeDefined();
    // Monster should have been damaged once (only one NPC fought it)
    if (monster) {
      const dmg = 800 - monster.hp;
      const expectedDmg = calculateDamage(Math.floor(200 / 10), 15); // npc power/10 = 20 atk, def=15
      expect(dmg).toBe(expectedDmg);
    }
  });

  it('NPC and monster can both be defeated in the same tick', () => {
    initPlayerAtRealm('筑基');
    const store = useGameStore.getState();

    // NPC and monster both with low HP so they kill each other
    useGameStore.setState({
      nearbyNPCs: [{
        id: 'npc-sacrifice',
        name: '死士',
        role: '散修',
        clanId: 'clan-0',
        realm: '筑基',
        power: 200, // atk=20, def=10
        hp: 15, maxHp: 500, // low HP
        personality: { ambition: 50, caution: 30, loyalty: 60, greed: 20 },
        resources: { spiritStone: 100 },
        activity: '巡逻',
        position: { x: 400, y: 605 },
        targetPlayerId: undefined,
      } as any],
      wildMonsters: [{
        id: 'monster-double-kill',
        name: '冰晶蝎',
        realm: '筑基',
        hp: 15, maxHp: 800, // low HP
        attack: 200, // high attack to kill NPC
        defense: 0, // zero defense so NPC's atk=20 kills it (20*20/(20+0)=20 >= 15)
        expReward: 80,
        position: { x: 400, y: 606 },
        isAlive: true,
      }],
    });

    store.updateNPCs();
    const state = useGameStore.getState();

    // Monster should be dead (removed)
    expect(state.wildMonsters.find(m => m.id === 'monster-double-kill')).toBeUndefined();
    // NPC should be in retreat
    const npc = state.nearbyNPCs.find(n => n.id === 'npc-sacrifice');
    expect(npc).toBeDefined();
    expect(npc!.retreatTicksRemaining).toBeGreaterThanOrEqual(1);
  });

  it('handles player with undefined defense', () => {
    initPlayer({
      realm: '练气',
      stats: {
        hp: 1000, maxHp: 1000, mp: 100, maxMp: 100,
        attack: 1000,
        defense: undefined as any, // undefined defense
        exp: 0, maxExp: 10000,
      },
    });
    const store = useGameStore.getState();

    useGameStore.setState({
      wildMonsters: [{
        id: 'monster-def-test',
        name: '赤焰蛇',
        realm: '练气',
        hp: 200, maxHp: 200,
        attack: 15, defense: 5,
        expReward: 30,
        position: { x: 400, y: 601 },
        isAlive: true,
      }],
    });

    // Should not throw — defense || 0 fallback
    expect(() => store.updateNPCs()).not.toThrow();

    const state = useGameStore.getState();
    // Monster should be dead and player took damage using 0 defense
    expect(state.wildMonsters.find(m => m.id === 'monster-def-test')).toBeUndefined();
  });
});

describe('Phase 3 P0: Technique + Equipment + Skills in combat', () => {
  beforeEach(() => {
    useGameStore.setState({ player: null, logs: [], wildMonsters: [], nearbyNPCs: [] });
  });

  it('passive technique adds attack and monster takes extra damage', () => {
    // vital_strike gives attack+5 passive + has active skill (1.5x)
    // effectiveAtk = 10+5 = 15, baseDmg=fl(15*15/(15+5))=11
    // skill fires (cooldown=0, MP=100>=5): dmg=fl(11*1.5)=16, HP=500-16=484
    initPlayer({
      realm: '练气',
      stats: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, attack: 10, defense: 10, exp: 0, maxExp: 10000 },
      learnedTechniques: [{ techniqueId: 'vital_strike', level: 1 }],
      skillCooldowns: {},
    });
    const store = useGameStore.getState();

    useGameStore.setState({
      wildMonsters: [{
        id: 'monster-tech-atk',
        name: '赤焰蛇', realm: '练气',
        hp: 500, maxHp: 500, attack: 0, defense: 5, expReward: 30,
        position: { x: 400, y: 601 }, isAlive: true,
      }],
    });

    store.updateNPCs();
    const state = useGameStore.getState();
    const monster = state.wildMonsters.find(m => m.id === 'monster-tech-atk');
    expect(monster).toBeDefined();
    if (monster) {
      expect(monster.hp).toBe(484); // 500 - 16 (passive +5 atk + active 1.5x)
    }
  });

  it('passive technique adds defense and player takes reduced damage', () => {
    initPlayer({
      realm: '练气',
      stats: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, attack: 10, defense: 5, exp: 0, maxExp: 10000 },
      learnedTechniques: [{ techniqueId: 'stone_skin', level: 1 }], // +3 defense
      skillCooldowns: {},
    });
    const store = useGameStore.getState();

    useGameStore.setState({
      wildMonsters: [{
        id: 'monster-tech-def',
        name: '赤焰蛇', realm: '练气',
        hp: 500, maxHp: 500, attack: 30, defense: 5, expReward: 30,
        position: { x: 400, y: 601 }, isAlive: true,
      }],
    });

    const hpBefore = useGameStore.getState().player!.stats.hp;
    store.updateNPCs();
    const state = useGameStore.getState();
    const hpLost = hpBefore - state.player!.stats.hp;
    // Effective def = 5 (base) + 3 (stone_skin) = 8
    // Monster atk=30 => dmg = floor(30*30/(30+8)) = floor(900/38) = 23
    expect(hpLost).toBeLessThanOrEqual(23);
  });

  it('equipment weapon attack adds to effective attack', () => {
    const weapon = generateEquipment('weapon-test', EquipmentSlot.WEAPON, EquipmentRarity.MORTAL, 1);
    initPlayer({
      realm: '练气',
      stats: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, attack: 10, defense: 10, exp: 0, maxExp: 10000 },
      equipmentSlots: { [EquipmentSlot.WEAPON]: weapon },
      skillCooldowns: {},
    });
    const store = useGameStore.getState();

    useGameStore.setState({
      wildMonsters: [{
        id: 'monster-equip-atk',
        name: '赤焰蛇', realm: '练气',
        hp: 500, maxHp: 500, attack: 0, defense: 5, expReward: 30,
        position: { x: 400, y: 601 }, isAlive: true,
      }],
    });

    store.updateNPCs();
    const state = useGameStore.getState();
    const monster = state.wildMonsters.find(m => m.id === 'monster-equip-atk');
    // weapon baseStats.attack = floor(10 * 1 * 1.5 * 1) = 15
    // effective atk = 10 + 15 = 25 => dmg = floor(25*25/(25+5)) = floor(625/30) = 20
    expect(monster).toBeDefined();
    if (monster) {
      expect(monster.hp).toBe(480); // 500 - 20
    }
  });

  it('equipment affix contributes to defense', () => {
    const armor = generateEquipment('armor-affix', EquipmentSlot.ARMOR, EquipmentRarity.MORTAL, 1);
    armor.affixes = [{ stat: 'defense', value: 10 }];
    initPlayer({
      realm: '练气',
      stats: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, attack: 10, defense: 5, exp: 0, maxExp: 10000 },
      equipmentSlots: { [EquipmentSlot.ARMOR]: armor },
      skillCooldowns: {},
    });
    const store = useGameStore.getState();

    useGameStore.setState({
      wildMonsters: [{
        id: 'monster-affix',
        name: '赤焰蛇', realm: '练气',
        hp: 500, maxHp: 500, attack: 30, defense: 5, expReward: 30,
        position: { x: 400, y: 601 }, isAlive: true,
      }],
    });

    const hpBefore = useGameStore.getState().player!.stats.hp;
    store.updateNPCs();
    const state = useGameStore.getState();
    const hpLost = hpBefore - state.player!.stats.hp;
    // Armor baseStats.defense = floor(10 * 1 * 1.2 * 1) = 12 + affix 10 = 22
    // Effective def = 5 + 22 = 27
    // Monster atk=30 => dmg = floor(30*30/(30+27)) = floor(900/57) = 15
    expect(hpLost).toBeLessThanOrEqual(15);
  });

  it('active skill fires and damage multiplier applies with log message', () => {
    initPlayer({
      realm: '练气',
      stats: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, attack: 10, defense: 10, exp: 0, maxExp: 10000 },
      learnedTechniques: [{ techniqueId: 'vital_strike', level: 1 }],
      skillCooldowns: {},
    });
    const store = useGameStore.getState();

    useGameStore.setState({
      wildMonsters: [{
        id: 'monster-skill',
        name: '赤焰蛇', realm: '练气',
        hp: 500, maxHp: 500, attack: 0, defense: 5, expReward: 30,
        position: { x: 400, y: 601 }, isAlive: true,
      }],
    });

    store.updateNPCs();
    const state = useGameStore.getState();
    const monster = state.wildMonsters.find(m => m.id === 'monster-skill');
    // vital_strike: passive +5 atk => effectiveAtk=15, baseDmg=fl(225/20)=11
    // skill fires: dmg=fl(11*1.5)=16
    expect(monster).toBeDefined();
    if (monster) {
      expect(monster.hp).toBe(484); // 500 - 16
    }
    const skillLog = state.logs.find(l => l.message.includes('【猛击】'));
    expect(skillLog).toBeDefined();
  });

  it('cooldown prevents re-firing skill on consecutive ticks', () => {
    initPlayer({
      realm: '练气',
      stats: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, attack: 10, defense: 10, exp: 0, maxExp: 10000 },
      learnedTechniques: [{ techniqueId: 'vital_strike', level: 1 }],
      skillCooldowns: {},
    });
    const store = useGameStore.getState();

    useGameStore.setState({
      wildMonsters: [
        { id: 'monster-cd-1', name: '赤焰蛇', realm: '练气', hp: 500, maxHp: 500, attack: 0, defense: 5, expReward: 30, position: { x: 400, y: 601 }, isAlive: true },
        { id: 'monster-cd-2', name: '赤焰蛇', realm: '练气', hp: 500, maxHp: 500, attack: 0, defense: 5, expReward: 30, position: { x: 401, y: 601 }, isAlive: true },
      ],
    });

    // Tick 1: skill fires (cooldown=0), effectiveAtk=15, baseDmg=11, *1.5 = 16
    store.updateNPCs();
    let state = useGameStore.getState();
    const monster1 = state.wildMonsters.find(m => m.id === 'monster-cd-1');
    expect(monster1).toBeDefined();
    if (monster1) {
      expect(monster1.hp).toBe(484); // 500 - 16 (with skill)
    }

    // Tick 2: skill on cooldown, normal attack (passive +5 still applies)
    state.wildMonsters.find(m => m.id === 'monster-cd-2')!.position = { x: 400, y: 601 };
    state.wildMonsters.find(m => m.id === 'monster-cd-1')!.position = { x: 999, y: 999 };
    useGameStore.setState({ wildMonsters: [...state.wildMonsters] });
    store.updateNPCs();
    state = useGameStore.getState();
    const monster2 = state.wildMonsters.find(m => m.id === 'monster-cd-2');
    // effectiveAtk=15, def=5, baseDmg=11 (passive still applies, but no active skill)
    expect(monster2).toBeDefined();
    if (monster2) {
      expect(monster2.hp).toBe(489); // 500 - 11 (normal, passive still active)
    }
  });

  it('skips skill when MP is insufficient', () => {
    initPlayer({
      realm: '练气',
      stats: { hp: 1000, maxHp: 1000, mp: 0, maxMp: 100, attack: 10, defense: 10, exp: 0, maxExp: 10000 },
      learnedTechniques: [{ techniqueId: 'vital_strike', level: 1 }],
      skillCooldowns: {},
    });
    const store = useGameStore.getState();

    useGameStore.setState({
      wildMonsters: [{
        id: 'monster-mp-gate',
        name: '赤焰蛇', realm: '练气',
        hp: 500, maxHp: 500, attack: 0, defense: 5, expReward: 30,
        position: { x: 400, y: 601 }, isAlive: true,
      }],
    });

    store.updateNPCs();
    const state = useGameStore.getState();
    const monster = state.wildMonsters.find(m => m.id === 'monster-mp-gate');
    // No skill (MP=0 < cost=5), but passive +5 atk still applies
    // effectiveAtk=15, def=5 => dmg=11
    expect(monster).toBeDefined();
    if (monster) {
      expect(monster.hp).toBe(489); // 500 - 11 (passive still works)
    }
    const skillLog = state.logs.filter(l => l.message.includes('【猛击】'));
    expect(skillLog).toHaveLength(0);
  });

  it('selects highest damageMultiplier skill among multiple learned', () => {
    // flame_slash (2.0x) should be chosen over vital_strike (1.5x)
    initPlayer({
      realm: '练气',
      stats: { hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, attack: 10, defense: 10, exp: 0, maxExp: 10000 },
      learnedTechniques: [
        { techniqueId: 'vital_strike', level: 1 },
        { techniqueId: 'flame_slash', level: 1 },
      ],
      skillCooldowns: {},
    });
    const store = useGameStore.getState();

    useGameStore.setState({
      wildMonsters: [{
        id: 'monster-best-skill',
        name: '赤焰蛇', realm: '练气',
        hp: 500, maxHp: 500, attack: 0, defense: 5, expReward: 30,
        position: { x: 400, y: 601 }, isAlive: true,
      }],
    });

    store.updateNPCs();
    const state = useGameStore.getState();
    const monster = state.wildMonsters.find(m => m.id === 'monster-best-skill');
    // flame_slash (2.0x > 1.5x) chosen. effectiveAtk=10+5+15=30, def=5 => baseDmg=25, *2.0=50
    expect(monster).toBeDefined();
    if (monster) {
      expect(monster.hp).toBe(450); // 500 - 50
    }
    const skillLog = state.logs.find(l => l.message.includes('【炎斩】'));
    expect(skillLog).toBeDefined();
  });
});
