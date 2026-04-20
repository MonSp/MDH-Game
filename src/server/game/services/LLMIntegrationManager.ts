import { EventEmitter } from 'events';
import {
  LLMTier,
  LLMPlan,
  LLMPlanningRequest,
  LLMEligibility,
  PlanStatus,
  ActionType
} from '../../../shared/types/LLMPlanning';
import { LLMPlanningService } from './LLMPlanningService';
import { NPCBehaviorTreeManager } from './NPCBehaviorTree';
import { determineTier, shouldRequestPlanning, getFallbackBehavior, LLM_SERVICE_CONFIG } from '../../config/LLMConfig';

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
  private eventDispatcher: LLMEventDispatcher;
  private isRunning: boolean = false;
  private checkInterval: number = 60 * 60 * 1000;

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
  }

  async schedulePlanningForNPC(
    npcId: string,
    tier: LLMTier,
    lastPlanningTime: number,
    horizon: '1天' | '1周' | '1月'
  ): Promise<void> {
    const eligibility: LLMEligibility = {
      tier,
      last_planning_time: lastPlanningTime,
      planning_horizon: horizon
    };

    const tierConfig = LLM_SERVICE_CONFIG.tier_config[tier];

    if (shouldRequestPlanning(eligibility, tierConfig)) {
      await this.triggerPlanning(npcId);
    }
  }

  async triggerPlanning(npcId: string): Promise<void> {
    const planningService = LLMPlanningService.getInstance();
    const request = this.createPlanningRequest(npcId);

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
      console.error(`Failed to schedule planning for NPC ${npcId}:`, error);
    }
  }

  async triggerEmergencyPlanning(
    npcId: string,
    emergencyType: string
  ): Promise<void> {
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
      console.error(`Failed to trigger emergency planning for NPC ${npcId}:`, error);
    }
  }

  private scheduleNextCheck(): void {
    if (!this.isRunning) return;

    setTimeout(async () => {
      await this.checkScheduledNPCs();
      this.scheduleNextCheck();
    }, this.checkInterval);
  }

  private async checkScheduledNPCs(): Promise<void> {
    for (const [npcId, lastCheck] of this.scheduledNPCs.entries()) {
    }
  }

  private createPlanningRequest(npcId: string): LLMPlanningRequest | null {
    return null;
  }

  registerNPC(npcId: string): void {
    this.scheduledNPCs.set(npcId, Date.now());
  }

  unregisterNPC(npcId: string): void {
    this.scheduledNPCs.delete(npcId);
  }

  getScheduledCount(): number {
    return this.scheduledNPCs.size;
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

  getBehaviorForNPC(npcId: string, npcData: any): string {
    const tier = determineTier(npcData);
    if (tier === LLMTier.T3) {
      return this.getFallbackBehavior(npcData);
    }

    const action = this.behaviorTreeManager.evaluateNPC(npcId);
    return this.translateActionToActivity(action);
  }

  registerHighTierNPC(npcId: string, npcData: any): void {
    const tier = determineTier(npcData);
    if (tier !== LLMTier.T3) {
      this.scheduler.registerNPC(npcId);
      this.scheduler.schedulePlanningForNPC(
        npcId,
        tier,
        0,
        LLM_SERVICE_CONFIG.tier_config[tier].horizon
      );
    }
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
    return this.translateActionToActivity(fallbackActions[0]);
  }

  private translateActionToActivity(actionType: any): string {
    return 'rest';
  }
}
