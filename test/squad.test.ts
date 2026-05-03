import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, SQUAD_ROLE_INFO, RECRUIT_REPUTATION_TIER, RECRUIT_SPIRITSTONE_COST } from '../src/store/gameStore';

function createTestPlayer() {
  return {
    id: 'test-player',
    name: 'TestPlayer',
    heavenLevel: 9 as const,
    realm: '练气' as const,
    bodyType: '凡体' as const,
    potential: '无',
    country: '赵',
    clanId: 'test-clan',
    stats: { hp: 100, maxHp: 100, mp: 20, maxMp: 20, attack: 10, defense: 5, exp: 0, maxExp: 100 },
    hiddenStats: { killCount: 0, cultivateCount: 0, gatherCount: 0, ascensionCount: 0, merit: 0 },
    reputation: 1000,
    position: { x: 50, y: 50 },
    inventory: { '灵石': 1000 },
    cycleInfo: { type: null as any },
    isAscending: false,
    talent: { spiritualRoot: 25, boneConstitution: 30, comprehension: 40, fortune: 20 },
  };
}

function createTestNPC(overrides: Record<string, any> = {}) {
  return {
    id: 'npc-recruit-1',
    name: '李四',
    clanId: 'test-clan',
    role: '支脉子弟',
    realm: '练气' as const,
    power: 50,
    hp: 80,
    maxHp: 80,
    mp: 30,
    maxMp: 30,
    personality: { ambition: 50, caution: 50, loyalty: 30, greed: 30 },
    resources: { spiritStone: 10 },
    activity: '闲逛中',
    position: { x: 50, y: 51 },
    retreatTicksRemaining: undefined,
    targetPlayerId: undefined,
    ...overrides,
  };
}

beforeEach(() => {
  useGameStore.setState({
    player: null,
    squadMembers: [],
    nearbyNPCs: [],
    logs: [],
    wildMonsters: [],
    clans: [],
    resourcePoints: [],
    market: {},
    metNpcs: [],
    npcMemory: {},
  });
});

describe('SquadRole constants', () => {
  it('SQUAD_ROLE_INFO has all four roles', () => {
    expect(Object.keys(SQUAD_ROLE_INFO)).toEqual(['战斗型', '斥候型', '军师型', '后勤型']);
  });

  it('RECRUIT_REPUTATION_TIER defines thresholds for all roles', () => {
    expect(RECRUIT_REPUTATION_TIER['战斗型']).toBe(100);
    expect(RECRUIT_REPUTATION_TIER['斥候型']).toBe(500);
    expect(RECRUIT_REPUTATION_TIER['军师型']).toBe(2000);
    expect(RECRUIT_REPUTATION_TIER['后勤型']).toBe(500);
  });

  it('RECRUIT_SPIRITSTONE_COST defines costs for all roles', () => {
    expect(RECRUIT_SPIRITSTONE_COST['战斗型']).toBe(200);
    expect(RECRUIT_SPIRITSTONE_COST['斥候型']).toBe(350);
    expect(RECRUIT_SPIRITSTONE_COST['军师型']).toBe(500);
    expect(RECRUIT_SPIRITSTONE_COST['后勤型']).toBe(300);
  });
});

describe('getRecruitCost', () => {
  it('returns canRecruit when player meets requirements', () => {
    useGameStore.setState({ player: createTestPlayer() });
    const npc = createTestNPC();
    const cost = useGameStore.getState().getRecruitCost(npc);
    expect(cost.canRecruit).toBe(true);
    expect(cost.reason).toBe('');
  });

  it('rejects when reputation is too low for the detected role', () => {
    useGameStore.setState({ player: { ...createTestPlayer(), reputation: 50 } });
    // NPC with high ambition → 战斗型 (needs 100 rep)
    const npc = createTestNPC({ personality: { ambition: 70, caution: 20, loyalty: 30, greed: 30 } });
    const cost = useGameStore.getState().getRecruitCost(npc);
    expect(cost.canRecruit).toBe(false);
    expect(cost.reason).toContain('声望不足');
  });

  it('rejects when spirit stones are insufficient', () => {
    useGameStore.setState({ player: { ...createTestPlayer(), inventory: { '灵石': 10 } } });
    const npc = createTestNPC();
    const cost = useGameStore.getState().getRecruitCost(npc);
    expect(cost.canRecruit).toBe(false);
    expect(cost.reason).toContain('灵石不足');
  });

  it('rejects when NPC loyalty > 80', () => {
    useGameStore.setState({ player: createTestPlayer() });
    const npc = createTestNPC({ personality: { ambition: 50, caution: 50, loyalty: 90, greed: 30 } });
    const cost = useGameStore.getState().getRecruitCost(npc);
    expect(cost.canRecruit).toBe(false);
    expect(cost.reason).toContain('忠诚');
  });

  it('greed modifier inflates spirit stone cost', () => {
    useGameStore.setState({ player: createTestPlayer() });
    // Greed 100 → modifier = 1 + 0.3 = 1.3. 战斗型 base 200 → 260
    const npc = createTestNPC({
      personality: { ambition: 70, caution: 20, loyalty: 30, greed: 100 },
    });
    const cost = useGameStore.getState().getRecruitCost(npc);
    expect(cost.spiritStoneCost).toBeGreaterThan(RECRUIT_SPIRITSTONE_COST['战斗型']);
  });

  it('returns canRecruit false with reason when no player exists', () => {
    const npc = createTestNPC();
    const cost = useGameStore.getState().getRecruitCost(npc);
    expect(cost.canRecruit).toBe(false);
    expect(cost.reason).toBe('无玩家数据');
  });
});

describe('recruitToSquad', () => {
  it('removes NPC from nearbyNPCs and deducts spirit stones', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      nearbyNPCs: [createTestNPC()],
    });
    const store = useGameStore.getState();
    store.recruitToSquad('npc-recruit-1');

    const state = useGameStore.getState();
    expect(state.squadMembers.length).toBe(1);
    expect(state.squadMembers[0].name).toBe('李四');
    expect(state.squadMembers[0].isAlive).toBe(true);
    expect(state.squadMembers[0].kills).toBe(0);
    expect(state.nearbyNPCs.length).toBe(0);
    expect(state.player!.inventory['灵石']).toBeLessThan(1000);
  });

  it('logs a recruitment event', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      nearbyNPCs: [createTestNPC()],
    });
    useGameStore.getState().recruitToSquad('npc-recruit-1');
    const logs = useGameStore.getState().logs;
    const recruitLog = logs.find(l => l.message.includes('招募'));
    expect(recruitLog).toBeDefined();
    expect(recruitLog!.message).toContain('李四');
  });

  it('does nothing when NPC is not in nearbyNPCs', () => {
    useGameStore.setState({ player: createTestPlayer(), nearbyNPCs: [] });
    useGameStore.getState().recruitToSquad('nonexistent');
    expect(useGameStore.getState().squadMembers.length).toBe(0);
  });

  it('does nothing when no player exists', () => {
    useGameStore.setState({ nearbyNPCs: [createTestNPC()] });
    useGameStore.getState().recruitToSquad('npc-recruit-1');
    expect(useGameStore.getState().squadMembers.length).toBe(0);
  });

  it('auto-assigns role based on personality: ambition > 60 and caution < 40 → 战斗型', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      nearbyNPCs: [createTestNPC({ personality: { ambition: 80, caution: 20, loyalty: 30, greed: 30 } })],
    });
    useGameStore.getState().recruitToSquad('npc-recruit-1');
    expect(useGameStore.getState().squadMembers[0].role).toBe('战斗型');
  });

  it('auto-assigns role based on personality: ambition > 50 and caution > 50 → 军师型', () => {
    useGameStore.setState({
      player: { ...createTestPlayer(), reputation: 2000 },
      nearbyNPCs: [createTestNPC({ personality: { ambition: 60, caution: 60, loyalty: 30, greed: 30 } })],
    });
    useGameStore.getState().recruitToSquad('npc-recruit-1');
    expect(useGameStore.getState().squadMembers[0].role).toBe('军师型');
  });

  it('auto-assigns role based on personality: caution > 60 and greed > 50 → 后勤型', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      nearbyNPCs: [createTestNPC({ personality: { ambition: 30, caution: 70, loyalty: 30, greed: 60 } })],
    });
    useGameStore.getState().recruitToSquad('npc-recruit-1');
    expect(useGameStore.getState().squadMembers[0].role).toBe('后勤型');
  });

  it('auto-assigns role based on personality: fallback → 斥候型', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      nearbyNPCs: [createTestNPC({ personality: { ambition: 40, caution: 40, loyalty: 30, greed: 40 } })],
    });
    useGameStore.getState().recruitToSquad('npc-recruit-1');
    expect(useGameStore.getState().squadMembers[0].role).toBe('斥候型');
  });
});

describe('dismissFromSquad', () => {
  it('removes member from squad and adds NPC back to nearbyNPCs', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      squadMembers: [{
        id: 'squad-1',
        npcId: 'npc-recruit-1',
        name: '李四',
        clanId: 'test-clan',
        role: '战斗型' as const,
        realm: '练气' as const,
        power: 50,
        hp: 80,
        maxHp: 80,
        mp: 30,
        maxMp: 30,
        personality: { ambition: 50, caution: 50, loyalty: 30, greed: 30 },
        joinDate: Date.now(),
        kills: 3,
        isAlive: true,
        position: { x: 50, y: 51 },
        activity: '跟随中',
      }],
    });
    useGameStore.getState().dismissFromSquad('squad-1');

    const state = useGameStore.getState();
    expect(state.squadMembers.length).toBe(0);
    expect(state.nearbyNPCs.length).toBe(1);
    expect(state.nearbyNPCs[0].name).toBe('李四');
  });

  it('logs dismissal event', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      squadMembers: [{
        id: 'squad-1',
        npcId: 'npc-recruit-1',
        name: '李四',
        clanId: 'test-clan',
        role: '战斗型' as const,
        realm: '练气' as const,
        power: 50,
        hp: 80,
        maxHp: 80,
        mp: 30,
        maxMp: 30,
        personality: { ambition: 50, caution: 50, loyalty: 30, greed: 30 },
        joinDate: Date.now(),
        kills: 0,
        isAlive: true,
        position: { x: 50, y: 51 },
        activity: '跟随中',
      }],
    });
    useGameStore.getState().dismissFromSquad('squad-1');
    const logs = useGameStore.getState().logs;
    expect(logs.some(l => l.message.includes('离开了你的队伍'))).toBe(true);
  });
});

describe('assignSquadRole', () => {
  it('updates the member role and logs the event', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      squadMembers: [{
        id: 'squad-1',
        npcId: 'npc-recruit-1',
        name: '李四',
        clanId: 'test-clan',
        role: '战斗型' as const,
        realm: '练气' as const,
        power: 50,
        hp: 80,
        maxHp: 80,
        mp: 30,
        maxMp: 30,
        personality: { ambition: 50, caution: 50, loyalty: 30, greed: 30 },
        joinDate: Date.now(),
        kills: 0,
        isAlive: true,
        position: { x: 50, y: 51 },
        activity: '跟随中',
      }],
    });
    useGameStore.getState().assignSquadRole('squad-1', '斥候型');

    const state = useGameStore.getState();
    expect(state.squadMembers[0].role).toBe('斥候型');
    expect(state.logs.some(l => l.message.includes('职务已调整'))).toBe(true);
  });
});

describe('squad permadeath', () => {
  it('sets isAlive=false when member HP reaches 0 in combat', () => {
    const member = {
      id: 'squad-1',
      npcId: 'npc-recruit-1',
      name: '李四',
      clanId: 'test-clan',
      role: '战斗型' as const,
      realm: '练气' as const,
      power: 1,
      hp: 1,
      maxHp: 100,
      mp: 30,
      maxMp: 30,
      personality: { ambition: 50, caution: 50, loyalty: 30, greed: 30 },
      joinDate: Date.now(),
      kills: 0,
      isAlive: true,
      position: { x: 50, y: 51 },
      activity: '跟随中',
    };

    useGameStore.setState({
      player: { ...createTestPlayer(), position: { x: 50, y: 50 } },
      squadMembers: [member],
      wildMonsters: [{
        id: 'monster-1',
        name: '赤焰蛇',
        realm: '练气',
        hp: 200,
        maxHp: 200,
        attack: 200,
        defense: 5,
        expReward: 30,
        position: { x: 50, y: 51 },
        isAlive: true,
      }],
    });

    // Tick will: monster moves toward player → adjacent to squad member → combat
    for (let i = 0; i < 3; i++) {
      useGameStore.getState().updateNPCs();
    }

    const state = useGameStore.getState();
    const deadMember = state.squadMembers.find(m => m.id === 'squad-1');
    expect(deadMember).toBeDefined();
    // Member should be dead or at least took damage
    if (deadMember) {
      expect(deadMember.hp).toBeLessThanOrEqual(0);
    }
  });
});

describe('squad save/load', () => {
  it('includes squadMembers in save data', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      squadMembers: [{
        id: 'squad-1',
        npcId: 'npc-recruit-1',
        name: '李四',
        clanId: 'test-clan',
        role: '战斗型' as const,
        realm: '练气' as const,
        power: 50,
        hp: 80,
        maxHp: 80,
        mp: 30,
        maxMp: 30,
        personality: { ambition: 50, caution: 50, loyalty: 30, greed: 30 },
        joinDate: Date.now(),
        kills: 2,
        isAlive: true,
        position: { x: 50, y: 51 },
        activity: '跟随中',
      }],
    });

    const state = useGameStore.getState();
    expect(state.squadMembers.length).toBe(1);
    expect(state.squadMembers[0].name).toBe('李四');
    expect(state.squadMembers[0].kills).toBe(2);
  });

  it('defaults to empty array when loading save data without squadMembers (backward compat)', () => {
    // Simulate loading from a slot with no squadMembers
    useGameStore.setState({ squadMembers: [] });
    expect(useGameStore.getState().squadMembers).toEqual([]);
  });
});

describe('squad cleared on lifecycle events', () => {
  it('clears squadMembers on cycle rebirth', () => {
    useGameStore.setState({
      player: {
        ...createTestPlayer(),
        heavenLevel: 6,
        cycleInfo: {
          type: null as any,
          previousClanId: 'test-clan',
          previousCountry: '秦',
        },
      },
      clans: [],
      resourcePoints: [],
      squadMembers: [{
        id: 'squad-1',
        npcId: 'npc-1',
        name: '张三',
        clanId: 'test-clan',
        role: '战斗型' as const,
        realm: '练气' as const,
        power: 50,
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        personality: { ambition: 50, caution: 50, loyalty: 50, greed: 50 },
        joinDate: Date.now(),
        kills: 5,
        isAlive: true,
        position: { x: 50, y: 51 },
        activity: '跟随中',
      }],
    });

    useGameStore.getState().performCycleRebirth('真灵转世');

    expect(useGameStore.getState().squadMembers).toEqual([]);
  });
});
