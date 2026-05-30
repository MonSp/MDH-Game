import {
  LLMPlanningRequest,
  LLMPlanningResponse,
  LLMServiceConfig,
  ActionType,
  LLMIntent
} from '../../../shared/types/LLMPlanning';
import { LLM_SERVICE_CONFIG } from '../../config/LLMConfig';

interface LLMResponse {
  success: boolean;
  data?: LLMPlanningResponse;
  error?: string;
  cached?: boolean;
}

export class LLMGatewayService {
  private static instance: LLMGatewayService;
  private config: LLMServiceConfig;
  private responseCache: Map<string, LLMResponse> = new Map();
  private fallbackQueue: Map<string, Function> = new Map();

  private constructor() {
    this.config = LLM_SERVICE_CONFIG;
  }

  static getInstance(): LLMGatewayService {
    if (!LLMGatewayService.instance) {
      LLMGatewayService.instance = new LLMGatewayService();
    }
    return LLMGatewayService.instance;
  }

  async sendPlanningRequest(request: LLMPlanningRequest): Promise<LLMPlanningResponse> {
    if (this.config.cache_enabled) {
      const cached = this.getCachedResponse(request);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await this.callLLMProvider(request);
      if (this.config.cache_enabled) {
        this.cacheResponse(request, response);
      }
      return response;
    } catch (error) {
      console.error('LLM provider call failed:', error);
      return this.getFallbackResponse(request);
    }
  }

  private async callLLMProvider(request: LLMPlanningRequest): Promise<LLMPlanningResponse> {
    if (this.config.provider === 'openai') {
      return this.callOpenAI(request);
    } else {
      return this.callLocalLLM(request);
    }
  }

  private async callOpenAI(request: LLMPlanningRequest): Promise<LLMPlanningResponse> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(request);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.max_tokens
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return this.parseLLMOutput(data.choices[0].message.content);
  }

  private async callLocalLLM(request: LLMPlanningRequest): Promise<LLMPlanningResponse> {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: this.buildUserPrompt(request),
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Local LLM error: ${response.status}`);
    }

    const data = await response.json();
    return this.parseLLMOutput(data.response);
  }

  private buildSystemPrompt(): string {
    return `You are an NPC planning expert in a cultivation world.
Your task is to generate action plans for NPCs based on their role, tier, and personality.
Plans should contain multiple sub-tasks, each with clear action types and priorities.
Action types include:
- IDLE: idle
- REST: rest and recovery
- PATROL: patrol
- EXPLORE: explore opportunities
- CULTIVATE: cultivation breakthrough
- TRADE: market trading
- LOGISTICS: logistics support
- MILITARY_ORDER: military orders
- DIPLOMACY: diplomatic activities
- INTELLIGENCE: intelligence gathering
- RESOURCE_ALLOCATION: resource allocation
- RESOURCE_PURCHASE: resource purchase
- RESOURCE_RAID: resource raid
- CAPTURE_RESOURCE_POINT: capture resource points
- DOMAIN_WAR: domain war
- ALLIANCE_FORMATION: alliance formation
- CULTIVATE_BREAKTHROUGH: closed-door breakthrough

Response format: JSON with 'actions' array containing objects with 'actionType', 'priority', and 'reason' fields.`;
  }

  private buildUserPrompt(request: LLMPlanningRequest): string {
    const { npc_data, world_context, planning_horizon, frontline_summary, revision_flags, memory_context } = request;
    const parts: string[] = [];

    parts.push(`## NPC Profile`);
    parts.push(`Role: ${npc_data.role}`);
    parts.push(`Tier: ${this.getTierDescription(npc_data.role)}`);
    parts.push(`Realm: ${npc_data.realm}`);
    parts.push(`Power: ${npc_data.power}`);
    parts.push(`Personality:`);
    parts.push(`- Ambition: ${npc_data.personality.ambition}`);
    parts.push(`- Caution: ${npc_data.personality.caution}`);
    parts.push(`- Loyalty: ${npc_data.personality.loyalty}`);
    parts.push(`- Greed: ${npc_data.personality.greed}`);

    parts.push('');
    parts.push(`## World Situation`);
    parts.push(`- War Status: ${world_context.war_active ? 'active' : 'peaceful'}`);
    parts.push(`- Resource Density: ${world_context.resource_density}`);
    parts.push(`- Economy Status: ${world_context.economy_status}`);
    parts.push(`- Major Events: ${world_context.major_events.join(', ') || 'none'}`);

    if (frontline_summary) {
      parts.push('');
      parts.push(frontline_summary);
    }

    if (revision_flags && revision_flags.length > 0) {
      parts.push('');
      parts.push('## Revision Suggestions from Frontline');
      for (const flag of revision_flags) {
        parts.push(`- ${flag}`);
      }
    }

    if (memory_context) {
      parts.push('');
      parts.push(memory_context);
    }

    parts.push('');
    parts.push(`## Task`);
    parts.push(`Please plan this NPC's actions for the next ${planning_horizon}.`);
    parts.push(`Consider the NPC's tier, role, personality, and current world situation.`);
    parts.push(`Provide 3-5 actions with priorities (1=highest, 10=lowest).`);

    return parts.join('\n');
  }

  private getTierDescription(role: string): string {
    const tierMap: Record<string, string> = {
      'family_head': 'Tier-1 (Family heads, generals)',
      'elder': 'Tier-2 (Elders, core disciples)',
      'core_disciple': 'Tier-2 (Elders, core disciples)',
      'inner_disciple': 'Tier-3 (Ordinary NPCs)',
      'branch_disciple': 'Tier-3 (Ordinary NPCs)',
      'law_enforcement_elder': 'Tier-2 (Elders, core disciples)'
    };
    return tierMap[role] || 'Tier-3 (Ordinary NPCs)';
  }

  private parseLLMOutput(output: string): LLMPlanningResponse {
    try {
      const parsed = JSON.parse(output);
      const tasks = parsed.suggested_tasks || parsed.sub_tasks || [];
      const response: LLMPlanningResponse = {
        plan_id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        npc_id: '',
        horizon_days: this.horizonToDays(parsed.horizon || '1天'),
        primary_goal: parsed.primary_goal || '',
        sub_tasks: tasks.map((task: any, idx: number) => ({
          task_id: idx,
          description: task.description || '',
          priority: task.priority || 5,
          target_completion_day: task.target_completion_day || 1,
          action_type: (task.action_type as ActionType) || 'IDLE' as ActionType,
          action_params: task.action_params || {}
        })),
        fallback_behavior: parsed.fallback_behavior || 'REST'
      };
      if (parsed.intent) {
        response.intent = {
          goal: parsed.intent.goal || '',
          metric: parsed.intent.metric || '',
          target_value: parsed.intent.target_value ?? 0,
          deadline_frames: parsed.intent.deadline_frames ?? 10000,
          validity_condition: parsed.intent.validity_condition || 'true'
        };
      }
      return response;
    } catch {
      return this.getDefaultResponse();
    }
  }

  private getDefaultResponse(): LLMPlanningResponse {
    return {
      plan_id: `default_${Date.now()}`,
      npc_id: '',
      horizon_days: 1,
      primary_goal: '日常活动',
      sub_tasks: [
        {
          task_id: 0,
          description: '休息恢复',
          priority: 1,
          target_completion_day: 1,
          action_type: 'IDLE' as ActionType,
          action_params: {}
        }
      ],
      fallback_behavior: 'REST'
    };
  }

  private horizonToDays(horizon: string): number {
    switch (horizon) {
      case '1月': return 30;
      case '1周': return 7;
      case '1天': return 1;
      default: return 1;
    }
  }

  private getCachedResponse(request: LLMPlanningRequest): LLMPlanningResponse | null {
    const key = this.getCacheKey(request);
    const cached = this.responseCache.get(key);
    if (cached && cached.success && cached.data) {
      return cached.data;
    }
    return null;
  }

  private cacheResponse(request: LLMPlanningRequest, response: LLMPlanningResponse): void {
    const key = this.getCacheKey(request);
    this.responseCache.set(key, { success: true, data: response, cached: true });
  }

  private getCacheKey(request: LLMPlanningRequest): string {
    return `${request.npc_data.role}_${request.npc_data.realm}_${request.planning_horizon}`;
  }

  private getFallbackResponse(request: LLMPlanningRequest): LLMPlanningResponse {
    return {
      plan_id: `fallback_${Date.now()}`,
      npc_id: request.npc_id,
      horizon_days: this.horizonToDays(request.planning_horizon),
      primary_goal: '稳健发展',
      sub_tasks: [
        {
          task_id: 0,
          description: '日常修炼',
          priority: 1,
          target_completion_day: 1,
          action_type: ActionType.CULTIVATE,
          action_params: {}
        }
      ],
      fallback_behavior: 'REST'
    };
  }

  clearCache(): void {
    this.responseCache.clear();
  }
}
