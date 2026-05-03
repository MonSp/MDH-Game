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
    clanId: 'test-clan',
    stats: { hp: 100, maxHp: 100, mp: 20, maxMp: 20, attack: 10, defense: 5, exp: 0, maxExp: 100 },
    hiddenStats: { killCount: 0, cultivateCount: 0, gatherCount: 0, ascensionCount: 0, merit: 0 },
    reputation: 1000,
    position: { x: 50, y: 50 },
    inventory: { '灵石': 200000, '低级法器': 3 },
    cycleInfo: { type: null as any },
    isAscending: false,
    talent: { spiritualRoot: 0, boneConstitution: 30, comprehension: 40, fortune: 20 },
    ...overrides,
  };
}

function createFactionNPC(overrides: Record<string, any> = {}) {
  return {
    id: 'npc-recruit-1',
    clanId: 'test-clan',
    name: '李四',
    role: '支脉子弟' as const,
    realm: '练气' as const,
    power: 30,
    hp: 80,
    maxHp: 80,
    mp: 15,
    maxMp: 15,
    personality: { ambition: 50, caution: 50, loyalty: 50, greed: 50 },
    resources: { spiritStone: 10 },
    activity: '闲逛中',
    position: { x: 50, y: 50 },
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

describe('Squad System — getMaxSquadSize', () => {
  it('returns 1 for reputation < 50', () => {
    useGameStore.setState({ player: createTestPlayer({ reputation: 0 }) });
    expect(useGameStore.getState().getMaxSquadSize()).toBe(1);
    useGameStore.setState({ player: createTestPlayer({ reputation: 49 }) });
    expect(useGameStore.getState().getMaxSquadSize()).toBe(1);
  });

  it('returns 3 for reputation 50-199', () => {
    useGameStore.setState({ player: createTestPlayer({ reputation: 50 }) });
    expect(useGameStore.getState().getMaxSquadSize()).toBe(3);
    useGameStore.setState({ player: createTestPlayer({ reputation: 199 }) });
    expect(useGameStore.getState().getMaxSquadSize()).toBe(3);
  });

  it('returns 7 for reputation 200-499', () => {
    useGameStore.setState({ player: createTestPlayer({ reputation: 200 }) });
    expect(useGameStore.getState().getMaxSquadSize()).toBe(7);
    useGameStore.setState({ player: createTestPlayer({ reputation: 499 }) });
    expect(useGameStore.getState().getMaxSquadSize()).toBe(7);
  });

  it('returns 15 for reputation 500+', () => {
    useGameStore.setState({ player: createTestPlayer({ reputation: 500 }) });
    expect(useGameStore.getState().getMaxSquadSize()).toBe(15);
    useGameStore.setState({ player: createTestPlayer({ reputation: 9999 }) });
    expect(useGameStore.getState().getMaxSquadSize()).toBe(15);
  });
});

describe('Squad System — recruitToSquad respects cap', () => {
  it('cannot recruit when squad is full', () => {
    // Use rep=150: maxSize=3, enough for 战斗型 (rep 100)
    // NPC personality: ambition>60, caution<40 → auto-detects as 战斗型
    useGameStore.setState({
      player: createTestPlayer({ reputation: 150 }),
      nearbyNPCs: [
        createFactionNPC({ id: 'npc-a', personality: { ambition: 70, caution: 30, loyalty: 50, greed: 40 } }),
        createFactionNPC({ id: 'npc-b', personality: { ambition: 70, caution: 30, loyalty: 50, greed: 40 } }),
        createFactionNPC({ id: 'npc-c', personality: { ambition: 70, caution: 30, loyalty: 50, greed: 40 } }),
        createFactionNPC({ id: 'npc-d', personality: { ambition: 70, caution: 30, loyalty: 50, greed: 40 } }),
      ],
    });
    // Fill to cap (3)
    useGameStore.getState().recruitToSquad('npc-a');
    useGameStore.getState().recruitToSquad('npc-b');
    useGameStore.getState().recruitToSquad('npc-c');
    expect(useGameStore.getState().squadMembers.length).toBe(3);
    // Try recruiting 4th — should be blocked
    useGameStore.getState().recruitToSquad('npc-d');
    expect(useGameStore.getState().squadMembers.length).toBe(3);
  });

  it('recruits successfully when under cap', () => {
    useGameStore.setState({
      player: createTestPlayer({ reputation: 1000 }), // max size = 15
      nearbyNPCs: [createFactionNPC({ id: 'npc-recruit-1', personality: { ambition: 70, caution: 30, loyalty: 50, greed: 40 } })],
    });
    useGameStore.getState().recruitToSquad('npc-recruit-1');
    expect(useGameStore.getState().squadMembers.length).toBe(1);
  });

  it('removes recruited NPC from nearbyNPCs', () => {
    useGameStore.setState({
      player: createTestPlayer({ reputation: 1000 }),
      nearbyNPCs: [createFactionNPC({ id: 'npc-recruit-1', personality: { ambition: 70, caution: 30, loyalty: 50, greed: 40 } })],
    });
    useGameStore.getState().recruitToSquad('npc-recruit-1');
    expect(useGameStore.getState().nearbyNPCs.length).toBe(0);
  });
});

describe('Squad System — member initialization has P1 fields', () => {
  it('new squad member has equipment=[], level=1, exp=0, maxExp=80', () => {
    useGameStore.setState({
      player: createTestPlayer({ reputation: 1000 }),
      nearbyNPCs: [createFactionNPC({ id: 'npc-recruit-1', personality: { ambition: 70, caution: 30, loyalty: 50, greed: 40 } })],
    });
    useGameStore.getState().recruitToSquad('npc-recruit-1');
    const member = useGameStore.getState().squadMembers[0];
    expect(member.equipment).toEqual([]);
    expect(member.level).toBe(1);
    expect(member.exp).toBe(0);
    expect(member.maxExp).toBe(80);
  });
});

describe('Squad System — equipMember / unequipMember', () => {
  it('equips item and adds power bonus', () => {
    useGameStore.setState({
      player: createTestPlayer({ reputation: 1000, inventory: { '灵石': 1000, '低级法器': 2 } }),
      squadMembers: [{
        id: 'member-1',
        npcId: 'npc-1',
        name: '赵云',
        clanId: 'test-clan',
        role: '战斗型' as const,
        realm: '练气' as const,
        power: 30,
        hp: 80,
        maxHp: 80,
        mp: 15,
        maxMp: 15,
        personality: { ambition: 70, caution: 30, loyalty: 60, greed: 40 },
        joinDate: Date.now(),
        kills: 0,
        isAlive: true,
        position: { x: 50, y: 50 },
        activity: '跟随中',
        equipment: [],
        level: 1,
        exp: 0,
        maxExp: 80,
      }],
    });

    useGameStore.getState().equipMember('member-1', '低级法器');
    const member = useGameStore.getState().squadMembers.find(m => m.id === 'member-1')!;
    expect(member.equipment).toContain('低级法器');
    expect(member.power).toBe(40); // 30 + 10
    // Item consumed from inventory
    expect(useGameStore.getState().player!.inventory['低级法器']).toBe(1);
  });

  it('cannot equip if member already has equipment', () => {
    useGameStore.setState({
      player: createTestPlayer({ reputation: 1000, inventory: { '灵石': 1000, '低级法器': 2 } }),
      squadMembers: [{
        id: 'member-1',
        npcId: 'npc-1',
        name: '赵云',
        clanId: 'test-clan',
        role: '战斗型' as const,
        realm: '练气' as const,
        power: 30,
        hp: 80,
        maxHp: 80,
        mp: 15,
        maxMp: 15,
        personality: { ambition: 70, caution: 30, loyalty: 60, greed: 40 },
        joinDate: Date.now(),
        kills: 0,
        isAlive: true,
        position: { x: 50, y: 50 },
        activity: '跟随中',
        equipment: ['低级法器'],
        level: 1,
        exp: 0,
        maxExp: 80,
      }],
    });

    useGameStore.getState().equipMember('member-1', '低级法器');
    const member = useGameStore.getState().squadMembers.find(m => m.id === 'member-1')!;
    expect(member.equipment?.length).toBe(1); // still 1, didn't add another
  });

  it('cannot equip if member is dead', () => {
    useGameStore.setState({
      player: createTestPlayer({ reputation: 1000, inventory: { '灵石': 1000, '低级法器': 2 } }),
      squadMembers: [{
        id: 'member-1',
        npcId: 'npc-1',
        name: '赵云',
        clanId: 'test-clan',
        role: '战斗型' as const,
        realm: '练气' as const,
        power: 30,
        hp: 0,
        maxHp: 80,
        mp: 0,
        maxMp: 15,
        personality: { ambition: 70, caution: 30, loyalty: 60, greed: 40 },
        joinDate: Date.now(),
        kills: 0,
        isAlive: false,
        position: { x: 50, y: 50 },
        activity: '已阵亡',
        equipment: [],
        level: 1,
        exp: 0,
        maxExp: 80,
      }],
    });

    useGameStore.getState().equipMember('member-1', '低级法器');
    expect(useGameStore.getState().player!.inventory['低级法器']).toBe(2); // not consumed
  });

  it('unequip removes item, restores power, returns to inventory', () => {
    useGameStore.setState({
      player: createTestPlayer({ reputation: 1000, inventory: { '灵石': 1000, '低级法器': 1 } }),
      squadMembers: [{
        id: 'member-1',
        npcId: 'npc-1',
        name: '赵云',
        clanId: 'test-clan',
        role: '战斗型' as const,
        realm: '练气' as const,
        power: 40, // 30 base + 10 from equipment
        hp: 80,
        maxHp: 80,
        mp: 15,
        maxMp: 15,
        personality: { ambition: 70, caution: 30, loyalty: 60, greed: 40 },
        joinDate: Date.now(),
        kills: 0,
        isAlive: true,
        position: { x: 50, y: 50 },
        activity: '跟随中',
        equipment: ['低级法器'],
        level: 1,
        exp: 0,
        maxExp: 80,
      }],
    });

    useGameStore.getState().unequipMember('member-1', '低级法器');
    const member = useGameStore.getState().squadMembers.find(m => m.id === 'member-1')!;
    expect(member.equipment).toEqual([]);
    expect(member.power).toBe(30); // restored
    expect(useGameStore.getState().player!.inventory['低级法器']).toBe(2); // returned
  });
});

describe('Squad System — dismissFromSquad returns equipment', () => {
  it('returns equipped items to inventory on dismissal', () => {
    useGameStore.setState({
      player: createTestPlayer({ reputation: 1000, inventory: { '灵石': 1000, '低级法器': 0 } }),
      squadMembers: [{
        id: 'member-1',
        npcId: 'npc-1',
        name: '赵云',
        clanId: 'test-clan',
        role: '战斗型' as const,
        realm: '练气' as const,
        power: 40,
        hp: 80,
        maxHp: 80,
        mp: 15,
        maxMp: 15,
        personality: { ambition: 70, caution: 30, loyalty: 60, greed: 40 },
        joinDate: Date.now(),
        kills: 0,
        isAlive: true,
        position: { x: 50, y: 50 },
        activity: '跟随中',
        equipment: ['低级法器'],
        level: 1,
        exp: 0,
        maxExp: 80,
      }],
    });

    useGameStore.getState().dismissFromSquad('member-1');
    expect(useGameStore.getState().squadMembers.length).toBe(0);
    expect(useGameStore.getState().player!.inventory['低级法器']).toBe(1);
  });
});
