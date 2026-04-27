# TODOS

## LLM API smoke test (Phase 1b prerequisite)

**Added:** 2026-04-27 (from /plan-eng-review)
**Context:** The existing `src/server/llm/LLMHttpClient.ts` targets Gemini 2.0 Flash
with retry/fallback logic but has never been tested against a real API key.
Phase 1b depends on this client working end-to-end.

**What:** Run a 30-minute smoke test: configure a Gemini API key, trigger an NPC
planning request, verify the response parses through `PlanParser.ts`. Document
the actual latency, error rate, and response quality.

**Why:** Prevents Phase 1b from starting with a broken dependency. If the client
needs fixes (wrong endpoint, auth, schema mismatch), find that now, not during
the 2-week Phase 1b sprint.

**Depends on:** Gemini API key access.
