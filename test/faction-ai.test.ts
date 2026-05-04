import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, getClanTerritoryCenter, COUNTRIES_DATA } from '../src/store/gameStore';
import type { Clan } from '../src/store/gameStore';

function createTestPlayer(overrides: Record<string, any> = {}) {
  return {
    id: 'test-player',
    name: 'TestPlayer',
    heavenLevel: 9 as const,
    realm: '练气' as const,
    bodyType: '凡体' as const,
    potential: '无',
    country: '赵',
    clanId: 'player-clan',
    stats: { hp: 100, maxHp: 100, mp: 20, maxMp: 20, attack: 10, defense: 5, exp: 0, maxExp: 100 },
    hiddenStats: { killCount: 0, cultivateCount: 0, gatherCount: 0, ascensionCount: 0, merit: 0 },
    reputation: 1000,
    position: { x: 50, y: 50 },
    inventory: { '灵石': 10000 },
    cycleInfo: { type: null as any },
    isAscending: false,
    talent: { spiritualRoot: 25, boneConstitution: 30, comprehension: 40, fortune: 20 },
    ...overrides,
  };
}

beforeEach(() => {
  useGameStore.setState({
    player: null,
    playerFactionId: null,
    clans: [],
    logs: [],
    squadMembers: [],
    nearbyNPCs: [],
    wildMonsters: [],
    resourcePoints: [],
    market: {},
    metNpcs: [],
    npcMemory: {},
    ascensionQuests: [],
    worldEvents: [],
    _factionTickCount: 0,
  });
});

describe('getClanTerritoryCenter', () => {
  it('returns capital position for first clan in country', () => {
    const clan: Clan = {
      id: 'clan-0', name: '秦家', country: '秦', type: '3级',
      reputation: 100, treasury: 500, heavenLevel: 9, isAscendingFamily: false,
    };
    const clans = [clan];
    const center = getClanTerritoryCenter(clan, clans);
    expect(center).toEqual({ x: 20, y: 50 }); // 秦 capital
  });

  it('returns offset position for multiple clans in same country', () => {
    const clan0: Clan = {
      id: 'clan-0', name: '赵甲', country: '赵', type: '3级',
      reputation: 100, treasury: 500, heavenLevel: 9, isAscendingFamily: false,
    };
    const clan1: Clan = {
      id: 'clan-1', name: '赵乙', country: '赵', type: '3级',
      reputation: 100, treasury: 500, heavenLevel: 9, isAscendingFamily: false,
    };
    const clans = [clan0, clan1];
    const center0 = getClanTerritoryCenter(clan0, clans);
    // clan0 is index 0: capital + (0%5)*3, capital.y + floor(0/5)*3
    expect(center0).toEqual({ x: 50 + 0, y: 30 + 0 });
    const center1 = getClanTerritoryCenter(clan1, clans);
    // clan1 is index 1: capital + (1%5)*3, capital.y + floor(1/5)*3
    expect(center1).toEqual({ x: 50 + 3, y: 30 + 0 });
  });

  it('falls back to { x: 50, y: 50 } when country not found', () => {
    const clan: Clan = {
      id: 'clan-0', name: '未知', country: '火星', type: '3级',
      reputation: 100, treasury: 500, heavenLevel: 9, isAscendingFamily: false,
    };
    const center = getClanTerritoryCenter(clan, [clan]);
    expect(center).toEqual({ x: 50, y: 50 });
  });
});

describe('addWorldEvent', () => {
  it('adds a world event to the store', () => {
    useGameStore.setState({ player: createTestPlayer() });
    useGameStore.getState().addWorldEvent({
      type: 'trade',
      npcNameA: '张三',
      npcNameB: '李四',
      description: '张三与李四交换了资源',
      timestamp: Date.now(),
    });
    const state = useGameStore.getState();
    expect(state.worldEvents).toHaveLength(1);
    expect(state.worldEvents[0].type).toBe('trade');
    expect(state.worldEvents[0].npcNameA).toBe('张三');
    expect(state.worldEvents[0].npcNameB).toBe('李四');
    expect(state.worldEvents[0].id).toMatch(/^we-/);
  });

  it('caps worldEvents at 100 entries', () => {
    useGameStore.setState({ player: createTestPlayer() });
    const store = useGameStore.getState();
    for (let i = 0; i < 150; i++) {
      store.addWorldEvent({
        type: 'system',
        npcNameA: `NPC${i}`,
        npcNameB: '',
        description: `Event ${i}`,
        timestamp: Date.now(),
      });
    }
    expect(useGameStore.getState().worldEvents.length).toBe(100);
  });
});

describe('Inter-NPC war combat (Phase 1.4c)', () => {
  beforeEach(() => {
    useGameStore.setState({
      player: createTestPlayer({ position: { x: 100, y: 100 } }),
      playerFactionId: 'player-clan',
    });
  });

  it('NPCs from warring clans fight when adjacent', () => {
    const clanA: Clan = {
      id: 'clan-A', name: '秦家', country: '齐', type: '3级',
      reputation: 100, treasury: 500, heavenLevel: 9, isAscendingFamily: false,
      diplomacy: {
        'clan-B': { status: '战争', conflictLevel: '局部冲突', declaredBy: 'clan-A' },
      },
    };
    const clanB: Clan = {
      id: 'clan-B', name: '楚家', country: '齐', type: '3级',
      reputation: 100, treasury: 500, heavenLevel: 9, isAscendingFamily: false,
      diplomacy: {
        'clan-A': { status: '战争', conflictLevel: '局部冲突', declaredBy: 'clan-B' },
      },
    };
    useGameStore.setState({
      clans: [clanA, clanB],
      // Both NPCs start at same position to guarantee adjacency after behavior tree movement
      nearbyNPCs: [
        {
          id: 'npc-a1', name: '秦风', clanId: 'clan-A', role: '核心子弟', realm: '练气',
          power: 100, hp: 100, maxHp: 100, mp: 50, maxMp: 50,
          personality: { ambition: 10, caution: 80, loyalty: 30, greed: 30 },
          resources: { spiritStone: 50 }, activity: '巡逻',
          position: { x: 50, y: 50 },
        },
        {
          id: 'npc-b1', name: '楚雨', clanId: 'clan-B', role: '核心子弟', realm: '练气',
          power: 100, hp: 100, maxHp: 100, mp: 50, maxMp: 50,
          personality: { ambition: 10, caution: 80, loyalty: 30, greed: 30 },
          resources: { spiritStone: 50 }, activity: '巡逻',
          position: { x: 50, y: 50 },
        },
      ],
    });

    const store = useGameStore.getState();
    // Run multiple ticks to account for behavior tree random movement
    for (let i = 0; i < 20; i++) {
      store.updateNPCs();
    }

    const state = useGameStore.getState();
    const npcA = state.nearbyNPCs.find(n => n.id === 'npc-a1');
    const npcB = state.nearbyNPCs.find(n => n.id === 'npc-b1');
    expect(npcA).toBeDefined();
    expect(npcB).toBeDefined();
    // At least one NPC took damage from war combat
    const hpA = npcA!.hp;
    const hpB = npcB!.hp;
    expect(hpA < 100 || hpB < 100).toBe(true);
  });

  it('NPCs from same clan do NOT fight each other', () => {
    useGameStore.setState({
      clans: [{
        id: 'clan-A', name: '秦家', country: '秦', type: '3级',
        reputation: 100, treasury: 500, heavenLevel: 9, isAscendingFamily: false,
      }],
      nearbyNPCs: [
        {
          id: 'npc-a1', name: '秦风', clanId: 'clan-A', role: '核心子弟', realm: '练气',
          power: 100, hp: 100, maxHp: 100, mp: 50, maxMp: 50,
          personality: { ambition: 50, caution: 30, loyalty: 60, greed: 20 },
          resources: { spiritStone: 50 }, activity: '巡逻',
          position: { x: 50, y: 50 },
        },
        {
          id: 'npc-a2', name: '秦云', clanId: 'clan-A', role: '核心子弟', realm: '练气',
          power: 100, hp: 100, maxHp: 100, mp: 50, maxMp: 50,
          personality: { ambition: 50, caution: 30, loyalty: 60, greed: 20 },
          resources: { spiritStone: 50 }, activity: '巡逻',
          position: { x: 50, y: 51 },
        },
      ],
    });

    useGameStore.getState().updateNPCs();
    const state = useGameStore.getState();
    const npcA1 = state.nearbyNPCs.find(n => n.id === 'npc-a1');
    const npcA2 = state.nearbyNPCs.find(n => n.id === 'npc-a2');
    // Both should be at full HP since they're from the same clan
    expect(npcA1!.hp).toBe(100);
    expect(npcA2!.hp).toBe(100);
  });

  it('NPCs at neutral status do NOT fight', () => {
    useGameStore.setState({
      clans: [{
        id: 'clan-A', name: '秦家', country: '秦', type: '3级',
        reputation: 100, treasury: 500, heavenLevel: 9, isAscendingFamily: false,
        diplomacy: {
          'clan-B': { status: '中立', conflictLevel: '和平', declaredBy: 'clan-A' },
        },
      }, {
        id: 'clan-B', name: '楚家', country: '楚', type: '3级',
        reputation: 100, treasury: 500, heavenLevel: 9, isAscendingFamily: false,
        diplomacy: {
          'clan-A': { status: '中立', conflictLevel: '和平', declaredBy: 'clan-B' },
        },
      }],
      nearbyNPCs: [
        {
          id: 'npc-a1', name: '秦风', clanId: 'clan-A', role: '核心子弟', realm: '练气',
          power: 100, hp: 100, maxHp: 100, mp: 50, maxMp: 50,
          personality: { ambition: 50, caution: 30, loyalty: 60, greed: 20 },
          resources: { spiritStone: 50 }, activity: '巡逻',
          position: { x: 50, y: 50 },
        },
        {
          id: 'npc-b1', name: '楚雨', clanId: 'clan-B', role: '核心子弟', realm: '练气',
          power: 100, hp: 100, maxHp: 100, mp: 50, maxMp: 50,
          personality: { ambition: 50, caution: 30, loyalty: 60, greed: 20 },
          resources: { spiritStone: 50 }, activity: '巡逻',
          position: { x: 50, y: 51 },
        },
      ],
    });

    useGameStore.getState().updateNPCs();
    const state = useGameStore.getState();
    // Both should be at full HP
    expect(state.nearbyNPCs.find(n => n.id === 'npc-a1')!.hp).toBe(100);
    expect(state.nearbyNPCs.find(n => n.id === 'npc-b1')!.hp).toBe(100);
  });

  it('NPC with retreatTicksRemaining does not participate in war combat', () => {
    useGameStore.setState({
      clans: [{
        id: 'clan-A', name: '秦家', country: '秦', type: '3级',
        reputation: 100, treasury: 500, heavenLevel: 9, isAscendingFamily: false,
        diplomacy: {
          'clan-B': { status: '战争', conflictLevel: '局部冲突', declaredBy: 'clan-A' },
        },
      }, {
        id: 'clan-B', name: '楚家', country: '楚', type: '3级',
        reputation: 100, treasury: 500, heavenLevel: 9, isAscendingFamily: false,
        diplomacy: {
          'clan-A': { status: '战争', conflictLevel: '局部冲突', declaredBy: 'clan-B' },
        },
      }],
      nearbyNPCs: [
        {
          id: 'npc-a1', name: '秦风', clanId: 'clan-A', role: '核心子弟', realm: '练气',
          power: 100, hp: 100, maxHp: 100, mp: 50, maxMp: 50,
          personality: { ambition: 50, caution: 30, loyalty: 60, greed: 20 },
          resources: { spiritStone: 50 }, activity: '巡逻',
          position: { x: 50, y: 50 },
          retreatTicksRemaining: 3, // in retreat
        },
        {
          id: 'npc-b1', name: '楚雨', clanId: 'clan-B', role: '核心子弟', realm: '练气',
          power: 100, hp: 100, maxHp: 100, mp: 50, maxMp: 50,
          personality: { ambition: 50, caution: 30, loyalty: 60, greed: 20 },
          resources: { spiritStone: 50 }, activity: '巡逻',
          position: { x: 50, y: 51 },
        },
      ],
    });

    useGameStore.getState().updateNPCs();
    const state = useGameStore.getState();
    // NPC A in retreat, NPC B has no one to fight
    expect(state.nearbyNPCs.find(n => n.id === 'npc-b1')!.hp).toBe(100);
  });

  it('defeated NPC gets retreatTicksRemaining and treasury is updated', () => {
    const clanA = {
      id: 'clan-A', name: '秦家', country: '秦', type: '3级',
      reputation: 100, treasury: 500, heavenLevel: 9, isAscendingFamily: false,
      diplomacy: {
        'clan-B': { status: '战争', conflictLevel: '局部冲突', declaredBy: 'clan-A' },
      },
    };
    const clanB = {
      id: 'clan-B', name: '楚家', country: '楚', type: '3级',
      reputation: 100, treasury: 500, heavenLevel: 9, isAscendingFamily: false,
      diplomacy: {
        'clan-A': { status: '战争', conflictLevel: '局部冲突', declaredBy: 'clan-B' },
      },
    };
    useGameStore.setState({
      clans: [clanA, clanB],
      nearbyNPCs: [
        {
          id: 'npc-a1', name: '秦风', clanId: 'clan-A', role: '核心子弟', realm: '练气',
          power: 10, hp: 10, maxHp: 100, mp: 50, maxMp: 50,
          personality: { ambition: 50, caution: 30, loyalty: 60, greed: 20 },
          resources: { spiritStone: 50 }, activity: '巡逻',
          position: { x: 50, y: 50 },
        },
        {
          id: 'npc-b1', name: '楚雨', clanId: 'clan-B', role: '核心子弟', realm: '练气',
          power: 1000, hp: 200, maxHp: 200, mp: 50, maxMp: 50,
          personality: { ambition: 50, caution: 30, loyalty: 60, greed: 20 },
          resources: { spiritStone: 50 }, activity: '巡逻',
          position: { x: 50, y: 51 },
        },
      ],
    });

    useGameStore.getState().updateNPCs();
    const state = useGameStore.getState();

    // NPC A should be defeated (HP 10 - 300 = -290 <= 0, set to 0 with retreat 5)
    const npcA = state.nearbyNPCs.find(n => n.id === 'npc-a1');
    expect(npcA!.hp).toBe(0);
    expect(npcA!.retreatTicksRemaining).toBe(5);

    // Clan B should gain 5 treasury, Clan A should lose 3
    const updatedClanB = state.clans.find(c => c.id === 'clan-B')!;
    expect(updatedClanB.treasury).toBe(505); // 500 + 5
    const updatedClanA = state.clans.find(c => c.id === 'clan-A')!;
    expect(updatedClanA.treasury).toBe(497); // 500 - 3
  });
});
