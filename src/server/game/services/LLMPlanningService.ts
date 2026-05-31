import {
  LLMTier,
  LLMPlan,
  LLMPlanningRequest,
  LLMPlanningResponse,
  LLMEligibility,
  ActionType,
  PlanStatus,
  CommandStatus,
  LLMIntent,
  IntentValidationResult,
  Command
} from '../../../shared/types/LLMPlanning';
import { LLMGatewayService } from './LLMGatewayService';
import { determineTier } from '../../config/LLMConfig';
import { EconomicDigestWasm, ECONOMIC_POSTURE_LABELS, wasmGetEconomicDigest } from '../../../ecs/ECSWasmLoader';
import { OntologyBridge, SemanticNPCProfile } from './OntologyBridge';

export enum NarrativeDimension {
  BATTLE_STATUS = '战况',
  RESOURCE_STATUS = '资源',
  MORALE_STATUS = '士气',
  TERRITORY_STATUS = '领地'
}

export enum BattleStatusLevel {
  STALEMATE = '战况胶着',
  HEAVY_CASUALTIES = '伤亡惨重',
  MEAT_GRINDER = '血肉磨盘'
}

export enum ResourceStatusLevel {
  ABUNDANT = '资源充足',
  SHORTAGE = '资源告急',
  ARMAMENT_CRISIS = '军械告急'
}

export enum MoraleStatusLevel {
  HIGH = '士气高昂',
  STABLE = '士气平稳',
  LOW = '士气低迷'
}

export enum TerritoryStatusLevel {
  SECURE = '固若金汤',
  THREATENED = '领地受胁',
  FALLEN = '领地沦陷'
}

export type NarrativeStatusLevel =
  | BattleStatusLevel
  | ResourceStatusLevel
  | MoraleStatusLevel
  | TerritoryStatusLevel;

export interface NarrativeState {
  dimension: NarrativeDimension;
  level: NarrativeStatusLevel;
  description: string;
  severity: number;
}

export interface DecomposedCommand {
  activity: string;
  target: string;
  priority: number;
}

export interface NarrativeRawData {
  casualtyRate: number;
  resourcesAvailable: boolean;
  resourceStockpile: number;
  moraleLevel: number;
  territoryThreatened: boolean;
  resourcePointsLost: number;
}

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

      const tier = determineTier({
        role: request.npc_data.role,
        realm: request.npc_data.realm,
        power: request.npc_data.power
      });

      const tierNum = tier === LLMTier.T0 ? 0 : tier === LLMTier.T1 ? 1 : tier === LLMTier.T2 ? 2 : 3;

      if (tierNum <= 2 && plan.intent) {
        plan.decomposed_commands = LLMPlanningService.decomposeIntent(
          request.npc_id,
          plan.intent,
          tierNum
        );
      }

      return plan;
    } catch (error) {
      console.error(`LLM Planning failed for NPC ${request.npc_id}:`, error);
      return null;
    }
  }

  async requestEmergencyPlan(npcId: string, emergencyType: string): Promise<LLMPlan | null> {
    return null;
  }

  static deriveNarrativeState(data: NarrativeRawData): NarrativeState[] {
    const states: NarrativeState[] = [];

    if (data.casualtyRate > 0.3) {
      states.push({
        dimension: NarrativeDimension.BATTLE_STATUS,
        level: BattleStatusLevel.MEAT_GRINDER,
        description: `前线伤亡率高达${Math.round(data.casualtyRate * 100)}%，已沦为血肉磨盘，每一寸土地都在吞噬修士的生命`,
        severity: 3
      });
    } else if (data.casualtyRate >= 0.1) {
      states.push({
        dimension: NarrativeDimension.BATTLE_STATUS,
        level: BattleStatusLevel.HEAVY_CASUALTIES,
        description: `前线伤亡率达${Math.round(data.casualtyRate * 100)}%，伤亡惨重，后备兵员补充压力巨大`,
        severity: 2
      });
    } else {
      states.push({
        dimension: NarrativeDimension.BATTLE_STATUS,
        level: BattleStatusLevel.STALEMATE,
        description: `战况胶着，双方列阵对峙暂无大规模伤亡`,
        severity: 0
      });
    }

    if (!data.resourcesAvailable && data.resourceStockpile < 0.1) {
      states.push({
        dimension: NarrativeDimension.RESOURCE_STATUS,
        level: ResourceStatusLevel.ARMAMENT_CRISIS,
        description: `矿脉失守且储备枯竭，军械告急，前线将士已无可用之兵刃法器`,
        severity: 3
      });
    } else if (!data.resourcesAvailable || data.resourceStockpile < 0.3) {
      states.push({
        dimension: NarrativeDimension.RESOURCE_STATUS,
        level: ResourceStatusLevel.SHORTAGE,
        description: `资源告急，灵石与军械储备已跌破警戒线，难以支撑持久战`,
        severity: 2
      });
    } else {
      states.push({
        dimension: NarrativeDimension.RESOURCE_STATUS,
        level: ResourceStatusLevel.ABUNDANT,
        description: `资源充足，灵石与军械储备足以支撑长期作战`,
        severity: 0
      });
    }

    if (data.moraleLevel < 0.3) {
      states.push({
        dimension: NarrativeDimension.MORALE_STATUS,
        level: MoraleStatusLevel.LOW,
        description: `士气低迷，前线将士战意消沉，逃兵与动摇者日渐增多`,
        severity: 2
      });
    } else if (data.moraleLevel <= 0.7) {
      states.push({
        dimension: NarrativeDimension.MORALE_STATUS,
        level: MoraleStatusLevel.STABLE,
        description: `士气平稳，将士尚能坚守阵线，但缺乏进取锐气`,
        severity: 1
      });
    } else {
      states.push({
        dimension: NarrativeDimension.MORALE_STATUS,
        level: MoraleStatusLevel.HIGH,
        description: `士气高昂，将士求战心切，军心可用`,
        severity: 0
      });
    }

    if (data.territoryThreatened && data.resourcePointsLost > 2) {
      states.push({
        dimension: NarrativeDimension.TERRITORY_STATUS,
        level: TerritoryStatusLevel.FALLEN,
        description: `领地沦陷，${data.resourcePointsLost}处资源点已落入敌手，防线岌岌可危`,
        severity: 3
      });
    } else if (data.territoryThreatened && data.resourcePointsLost > 0) {
      states.push({
        dimension: NarrativeDimension.TERRITORY_STATUS,
        level: TerritoryStatusLevel.THREATENED,
        description: `领地受胁，${data.resourcePointsLost}处资源点面临威胁，需紧急调配兵力固守`,
        severity: 2
      });
    } else {
      states.push({
        dimension: NarrativeDimension.TERRITORY_STATUS,
        level: TerritoryStatusLevel.SECURE,
        description: `固若金汤，领地防线完整，资源点安然无恙`,
        severity: 0
      });
    }

    return states;
  }

  static composeNarrativeDigest(states: NarrativeState[]): string {
    const sorted = [...states].sort((a, b) => b.severity - a.severity);
    const top = sorted.slice(0, 3);
    const lines = top.map(
      s => `【${s.dimension}】${s.level}：${s.description}`
    );
    return lines.join('\n');
  }

  static formatEconomicDigestForPrompt(
    digest: EconomicDigestWasm,
    tier: number
  ): string {
    const lines: string[] = [];

    lines.push('[经济态势]');
    lines.push(`库房：${digest.treasuryBalance} 灵石（周净${digest.weeklyIncomeRate - digest.weeklyExpenseRate >= 0 ? '+' : ''}${Math.round(digest.weeklyIncomeRate - digest.weeklyExpenseRate)}）`);
    lines.push(`态势：${ECONOMIC_POSTURE_LABELS[digest.posture] ?? '未知'}`);

    if (digest.alertCount > 0) {
      lines.push('异常警报：');
      for (let i = 0; i < digest.alertCount && i < digest.alerts.length; i++) {
        const a = digest.alerts[i];
        const commodityNames = ['矿石', '食物', '装备', '材料', '丹药', '灵石'];
        const name = commodityNames[a.commodityType] ?? '未知';
        const desc = a.priceRatio >= 2.5 ? '严重短缺' : a.priceRatio >= 1.8 ? '供不应求' : '供需偏紧';
        lines.push(`  - ${name}：供给${a.supply} 需求${a.demand} 价格${a.priceRatio.toFixed(1)}×基准 — ${desc}`);
      }
    }

    if (tier <= 0) {
      if (digest.opportunityCount > 0) {
        lines.push('战略情报：');
        for (let i = 0; i < digest.opportunityCount && i < digest.opportunities.length; i++) {
          const o = digest.opportunities[i];
          const commodityNames = ['矿石', '食物', '装备', '材料', '丹药', '灵石'];
          const name = commodityNames[o.commodityType] ?? '未知';
          lines.push(`  - 套利机会：从[${o.fromClanId}]购${name}运往[${o.toClanId}]可获利${(o.profitRate * 100).toFixed(0)}%`);
        }
      }

      if (digest.weaknessCount > 0) {
        for (let i = 0; i < digest.weaknessCount && i < digest.enemyWeaknesses.length; i++) {
          const w = digest.enemyWeaknesses[i];
          const weaknessNames = ['', '食物依赖进口', '库房灵石见底', '材料严重短缺', '灵石通胀', '装备严重短缺'];
          const wName = weaknessNames[w.weaknessType] ?? '未知弱点';
          if (i === 0 && digest.opportunityCount === 0) {
            lines.push('战略情报：');
          }
          lines.push(`  - 敌族弱点：[${w.clanId}]的${wName}`);
        }
      }
    }

    if (digest.alertCount === 0 && digest.posture === 1) {
      return '[经济态势] 经济态势：正常，无需特别关注';
    }

    if (digest.alertCount > 0 && tier <= 1) {
      const causalChain = OntologyBridge.buildCausalChain(digest);
      if (causalChain.steps.length > 0) {
        lines.push('');
        lines.push('[因果推理链]');
        lines.push(`触发：${causalChain.trigger}`);
        for (const step of causalChain.steps) {
          lines.push(`  → ${step.effect}`);
        }
        if (causalChain.risk_projection) {
          lines.push(`风险预测：${causalChain.risk_projection}`);
        }
        if (causalChain.countermeasures.length > 0) {
          lines.push('对策建议：');
          for (const cm of causalChain.countermeasures) {
            lines.push(`  - ${cm.action}（${cm.effect}，成本：${cm.cost}，风险：${cm.risk}）`);
          }
        }
      }
    }

    return lines.join('\n');
  }

  static decomposeIntent(npcId: string, intent: LLMIntent, tier: number): DecomposedCommand[] {
    if (tier > 2) {
      return [];
    }

    const metric = intent.metric.toLowerCase();
    const commands: DecomposedCommand[] = [];

    if (metric.includes('fightingstrength') || metric.includes('战力')) {
      commands.push(
        { activity: 'Attack', target: '敌方主力', priority: 1 },
        { activity: 'Ambush', target: '敌方薄弱点', priority: 2 },
        { activity: 'Assassinate', target: '敌方指挥官', priority: 2 },
        { activity: 'CaptureResourcePoint', target: '敌方资源点', priority: 3 }
      );
    }

    if (metric.includes('resource') || metric.includes('资源')) {
      commands.push(
        { activity: 'Scout', target: '资源富集区', priority: 1 },
        { activity: 'Gather', target: '已知资源点', priority: 1 },
        { activity: 'Trade', target: '市场/商队', priority: 2 },
        { activity: 'Build', target: '资源设施', priority: 3 }
      );
    }

    if (metric.includes('territory') || metric.includes('领土')) {
      commands.push(
        { activity: 'Patrol', target: '边境区域', priority: 1 },
        { activity: 'DefendPosition', target: '关键据点', priority: 1 },
        { activity: 'Explore', target: '未探明区域', priority: 2 },
        { activity: 'Scout', target: '敌方动向', priority: 2 }
      );
    }

    if (commands.length === 0) {
      commands.push(
        { activity: 'Patrol', target: '防区', priority: 1 },
        { activity: 'Scout', target: '周边区域', priority: 2 },
        { activity: 'Explore', target: '未探明区域', priority: 3 }
      );
    }

    return commands;
  }

  buildPlanPromptWithFrontline(
    request: LLMPlanningRequest,
    frontlineSummary: string,
    revisionFlags: string[],
    narrativeStates?: NarrativeState[],
    economicDigestText?: string
  ): string {
    const parts: string[] = [];

    const tierNum = this.determineTierFromRequest(request);
    const systemPrompt = OntologyBridge.buildSystemPrompt(tierNum);
    parts.push(systemPrompt);
    parts.push('');

    const npcProfile = OntologyBridge.semanticizeNPC({
      name: request.npc_data.name,
      role: request.npc_data.role,
      layer: tierNum,
      clanId: request.npc_data.clan_id,
      nation: request.npc_data.nation,
      realm: request.npc_data.realm,
      hp: 0,
      maxHp: 1,
      anger: 0,
      fear: 0,
      joy: 0,
      hunger: 0,
      fatigue: 0,
      socialDesire: 0,
      energy: 80,
      mood: 60,
      ambition: request.npc_data.personality.ambition,
      caution: request.npc_data.personality.caution,
      loyalty: request.npc_data.personality.loyalty,
      greed: request.npc_data.personality.greed,
      sociability: 50,
      diligence: 50,
      currentActivity: 0,
    });
    const profileText = OntologyBridge.formatSemanticProfileForPrompt(npcProfile);
    parts.push(profileText);

    parts.push('');
    parts.push(`当前战争状态: ${request.world_context.war_active ? '战争进行中' : '和平时期'}`);

    if (frontlineSummary && frontlineSummary.length > 0) {
      parts.push('');
      parts.push(frontlineSummary);
    }

    if (economicDigestText && economicDigestText.length > 0) {
      parts.push('');
      parts.push(economicDigestText);
    }

    // Note: causal chain is built from the digest text, which is already available

    if (narrativeStates && narrativeStates.length > 0) {
      parts.push('');
      parts.push('【前线态势感知】');
      parts.push(LLMPlanningService.composeNarrativeDigest(narrativeStates));
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
    parts.push('请制定战略意图（而非具体命令）：');
    parts.push('- 目标：你希望达成的状态变化（如"削弱X国至50%战力"）');
    parts.push('- 衡量指标：如何判断目标达成（如"X国.fightingStrength"）');
    parts.push('- 目标值：指标应达到的具体数值');
    parts.push('- 失效条件：什么情况下此计划自动作废（如"X国被其他势力灭国"）');
    parts.push('- 建议手段：你可建议一些具体行动，但最终由下属根据战场态势决定');
    parts.push('');
    parts.push(`请基于以上信息，为${request.npc_data.name}制定接下来${request.planning_horizon}的行动规划。`);
    parts.push('请以JSON格式回复，包含intent和suggested_tasks两个字段。');

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

  validateIntent(npcId: string, intent: LLMIntent): IntentValidationResult {
    const factionName = this.extractFactionFromCondition(intent.validity_condition);
    if (factionName && !this.factionExists(factionName)) {
      return {
        status: 'invalidated',
        message: `目标势力${factionName}已不存在，意图自动失效`
      };
    }

    const currentFrame = this.getCurrentFrame();
    const plan = this.activePlans.get(npcId);
    if (plan && intent.deadline_frames > 0) {
      const elapsed = currentFrame - Math.floor(plan.generated_at / 16);
      if (elapsed > intent.deadline_frames) {
        return {
          status: 'timed_out',
          message: `意图已超过截止帧数 ${intent.deadline_frames}`
        };
      }
    }

    return { status: 'active' };
  }

  checkAllActiveIntents(): void {
    for (const [npcId, plan] of this.activePlans.entries()) {
      if (!plan.intent || plan.status !== PlanStatus.ACTIVE) {
        continue;
      }

      const result = this.validateIntent(npcId, plan.intent);

      switch (result.status) {
        case 'invalidated':
          this.interruptPlan(npcId, result.message || '目标已失效');
          plan.decomposed_commands = undefined;
          break;
        case 'completed':
          plan.status = PlanStatus.COMPLETED;
          break;
        case 'timed_out':
          plan.status = PlanStatus.PENDING_REPLAN;
          break;
        case 'active':
        default:
          break;
      }
    }
  }

  registerFaction(factionName: string, exists: boolean): void {
    this.factionRegistry.set(factionName, exists);
  }

  private factionRegistry: Map<string, boolean> = new Map();

  private factionExists(factionName: string): boolean {
    if (!factionName || factionName === 'true') return true;
    if (factionName === 'false') return false;
    return this.factionRegistry.get(factionName) ?? true;
  }

  private extractFactionFromCondition(condition: string): string | null {
    if (!condition || condition === 'true' || condition === 'false') return null;
    const match = condition.match(/^([\u4e00-\u9fa5a-zA-Z_]+)\.exists$/);
    return match ? match[1] : null;
  }

  private getCurrentFrame(): number {
    return Math.floor(Date.now() / 16);
  }

  cleanupExpiredPlans(): void {
    const now = Date.now();
    for (const [npcId, plan] of this.activePlans.entries()) {
      if (plan.expires_at < now) {
        plan.status = PlanStatus.COMPLETED;
      }
    }
  }

  private determineTierFromRequest(request: LLMPlanningRequest): number {
    const role = request.npc_data.role;
    if (role === '家主' || role === 'FamilyHead') return 0;
    if (role === '长老' || role === 'Elder' || role === '执法堂长老' || role === 'LawEnforcementElder') return 1;
    if (role === '核心子弟' || role === 'CoreDisciple') return 2;
    return 3;
  }

  private getCacheKey(request: LLMPlanningRequest): string {
    const memHash = request.world_context.major_events.join(',').length;
    return `${request.npc_id}_${request.planning_horizon}_${request.world_context.war_active}_mem${memHash}`;
  }

  private getCachedPlan(cacheKey: string): LLMPlan | null {
    return null;
  }

  private parseResponse(response: LLMPlanningResponse): LLMPlan {
    const plan: LLMPlan = {
      plan_id: response.plan_id,
      generated_at: Date.now(),
      expires_at: Date.now() + response.horizon_days * 24 * 60 * 60 * 1000,
      tasks: response.sub_tasks,
      current_task_index: 0,
      status: PlanStatus.ACTIVE
    };

    if (response.intent) {
      plan.intent = response.intent;
    } else {
      plan.intent = {
        goal: '执行战略规划',
        metric: 'plan.progress',
        target_value: 100,
        deadline_frames: 10000,
        validity_condition: 'true'
      };
    }

    return plan;
  }
}
