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

export type NarrativeActionType = 'cultivate' | 'request' | 'scheme' | 'defect' | 'train';

export interface PlanAction {
  targetId: string;
  actionType: NarrativeActionType;
  priority: number;
  reason: string;
}

export interface ParsedPlan {
  npcId: string;
  goal: string;
  actions: PlanAction[];
  emotionalState: string;
}

const VALID_ACTION_TYPES: Set<string> = new Set([
  'cultivate', 'request', 'scheme', 'defect', 'train',
]);

function isValidActionType(s: unknown): s is NarrativeActionType {
  return typeof s === 'string' && VALID_ACTION_TYPES.has(s);
}

export function parsePlanResponse(json: string): ParsedPlan | null {
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

    actions.push({
      targetId: a.targetId,
      actionType: a.actionType,
      priority: a.priority,
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
