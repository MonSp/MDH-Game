import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, HEAVEN_MAX_REALM, REALM_BREAKTHROUGH_COST, REALM_MAX_EXP, REALM_LIST } from '../src/store/gameStore';

// Helper: initialize store with a fresh player state
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
      talent: {
        spiritualRoot: 100,
        boneConstitution: 50,
        comprehension: 100,
        fortune: 50,
      },
      inventory: { '灵石': 1000 },
      hiddenStats: { killCount: 0, cultivateCount: 0, gatherCount: 0, ascensionCount: 0, merit: 0 },
      isAscending: false,
      cycleInfo: { type: null },
      ...overrides,
    },
    logs: [],
    resourcePoints: [],
    clans: [],
  } as any);
}

describe('cultivate()', () => {
  beforeEach(() => {
    useGameStore.setState({ player: null, logs: [] });
  });

  it('increases exp when player cultivates', () => {
    initPlayer({ stats: { hp: 100, maxHp: 100, mp: 100, maxMp: 100, attack: 10, defense: 10, exp: 0, maxExp: 100 } });
    const store = useGameStore.getState();
    store.cultivate();
    const state = useGameStore.getState();
    expect(state.player!.stats.exp).toBeGreaterThan(0);
    expect(state.player!.stats.exp).toBeLessThanOrEqual(100);
  });

  it('caps exp at maxExp without auto-breakthrough when exp fills naturally', () => {
    // Set exp just below maxExp so one cultivate fills it
    initPlayer({ stats: { hp: 100, maxHp: 100, mp: 100, maxMp: 100, attack: 10, defense: 10, exp: 90, maxExp: 100 } });
    const store = useGameStore.getState();
    store.cultivate();
    const state = useGameStore.getState();
    // exp should be capped at maxExp, not at 0 (which would mean breakthrough happened)
    expect(state.player!.stats.exp).toBe(100);
    // realm should not have changed
    expect(state.player!.realm).toBe('凡人');
    // spirit stones should not have been consumed
    expect(state.player!.inventory['灵石']).toBe(1000);
  });

  it('does nothing when player is null', () => {
    useGameStore.setState({ player: null } as any);
    const store = useGameStore.getState();
    // Should not throw
    expect(() => store.cultivate()).not.toThrow();
  });
});

describe('cultivate() — breakthrough', () => {
  beforeEach(() => {
    useGameStore.setState({ player: null, logs: [] });
  });

  it('breaks through when exp is already full (wasExpFull=true) and has enough stones', () => {
    const cost = REALM_BREAKTHROUGH_COST['凡人'];
    initPlayer({
      realm: '凡人',
      stats: { hp: 100, maxHp: 100, mp: 100, maxMp: 100, attack: 10, defense: 10, exp: 100, maxExp: 100 },
      inventory: { '灵石': cost + 100 },
    });
    const store = useGameStore.getState();
    store.cultivate();
    const state = useGameStore.getState();
    // Should have broken through to 练气
    expect(state.player!.realm).toBe('练气');
    // Stones should be consumed
    expect(state.player!.inventory['灵石']).toBeLessThan(cost + 100);
    // Exp should be 0 in new realm
    expect(state.player!.stats.exp).toBe(0);
  });

  it('does not break through when exp is full but stones are insufficient', () => {
    initPlayer({
      realm: '凡人',
      stats: { hp: 100, maxHp: 100, mp: 100, maxMp: 100, attack: 10, defense: 10, exp: 100, maxExp: 100 },
      inventory: { '灵石': 0 },
    });
    const store = useGameStore.getState();
    store.cultivate();
    const state = useGameStore.getState();
    // Realm should not change
    expect(state.player!.realm).toBe('凡人');
    // Exp stays at maxExp
    expect(state.player!.stats.exp).toBe(100);
  });

  it('does not break through when at max realm for heaven level', () => {
    initPlayer({
      realm: '化神',
      heavenLevel: 9,
      stats: { hp: 10000, maxHp: 10000, mp: 10000, maxMp: 10000, attack: 1000, defense: 1000, exp: 100000, maxExp: 100000 },
      inventory: { '灵石': 999999 },
    });
    const store = useGameStore.getState();
    store.cultivate();
    const state = useGameStore.getState();
    // Should not change realm
    expect(state.player!.realm).toBe('化神');
  });

  it('comprehension reduces breakthrough cost', () => {
    initPlayer({
      realm: '凡人',
      talent: { spiritualRoot: 100, boneConstitution: 50, comprehension: 100, fortune: 50 },
      stats: { hp: 100, maxHp: 100, mp: 100, maxMp: 100, attack: 10, defense: 10, exp: 100, maxExp: 100 },
      inventory: { '灵石': REALM_BREAKTHROUGH_COST['凡人'] + 100 },
    });
    const initialStones = REALM_BREAKTHROUGH_COST['凡人'] + 100;
    const store = useGameStore.getState();
    store.cultivate();
    const state = useGameStore.getState();
    // comprehension 100 / 200 = 0.5 discount factor → cost = baseCost * 0.5
    const discountedCost = Math.floor(REALM_BREAKTHROUGH_COST['凡人'] * (1 - 100 / 200));
    // Stones spent should equal the discounted cost
    const stonesSpent = initialStones - state.player!.inventory['灵石'];
    expect(stonesSpent).toBe(discountedCost);
  });
});

describe('interactWithResource() — fortune double yield', () => {
  beforeEach(() => {
    useGameStore.setState({ player: null, logs: [] });
  });

  it('灵田 yields double exp when fortune procs', () => {
    // Force fortune to proc by setting fortune=100 (100% chance)
    initPlayer({
      talent: { spiritualRoot: 100, boneConstitution: 50, comprehension: 100, fortune: 100 },
      stats: { hp: 100, maxHp: 100, mp: 100, maxMp: 100, attack: 10, defense: 10, exp: 0, maxExp: 1000 },
    });
    const store = useGameStore.getState();
    // Place resource at player position
    useGameStore.setState({
      resourcePoints: [{
        id: 'test-field',
        type: '灵田',
        amount: 100,
        position: { x: 400, y: 600 },
      }],
      player: store.player ? { ...store.player, position: { x: 400, y: 600 } } : null,
    } as any);

    const s = useGameStore.getState();
    s.interactWithResource('test-field');
    const state = useGameStore.getState();
    // With fortune=100, should proc → 30*2 = 60 exp
    expect(state.player!.stats.exp).toBe(60);
  });

  it('灵田 yields normal exp when fortune does not proc', () => {
    // Force no proc by setting fortune=0
    initPlayer({
      talent: { spiritualRoot: 100, boneConstitution: 50, comprehension: 100, fortune: 0 },
      stats: { hp: 100, maxHp: 100, mp: 100, maxMp: 100, attack: 10, defense: 10, exp: 0, maxExp: 1000 },
    });
    const store = useGameStore.getState();
    useGameStore.setState({
      resourcePoints: [{
        id: 'test-field',
        type: '灵田',
        amount: 100,
        position: { x: 400, y: 600 },
      }],
      player: store.player ? { ...store.player, position: { x: 400, y: 600 } } : null,
    } as any);

    const s = useGameStore.getState();
    s.interactWithResource('test-field');
    const state = useGameStore.getState();
    // With fortune=0, no proc → 30*1 = 30 exp
    expect(state.player!.stats.exp).toBe(30);
  });

  it('矿脉 yields double stones when fortune procs', () => {
    initPlayer({
      talent: { spiritualRoot: 100, boneConstitution: 50, comprehension: 100, fortune: 100 },
      stats: { hp: 100, maxHp: 100, mp: 100, maxMp: 100, attack: 10, defense: 10, exp: 0, maxExp: 1000 },
      inventory: { '灵石': 100 },
    });
    const store = useGameStore.getState();
    useGameStore.setState({
      resourcePoints: [{
        id: 'test-mine',
        type: '矿脉',
        amount: 100,
        position: { x: 400, y: 600 },
      }],
      player: store.player ? { ...store.player, position: { x: 400, y: 600 } } : null,
    } as any);

    const s = useGameStore.getState();
    s.interactWithResource('test-mine');
    const state = useGameStore.getState();
    // fortune=100 procs → 100 + 50*2 = 200 stones
    expect(state.player!.inventory['灵石']).toBe(200);
  });

  it('does not collect when too far from resource', () => {
    initPlayer();
    const store = useGameStore.getState();
    useGameStore.setState({
      resourcePoints: [{
        id: 'test-field',
        type: '灵田',
        amount: 100,
        position: { x: 999, y: 999 },
      }],
      player: store.player ? { ...store.player, position: { x: 0, y: 0 } } : null,
    } as any);

    const s = useGameStore.getState();
    s.interactWithResource('test-field');
    const state = useGameStore.getState();
    // Too far → no exp gain
    expect(state.player!.stats.exp).toBe(0);
  });
});

describe('REALM_LIST', () => {
  it('contains all realms in order', () => {
    expect(REALM_LIST).toEqual(['凡人', '练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫']);
  });

  it('has correct length', () => {
    expect(REALM_LIST).toHaveLength(10);
  });

  it('provides correct next realm via indexOf', () => {
    const idx = REALM_LIST.indexOf('练气');
    expect(REALM_LIST[idx + 1]).toBe('筑基');
  });
});
