import * as path from 'path';
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

interface PendingRequest {
  context: LLMRequestContext;
  resolve: (result: LLMResult) => void;
}

const FALLBACK_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_RETRIES = 2; // 3 attempts total (1 initial + 2 retries)
const RETRY_BACKOFF_MS = [6000, 12000]; // wait 6s/12s — avg response is 3-4s
const FETCH_TIMEOUT_MS = 45000;

function loadConfig(): LLMClientConfig {
  const config: LLMClientConfig = {
    provider: 'openai-compatible',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-2.0-flash',
    apiKey: '',
  };

  // 1. Load from config file
  try {
    const fs = require('fs');
    const configPath = path.resolve(__dirname, '../config/llm_config.txt');
    const txt = fs.readFileSync(configPath, 'utf8');
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
  private config: LLMClientConfig;
  private pending: Map<string, PendingRequest> = new Map();
  private fallbackUntil: Map<string, number> = new Map();
  private activeRequests = 0;
  private maxConcurrent = 5;

  constructor() {
    this.config = loadConfig();
    console.log(`[LLMHttpClient] provider=${this.config.provider} model=${this.config.model}`);
  }

  async requestPlan(context: LLMRequestContext): Promise<LLMResult> {
    const cooldownUntil = this.fallbackUntil.get(context.npcId);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      return {
        success: false,
        plan: null,
        error: 'NPC in fallback cooldown',
        latencyMs: 0,
        retries: 0,
        fallback: true,
      };
    }

    const startTime = Date.now();
    let lastError: string | null = null;
    let responseText: string | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        responseText = this.config.provider === 'gemini'
          ? await this.callGemini(context)
          : await this.callOpenAICompatible(context);

        const latencyMs = Date.now() - startTime;

        const plan = parsePlanResponse(responseText);
        if (!plan) {
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
          });
          return {
            success: false,
            plan: null,
            error: 'Failed to parse LLM response',
            latencyMs,
            retries: attempt,
            fallback: true,
          };
        }

        const actions = plan.actions.map(a => `${a.actionType}[${a.priority}]`).join(', ');
        logLLMCall({
          npcId: context.npcId,
          npcName: context.npcName,
          attempt: attempt + 1,
          systemPromptTokens: context.systemPrompt.length,
          userPromptTokens: context.userPrompt.length,
          response: responseText,
          latencyMs,
          success: true,
          parseSuccess: true,
          planSummary: `${plan.goal} | ${actions} | ${plan.emotionalState}`,
        });

        return {
          success: true,
          plan,
          error: null,
          latencyMs,
          retries: attempt,
          fallback: false,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        const latencyMs = Date.now() - startTime;

        logLLMCall({
          npcId: context.npcId,
          npcName: context.npcName,
          attempt: attempt + 1,
          systemPromptTokens: context.systemPrompt.length,
          userPromptTokens: context.userPrompt.length,
          latencyMs,
          success: false,
          error: lastError,
          response: responseText || undefined,
        });

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_BACKOFF_MS[attempt];
          await sleep(delay);
        }
      }
    }

    this.fallbackUntil.set(context.npcId, Date.now() + FALLBACK_COOLDOWN_MS);

    console.log(`[LLM] ${context.npcName} fallback (${lastError})`);

    return {
      success: false,
      plan: null,
      error: lastError,
      latencyMs: Date.now() - startTime,
      retries: MAX_RETRIES,
      fallback: true,
    };
  }

  clearFallback(npcId: string): void {
    this.fallbackUntil.delete(npcId);
  }

  isInFallback(npcId: string): boolean {
    const cooldown = this.fallbackUntil.get(npcId);
    return cooldown != null && Date.now() < cooldown;
  }

  private async callOpenAICompatible(context: LLMRequestContext): Promise<string> {
    const baseUrl = this.config.endpoint.replace(/\/+$/, '');
    const url = `${baseUrl}/chat/completions`;

    const body = {
      model: this.config.model,
      messages: [
        { role: 'system', content: context.systemPrompt },
        { role: 'user', content: context.userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 600,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text.slice(0, 500)}`);
    }

    const data = await res.json() as {
      choices?: Array<{
        message?: { content?: string };
      }>;
    };

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('Empty response from API');
    }

    return text;
  }

  private async callGemini(context: LLMRequestContext): Promise<string> {
    const url = `${this.config.endpoint}/${this.config.model}:generateContent?key=${this.config.apiKey}`;

    const body = {
      system_instruction: {
        parts: [{ text: context.systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: context.userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 800,
        responseMimeType: 'application/json',
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    return text;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
