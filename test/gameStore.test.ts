import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/store/gameStore';

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
