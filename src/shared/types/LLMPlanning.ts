export enum LLMTier {
  T0 = 'T0',
  T1 = 'T1',
  T2 = 'T2',
  T3 = 'T3'
}

export enum PlanningType {
  NORMAL = 'NORMAL',
  EMERGENCY = 'EMERGENCY'
}

export enum ActionType {
  IDLE = 'IDLE',
  REST = 'REST',
  PATROL = 'PATROL',
  EXPLORE = 'EXPLORE',
  CULTIVATE = 'CULTIVATE',
  TRADE = 'TRADE',
  LOGISTICS = 'LOGISTICS',
  MILITARY_ORDER = 'MILITARY_ORDER',
  DIPLOMACY = 'DIPLOMACY',
  INTELLIGENCE = 'INTELLIGENCE',
  RESOURCE_ALLOCATION = 'RESOURCE_ALLOCATION',
  RESOURCE_PURCHASE = 'RESOURCE_PURCHASE',
  RESOURCE_RAID = 'RESOURCE_RAID',
  CAPTURE_RESOURCE_POINT = 'CAPTURE_RESOURCE_POINT',
  DOMAIN_WAR = 'DOMAIN_WAR',
  ALLIANCE_FORMATION = 'ALLIANCE_FORMATION',
  CULTIVATE_BREAKTHROUGH = 'CULTIVATE_BREAKTHROUGH'
}

export enum PlanStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  INTERRUPTED = 'INTERRUPTED',
  FAILED = 'FAILED'
}

export interface SubTask {
  task_id: number;
  description: string;
  priority: number;
  target_completion_day: number;
  action_type: ActionType;
  action_params: Record<string, any>;
}

export interface LLMPlan {
  plan_id: string;
  generated_at: number;
  expires_at: number;
  tasks: SubTask[];
  current_task_index: number;
  status: PlanStatus;
}

export interface NPCData {
  id: string;
  name: string;
  clan_id: string;
  nation: string;
  role: string;
  realm: string;
  power: number;
  personality: {
    ambition: number;
    caution: number;
    loyalty: number;
    greed: number;
  };
}

export interface WorldContext {
  war_active: boolean;
  resource_density: number;
  economy_status: 'prosperous' | 'normal' | 'depressed';
  major_events: string[];
}

export interface LLMPlanningRequest {
  npc_id: string;
  npc_data: NPCData;
  world_context: WorldContext;
  planning_horizon: '1天' | '1周' | '1月';
  planning_type: PlanningType;
}

export interface LLMPlanningResponse {
  plan_id: string;
  npc_id: string;
  horizon_days: number;
  primary_goal: string;
  sub_tasks: SubTask[];
  fallback_behavior: string;
}

export interface LLMEligibility {
  tier: LLMTier;
  last_planning_time: number;
  planning_horizon: '1天' | '1周' | '1月';
}

export interface NPCWithLLM extends NPCData {
  llm_plan?: LLMPlan;
  llm_eligibility: LLMEligibility;
}

export interface TierConfig {
  frequency: string;
  horizon: '1天' | '1周' | '1月';
}

export interface EmergencyConfig {
  response_time_limit: number;
  max_tasks: number;
}

export interface LLMServiceConfig {
  provider: 'openai' | 'local';
  model: string;
  temperature: number;
  max_tokens: number;
  cache_enabled: boolean;
  fallback_script_library: string;
  tier_config: Record<LLMTier, TierConfig>;
  emergency_config: EmergencyConfig;
}
