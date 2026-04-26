import { parsePlanResponse, ParsedPlan } from './PlanParser';

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

const FALLBACK_COOLDOWN_MS = 5 * 60 * 1000; // 5 min
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = [1000, 2000, 4000];

export class LLMHttpClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private pending: Map<string, PendingRequest> = new Map();
  private fallbackUntil: Map<string, number> = new Map();
  private activeRequests = 0;
  private maxConcurrent = 5;

  constructor(apiKey: string, model = 'gemini-2.0-flash') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  async requestPlan(context: LLMRequestContext): Promise<LLMResult> {
    // Check if NPC is in fallback cooldown
    const cooldownUntil = this.fallbackUntil.get(context.npcId);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      console.log(`[FALLBACK] npc=${context.npcId} reason=cooldown remaining=${cooldownUntil - Date.now()}ms`);
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

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[LLM REQ] npc=${context.npcId} model=${this.model} attempt=${attempt + 1}/${MAX_RETRIES + 1}`);

        const response = await this.callGemini(context);

        const latencyMs = Date.now() - startTime;
        console.log(`[LLM RES] npc=${context.npcId} latency=${latencyMs}ms status=success`);

        const plan = parsePlanResponse(response);
        if (!plan) {
          console.log(`[PARSE] npc=${context.npcId} status=failed reason=schema_validation`);
          lastError = 'Failed to parse LLM response';
          continue; // retry
        }

        console.log(`[PARSE] npc=${context.npcId} actions=${plan.actions.length} goal="${plan.goal}" valid=true`);

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
        console.log(`[LLM ERR] npc=${context.npcId} latency=${latencyMs}ms attempt=${attempt + 1} error="${lastError}"`);

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_BACKOFF_MS[attempt];
          console.log(`[RETRY] npc=${context.npcId} delay=${delay}ms`);
          await sleep(delay);
        }
      }
    }

    // All retries exhausted — enter fallback cooldown
    this.fallbackUntil.set(context.npcId, Date.now() + FALLBACK_COOLDOWN_MS);
    console.log(`[FALLBACK] npc=${context.npcId} reason=exhausted_retries cooldown=300s`);

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

  private async callGemini(context: LLMRequestContext): Promise<string> {
    const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

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

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

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
