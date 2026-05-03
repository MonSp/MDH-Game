import * as path from 'path';
import { readFileSync } from 'fs';
import { parsePlanResponse, ParsedPlan } from './PlanParser';
import { logLLMCall } from './LLMLogger';

export type LLMProvider = 'openai-compatible' | 'gemini';

export interface LLMClientConfig {
  provider: LLMProvider;
  endpoint: string;
  model: string;
  apiKey: string;
}

export interface LLMRequestContext {
  npcId: string;
  npcName: string;
  systemPrompt: string;
  userPrompt: string;
}

export interface LLMResult {
  success: boolean;
  plan: ParsedPlan | null;
  error: string | null;
  latencyMs: number;
  retries: number;
  fallback: boolean;
}

export interface DialogueResult {
  success: boolean;
  text: string | null;
  error: string | null;
  latencyMs: number;
  retries: number;
  fallback: boolean;
}

export interface DialogueRequestContext {
  npcId: string;
  npcName: string;
  systemPrompt: string;
  userPrompt: string;
}

const FALLBACK_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = [6000, 12000];
const FETCH_TIMEOUT_MS = 45000;
const BODY_READ_TIMEOUT_MS = 15000;
const MAX_RESPONSE_LENGTH = 1000;
const DIALOGUE_TEMPERATURE = 0.9;
const DIALOGUE_MAX_TOKENS = 400;
const PLAN_TEMPERATURE = 0.8;
const PLAN_MAX_TOKENS = 600;

async function readResponseText(res: Response, timeoutMs = BODY_READ_TIMEOUT_MS): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      res.text(),
      new Promise<string>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Body read timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function loadConfig(): LLMClientConfig {
  const config: LLMClientConfig = {
    provider: 'openai-compatible',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-2.0-flash',
    apiKey: '',
  };

  // 1. Load from config file
  try {
    const configPath = path.resolve(__dirname, '../config/llm_config.txt');
    const txt = readFileSync(configPath, 'utf8');
    for (const line of txt.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const sep = trimmed.indexOf('=');
      if (sep === -1) continue;
      const k = trimmed.slice(0, sep).trim();
      const v = trimmed.slice(sep + 1).trim();
      if (k === 'api_key') config.apiKey = v;
      if (k === 'local_endpoint') {
        try { config.endpoint = new URL(v).toString().replace(/\/+$/, ''); } catch { /* keep default */ }
        config.provider = 'openai-compatible';
      }
      if (k === 'model') config.model = v;
      if (k === 'provider') {
        config.provider = v === 'gemini' ? 'gemini' : 'openai-compatible';
      }
    }
  } catch (e) {
    console.warn('[LLMHttpClient] No config file, using defaults');
  }

  // 2. Override with environment variables (higher priority)
  if (process.env.LLM_BASE_URL) {
    config.endpoint = process.env.LLM_BASE_URL.replace(/\/+$/, '');
    config.provider = 'openai-compatible';
  }
  if (process.env.LLM_API_KEY) {
    config.apiKey = process.env.LLM_API_KEY;
  }
  if (process.env.LLM_MODEL) {
    config.model = process.env.LLM_MODEL;
  }

  return config;
}

export class LLMHttpClient {
  private static instance: LLMHttpClient | null = null;

  static getInstance(): LLMHttpClient {
    if (!LLMHttpClient.instance) {
      LLMHttpClient.instance = new LLMHttpClient();
    }
    return LLMHttpClient.instance;
  }

  private config: LLMClientConfig;
  private fallbackUntil: Map<string, number> = new Map();

  constructor() {
    this.config = loadConfig();
    console.log(`[LLMHttpClient] provider=${this.config.provider} model=${this.config.model}`);
  }

  private evictExpiredFallbacks(): void {
    const now = Date.now();
    for (const [npcId, until] of this.fallbackUntil) {
      if (now >= until) this.fallbackUntil.delete(npcId);
    }
  }

  // ── Shared HTTP fetch with timeout ──────────────────────────

  private async fetchWithTimeout(url: string, headers: Record<string, string>, body: object): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      return await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  // ── OpenAI-compatible provider ──────────────────────────────

  private async callOpenAI(systemPrompt: string, userPrompt: string, temperature: number, maxTokens: number): Promise<string> {
    const baseUrl = this.config.endpoint.replace(/\/+$/, '');
    const url = `${baseUrl}/chat/completions`;

    const body = {
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const res = await this.fetchWithTimeout(url, headers, body);

    if (!res.ok) {
      const text = await readResponseText(res);
      throw new Error(`API ${res.status}: ${text.slice(0, 500)}`);
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('Empty response from API');
    }

    return text;
  }

  // ── Gemini provider ─────────────────────────────────────────

  private async callGemini(
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number,
    responseMimeType?: string,
  ): Promise<string> {
    const url = `${this.config.endpoint}/${this.config.model}:generateContent`;

    const generationConfig: Record<string, unknown> = { temperature, maxOutputTokens: maxTokens };
    if (responseMimeType) {
      generationConfig.responseMimeType = responseMimeType;
    }

    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig,
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) headers['X-Goog-Api-Key'] = this.config.apiKey;

    const res = await this.fetchWithTimeout(url, headers, body);

    if (!res.ok) {
      const text = await readResponseText(res);
      throw new Error(`Gemini API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    return text;
  }

  // ── Generic retry with fallback ─────────────────────────────

  private async requestWithRetry<T>(
    context: { npcId: string; npcName: string; systemPrompt: string; userPrompt: string },
    temperature: number,
    maxTokens: number,
    geminiMimeType: string | undefined,
    logLabel: string,
    validate: (text: string) => { ok: boolean; result: T; error?: string } | { ok: false; result?: null; error: string },
    buildLogSuccess: (responseText: string, latencyMs: number, attempt: number) => Record<string, unknown>,
    buildLogError: (error: string, latencyMs: number, attempt: number) => Record<string, unknown>,
  ): Promise<{ success: boolean; result: T | null; error: string | null; latencyMs: number; retries: number; fallback: boolean }> {
    // Fallback cooldown guard
    const cooldownUntil = this.fallbackUntil.get(context.npcId);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      return {
        success: false,
        result: null,
        error: 'NPC in fallback cooldown',
        latencyMs: 0,
        retries: 0,
        fallback: true,
      };
    }

    const startTime = Date.now();
    let lastError: string | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const responseText = this.config.provider === 'gemini'
          ? await this.callGemini(context.systemPrompt, context.userPrompt, temperature, maxTokens, geminiMimeType)
          : await this.callOpenAI(context.systemPrompt, context.userPrompt, temperature, maxTokens);

        const latencyMs = Date.now() - startTime;

        const validation = validate(responseText);
        if (!validation.ok) {
          logLLMCall({
            npcId: context.npcId,
            npcName: context.npcName,
            attempt: attempt + 1,
            systemPromptTokens: context.systemPrompt.length,
            userPromptTokens: context.userPrompt.length,
            response: responseText,
            latencyMs,
            success: true,
            parseSuccess: false,
            error: validation.error,
          });
          return {
            success: false,
            result: null,
            error: validation.error || 'Validation failed',
            latencyMs,
            retries: attempt,
            fallback: true,
          };
        }

        const logFields = buildLogSuccess(responseText, latencyMs, attempt);
        logLLMCall({
          ...logFields,
          npcId: context.npcId,
          npcName: context.npcName,
          attempt: attempt + 1,
          systemPromptTokens: context.systemPrompt.length,
          userPromptTokens: context.userPrompt.length,
          response: responseText,
          latencyMs,
          success: true,
          parseSuccess: true,
        });

        return {
          success: true,
          result: validation.result,
          error: null,
          latencyMs,
          retries: attempt,
          fallback: false,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        const latencyMs = Date.now() - startTime;

        const logFields = buildLogError(lastError, latencyMs, attempt);
        logLLMCall({
          ...logFields,
          npcId: context.npcId,
          npcName: context.npcName,
          attempt: attempt + 1,
          systemPromptTokens: context.systemPrompt.length,
          userPromptTokens: context.userPrompt.length,
          latencyMs,
          success: false,
        });

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_BACKOFF_MS[attempt] + Math.random() * 2000;
          await sleep(delay);
        }
      }
    }

    this.evictExpiredFallbacks();
    this.fallbackUntil.set(context.npcId, Date.now() + FALLBACK_COOLDOWN_MS);
    console.log(`[LLM]${logLabel ? ' ' + logLabel + ' ' : ' '}${context.npcName} fallback (${lastError})`);

    return {
      success: false,
      result: null,
      error: lastError,
      latencyMs: Date.now() - startTime,
      retries: MAX_RETRIES,
      fallback: true,
    };
  }

  // ── Public API ──────────────────────────────────────────────

  async requestPlan(context: LLMRequestContext): Promise<LLMResult> {
    const result = await this.requestWithRetry<ParsedPlan>(
      context,
      PLAN_TEMPERATURE,
      PLAN_MAX_TOKENS,
      'application/json',
      '',
      (text) => {
        const plan = parsePlanResponse(text);
        if (!plan) return { ok: false as const, error: 'Failed to parse LLM response' };
        return { ok: true as const, result: plan };
      },
      (responseText, latencyMs) => {
        const plan = parsePlanResponse(responseText);
        const actions = plan ? plan.actions.map(a => `${a.actionType}[${a.priority}]`).join(', ') : '';
        const summary = plan ? `${plan.goal} | ${actions} | ${plan.emotionalState}` : '';
        return { planSummary: summary };
      },
      (error) => ({ error, response: undefined }),
    );

    return {
      success: result.success,
      plan: result.result,
      error: result.error,
      latencyMs: result.latencyMs,
      retries: result.retries,
      fallback: result.fallback,
    };
  }

  async requestDialogue(context: DialogueRequestContext): Promise<DialogueResult> {
    const result = await this.requestWithRetry<string>(
      context,
      DIALOGUE_TEMPERATURE,
      DIALOGUE_MAX_TOKENS,
      undefined,
      'Dialogue',
      (text) => {
        if (!/[一-鿿㐀-䶿]/.test(text)) {
          return { ok: false as const, error: 'Response contains no Chinese characters' };
        }
        return { ok: true as const, result: text.slice(0, MAX_RESPONSE_LENGTH) };
      },
      () => ({}),
      () => ({}),
    );

    return {
      success: result.success,
      text: result.result,
      error: result.error,
      latencyMs: result.latencyMs,
      retries: result.retries,
      fallback: result.fallback,
    };
  }

  clearFallback(npcId: string): void {
    this.fallbackUntil.delete(npcId);
  }

  isInFallback(npcId: string): boolean {
    const cooldown = this.fallbackUntil.get(npcId);
    return cooldown != null && Date.now() < cooldown;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
