import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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
  PlanStatus,
} from '../src/shared/types/LLMPlanning';
import { LLMPlanningService } from '../src/server/game/services/LLMPlanningService';
import { NPCBehaviorTreeManager, translateActionToActivity } from '../src/server/game/services/NPCBehaviorTree';
import { NarrativeActionType, PlanAction } from '../src/server/llm/PlanParser';

// Reset singletons before tests
beforeEach(() => {
  LLMPlanningScheduler.getInstance().stop();
  (LLMPlanningService as any).instance = null;
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

describe('LLMIntegrationManager.convertPlanToActions', () => {
  afterEach(() => {
    (LLMPlanningService as any).instance = null;
  });

  function seedPlan(npcId: string, tasks: Array<{ action_type: ActionType; priority: number; description: string }>) {
    const plan = {
      plan_id: `plan-${npcId}`,
      generated_at: Date.now(),
      expires_at: Date.now() + 3600000,
      tasks: tasks.map((t, i) => ({
        task_id: i,
        action_type: t.action_type,
        target_id: 'self',
        action_params: { targetId: 'self' },
        priority: t.priority,
        description: t.description,
        status: 'pending' as const,
      })),
      current_task_index: 0,
      status: PlanStatus.ACTIVE,
    };
    // Inject into the singleton's private activePlans map
    const service = LLMPlanningService.getInstance();
    (service as any).activePlans.set(npcId, plan);
    return plan;
  }

  it('returns empty array when no plan exists', () => {
    const manager = LLMIntegrationManager.getInstance();
    manager.initialize();
    const actions = manager.convertPlanToActions('nonexistent');
    expect(actions).toEqual([]);
    manager.shutdown();
  });

  it('returns empty array when plan is not ACTIVE', () => {
    const manager = LLMIntegrationManager.getInstance();
    manager.initialize();
    seedPlan('npc-completed', [{ action_type: ActionType.CULTIVATE, priority: 5, description: '修炼' }]);
    // Override status to COMPLETED
    const service = LLMPlanningService.getInstance();
    const plan = service.getPlan('npc-completed')!;
    plan.status = PlanStatus.COMPLETED;

    const actions = manager.convertPlanToActions('npc-completed');
    expect(actions).toEqual([]);
    manager.shutdown();
  });

  it('converts ACTIVE plan tasks to PlanAction[]', () => {
    const manager = LLMIntegrationManager.getInstance();
    manager.initialize();
    seedPlan('npc-active', [
      { action_type: ActionType.CULTIVATE, priority: 8, description: '闭关修炼' },
      { action_type: ActionType.PATROL, priority: 5, description: '巡逻领地' },
      { action_type: ActionType.TRADE, priority: 3, description: '交易资源' },
    ]);

    const actions = manager.convertPlanToActions('npc-active');
    expect(actions).toHaveLength(3);
    expect(actions[0].actionType).toBe('cultivate');
    expect(actions[0].priority).toBe(8);
    expect(actions[0].reason).toBe('闭关修炼');
    expect(actions[1].actionType).toBe('patrol');
    expect(actions[2].actionType).toBe('socialize');
    manager.shutdown();
  });

  it('filters out IDLE action type', () => {
    const manager = LLMIntegrationManager.getInstance();
    manager.initialize();
    seedPlan('npc-idle', [
      { action_type: ActionType.IDLE, priority: 1, description: '发愣' },
      { action_type: ActionType.REST, priority: 5, description: '休息' },
    ]);

    const actions = manager.convertPlanToActions('npc-idle');
    expect(actions).toHaveLength(1);
    expect(actions[0].actionType).toBe('rest');
    manager.shutdown();
  });

  it('maps all expected action types correctly', () => {
    const manager = LLMIntegrationManager.getInstance();
    manager.initialize();
    seedPlan('npc-alltypes', [
      { action_type: ActionType.REST, priority: 1, description: '休息' },
      { action_type: ActionType.PATROL, priority: 1, description: '巡逻' },
      { action_type: ActionType.CULTIVATE, priority: 1, description: '修炼' },
      { action_type: ActionType.TRADE, priority: 1, description: '交易' },
      { action_type: ActionType.EXPLORE, priority: 1, description: '探索' },
      { action_type: ActionType.LOGISTICS, priority: 1, description: '后勤' },
      { action_type: ActionType.RESOURCE_ALLOCATION, priority: 1, description: '资源分配' },
      { action_type: ActionType.RESOURCE_PURCHASE, priority: 1, description: '采购' },
      { action_type: ActionType.RESOURCE_RAID, priority: 1, description: '资源掠夺' },
      { action_type: ActionType.CAPTURE_RESOURCE_POINT, priority: 1, description: '占领资源点' },
      { action_type: ActionType.DOMAIN_WAR, priority: 1, description: '领地战争' },
      { action_type: ActionType.MILITARY_ORDER, priority: 1, description: '军令' },
      { action_type: ActionType.DIPLOMACY, priority: 1, description: '外交' },
      { action_type: ActionType.INTELLIGENCE, priority: 1, description: '情报' },
      { action_type: ActionType.ALLIANCE_FORMATION, priority: 1, description: '结盟' },
      { action_type: ActionType.CULTIVATE_BREAKTHROUGH, priority: 1, description: '突破' },
    ]);

    const actions = manager.convertPlanToActions('npc-alltypes');
    const gotTypes = actions.map(a => a.actionType);
    expect(gotTypes).toContain('rest');
    expect(gotTypes).toContain('patrol');
    expect(gotTypes).toContain('cultivate');
    expect(gotTypes).toContain('socialize');
    expect(gotTypes).toContain('request');
    // IDLE is excluded
    expect(gotTypes).not.toContain('idle');
    expect(actions.length).toBe(16); // All 16 non-IDLE types map to 5 unique NarrativeActionTypes
    manager.shutdown();
  });
});

describe('LLMIntegrationManager.triggerAndGetActions', () => {
  afterEach(() => {
    (LLMPlanningService as any).instance = null;
  });

  it('registers NPC and returns empty array when no plan exists', async () => {
    const manager = LLMIntegrationManager.getInstance();
    manager.initialize();

    const npcData = {
      id: 'npc-trigger-1',
      name: '测试NPC',
      clanId: 'clan-0',
      nation: '秦',
      role: 'core_disciple',
      realm: 'qi_refining',
      power: 100,
      personality: { ambition: 50, caution: 50, loyalty: 50, greed: 50 },
    };

    // With mocked getPlan returning undefined and requestPlan returning null,
    // triggerAndGetActions will register, find no plan, trigger, find no plan again
    const getPlanSpy = vi.spyOn(LLMPlanningService.getInstance(), 'getPlan').mockReturnValue(undefined);
    const requestPlanSpy = vi.spyOn(LLMPlanningService.getInstance(), 'requestPlan').mockResolvedValue(null);

    const actions = await manager.triggerAndGetActions('npc-trigger-1', npcData);

    expect(actions).toEqual([]);
    expect(requestPlanSpy).toHaveBeenCalledTimes(1);

    getPlanSpy.mockRestore();
    requestPlanSpy.mockRestore();
    manager.shutdown();
  });

  it('returns existing plan actions immediately without re-triggering', async () => {
    const manager = LLMIntegrationManager.getInstance();
    manager.initialize();

    const npcData = {
      id: 'npc-existing-plan',
      name: '有计划NPC',
      clanId: 'clan-0',
      nation: '秦',
      role: 'core_disciple',
      realm: 'qi_refining',
      power: 100,
      personality: { ambition: 50, caution: 50, loyalty: 50, greed: 50 },
    };

    // Seed a plan
    const service = LLMPlanningService.getInstance();
    (service as any).activePlans.set('npc-existing-plan', {
      plan_id: 'plan-existing',
      generated_at: Date.now(),
      expires_at: Date.now() + 3600000,
      tasks: [{
        task_id: 0, action_type: ActionType.CULTIVATE, target_id: 'self',
        action_params: { targetId: 'self' }, priority: 8,
        description: '继续修炼', status: 'pending',
      }],
      current_task_index: 0,
      status: PlanStatus.ACTIVE,
    });

    const requestPlanSpy = vi.spyOn(LLMPlanningService.getInstance(), 'requestPlan').mockResolvedValue(null);

    const actions = await manager.triggerAndGetActions('npc-existing-plan', npcData);

    // Should return existing plan without re-triggering
    expect(actions).toHaveLength(1);
    expect(actions[0].actionType).toBe('cultivate');
    expect(requestPlanSpy).not.toHaveBeenCalled();

    requestPlanSpy.mockRestore();
    manager.shutdown();
  });
});
