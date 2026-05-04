import { describe, it, expect } from 'vitest';
import {
  applyHpEffect,
  applyAddItemEffect,
  applyRemoveItemEffect,
  applyDebuffEffect,
  applyLoseStonesFractionEffect,
  resolveReunionScene,
  shouldTriggerIgnoreDeathRouter,
  resolveRobAdvance,
  createLiSiSquadMember,
  evaluateLiSiPassiveHeal,
} from '../src/content/scenes/effectUtils';
import { LI_SI_ID, LI_SI_ROBBED, LI_SI_HELPED, LI_SI_UNMET, LI_SI_IGNORED } from '../src/content/scenes/grudge/grudgeScene';
import type { Player, SquadMember } from '../src/store/gameConstants';

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'test-player',
  name: '测试玩家',
  heavenLevel: 9,
  realm: '凡人',
  bodyType: '中庸',
  potential: '普通',
  country: '苍云国',
  clanId: 'lin_family',
  stats: { hp: 50, maxHp: 100, mp: 30, maxMp: 60, attack: 10, defense: 5, exp: 0, maxExp: 100 },
  hiddenStats: { killCount: 0, cultivateCount: 0, gatherCount: 0, ascensionCount: 0, merit: 0 },
  reputation: 0,
  position: { x: 55, y: 48 },
  inventory: { '灵石': 100, '木剑': 1, '丹药': 3 },
  cycleInfo: { type: 'none' },
  isAscending: false,
  talent: { spiritualRoot: 3, boneConstitution: 3, comprehension: 3, fortune: 3 },
  activeDebuffs: [],
  ...overrides,
});

// =============================================================
// applyHpEffect
// =============================================================

describe('applyHpEffect', () => {
  it('adds HP and logs positive delta', () => {
    const result = applyHpEffect(makePlayer({ stats: { hp: 50, maxHp: 100 } as any }), 20);
    expect(result.player.stats?.hp).toBe(70);
    expect(result.logs).toEqual(['生命 +20']);
  });

  it('subtracts HP and logs negative delta', () => {
    const result = applyHpEffect(makePlayer({ stats: { hp: 50, maxHp: 100 } as any }), -20);
    expect(result.player.stats?.hp).toBe(30);
    expect(result.logs).toEqual(['生命 -20']);
  });

  it('clamps to 1 when damage would exceed current HP', () => {
    const result = applyHpEffect(makePlayer({ stats: { hp: 5, maxHp: 100 } as any }), -10);
    expect(result.player.stats?.hp).toBe(1);
  });

  it('clamps to maxHp when healing would exceed max', () => {
    const result = applyHpEffect(makePlayer({ stats: { hp: 95, maxHp: 100 } as any }), 20);
    expect(result.player.stats?.hp).toBe(100);
  });

  it('keeps hp at 1 when hp equals 1 and damage is zero', () => {
    const result = applyHpEffect(makePlayer({ stats: { hp: 1, maxHp: 100 } as any }), 0);
    expect(result.player.stats?.hp).toBe(1);
  });

  it('handles zero delta as no-op', () => {
    const result = applyHpEffect(makePlayer({ stats: { hp: 50, maxHp: 100 } as any }), 0);
    expect(result.player.stats?.hp).toBe(50);
  });
});

// =============================================================
// applyAddItemEffect
// =============================================================

describe('applyAddItemEffect', () => {
  it('adds items to inventory', () => {
    const result = applyAddItemEffect(makePlayer(), { '灵石': 50, '长剑': 1 });
    expect(result.player.inventory!['灵石']).toBe(150);
    expect(result.player.inventory!['长剑']).toBe(1);
    expect(result.logs).toHaveLength(2);
    expect(result.logs[0]).toContain('灵石');
    expect(result.logs[1]).toContain('长剑');
  });

  it('merges with existing items', () => {
    const result = applyAddItemEffect(makePlayer({ inventory: { '灵石': 100, '木剑': 1 } }), { '木剑': 2 });
    expect(result.player.inventory!['木剑']).toBe(3);
  });

  it('handles empty addItem gracefully', () => {
    const result = applyAddItemEffect(makePlayer(), {});
    expect(result.player.inventory!['灵石']).toBe(100);
    expect(result.logs).toHaveLength(0);
  });

  it('adds zero count as no effective change', () => {
    const result = applyAddItemEffect(makePlayer(), {'杂物': 0});
    expect(result.player.inventory!['杂物']).toBe(0);
  });
});

// =============================================================
// applyRemoveItemEffect
// =============================================================

describe('applyRemoveItemEffect', () => {
  it('removes items deterministically with injected RNG', () => {
    const player = makePlayer({ inventory: { '木剑': 1, '丹药': 1, '灵石': 99 } });
    // RNG returning 0 picks the first removable item (木剑), then next 0 picks (丹药)
    let call = 0;
    const rng = () => { call++; return 0; };
    const result = applyRemoveItemEffect(player, 2, { rng });
    expect(result.player.inventory!['木剑']).toBeUndefined();
    expect(result.player.inventory!['丹药']).toBeUndefined();
    expect(result.player.inventory!['灵石']).toBe(99); // protected
    expect(result.logs).toHaveLength(2);
  });

  it('preserves 灵石 (protected item)', () => {
    const player = makePlayer({ inventory: { '木剑': 1, '灵石': 99 } });
    const rng = () => 0;
    const result = applyRemoveItemEffect(player, 1, { rng });
    expect(result.player.inventory!['灵石']).toBe(99);
  });

  it('logs "没找到值钱的东西" when only protected items remain', () => {
    const player = makePlayer({ inventory: { '灵石': 99 } });
    const rng = () => 0;
    const result = applyRemoveItemEffect(player, 1, { rng });
    expect(result.logs).toContain('对方没找到值钱的东西，啐了一口');
  });

  it('handles count=0 as no-op', () => {
    const player = makePlayer({ inventory: { '木剑': 1, '灵石': 99 } });
    const rng = () => 0;
    const result = applyRemoveItemEffect(player, 0, { rng });
    expect(result.player.inventory).toEqual(player.inventory);
  });

  it('removes at most available non-protected items', () => {
    const player = makePlayer({ inventory: { '木剑': 1, '灵石': 99 } });
    const rng = () => 0;
    const result = applyRemoveItemEffect(player, 5, { rng });
    expect(result.player.inventory!['木剑']).toBeUndefined();
    expect(result.logs).toHaveLength(1); // only 1 item removed, not crashing
  });
});

// =============================================================
// applyDebuffEffect
// =============================================================

describe('applyDebuffEffect', () => {
  it('adds a new debuff to activeDebuffs', () => {
    const player = makePlayer({ activeDebuffs: [] });
    const now = 100000;
    const result = applyDebuffEffect(player, { name: '颜面扫地', durationMs: 300000, statPenalty: 0.05 }, { now });
    expect(result.player.activeDebuffs).toHaveLength(1);
    expect(result.player.activeDebuffs![0].name).toBe('颜面扫地');
    expect(result.player.activeDebuffs![0].expiresAt).toBe(100000 + 300000);
    expect(result.player.activeDebuffs![0].attackPenalty).toBe(0.05);
  });

  it('deduplicates debuffs with the same name (replaces instead of stacking)', () => {
    const oldExpiry = 200000;
    const player = makePlayer({
      activeDebuffs: [{ id: 'old-debuff', name: '颜面扫地', expiresAt: oldExpiry, attackPenalty: 0.05, defensePenalty: 0.05 }],
    });
    const now = 500000;
    const result = applyDebuffEffect(player, { name: '颜面扫地', durationMs: 300000, statPenalty: 0.1 }, { now });
    expect(result.player.activeDebuffs).toHaveLength(1);
    expect(result.player.activeDebuffs![0].expiresAt).toBe(800000);
    expect(result.player.activeDebuffs![0].attackPenalty).toBe(0.1);
  });

  it('allows different debuff names to stack', () => {
    const player = makePlayer({
      activeDebuffs: [{ id: 'd1', name: '颜面扫地', expiresAt: 200000, attackPenalty: 0.05, defensePenalty: 0.05 }],
    });
    const now = 500000;
    const result = applyDebuffEffect(player, { name: '中毒', durationMs: 60000, statPenalty: 0.1 }, { now });
    expect(result.player.activeDebuffs).toHaveLength(2);
  });

  it('clamps statPenalty to [0, 1]', () => {
    const now = 100000;
    const result = applyDebuffEffect(makePlayer({ activeDebuffs: [] }), { name: '超强', durationMs: 60000, statPenalty: 2.5 }, { now });
    expect(result.player.activeDebuffs![0].attackPenalty).toBe(1);
    expect(result.player.activeDebuffs![0].defensePenalty).toBe(1);
  });

  it('clamps negative statPenalty to 0', () => {
    const now = 100000;
    const result = applyDebuffEffect(makePlayer({ activeDebuffs: [] }), { name: '祝福', durationMs: 60000, statPenalty: -0.5 }, { now });
    expect(result.player.activeDebuffs![0].attackPenalty).toBe(0);
  });
});

// =============================================================
// applyLoseStonesFractionEffect
// =============================================================

describe('applyLoseStonesFractionEffect', () => {
  it('removes half of current 灵石 when fraction=0.5', () => {
    const result = applyLoseStonesFractionEffect(makePlayer({ inventory: { '灵石': 100 } }), 0.5);
    expect(result.player.inventory!['灵石']).toBe(50);
    expect(result.logs[0]).toContain('50');
  });

  it('does nothing when fraction is 0', () => {
    const result = applyLoseStonesFractionEffect(makePlayer({ inventory: { '灵石': 100 } }), 0);
    expect(result.player.inventory).toBeUndefined();
    expect(result.logs[0]).toContain('嫌弃地啐了一口');
  });

  it('clamps fraction > 1 to 1', () => {
    const result = applyLoseStonesFractionEffect(makePlayer({ inventory: { '灵石': 50 } }), 2.5);
    expect(result.player.inventory!['灵石']).toBe(0);
  });

  it('handles negative fraction as 0 (no loss)', () => {
    const result = applyLoseStonesFractionEffect(makePlayer({ inventory: { '灵石': 100 } }), -0.5);
    expect(result.player.inventory).toBeUndefined();
    expect(result.logs[0]).toContain('嫌弃地啐了一口');
  });

  it('handles player having 0 灵石', () => {
    const result = applyLoseStonesFractionEffect(makePlayer({ inventory: { '灵石': 0 } }), 0.5);
    expect(result.player.inventory).toBeUndefined();
    expect(result.logs[0]).toContain('嫌弃地啐了一口');
  });

  it('rounds down via Math.floor', () => {
    const result = applyLoseStonesFractionEffect(makePlayer({ inventory: { '灵石': 99 } }), 0.3333);
    expect(result.player.inventory!['灵石']).toBe(67); // 99 - floor(32.9967) = 67
  });
});

// =============================================================
// resolveReunionScene
// =============================================================

describe('resolveReunionScene', () => {
  it('returns reunion_robbed when memory is ROBBED', () => {
    expect(resolveReunionScene(LI_SI_ROBBED)).toBe('grudge_reunion_robbed');
  });

  it('returns reunion_helped when memory is HELPED', () => {
    expect(resolveReunionScene(LI_SI_HELPED)).toBe('grudge_reunion_helped');
  });

  it('returns reunion_neutral for IGNORED memory (fallback)', () => {
    expect(resolveReunionScene(LI_SI_IGNORED)).toBe('grudge_reunion_neutral');
  });

  it('returns reunion_neutral for UNMET memory (unexpected fallback)', () => {
    expect(resolveReunionScene(LI_SI_UNMET)).toBe('grudge_reunion_neutral');
  });

  it('returns null when no memory exists', () => {
    expect(resolveReunionScene(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(resolveReunionScene('')).toBeNull();
  });
});

// =============================================================
// shouldTriggerIgnoreDeathRouter
// =============================================================

describe('shouldTriggerIgnoreDeathRouter', () => {
  it('returns true when memory is IGNORED', () => {
    expect(shouldTriggerIgnoreDeathRouter(LI_SI_IGNORED)).toBe(true);
  });

  it('returns false when memory is HELPED', () => {
    expect(shouldTriggerIgnoreDeathRouter(LI_SI_HELPED)).toBe(false);
  });

  it('returns false when memory is undefined', () => {
    expect(shouldTriggerIgnoreDeathRouter(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(shouldTriggerIgnoreDeathRouter('')).toBe(false);
  });
});

// =============================================================
// resolveRobAdvance
// =============================================================

describe('resolveRobAdvance', () => {
  it('returns grudge_leave_village when memory is set', () => {
    expect(resolveRobAdvance(LI_SI_ROBBED)).toBe('grudge_leave_village');
  });

  it('returns null when no memory', () => {
    expect(resolveRobAdvance(undefined)).toBeNull();
  });

  it('returns grudge_leave_village for any truthy memory', () => {
    expect(resolveRobAdvance(LI_SI_HELPED)).toBe('grudge_leave_village');
  });
});

// =============================================================
// createLiSiSquadMember
// =============================================================

describe('createLiSiSquadMember', () => {
  const now = 987654321;
  const player = makePlayer();
  const member = createLiSiSquadMember(player, { now });

  it('sets npcId to LI_SI_ID', () => {
    expect(member.npcId).toBe(LI_SI_ID);
  });

  it('sets name to 李四', () => {
    expect(member.name).toBe('李四');
  });

  it('copies clanId from player', () => {
    expect(member.clanId).toBe(player.clanId);
  });

  it('copies realm from player', () => {
    expect(member.realm).toBe(player.realm);
  });

  it('computes power as 60% of (attack + defense)', () => {
    expect(member.power).toBe(Math.floor((10 + 5) * 0.6));
  });

  it('sets HP/MP to fixed values', () => {
    expect(member.hp).toBe(80);
    expect(member.maxHp).toBe(100);
    expect(member.mp).toBe(60);
    expect(member.maxMp).toBe(80);
  });

  it('sets personality values', () => {
    expect(member.personality).toEqual({ ambition: 30, caution: 60, loyalty: 80, greed: 20 });
  });

  it('sets joinDate to injected now', () => {
    expect(member.joinDate).toBe(now);
  });

  it('sets isAlive to true', () => {
    expect(member.isAlive).toBe(true);
  });

  it('copies player position', () => {
    expect(member.position).toEqual(player.position);
  });

  it('sets initial level, exp, maxExp', () => {
    expect(member.level).toBe(1);
    expect(member.exp).toBe(0);
    expect(member.maxExp).toBe(80);
  });
});

// =============================================================
// evaluateLiSiPassiveHeal
// =============================================================

describe('evaluateLiSiPassiveHeal', () => {
  const squadWithLiSi = (): SquadMember[] => [
    { npcId: LI_SI_ID, id: 'squad-1', name: '李四', clanId: 'lin_family', role: '后勤型', realm: '凡人',
      power: 9, hp: 80, maxHp: 100, mp: 60, maxMp: 80,
      personality: { ambition: 30, caution: 60, loyalty: 80, greed: 20 },
      joinDate: 100, kills: 0, isAlive: true, position: { x: 55, y: 48 },
      activity: '跟随中', equipment: [], level: 1, exp: 0, maxExp: 80 },
  ];
  const squadEmpty: SquadMember[] = [];

  it('returns heal decision when HP < 20%, Li Si in squad, cooldown expired', () => {
    const player = makePlayer({ stats: { hp: 15, maxHp: 100 } as any });
    const result = evaluateLiSiPassiveHeal(player, squadWithLiSi(), 0, 60000);
    expect(result).not.toBeNull();
    expect(result!.healAmount).toBe(10);
  });

  it('returns null when HP >= 20%', () => {
    const player = makePlayer({ stats: { hp: 25, maxHp: 100 } as any });
    const result = evaluateLiSiPassiveHeal(player, squadWithLiSi(), 0, 60000);
    expect(result).toBeNull();
  });

  it('returns null when HP is 0 (player down)', () => {
    const player = makePlayer({ stats: { hp: 0, maxHp: 100 } as any });
    const result = evaluateLiSiPassiveHeal(player, squadWithLiSi(), 0, 60000);
    expect(result).toBeNull();
  });

  it('returns null when cooldown is active (< 30s since last heal)', () => {
    const player = makePlayer({ stats: { hp: 15, maxHp: 100 } as any });
    const result = evaluateLiSiPassiveHeal(player, squadWithLiSi(), 35000, 40000);
    expect(result).toBeNull();
  });

  it('heals when cooldown has just expired (> 30s)', () => {
    const player = makePlayer({ stats: { hp: 15, maxHp: 100 } as any });
    const result = evaluateLiSiPassiveHeal(player, squadWithLiSi(), 10000, 40001);
    expect(result).not.toBeNull();
  });

  it('returns null when Li Si is not in squad', () => {
    const player = makePlayer({ stats: { hp: 15, maxHp: 100 } as any });
    const result = evaluateLiSiPassiveHeal(player, squadEmpty, 0, 60000);
    expect(result).toBeNull();
  });
});
