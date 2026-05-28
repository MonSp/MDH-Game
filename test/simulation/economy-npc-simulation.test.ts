import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NPCWorldService } from '../../src/server/services/NPCWorldService';
import { EconomyService, ItemService, MarketService } from '../../src/server/services/EconomyService';
import { BehaviorTree, BehaviorExecutor } from '../../src/server/services/NPCService';
import { ResourceManager } from '../../src/server/services/ResourceService';
import {
  NPCEntity, NPCRole, RealmLevel, NPCActivity, BirthType, NPCLifeState,
  EventBus, NPCEvent, EconomyEvent, CurrencyType
} from '../../src/shared';

const SIM_TICKS = 200;
const TICK_INTERVAL_MS = 100;
const SIM_NPC_COUNT = 20;

interface SimAgent {
  npc: NPCEntity;
  executor: BehaviorExecutor;
  currentActivity: string;
  activityHistory: string[];
  stoneHistory: number[];
}

interface EconomySnapshot {
  tick: number;
  timestamp: number;
  totalSpiritStones: number;
  avgSpiritStones: number;
  maxSpiritStones: number;
  minSpiritStones: number;
  transactionCount: number;
}

interface NPCSnapshot {
  tick: number;
  timestamp: number;
  totalNpcs: number;
  activityDistribution: Record<string, number>;
  avgHp: number;
  avgMp: number;
  avgPower: number;
  aliveCount: number;
  deadCount: number;
  avgAffinity: number;
  totalResources: number;
}

interface SimulationReport {
  totalTicks: number;
  durationMs: number;
  economySnapshots: EconomySnapshot[];
  npcSnapshots: NPCSnapshot[];
  anomalies: string[];
  events: { type: string; count: number }[];
  finalState: {
    npcs: Array<{ id: string; name: string; role: string; activity: string; hp: number; spiritStones: number }>;
    relationships: Array<{ a: string; b: string; affinity: number }>;
  };
}

const SIM_NAMES = [
  '林风', '赵焰', '孙静', '周元', '吴霜', '李云霄', '陈平', '白无双',
  '张天明', '刘灵儿', '王玄武', '黄药师', '杨过客', '韩冰心', '秦无极',
  '楚狂人', '燕飞雪', '魏长风', '齐天翔', '郑逍遥',
];

function createSimNPC(index: number): NPCEntity {
  const roles = [NPCRole.BranchDisciple, NPCRole.InnerDisciple, NPCRole.CoreDisciple, NPCRole.Elder];
  const realms = [RealmLevel.Mortal, RealmLevel.QiRefining, RealmLevel.FoundationBuilding, RealmLevel.GoldenCore];
  const nations = ['秦', '楚', '齐', '燕', '赵', '魏', '韩'];
  const roleIdx = index % roles.length;
  const realmIdx = index % realms.length;
  const power = 50 + (index * 37) % 500;

  return {
    id: `sim_npc_${String(index).padStart(3, '0')}`,
    name: SIM_NAMES[index % SIM_NAMES.length],
    clanId: `clan_${index % 4}`,
    nation: nations[index % nations.length],
    role: roles[roleIdx],
    realm: realms[realmIdx],
    power,
    hp: power * 5,
    maxHp: power * 5,
    mp: power * 2,
    maxMp: power * 2,
    personality: {
      ambition: (index * 13 + 20) % 100,
      caution: (index * 7 + 30) % 100,
      loyalty: (index * 11 + 40) % 100,
      greed: (index * 17 + 10) % 100,
    },
    activity: NPCActivity.Rest,
    position: { x: (index * 17) % 100, y: (index * 23) % 100 },
    birthTime: Date.now(),
    age: 20 + (index * 3) % 80,
    birthType: BirthType.Natural,
    layer: 9,
    resources: {
      spiritStones: 50 + (index * 31) % 200,
      items: [],
      equipment: null,
      familyContribution: 0,
    },
    state: NPCLifeState.Active,
  };
}

describe('经济系统与NPC系统 — 后台模拟测试', () => {
  let svc: NPCWorldService;
  let economySvc: EconomyService;
  let agents: SimAgent[] = [];
  const report: SimulationReport = {
    totalTicks: 0,
    durationMs: 0,
    economySnapshots: [],
    npcSnapshots: [],
    anomalies: [],
    events: [],
    finalState: { npcs: [], relationships: [] },
  };
  const eventCounts: Map<string, number> = new Map();

  beforeAll(() => {
    svc = NPCWorldService.getInstance();
    svc.stop();
    svc.reset();
    svc.setLlmMode(false);
    svc.initialize();

    economySvc = EconomyService.getInstance();

    const rm = ResourceManager.getInstance();
    rm.initialize(200, 200, 0);

    agents = [];
    for (let i = 0; i < SIM_NPC_COUNT; i++) {
      const npc = createSimNPC(i);
      const executor = new BehaviorExecutor(npc);
      agents.push({ npc, executor, currentActivity: 'rest', activityHistory: [], stoneHistory: [] });
    }

    EventBus.on(NPCEvent.ACTIVITY_CHANGED, (data: any) => {
      const agent = agents.find(a => a.npc.id === data.npcId);
      if (agent) agent.currentActivity = data.activity;
    });
    EventBus.on(NPCEvent.STATE_CHANGED, () => incEvent('NPC_STATE_CHANGED'));
    EventBus.on(NPCEvent.DIED, () => incEvent('NPC_DIED'));
    EventBus.on(NPCEvent.BIRTH, () => incEvent('NPC_BIRTH'));
    EventBus.on(NPCEvent.TRADE_COMPLETE, () => incEvent('TRADE_COMPLETE'));
    EventBus.on(NPCEvent.PATROL_START, () => incEvent('PATROL_START'));
    EventBus.on(NPCEvent.PATROL_COMPLETE, () => incEvent('PATROL_COMPLETE'));
    EventBus.on(EconomyEvent.CURRENCY_CHANGED, () => incEvent('CURRENCY_CHANGED'));
    EventBus.on(EconomyEvent.PURCHASE_COMPLETED, () => incEvent('PURCHASE_COMPLETED'));
    EventBus.on(EconomyEvent.SALE_COMPLETED, () => incEvent('SALE_COMPLETED'));

    function incEvent(type: string) {
      eventCounts.set(type, (eventCounts.get(type) || 0) + 1);
    }
  });

  afterAll(() => {
    svc.stop();
    svc.reset();
  });

  it('模拟运行 — 执行多轮tick并采集快照', () => {
    const startTime = Date.now();
    const svcNpcs = svc.getNPCList();

    for (let tick = 0; tick < SIM_TICKS; tick++) {
      const now = Date.now();

      const npcSnapshot = captureSimNPCSnapshot(tick, now);
      report.npcSnapshots.push(npcSnapshot);

      if (tick % 10 === 0) {
        const econSnapshot = captureEconomySnapshot(tick, now);
        report.economySnapshots.push(econSnapshot);
      }

      for (const agent of agents) {
        agent.executor.update(TICK_INTERVAL_MS);
        agent.activityHistory.push(agent.currentActivity);
        agent.stoneHistory.push(agent.npc.resources.spiritStones);
      }

      if (tick % 20 === 0 && svcNpcs.length > 0) {
        const idxA = Math.floor((tick * 7) % svcNpcs.length);
        const idxB = (idxA + 1) % svcNpcs.length;
        svc.modifyRelationship(svcNpcs[idxA].id, svcNpcs[idxB].id,
          ((tick % 20) - 10), `tick_${tick}_interaction`);
      }

      if (tick % 30 === 0) {
        for (const agent of agents) {
          economySvc.addCurrency(agent.npc.id, CurrencyType.SpiritStone, 5);
        }
      }

      checkAnomalies(tick);
    }

    report.totalTicks = SIM_TICKS;
    report.durationMs = Date.now() - startTime;
    report.events = Array.from(eventCounts.entries()).map(([type, count]) => ({ type, count }));

    report.finalState.npcs = agents.map(a => ({
      id: a.npc.id,
      name: a.npc.name,
      role: a.npc.role,
      activity: a.currentActivity,
      hp: a.npc.hp,
      spiritStones: a.npc.resources.spiritStones,
    }));

    const svcIds = svcNpcs.map(n => n.id);
    for (let i = 0; i < Math.min(svcIds.length, 5); i++) {
      for (let j = i + 1; j < Math.min(svcIds.length, 5); j++) {
        const rel = svc.getRelationship(svcIds[i], svcIds[j]);
        report.finalState.relationships.push({
          a: svcIds[i],
          b: svcIds[j],
          affinity: rel.affinity,
        });
      }
    }

    printReport(report);

    expect(report.totalTicks).toBe(SIM_TICKS);
    expect(report.npcSnapshots.length).toBe(SIM_TICKS);
    expect(report.economySnapshots.length).toBeGreaterThan(0);
    expect(report.anomalies.length).toBe(0);
  });

  it('验证NPC行为分布合理性', () => {
    const lastSnapshot = report.npcSnapshots[report.npcSnapshots.length - 1];
    expect(lastSnapshot).toBeDefined();

    const total = Object.values(lastSnapshot.activityDistribution).reduce((a, b) => a + b, 0);
    expect(total).toBe(SIM_NPC_COUNT);

    const restRatio = (lastSnapshot.activityDistribution['rest'] || 0) / total;
    expect(restRatio).toBeLessThan(0.95);
  });

  it('验证行为多样性 — 至少出现3种不同行为', () => {
    const lastSnapshot = report.npcSnapshots[report.npcSnapshots.length - 1];
    const uniqueActivities = Object.keys(lastSnapshot.activityDistribution).length;
    expect(uniqueActivities).toBeGreaterThanOrEqual(3);
  });

  it('验证经济指标稳定性', () => {
    expect(report.economySnapshots.length).toBeGreaterThan(1);

    const first = report.economySnapshots[0];
    const last = report.economySnapshots[report.economySnapshots.length - 1];

    expect(last.totalSpiritStones).not.toBeNaN();
    expect(last.avgSpiritStones).not.toBeNaN();
    expect(last.maxSpiritStones).toBeGreaterThanOrEqual(0);
    expect(last.minSpiritStones).toBeGreaterThanOrEqual(0);
  });

  it('验证灵石总量有变化（经济活跃）', () => {
    const first = report.economySnapshots[0];
    const last = report.economySnapshots[report.economySnapshots.length - 1];

    expect(last.totalSpiritStones).not.toBe(first.totalSpiritStones);
  });

  it('验证NPC资源变化追踪', () => {
    const firstSnap = report.npcSnapshots[0];
    const lastSnap = report.npcSnapshots[report.npcSnapshots.length - 1];

    expect(lastSnap.totalResources).toBeDefined();
    expect(typeof lastSnap.totalResources).toBe('number');
    expect(lastSnap.totalResources).not.toBe(firstSnap.totalResources);
  });

  it('验证关系系统正常运作', () => {
    expect(report.finalState.relationships.length).toBeGreaterThan(0);

    for (const rel of report.finalState.relationships) {
      expect(rel.affinity).toBeGreaterThanOrEqual(-100);
      expect(rel.affinity).toBeLessThanOrEqual(100);
    }
  });

  it('验证无异常事件发生', () => {
    if (report.anomalies.length > 0) {
      console.warn('检测到异常:', report.anomalies);
    }
    expect(report.anomalies.length).toBe(0);
  });

  it('验证NPC行为惯性 — 行为不应每帧都变', () => {
    let stableAgentCount = 0;
    for (const agent of agents) {
      const history = agent.activityHistory;
      let consecutiveSame = 0;
      for (let i = 1; i < history.length; i++) {
        if (history[i] === history[i - 1]) consecutiveSame++;
      }
      if (consecutiveSame > history.length * 0.05) stableAgentCount++;
    }
    expect(stableAgentCount).toBeGreaterThan(0);
  });

  function captureSimNPCSnapshot(tick: number, timestamp: number): NPCSnapshot {
    const activityDist: Record<string, number> = {};
    let totalHp = 0;
    let totalMp = 0;
    let totalPower = 0;
    let aliveCount = 0;
    let deadCount = 0;
    let totalResources = 0;

    for (const agent of agents) {
      const npc = agent.npc;
      const act = agent.currentActivity;
      activityDist[act] = (activityDist[act] || 0) + 1;

      totalHp += npc.hp;
      totalMp += npc.mp;
      totalPower += npc.power;

      if (npc.state === NPCLifeState.Dead) {
        deadCount++;
      } else {
        aliveCount++;
      }

      totalResources += npc.resources?.spiritStones || 0;
    }

    const svcNpcs = svc.getNPCList();
    let totalAffinity = 0;
    let affinityCount = 0;
    const svcIds = svcNpcs.map(n => n.id);
    for (let i = 0; i < svcIds.length; i++) {
      for (let j = i + 1; j < Math.min(svcIds.length, i + 6); j++) {
        const rel = svc.getRelationship(svcIds[i], svcIds[j]);
        totalAffinity += rel.affinity;
        affinityCount++;
      }
    }

    const count = agents.length || 1;
    return {
      tick,
      timestamp,
      totalNpcs: agents.length,
      activityDistribution: activityDist,
      avgHp: totalHp / count,
      avgMp: totalMp / count,
      avgPower: totalPower / count,
      aliveCount,
      deadCount,
      avgAffinity: affinityCount > 0 ? totalAffinity / affinityCount : 0,
      totalResources,
    };
  }

  function captureEconomySnapshot(tick: number, timestamp: number): EconomySnapshot {
    let totalStones = 0;
    let maxStones = 0;
    let minStones = Infinity;
    let count = 0;

    for (const agent of agents) {
      const stones = agent.npc.resources?.spiritStones || 0;
      totalStones += stones;
      maxStones = Math.max(maxStones, stones);
      minStones = Math.min(minStones, stones);
      count++;
    }

    return {
      tick,
      timestamp,
      totalSpiritStones: totalStones,
      avgSpiritStones: count > 0 ? totalStones / count : 0,
      maxSpiritStones: maxStones,
      minSpiritStones: minStones === Infinity ? 0 : minStones,
      transactionCount: eventCounts.get('CURRENCY_CHANGED') || 0,
    };
  }

  function checkAnomalies(tick: number): void {
    for (const agent of agents) {
      const npc = agent.npc;
      if (npc.hp < 0) {
        report.anomalies.push(`[Tick ${tick}] NPC ${npc.id} HP为负: ${npc.hp}`);
      }
      if (npc.resources?.spiritStones !== undefined && npc.resources.spiritStones < 0) {
        report.anomalies.push(`[Tick ${tick}] NPC ${npc.id} 灵石为负: ${npc.resources.spiritStones}`);
      }
      if (!isFinite(npc.hp) || !isFinite(npc.mp)) {
        report.anomalies.push(`[Tick ${tick}] NPC ${npc.id} 属性值异常 (Infinity/NaN)`);
      }
    }
  }

  function printReport(r: SimulationReport): void {
    console.log('\n========================================');
    console.log('  经济系统与NPC系统 — 模拟测试报告');
    console.log('========================================');
    console.log(`总模拟轮次: ${r.totalTicks}`);
    console.log(`总耗时: ${r.durationMs}ms`);
    console.log(`模拟NPC数: ${SIM_NPC_COUNT}`);
    console.log('');

    console.log('--- NPC 最终状态 (前10) ---');
    for (const npc of r.finalState.npcs.slice(0, 10)) {
      console.log(`  ${npc.name} (${npc.id}) | ${npc.role} | 行为: ${npc.activity} | HP: ${npc.hp} | 灵石: ${npc.spiritStones}`);
    }
    console.log('');

    console.log('--- 关系快照 (前5对) ---');
    for (const rel of r.finalState.relationships.slice(0, 5)) {
      console.log(`  ${rel.a} <-> ${rel.b}: 亲密度 ${rel.affinity}`);
    }
    console.log('');

    console.log('--- 经济快照 (每10轮) ---');
    for (const snap of r.economySnapshots.slice(0, 3)) {
      console.log(`  Tick ${snap.tick}: 总灵石=${snap.totalSpiritStones}, 均值=${snap.avgSpiritStones.toFixed(1)}, 最大=${snap.maxSpiritStones}, 最小=${snap.minSpiritStones}`);
    }
    if (r.economySnapshots.length > 3) {
      const last = r.economySnapshots[r.economySnapshots.length - 1];
      console.log(`  ... (省略 ${r.economySnapshots.length - 3} 条) ...`);
      console.log(`  Tick ${last.tick}: 总灵石=${last.totalSpiritStones}, 均值=${last.avgSpiritStones.toFixed(1)}, 最大=${last.maxSpiritStones}, 最小=${last.minSpiritStones}`);
    }
    console.log('');

    console.log('--- NPC行为分布趋势 ---');
    const first50 = r.npcSnapshots[49];
    const mid100 = r.npcSnapshots[99];
    const last = r.npcSnapshots[r.npcSnapshots.length - 1];
    if (first50) console.log(`  Tick 50:  ${JSON.stringify(first50.activityDistribution)}`);
    if (mid100) console.log(`  Tick 100: ${JSON.stringify(mid100.activityDistribution)}`);
    if (last) console.log(`  Tick ${last.tick}: ${JSON.stringify(last.activityDistribution)}`);
    console.log('');

    console.log('--- 事件统计 ---');
    for (const evt of r.events) {
      console.log(`  ${evt.type}: ${evt.count} 次`);
    }
    console.log('');

    if (r.anomalies.length > 0) {
      console.log('--- 异常 ---');
      for (const a of r.anomalies) {
        console.log(`  ⚠ ${a}`);
      }
    } else {
      console.log('✓ 无异常检测');
    }
    console.log('========================================\n');
  }
});
