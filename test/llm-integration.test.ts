import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the NPCWorldService module that NPCBehaviorTree requires() dynamically
vi.mock('../src/server/services/NPCWorldService', () => ({
  NPCWorldService: {
    getInstance: () => ({
      getNPC: () => null,
    }),
  },
}));

import {
  LLMIntegrationManager,
  LLMPlanningScheduler,
  LLMEventDispatcher,
} from '../src/server/game/services/LLMIntegrationManager';
import {
  NPCData,
  ActionType,
} from '../src/shared/types/LLMPlanning';
import { NPCBehaviorTreeManager, translateActionToActivity } from '../src/server/game/services/NPCBehaviorTree';

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
    expect(scheduler.getActivePlanCount()).toBe(1);
  });

  it('start and stop are idempotent', () => {
    const scheduler = LLMPlanningScheduler.getInstance();
    scheduler.start();
    scheduler.start(); // second start should no-op
    scheduler.stop();
    scheduler.stop(); // second stop should no-op
    expect(scheduler.getScheduledCount()).toBe(0);
  });
});

describe('LLMEventDispatcher', () => {
  it('is a singleton', () => {
    expect(LLMEventDispatcher.getInstance()).toBe(LLMEventDispatcher.getInstance());
  });

  it('getRecentEvents returns empty array', () => {
    expect(LLMEventDispatcher.getInstance().getRecentEvents()).toEqual([]);
  });

  it('emitEvent dispatches to "all" listener', () => {
    const dispatcher = LLMEventDispatcher.getInstance();
    const events: any[] = [];
    dispatcher.on('all', (e: any) => events.push(e));

    dispatcher.emitEvent({
      type: 'llm:plan_generated' as any,
      npcId: 'npc-001',
      planId: 'plan-001',
      timestamp: Date.now(),
    });

    // emitEvent calls emit(type) + emit('all'), but only 'all' has listener attached
    expect(events.length).toBe(1);
    expect(events[0].npcId).toBe('npc-001');

    dispatcher.removeAllListeners();
  });
});

describe('LLMIntegrationManager', () => {
  it('is a singleton', () => {
    expect(LLMIntegrationManager.getInstance()).toBe(LLMIntegrationManager.getInstance());
  });

  it('registerHighTierNPC handles T3 NPC gracefully', () => {
    const manager = LLMIntegrationManager.getInstance();
    manager.initialize();

    const t3Data: NPCData = {
      id: 'npc-t3', name: 'Low Tier', realm: 'mortal', power: 10,
      clan_id: 'clan-0', nation: '秦', role: 'branch_disciple',
      personality: { ambition: 10, caution: 10, loyalty: 10, greed: 10 },
    };

    // Should not throw for T3
    expect(() => manager.registerHighTierNPC('npc-t3', t3Data)).not.toThrow();
    manager.shutdown();
  });

  it('tick runs without error', async () => {
    const manager = LLMIntegrationManager.getInstance();
    manager.initialize();
    await expect(manager.tick()).resolves.toBeUndefined();
    manager.shutdown();
  });

  it('shutdown stops the scheduler', () => {
    const manager = LLMIntegrationManager.getInstance();
    manager.initialize();
    manager.shutdown();
    expect(() => manager.shutdown()).not.toThrow();
  });

  it('updateNPCData does not throw for unregistered NPC', () => {
    const manager = LLMIntegrationManager.getInstance();
    manager.initialize();
    const data: NPCData = {
      id: 'npc-none', name: 'Ghost', realm: 'mortal', power: 10,
      clan_id: 'clan-0', nation: '秦', role: 'branch_disciple',
      personality: { ambition: 10, caution: 10, loyalty: 10, greed: 10 },
    };
    // Should not throw even though NPC is not registered
    expect(() => manager.updateNPCData('npc-none', data)).not.toThrow();
    manager.shutdown();
  });

  it('unregisterNPC does not throw for unregistered NPC', () => {
    const manager = LLMIntegrationManager.getInstance();
    manager.initialize();
    expect(() => manager.unregisterNPC('npc-none')).not.toThrow();
    manager.shutdown();
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
});

describe('translateActionToActivity', () => {
  it('maps all ActionType values to expected strings', () => {
    const testCases: [ActionType, string][] = [
      [ActionType.IDLE, 'idle'],
      [ActionType.REST, 'rest'],
      [ActionType.PATROL, 'patrol'],
      [ActionType.EXPLORE, 'compete'],
      [ActionType.CULTIVATE, 'retreat'],
      [ActionType.TRADE, 'trade'],
      [ActionType.LOGISTICS, 'logistics'],
      [ActionType.MILITARY_ORDER, 'patrol'],
      [ActionType.DIPLOMACY, 'work'],
      [ActionType.INTELLIGENCE, 'explore'],
      [ActionType.RESOURCE_ALLOCATION, 'logistics'],
      [ActionType.RESOURCE_PURCHASE, 'trade'],
      [ActionType.RESOURCE_RAID, 'compete'],
      [ActionType.CAPTURE_RESOURCE_POINT, 'compete'],
      [ActionType.DOMAIN_WAR, 'patrol'],
      [ActionType.ALLIANCE_FORMATION, 'work'],
      [ActionType.CULTIVATE_BREAKTHROUGH, 'retreat'],
    ];

    for (const [action, expected] of testCases) {
      expect(translateActionToActivity(action)).toBe(expected);
    }
  });

  it('returns "rest" for unknown action type', () => {
    expect(translateActionToActivity('UNKNOWN' as ActionType)).toBe('rest');
  });
});
