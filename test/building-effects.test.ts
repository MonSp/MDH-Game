import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, BUILDING_TREASURY_CAP_BASE, BUILDING_TREASURY_CAP_PER_LEVEL, BUILDING_VISION_BONUS } from '../src/store/gameStore';

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
    talent: { spiritualRoot: 0, boneConstitution: 30, comprehension: 40, fortune: 20 },
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

function setupFactionWithBuildings(buildings: Array<{ type: string; level: number }>) {
  useGameStore.setState({
    player: createTestPlayer({ clanId: 'test-faction', talent: { spiritualRoot: 0, boneConstitution: 30, comprehension: 40, fortune: 20 } }),
    playerFactionId: 'test-faction',
    clans: [
      {
        id: 'test-faction',
        name: '青云宗',
        country: '赵',
        type: '3级',
        reputation: 100,
        treasury: 10000,
        heavenLevel: 9,
        isAscendingFamily: false,
        buildings,
        territory: 10,
        morale: 50,
      },
    ],
  });
}

describe('Building Effects', () => {

  describe('练功房 — cultivation speed', () => {
    it('increases exp gain by 1.1x at level 1', () => {
      setupFactionWithBuildings([{ type: '练功房', level: 1 }]);
      useGameStore.getState().cultivate();
      const player = useGameStore.getState().player!;
      // Base exp = 10 (heaven 9) * 1.0 (spiritualRoot 0 = no bonus) = 10
      // With 练功房 lv1: 10 * 1.1 = 11
      expect(player.stats.exp).toBe(11);
    });

    it('increases exp gain by 1.2x at level 2', () => {
      setupFactionWithBuildings([{ type: '练功房', level: 2 }]);
      useGameStore.getState().cultivate();
      const player = useGameStore.getState().player!;
      expect(player.stats.exp).toBe(12); // 10 * 1.2 = 12
    });

    it('increases exp gain by 1.3x at level 3', () => {
      setupFactionWithBuildings([{ type: '练功房', level: 3 }]);
      useGameStore.getState().cultivate();
      const player = useGameStore.getState().player!;
      expect(player.stats.exp).toBe(13); // 10 * 1.3 = 13
    });

    it('does not affect exp gain without 练功房', () => {
      setupFactionWithBuildings([{ type: '议事厅', level: 1 }]);
      useGameStore.getState().cultivate();
      const player = useGameStore.getState().player!;
      expect(player.stats.exp).toBe(10); // base 10
    });
  });

  describe('丹房 — pill effect bonus', () => {
    it('boosts 战体 maxHp bonus at level 1', () => {
      setupFactionWithBuildings([{ type: '丹房', level: 1 }]);
      const player = useGameStore.getState().player!;
      useGameStore.setState({
        player: { ...player, potential: '战意潜质', inventory: { '灵石': 200000, '洗髓丹': 1 } },
      });
      useGameStore.getState().useItem('洗髓丹');
      const updated = useGameStore.getState().player!;
      expect(updated.bodyType).toBe('战体');
      expect(updated.stats.maxHp).toBe(Math.floor(100 * 1.3 * 1.1));
    });

    it('boosts 战体 maxHp bonus at level 3', () => {
      setupFactionWithBuildings([{ type: '丹房', level: 3 }]);
      const player = useGameStore.getState().player!;
      useGameStore.setState({
        player: { ...player, potential: '战意潜质', inventory: { '灵石': 200000, '洗髓丹': 1 } },
      });
      useGameStore.getState().useItem('洗髓丹');
      const updated = useGameStore.getState().player!;
      expect(updated.stats.maxHp).toBe(Math.floor(100 * 1.3 * 1.3));
    });

    it('uses base multiplier without 丹房', () => {
      setupFactionWithBuildings([{ type: '议事厅', level: 1 }]);
      const player = useGameStore.getState().player!;
      useGameStore.setState({
        player: { ...player, potential: '战意潜质', inventory: { '灵石': 200000, '洗髓丹': 1 } },
      });
      useGameStore.getState().useItem('洗髓丹');
      const updated = useGameStore.getState().player!;
      expect(updated.stats.maxHp).toBe(130); // floor(100 * 1.3) = 130
    });
  });

  describe('库房 — treasury cap', () => {
    it('caps treasury after collectTax at level 1', () => {
      setupFactionWithBuildings([{ type: '库房', level: 1 }]);
      const cap = BUILDING_TREASURY_CAP_BASE + 1 * BUILDING_TREASURY_CAP_PER_LEVEL;
      const state = useGameStore.getState();
      useGameStore.setState({
        clans: state.clans.map(c =>
          c.id === 'test-faction' ? { ...c, treasury: cap - 10 } : c
        ),
      });
      useGameStore.getState().collectTax();
      const faction = useGameStore.getState().clans.find(c => c.id === 'test-faction');
      expect(faction!.treasury).toBe(cap);
    });

    it('caps treasury after collectTax at level 3', () => {
      setupFactionWithBuildings([{ type: '库房', level: 3 }]);
      const cap = BUILDING_TREASURY_CAP_BASE + 3 * BUILDING_TREASURY_CAP_PER_LEVEL;
      const state = useGameStore.getState();
      useGameStore.setState({
        clans: state.clans.map(c =>
          c.id === 'test-faction' ? { ...c, treasury: cap - 10 } : c
        ),
      });
      useGameStore.getState().collectTax();
      const faction = useGameStore.getState().clans.find(c => c.id === 'test-faction');
      expect(faction!.treasury).toBe(cap);
    });

    it('does not cap treasury without 库房 building', () => {
      setupFactionWithBuildings([{ type: '议事厅', level: 1 }]);
      const state = useGameStore.getState();
      useGameStore.setState({
        clans: state.clans.map(c =>
          c.id === 'test-faction' ? { ...c, treasury: 50000 } : c
        ),
      });
      useGameStore.getState().collectTax();
      const faction = useGameStore.getState().clans.find(c => c.id === 'test-faction');
      expect(faction!.treasury).toBeGreaterThan(50000);
    });
  });

  describe('哨塔 — vision bonus constant', () => {
    it('provides correct vision bonus values', () => {
      expect(BUILDING_VISION_BONUS[1]).toBe(2);
      expect(BUILDING_VISION_BONUS[2]).toBe(4);
      expect(BUILDING_VISION_BONUS[3]).toBe(6);
    });
  });
});
