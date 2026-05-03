import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/store/gameStore';

function createTestPlayer(overrides: Record<string, any> = {}) {
  return {
    id: 'test-player',
    name: 'TestPlayer',
    heavenLevel: 9 as const,
    realm: '练气' as const,
    bodyType: '凡体' as const,
    potential: '无',
    country: '赵',
    clanId: 'test-faction',
    stats: { hp: 100, maxHp: 100, mp: 20, maxMp: 20, attack: 10, defense: 5, exp: 0, maxExp: 100 },
    hiddenStats: { killCount: 0, cultivateCount: 0, gatherCount: 0, ascensionCount: 0, merit: 0 },
    reputation: 1000,
    position: { x: 50, y: 50 },
    inventory: { '灵石': 200000 },
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
  });
});

function setupPlayerFaction(playerOverrides: Record<string, any> = {}) {
  useGameStore.setState({
    player: createTestPlayer({ clanId: 'player-faction', ...playerOverrides }),
    playerFactionId: 'player-faction',
    clans: [
      { id: 'player-faction', name: '青云宗', country: '赵', type: '3级', reputation: 100, treasury: 10000, heavenLevel: 9, isAscendingFamily: false },
      { id: 'enemy-faction', name: '血魔教', country: '楚', type: '3级', reputation: 80, treasury: 5000, heavenLevel: 9, isAscendingFamily: false },
      { id: 'neutral-faction', name: '天机阁', country: '齐', type: '2级', reputation: 200, treasury: 30000, heavenLevel: 9, isAscendingFamily: false },
      { id: 'ally-faction', name: '药王谷', country: '赵', type: '3级', reputation: 150, treasury: 8000, heavenLevel: 9, isAscendingFamily: false },
      { id: 'royal-faction', name: '赵国王室', country: '赵', type: '皇族', reputation: 500, treasury: 100000, heavenLevel: 9, isAscendingFamily: false },
    ],
  });
}

describe('Diplomacy: declareWar', () => {
  it('sets war status bidirectionally', () => {
    setupPlayerFaction();
    useGameStore.getState().declareWar('enemy-faction');
    const state = useGameStore.getState();
    const playerDiplomacy = state.clans.find(c => c.id === 'player-faction')!.diplomacy!;
    expect(playerDiplomacy['enemy-faction'].status).toBe('战争');
    expect(playerDiplomacy['enemy-faction'].conflictLevel).toBe('局部冲突');
    const enemyDiplomacy = state.clans.find(c => c.id === 'enemy-faction')!.diplomacy!;
    expect(enemyDiplomacy['player-faction'].status).toBe('战争');
  });

  it('logs a war declaration event', () => {
    setupPlayerFaction();
    useGameStore.getState().declareWar('enemy-faction');
    const logs = useGameStore.getState().logs;
    expect(logs.some(l => l.message.includes('宣战'))).toBe(true);
    expect(logs.some(l => l.message.includes('血魔教'))).toBe(true);
  });

  it('fails when player has no faction', () => {
    useGameStore.setState({ player: createTestPlayer(), playerFactionId: null });
    useGameStore.getState().declareWar('enemy-faction');
    const logs = useGameStore.getState().logs;
    expect(logs.some(l => l.message.includes('没有管理任何势力'))).toBe(true);
  });

  it('fails when already at war', () => {
    setupPlayerFaction();
    useGameStore.getState().declareWar('enemy-faction');
    const logCount = useGameStore.getState().logs.length;
    useGameStore.getState().declareWar('enemy-faction');
    const logs = useGameStore.getState().logs;
    expect(logs.some(l => l.message.includes('已处于战争状态'))).toBe(true);
  });

  it('cannot declare war on own faction', () => {
    setupPlayerFaction();
    useGameStore.getState().declareWar('player-faction');
    const logs = useGameStore.getState().logs;
    expect(logs.some(l => l.message.includes('不能对自己宣战'))).toBe(true);
  });
});

describe('Diplomacy: proposeAlliance', () => {
  it('sets alliance bidirectionally', () => {
    setupPlayerFaction();
    useGameStore.getState().proposeAlliance('enemy-faction');
    const state = useGameStore.getState();
    const playerDiplomacy = state.clans.find(c => c.id === 'player-faction')!.diplomacy!;
    expect(playerDiplomacy['enemy-faction'].status).toBe('同盟');
    expect(playerDiplomacy['enemy-faction'].allianceDate).toBeDefined();
    const enemyDiplomacy = state.clans.find(c => c.id === 'enemy-faction')!.diplomacy!;
    expect(enemyDiplomacy['player-faction'].status).toBe('同盟');
  });

  it('logs alliance event', () => {
    setupPlayerFaction();
    useGameStore.getState().proposeAlliance('enemy-faction');
    const logs = useGameStore.getState().logs;
    expect(logs.some(l => l.message.includes('结盟'))).toBe(true);
  });

  it('fails when already allied', () => {
    setupPlayerFaction();
    useGameStore.getState().proposeAlliance('enemy-faction');
    const logCount = useGameStore.getState().logs.length;
    useGameStore.getState().proposeAlliance('enemy-faction');
    const logs = useGameStore.getState().logs;
    expect(logs.some(l => l.message.includes('已与该势力结盟'))).toBe(true);
  });
});

describe('Diplomacy: proposeTruce', () => {
  it('sets truce status with expiry', () => {
    setupPlayerFaction();
    useGameStore.getState().declareWar('enemy-faction');
    useGameStore.getState().proposeTruce('enemy-faction');
    const state = useGameStore.getState();
    const playerDiplomacy = state.clans.find(c => c.id === 'player-faction')!.diplomacy!;
    expect(playerDiplomacy['enemy-faction'].status).toBe('停战');
    expect(playerDiplomacy['enemy-faction'].truceUntil).toBeGreaterThan(Date.now());
  });

  it('logs truce event', () => {
    setupPlayerFaction();
    useGameStore.getState().declareWar('enemy-faction');
    useGameStore.getState().proposeTruce('enemy-faction');
    const logs = useGameStore.getState().logs;
    expect(logs.some(l => l.message.includes('停战'))).toBe(true);
  });
});

describe('Diplomacy: surrenderTo', () => {
  it('sets vassal status with tribute', () => {
    setupPlayerFaction();
    useGameStore.getState().surrenderTo('royal-faction');
    const state = useGameStore.getState();
    const playerDiplomacy = state.clans.find(c => c.id === 'player-faction')!.diplomacy!;
    expect(playerDiplomacy['royal-faction'].status).toBe('臣服');
    expect(playerDiplomacy['royal-faction'].vassalTribute).toBeGreaterThan(0);
  });

  it('logs surrender event', () => {
    setupPlayerFaction();
    useGameStore.getState().surrenderTo('royal-faction');
    const logs = useGameStore.getState().logs;
    expect(logs.some(l => l.message.includes('臣服'))).toBe(true);
  });
});

describe('Diplomacy: breakAlliance', () => {
  it('removes alliance relationship', () => {
    setupPlayerFaction();
    useGameStore.getState().proposeAlliance('enemy-faction');
    useGameStore.getState().breakAlliance('enemy-faction');
    const state = useGameStore.getState();
    const playerDiplomacy = state.clans.find(c => c.id === 'player-faction')!.diplomacy;
    // After breaking, diplomacy should be empty or not contain the enemy
    expect(playerDiplomacy?.['enemy-faction']).toBeUndefined();
  });

  it('logs break alliance event', () => {
    setupPlayerFaction();
    useGameStore.getState().proposeAlliance('enemy-faction');
    useGameStore.getState().breakAlliance('enemy-faction');
    const logs = useGameStore.getState().logs;
    expect(logs.some(l => l.message.includes('毁盟'))).toBe(true);
  });
});

describe('Diplomacy: getDiplomaticRelations', () => {
  it('returns clans with relations to player faction', () => {
    setupPlayerFaction();
    useGameStore.getState().declareWar('enemy-faction');
    useGameStore.getState().proposeAlliance('ally-faction');
    const relations = useGameStore.getState().getDiplomaticRelations();
    expect(relations).toHaveLength(2);
    expect(relations.some(r => r.id === 'enemy-faction')).toBe(true);
    expect(relations.some(r => r.id === 'ally-faction')).toBe(true);
  });

  it('returns empty array when player has no faction', () => {
    useGameStore.setState({ player: createTestPlayer(), playerFactionId: null });
    expect(useGameStore.getState().getDiplomaticRelations()).toEqual([]);
  });

  it('returns empty array when no relations exist', () => {
    setupPlayerFaction();
    expect(useGameStore.getState().getDiplomaticRelations()).toEqual([]);
  });
});

describe('Diplomacy: getDiplomaticStatus', () => {
  it('returns correct status for each relation', () => {
    setupPlayerFaction();
    expect(useGameStore.getState().getDiplomaticStatus('enemy-faction')).toBe('中立');
    useGameStore.getState().declareWar('enemy-faction');
    expect(useGameStore.getState().getDiplomaticStatus('enemy-faction')).toBe('战争');
    useGameStore.getState().proposeTruce('enemy-faction');
    expect(useGameStore.getState().getDiplomaticStatus('enemy-faction')).toBe('停战');
    useGameStore.getState().proposeAlliance('ally-faction');
    expect(useGameStore.getState().getDiplomaticStatus('ally-faction')).toBe('同盟');
    useGameStore.getState().surrenderTo('royal-faction');
    expect(useGameStore.getState().getDiplomaticStatus('royal-faction')).toBe('臣服');
  });

  it('returns neutral when player has no faction', () => {
    useGameStore.setState({ player: createTestPlayer(), playerFactionId: null });
    expect(useGameStore.getState().getDiplomaticStatus('enemy-faction')).toBe('中立');
  });

  it('returns neutral for unrelated clan', () => {
    setupPlayerFaction();
    expect(useGameStore.getState().getDiplomaticStatus('neutral-faction')).toBe('中立');
  });
});

describe('Diplomacy: guard clauses', () => {
  it('declareWar fails when player is null', () => {
    useGameStore.setState({ player: null, playerFactionId: 'player-faction', clans: [] });
    useGameStore.getState().declareWar('enemy-faction');
    expect(useGameStore.getState().logs.some(l => l.message.includes('没有管理任何势力'))).toBe(true);
  });

  it('proposeAlliance fails when playerFactionId is null', () => {
    useGameStore.setState({ player: createTestPlayer(), playerFactionId: null });
    useGameStore.getState().proposeAlliance('enemy-faction');
    expect(useGameStore.getState().logs.some(l => l.message.includes('没有管理任何势力'))).toBe(true);
  });
});

describe('Diplomacy: war → truce flow', () => {
  it('war then truce creates correct state transition', () => {
    setupPlayerFaction();
    useGameStore.getState().declareWar('enemy-faction');
    expect(useGameStore.getState().getDiplomaticStatus('enemy-faction')).toBe('战争');
    useGameStore.getState().proposeTruce('enemy-faction');
    expect(useGameStore.getState().getDiplomaticStatus('enemy-faction')).toBe('停战');
    // After truce, can't re-declare war without truce expiring, but the action should still work
    useGameStore.getState().declareWar('enemy-faction');
    expect(useGameStore.getState().getDiplomaticStatus('enemy-faction')).toBe('战争');
  });
});
