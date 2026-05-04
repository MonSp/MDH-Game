import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
import type { NPC } from '../src/store/gameConstants';

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
    _factionLLMCooldowns: {},
    _factionLLMQueue: [],
    _factionLLMResults: {},
  });
});

describe('enqueueFactionAI', () => {
  it('adds faction ID to the queue', () => {
    useGameStore.getState().enqueueFactionAI('clan-001');
    expect(useGameStore.getState()._factionLLMQueue).toEqual(['clan-001']);
  });

  it('does not duplicate faction IDs', () => {
    useGameStore.getState().enqueueFactionAI('clan-001');
    useGameStore.getState().enqueueFactionAI('clan-001');
    expect(useGameStore.getState()._factionLLMQueue).toEqual(['clan-001']);
  });

  it('enqueues multiple factions', () => {
    useGameStore.getState().enqueueFactionAI('clan-001');
    useGameStore.getState().enqueueFactionAI('clan-002');
    expect(useGameStore.getState()._factionLLMQueue).toEqual(['clan-001', 'clan-002']);
  });
});

describe('resolveFactionAI', () => {
  it('removes faction from queue and stores the decision', () => {
    useGameStore.getState().enqueueFactionAI('clan-001');
    const decision = { targetClanId: 'clan-002', action: 'war' as const, reason: '征服' };

    useGameStore.getState().resolveFactionAI('clan-001', decision);

    const state = useGameStore.getState();
    expect(state._factionLLMQueue).not.toContain('clan-001');
    expect(state._factionLLMResults['clan-001']).toEqual(decision);
  });

  it('sets cooldown to future timestamp', () => {
    useGameStore.getState().enqueueFactionAI('clan-001');
    const before = Date.now();

    useGameStore.getState().resolveFactionAI('clan-001', null);

    const cooldown = useGameStore.getState()._factionLLMCooldowns['clan-001'];
    expect(cooldown).toBeGreaterThanOrEqual(before + 150000 - 100); // 150s cooldown
  });

  it('stores null decision gracefully', () => {
    useGameStore.getState().enqueueFactionAI('clan-001');
    useGameStore.getState().resolveFactionAI('clan-001', null);
    expect(useGameStore.getState()._factionLLMResults['clan-001']).toBeNull();
  });
});

describe('clearFactionAIResult', () => {
  it('removes faction result from the store', () => {
    useGameStore.getState().enqueueFactionAI('clan-001');
    useGameStore.getState().resolveFactionAI('clan-001', { targetClanId: 'clan-002', action: 'war', reason: 'test' });
    expect(useGameStore.getState()._factionLLMResults['clan-001']).toBeDefined();

    useGameStore.getState().clearFactionAIResult('clan-001');
    expect(useGameStore.getState()._factionLLMResults['clan-001']).toBeUndefined();
  });

  it('does not throw when clearing non-existent result', () => {
    expect(() => useGameStore.getState().clearFactionAIResult('nonexistent')).not.toThrow();
  });
});

describe('mergeServerNPCs', () => {
  function makeClientNPC(id: string, overrides: Partial<NPC> = {}): NPC {
    return {
      id, name: `Client-${id}`, clanId: 'clan-0', role: '散修', realm: '练气',
      power: 100, hp: 100, maxHp: 100, mp: 50, maxMp: 50,
      personality: { ambition: 50, caution: 50, loyalty: 50, greed: 50 },
      resources: { spiritStone: 10 }, activity: '闲逛',
      position: { x: 10, y: 10 }, ...overrides,
    };
  }

  function makeServerNPC(id: string, overrides: Record<string, any> = {}): any {
    return {
      id, name: `Server-${id}`, clanId: 'clan-s', role: '内门子弟', realm: '筑基',
      power: 200, hp: 300, maxHp: 300, mp: 100, maxMp: 100,
      ambition: 70, caution: 30, loyalty: 60, greed: 40,
      spiritStone: 100, activity: '巡逻', x: 20, y: 30, ...overrides,
    };
  }

  it('replaces client NPC with same ID as server NPC', () => {
    useGameStore.setState({
      nearbyNPCs: [makeClientNPC('npc_001'), makeClientNPC('client-only')],
    });
    const serverNpcs = [makeServerNPC('npc_001')];
    useGameStore.getState().mergeServerNPCs(serverNpcs);

    const state = useGameStore.getState();
    expect(state.nearbyNPCs).toHaveLength(2); // client-only kept, npc_001 replaced
    expect(state.nearbyNPCs.find(n => n.id === 'npc_001')?.name).toBe('Server-npc_001');
    expect(state.nearbyNPCs.find(n => n.id === 'client-only')).toBeDefined();
  });

  it('adds new server NPCs not present locally', () => {
    useGameStore.setState({
      nearbyNPCs: [makeClientNPC('existing')],
    });
    const serverNpcs = [makeServerNPC('npc_001'), makeServerNPC('npc_002')];
    useGameStore.getState().mergeServerNPCs(serverNpcs);

    const state = useGameStore.getState();
    expect(state.nearbyNPCs).toHaveLength(3);
    expect(state.nearbyNPCs.find(n => n.id === 'npc_001')).toBeDefined();
    expect(state.nearbyNPCs.find(n => n.id === 'npc_002')).toBeDefined();
  });

  it('does not add server NPC that is a squad member', () => {
    useGameStore.setState({
      nearbyNPCs: [makeClientNPC('existing')],
      squadMembers: [{
        id: 'npc_squad', npcId: 'npc-squad-1', name: '队员', clanId: 'clan-0',
        role: '战斗型', realm: '练气', power: 50, hp: 100, maxHp: 100, mp: 30, maxMp: 30,
        personality: { ambition: 50, caution: 50, loyalty: 30, greed: 30 },
        joinDate: Date.now(), kills: 0, isAlive: true, position: { x: 0, y: 0 }, activity: '跟随中',
      }],
    });
    // squadMembers use npcId, not id — but we check via id match on server NPCs
    // Actually mergeServerNPCs filters by squadMembers.map(m => m.id) which would be 'npc_squad'
    // Use the squad member's id field
    const state = useGameStore.getState();
    const squadMemberId = state.squadMembers[0].id;
    const serverNpcs = [makeServerNPC(squadMemberId)];
    useGameStore.getState().mergeServerNPCs(serverNpcs);

    // The squad member ID should not be added from server NPCs
    const afterState = useGameStore.getState();
    expect(afterState.nearbyNPCs.find(n => n.id === squadMemberId)).toBeUndefined();
  });

  it('handles empty server NPC list', () => {
    useGameStore.setState({
      nearbyNPCs: [makeClientNPC('npc_001')],
    });
    useGameStore.getState().mergeServerNPCs([]);
    expect(useGameStore.getState().nearbyNPCs).toHaveLength(1);
  });
});
