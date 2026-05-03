import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, FACTION_CREATE_REQUIREMENTS, BUILDING_EFFECTS, BUILDING_UPGRADE_COST } from '../src/store/gameStore';
import type { BuildingType, BuildingLevel, SquadMember } from '../src/store/gameStore';

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
    inventory: { '灵石': 200000 },
    cycleInfo: { type: null as any },
    isAscending: false,
    talent: { spiritualRoot: 25, boneConstitution: 30, comprehension: 40, fortune: 20 },
    ...overrides,
  };
}

function createTestSquadMember(id: string, overrides: Record<string, any> = {}): SquadMember {
  return {
    id,
    npcId: `npc-${id}`,
    name: '队员',
    clanId: 'test-clan',
    role: '战斗型' as const,
    realm: '练气' as const,
    power: 50,
    hp: 100,
    maxHp: 100,
    mp: 30,
    maxMp: 30,
    personality: { ambition: 50, caution: 50, loyalty: 30, greed: 30 },
    joinDate: Date.now(),
    kills: 0,
    isAlive: true,
    position: { x: 50, y: 51 },
    activity: '跟随中',
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
    playerFactionId: null,
    ascensionQuests: [],
  });
});

describe('Faction: createFaction', () => {
  it('fails when reputation is too low', () => {
    useGameStore.setState({
      player: createTestPlayer({ reputation: 100 }),
      squadMembers: [createTestSquadMember('s1'), createTestSquadMember('s2'), createTestSquadMember('s3')],
    });
    const result = useGameStore.getState().createFaction('测试势力');
    expect(result).toBe(false);
    expect(useGameStore.getState().playerFactionId).toBeNull();
  });

  it('fails when spirit stones are insufficient', () => {
    useGameStore.setState({
      player: createTestPlayer({ inventory: { '灵石': 500 } }),
      squadMembers: [createTestSquadMember('s1'), createTestSquadMember('s2'), createTestSquadMember('s3')],
    });
    const result = useGameStore.getState().createFaction('测试势力');
    expect(result).toBe(false);
    expect(useGameStore.getState().playerFactionId).toBeNull();
  });

  it('fails when fewer than 3 squad members', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      squadMembers: [createTestSquadMember('s1'), createTestSquadMember('s2')],
    });
    const result = useGameStore.getState().createFaction('测试势力');
    expect(result).toBe(false);
    expect(useGameStore.getState().playerFactionId).toBeNull();
  });

  it('succeeds when all requirements are met', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      squadMembers: [createTestSquadMember('s1'), createTestSquadMember('s2'), createTestSquadMember('s3')],
    });
    const result = useGameStore.getState().createFaction('青云宗');
    expect(result).toBe(true);
    const state = useGameStore.getState();
    expect(state.playerFactionId).toBeTruthy();
    expect(state.clans.find(c => c.id === state.playerFactionId)).toBeDefined();
    expect(state.player!.inventory['灵石']).toBe(200000 - FACTION_CREATE_REQUIREMENTS.spiritStones);
    expect(state.player!.clanId).toBe(state.playerFactionId);
  });

  it('creates faction with 议事厅 lv1 and territory 1', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      squadMembers: [createTestSquadMember('s1'), createTestSquadMember('s2'), createTestSquadMember('s3')],
    });
    useGameStore.getState().createFaction('青云宗');
    const state = useGameStore.getState();
    const faction = state.clans.find(c => c.id === state.playerFactionId)!;
    expect(faction.buildings).toHaveLength(1);
    expect(faction.buildings![0].type).toBe('议事厅');
    expect(faction.buildings![0].level).toBe(1);
    expect(faction.territory).toBe(1);
    expect(faction.morale).toBe(50);
  });

  it('logs a faction creation event', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      squadMembers: [createTestSquadMember('s1'), createTestSquadMember('s2'), createTestSquadMember('s3')],
    });
    useGameStore.getState().createFaction('青云宗');
    const logs = useGameStore.getState().logs;
    expect(logs.some(l => l.message.includes('创立了'))).toBe(true);
    expect(logs.some(l => l.message.includes('青云宗'))).toBe(true);
  });
});

describe('Faction: upgradeBuilding', () => {
  it('builds a new building when one does not exist', () => {
    const factionId = 'test-faction';
    useGameStore.setState({
      player: createTestPlayer(),
      playerFactionId: factionId,
      squadMembers: [createTestSquadMember('s1'), createTestSquadMember('s2'), createTestSquadMember('s3')],
      clans: [{
        id: factionId,
        name: '青云宗',
        country: '赵',
        type: '3级',
        reputation: 100,
        treasury: 0,
        heavenLevel: 9,
        isAscendingFamily: false,
        buildings: [{ type: '议事厅' as BuildingType, level: 1 as BuildingLevel, hp: 100 }],
        territory: 1,
        morale: 50,
      }],
    });
    const cost = BUILDING_UPGRADE_COST['练功房'][0];
    const prevStones = useGameStore.getState().player!.inventory['灵石'];

    useGameStore.getState().upgradeBuilding('练功房');

    const state = useGameStore.getState();
    const faction = state.clans.find(c => c.id === factionId)!;
    const building = faction.buildings!.find(b => b.type === '练功房');
    expect(building).toBeDefined();
    expect(building!.level).toBe(1);
    expect(state.player!.inventory['灵石']).toBe(prevStones - cost);
  });

  it('upgrades an existing building and deducts cost', () => {
    const factionId = 'test-faction';
    useGameStore.setState({
      player: createTestPlayer(),
      playerFactionId: factionId,
      squadMembers: [createTestSquadMember('s1'), createTestSquadMember('s2'), createTestSquadMember('s3')],
      clans: [{
        id: factionId,
        name: '青云宗',
        country: '赵',
        type: '3级',
        reputation: 100,
        treasury: 0,
        heavenLevel: 9,
        isAscendingFamily: false,
        buildings: [{ type: '练功房' as BuildingType, level: 1 as BuildingLevel, hp: 100 }],
        territory: 1,
        morale: 50,
      }],
    });
    const cost = BUILDING_UPGRADE_COST['练功房'][1]; // level 1→2 cost
    const prevStones = useGameStore.getState().player!.inventory['灵石'];

    useGameStore.getState().upgradeBuilding('练功房');

    const state = useGameStore.getState();
    const faction = state.clans.find(c => c.id === factionId)!;
    const building = faction.buildings!.find(b => b.type === '练功房');
    expect(building!.level).toBe(2);
    expect(state.player!.inventory['灵石']).toBe(prevStones - cost);
  });

  it('fails at max level (3)', () => {
    const factionId = 'test-faction';
    useGameStore.setState({
      player: createTestPlayer(),
      playerFactionId: factionId,
      squadMembers: [createTestSquadMember('s1'), createTestSquadMember('s2'), createTestSquadMember('s3')],
      clans: [{
        id: factionId,
        name: '青云宗',
        country: '赵',
        type: '3级',
        reputation: 100,
        treasury: 0,
        heavenLevel: 9,
        isAscendingFamily: false,
        buildings: [{ type: '练功房' as BuildingType, level: 3 as BuildingLevel, hp: 100 }],
        territory: 1,
        morale: 50,
      }],
    });
    const prevStones = useGameStore.getState().player!.inventory['灵石'];

    useGameStore.getState().upgradeBuilding('练功房');

    // Stones should remain unchanged
    const state = useGameStore.getState();
    expect(state.player!.inventory['灵石']).toBe(prevStones);
    const building = state.clans.find(c => c.id === factionId)!.buildings!.find(b => b.type === '练功房');
    expect(building!.level).toBe(3);
  });
});

describe('Faction: appointOfficer', () => {
  it('sets squad member activity to the appointed position', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      squadMembers: [createTestSquadMember('s1')],
    });
    useGameStore.getState().appointOfficer('s1', '长老');
    expect(useGameStore.getState().squadMembers[0].activity).toBe('职务：长老');
  });

  it('logs appointment event', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      squadMembers: [createTestSquadMember('s1', { name: '张三' })],
    });
    useGameStore.getState().appointOfficer('s1', '供奉');
    const logs = useGameStore.getState().logs;
    expect(logs.some(l => l.message.includes('任命'))).toBe(true);
    expect(logs.some(l => l.message.includes('张三'))).toBe(true);
  });

  it('logs "未知" when squad member not found', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      squadMembers: [],
    });
    useGameStore.getState().appointOfficer('nonexistent', '长老');
    const logs = useGameStore.getState().logs;
    expect(logs.some(l => l.message.includes('未知'))).toBe(true);
  });
});

describe('Faction: collectTax', () => {
  it('calculates and adds tax income to faction treasury', () => {
    const factionId = 'test-faction';
    useGameStore.setState({
      player: createTestPlayer(),
      playerFactionId: factionId,
      clans: [{
        id: factionId,
        name: '青云宗',
        country: '赵',
        type: '3级',
        reputation: 100,
        treasury: 0,
        heavenLevel: 9,
        isAscendingFamily: false,
        buildings: [{ type: '议事厅' as BuildingType, level: 1 as BuildingLevel, hp: 100 }],
        territory: 1,
        morale: 50,
      }],
    });
    useGameStore.getState().collectTax();
    const faction = useGameStore.getState().clans.find(c => c.id === factionId)!;
    expect(faction.treasury).toBeGreaterThan(0);
    expect(faction.morale).toBeGreaterThan(50);
  });
});

describe('Faction: getFactionUpgradeCost', () => {
  it('returns correct cost for 3级 faction', () => {
    const factionId = 'test-faction';
    useGameStore.setState({
      player: createTestPlayer(),
      playerFactionId: factionId,
      clans: [{
        id: factionId,
        name: '青云宗',
        country: '赵',
        type: '3级',
        reputation: 100,
        treasury: 0,
        heavenLevel: 9,
        isAscendingFamily: false,
      }],
    });
    const cost = useGameStore.getState().getFactionUpgradeCost();
    expect(cost.reputation).toBe(2000);
    expect(cost.stones).toBe(500000);
  });

  it('returns zeros when no player faction', () => {
    const cost = useGameStore.getState().getFactionUpgradeCost();
    expect(cost.reputation).toBe(0);
    expect(cost.stones).toBe(0);
  });
});

describe('Faction: BUILDING_EFFECTS constant', () => {
  it('has 3 levels of effects for each building type', () => {
    const types: BuildingType[] = ['议事厅', '练功房', '丹房', '藏经阁', '库房', '哨塔'];
    for (const t of types) {
      expect(BUILDING_EFFECTS[t]).toHaveLength(3);
    }
  });
});

describe('Faction: save/load', () => {
  it('includes playerFactionId in state and defaults to null', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      playerFactionId: 'faction-123',
    });

    const state = useGameStore.getState();
    expect(state.playerFactionId).toBe('faction-123');

    // Simulate loading from a save without playerFactionId (backward compat)
    useGameStore.setState({ playerFactionId: null });
    expect(useGameStore.getState().playerFactionId).toBeNull();
  });
});

describe('Faction: upgradeBuilding guard clauses', () => {
  it('returns when player is null', () => {
    useGameStore.setState({
      player: null,
      playerFactionId: 'test-faction',
      clans: [],
    });
    const prevLogs = useGameStore.getState().logs.length;
    useGameStore.getState().upgradeBuilding('练功房');
    const logs = useGameStore.getState().logs;
    expect(logs.some(l => l.message.includes('没有管理任何势力'))).toBe(true);
  });

  it('returns when playerFactionId is null', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      playerFactionId: null,
    });
    useGameStore.getState().upgradeBuilding('练功房');
    expect(useGameStore.getState().logs.some(l => l.message.includes('没有管理任何势力'))).toBe(true);
  });

  it('fails to build when stones are insufficient', () => {
    const factionId = 'test-faction';
    useGameStore.setState({
      player: createTestPlayer({ inventory: { '灵石': 10 } }),
      playerFactionId: factionId,
      clans: [{
        id: factionId, name: '青云宗', country: '赵', type: '3级',
        reputation: 100, treasury: 0, heavenLevel: 9, isAscendingFamily: false,
        buildings: [{ type: '议事厅' as BuildingType, level: 1 as BuildingLevel, hp: 100 }],
        territory: 1, morale: 50,
      }],
    });
    useGameStore.getState().upgradeBuilding('练功房');
    const faction = useGameStore.getState().clans.find(c => c.id === factionId)!;
    expect(faction.buildings!.find(b => b.type === '练功房')).toBeUndefined();
  });

  it('fails to upgrade when stones are insufficient', () => {
    const factionId = 'test-faction';
    useGameStore.setState({
      player: createTestPlayer({ inventory: { '灵石': 10 } }),
      playerFactionId: factionId,
      clans: [{
        id: factionId, name: '青云宗', country: '赵', type: '3级',
        reputation: 100, treasury: 0, heavenLevel: 9, isAscendingFamily: false,
        buildings: [
          { type: '议事厅' as BuildingType, level: 1 as BuildingLevel, hp: 100 },
          { type: '练功房' as BuildingType, level: 1 as BuildingLevel, hp: 100 },
        ],
        territory: 1, morale: 50,
      }],
    });
    useGameStore.getState().upgradeBuilding('练功房');
    const building = useGameStore.getState().clans.find(c => c.id === factionId)!.buildings!.find(b => b.type === '练功房');
    expect(building!.level).toBe(1);
  });
});

describe('Faction: collectTax guard clauses', () => {
  it('returns 0 when player is null', () => {
    useGameStore.setState({ player: null, playerFactionId: 'test-faction' });
    expect(useGameStore.getState().collectTax()).toBe(0);
  });

  it('returns 0 when playerFactionId is null', () => {
    useGameStore.setState({ player: createTestPlayer(), playerFactionId: null });
    expect(useGameStore.getState().collectTax()).toBe(0);
  });

  it('returns 0 when faction not found', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      playerFactionId: 'nonexistent',
      clans: [],
    });
    expect(useGameStore.getState().collectTax()).toBe(0);
  });
});

describe('Faction: getFactionUpgradeCost edge cases', () => {
  it('returns correct cost for 2级 faction', () => {
    const factionId = 'test-faction';
    useGameStore.setState({
      player: createTestPlayer(),
      playerFactionId: factionId,
      clans: [{
        id: factionId, name: '青云宗', country: '赵', type: '2级',
        reputation: 100, treasury: 0, heavenLevel: 9, isAscendingFamily: false,
      }],
    });
    const cost = useGameStore.getState().getFactionUpgradeCost();
    expect(cost.reputation).toBe(5000);
    expect(cost.stones).toBe(2000000);
  });

  it('returns zeros for 皇族 faction', () => {
    const factionId = 'test-faction';
    useGameStore.setState({
      player: createTestPlayer(),
      playerFactionId: factionId,
      clans: [{
        id: factionId, name: '皇族', country: '赵', type: '皇族',
        reputation: 100, treasury: 0, heavenLevel: 9, isAscendingFamily: false,
      }],
    });
    const cost = useGameStore.getState().getFactionUpgradeCost();
    expect(cost.reputation).toBe(0);
    expect(cost.stones).toBe(0);
  });

  it('returns zeros when faction not found', () => {
    useGameStore.setState({
      player: createTestPlayer(),
      playerFactionId: 'nonexistent',
      clans: [],
    });
    const cost = useGameStore.getState().getFactionUpgradeCost();
    expect(cost.reputation).toBe(0);
    expect(cost.stones).toBe(0);
  });
});

describe('Faction: cleared on cycle rebirth (真灵转世)', () => {
  it('clears playerFactionId on 真灵转世 cycle rebirth', () => {
    useGameStore.setState({
      player: createTestPlayer({
        heavenLevel: 9,
        cycleInfo: { type: null as any, previousCountry: '秦', previousClanId: 'test-clan' },
      }),
      playerFactionId: 'faction-123',
      clans: [
        { id: 'test-clan', name: '赵国王室', country: '赵', type: '皇族', reputation: 100, treasury: 0, heavenLevel: 9, isAscendingFamily: false },
        { id: 'faction-123', name: '青云宗', country: '赵', type: '3级', reputation: 100, treasury: 0, heavenLevel: 9, isAscendingFamily: false },
      ],
      squadMembers: [createTestSquadMember('s1')],
    });

    useGameStore.getState().performCycleRebirth('真灵转世');

    const state = useGameStore.getState();
    expect(state.playerFactionId).toBeNull();
    expect(state.squadMembers).toEqual([]);
  });
});

describe('Faction: cleared on ascension', () => {
  it('clears playerFactionId on ascension', () => {
    // Player at max realm for heaven level 9 (化神) with all requirements
    useGameStore.setState({
      player: createTestPlayer({
        realm: '化神',
        reputation: 5000,
        inventory: { '灵石': 200000, '飞升令': 1 },
        stats: { hp: 1000, maxHp: 1000, mp: 200, maxMp: 200, attack: 100, defense: 50, exp: 1000, maxExp: 1000 },
      }),
      playerFactionId: 'faction-123',
      clans: [
        {
          id: 'test-clan',
          name: '赵国王室',
          country: '赵',
          type: '皇族',
          reputation: 100,
          treasury: 100000,
          heavenLevel: 9,
          isAscendingFamily: false,
        },
        {
          id: 'faction-123',
          name: '青云宗',
          country: '赵',
          type: '3级',
          reputation: 100,
          treasury: 500,
          heavenLevel: 9,
          isAscendingFamily: false,
        },
      ],
      ascensionQuests: [
        { name: '完成3次天道任务', description: 'test', completed: true },
        { name: '达到当前世界最高境界', description: 'test', completed: true },
        { name: '积累足够功德', description: 'test', completed: true },
      ],
    });

    useGameStore.getState().attemptAscension();

    const state = useGameStore.getState();
    // Squad and faction should be cleared
    expect(state.squadMembers).toEqual([]);
    expect(state.playerFactionId).toBeNull();
  });
});
