import {
  LLMTier,
  LLMPlan,
  LLMPlanningRequest,
  LLMPlanningResponse,
  LLMEligibility,
  ActionType,
  PlanStatus
} from '../../../shared/types/LLMPlanning';
import { LLMGatewayService } from './LLMGatewayService';

export class LLMPlanningService {
  private static instance: LLMPlanningService;
  private activePlans: Map<string, LLMPlan> = new Map();
  private planningQueue: Map<string, number> = new Map();
  private gatewayService: LLMGatewayService;

  private constructor() {
    this.gatewayService = LLMGatewayService.getInstance();
  }

  static getInstance(): LLMPlanningService {
    if (!LLMPlanningService.instance) {
      LLMPlanningService.instance = new LLMPlanningService();
    }
    return LLMPlanningService.instance;
  }

  async requestPlan(
    request: LLMPlanningRequest,
    frontlineSummary?: string,
    revisionFlags?: string[]
  ): Promise<LLMPlan | null> {
    const cacheKey = this.getCacheKey(request);
    const cachedPlan = this.getCachedPlan(cacheKey);
    if (cachedPlan && cachedPlan.status === PlanStatus.ACTIVE) {
      return cachedPlan;
    }

    if (frontlineSummary) {
      request.frontline_summary = frontlineSummary;
    }
    if (revisionFlags) {
      request.revision_flags = revisionFlags;
    }

    try {
      const response = await this.gatewayService.sendPlanningRequest(request);
      const plan = this.parseResponse(response);
      this.activePlans.set(request.npc_id, plan);
      this.planningQueue.set(request.npc_id, Date.now());
      return plan;
    } catch (error) {
      console.error(`LLM Planning failed for NPC ${request.npc_id}:`, error);
      return null;
    }
  }

  async requestEmergencyPlan(npcId: string, emergencyType: string): Promise<LLMPlan | null> {
    return null;
  }

  buildPlanPromptWithFrontline(
    request: LLMPlanningRequest,
    frontlineSummary: string,
    revisionFlags: string[]
  ): string {
    const parts: string[] = [];

    parts.push(`你是一个修仙世界的${request.npc_data.role}，名为${request.npc_data.name}。`);
    parts.push(`你所在的势力: ${request.npc_data.clan_id}`);
    parts.push(`当前战争状态: ${request.world_context.war_active ? '战争进行中' : '和平时期'}`);

    if (frontlineSummary && frontlineSummary.length > 0) {
      parts.push('');
      parts.push(frontlineSummary);
    }

    if (revisionFlags && revisionFlags.length > 0) {
      parts.push('');
      parts.push('## 来自前线的修正建议');
      for (const flag of revisionFlags) {
        parts.push(`- ${flag}`);
      }
    }

    if (request.memory_context) {
      parts.push('');
      parts.push(request.memory_context);
    }

    parts.push('');
    parts.push(`请基于以上信息，为${request.npc_data.name}制定接下来${request.planning_horizon}的行动规划。`);

    return parts.join('\n');
  }

  getPlan(npcId: string): LLMPlan | undefined {
    return this.activePlans.get(npcId);
  }

  getCurrentTask(npcId: string): { task: any; progress: number } | null {
    const plan = this.activePlans.get(npcId);
    if (!plan || plan.status !== PlanStatus.ACTIVE) {
      return null;
    }

    const currentTask = plan.tasks[plan.current_task_index];
    if (!currentTask) {
      return null;
    }

    const progress = plan.current_task_index / plan.tasks.length;
    return { task: currentTask, progress };
  }

  advanceTask(npcId: string): boolean {
    const plan = this.activePlans.get(npcId);
    if (!plan) return false;

    plan.current_task_index++;
    if (plan.current_task_index >= plan.tasks.length) {
      plan.status = PlanStatus.COMPLETED;
      return false;
    }

    return true;
  }

  interruptPlan(npcId: string, reason: string): void {
    const plan = this.activePlans.get(npcId);
    if (plan) {
      plan.status = PlanStatus.INTERRUPTED;
    }
  }

  failPlan(npcId: string, reason: string): void {
    const plan = this.activePlans.get(npcId);
    if (plan) {
      plan.status = PlanStatus.FAILED;
    }
  }

  cleanupExpiredPlans(): void {
    const now = Date.now();
    for (const [npcId, plan] of this.activePlans.entries()) {
      if (plan.expires_at < now) {
        plan.status = PlanStatus.COMPLETED;
      }
    }
  }

  private getCacheKey(request: LLMPlanningRequest): string {
    const memHash = request.world_context.major_events.join(',').length;
    return `${request.npc_id}_${request.planning_horizon}_${request.world_context.war_active}_mem${memHash}`;
  }

  private getCachedPlan(cacheKey: string): LLMPlan | null {
    return null;
  }

  private parseResponse(response: LLMPlanningResponse): LLMPlan {
    return {
      plan_id: response.plan_id,
      generated_at: Date.now(),
      expires_at: Date.now() + response.horizon_days * 24 * 60 * 60 * 1000,
      tasks: response.sub_tasks,
      current_task_index: 0,
      status: PlanStatus.ACTIVE
    };
  }
}
