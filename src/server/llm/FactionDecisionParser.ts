import type { FactionDecision } from './FactionAIPrompts';

/** Strip markdown code fences and extract JSON object from LLM output. */
function extractJSON(raw: string): string {
  let cleaned = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` blocks
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  // Try JSON.parse directly
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // Extract first JSON object via brace counting
    const start = cleaned.indexOf('{');
    if (start < 0) return cleaned;
    let depth = 0;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') {
        depth--;
        if (depth === 0) return cleaned.slice(start, i + 1);
      }
    }
    return cleaned;
  }
}

export function parseFactionDecision(raw: string): FactionDecision | null {
  const json = extractJSON(raw);
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  } catch {
    return null;
  }

  if (!obj || typeof obj !== 'object') return null;

  const o = obj as Record<string, unknown>;

  if (typeof o.action !== 'string') return null;
  const action = o.action as string;
  if (!['war', 'alliance', 'truce', 'none'].includes(action)) return null;

  const targetClanId = typeof o.targetClanId === 'string' ? o.targetClanId : '';
  if (action !== 'none' && !targetClanId) return null;

  const reason = typeof o.reason === 'string' ? o.reason : '';

  return { targetClanId, action: action as FactionDecision['action'], reason };
}
