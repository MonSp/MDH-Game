/**
 * LLM vs Deterministic NPC Behavior Benchmark
 *
 * Runs NPCWorldService in two modes (LLM / deterministic) with the same
 * NPC seeds and player actions, collects chronicle events, scores them
 * against a 3-dimension rubric, and prints a structured comparison report.
 *
 * Usage: npx tsx test/llm-deterministic-benchmark.ts
 *
 * Environment: LLM_API_KEY, LLM_BASE_URL, LLM_MODEL (for LLM phase)
 */

import seedrandom from 'seedrandom';
import {
  NPCWorldService,
  NPCWorldEvent,
} from '../src/server/services/NPCWorldService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEED = 'llm-vs-det-benchmark-20260430';
const PHASE_DURATION_MS = 5 * 60 * 1000; // 5 minutes per phase
const WARMUP_MS = 60 * 1000; // 1 minute warmup (events excluded)
const TICK_INTERVAL_MS = 8000;
const API_LATENCY_WARN_THRESHOLD_MS = 10_000;

const CANDIDATE_IDS = ['A', 'B'];

// Seed the RNG before any phase — save original for teardown
let _origRandom: (() => number) | null = null;

function seedRng(): void {
  if (!_origRandom) _origRandom = Math.random;
  Math.random = seedrandom(SEED) as unknown as () => number;
}

function restoreRng(): void {
  if (_origRandom) Math.random = _origRandom;
}

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

interface CollectedEvent {
  npcId: string;
  npcName: string;
  description: string;
  type: string;
  source: string;
  timestamp: number;
}

interface PhaseResult {
  mode: string;
  events: CollectedEvent[];
  planCount: number;
  actionFailures: number;
}

interface EventScore {
  npcReference: number;   // 0, 0.5, 1.0
  specificGoal: number;   // 0, 1.0
  emotionalRange: number; // 0, 0.5, 1.0
  total: number;          // sum of the three
}

// ---------------------------------------------------------------------------
// Rubric keywords
// ---------------------------------------------------------------------------

const NPC_ROLE_KEYWORDS = [
  'elder', 'core_disciple', 'inner_disciple', 'branch_disciple',
  '弟子', '掌门', '长老', '师兄', '师弟', '师姐', '师妹', '同门',
];

const EMOTION_KEYWORDS = [
  '嫉妒', '不满', '高兴', '愤怒', '感激', '得意', '怨恨',
  '敬佩', '羡慕', '后悔', '暗喜', '庆幸', '不满', '欣慰',
  '焦虑', '不安', '激动', '羞愧', '委屈', '恼火',
];

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function scoreEvent(event: CollectedEvent): EventScore {
  const desc = event.description;

  // NPC reference
  let npcReference = 0;
  for (const kw of NPC_ROLE_KEYWORDS) {
    if (desc.includes(kw)) {
      npcReference = 0.5;
      break;
    }
  }
  // Check for Chinese names (2-3 character words that aren't known keywords)
  // If the description mentions another NPC by name, score 1.0
  // We approximate: if the event type is socialize or scheme, it likely names someone
  if (event.type === 'socialize' || event.type === 'scheme' || event.type === 'request') {
    npcReference = 1.0;
  }

  // Specific goal — generic activities have no specific reason
  const GENERIC_REASONS = [
    '按部就班地完成今日修炼',
    '休息片刻，恢复精力',
    '在宗门内巡视一圈',
    '练习基本功',
  ];
  let specificGoal = 1.0;
  for (const gr of GENERIC_REASONS) {
    if (desc === gr) {
      specificGoal = 0;
      break;
    }
  }
  // "cultivate/rest/patrol/train" describe generic activity types
  if (specificGoal !== 0 && (event.type === 'cultivate' || event.type === 'rest' || event.type === 'patrol' || event.type === 'train')) {
    // Check if the description says more than just the action name
    if (desc.length < 15) {
      specificGoal = 0;
    }
  }

  // Emotional range
  let emotionalRange = 0;
  for (const ek of EMOTION_KEYWORDS) {
    if (desc.includes(ek)) {
      emotionalRange = 1.0;
      break;
    }
  }
  // Implied emotion
  if (emotionalRange === 0) {
    const IMPLIED_EMOTION_PATTERNS = [
      '感到', '感觉', '暗自', '不满', '庆幸', '不愿',
    ];
    for (const ip of IMPLIED_EMOTION_PATTERNS) {
      if (desc.includes(ip)) {
        emotionalRange = 0.5;
        break;
      }
    }
  }

  return { npcReference, specificGoal, emotionalRange, total: npcReference + specificGoal + emotionalRange };
}

// ---------------------------------------------------------------------------
// Benchmark runner
// ---------------------------------------------------------------------------

async function runPhase(
  modeName: string,
  useLlm: boolean,
): Promise<PhaseResult> {
  const svc = NPCWorldService.getInstance();

  svc.setLlmMode(useLlm);

  svc.initialize();
  svc.start();

  const collected: CollectedEvent[] = [];
  let warmupEnd = 0;
  let planCount = 0;
  let actionFailures = 0;

  const onEvent = (event: NPCWorldEvent) => {
    // Skip events during warmup
    if (warmupEnd === 0 || Date.now() < warmupEnd) return;
    // Track action events (one plan may produce multiple events)
    if (event.type === 'cultivate' || event.type === 'rest' ||
        event.type === 'patrol' || event.type === 'train' ||
        event.type === 'socialize' || event.type === 'scheme' ||
        event.type === 'request') {
      planCount++;
    }
    collected.push({
      npcId: event.npcId,
      npcName: event.npcName,
      description: event.description,
      type: event.type,
      source: event.source || (useLlm ? 'llm' : 'deterministic'),
      timestamp: event.timestamp || Date.now(),
    });
  };

  svc.on('npc:event', onEvent);

  try {
    // Warmup
    warmupEnd = Date.now() + WARMUP_MS;
    await sleep(WARMUP_MS);

    // Execute fixed player actions
    const npcs = svc.getNPCList();
    const firstNpcId = npcs.length > 0 ? npcs[0].id : '';

    // Schedule player actions
    const actions: Array<{ fn: () => boolean | void; timeMs: number }> = [
      { fn: () => svc.recruit(CANDIDATE_IDS[0]), timeMs: 0 },
      { fn: () => firstNpcId ? svc.promote(firstNpcId, 'promote') : false, timeMs: 60_000 },
      { fn: () => firstNpcId ? svc.promote(firstNpcId, 'demote') : false, timeMs: 120_000 },
      { fn: () => svc.ceremony('拜月仪式'), timeMs: 180_000 },
      { fn: () => svc.recruit(CANDIDATE_IDS[1]), timeMs: 240_000 },
    ];

    const startTime = Date.now();
    for (const action of actions) {
      const delay = action.timeMs - (Date.now() - startTime);
      if (delay > 0) await sleep(delay);
      try {
        const result = action.fn();
        if (result === false) actionFailures++;
      } catch {
        actionFailures++;
      }
    }

    // Wait for remaining time
    const elapsed = Date.now() - startTime;
    const remaining = PHASE_DURATION_MS - elapsed;
    if (remaining > 0) await sleep(remaining);
  } finally {
    // Stop and cleanup
    svc.stop();
    svc.removeListener('npc:event', onEvent);
  }

  return { mode: modeName, events: collected, planCount, actionFailures };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printReport(llm: PhaseResult, det: PhaseResult): void {
  const scoreEvents = (events: CollectedEvent[]) => events.map(scoreEvent);
  const llmScores = scoreEvents(llm.events);
  const detScores = scoreEvents(det.events);

  const llmInteresting = llmScores.filter(s => s.total >= 2.0).length;
  const detInteresting = detScores.filter(s => s.total >= 2.0).length;
  const llmAvg = llmScores.length > 0 ? llmScores.reduce((a, s) => a + s.total, 0) / llmScores.length : 0;
  const detAvg = detScores.length > 0 ? detScores.reduce((a, s) => a + s.total, 0) / detScores.length : 0;

  const fmtPct = (v: number) => (v > 0 ? `+${Math.round(v)}%` : `${Math.round(v)}%`);
  const deltaInteresting = llmScores.length > 0 && detScores.length > 0
    ? fmtPct(((llmInteresting / llmScores.length) - (detInteresting / detScores.length)) * 100)
    : 'N/A';
  const deltaAvg = llmAvg > 0 && detAvg > 0
    ? fmtPct(((llmAvg - detAvg) / detAvg) * 100)
    : 'N/A';

  console.log(`
=== LLM vs Deterministic Benchmark Report ===
Date: ${new Date().toISOString()}
NPC source: demos/phase-1b/npcs.json
Phase duration: ${PHASE_DURATION_MS / 1000}s per mode
Warmup: ${WARMUP_MS / 1000}s
Scoring: NPC Reference (0-1) | Specific Goal (0-1) | Emotional Range (0-1)
Interesting threshold: total >= 2.0
Seeded RNG: ${SEED}

=== Collection Stats ===
Metric                   | LLM    | DET
Events collected         | ${String(llm.events.length).padEnd(6)} | ${String(det.events.length).padEnd(6)}
Action events captured  | ${String(llm.planCount).padEnd(6)} | ${String(det.planCount).padEnd(6)}
Player action failures   | ${String(llm.actionFailures).padEnd(6)} | ${String(det.actionFailures).padEnd(6)}

=== Aggregate Scores ===
Metric                   | LLM    | DET    | Delta
Interesting moments (≥2) | ${String(llmInteresting).padEnd(6)} | ${String(detInteresting).padEnd(6)} | ${deltaInteresting}
Average event score      | ${llmAvg.toFixed(2).padEnd(6)} | ${detAvg.toFixed(2).padEnd(6)} | ${deltaAvg}
Event count              | ${String(llmScores.length).padEnd(6)} | ${String(detScores.length).padEnd(6)} |

=== Score Distribution ===
Score range   | LLM    | DET
2.5-3.0       | ${String(llmScores.filter(s => s.total >= 2.5).length).padEnd(6)} | ${String(detScores.filter(s => s.total >= 2.5).length).padEnd(6)}
2.0-2.5       | ${String(llmScores.filter(s => s.total >= 2.0 && s.total < 2.5).length).padEnd(6)} | ${String(detScores.filter(s => s.total >= 2.0 && s.total < 2.5).length).padEnd(6)}
1.0-2.0       | ${String(llmScores.filter(s => s.total >= 1.0 && s.total < 2.0).length).padEnd(6)} | ${String(detScores.filter(s => s.total >= 1.0 && s.total < 2.0).length).padEnd(6)}
0.0-1.0       | ${String(llmScores.filter(s => s.total < 1.0).length).padEnd(6)} | ${String(detScores.filter(s => s.total < 1.0).length).padEnd(6)}
`);

  // Top 5 LLM events
  const topLlm = llmScores.map((s, i) => ({ score: s.total, event: llm.events[i] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  console.log('=== Top LLM Events ===');
  for (const t of topLlm) {
    if (t.score > 0) console.log(`  Score ${t.score.toFixed(1)}: "${t.event.description}" (${t.event.type})`);
  }

  // Top 5 DET events
  const topDet = detScores.map((s, i) => ({ score: s.total, event: det.events[i] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  console.log('\n=== Top DET Events ===');
  for (const t of topDet) {
    if (t.score > 0) console.log(`  Score ${t.score.toFixed(1)}: "${t.event.description}" (${t.event.type})`);
  }

  // Verdict
  console.log('\n=== Verdict ===');
  if (llm.events.length < 20 || det.events.length < 20) {
    console.log('  [WARNING] Insufficient data — minimum 20 events per mode required.');
    console.log('  Verdict: Insufficient data');
    return;
  }

  const llmPct = llmInteresting / llmScores.length;
  const detPct = detInteresting / detScores.length;
  const ratio = llmPct / detPct;

  if (ratio >= 1.5) {
    console.log(`  LLM produces ${Math.round((ratio - 1) * 100)}% more interesting narrative moments than deterministic.`);
    console.log('  Verdict: LLM clearly justified — AI NPC thesis validated.');
  } else if (ratio >= 1.2) {
    console.log(`  LLM produces ${Math.round((ratio - 1) * 100)}% more interesting narrative moments than deterministic.`);
    console.log('  Verdict: LLM likely justified — moderate improvement, review example events.');
  } else if (ratio >= 1.0) {
    console.log(`  LLM produces ${Math.round((ratio - 1) * 100)}% more interesting narrative moments than deterministic.`);
    console.log('  Verdict: Inconclusive — difference too small to justify LLM cost/latency.');
  } else {
    console.log('  Deterministic produces equal or more interesting moments than LLM.');
    console.log('  Verdict: Deterministic is sufficient — LLM adds no narrative value.');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('LLM vs Deterministic NPC Behavior Benchmark');
  console.log('============================================\n');

  const svc = NPCWorldService.getInstance();

  try {
    // Phase 1: LLM mode
    console.log(`Phase 1: LLM mode (${PHASE_DURATION_MS / 1000}s + ${WARMUP_MS / 1000}s warmup)...`);
    seedRng();
    svc.reset();
    const llmResult = await runPhase('LLM', true);
    console.log(`  Collected ${llmResult.events.length} events, ${llmResult.planCount} action events\n`);

    // Phase 2: Deterministic mode
    console.log(`Phase 2: Deterministic mode (${PHASE_DURATION_MS / 1000}s + ${WARMUP_MS / 1000}s warmup)...`);
    seedRng(); // Same seed for reproducibility
    svc.reset();
    const detResult = await runPhase('DETERMINISTIC', false);
    console.log(`  Collected ${detResult.events.length} events, ${detResult.planCount} action events\n`);

    // Report
    printReport(llmResult, detResult);
  } finally {
    restoreRng();
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
