import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, getReputationTitle, REPUTATION_TITLES } from '../src/store/gameStore';

// Set up a minimal player for store tests
function createTestPlayer() {
  return {
    id: 'test-player',
    name: 'TestPlayer',
    heavenLevel: 9 as const,
    realm: '凡人' as const,
    bodyType: '凡体' as const,
    potential: '无',
    country: '赵',
    clanId: 'test-clan',
    stats: { hp: 100, maxHp: 100, mp: 20, maxMp: 20, attack: 10, defense: 5, exp: 0, maxExp: 100 },
    hiddenStats: { killCount: 0, cultivateCount: 0, gatherCount: 0, ascensionCount: 0, merit: 0 },
    reputation: 0,
    position: { x: 50, y: 50 },
    inventory: { '灵石': 500 },
    cycleInfo: { type: null as any },
    isAscending: false,
    talent: { spiritualRoot: 25, boneConstitution: 30, comprehension: 40, fortune: 20 },
  };
}

// Reset the store before each test
beforeEach(() => {
  useGameStore.setState({
    npcMemory: {},
    player: null,
    clans: [],
    nearbyNPCs: [],
    wildMonsters: [],
    resourcePoints: [],
    logs: [],
    metNpcs: [],
    market: {},
  });
});

describe('npcMemory state', () => {
  it('starts empty', () => {
    expect(useGameStore.getState().npcMemory).toEqual({});
  });

  it('setNpcMemory stores a value for a given NPC', () => {
    useGameStore.getState().setNpcMemory('grudge_lisi', 'ROBBED');
    expect(useGameStore.getState().npcMemory).toEqual({ grudge_lisi: 'ROBBED' });
  });

  it('setNpcMemory overwrites existing value', () => {
    useGameStore.getState().setNpcMemory('grudge_lisi', 'ROBBED');
    useGameStore.getState().setNpcMemory('grudge_lisi', 'HELPED');
    expect(useGameStore.getState().npcMemory).toEqual({ grudge_lisi: 'HELPED' });
  });

  it('setNpcMemory stores multiple NPC memories independently', () => {
    useGameStore.getState().setNpcMemory('grudge_lisi', 'ROBBED');
    useGameStore.getState().setNpcMemory('grudge_wangwu', 'UNMET');
    expect(useGameStore.getState().npcMemory).toEqual({
      grudge_lisi: 'ROBBED',
      grudge_wangwu: 'UNMET',
    });
  });
});

describe('getReputationTitle', () => {
  it('returns "无名小卒" for reputation 0', () => {
    expect(getReputationTitle(0)).toBe('无名小卒');
  });

  it('returns "初出茅庐" for reputation 100', () => {
    expect(getReputationTitle(100)).toBe('初出茅庐');
  });

  it('returns "小有名气" for reputation 500', () => {
    expect(getReputationTitle(500)).toBe('小有名气');
  });

  it('returns "名动一方" for reputation 2000', () => {
    expect(getReputationTitle(2000)).toBe('名动一方');
  });

  it('returns "声名远扬" for reputation 5000', () => {
    expect(getReputationTitle(5000)).toBe('声名远扬');
  });

  it('returns "威震四海" for reputation 10000', () => {
    expect(getReputationTitle(10000)).toBe('威震四海');
  });

  it('returns "名满天下" for reputation 20000', () => {
    expect(getReputationTitle(20000)).toBe('名满天下');
  });

  it('returns "千古流芳" for reputation 50000', () => {
    expect(getReputationTitle(50000)).toBe('千古流芳');
  });

  it('returns "千古流芳" for very large reputation', () => {
    expect(getReputationTitle(999999)).toBe('千古流芳');
  });

  it('handles boundary between tiers (99 → 无名小卒, 100 → 初出茅庐)', () => {
    expect(getReputationTitle(99)).toBe('无名小卒');
    expect(getReputationTitle(100)).toBe('初出茅庐');
  });
});

describe('reputation store actions', () => {
  beforeEach(() => {
    useGameStore.setState({ player: createTestPlayer() });
  });

  it('addReputation increases player reputation', () => {
    useGameStore.getState().addReputation(50, 'monster_kill');
    expect(useGameStore.getState().player!.reputation).toBe(50);
  });

  it('addReputation accumulates reputation over multiple calls', () => {
    useGameStore.getState().addReputation(30, 'monster_kill');
    useGameStore.getState().addReputation(20, 'gather');
    expect(useGameStore.getState().player!.reputation).toBe(50);
  });

  it('addReputation creates a log entry', () => {
    useGameStore.getState().addReputation(100, 'breakthrough');
    const logs = useGameStore.getState().logs;
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].message).toContain('声望');
  });

  it('addReputation logs title change on tier upgrade', () => {
    // Start at 95, add 10 → crosses 100 threshold (无名小卒 → 初出茅庐)
    useGameStore.setState({ player: { ...createTestPlayer(), reputation: 95 } });
    useGameStore.getState().addReputation(10, 'breakthrough');
    const logs = useGameStore.getState().logs;
    const titleMsg = logs.find(l => l.message.includes('声望提升'));
    expect(titleMsg).toBeDefined();
    expect(titleMsg!.message).toContain('无名小卒');
    expect(titleMsg!.message).toContain('初出茅庐');
  });

  it('does not log title change when staying in same tier', () => {
    useGameStore.getState().addReputation(10, 'gather');
    const logs = useGameStore.getState().logs;
    const titleMsg = logs.find(l => l.message.includes('声望提升'));
    expect(titleMsg).toBeUndefined();
  });
});

describe('npcMemory save/load round-trip', () => {
  it('serializes npcMemory into save data', () => {
    useGameStore.getState().setNpcMemory('grudge_lisi', 'HELPED');
    const state = useGameStore.getState();
    expect(state.npcMemory).toEqual({ grudge_lisi: 'HELPED' });
  });

  it('loadFromSlot restores npcMemory to empty when no save data', () => {
    useGameStore.getState().setNpcMemory('grudge_lisi', 'ROBBED');
    // Simulate loading from a slot with no npcMemory data (backward compat)
    useGameStore.setState({ npcMemory: {} });
    expect(useGameStore.getState().npcMemory).toEqual({});
  });
});
