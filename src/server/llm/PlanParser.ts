// JSON schema from design doc:
// {
//   "npcId": "string",
//   "goal": "string",
//   "actions": [{
//     "targetId": "string",
//     "actionType": "cultivate|request|scheme|defect|train",
//     "priority": 1-10,
//     "reason": "string"
//   }],
//   "emotionalState": "string"
// }

export type NarrativeActionType = 'cultivate' | 'request' | 'scheme' | 'defect' | 'train' | 'socialize' | 'patrol' | 'rest';

export interface PlanAction {
  targetId: string;
  actionType: NarrativeActionType;
  priority: number;
  duration: number;
  reason: string;
}

export interface ParsedPlan {
  npcId: string;
  goal: string;
  actions: PlanAction[];
  emotionalState: string;
}

const VALID_ACTION_TYPES: Set<string> = new Set([
  'cultivate', 'request', 'scheme', 'defect', 'train', 'socialize', 'patrol', 'rest',
]);

function isValidActionType(s: unknown): s is NarrativeActionType {
  return typeof s === 'string' && VALID_ACTION_TYPES.has(s);
}

/**
 * Strip <think> blocks and extract JSON object from LLM output.
 * Many reasoning models wrap JSON in <think> tags or markdown code fences.
 */
function extractJSON(raw: string): string {
  // Strip <think>...</think> blocks
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '');
  // Try JSON.parse directly
  cleaned = cleaned.trim();
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // Extract first JSON object via regex
    const match = cleaned.match(/\{[\s\S]*?\}/);
    if (match) return match[0];
    return cleaned;
  }
}

export function parsePlanResponse(raw: string): ParsedPlan | null {
  const json = extractJSON(raw);
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch {
    console.error('[PARSE] malformed JSON');
    return null;
  }

  if (!obj || typeof obj !== 'object') {
    console.error('[PARSE] response is not an object');
    return null;
  }

  const o = obj as Record<string, unknown>;

  if (typeof o.npcId !== 'string' || o.npcId.length === 0) {
    console.error('[PARSE] missing or invalid npcId');
    return null;
  }

  if (typeof o.goal !== 'string' || o.goal.length === 0) {
    console.error('[PARSE] missing or invalid goal');
    return null;
  }

  if (!Array.isArray(o.actions)) {
    console.error('[PARSE] missing or invalid actions array');
    return null;
  }

  const actions: PlanAction[] = [];
  for (let i = 0; i < o.actions.length; i++) {
    const a = o.actions[i] as Record<string, unknown>;

    if (typeof a.targetId !== 'string' || a.targetId.length === 0) {
      console.error(`[PARSE] action[${i}] missing or invalid targetId`);
      return null;
    }

    if (!isValidActionType(a.actionType)) {
      console.error(`[PARSE] action[${i}] invalid actionType: ${a.actionType}`);
      return null;
    }

    if (typeof a.priority !== 'number' || a.priority < 1 || a.priority > 10) {
      console.error(`[PARSE] action[${i}] invalid priority: ${a.priority}`);
      return null;
    }

    if (typeof a.reason !== 'string' || a.reason.length === 0) {
      console.error(`[PARSE] action[${i}] missing or invalid reason`);
      return null;
    }

    const duration = typeof a.duration === 'number' && a.duration >= 5 && a.duration <= 120
      ? a.duration
      : 30;

    actions.push({
      targetId: a.targetId,
      actionType: a.actionType,
      priority: a.priority,
      duration,
      reason: a.reason,
    });
  }

  const emotionalState = typeof o.emotionalState === 'string'
    ? o.emotionalState
    : 'neutral';

  return {
    npcId: o.npcId,
    goal: o.goal,
    actions,
    emotionalState,
  };
}
