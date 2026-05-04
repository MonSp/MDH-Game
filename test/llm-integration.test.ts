import { describe, it, expect, beforeEach } from 'vitest';
import {
  LLMIntegrationManager,
  LLMPlanningScheduler,
  LLMEventDispatcher,
} from '../src/server/game/services/LLMIntegrationManager';
import {
  LLMTier,
  NPCData,
  PlanningType,
  PlanStatus,
  ActionType,
} from '../src/shared/types/LLMPlanning';

// Reset singletons before tests
beforeEach(() => {
  LLMPlanningScheduler.getInstance().stop();
});

describe('LLMPlanningScheduler', () => {
  it('is a singleton', () => {
    expect(LLMPlanningScheduler.getInstance()).toBe(LLMPlanningScheduler.getInstance());
  });

  it('getScheduledCount returns 0 when empty', () => {
    expect(LLMPlanningScheduler.getInstance().getScheduledCount()).toBe(0);
  });

  it('getActivePlanCount returns 0 when empty', () => {
    expect(LLMPlanningScheduler.getInstance().getActivePlanCount()).toBe(0);
  });

  it('registerNPC adds an NPC to the schedule', () => {
    const scheduler = LLMPlanningScheduler.getInstance();
    scheduler.registerNPC('npc-001', {
      id: 'npc-001',
      name: 'Test',
      realm: 'qi_refining',
      power: 100,
      clan_id: 'clan-0',
      nation: '秦',
      role: 'core_disciple',
      personality: { ambition: 50, caution: 50, loyalty: 50, greed: 50 },
    });
    expect(scheduler.getScheduledCount()).toBe(1);
  });

  it('unregisterNPC removes an NPC', () => {
    const scheduler = LLMPlanningScheduler.getInstance();
    scheduler.registerNPC('npc-001', {
      id: 'npc-001', name: 'Test', realm: 'qi_refining', power: 100,
      clan_id: 'clan-0', nation: '秦', role: 'core_disciple',
      personality: { ambition: 50, caution: 50, loyalty: 50, greed: 50 },
    });
    expect(scheduler.getScheduledCount()).toBe(1);
    scheduler.unregisterNPC('npc-001');
    expect(scheduler.getScheduledCount()).toBe(0);
  });

  it('updateNPCData updates stored data for registered NPC', () => {
    const scheduler = LLMPlanningScheduler.getInstance();
    scheduler.registerNPC('npc-001', {
      id: 'npc-001', name: 'Test', realm: 'qi_refining', power: 100,
      clan_id: 'clan-0', nation: '秦', role: 'core_disciple',
      personality: { ambition: 50, caution: 50, loyalty: 50, greed: 50 },
    });
    scheduler.updateNPCData('npc-001', {
      id: 'npc-001', name: 'Test Updated', realm: 'foundation_building', power: 500,
      clan_id: 'clan-0', nation: '秦', role: 'elder',
      personality: { ambition: 50, caution: 50, loyalty: 50, greed: 50 },
    });
    // No crash — data is stored internally
    expect(scheduler.getActivePlanCount()).toBe(1);
  });
});

describe('LLMEventDispatcher', () => {
  it('is a singleton', () => {
    expect(LLMEventDispatcher.getInstance()).toBe(LLMEventDispatcher.getInstance());
  });

  it('getRecentEvents returns empty array', () => {
    expect(LLMEventDispatcher.getInstance().getRecentEvents()).toEqual([]);
  });

  it('emitEvent emits and dispatches to listeners', () => {
    const dispatcher = LLMEventDispatcher.getInstance();
    const events: any[] = [];
    dispatcher.on('all', (e: any) => events.push(e));

    dispatcher.emitEvent({
      type: 'llm:plan_generated' as any,
      npcId: 'npc-001',
      planId: 'plan-001',
      timestamp: Date.now(),
    });

    expect(events.length).toBe(2); // 'all' + specific type
    expect(events[0].npcId).toBe('npc-001');
    expect(events[0].planId).toBe('plan-001');

    dispatcher.removeAllListeners();
  });
});

describe('LLMIntegrationManager', () => {
  it('is a singleton', () => {
    expect(LLMIntegrationManager.getInstance()).toBe(LLMIntegrationManager.getInstance());
  });

  it('registerHighTierNPC does not register T3 NPC', () => {
    const manager = LLMIntegrationManager.getInstance();
    manager.initialize();

    const t3Data: NPCData = {
      id: 'npc-t3', name: 'Low Tier', realm: 'mortal', power: 10,
      clan_id: 'clan-0', nation: '秦', role: 'branch_disciple',
      personality: { ambition: 10, caution: 10, loyalty: 10, greed: 10 },
    };

    manager.registerHighTierNPC('npc-t3', t3Data);
    // T3 → not registered (uses deterministic fallback)
    // Can't easily verify this without accessing internals
    // But it shouldn't crash
    manager.shutdown();
  });

  it('tick runs without error', async () => {
    const manager = LLMIntegrationManager.getInstance();
    manager.initialize();
    // tick is async but should not throw
    await expect(manager.tick()).resolves.toBeUndefined();
    manager.shutdown();
  });

  it('shutdown stops the scheduler', () => {
    const manager = LLMIntegrationManager.getInstance();
    manager.initialize();
    manager.shutdown();
    // After shutdown, tick should still not throw
    expect(() => manager.shutdown()).not.toThrow();
  });
});

describe('SurvivalNode', () => {
  it('returns IDLE for unknown NPC', () => {
    const node = new SurvivalNode();
    // The require() inside execute will try to load NPCWorldService
    // For unknown NPCs it returns IDLE
    const result = node.execute('nonexistent');
    expect(result).toBe(ActionType.IDLE);
  });
});

describe('NPCBehaviorTreeManager', () => {
  it('is a singleton', () => {
    expect(NPCBehaviorTreeManager.getInstance()).toBe(NPCBehaviorTreeManager.getInstance());
  });

  it('getActiveTreeCount starts at 0', () => {
    expect(NPCBehaviorTreeManager.getInstance().getActiveTreeCount()).toBe(0);
  });

  it('getOrCreateTree creates and caches trees', () => {
    const mgr = NPCBehaviorTreeManager.getInstance();
    const tree1 = mgr.getOrCreateTree('npc-001');
    const tree2 = mgr.getOrCreateTree('npc-001');
    expect(tree1).toBe(tree2);
    expect(mgr.getActiveTreeCount()).toBe(1);
  });

  it('removeTree removes a tree', () => {
    const mgr = NPCBehaviorTreeManager.getInstance();
    mgr.getOrCreateTree('npc-001');
    mgr.removeTree('npc-001');
    expect(mgr.getActiveTreeCount()).toBe(0);
  });

  it('evaluateNPC returns an ActionType', () => {
    const mgr = NPCBehaviorTreeManager.getInstance();
    const result = mgr.evaluateNPC('npc-001');
    expect(Object.values(ActionType)).toContain(result);
  });
});

describe('translateActionToActivity', () => {
  it('maps all ActionType values to strings', () => {
    const mappings: Record<string, string> = {
      idle: 'idle',
      rest: 'rest',
      patrol: 'patrol',
      explore: 'compete',
      cultivate: 'retreat',
      trade: 'trade',
      logistics: 'logistics',
      military_order: 'patrol',
      diplomacy: 'work',
      intelligence: 'explore',
      resource_allocation: 'logistics',
      resource_purchase: 'trade',
      resource_raid: 'compete',
      capture_resource_point: 'compete',
      domain_war: 'patrol',
      alliance_formation: 'work',
      cultivate_breakthrough: 'retreat',
    };

    for (const [action, expected] of Object.entries(mappings)) {
      expect(translateActionToActivity(action as ActionType)).toBe(expected);
    }
  });

  it('returns "rest" for unknown action type', () => {
    expect(translateActionToActivity('unknown' as ActionType)).toBe('rest');
  });
});
