import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { NPCEntity, NPCRole, RealmLevel, NPCActivity, NPCLifeState, BirthType } from '../../shared';
import { PlanAction, VALID_ACTION_TYPES } from '../llm/PlanParser';
import { LLMHttpClient, LLMRequestContext } from '../llm/LLMHttpClient';
import { NPCMemoryStore } from '../llm/NPCMemory';

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

const NPC_SYSTEM_PROMPT = `你是一个修仙世界的NPC角色。基于角色信息、性格、近期经历，输出NPC接下来要做的一系列行动及情绪状态。

输出JSON：{"npcId":"id","goal":"半日内目标","actions":[{"targetId":"self/他人","actionType":"cultivate|request|scheme|patrol|train|rest|socialize","duration":秒数(10-60),"priority":1-10,"reason":"原因"}],"emotionalState":"情绪"}

规则：按priority从高到低依次执行，duration是每个行为的耗时秒数。一次性规划3-5个连续行为，覆盖未来几分钟的行动安排。actionType可选：cultivate,request,scheme,patrol,train,rest,socialize。只输出JSON。`;

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

export interface NPCWorldEvent {
  npcId: string;
  npcName: string;
  description: string;
  location: string;
  type: string;
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
  private memory: NPCMemoryStore;
  private llmClient: LLMHttpClient;
  private tickInterval: NodeJS.Timeout | null = null;
  private ambientInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.memory = new NPCMemoryStore();
    this.llmClient = new LLMHttpClient();
    this.nextNPCId = 1;
  }

  static getInstance(): NPCWorldService {
    if (!NPCWorldService.instance) {
      NPCWorldService.instance = new NPCWorldService();
    }
    return NPCWorldService.instance;
  }

  initialize(): void {
    this.seedNPCs();
    this.initRelationships();
    this.nextNPCId = this.computeNextId();
    console.log(`[NPCWorld] 初始化完成: ${this.npcs.size} 个NPC`);
  }

  start(): void {
    if (this.tickInterval) return;
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
        clanId: 'sect_main',
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

  private initRelationships(): void {
    const ids = [...this.npcs.keys()];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = this.npcs.get(ids[i])!.npc;
        const b = this.npcs.get(ids[j])!.npc;
        const affinity = computeAffinity(a.personality, b.personality);
        this.memory.relationships.set(ids[i], ids[j], affinity);
        this.memory.relationships.set(ids[j], ids[i], affinity);
      }
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

  // --- NPC tick ---

  private readonly PREPLAN_THRESHOLD = 10000;
  private readonly MAX_PLANNING_PER_TICK = 2;
  private planningOffset = 0;

  private async tick(): Promise<void> {
    const now = Date.now();

    // 1) Advance queues — move to next step when current expires
    for (const [, state] of this.npcs) {
      if (state.planQueue.length > 0 && state.activityUntil <= now) {
        this.advanceQueue(state);
      }
    }

    // 2) Collect planning candidates
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
    const memoryCtx = this.memory.buildMemoryContext(id, (otherId) => {
      return this.npcs.get(otherId)?.npc.name || otherId;
    });

    const context: LLMRequestContext = {
      npcId: id,
      npcName: state.npc.name,
      systemPrompt: NPC_SYSTEM_PROMPT,
      userPrompt: [
        '== 角色信息 ==',
        `名字：${state.npc.name}`,
        `身份：${state.npc.role}`,
        `境界：${state.npc.realm}`,
        `性格：野心${state.npc.personality.ambition} 谨慎${state.npc.personality.caution} 忠诚${state.npc.personality.loyalty} 贪婪${state.npc.personality.greed}`,
        `背景：${this.backgrounds.get(id) || '无'}`,
        '',
        memoryCtx || '暂无重点关系。',
        '',
        `请以${state.npc.name}的身份，规划接下来连续3-5个行动，每个行动包含duration（秒数）。`,
      ].join('\n'),
    };

    const result = await this.llmClient.requestPlan(context);
    state.planningNext = false;

    if (!result.success || !result.plan || result.plan.actions.length === 0) {
      if (state.planQueue.length === 0) {
        state.planQueue = this.fallbackPlan();
        this.advanceQueue(state);
      }
      return;
    }

    const plan = result.plan;
    state.goal = plan.goal;
    state.emotion = plan.emotionalState;

    const sorted = plan.actions
      .filter(a => VALID_ACTION_TYPES.has(a.actionType))
      .sort((a, b) => b.priority - a.priority);

    if (sorted.length === 0) {
      if (state.planQueue.length === 0) {
        state.planQueue = this.fallbackPlan();
        this.advanceQueue(state);
      }
      return;
    }

    // Socialize effect on the first new action
    if (sorted[0].actionType === 'socialize') {
      const targets = [...this.npcs.keys()].filter(k => k !== id);
      const t = targets[Math.floor(Math.random() * targets.length)];
      if (t) {
        const delta = Math.floor(Math.random() * 6 + 2);
        this.modifyRelationship(id, t, delta, `${state.npc.name}主动交往`);
        this.memory.interactions.add(id, {
          timestamp: Date.now(),
          otherNpcId: t,
          type: 'socialize',
          summary: `主动与${this.npcs.get(t)?.npc.name || t}交往，关系改善`,
          impactScore: delta,
        });
        const target = this.npcs.get(t);
        if (target) this.emitEvent(t, `与${state.npc.name}的关系改善了`, 'relationship');
      }
    }

    if (state.planQueue.length === 0) {
      // Fresh plan — full queue, start first action immediately
      state.planQueue = sorted;
      this.advanceQueue(state);
    } else {
      // Pre-planning: replace future queue, current action keeps running
      state.planQueue = sorted;
    }
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
      clanId: 'sect_main',
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

  // --- Events ---

  private emitEvent(npcId: string, description: string, type: string): void {
    if (npcId === 'system') {
      this.emit('npc:event', { npcId: 'system', npcName: '宗门', description, location: '宗门大殿', type } as NPCWorldEvent);
      return;
    }
    const state = this.npcs.get(npcId);
    if (!state) return;
    this.emit('npc:event', { npcId, npcName: state.npc.name, description, location: '宗门', type } as NPCWorldEvent);
  }
}
