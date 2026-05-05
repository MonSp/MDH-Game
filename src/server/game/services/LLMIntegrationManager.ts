import { EventEmitter } from 'events';
import {
  LLMTier,
  LLMPlan,
  LLMPlanningRequest,
  LLMEligibility,
  PlanStatus,
  ActionType,
  NPCData,
  WorldContext,
  PlanningType
} from '../../../shared/types/LLMPlanning';
import { LLMPlanningService } from './LLMPlanningService';
import { NPCBehaviorTreeManager, translateActionToActivity } from './NPCBehaviorTree';
import { determineTier, shouldRequestPlanning, getFallbackBehavior, LLM_SERVICE_CONFIG } from '../../config/LLMConfig';
import { PlanAction, NarrativeActionType } from '../../llm/PlanParser';

export enum LLMEventType {
  PLAN_GENERATED = 'llm:plan_generated',
  PLAN_COMPLETED = 'llm:plan_completed',
  PLAN_INTERRUPTED = 'llm:plan_interrupted',
  PLAN_FAILED = 'llm:plan_failed',
  TASK_ADVANCED = 'llm:task_advanced',
  EMERGENCY_TRIGGERED = 'llm:emergency_triggered'
}

export interface LLMEvent {
  type: LLMEventType;
  npcId: string;
  planId?: string;
  taskId?: number;
  reason?: string;
  timestamp: number;
}

export class LLMEventDispatcher extends EventEmitter {
  private static instance: LLMEventDispatcher;

  private constructor() {
    super();
  }

  static getInstance(): LLMEventDispatcher {
    if (!LLMEventDispatcher.instance) {
      LLMEventDispatcher.instance = new LLMEventDispatcher();
    }
    return LLMEventDispatcher.instance;
  }

  emitEvent(event: LLMEvent): void {
    this.emit(event.type, event);
    this.emit('all', event);
  }

  getRecentEvents(count: number = 10): LLMEvent[] {
    return [];
  }
}

export class LLMPlanningScheduler {
  private static instance: LLMPlanningScheduler;
  private scheduledNPCs: Map<string, number> = new Map();
  /** NPC data store used to build planning requests. */
  private npcDataStore: Map<string, { data: NPCData; lastPlanTime: number }> = new Map();
  private eventDispatcher: LLMEventDispatcher;
  private isRunning: boolean = false;
  /** How often the scheduler loop runs (ms). Spawns planning requests for eligible NPCs. */
  private checkInterval: number = 5000;

  private constructor() {
    this.eventDispatcher = LLMEventDispatcher.getInstance();
  }

  static getInstance(): LLMPlanningScheduler {
    if (!LLMPlanningScheduler.instance) {
      LLMPlanningScheduler.instance = new LLMPlanningScheduler();
    }
    return LLMPlanningScheduler.instance;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNextCheck();
  }

  stop(): void {
    this.isRunning = false;
    this.scheduledNPCs.clear();
    this.npcDataStore.clear();
  }

  async triggerPlanning(npcId: string, memoryContext?: string): Promise<void> {
    const planningService = LLMPlanningService.getInstance();
    const request = this.createPlanningRequest(npcId, memoryContext);

    if (!request) return;

    try {
      const plan = await planningService.requestPlan(request);
      if (plan) {
        this.eventDispatcher.emitEvent({
          type: LLMEventType.PLAN_GENERATED,
          npcId,
          planId: plan.plan_id,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error(`[LLMScheduler] Plan failed for NPC ${npcId}:`, error);
    }
  }

  async triggerEmergencyPlanning(npcId: string, emergencyType: string): Promise<void> {
    const planningService = LLMPlanningService.getInstance();

    try {
      const plan = await planningService.requestEmergencyPlan(npcId, emergencyType);
      if (plan) {
        this.eventDispatcher.emitEvent({
          type: LLMEventType.EMERGENCY_TRIGGERED,
          npcId,
          planId: plan.plan_id,
          reason: emergencyType,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error(`[LLMScheduler] Emergency plan failed for NPC ${npcId}:`, error);
    }
  }

  private scheduleNextCheck(): void {
    if (!this.isRunning) return;

    setTimeout(async () => {
      await this.checkScheduledNPCs();
      this.scheduleNextCheck();
    }, this.checkInterval);
  }

  /** Process registered NPCs: request LLM plans for those eligible and not already planned. */
  async checkScheduledNPCs(): Promise<void> {
    const planningService = LLMPlanningService.getInstance();
    const now = Date.now();

    for (const [npcId, info] of this.npcDataStore.entries()) {
      // Skip if NPC already has an active plan
      const existingPlan = planningService.getPlan(npcId);
      if (existingPlan && existingPlan.status === PlanStatus.ACTIVE) continue;

      const tier = determineTier(info.data);
      if (tier === LLMTier.T3) continue; // T3 uses deterministic fallback

      // Per-tier cooldown: T0=30s, T1=60s, T2=120s
      const cooldownMs =
        tier === LLMTier.T0 ? 30_000 :
        tier === LLMTier.T1 ? 60_000 :
        120_000;
      if (now - info.lastPlanTime < cooldownMs) continue;
      info.lastPlanTime = now;

      const request = this.createPlanningRequest(npcId);
      if (!request) continue;

      try {
        const plan = await planningService.requestPlan(request);
        if (plan) {
          this.eventDispatcher.emitEvent({
            type: LLMEventType.PLAN_GENERATED,
            npcId,
            planId: plan.plan_id,
            timestamp: now,
          });
        }
      } catch (error) {
        console.error(`[LLMScheduler] Plan failed for NPC ${npcId}:`, error);
      }
    }
  }

  private createPlanningRequest(npcId: string, memoryContext?: string): LLMPlanningRequest | null {
    const info = this.npcDataStore.get(npcId);
    if (!info) return null;

    const tier = determineTier(info.data);
    const tierConfig = LLM_SERVICE_CONFIG.tier_config[tier];

    const majorEvents: string[] = [];
    if (memoryContext) {
      // Include up to 10 most recent memory lines
      majorEvents.push(...memoryContext.split('\n').filter(l => l.trim()).slice(0, 10));
    }

    return {
      npc_id: npcId,
      npc_data: info.data,
      world_context: {
        war_active: false,
        resource_density: 0.5,
        economy_status: 'normal',
        major_events: majorEvents,
      },
      planning_horizon: tierConfig.horizon,
      planning_type: PlanningType.NORMAL,
    };
  }

  /** Register an NPC for periodic LLM planning. */
  registerNPC(npcId: string, npcData?: NPCData): void {
    if (npcData) {
      this.npcDataStore.set(npcId, { data: npcData, lastPlanTime: 0 });
    }
    this.scheduledNPCs.set(npcId, Date.now());
  }

  /** Update the NPC data stored for a registered NPC (e.g. after realm change). */
  updateNPCData(npcId: string, npcData: NPCData): void {
    const existing = this.npcDataStore.get(npcId);
    if (existing) {
      this.npcDataStore.set(npcId, { ...existing, data: npcData });
    }
  }

  unregisterNPC(npcId: string): void {
    this.scheduledNPCs.delete(npcId);
    this.npcDataStore.delete(npcId);
  }

  getScheduledCount(): number {
    return this.scheduledNPCs.size;
  }

  getActivePlanCount(): number {
    return this.npcDataStore.size;
  }
}

export class LLMIntegrationManager {
  private static instance: LLMIntegrationManager;
  private behaviorTreeManager: NPCBehaviorTreeManager;
  private eventDispatcher: LLMEventDispatcher;
  private scheduler: LLMPlanningScheduler;

  private constructor() {
    this.behaviorTreeManager = NPCBehaviorTreeManager.getInstance();
    this.eventDispatcher = LLMEventDispatcher.getInstance();
    this.scheduler = LLMPlanningScheduler.getInstance();
  }

  static getInstance(): LLMIntegrationManager {
    if (!LLMIntegrationManager.instance) {
      LLMIntegrationManager.instance = new LLMIntegrationManager();
    }
    return LLMIntegrationManager.instance;
  }

  initialize(): void {
    this.scheduler.start();
    this.setupEventListeners();
  }

  shutdown(): void {
    this.scheduler.stop();
    this.eventDispatcher.removeAllListeners();
  }

  /** Main tick — call from server game loop at regular interval. */
  async tick(): Promise<void> {
    await this.scheduler.checkScheduledNPCs();
    LLMPlanningService.getInstance().cleanupExpiredPlans();
  }

  getBehaviorForNPC(npcId: string, npcData: any): string {
    const tier = determineTier(npcData);
    if (tier === LLMTier.T3) {
      return this.getFallbackBehavior(npcData);
    }

    const action = this.behaviorTreeManager.evaluateNPC(npcId);
    return translateActionToActivity(action);
  }

  registerHighTierNPC(npcId: string, npcData: NPCData): void {
    const tier = determineTier(npcData);
    if (tier !== LLMTier.T3) {
      this.scheduler.registerNPC(npcId, npcData);
    }
  }

  updateNPCData(npcId: string, npcData: NPCData): void {
    this.scheduler.updateNPCData(npcId, npcData);
  }

  unregisterNPC(npcId: string): void {
    this.scheduler.unregisterNPC(npcId);
    this.behaviorTreeManager.removeTree(npcId);
  }

  private setupEventListeners(): void {
    this.eventDispatcher.on(LLMEventType.PLAN_COMPLETED, (event: LLMEvent) => {
    });

    this.eventDispatcher.on(LLMEventType.TASK_ADVANCED, (event: LLMEvent) => {
    });
  }

  private getFallbackBehavior(npcData: any): string {
    const tier = determineTier(npcData);
    const fallbackActions = getFallbackBehavior(tier);
    if (fallbackActions.length === 0) {
      return 'rest';
    }
    return translateActionToActivity(fallbackActions[0]);
  }

  /** Convert an LLMPlan's tasks to PlanAction[] for NPCWorldService consumption. */
  convertPlanToActions(npcId: string): PlanAction[] {
    const plan = LLMPlanningService.getInstance().getPlan(npcId);
    if (!plan || plan.status !== PlanStatus.ACTIVE) {
      return [];
    }

    const actions: PlanAction[] = [];
    for (const task of plan.tasks) {
      const actionType = this.mapActionType(task.action_type);
      if (!actionType) continue;
      actions.push({
        targetId: (task.action_params?.targetId as string) || 'self',
        actionType,
        priority: task.priority,
        duration: 30,
        reason: task.description,
      });
    }
    return actions;
  }

  /** Map ActionType enum to NarrativeActionType string. */
  private mapActionType(actionType: ActionType): NarrativeActionType | null {
    if (actionType === ActionType.IDLE) return null;
    const map: Record<string, NarrativeActionType> = {
      [ActionType.REST]: 'rest',
      [ActionType.PATROL]: 'patrol',
      [ActionType.CULTIVATE]: 'cultivate',
      [ActionType.TRADE]: 'socialize',
      [ActionType.EXPLORE]: 'patrol',
      [ActionType.LOGISTICS]: 'request',
      [ActionType.RESOURCE_ALLOCATION]: 'request',
      [ActionType.RESOURCE_PURCHASE]: 'socialize',
      [ActionType.RESOURCE_RAID]: 'patrol',
      [ActionType.CAPTURE_RESOURCE_POINT]: 'patrol',
      [ActionType.DOMAIN_WAR]: 'patrol',
      [ActionType.MILITARY_ORDER]: 'patrol',
      [ActionType.DIPLOMACY]: 'socialize',
      [ActionType.INTELLIGENCE]: 'patrol',
      [ActionType.ALLIANCE_FORMATION]: 'socialize',
      [ActionType.CULTIVATE_BREAKTHROUGH]: 'cultivate',
    };
    return map[actionType] || null;
  }

  /** Trigger planning for an NPC and return converted PlanAction[], or [] on failure. */
  async triggerAndGetActions(npcId: string, npcData: any, memoryContext?: string): Promise<PlanAction[]> {
    // Register if not already registered
    this.scheduler.registerNPC(npcId, {
      id: npcId,
      name: npcData.name || npcId,
      clan_id: npcData.clanId || '',
      nation: npcData.nation || '',
      role: npcData.role || '',
      realm: npcData.realm || '',
      power: npcData.power || 0,
      personality: npcData.personality || { ambition: 50, caution: 50, loyalty: 50, greed: 50 },
    });

    // Check if plan already exists
    let actions = this.convertPlanToActions(npcId);
    if (actions.length > 0) return actions;

    // Force trigger planning and check again
    await this.scheduler.triggerPlanning(npcId, memoryContext);
    actions = this.convertPlanToActions(npcId);
    return actions;
  }
}
