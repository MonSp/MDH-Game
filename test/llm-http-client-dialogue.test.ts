import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LLMHttpClient } from '../src/server/llm/LLMHttpClient';
import type { DialogueRequestContext } from '../src/server/llm/LLMHttpClient';

// Mock LLMLogger to prevent file system writes during tests
vi.mock('../src/server/llm/LLMLogger', () => ({
  logLLMCall: vi.fn(),
}));

// Helper to reset the LLMHttpClient singleton between tests
function resetLLMClientInstance() {
  (LLMHttpClient as any).instance = null;
}

const dialogueContext: DialogueRequestContext = {
  npcId: 'test_npc_001',
  npcName: '林风',
  systemPrompt: '你是一个修仙世界的NPC角色，你叫林风，是宗门大弟子。',
  userPrompt: '玩家张三前来找你交谈。请以林风的身份说一段话。',
};

// Helper to create a successful mock fetch for OpenAI-compatible provider
function mockOpenAISuccess(text: string, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({
      choices: [{ message: { content: text } }],
    }),
    text: async () => text,
  });
}

// Helper for Gemini-style response
function mockGeminiSuccess(text: string, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
    text: async () => text,
  });
}

// Helper for API error
function mockAPIError(status: number, errorText: string) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: async () => errorText,
    json: async () => ({}),
  });
}

// Helper for network error
function mockNetworkError(message = 'Network error') {
  global.fetch = vi.fn().mockRejectedValue(new Error(message));
}

describe('LLMHttpClient.requestDialogue', () => {
  beforeEach(() => {
    resetLLMClientInstance();
    vi.clearAllMocks();
    process.env.LLM_BASE_URL = 'http://test-llm.local/v1';
    process.env.LLM_API_KEY = 'test-key';
    process.env.LLM_MODEL = 'test-model';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_MODEL;
  });

  // ─── Success path ───────────────────────────────────────────────

  it('returns success result with Chinese text for OpenAI-compatible provider', async () => {
    const chineseText = '你好，冒险者！欢迎来到我们的宗门。我是林风，有什么可以帮助你的吗？';
    mockOpenAISuccess(chineseText);

    const client = LLMHttpClient.getInstance();
    const result = await client.requestDialogue(dialogueContext);

    expect(result.success).toBe(true);
    expect(result.text).toBe(chineseText);
    expect(result.error).toBeNull();
    expect(result.fallback).toBe(false);
    expect(result.retries).toBe(0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('sends correct request body to the OpenAI-compatible endpoint', async () => {
    const chineseText = '你好，冒险者！需要我帮忙吗？';
    mockOpenAISuccess(chineseText);

    const client = LLMHttpClient.getInstance();
    await client.requestDialogue(dialogueContext);

    // Verify fetch was called with correct URL and body
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCall = (global.fetch as any).mock.calls[0];
    const url = fetchCall[0];
    const body = JSON.parse(fetchCall[1].body);

    expect(url).toContain('/chat/completions');
    expect(body.model).toBe('test-model');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toBe(dialogueContext.systemPrompt);
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[1].content).toBe(dialogueContext.userPrompt);
    expect(body.temperature).toBe(0.9);
    expect(body.max_tokens).toBe(400);
  });

  it('includes Authorization header when apiKey is set', async () => {
    mockOpenAISuccess('你好，冒险者！');

    const client = LLMHttpClient.getInstance();
    await client.requestDialogue(dialogueContext);

    const headers = (global.fetch as any).mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer test-key');
  });

  it('truncates response to MAX_RESPONSE_LENGTH (1000 chars)', async () => {
    // Generate Chinese text longer than 1000 chars
    const longText = '你好'.repeat(600); // 1200 chars
    mockOpenAISuccess(longText);

    const client = LLMHttpClient.getInstance();
    const result = await client.requestDialogue(dialogueContext);

    expect(result.success).toBe(true);
    expect(result.text!.length).toBeLessThanOrEqual(1000);
    expect(result.text).toBe(longText.slice(0, 1000));
  });

  // ─── Gemini provider path ──────────────────────────────────────

  it('sends Gemini-format request when provider is gemini', async () => {
    // Force the provider to 'gemini' after construction
    mockGeminiSuccess('你好，冒险者！我是林风。');

    const client = LLMHttpClient.getInstance();
    (client as any).config.provider = 'gemini';
    (client as any).config.endpoint = 'https://generativelanguage.googleapis.com/v1beta/models';
    (client as any).config.model = 'gemini-2.0-flash';

    await client.requestDialogue(dialogueContext);

    // Verify Gemini URL format
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const url = (global.fetch as any).mock.calls[0][0];
    expect(url).toContain(':generateContent');
  });

  it('includes X-Goog-Api-Key header for Gemini', async () => {
    mockGeminiSuccess('你好，冒险者！');

    const client = LLMHttpClient.getInstance();
    (client as any).config.provider = 'gemini';
    (client as any).config.endpoint = 'https://generativelanguage.googleapis.com/v1beta/models';
    (client as any).config.model = 'gemini-2.0-flash';
    (client as any).config.apiKey = 'gemini-key';

    await client.requestDialogue(dialogueContext);

    const headers = (global.fetch as any).mock.calls[0][1].headers;
    expect(headers['X-Goog-Api-Key']).toBe('gemini-key');
  });

  // ─── Fallback cooldown ─────────────────────────────────────────

  it('returns fallback immediately when NPC is in fallback cooldown', async () => {
    const client = LLMHttpClient.getInstance();

    // Manually set a future cooldown for this NPC
    (client as any).fallbackUntil.set('test_npc_001', Date.now() + 60000);

    const result = await client.requestDialogue(dialogueContext);

    expect(result.success).toBe(false);
    expect(result.text).toBeNull();
    expect(result.error).toBe('NPC in fallback cooldown');
    expect(result.fallback).toBe(true);
    expect(result.retries).toBe(0);
    expect(result.latencyMs).toBe(0);
    // Should NOT have called fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('evicts expired fallback and allows new requests', async () => {
    mockOpenAISuccess('你好，冒险者！现在可以对话了。');

    const client = LLMHttpClient.getInstance();

    // Set an expired cooldown (in the past)
    (client as any).fallbackUntil.set('test_npc_001', Date.now() - 1000);

    // Should NOT be blocked — expired cooldown is evicted
    const result = await client.requestDialogue(dialogueContext);

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalled();
  });

  // ─── Chinese validation fail ───────────────────────────────────

  it('returns fallback when response contains no Chinese characters', async () => {
    const englishText = 'Hello traveler! Welcome to our sect.';
    mockOpenAISuccess(englishText);

    const client = LLMHttpClient.getInstance();
    const result = await client.requestDialogue(dialogueContext);

    expect(result.success).toBe(false);
    expect(result.text).toBeNull();
    expect(result.error).toBe('Response contains no Chinese characters');
    expect(result.fallback).toBe(true);
    expect(result.retries).toBe(0); // Fails on first attempt, no retry
  });

  // ─── API error paths ──────────────────────────────────────────

  it('retries on API HTTP error and eventually returns fallback', async () => {
    vi.useFakeTimers();
    try {
      mockAPIError(500, 'Internal Server Error');

      const client = LLMHttpClient.getInstance();
      const resultPromise = client.requestDialogue(dialogueContext);

      // Advance through retry backoffs: initial fail + 2 retries
      // First retry: ~6000ms, Second retry: ~12000ms
      // Max total jitter: ~20000ms + some buffer
      await vi.advanceTimersByTimeAsync(30000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(true);
      // Should have been called for initial + 2 retries
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result.retries).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('retries on network error and eventually returns fallback', async () => {
    vi.useFakeTimers();
    try {
      mockNetworkError('Connection refused');

      const client = LLMHttpClient.getInstance();
      const resultPromise = client.requestDialogue(dialogueContext);

      await vi.advanceTimersByTimeAsync(30000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('sets fallback cooldown after all retries exhausted', async () => {
    vi.useFakeTimers();
    try {
      mockNetworkError('Connection refused');

      const client = LLMHttpClient.getInstance();
      const resultPromise = client.requestDialogue(dialogueContext);

      await vi.advanceTimersByTimeAsync(30000);
      await resultPromise;

      // Verify fallbackUntil has a future cooldown
      const cooldownUntil = (client as any).fallbackUntil.get('test_npc_001');
      expect(cooldownUntil).toBeDefined();
      expect(cooldownUntil).toBeGreaterThan(Date.now());
    } finally {
      vi.useRealTimers();
    }
  });

  it('handles rate limit (429) errors with retry', async () => {
    vi.useFakeTimers();
    try {
      mockAPIError(429, 'Too Many Requests');

      const client = LLMHttpClient.getInstance();
      const resultPromise = client.requestDialogue(dialogueContext);

      await vi.advanceTimersByTimeAsync(30000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  // ─── Empty response ──────────────────────────────────────────

  it('throws error when API response has no choices', async () => {
    vi.useFakeTimers();
    try {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [] }),
        text: async () => '',
      });

      const client = LLMHttpClient.getInstance();
      const resultPromise = client.requestDialogue(dialogueContext);

      await vi.advanceTimersByTimeAsync(30000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('throws error when API response returns null content', async () => {
    vi.useFakeTimers();
    try {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: null } }] }),
        text: async () => '',
      });

      const client = LLMHttpClient.getInstance();
      const resultPromise = client.requestDialogue(dialogueContext);

      await vi.advanceTimersByTimeAsync(30000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  // ─── clearFallback / isInFallback ─────────────────────────────

  it('clearFallback removes NPC from fallback cooldown', () => {
    const client = LLMHttpClient.getInstance();
    (client as any).fallbackUntil.set('test_npc_001', Date.now() + 60000);

    expect(client.isInFallback('test_npc_001')).toBe(true);

    client.clearFallback('test_npc_001');

    expect(client.isInFallback('test_npc_001')).toBe(false);
  });

  it('isInFallback returns false for NPC not in cooldown', () => {
    const client = LLMHttpClient.getInstance();
    expect(client.isInFallback('nonexistent')).toBe(false);
  });

  it('isInFallback returns false for expired cooldown', () => {
    const client = LLMHttpClient.getInstance();
    (client as any).fallbackUntil.set('test_npc_001', Date.now() - 1000);

    expect(client.isInFallback('test_npc_001')).toBe(false);
  });

  // ─── Edge cases ──────────────────────────────────────────────

  it('evictExpiredFallbacks removes expired entries', () => {
    const client = LLMHttpClient.getInstance();
    (client as any).fallbackUntil.set('expired_npc', Date.now() - 5000);
    (client as any).fallbackUntil.set('active_npc', Date.now() + 60000);

    (client as any).evictExpiredFallbacks();

    expect((client as any).fallbackUntil.has('expired_npc')).toBe(false);
    expect((client as any).fallbackUntil.has('active_npc')).toBe(true);
  });

  it('handles concurrent NPCs independently — one in cooldown does not affect another', async () => {
    mockOpenAISuccess('你好！我是另一个NPC。');

    const client = LLMHttpClient.getInstance();

    // Put npc_001 in cooldown
    (client as any).fallbackUntil.set('test_npc_001', Date.now() + 60000);

    // But npc_002 should be able to make requests
    const ctx2: DialogueRequestContext = {
      ...dialogueContext,
      npcId: 'test_npc_002',
      npcName: '赵焰',
    };

    const result = await client.requestDialogue(ctx2);

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('succeeds on first retry after initial failure', async () => {
    vi.useFakeTimers();
    try {
      // First call fails, second succeeds
      const chineseText = '第二次终于成功了！你好，冒险者。';

      global.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ choices: [{ message: { content: chineseText } }] }),
          text: async () => chineseText,
        });

      const client = LLMHttpClient.getInstance();
      const resultPromise = client.requestDialogue(dialogueContext);

      // Advance past the first retry delay
      await vi.advanceTimersByTimeAsync(10000);

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.text).toBe(chineseText);
      expect(result.retries).toBe(1); // One retry succeeded
      expect(global.fetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ─── requestStructured ─────────────────────────────────────────

describe('LLMHttpClient.requestStructured', () => {
  type TestResult = { value: number; label: string };

  const structuredContext = {
    npcId: 'faction_test_001',
    npcName: '青云宗',
    systemPrompt: '你是一个决策系统。输出JSON格式。',
    userPrompt: '请决定行动。',
  };

  beforeEach(() => {
    resetLLMClientInstance();
    vi.clearAllMocks();
    process.env.LLM_BASE_URL = 'http://test-llm.local/v1';
    process.env.LLM_API_KEY = 'test-key';
    process.env.LLM_MODEL = 'test-model';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_MODEL;
  });

  it('returns structured result on valid response', async () => {
    mockOpenAISuccess('{"value":42,"label":"测试结果"}');

    const client = LLMHttpClient.getInstance();
    const result = await client.requestStructured<TestResult>(
      structuredContext,
      0.7,
      400,
      'TestStructured',
      (text) => {
        try {
          const obj = JSON.parse(text);
          if (typeof obj.value === 'number' && typeof obj.label === 'string') {
            return { ok: true, result: obj as TestResult };
          }
          return { ok: false, result: null as unknown as TestResult, error: 'Invalid shape' };
        } catch {
          return { ok: false, result: null as unknown as TestResult, error: 'Parse error' };
        }
      },
    );

    expect(result.success).toBe(true);
    expect(result.result).not.toBeNull();
    expect(result.result!.value).toBe(42);
    expect(result.result!.label).toBe('测试结果');
    expect(result.error).toBeNull();
    expect(result.fallback).toBe(false);
  });

  it('returns failure when validation fails', async () => {
    mockOpenAISuccess('{"value":"not-a-number","label":"test"}');

    const client = LLMHttpClient.getInstance();
    const result = await client.requestStructured<TestResult>(
      structuredContext,
      0.7,
      400,
      'TestStructured',
      (text) => {
        try {
          const obj = JSON.parse(text);
          if (typeof obj.value === 'number' && typeof obj.label === 'string') {
            return { ok: true, result: obj as TestResult };
          }
          return { ok: false, result: null as unknown as TestResult, error: 'Invalid shape' };
        } catch {
          return { ok: false, result: null as unknown as TestResult, error: 'Parse error' };
        }
      },
    );

    expect(result.success).toBe(false);
    expect(result.result).toBeNull();
    expect(result.error).toBe('Invalid shape');
    expect(result.fallback).toBe(true);
  });

  it('returns fallback on API error', async () => {
    vi.useFakeTimers();
    try {
      mockAPIError(500, 'Internal Server Error');

      const client = LLMHttpClient.getInstance();
      const resultPromise = client.requestStructured<TestResult>(
        structuredContext,
        0.7,
        400,
        'TestStructured',
        (text) => {
          try {
            return { ok: true, result: JSON.parse(text) as TestResult };
          } catch {
            return { ok: false, result: null as unknown as TestResult, error: 'Parse error' };
          }
        },
      );

      await vi.advanceTimersByTimeAsync(30000);

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.result).toBeNull();
      expect(result.fallback).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    } finally {
      vi.useRealTimers();
    }
  });
});
