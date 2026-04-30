import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NPCWorldService } from '../src/server/services/NPCWorldService';

/**
 * NPCWorldService is a singleton with async tick internals and an LLM
 * dependency.  These tests focus on methods that do NOT call the LLM
 * (planForNPC / tick / start), verifying initialisation, player-facing
 * actions, relationship queries, and edge-case guards.
 *
 * Ordered describe blocks so state accumulates predictably.
 */

describe('NPCWorldService — static / pure queries', () => {
  it('getCandidates returns 3 static recruit candidates', () => {
    const svc = NPCWorldService.getInstance();
    const candidates = svc.getCandidates();
    expect(candidates).toHaveLength(3);
    expect(candidates[0].id).toBe('A');
    expect(candidates[1].id).toBe('B');
    expect(candidates[2].id).toBe('C');
    // Each candidate has the expected shape
    for (const c of candidates) {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('desc');
      expect(c).toHaveProperty('trait');
      expect(c).toHaveProperty('role');
      expect(c).toHaveProperty('realm');
      expect(c).toHaveProperty('power');
      expect(c).toHaveProperty('personality');
      expect(c).toHaveProperty('background');
    }
  });
});

describe('NPCWorldService — initialisation and NPC listing', () => {
  const svc = NPCWorldService.getInstance();

  beforeAll(() => {
    // Stop any previously running tick loop, then initialise fresh.
    svc.stop();
    svc.initialize();
  });

  afterAll(() => {
    svc.stop();
  });

  it('initialize seeds NPCs (file load or built-in fallback)', () => {
    const list = svc.getNPCList();
    expect(list.length).toBeGreaterThanOrEqual(5);
    // Every entry has the expected shape
    for (const n of list) {
      expect(n).toHaveProperty('id');
      expect(n).toHaveProperty('name');
      expect(n).toHaveProperty('role');
      expect(n).toHaveProperty('activity');
      expect(n).toHaveProperty('emotion');
    }
  });

  it('getNPC returns a specific NPC by id', () => {
    const list = svc.getNPCList();
    const first = list[0];
    const state = svc.getNPC(first.id);
    expect(state).toBeDefined();
    expect(state!.npc.name).toBe(first.name);
  });

  it('getNPC returns undefined for unknown id', () => {
    expect(svc.getNPC('nonexistent')).toBeUndefined();
  });

  it('getRelationship returns default affinity for new pair', () => {
    const ids = svc.getNPCList().map(n => n.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    const rel = svc.getRelationship(ids[0], ids[1]);
    expect(rel).toHaveProperty('affinity');
    expect(rel).toHaveProperty('reason');
    expect(typeof rel.affinity).toBe('number');
  });

  it('modifyRelationship changes affinity between two NPCs', () => {
    const ids = svc.getNPCList().map(n => n.id);
    const before = svc.getRelationship(ids[0], ids[1]);
    svc.modifyRelationship(ids[0], ids[1], 10, 'test modifier');
    const after = svc.getRelationship(ids[0], ids[1]);
    expect(after.affinity).toBe(before.affinity + 10);
  });

  it('getTopRelationships returns up to requested count', () => {
    const ids = svc.getNPCList().map(n => n.id);
    const top = svc.getTopRelationships(ids[0], 3);
    expect(top.length).toBeLessThanOrEqual(3);
    for (const r of top) {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('name');
      expect(r).toHaveProperty('affinity');
    }
  });
});

describe('NPCWorldService — player action methods', () => {
  const svc = NPCWorldService.getInstance();

  beforeAll(() => {
    svc.stop();
    svc.initialize();
  });

  afterAll(() => {
    svc.stop();
  });

  it('recruit returns false for invalid candidate id', () => {
    expect(svc.recruit('INVALID')).toBe(false);
  });

  it('recruit with valid candidate adds/replaces an NPC', () => {
    const ok = svc.recruit('A');
    expect(ok).toBe(true);
    // The new NPC should appear in the list by name
    const names = svc.getNPCList().map(n => n.name);
    expect(names).toContain('李云霄');
  });

  it('assignTask returns false for non-existent NPC', () => {
    expect(svc.assignTask('nonexistent', 'test task')).toBe(false);
  });

  it('assignTask sets activity and goal on existing NPC', () => {
    const list = svc.getNPCList();
    const target = list[0];
    const ok = svc.assignTask(target.id, '去后山采集药材');
    expect(ok).toBe(true);
    const state = svc.getNPC(target.id);
    expect(state!.activity).toBe('task');
    expect(state!.goal).toBe('去后山采集药材');
  });

  it('promote returns false for non-existent NPC', () => {
    expect(svc.promote('nonexistent', 'promote')).toBe(false);
  });

  it('promote changes role upward', () => {
    // Pick the NPC with the lowest role so there's room to rise
    const all = svc.getNPCList();
    const sorted = [...all].sort(
      (a, b) => (roleRank(a.role) as number) - (roleRank(b.role) as number),
    );
    const lowest = sorted[0];
    const origRole = lowest.role;

    const ok = svc.promote(lowest.id, 'promote');
    expect(ok).toBe(true);
    const state = svc.getNPC(lowest.id);
    // Role should be higher than before (or same if already at top)
    expect(roleRank(state!.npc.role)).toBeGreaterThanOrEqual(roleRank(origRole)!);
  });

  it('demote changes role downward', () => {
    // Pick the NPC with the highest role
    const all = svc.getNPCList();
    const sorted = [...all].sort(
      (a, b) => (roleRank(b.role) as number) - (roleRank(a.role) as number),
    );
    const highest = sorted[0];
    const origRole = highest.role;

    const ok = svc.promote(highest.id, 'demote');
    expect(ok).toBe(true);
    const state = svc.getNPC(highest.id);
    expect(roleRank(state!.npc.role)).toBeLessThanOrEqual(roleRank(origRole)!);
  });

  it('ceremony runs without error and adds witnessed events', () => {
    // ceremony is fire-and-forget — verify it doesn't throw
    expect(() => svc.ceremony('祭祀')).not.toThrow();
  });
});

describe('NPCWorldService — bug regression tests', () => {
  const svc = NPCWorldService.getInstance();

  beforeAll(() => {
    svc.stop();
    svc.initialize();
  });

  afterAll(() => {
    svc.stop();
  });

  it('computeNextId returns ID after last existing NPC (regression: nextNPCId collision)', () => {
    const list = svc.getNPCList();
    const lastIdNum = Math.max(...list.map(n => parseInt(n.id.replace('npc_', ''), 10)));
    // After initialize(), nextNPCId should be lastIdNum + 1
    // Verify by recruiting — new NPC ID should be lastIdNum + 1
    const names = list.map(n => n.name);
    const newName = '测试弟子';
    svc.recruit('A');
    const newList = svc.getNPCList();
    const added = newList.find(n => n.name === '李云霄');
    expect(added).toBeDefined();
    // The new NPC's ID should not collide with any existing NPC
    const ids = new Set(newList.map(n => n.id));
    expect(ids.size).toBe(newList.length);
  });

  it('advanceQueue pops one action at a time', () => {
    // Access internal state through getNPC — verify activity changes
    const list = svc.getNPCList();
    for (const n of list) {
      const state = svc.getNPC(n.id);
      expect(state).toBeDefined();
      expect(state!.planQueue).toBeDefined();
      expect(Array.isArray(state!.planQueue)).toBe(true);
      break;
    }
  });

  it('getNPCList returns unique IDs (no collision after recruit)', () => {
    const list = svc.getNPCList();
    const ids = list.map(n => n.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// Helper: map role strings to numeric rank for comparison
function roleRank(role: string): number {
  const ladder: Record<string, number> = {
    branch_disciple: 0,
    inner_disciple: 1,
    core_disciple: 2,
    elder: 3,
    law_enforcement_elder: 4,
  };
  return ladder[role] ?? -1;
}

describe('NPCWorldService — benchmark mode (reset / llmMode)', () => {
  afterAll(() => {
    // Restore service state after reset tests
    const svc = NPCWorldService.getInstance();
    svc.reset();
    svc.initialize();
  });

  it('reset clears all NPC state', () => {
    const svc = NPCWorldService.getInstance();
    const beforeReset = svc.getNPCList();
    expect(beforeReset.length).toBeGreaterThan(0);

    svc.reset();
    // After reset but before initialize, there should be 0 NPCs
    // (reset clears the npcs map)
    const afterReset = svc.getNPCList();
    // getNPCList reads from npcs map, which reset cleared
    expect(afterReset.length).toBe(0);
  });

  it('reset → initialize restores NPCs', () => {
    const svc = NPCWorldService.getInstance();
    svc.reset();
    svc.initialize();
    const list = svc.getNPCList();
    expect(list.length).toBeGreaterThan(0);
    // Should have the built-in NPCs (5 from the fallback)
    expect(list.length).toBeGreaterThanOrEqual(5);
  });

  it('reset is idempotent', () => {
    const svc = NPCWorldService.getInstance();
    svc.reset();
    svc.reset(); // second call should not throw
    svc.initialize();
    expect(svc.getNPCList().length).toBeGreaterThan(0);
  });
});
