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

## LLM vs deterministic behavior benchmark (Phase 1b validation)

**Added:** 2026-04-27 (from /plan-eng-review outside voice)
**Context:** The outside voice challenged whether LLM-driven NPC planning produces
demonstrably better narrative moments than a simple deterministic state machine
given the throughput constraints (2 planning slots per 8s tick for 50 NPCs).

**What:** Design and run an A/B benchmark. Run the demo for 5 minutes in two modes:
(a) LLM-driven NPCs, (b) deterministic activity labels from fallbackPlan().
Record the chronicle events in each mode, then blind-review them. Count
"interesting narrative moments" (events that reference another NPC, show
emotional range, or describe specific goals vs. generic activity labels).

**Why:** Validates the core product thesis — that LLM-driven NPCs create emergent
narrative that a deterministic system cannot. If the A/B shows no meaningful
difference, the product thesis needs revision.

**Context for pickup:** The infrastructure for both modes already exists.
`/api/npcs` returns activity/emotion for deterministic comparison. The chronicle
WebSocket captures all events. A toggle in NPCWorldService can disable LLM calls
and use fallbackPlan() exclusively.

**Depends on:** Running Phase 1b demo, ability to capture chronicle output.
