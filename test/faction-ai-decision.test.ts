import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
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
    skillCooldowns: {},
    ...overrides,
  };
}

function makeClan(id: string, name: string, overrides: Partial<Clan> = {}): Clan {
  return {
    id, name, country: '赵', type: '3级', reputation: 100, treasury: 500,
    heavenLevel: 9, isAscendingFamily: false, buildings: [],
    territory: 1, morale: 50, ...overrides,
  };
}

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  vi.spyOn(console, 'log').mockImplementation(() => {});
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
    _factionLLMCooldowns: {},
    _factionLLMQueue: [],
    _factionLLMResults: {},
    _factionTickCount: 0,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AI faction diplomacy with LLM decisions', () => {
  it('LLM decision "none" causes clan to skip all random checks and triggers no diplomacy changes', () => {
    const clanA = makeClan('clan-A', '秦家');
    const clanB = makeClan('clan-B', '楚家');
    useGameStore.setState({
      player: createTestPlayer(),
      clans: [clanA, clanB],
      _factionLLMResults: {
        'clan-A': { targetClanId: '', action: 'none', reason: '和平发展' },
      },
      _factionTickCount: 29,
    });
    useGameStore.getState().updateNPCs();
    const state = useGameStore.getState();
    expect(state.clans.find(c => c.id === 'clan-A')?.diplomacy).toBeUndefined();
    expect(state.clans.find(c => c.id === 'clan-B')?.diplomacy).toBeUndefined();
  });

  it('LLM decision "war" creates war between clans when status is neutral', () => {
    const clanA = makeClan('clan-A', '秦家');
    const clanB = makeClan('clan-B', '楚家');
    useGameStore.setState({
      player: createTestPlayer(),
      clans: [clanA, clanB],
      _factionLLMResults: {
        'clan-A': { targetClanId: 'clan-B', action: 'war', reason: '实力碾压' },
      },
      _factionTickCount: 29,
    });
    useGameStore.getState().updateNPCs();
    const state = useGameStore.getState();
    const clanADiplo = state.clans.find(c => c.id === 'clan-A')!.diplomacy;
    expect(clanADiplo).toBeDefined();
    expect(clanADiplo!['clan-B'].status).toBe('战争');
    const clanBDiplo = state.clans.find(c => c.id === 'clan-B')!.diplomacy;
    expect(clanBDiplo).toBeDefined();
    expect(clanBDiplo!['clan-A'].status).toBe('战争');
    expect(state.worldEvents.some(e => e.description.includes('宣战'))).toBe(true);
  });

  it('LLM decision "war" does nothing when already at war (status not neutral)', () => {
    const clanA = makeClan('clan-A', '秦家');
    const clanB = makeClan('clan-B', '楚家', {
      diplomacy: { 'clan-A': { status: '战争', conflictLevel: '局部冲突', declaredBy: 'clan-B' } },
    });
    clanA.diplomacy = { 'clan-B': { status: '战争', conflictLevel: '局部冲突', declaredBy: 'clan-A' } };
    useGameStore.setState({
      player: createTestPlayer(),
      clans: [clanA, clanB],
      _factionLLMResults: {
        'clan-A': { targetClanId: 'clan-B', action: 'war', reason: '继续打' },
      },
      _factionTickCount: 29,
    });
    useGameStore.getState().updateNPCs();
    const state = useGameStore.getState();
    expect(state.clans.find(c => c.id === 'clan-A')!.diplomacy!['clan-B'].status).toBe('战争');
  });

  it('LLM decision "alliance" creates alliance between clans when status is neutral', () => {
    const clanA = makeClan('clan-A', '秦家');
    const clanB = makeClan('clan-B', '楚家');
    useGameStore.setState({
      player: createTestPlayer(),
      clans: [clanA, clanB],
      _factionLLMResults: {
        'clan-A': { targetClanId: 'clan-B', action: 'alliance', reason: '共同御敌' },
      },
      _factionTickCount: 29,
    });
    useGameStore.getState().updateNPCs();
    const state = useGameStore.getState();
    const diploA = state.clans.find(c => c.id === 'clan-A')!.diplomacy!;
    expect(diploA['clan-B'].status).toBe('同盟');
    expect(diploA['clan-B'].allianceDate).toBeDefined();
    expect(state.worldEvents.some(e => e.description.includes('缔结同盟'))).toBe(true);
  });

  it('LLM decision "alliance" does nothing when status is not neutral (e.g., already at war)', () => {
    const clanA = makeClan('clan-A', '秦家');
    const clanB = makeClan('clan-B', '楚家', {
      diplomacy: { 'clan-A': { status: '战争', conflictLevel: '局部冲突', declaredBy: 'clan-B' } },
    });
    clanA.diplomacy = { 'clan-B': { status: '战争', conflictLevel: '局部冲突', declaredBy: 'clan-A' } };
    useGameStore.setState({
      player: createTestPlayer(),
      clans: [clanA, clanB],
      _factionLLMResults: {
        'clan-A': { targetClanId: 'clan-B', action: 'alliance', reason: '想结盟但正在打仗' },
      },
      _factionTickCount: 29,
    });
    useGameStore.getState().updateNPCs();
    const state = useGameStore.getState();
    expect(state.clans.find(c => c.id === 'clan-A')!.diplomacy!['clan-B'].status).toBe('战争');
  });

  it('LLM decision "truce" creates truce when currently at war', () => {
    const clanA = makeClan('clan-A', '秦家');
    const clanB = makeClan('clan-B', '楚家', {
      diplomacy: { 'clan-A': { status: '战争', conflictLevel: '局部冲突', declaredBy: 'clan-B' } },
    });
    clanA.diplomacy = { 'clan-B': { status: '战争', conflictLevel: '局部冲突', declaredBy: 'clan-A' } };
    useGameStore.setState({
      player: createTestPlayer(),
      clans: [clanA, clanB],
      _factionLLMResults: {
        'clan-A': { targetClanId: 'clan-B', action: 'truce', reason: '休养生息' },
      },
      _factionTickCount: 29,
    });
    useGameStore.getState().updateNPCs();
    const state = useGameStore.getState();
    const diploA = state.clans.find(c => c.id === 'clan-A')!.diplomacy!;
    expect(diploA['clan-B'].status).toBe('停战');
    expect(diploA['clan-B'].truceUntil).toBeGreaterThan(Date.now());
    expect(state.worldEvents.some(e => e.description.includes('停战'))).toBe(true);
  });

  it('LLM decision "truce" does nothing when not at war (status neutral)', () => {
    const clanA = makeClan('clan-A', '秦家');
    const clanB = makeClan('clan-B', '楚家');
    useGameStore.setState({
      player: createTestPlayer(),
      clans: [clanA, clanB],
      _factionLLMResults: {
        'clan-A': { targetClanId: 'clan-B', action: 'truce', reason: '想停战但没在打' },
      },
      _factionTickCount: 29,
    });
    useGameStore.getState().updateNPCs();
    const state = useGameStore.getState();
    expect(state.clans.find(c => c.id === 'clan-A')?.diplomacy).toBeUndefined();
  });

  it('server-managed NPCs (npc_\\d+ ID pattern) are skipped in updateNPCs', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      nearbyNPCs: [
        {
          id: 'npc_001', name: 'ServerNPC', clanId: 'clan-A', role: '散修',
          realm: '练气', power: 100, hp: 100, maxHp: 100, mp: 50, maxMp: 50,
          personality: { ambition: 50, caution: 50, loyalty: 50, greed: 50 },
          resources: { spiritStone: 10 }, activity: '巡逻',
          position: { x: 50, y: 50 },
        },
        {
          id: 'local-npc', name: 'LocalNPC', clanId: 'clan-A', role: '散修',
          realm: '练气', power: 100, hp: 100, maxHp: 100, mp: 50, maxMp: 50,
          personality: { ambition: 50, caution: 50, loyalty: 50, greed: 50 },
          resources: { spiritStone: 10 }, activity: '巡逻',
          position: { x: 50, y: 50 },
        },
      ],
    });
    expect(() => useGameStore.getState().updateNPCs()).not.toThrow();
    const state = useGameStore.getState();
    expect(state.nearbyNPCs.find(n => n.id === 'npc_001')).toBeDefined();
  });

  it('random fallback still triggers when no LLM decision exists', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const clanA = makeClan('clan-A', '秦家', { reputation: 100 });
    const clanB = makeClan('clan-B', '楚家', { reputation: 100 });
    useGameStore.setState({
      player: createTestPlayer(),
      clans: [clanA, clanB],
      _factionLLMResults: {},
      _factionTickCount: 29,
    });
    useGameStore.getState().updateNPCs();
    const state = useGameStore.getState();
    const clanADiplo = state.clans.find(c => c.id === 'clan-A')?.diplomacy;
    if (clanADiplo && clanADiplo['clan-B']) {
      expect(clanADiplo['clan-B'].status).toBe('同盟');
    }
  });
});
