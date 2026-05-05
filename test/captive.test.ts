import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/store/gameStore';
import type { NPC } from '../src/store/gameConstants';

function createMockNpc(overrides: Partial<NPC> = {}): NPC {
  return {
    id: 'test-npc-1',
    clanId: 'enemy-clan',
    name: 'Test Enemy',
    role: '长老',
    realm: '金丹',
    power: 500,
    hp: 1000,
    maxHp: 1000,
    mp: 200,
    maxMp: 200,
    personality: { ambition: 50, caution: 50, loyalty: 60, greed: 30 },
    resources: { spiritStone: 100 },
    activity: '巡逻中',
    position: { x: 50, y: 50 },
    ...overrides,
  };
}

function initPlayer() {
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
    },
    captives: [],
    logs: [],
    squadMembers: [],
    nearbyNPCs: [],
    wildMonsters: [],
    clans: [],
    market: {},
    metNpcs: [],
    npcMemory: {},
    resourcePoints: [],
    _factionTickCount: 0,
    currentFormation: '散开' as any,
    clanArmies: [],
    warStats: { battlesWon: 0, battlesLost: 0, npcsKilled: 0, alliesLost: 0, treasuryLooted: 0, citiesCaptured: 0 },
    ascensionQuests: [],
    worldEvents: [],
  });
}

beforeEach(() => {
  useGameStore.setState({ player: null, captives: [], logs: [], squadMembers: [] });
});

describe('captureNPC', () => {
  it('captures NPC on successful capture roll', () => {
    // Force Math.random < 0.5 for base chance
    const origRandom = Math.random;
    Math.random = () => 0.1;

    initPlayer();
    const npc = createMockNpc();
    useGameStore.getState().captureNPC(npc, 0);
    expect(useGameStore.getState().captives.length).toBe(1);
    expect(useGameStore.getState().captives[0].npc.name).toBe('Test Enemy');

    Math.random = origRandom;
  });

  it('does not capture on failed roll', () => {
    const origRandom = Math.random;
    Math.random = () => 0.9;

    initPlayer();
    const npc = createMockNpc();
    useGameStore.getState().captureNPC(npc, 0);
    expect(useGameStore.getState().captives.length).toBe(0);

    Math.random = origRandom;
  });

  it('higher realm diff increases capture chance', () => {
    const origRandom = Math.random;
    Math.random = () => 0.5; // Exactly 0.5 — with realmDiff=0, base=0.5 → succeeds (0.1 < 0.5)

    initPlayer();
    const npc = createMockNpc();
    useGameStore.getState().captureNPC(npc, 2); // realmDiff=2 → chance=0.7
    // Should succeed since 0.5 < 0.7
    expect(useGameStore.getState().captives.length).toBe(1);

    Math.random = origRandom;
  });

  it('captured NPC stores correct loyalty range', () => {
    const origRandom = Math.random;
    Math.random = () => 0.1;

    initPlayer();
    const npc = createMockNpc();
    useGameStore.getState().captureNPC(npc, 0);
    const captive = useGameStore.getState().captives[0];
    expect(captive.loyalty).toBeGreaterThanOrEqual(10);
    expect(captive.loyalty).toBeLessThanOrEqual(90);

    Math.random = origRandom;
  });
});

describe('releaseCaptive', () => {
  it('removes captive and adds reputation', () => {
    initPlayer();
    useGameStore.setState({
      captives: [{ npc: createMockNpc(), capturedAtTick: 0, loyalty: 50, originalClanId: 'enemy-clan' }],
    });
    const repBefore = useGameStore.getState().player!.reputation;
    useGameStore.getState().releaseCaptive(0);
    expect(useGameStore.getState().captives.length).toBe(0);
    expect(useGameStore.getState().player!.reputation).toBe(repBefore + 10);
  });

  it('does nothing for invalid index', () => {
    initPlayer();
    useGameStore.getState().releaseCaptive(999);
    expect(useGameStore.getState().captives.length).toBe(0);
  });
});

describe('executeCaptive', () => {
  it('removes captive, gives loot, reduces reputation', () => {
    initPlayer();
    useGameStore.setState({
      captives: [{ npc: createMockNpc(), capturedAtTick: 0, loyalty: 50, originalClanId: 'enemy-clan' }],
    });
    const repBefore = useGameStore.getState().player!.reputation;
    const stonesBefore = useGameStore.getState().player!.inventory['灵石'];
    useGameStore.getState().executeCaptive(0);
    expect(useGameStore.getState().captives.length).toBe(0);
    expect(useGameStore.getState().player!.reputation).toBe(repBefore - 30);
    expect(useGameStore.getState().player!.inventory['灵石']).toBeGreaterThan(stonesBefore!);
  });
});

describe('recruitCaptive', () => {
  it('recruits captive with loyalty >= 70', () => {
    initPlayer();
    useGameStore.setState({
      captives: [{ npc: createMockNpc(), capturedAtTick: 0, loyalty: 75, originalClanId: 'enemy-clan' }],
    });
    const squadBefore = useGameStore.getState().squadMembers.length;
    useGameStore.getState().recruitCaptive(0);
    expect(useGameStore.getState().captives.length).toBe(0);
    expect(useGameStore.getState().squadMembers.length).toBe(squadBefore + 1);
    expect(useGameStore.getState().squadMembers[0].name).toBe('Test Enemy');
  });

  it('fails to recruit captive with low loyalty, increases loyalty instead', () => {
    initPlayer();
    useGameStore.setState({
      captives: [{ npc: createMockNpc(), capturedAtTick: 0, loyalty: 30, originalClanId: 'enemy-clan' }],
    });
    const squadBefore = useGameStore.getState().squadMembers.length;
    useGameStore.getState().recruitCaptive(0);
    expect(useGameStore.getState().captives.length).toBe(1);
    expect(useGameStore.getState().squadMembers.length).toBe(squadBefore);
    expect(useGameStore.getState().captives[0].loyalty).toBe(40); // +10
  });
});

describe('captive panel empty state', () => {
  it('starts with zero captives', () => {
    expect(useGameStore.getState().captives).toEqual([]);
  });
});
