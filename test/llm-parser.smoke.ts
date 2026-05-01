import { parsePlanResponse } from '../src/server/llm/PlanParser';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
    console.log(`  PASS: ${label}`);
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

// Valid JSON with all fields
const valid = parsePlanResponse(JSON.stringify({
  npcId: 'npc_001',
  goal: '突破到筑基期',
  actions: [
    { targetId: 'npc_002', actionType: 'cultivate', priority: 10, reason: '即将突破，需要闭关' },
    { targetId: 'npc_003', actionType: 'request', priority: 5, reason: '需要丹药辅助' },
  ],
  emotionalState: 'determined',
}));
assert(valid !== null, 'valid JSON should parse');
assert(valid!.npcId === 'npc_001', 'npcId should match');
assert(valid!.goal === '突破到筑基期', 'goal should match');
assert(valid!.actions.length === 2, 'should have 2 actions');
assert(valid!.actions[0].actionType === 'cultivate', 'first action should be cultivate');
assert(valid!.actions[0].priority === 10, 'first action priority should be 10');
assert(valid!.emotionalState === 'determined', 'emotionalState should match');

// Malformed JSON
const malformed = parsePlanResponse('not json at all');
assert(malformed === null, 'malformed JSON should return null');

// Missing npcId
const missingNpcId = parsePlanResponse(JSON.stringify({
  goal: 'test',
  actions: [],
  emotionalState: 'neutral',
}));
assert(missingNpcId === null, 'missing npcId should return null');

// Missing goal
const missingGoal = parsePlanResponse(JSON.stringify({
  npcId: 'npc_001',
  actions: [],
  emotionalState: 'neutral',
}));
assert(missingGoal === null, 'missing goal should return null');

// Missing actions array
const missingActions = parsePlanResponse(JSON.stringify({
  npcId: 'npc_001',
  goal: 'test',
  emotionalState: 'neutral',
}));
assert(missingActions === null, 'missing actions array should return null');

// Wrong type for npcId
const wrongNpcId = parsePlanResponse(JSON.stringify({
  npcId: 123,
  goal: 'test',
  actions: [],
  emotionalState: 'neutral',
}));
assert(wrongNpcId === null, 'non-string npcId should return null');

// Invalid actionType
const invalidActionType = parsePlanResponse(JSON.stringify({
  npcId: 'npc_001',
  goal: 'test',
  actions: [
    { targetId: 'npc_002', actionType: 'invalid_type', priority: 5, reason: 'test' },
  ],
  emotionalState: 'neutral',
}));
assert(invalidActionType === null, 'invalid actionType should return null');

// Priority out of range
const priorityLow = parsePlanResponse(JSON.stringify({
  npcId: 'npc_001',
  goal: 'test',
  actions: [
    { targetId: 'npc_002', actionType: 'cultivate', priority: 0, reason: 'test' },
  ],
  emotionalState: 'neutral',
}));
assert(priorityLow === null, 'priority < 1 should return null');

// Empty actions array (valid edge case)
const emptyActions = parsePlanResponse(JSON.stringify({
  npcId: 'npc_001',
  goal: 'rest and observe',
  actions: [],
  emotionalState: 'content',
}));
assert(emptyActions !== null, 'empty actions array should be valid');
assert(emptyActions!.actions.length === 0, 'actions should be empty');

// Missing emotionalState (should default to neutral)
const missingEmotional = parsePlanResponse(JSON.stringify({
  npcId: 'npc_001',
  goal: 'test',
  actions: [],
}));
assert(missingEmotional !== null, 'missing emotionalState should default');
assert(missingEmotional!.emotionalState === 'neutral', 'default emotionalState should be neutral');

// Missing reason in action
const missingReason = parsePlanResponse(JSON.stringify({
  npcId: 'npc_001',
  goal: 'test',
  actions: [
    { targetId: 'npc_002', actionType: 'cultivate', priority: 5 },
  ],
}));
assert(missingReason === null, 'missing reason should return null');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
