/**
 * NPCWorldService — Server-side NPC simulation engine
 *
 * ## Architecture: Dual LLM Pipeline
 *
 * Two independent LLM planning loops coexist:
 *
 * 1. **LLMPlanningScheduler (5s tick)** — Runs in `src/server/game/services/`
 *    - Handles NPC planning requests from the C++ ECS engine
 *    - Uses LLMHttpClient.requestStructured for typed JSON responses
 *    - Plans are consumed by the C++ engine's BehaviorTreeSystem
 *
 * 2. **NPCWorldService.tick / planForNPC** — This file
 *    - Handles NPC planning for the TypeScript-side NPC pool
 *    - Delegates to LLMIntegrationManager.convertPlanToActions for execution
 *    - Plans target NPC movement, resource gathering, trade, combat, etc.
 *
 * Both pipelines share LLMHttpClient for HTTP transport.
 * Delegation path: planForNPC → LLMIntegrationManager → LLMHttpClient
 * No concurrency conflicts exist as they operate on disjoint NPC pools.
 */
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { NPCEntity, NPCRole, RealmLevel, NPCActivity, NPCLifeState, BirthType, EventBus, NPCEvent, NPCInteractionEvent } from '../../shared';
import { PlanAction } from '../llm/PlanParser';
import { NPCMemoryStore } from '../llm/NPCMemory';
import { CommandStatus } from '../../shared/types/LLMPlanning';
import { LLMIntegrationManager } from '../game/services/LLMIntegrationManager';
import { wasmConsumeInteractionEvents, isECSWasmReady } from '../../ecs/ECSWasmLoader';
import { AgentKernelClient } from '../../../agent-kernel/ts-client/src/AgentKernelClient';

export interface RecruitCandidate {
  id: string;
  name: string;
  desc: string;
  trait: string;
  role: string;
  realm: string;
  power: number;
  personality: { ambition: number; caution: number; loyalty: number; benevolence: number };
  background: string;
}

interface NPCSeed {
  id: string;
  name: string;
  role: string;
  realm: string;
  power: number;
  personality: { ambition: number; caution: number; loyalty: number; benevolence: number };
  background: string;
}

interface NPCState {
  npc: NPCEntity;
  activity: string;
  goal: string;
  emotion: string;
  lastPlanTime: number;
  activityUntil: number;
  planQueue: PlanAction[];
  planningNext: boolean;
}

function mapRole(r: string): NPCRole {
  if (r === 'elder') return NPCRole.Elder;
  if (r === 'senior_disciple' || r === 'core_disciple') return NPCRole.CoreDisciple;
  if (r === 'inner_disciple') return NPCRole.InnerDisciple;
  return NPCRole.BranchDisciple; // outer_disciple, etc
}

function mapRealm(r: string): RealmLevel {
  if (r.startsWith('golden_core')) return RealmLevel.GoldenCore;
  if (r.startsWith('foundation_building')) return RealmLevel.FoundationBuilding;
  if (r.startsWith('qi_refining')) return RealmLevel.QiRefining;
  return RealmLevel.Mortal;
}

const AMBIENT_ACTIONS = [
  '在练功房打坐修炼，灵气环绕周身',
  '在后山散步，似乎在思考什么',
  '与同门切磋功法，引来不少人围观',
  '独自一人在藏书阁翻阅古籍',
  '在丹房里整理药材，动作娴熟',
  '站在山门前望着远方发呆',
  '沿着山间小径跑步，汗水淋漓',
  '在瀑布下闭目打坐，任水流冲击',
];

export interface FrontlineMetrics {
    totalNPCs: number;
    casualties: number;
    injured: number;
    tasksCompleted: number;
    tasksFailed: number;
    totalResourcesProduced: number;
    anomalies: string[];
    updatedAt: number;
}

export interface NPCWorldEvent {
  npcId: string;
  npcName: string;
  description: string;
  location: string;
  type: string;
  source?: 'llm' | 'deterministic' | 'llm_fallback';
}

function benevolenceFromGreed(greed: number): number {
  return Math.max(0, Math.min(100, 75 - greed + 25));
}

function computeAffinity(pa: { ambition: number; caution: number; loyalty: number; greed: number },
                         pb: { ambition: number; caution: number; loyalty: number; greed: number }): number {
  const ambitionDiff = -Math.abs(pa.ambition - pb.ambition) * 0.2;
  const cautionSim = (100 - Math.abs(pa.caution - pb.caution)) * 0.15;
  const loyaltySim = (100 - Math.abs(pa.loyalty - pb.loyalty)) * 0.25;
  const aBev = benevolenceFromGreed(pa.greed);
  const bBev = benevolenceFromGreed(pb.greed);
  const benevolenceSim = (100 - Math.abs(aBev - bBev)) * 0.2;
  const variance = Math.floor(Math.random() * 20 - 10);
  return Math.max(-100, Math.min(100, Math.floor(ambitionDiff + cautionSim + loyaltySim + benevolenceSim + variance)));
}

export class NPCWorldService extends EventEmitter {
  private static instance: NPCWorldService;
  private npcs: Map<string, NPCState> = new Map();
  private backgrounds: Map<string, string> = new Map();
  private tickInterval: NodeJS.Timeout | null = null;
  private ambientInterval: NodeJS.Timeout | null = null;
  private llmMode: boolean = true;
  private llmFallback: boolean = false;
  private readonly NPC_INTERACTION_COOLDOWN = 25000;
  private readonly NPC_INTERACTION_DIST = 1;
  /** Buffer of recent interactions for client sync */
  private recentInteractions: NPCInteractionEvent[] = [];
  private readonly MAX_RECENT_INTERACTIONS = 50;
  /** Configurable clan ID pool (replaces hardcoded 'sect_main') */
  private clanIdPool: string[] = [];
  private clanIdIndex: number = 0;
  private factionAffinities: Map<string, Map<string, number>> = new Map();
  private memory!: NPCMemoryStore;

  private frontlineMetrics: FrontlineMetrics = {
    totalNPCs: 0,
    casualties: 0,
    injured: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    totalResourcesProduced: 0,
    anomalies: [],
    updatedAt: 0
  };

  private readonly FRONTLINE_UPDATE_INTERVAL = 30000;

  private maxRumorSpreadsPerFrame: number = 50;
  private rumorSpreadsThisFrame: number = 0;

  /** Optional kernel client for agent tick integration */
  private kernelClient: AgentKernelClient | null = null;
  private kernelConnected: boolean = false;

  private constructor() {
    super();
    this.nextNPCId = 1;
    this.memory = new NPCMemoryStore();
    this.initKernelClient();
  }

  /** Try to connect to the agent-kernel daemon (non-fatal if unavailable). */
  private async initKernelClient(): Promise<void> {
    try {
      const socketPath = process.env.AGENT_KERNEL_SOCKET || '/tmp/agent-kernel.sock';
      this.kernelClient = new AgentKernelClient(socketPath);
      await this.kernelClient.connect();
      this.kernelConnected = true;
      console.log('[NPCWorldService] agent-kernel connected at', socketPath);
    } catch {
      this.kernelConnected = false;
      // Kernel not available — TS fallback pipeline continues as before
    }
  }

  /**
   * Set the pool of clan IDs to assign to seeded NPCs.
   * If not called, falls back to 'sect_main' for backwards compatibility.
   */
  setClanIds(ids: string[]): void {
    this.clanIdPool = [...ids];
    this.clanIdIndex = 0;
  }

  /** Pick the next clan ID from the pool (round-robin), or 'sect_main' if pool empty. */
  private nextClanId(): string {
    if (this.clanIdPool.length === 0) return 'sect_main';
    const id = this.clanIdPool[this.clanIdIndex % this.clanIdPool.length];
    this.clanIdIndex++;
    return id;
  }

  /**
   * Generate a default clan ID pool for a given heaven level.
   * Produces IDs matching the client format: `${heavenLevel}-${country}-${type}[-${index}]`
   * Includes all non-royal clans so NPCs are spread across families.
   */
  generateDefaultClanIds(heavenLevel: number = 9): string[] {
    const countries = ['秦', '楚', '齐', '燕', '赵', '魏', '韩'];
    const ids: string[] = [];
    const familyCount = 16; // default for heaven 9
    const firstCount = Math.floor(familyCount / 4);
    const secondCount = Math.floor(familyCount / 3);
    const thirdCount = familyCount - firstCount - secondCount;

    for (const country of countries) {
      for (let i = 1; i <= firstCount; i++) ids.push(`${heavenLevel}-${country}-1级-${i}`);
      for (let i = 1; i <= secondCount; i++) ids.push(`${heavenLevel}-${country}-2级-${i}`);
      for (let i = 1; i <= thirdCount; i++) ids.push(`${heavenLevel}-${country}-3级-${i}`);
    }
    return ids;
  }

  static getInstance(): NPCWorldService {
    if (!NPCWorldService.instance) {
      NPCWorldService.instance = new NPCWorldService();
    }
    return NPCWorldService.instance;
  }

  initialize(): void {
    this.seedNPCs();
    this.nextNPCId = this.computeNextId();
    console.log(`[NPCWorld] 初始化完成: ${this.npcs.size} 个NPC`);
  }

  start(): void {
    if (this.tickInterval) return;
    this.connectBehaviorFeedback();
    this.scheduleNextTick();
    this.ambientInterval = setInterval(() => this.broadcastAmbient(), 15000);
    console.log('[NPCWorld] 模拟已启动');
  }

  private scheduleNextTick(): void {
    this.tickInterval = setTimeout(async () => {
      try {
        await this.tick();
      } catch (err) {
        console.error('[NPCWorld] Tick error:', err);
      }
      this.scheduleNextTick();
    }, 8000) as unknown as NodeJS.Timeout;
  }

  stop(): void {
    if (this.tickInterval) clearTimeout(this.tickInterval);
    if (this.ambientInterval) clearInterval(this.ambientInterval);
    this.tickInterval = null;
    this.ambientInterval = null;
    if (this.kernelClient) {
      this.kernelClient.disconnect();
      this.kernelConnected = false;
    }
  }

  /**
   * Enable or disable LLM-driven planning (default true).
   * When false, NPCs use fallbackPlan() instead of calling the LLM.
   */
  setLlmMode(enabled: boolean): void {
    this.llmMode = enabled;
  }

  /**
   * Reset all in-memory state for benchmark isolation.
   * Call initialize() afterwards to re-seed NPCs.
   */
  reset(): void {
    this.stop();
    this.npcs.clear();
    this.backgrounds.clear();
    this.nextNPCId = 1;
    this.planningOffset = 0;
    this.llmMode = true;
    this.recentInteractions = [];
    this.factionAffinities = new Map();
    this.rumorSpreadsThisFrame = 0;
    this.frontlineMetrics = {
      totalNPCs: 0,
      casualties: 0,
      injured: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      totalResourcesProduced: 0,
      anomalies: [],
      updatedAt: 0
    };
    this.removeAllListeners('npc:event');
  }

  // --- NPC-to-NPC interaction generation ---

  /** Returns buffered recent interactions and clears the buffer. */
  consumeRecentInteractions(): NPCInteractionEvent[] {
    const events = this.recentInteractions;
    this.recentInteractions = [];
    return events;
  }

  resetRumorCounter(): void {
    this.rumorSpreadsThisFrame = 0;
  }

  canSpreadRumor(): boolean {
    return this.rumorSpreadsThisFrame < this.maxRumorSpreadsPerFrame;
  }

  recordRumorSpread(): void {
    this.rumorSpreadsThisFrame++;
  }

  private handleRumorReachesSubject(npcId: string, rumor: { originalWitness: string; originalEventSlot: number; hopCount: number }): void {
    const state = this.npcs.get(npcId);
    if (!state) return;

    if (state.npc.personality.caution > 70) {
      this.emitEvent(npcId, '试图私下摆平流言...', 'rumor_response');
      this.modifyRelationship(npcId, rumor.originalWitness, -10, 'rumor_suppression');
    } else {
      this.emitEvent(npcId, '暴怒：谁敢造谣？！', 'rumor_response');
      this.modifyRelationship(npcId, rumor.originalWitness, -15, 'rumor_confrontation');
    }
  }

  private seedNPCs(): void {
    let seeds: NPCSeed[] = [];
    try {
      const jsonPath = path.resolve(__dirname, '../../../demos/phase-1b/npcs.json');
      const raw = fs.readFileSync(jsonPath, 'utf8');
      seeds = JSON.parse(raw);
    } catch {
      console.warn('[NPCWorld] Failed to load npcs.json, using built-in 5 NPCs');
      seeds = [
        { id: 'npc_001', name: '林风', role: 'core_disciple', realm: 'foundation_building_mid', power: 900, personality: { ambition: 25, caution: 55, loyalty: 90, benevolence: 70 }, background: '宗门大弟子，掌门最信任的人' },
        { id: 'npc_002', name: '赵焰', role: 'core_disciple', realm: 'foundation_building_low', power: 600, personality: { ambition: 85, caution: 30, loyalty: 40, benevolence: 25 }, background: '天赋异禀，渴望成为掌门' },
        { id: 'npc_003', name: '孙静', role: 'inner_disciple', realm: 'qi_refining_mid', power: 350, personality: { ambition: 35, caution: 90, loyalty: 70, benevolence: 55 }, background: '沉默寡言，观察力极强' },
        { id: 'npc_004', name: '周元', role: 'outer_disciple', realm: 'qi_refining_low', power: 200, personality: { ambition: 20, caution: 40, loyalty: 50, benevolence: 45 }, background: '懒散但实际，有自知之明' },
        { id: 'npc_005', name: '吴霜', role: 'elder', realm: 'golden_core_low', power: 1500, personality: { ambition: 15, caution: 50, loyalty: 85, benevolence: 95 }, background: '仁慈睿智的客卿长老' },
      ];
    }

    for (const s of seeds) {
      const npc: NPCEntity = {
        id: s.id,
        name: s.name,
        clanId: this.nextClanId(),
        nation: '——',
        role: mapRole(s.role),
        realm: mapRealm(s.realm),
        power: s.power || 500,
        hp: (s.power || 500) * 5,
        maxHp: (s.power || 500) * 5,
        mp: (s.power || 500) * 2,
        maxMp: (s.power || 500) * 2,
        activity: NPCActivity.Rest,
        position: { x: 0, y: 0 },
        personality: {
          ambition: s.personality.ambition,
          caution: s.personality.caution,
          loyalty: s.personality.loyalty,
          greed: Math.max(0, Math.min(100, 65 - s.personality.benevolence + 25)),
        },
        birthTime: Date.now(),
        age: 20 + Math.floor(Math.random() * 30),
        birthType: BirthType.Natural,
        layer: 1,
        resources: { spiritStones: 100, items: [], equipment: null, familyContribution: 0 },
        state: NPCLifeState.Active,
      };

      this.npcs.set(s.id, { npc, activity: 'rest', goal: '日常修炼', emotion: '平静', lastPlanTime: 0, activityUntil: Date.now(), planQueue: [], planningNext: false });
      this.backgrounds.set(s.id, s.background);
    }
  }

  getRelationship(idA: string, idB: string): { affinity: number; reason: string } {
    const aff = this.memory.relationships.get(idA, idB);
    const mods = this.memory.relationships.getModifiers(idA, idB);
    return { affinity: aff, reason: mods.length > 0 ? mods[mods.length - 1].reason : '无交集' };
  }

  modifyRelationship(idA: string, idB: string, delta: number, reason: string): void {
    this.memory.relationships.modify(idA, idB, delta, reason);
  }

  getTopRelationships(npcId: string, count = 5): Array<{ id: string; name: string; affinity: number }> {
    return this.memory.relationships.getTopRelationships(npcId, count)
      .map(r => ({ id: r.otherId, name: this.npcs.get(r.otherId)?.npc.name || r.otherId, affinity: r.affinity }));
  }

  setFactionAffinity(clanA: string, clanB: string, affinity: number): void {
    const [c1, c2] = clanA < clanB ? [clanA, clanB] : [clanB, clanA];
    if (!this.factionAffinities.has(c1)) {
      this.factionAffinities.set(c1, new Map());
    }
    const current = this.factionAffinities.get(c1)!.get(c2) || 0;
    const step = current < affinity ? 1 : -1;
    this.factionAffinities.get(c1)!.set(c2, current + step);
  }

  private getFactionAffinity(clanA: string, clanB: string): number {
    if (!clanA || !clanB || clanA === clanB) return 0;
    const [c1, c2] = clanA < clanB ? [clanA, clanB] : [clanB, clanA];
    return this.factionAffinities.get(c1)?.get(c2) || 0;
  }

  private getFactionBiasFloor(npcAId: string, npcBId: string): number {
    const stateA = this.npcs.get(npcAId);
    const stateB = this.npcs.get(npcBId);
    if (!stateA || !stateB) return 0;

    const clanA = stateA.npc.clanId;
    const clanB = stateB.npc.clanId;
    if (!clanA || !clanB) return 0;

    const factionAff = this.getFactionAffinity(clanA, clanB);
    if (factionAff >= 0) return 0;

    return Math.floor(factionAff * 0.25);
  }

  /**
   * V6.2: LLM Micro-Plan hook — called when NPC behavior introspection
   * detects a "stuck" state (all tracked behaviors have low weights).
   * Currently returns a creative fallback; future iterations will call LLM.
   * @returns { activity: string, modifier: string }
   */
  async requestMicroPlan(npcId: string, summary: string): Promise<{ activity: string; modifier: string } | null> {
    const state = this.npcs.get(npcId);
    if (!state) return null;

    const npc = state.npc;
    if (npc.personality.ambition > 60) {
      return { activity: '探索未知区域', modifier: 'high_risk_high_reward' };
    }
    if (npc.personality.caution > 60) {
      return { activity: '尝试冥想打坐', modifier: 'safe_alternative' };
    }
    return { activity: '换个地方走走', modifier: 'change_of_scenery' };
  }

  private collectFrontlineMetrics(now: number): FrontlineMetrics {
    if (now - this.frontlineMetrics.updatedAt < this.FRONTLINE_UPDATE_INTERVAL) {
      return this.frontlineMetrics;
    }

    const metrics: FrontlineMetrics = {
      totalNPCs: this.npcs.size,
      casualties: 0,
      injured: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      totalResourcesProduced: 0,
      anomalies: this.frontlineMetrics.anomalies,
      updatedAt: now
    };

    for (const [, state] of this.npcs) {
      const npc = state.npc;
      if (npc.hp < npc.maxHp * 0.5) metrics.injured++;
      if (npc.state === 'dead') metrics.casualties++;
      if (state.goal === '执行规划' && state.activityUntil > now) {
        metrics.tasksCompleted++;
      }
      if (npc.resources) {
        metrics.totalResourcesProduced += npc.resources.spiritStones || 0;
      }
    }

    this.frontlineMetrics = metrics;
    return metrics;
  }

  buildFrontlineSummary(): string {
    const m = this.frontlineMetrics;
    const lines: string[] = [];
    lines.push('## 前线态势摘要');
    lines.push(`- 总兵力/人口: ${m.totalNPCs}`);
    lines.push(`- 阵亡: ${m.casualties}, 负伤: ${m.injured}`);
    lines.push(`- 任务完成: ${m.tasksCompleted}, 任务失败: ${m.tasksFailed}`);
    lines.push(`- 资源产出: ${m.totalResourcesProduced}灵石`);

    if (m.anomalies && m.anomalies.length > 0) {
      lines.push('- 异常事件:');
      for (const a of m.anomalies) {
        lines.push(`  * ${a}`);
      }
    }

    return lines.join('\n');
  }

  reportAnomaly(description: string): void {
    if (this.frontlineMetrics.anomalies.length < 20) {
      this.frontlineMetrics.anomalies.push(description);
    }
  }

  // --- NPC tick ---

  private readonly PREPLAN_THRESHOLD = 10000;
  private readonly MAX_PLANNING_PER_TICK = 2;
  private planningOffset = 0;

  private async tick(): Promise<void> {
    const now = Date.now();
    this.memory.advanceCacheFrame();
    this.resetRumorCounter();

    // 1) Advance queues — move to next step when current expires
    for (const [, state] of this.npcs) {
      if (state.planQueue.length > 0 && state.activityUntil <= now) {
        this.advanceQueue(state);
      }
    }

    // 1.5) NPC-to-NPC interaction check
    this.syncInteractionEvents(now);

    // 2) Collect frontline metrics for LLM planning feedback
    this.collectFrontlineMetrics(now);

    // 3) Collect planning candidates
    const preplan: string[] = [];
    const idle: string[] = [];

    for (const [id, state] of this.npcs) {
      if (state.planningNext) continue;
      if (state.planQueue.length > 0) {
        // Still has queued steps — pre-plan if near expiry and ≤1 remaining
        if (state.planQueue.length <= 1 && state.activityUntil - now <= this.PREPLAN_THRESHOLD) {
          preplan.push(id);
        }
      } else if (state.activityUntil <= now) {
        idle.push(id);
      }
    }

    // Round-robin: pick candidates starting from planningOffset
    const npcIds = [...this.npcs.keys()];
    const idxMap = new Map(npcIds.map((id, i) => [id, i]));
    const candidates = [...idle, ...preplan];
    candidates.sort((a, b) => ((idxMap.get(a) ?? 0) - this.planningOffset + npcIds.length) % npcIds.length
      - ((idxMap.get(b) ?? 0) - this.planningOffset + npcIds.length) % npcIds.length);
    const toPlan = candidates.slice(0, this.MAX_PLANNING_PER_TICK);
    if (toPlan.length > 0) {
      this.planningOffset = ((idxMap.get(toPlan[toPlan.length - 1]) ?? 0) + 1) % npcIds.length;
    }

    await Promise.all(toPlan.map(async (id) => {
      try {
        const state = this.npcs.get(id);
        if (!state) return;
        state.planningNext = true;
        await this.planForNPC(id, state);
      } catch (err) {
        console.error(`[NPCWorld] Failed to plan ${id}:`, err);
        const state = this.npcs.get(id);
        if (state) state.planningNext = false;
      }
    }));
  }

  private syncInteractionEvents(now: number): void {
    if (!isECSWasmReady()) return;

    const events = wasmConsumeInteractionEvents();
    for (const ev of events) {
      const event: NPCInteractionEvent = {
        id: `interact-cpp-${ev.slotA}-${ev.slotB}-${now}`,
        type: ev.type === 0 ? 'alliance' : ev.type === 1 ? 'trade' : ev.type === 2 ? 'conflict' : 'duel',
        npcIdA: `slot-${ev.slotA}`,
        npcNameA: `NPC#${ev.slotA}`,
        npcIdB: `slot-${ev.slotB}`,
        npcNameB: `NPC#${ev.slotB}`,
        description: `NPC#${ev.slotA} 与 NPC#${ev.slotB} 交互 (type=${ev.type})`,
        position: { x: 0, y: 0 },
        timestamp: now,
      };
      this.recentInteractions.push(event);
      if (this.recentInteractions.length > this.MAX_RECENT_INTERACTIONS) {
        this.recentInteractions.shift();
      }
      this.emit('npc:interaction', event);
    }
  }

  /** Pop expired actions from the queue and start the next one. */
  private advanceQueue(state: NPCState): void {
    if (state.planQueue.length > 0 && state.activityUntil <= Date.now()) {
      state.planQueue.shift();
    }
    if (state.planQueue.length > 0) {
      const next = state.planQueue[0];
      state.activity = next.actionType;
      state.goal = '执行规划';
      state.activityUntil = Date.now() + next.duration * 1000;
      this.emitEvent(state.npc.id, next.reason, next.actionType);
    }
  }

  private async planForNPC(id: string, state: NPCState): Promise<void> {
    // Benchmark mode: skip LLM call and use deterministic fallback
    if (!this.llmMode) {
      state.planQueue = this.fallbackPlan();
      state.planningNext = false;
      this.advanceQueue(state);
      return;
    }

    // Try kernel agentTick first (if connected)
    if (this.kernelConnected && this.kernelClient) {
      try {
        const task = state.goal || `${state.npc.name}的日常活动`;
        const tickResult = await this.kernelClient.agentTick(0, task);
        if (tickResult && tickResult.action) {
          // Map kernel action to PlanAction
          const kernelAction: PlanAction = {
            targetId: 'self',
            actionType: this.mapKernelAction(tickResult.action),
            priority: 8,
            duration: 30,
            reason: tickResult.decision?.reasoning || `内核决策: ${tickResult.action}`,
          };
          state.planQueue = [kernelAction];
          state.goal = `内核决策: ${tickResult.action}`;
          this.advanceQueue(state);
          return;
        }
      } catch (err) {
        // Kernel call failed — fall through to LLM pipeline
        console.debug(`[NPCWorldService] kernel tick failed for ${id}:`, (err as Error).message);
      }
    }

    // Build memory context from NPCMemoryStore (relationships, interactions, witnessed events)
    const nameResolver = (npcId: string) => {
      const s = this.npcs.get(npcId);
      return s ? s.npc.name : npcId;
    };
    // TODO: use NPCMemoryStore from shared instance
    const memoryContext = this.memory?.buildMemoryContext(id, nameResolver) || '';
    // Collect frontline summary for LLM bottom-up feedback
    const frontlineSummary = this.buildFrontlineSummary();
    // Delegate planning to LLMIntegrationManager (single unified pipeline)
    state.planningNext = true;
    const actions = await LLMIntegrationManager.getInstance().triggerAndGetActions(
      id, state.npc, memoryContext, frontlineSummary
    );
    state.planningNext = false;

    if (actions.length > 0) {
      state.planQueue = actions;
      state.goal = '执行规划';
      this.advanceQueue(state);
    } else {
      // LLM plan unavailable — use deterministic fallback
      if (state.planQueue.length === 0) {
        state.planQueue = this.fallbackPlan();
        this.advanceQueue(state);
      }
    }
  }

  /** Map kernel ActionType string to Game PlanAction type. */
  private mapKernelAction(action: string): PlanAction['actionType'] {
    const mapping: Record<string, PlanAction['actionType']> = {
      'executeTask': 'patrol',
      'practiceSkill': 'train',
      'delegate': 'patrol',
      'rest': 'rest',
      'socialize': 'patrol',
      'study': 'train',
      'reflect': 'cultivate',
    };
    return mapping[action] || 'cultivate';
  }

  /** Generate a fallback multi-step plan when LLM fails. */
  private fallbackPlan(): PlanAction[] {
    const types = ['cultivate', 'rest', 'patrol', 'train'] as const;
    const count = 2 + Math.floor(Math.random() * 2);
    const steps: PlanAction[] = [];
    for (let i = 0; i < count; i++) {
      const t = types[Math.floor(Math.random() * types.length)];
      steps.push({
        targetId: 'self',
        actionType: t,
        priority: 10 - i,
        duration: 20 + Math.floor(Math.random() * 30),
        reason: t === 'cultivate' ? '按部就班地完成今日修炼' :
                t === 'rest' ? '休息片刻，恢复精力' :
                t === 'patrol' ? '在宗门内巡视一圈' : '练习基本功',
      });
    }
    return steps;
  }

  private broadcastAmbient(): void {
    const ids = [...this.npcs.keys()];
    // Fisher-Yates shuffle
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const picked = ids.slice(0, 3);
    for (const id of picked) {
      const state = this.npcs.get(id);
      if (!state) continue;
      this.emitEvent(id, AMBIENT_ACTIONS[Math.floor(Math.random() * AMBIENT_ACTIONS.length)], 'ambient');
    }
  }

  // --- Player actions ---

  private nextNPCId: number;

  private computeNextId(): number {
    let max = 0;
    for (const id of this.npcs.keys()) {
      const m = id.match(/^npc_(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return max + 1;
  }

  private readonly RECRUIT_CANDIDATES: RecruitCandidate[] = [
    { id: 'A', name: '李云霄', desc: '筑基初期·剑法天才', trait: '骄傲', role: 'core_disciple', realm: 'foundation_building_low', power: 700, personality: { ambition: 75, caution: 25, loyalty: 30, benevolence: 25 }, background: '剑道奇才，在同辈中罕有敌手' },
    { id: 'B', name: '陈平', desc: '凡人·无修炼基础', trait: '勤恳', role: 'branch_disciple', realm: 'mortal', power: 50, personality: { ambition: 30, caution: 60, loyalty: 85, benevolence: 80 }, background: '出身农家，靠吃苦耐劳获得入宗资格' },
    { id: 'C', name: '白无双', desc: '练气后期·来历神秘', trait: '神秘', role: 'inner_disciple', realm: 'qi_refining_high', power: 400, personality: { ambition: 50, caution: 70, loyalty: 45, benevolence: 55 }, background: '独自一人来到山门前请求入宗，不愿提及过往' },
  ];

  getCandidates(): RecruitCandidate[] {
    return [...this.RECRUIT_CANDIDATES];
  }

  recruit(candidateId: string): boolean {
    const candidate = this.RECRUIT_CANDIDATES.find(c => c.id === candidateId);
    if (!candidate) return false;

    const id = `npc_${String(this.nextNPCId++).padStart(3, '0')}`;

    const npc: NPCEntity = {
      id,
      name: candidate.name,
      clanId: this.nextClanId(),
      nation: '——',
      role: mapRole(candidate.role),
      realm: mapRealm(candidate.realm),
      power: candidate.power,
      hp: candidate.power * 5,
      maxHp: candidate.power * 5,
      mp: candidate.power * 2,
      maxMp: candidate.power * 2,
      activity: NPCActivity.Rest,
      position: { x: 0, y: 0 },
      personality: {
        ambition: candidate.personality.ambition,
        caution: candidate.personality.caution,
        loyalty: candidate.personality.loyalty,
        greed: Math.max(0, Math.min(100, 65 - candidate.personality.benevolence + 25)),
      },
      birthTime: Date.now(),
      age: 18 + Math.floor(Math.random() * 10),
      birthType: BirthType.Wanderer,
      layer: 1,
      resources: { spiritStones: 10, items: [], equipment: null, familyContribution: 0 },
      state: NPCLifeState.Active,
    };

    this.npcs.set(id, { npc, activity: 'rest', goal: '熟悉宗门', emotion: '期待', lastPlanTime: 0, activityUntil: Date.now(), planQueue: [], planningNext: false });
    this.backgrounds.set(id, candidate.background);

    // Build relationships with all existing NPCs
    for (const [existingId, existing] of this.npcs) {
      if (existingId === id) continue;
      const affinity = computeAffinity(npc.personality, existing.npc.personality);
      this.memory.relationships.set(id, existingId, affinity);
      this.memory.relationships.set(existingId, id, affinity);
    }

    this.emitEvent('system', `掌门决定招募「${candidate.name}」——${candidate.desc}，已列入门墙`, 'system');

    // Log the recruit interaction
    this.memory.interactions.add('system', {
      timestamp: Date.now(),
      otherNpcId: id,
      type: 'recruit',
      summary: `招募了${candidate.name}`,
      impactScore: 5,
    });

    // Other NPCs react
    for (const [existingId, state] of this.npcs) {
      if (existingId === id) continue;
      const reacts = [
        `远远看了一眼新来的${candidate.name}，继续做自己的事`,
        `听说来了新人，微微点头`,
        `对宗门的新决定不置可否`,
        `朝新人的方向看了一眼`,
        `主动向${candidate.name}打招呼表示欢迎`,
      ];
      this.emitEvent(existingId, reacts[Math.floor(Math.random() * reacts.length)], 'ambient');
    }
    return true;
  }

  assignTask(npcId: string, task: string): boolean {
    const state = this.npcs.get(npcId);
    if (!state) return false;
    state.activity = 'task';
    state.goal = task;
    state.planQueue = [];
    state.activityUntil = Date.now() + 25000;
    this.emitEvent(npcId, `被掌门指派任务：${task}`, 'order');
    return true;
  }

  promote(npcId: string, action: 'promote' | 'demote'): boolean {
    const state = this.npcs.get(npcId);
    if (!state) return false;
    const label = action === 'promote' ? '提拔' : '贬斥';

    // Apply role change
    const ROLE_LADDER: NPCRole[] = [
      NPCRole.BranchDisciple,
      NPCRole.InnerDisciple,
      NPCRole.CoreDisciple,
      NPCRole.Elder,
      NPCRole.LawEnforcementElder,
    ];
    const idx = ROLE_LADDER.indexOf(state.npc.role);
    if (idx !== -1) {
      const next = idx + (action === 'promote' ? 1 : -1);
      if (next >= 0 && next < ROLE_LADDER.length) {
        state.npc.role = ROLE_LADDER[next];
      }
    }

    this.emitEvent(npcId, `被掌门${label}`, 'status');

    this.memory.interactions.add(npcId, {
      timestamp: Date.now(),
      otherNpcId: 'system',
      type: 'promote',
      summary: `被掌门${label}，现在职位为${state.npc.role}`,
      impactScore: action === 'promote' ? 10 : -10,
    });

    // Others react
    for (const [id, other] of this.npcs) {
      if (id === npcId) continue;
      if (other.npc.personality.ambition > 70 && action === 'promote') {
        this.modifyRelationship(id, npcId, -5, `嫉妒${state.npc.name}被${label}`);
        this.emitEvent(id, `对${state.npc.name}被${label}感到不满`, 'reaction');
      } else if (other.npc.personality.loyalty > 80) {
        this.emitEvent(id, `认为${state.npc.name}被${label}是情理之中`, 'reaction');
      } else if (action === 'demote' && other.npc.personality.caution > 70) {
        this.emitEvent(id, `暗自庆幸被${label}的不是自己`, 'reaction');
      }
    }
    return true;
  }

  ceremony(type: string): void {
    this.emitEvent('system', `掌门举行「${type}」，全宗弟子齐聚一堂`, 'system');
    for (const [id] of this.npcs) {
      this.emitEvent(id, `参加${type}，心情愉悦`, 'morale');
      this.memory.witnessedEvents.add(id, {
        timestamp: Date.now(),
        description: `掌门举行了${type}`,
        involvedNpcIds: [id],
        location: '宗门大殿',
        significance: 3,
      });
    }
  }

  getMemoryStore(): NPCMemoryStore {
    return this.memory;
  }

  getBackground(npcId: string): string | undefined {
    return this.backgrounds.get(npcId);
  }

  /** Subscribe to EventBus NPC behavior events and write results to NPCMemory. */
  connectBehaviorFeedback(): void {
    EventBus.on(NPCEvent.TRADE_COMPLETE, (data: { fromId: string; toId: string; amount: number }) => {
      this.memory.interactions.add(data.fromId, {
        timestamp: Date.now(),
        otherNpcId: data.toId,
        type: 'trade',
        summary: `与${this.npcs.get(data.toId)?.npc.name || data.toId}交易了${data.amount}灵石`,
        impactScore: 2,
      });
      this.memory.interactions.add(data.toId, {
        timestamp: Date.now(),
        otherNpcId: data.fromId,
        type: 'trade',
        summary: `与${this.npcs.get(data.fromId)?.npc.name || data.fromId}交易了${data.amount}灵石`,
        impactScore: 2,
      });
    });

    EventBus.on(NPCEvent.ATTACKED, (data: { targetId: string; attackerId: string; damage: number }) => {
      this.memory.interactions.add(data.attackerId, {
        timestamp: Date.now(),
        otherNpcId: data.targetId,
        type: 'combat',
        summary: `攻击了${this.npcs.get(data.targetId)?.npc.name || data.targetId}，造成${data.damage}伤害`,
        impactScore: 3,
      });
      this.memory.interactions.add(data.targetId, {
        timestamp: Date.now(),
        otherNpcId: data.attackerId,
        type: 'combat',
        summary: `被${this.npcs.get(data.attackerId)?.npc.name || data.attackerId}攻击，受到${data.damage}伤害`,
        impactScore: 5,
      });
      // Worsen relationship between attacker and target
      this.memory.relationships.modify(data.attackerId, data.targetId, -5, 'combat_attack');
    });

    EventBus.on(NPCEvent.DIED, (data: { npcId: string; killerId?: string }) => {
      if (data.killerId) {
        this.memory.interactions.add(data.killerId, {
          timestamp: Date.now(),
          otherNpcId: data.npcId,
          type: 'kill',
          summary: `击杀了${this.npcs.get(data.npcId)?.npc.name || data.npcId}`,
          impactScore: 8,
        });
        this.memory.relationships.modify(data.killerId, data.npcId, -20, 'killed_in_combat');
      }
    });

    EventBus.on(NPCEvent.PATROL_COMPLETE, (data: { npcId: string }) => {
      this.memory.interactions.add(data.npcId, {
        timestamp: Date.now(),
        otherNpcId: data.npcId,
        type: 'patrol',
        summary: '完成了巡逻任务',
        impactScore: 1,
      });
    });
  }

  // --- Queries ---

  getNPC(id: string): NPCState | undefined {
    return this.npcs.get(id);
  }

  getNPCList(): Array<{ id: string; name: string; role: string; activity: string; emotion: string }> {
    return [...this.npcs.values()].map(s => ({
      id: s.npc.id,
      name: s.npc.name,
      role: s.npc.role,
      activity: s.activity,
      emotion: s.emotion,
    }));
  }

  getAllNPCs(): Map<string, NPCState> {
    return this.npcs;
  }

  /** Record a command interaction in the NPC's command memory */
  recordCommandEvent(npcId: string, issuerId: string, commandId: string, result: CommandStatus, emotionTag: string = ''): void {
    if (this.memory) {
      this.memory.updateCommandMemory(npcId, issuerId, commandId, result, emotionTag);
    }
  }

  /** Get command memory influence for an NPC towards an issuer */
  getCommandInfluence(npcId: string, issuerId: string): number {
    return this.memory ? this.memory.getCommandInfluence(npcId, issuerId) : 0;
  }

  // --- Events ---

  private emitEvent(npcId: string, description: string, type: string): void {
    const source: 'llm' | 'deterministic' | 'llm_fallback' = this.llmFallback ? 'llm_fallback' : (this.llmMode ? 'llm' : 'deterministic');
    if (npcId === 'system') {
      this.emit('npc:event', { npcId: 'system', npcName: '宗门', description, location: '宗门大殿', type, source } as NPCWorldEvent);
      return;
    }
    const state = this.npcs.get(npcId);
    if (!state) return;
    this.emit('npc:event', { npcId, npcName: state.npc.name, description, location: '宗门', type, source } as NPCWorldEvent);
  }
}
