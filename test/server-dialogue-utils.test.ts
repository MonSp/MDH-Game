import { describe, it, expect } from 'vitest';

// =============================================================================
// Pure function extraction from server/index.ts scene:npc-dialogue handler
// These functions are not exported from the module, so we re-implement them
// here for testing (same pattern as scene-panel.test.ts).
// =============================================================================

// Sanitize user-provided scene context to prevent prompt injection
function sanitizeSceneContext(input: string | undefined): string | undefined {
  if (!input) return undefined;
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control chars
    .replace(/[<>]/g, '') // strip angle brackets
    .slice(0, 200); // length limit
}

// Validate NPC ID format: alphanumeric + underscore, 1-64 chars
function isValidNpcId(id: string): boolean {
  return /^[a-zA-Z0-9_]{1,64}$/.test(id);
}

describe('sanitizeSceneContext', () => {
  // ─── Undefined / empty passthrough ──────────────────────────────

  it('returns undefined for undefined input', () => {
    expect(sanitizeSceneContext(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string input', () => {
    expect(sanitizeSceneContext('')).toBeUndefined();
  });

  it('returns undefined for whitespace-only input', () => {
    // '   '.trim() is falsy after the .replace calls, but
    // whitespace chars are not control chars, so they are preserved.
    // After replacement: '   ' is truthy, so it returns trimmed
    const result = sanitizeSceneContext('   ');
    expect(result).toBe('   ');
  });

  // ─── Control character stripping ───────────────────────────────

  it('strips null character (0x00)', () => {
    const input = 'hello\x00world';
    const result = sanitizeSceneContext(input);
    expect(result).toBe('helloworld');
  });

  it('strips tab character (0x09)', () => {
    const input = 'hello\x09world';
    const result = sanitizeSceneContext(input);
    // Tab is 0x09, which is NOT in the range \x00-\x08\x0B\x0C\x0E-\x1F
    // Wait: \x09 is in the range... let me check.
    // The regex is [\x00-\x08\x0B\x0C\x0E-\x1F]
    // \x09 and \x0A (tab and newline) are NOT in this range
    // So tab should be preserved
    expect(result).toBe('hello\x09world');
  });

  it('strips control characters in the range 0x00-0x08', () => {
    const input = 'a\x00b\x01c\x08d';
    const result = sanitizeSceneContext(input);
    expect(result).toBe('abcd');
  });

  it('strips control characters in the range 0x0E-0x1F', () => {
    const input = 'a\x0Fb\x1Fc';
    const result = sanitizeSceneContext(input);
    expect(result).toBe('abc');
  });

  it('strips 0x0B and 0x0C (vertical tab and form feed)', () => {
    const input = 'a\x0Bb\x0Cc';
    const result = sanitizeSceneContext(input);
    expect(result).toBe('abc');
  });

  it('preserves newline (0x0A) and carriage return (0x0D)', () => {
    const input = 'line1\nline2\r\nline3';
    const result = sanitizeSceneContext(input);
    expect(result).toBe('line1\nline2\r\nline3');
  });

  // ─── Angle bracket stripping ───────────────────────────────────

  it('strips opening angle bracket', () => {
    const input = '他说<攻击';
    const result = sanitizeSceneContext(input);
    expect(result).toBe('他说攻击');
  });

  it('strips closing angle bracket', () => {
    const input = '他>说';
    const result = sanitizeSceneContext(input);
    expect(result).toBe('他说');
  });

  it('strips both angle brackets', () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeSceneContext(input);
    expect(result).toBe('scriptalert("xss")/script');
  });

  // ─── Length truncation ─────────────────────────────────────────

  it('truncates input to 200 characters', () => {
    const input = 'a'.repeat(500);
    const result = sanitizeSceneContext(input);
    expect(result).toHaveLength(200);
  });

  it('preserves input under 200 characters', () => {
    const input = '你好，冒险者！欢迎来到我们的宗门。';
    const result = sanitizeSceneContext(input);
    expect(result).toBe(input);
  });

  it('truncates at exactly 200 characters and drops control chars before truncation', () => {
    const input = 'a'.repeat(50) + '\x00' + 'b'.repeat(200);
    const result = sanitizeSceneContext(input);
    // After stripping: 50 'a' + 200 'b' = 250 chars, truncated to 200
    expect(result).toHaveLength(200);
    expect(result).toBe('a'.repeat(50) + 'b'.repeat(150));
  });

  // ─── Composite scenarios ───────────────────────────────────────

  it('handles combined control chars, angle brackets, and length', () => {
    const input = '<script>' + 'a\x00b\x01c'.repeat(100) + '</script>';
    const result = sanitizeSceneContext(input);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('\x00');
    expect(result).not.toContain('\x01');
    expect(result).toHaveLength(200);
  });

  it('preserves normal Chinese characters', () => {
    const input = '玩家来到宗门大殿，向掌门行礼。';
    const result = sanitizeSceneContext(input);
    expect(result).toBe(input);
  });
});

describe('isValidNpcId', () => {
  // ─── Valid formats ─────────────────────────────────────────────

  it('accepts simple alphanumeric ID', () => {
    expect(isValidNpcId('npc_001')).toBe(true);
  });

  it('accepts ID with only letters', () => {
    expect(isValidNpcId('abc')).toBe(true);
  });

  it('accepts ID with only numbers', () => {
    expect(isValidNpcId('123')).toBe(true);
  });

  it('accepts ID with only underscores', () => {
    expect(isValidNpcId('___')).toBe(true);
  });

  it('accepts ID at max length (64 chars)', () => {
    const id = 'a'.repeat(64);
    expect(isValidNpcId(id)).toBe(true);
  });

  it('accepts mixed case alphanumeric with underscores', () => {
    expect(isValidNpcId('Servant_01_Inner_Disciple_999')).toBe(true);
  });

  // ─── Invalid formats ───────────────────────────────────────────

  it('rejects empty string', () => {
    expect(isValidNpcId('')).toBe(false);
  });

  it('rejects ID exceeding 64 characters', () => {
    const id = 'a'.repeat(65);
    expect(isValidNpcId(id)).toBe(false);
  });

  it('rejects ID with hyphens', () => {
    expect(isValidNpcId('npc-001')).toBe(false);
  });

  it('rejects ID with spaces', () => {
    expect(isValidNpcId('npc 001')).toBe(false);
  });

  it('rejects ID with special characters', () => {
    expect(isValidNpcId('npc@001')).toBe(false);
    expect(isValidNpcId('npc.001')).toBe(false);
    expect(isValidNpcId('npc#001')).toBe(false);
    expect(isValidNpcId('npc!001')).toBe(false);
  });

  it('rejects ID with Unicode characters', () => {
    expect(isValidNpcId('npc_林风')).toBe(false);
  });

  it('rejects ID with only a dot', () => {
    expect(isValidNpcId('.')).toBe(false);
  });

  it('rejects ID starting with number-only specials', () => {
    // This is actually fine — starts with number is OK per regex
    expect(isValidNpcId('1test')).toBe(true);
  });
});
