import {
  LLMTier,
  PlanningType,
  ActionType,
  LLMPlan,
  LLMPlanningRequest,
  LLMPlanningResponse,
  LLMEligibility,
  TierConfig,
  LLMServiceConfig,
  PlanStatus
} from '../../shared/types/LLMPlanning';

export const LLM_SERVICE_CONFIG: LLMServiceConfig = {
  provider: 'openai',
  model: 'gpt-4',
  temperature: 0.7,
  max_tokens: 2000,
  cache_enabled: true,
  fallback_script_library: 'scripts/llm_fallback/',
  tier_config: {
    [LLMTier.T0]: { frequency: '月/次', horizon: '1月' },
    [LLMTier.T1]: { frequency: '周/次', horizon: '1周' },
    [LLMTier.T2]: { frequency: '日/次', horizon: '1天' },
    [LLMTier.T3]: { frequency: 'never', horizon: '1天' }
  } as Record<LLMTier, TierConfig>,
  emergency_config: {
    response_time_limit: 5 * 60 * 1000,
    max_tasks: 3
  }
};

export function determineTier(npc: { role: string; realm: string; power: number }): LLMTier {
  if (npc.role === 'emperor' || npc.role === 'overlord') {
    return LLMTier.T0;
  }
  if (npc.role === 'family_head' || npc.role === 'general') {
    return LLMTier.T1;
  }
  if (npc.role === 'elder' || npc.role === 'core_disciple') {
    return LLMTier.T2;
  }
  return LLMTier.T3;
}

export function shouldRequestPlanning(eligibility: LLMEligibility, tierConfig: TierConfig): boolean {
  if (eligibility.tier === LLMTier.T3) {
    return false;
  }

  const now = Date.now();
  const timeSinceLastPlanning = now - eligibility.last_planning_time;

  switch (eligibility.planning_horizon) {
    case '1月':
      return timeSinceLastPlanning >= 30 * 24 * 60 * 60 * 1000;
    case '1周':
      return timeSinceLastPlanning >= 7 * 24 * 60 * 60 * 1000;
    case '1天':
      return timeSinceLastPlanning >= 24 * 60 * 60 * 1000;
    default:
      return false;
  }
}

export function createPlanningRequest(
  npcId: string,
  npcData: any,
  worldContext: any,
  horizon: '1天' | '1周' | '1月',
  planningType: PlanningType = PlanningType.NORMAL
): LLMPlanningRequest {
  return {
    npc_id: npcId,
    npc_data: npcData,
    world_context: worldContext,
    planning_horizon: horizon,
    planning_type: planningType
  };
}

export function parseLLMResponse(response: LLMPlanningResponse): LLMPlan {
  return {
    plan_id: response.plan_id,
    generated_at: Date.now(),
    expires_at: Date.now() + response.horizon_days * 24 * 60 * 60 * 1000,
    tasks: response.sub_tasks,
    current_task_index: 0,
    status: PlanStatus.ACTIVE
  };
}

export function getFallbackBehavior(tier: LLMTier): ActionType[] {
  switch (tier) {
    case LLMTier.T0:
      return [ActionType.DOMAIN_WAR, ActionType.ALLIANCE_FORMATION];
    case LLMTier.T1:
      return [ActionType.MILITARY_ORDER, ActionType.DIPLOMACY];
    case LLMTier.T2:
      return [ActionType.CULTIVATE, ActionType.RESOURCE_ALLOCATION];
    default:
      return [ActionType.REST, ActionType.PATROL];
  }
}
