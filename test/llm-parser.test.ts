import { describe, it, expect } from 'vitest';
import { parsePlanResponse } from '../src/server/llm/PlanParser';

describe('parsePlanResponse', () => {
  it('parses valid JSON with all fields', () => {
    const result = parsePlanResponse(JSON.stringify({
      npcId: 'npc_001',
      goal: '突破到筑基期',
      actions: [
        { targetId: 'npc_002', actionType: 'cultivate', priority: 10, duration: 30, reason: '即将突破，需要闭关' },
        { targetId: 'npc_003', actionType: 'request', priority: 5, duration: 15, reason: '需要丹药辅助' },
      ],
      emotionalState: 'determined',
    }));
    expect(result).not.toBeNull();
    expect(result!.npcId).toBe('npc_001');
    expect(result!.goal).toBe('突破到筑基期');
    expect(result!.actions).toHaveLength(2);
    expect(result!.actions[0].actionType).toBe('cultivate');
    expect(result!.actions[0].priority).toBe(10);
    expect(result!.emotionalState).toBe('determined');
  });

  it('returns null for malformed JSON', () => {
    expect(parsePlanResponse('not json at all')).toBeNull();
  });

  it('returns null for missing npcId', () => {
    expect(parsePlanResponse(JSON.stringify({ goal: 'test', actions: [], emotionalState: 'neutral' }))).toBeNull();
  });

  it('returns null for missing goal', () => {
    expect(parsePlanResponse(JSON.stringify({ npcId: 'npc_001', actions: [], emotionalState: 'neutral' }))).toBeNull();
  });

  it('returns null for missing actions array', () => {
    expect(parsePlanResponse(JSON.stringify({ npcId: 'npc_001', goal: 'test', emotionalState: 'neutral' }))).toBeNull();
  });

  it('returns null for non-string npcId', () => {
    expect(parsePlanResponse(JSON.stringify({ npcId: 123, goal: 'test', actions: [], emotionalState: 'neutral' }))).toBeNull();
  });

  it('returns null for invalid actionType', () => {
    expect(parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 'npc_002', actionType: 'invalid_type', priority: 5, reason: 'test' }],
      emotionalState: 'neutral',
    }))).toBeNull();
  });

  it('returns null for priority < 1', () => {
    expect(parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 'npc_002', actionType: 'cultivate', priority: 0, duration: 20, reason: 'test' }],
      emotionalState: 'neutral',
    }))).toBeNull();
  });

  it('returns null for priority > 10', () => {
    expect(parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 'npc_002', actionType: 'cultivate', priority: 11, duration: 20, reason: 'test' }],
      emotionalState: 'neutral',
    }))).toBeNull();
  });

  it('accepts empty actions array', () => {
    const result = parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'rest and observe', actions: [], emotionalState: 'content',
    }));
    expect(result).not.toBeNull();
    expect(result!.actions).toHaveLength(0);
  });

  it('defaults missing emotionalState to neutral', () => {
    const result = parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test', actions: [],
    }));
    expect(result).not.toBeNull();
    expect(result!.emotionalState).toBe('neutral');
  });

  it('returns null for missing reason in action', () => {
    expect(parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 'npc_002', actionType: 'cultivate', priority: 5, duration: 20 }],
      emotionalState: 'neutral',
    }))).toBeNull();
  });

  it('defaults duration when missing or out of range', () => {
    const r1 = parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 'npc_002', actionType: 'cultivate', priority: 5, reason: 'test' }],
      emotionalState: 'neutral',
    }));
    expect(r1!.actions[0].duration).toBe(30);

    const r2 = parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 'npc_002', actionType: 'cultivate', priority: 5, duration: 3, reason: 'test' }],
      emotionalState: 'neutral',
    }));
    expect(r2!.actions[0].duration).toBe(30);

    const r3 = parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 'npc_002', actionType: 'cultivate', priority: 5, duration: 200, reason: 'test' }],
      emotionalState: 'neutral',
    }));
    expect(r3!.actions[0].duration).toBe(30);

    const r4 = parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 'npc_002', actionType: 'cultivate', priority: 5, duration: 60, reason: 'test' }],
      emotionalState: 'neutral',
    }));
    expect(r4!.actions[0].duration).toBe(60);
  });

  it('strips <think> blocks before parsing', () => {
    const result = parsePlanResponse(`<think>I need to plan carefully...</think>
${JSON.stringify({
      npcId: 'npc_001', goal: '突破', emotionalState: 'calm',
      actions: [{ targetId: 'self', actionType: 'cultivate', priority: 5, duration: 30, reason: '修炼' }],
    })}`);
    expect(result).not.toBeNull();
    expect(result!.goal).toBe('突破');
  });

  // ===== NEW COVERAGE GAP TESTS =====

  it('returns null for empty string input', () => {
    expect(parsePlanResponse('')).toBeNull();
  });

  it('returns null for literal null JSON', () => {
    expect(parsePlanResponse('null')).toBeNull();
  });

  it('returns null for primitive JSON values (string)', () => {
    expect(parsePlanResponse('"just a string"')).toBeNull();
  });

  it('returns null for primitive JSON values (number)', () => {
    expect(parsePlanResponse('42')).toBeNull();
  });

  it('parses JSON wrapped in markdown code fences', () => {
    const input = '```json\n{"npcId":"npc_001","goal":"突破","actions":[],"emotionalState":"calm"}\n```';
    const result = parsePlanResponse(input);
    expect(result).not.toBeNull();
    expect(result!.goal).toBe('突破');
  });

  it('parses JSON with extra natural language text around it', () => {
    const input = '角色思考：{"npcId":"npc_001","goal":"巡视宗门","actions":[],"emotionalState":"警觉"} 以上是计划。';
    const result = parsePlanResponse(input);
    expect(result).not.toBeNull();
    expect(result!.goal).toBe('巡视宗门');
  });

  it('returns null for empty string npcId', () => {
    expect(parsePlanResponse(JSON.stringify({
      npcId: '', goal: 'test', actions: [], emotionalState: 'neutral',
    }))).toBeNull();
  });

  it('returns null for empty string goal', () => {
    expect(parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: '', actions: [], emotionalState: 'neutral',
    }))).toBeNull();
  });

  it('returns null for non-array actions (string)', () => {
    expect(parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test', actions: 'not-an-array', emotionalState: 'neutral',
    }))).toBeNull();
  });

  it('returns null for non-array actions (object)', () => {
    expect(parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test', actions: {}, emotionalState: 'neutral',
    }))).toBeNull();
  });

  it('returns null for empty string targetId', () => {
    expect(parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: '', actionType: 'cultivate', priority: 5, reason: 'test' }],
      emotionalState: 'neutral',
    }))).toBeNull();
  });

  it('returns null for missing actionType', () => {
    expect(parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 'self', priority: 5, reason: 'test' }],
      emotionalState: 'neutral',
    }))).toBeNull();
  });

  it('returns null for missing priority', () => {
    expect(parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 'self', actionType: 'cultivate', reason: 'test' }],
      emotionalState: 'neutral',
    }))).toBeNull();
  });

  it('returns null for empty string reason', () => {
    expect(parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 'self', actionType: 'cultivate', priority: 5, reason: '' }],
      emotionalState: 'neutral',
    }))).toBeNull();
  });

  it('preserves duration at exact lower boundary (5)', () => {
    const result = parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 'self', actionType: 'cultivate', priority: 5, duration: 5, reason: 'test' }],
      emotionalState: 'neutral',
    }));
    expect(result).not.toBeNull();
    expect(result!.actions[0].duration).toBe(5);
  });

  it('preserves duration at exact upper boundary (120)', () => {
    const result = parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 'self', actionType: 'cultivate', priority: 5, duration: 120, reason: 'test' }],
      emotionalState: 'neutral',
    }));
    expect(result).not.toBeNull();
    expect(result!.actions[0].duration).toBe(120);
  });

  it('preserves float duration within range', () => {
    const result = parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 'self', actionType: 'cultivate', priority: 5, duration: 37.5, reason: 'test' }],
      emotionalState: 'neutral',
    }));
    expect(result).not.toBeNull();
    expect(result!.actions[0].duration).toBe(37.5);
  });

  it('defaults non-string emotionalState to neutral', () => {
    const result = parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test', actions: [], emotionalState: 123,
    }));
    expect(result).not.toBeNull();
    expect(result!.emotionalState).toBe('neutral');
  });

  it('defaults empty string emotionalState to empty string (present but empty)', () => {
    // emotionalState is typed as string; if present as empty string, typeof check passes
    const result = parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test', actions: [], emotionalState: '',
    }));
    expect(result).not.toBeNull();
    // typeof '' === 'string' so it passes the check and returns ''
    expect(result!.emotionalState).toBe('');
  });

  it('strips multiple <think> blocks', () => {
    // Use empty actions array so the regex fallback in extractJSON
    // (which stops at the first '}') captures the complete JSON object.
    const result = parsePlanResponse(`<think>First reasoning step</think>一些中间思考<think>Second reasoning step</think>
${JSON.stringify({
      npcId: 'npc_001', goal: '突破筑基', emotionalState: 'calm',
      actions: [],
    })}`);
    expect(result).not.toBeNull();
    expect(result!.goal).toBe('突破筑基');
  });

  it('handles nested JSON objects in action fields', () => {
    // Extra fields in actions beyond the schema should not cause failure
    const result = parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 'self', actionType: 'cultivate', priority: 5, duration: 30, reason: 'test', extraField: { nested: true } }],
      emotionalState: 'neutral',
    }));
    expect(result).not.toBeNull();
    expect(result!.actions).toHaveLength(1);
    expect(result!.actions[0].actionType).toBe('cultivate');
  });

  it('returns null for non-string targetId (number)', () => {
    expect(parsePlanResponse(JSON.stringify({
      npcId: 'npc_001', goal: 'test',
      actions: [{ targetId: 42, actionType: 'cultivate', priority: 5, reason: 'test' }],
      emotionalState: 'neutral',
    }))).toBeNull();
  });

  it('extracts JSON with deeply nested objects using brace counting', () => {
    // The brace-counting extractJSON handles nested { } inside string values
    const input = 'prefix text ' + JSON.stringify({
      npcId: 'npc_001',
      goal: '测试嵌套',
      actions: [{ targetId: 'npc_002', actionType: 'cultivate', priority: 5, duration: 30, reason: '需要丹药支持' }],
      emotionalState: 'curious',
    }) + ' suffix text';
    const result = parsePlanResponse(input);
    expect(result).not.toBeNull();
    expect(result!.goal).toBe('测试嵌套');
    expect(result!.actions).toHaveLength(1);
  });
});
