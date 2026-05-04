import { describe, it, expect } from 'vitest';
import { parseFactionDecision } from '../src/server/llm/FactionDecisionParser';

describe('parseFactionDecision', () => {
  // ── Valid JSON with various wrapping ─────────────────────────────

  it('parses clean JSON directly', () => {
    const raw = '{"targetClanId":"clan-001","action":"war","reason":"我方实力远超对方"}';
    const result = parseFactionDecision(raw);
    expect(result).not.toBeNull();
    expect(result!.targetClanId).toBe('clan-001');
    expect(result!.action).toBe('war');
    expect(result!.reason).toBe('我方实力远超对方');
  });

  it('parses JSON inside ```json fences', () => {
    const raw = '```json\n{"targetClanId":"clan-002","action":"alliance","reason":"共同对抗强敌"}\n```';
    const result = parseFactionDecision(raw);
    expect(result).not.toBeNull();
    expect(result!.targetClanId).toBe('clan-002');
    expect(result!.action).toBe('alliance');
  });

  it('parses JSON inside ``` fences (no language tag)', () => {
    const raw = '```\n{"targetClanId":"clan-003","action":"truce","reason":"消耗过大"}\n```';
    const result = parseFactionDecision(raw);
    expect(result).not.toBeNull();
    expect(result!.targetClanId).toBe('clan-003');
    expect(result!.action).toBe('truce');
  });

  it('parses JSON with surrounding explanatory text via brace extraction', () => {
    const raw = '经过分析，我决定：{"targetClanId":"clan-004","action":"none","reason":"暂无威胁"}';
    const result = parseFactionDecision(raw);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('none');
    expect(result!.reason).toBe('暂无威胁');
  });

  // ── 'none' action ───────────────────────────────────────────────

  it('accepts "none" action with empty targetClanId', () => {
    const raw = '{"targetClanId":"","action":"none","reason":"保持中立"}';
    const result = parseFactionDecision(raw);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('none');
    expect(result!.targetClanId).toBe('');
  });

  it('accepts "none" action with missing targetClanId (empty string fallback)', () => {
    // When targetClanId is a non-string for 'none', it becomes ''
    const raw = '{"action":"none","reason":"和平发展"}';
    const result = parseFactionDecision(raw);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('none');
    expect(result!.targetClanId).toBe('');
  });

  // ── Branch: non-'none' action requires targetClanId ─────────────

  it('rejects "war" without targetClanId', () => {
    const raw = '{"action":"war","reason":"征服"}';
    const result = parseFactionDecision(raw);
    expect(result).toBeNull();
  });

  it('rejects "alliance" without targetClanId', () => {
    const raw = '{"action":"alliance","reason":"结盟"}';
    const result = parseFactionDecision(raw);
    expect(result).toBeNull();
  });

  it('rejects "truce" with empty targetClanId', () => {
    const raw = '{"targetClanId":"","action":"truce","reason":"休战"}';
    const result = parseFactionDecision(raw);
    expect(result).toBeNull();
  });

  // ── Branch: invalid action type ─────────────────────────────────

  it('rejects unknown action type', () => {
    const raw = '{"targetClanId":"clan-001","action":"betray","reason":"背叛"}';
    const result = parseFactionDecision(raw);
    expect(result).toBeNull();
  });

  it('rejects missing action field', () => {
    const raw = '{"targetClanId":"clan-001","reason":"test"}';
    const result = parseFactionDecision(raw);
    expect(result).toBeNull();
  });

  it('rejects action as non-string', () => {
    const raw = '{"targetClanId":"clan-001","action":123,"reason":"test"}';
    const result = parseFactionDecision(raw);
    expect(result).toBeNull();
  });

  // ── Branch: non-object input ────────────────────────────────────

  it('returns null for non-JSON input', () => {
    const result = parseFactionDecision('this is not json at all');
    expect(result).toBeNull();
  });

  it('returns null for JSON array', () => {
    const raw = '["war", "clan-001"]';
    const result = parseFactionDecision(raw);
    expect(result).toBeNull();
  });

  it('returns null for JSON null', () => {
    const result = parseFactionDecision('null');
    expect(result).toBeNull();
  });

  // ── Branch: brace counting extraction ───────────────────────────

  it('extracts first JSON object from text with multiple braces — returns null when no action field', () => {
    const raw = '前文：{"nested":{"a":1}}后文';
    const result = parseFactionDecision(raw);
    // Extracts `{"nested":{"a":1}}` which has no action field → null
    expect(result).toBeNull();
  });

  it('handles nested braces inside string values', () => {
    const raw = '{"targetClanId":"clan-005","action":"alliance","reason":"{注意}括号在字符串中"}';
    const result = parseFactionDecision(raw);
    expect(result).not.toBeNull();
    expect(result!.action).toBe('alliance');
    expect(result!.reason).toBe('{注意}括号在字符串中');
  });

  it('returns raw string when no brace found', () => {
    // No braces → extractJSON returns the raw string → JSON.parse fails → null
    const result = parseFactionDecision('hello world');
    expect(result).toBeNull();
  });
});
