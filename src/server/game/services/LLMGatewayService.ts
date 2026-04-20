import {
  LLMPlanningRequest,
  LLMPlanningResponse,
  LLMServiceConfig,
  ActionType
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
    const systemPrompt = this.buildSystemPrompt(request);
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

  private buildSystemPrompt(request: LLMPlanningRequest): string {
    return `你是修仙世界${request.world_context.war_active ? '战争时期' : '和平时期'}的NPC规划专家。
根据NPC的身份、性格和当前世界局势，生成合理的行动规划。
规划应该包含多个子任务，每个子任务有明确的行动类型和优先级。
行动类型包括：IDLE, REST, PATROL, EXPLORE, CULTIVATE, TRADE, LOGISTICS, MILITARY_ORDER, DIPLOMACY, INTELLIGENCE, RESOURCE_ALLOCATION, RESOURCE_PURCHASE, RESOURCE_RAID, CAPTURE_RESOURCE_POINT, DOMAIN_WAR, ALLIANCE_FORMATION, CULTIVATE_BREAKTHROUGH`;
  }

  private buildUserPrompt(request: LLMPlanningRequest): string {
    const { npc_data, world_context, planning_horizon } = request;
    return `NPC信息：
- 名字：${npc_data.name}
- 家族：${npc_data.clan_id}
- 国家：${npc_data.nation}
- 角色：${npc_data.role}
- 境界：${npc_data.realm}
- 实力：${npc_data.power}
- 性格：野心${npc_data.personality.ambition}，谨慎${npc_data.personality.caution}，忠诚${npc_data.personality.loyalty}，贪婪${npc_data.personality.greed}

世界局势：
- 战争状态：${world_context.war_active ? '进行中' : '和平'}
- 资源密度：${world_context.resource_density}
- 经济状态：${world_context.economy_status}
- 重大事件：${world_context.major_events.join(', ') || '无'}

请为这个NPC规划未来${planning_horizon}的行动计划。`;
  }

  private parseLLMOutput(output: string): LLMPlanningResponse {
    try {
      const parsed = JSON.parse(output);
      return {
        plan_id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        npc_id: '',
        horizon_days: this.horizonToDays(parsed.horizon || '1天'),
        primary_goal: parsed.primary_goal || '',
        sub_tasks: (parsed.sub_tasks || []).map((task: any, idx: number) => ({
          task_id: idx,
          description: task.description || '',
          priority: task.priority || 5,
          target_completion_day: task.target_completion_day || 1,
          action_type: (task.action_type as ActionType) || 'IDLE' as ActionType,
          action_params: task.action_params || {}
        })),
        fallback_behavior: parsed.fallback_behavior || 'REST'
      };
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
    return `${request.npc_id}_${request.planning_horizon}`;
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
