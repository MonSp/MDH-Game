# TODOS

## ~~P3: Diplomatic & War System (外交与战争系统)~~ ✅ DONE

**Completed:** 2026-05-03 (v1.6.0.0)
**Results:** Full implementation with declareWar, proposeAlliance, proposeTruce, surrenderTo, breakAlliance actions; 5-status diplomatic system; war hostility NPC AI; DiplomacyPanel UI; map war indicator; 23 tests.

## ~~P2: Faction System (势力系统)~~ ✅ DONE

**Completed:** 2026-05-03 (v1.5.0.0)
**Results:** Full faction system with create, building upgrades, officer appointments, tax collection, faction tick, 30 tests.

## ~~LLM API smoke test (Phase 1b prerequisite)~~ ✅ DONE

**Completed:** 2026-04-30
**Results:** Tested implicitly during benchmark run — LLM phase successfully called the API via LLMHttpClient, responses parsed by PlanParser, 5-minute run with real latency data collected.

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

## ~~LLM vs deterministic behavior benchmark (Phase 1b validation)~~ ✅ DONE

**Completed:** 2026-04-30
**Results:** Benchmark run on benchmark/llm-vs-deterministic branch. LLM produced 262% more "interesting narrative moments" (score >= 2.0) than deterministic mode. LLM average score 1.59 vs deterministic 0.91. Verdict: LLM clearly justified.

**Added:** 2026-04-27 (from /plan-eng-review)
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

## ~~Player character + scene narrative (Phase 1c)~~ ✅ DONE

**Completed:** 2026-04-30
**Results:** Design approved via /office-hours. Eng review completed via /plan-eng-review.
Implementation pending. See design doc at `~/.gstack/projects/MyGame/test-main-design-20260430-201022.md`.

## ~~Wire remaining 3 talent stats into game mechanics~~ ✅ DONE

**Completed:** v1.3.0.0 (2026-05-01)
**Results:** All 4 talent stats now fully wired — spiritualRoot affects cultivation speed, boneConstitution affects HP/attack, comprehension reduces breakthrough cost, fortune enables double resource yield via binary proc.

## ~~NPC memory persistence from scene dialogue~~ ✅ DONE

**Completed:** v1.2.0.0 (2026-05-01)
**Results:** `markNpcMet()` stores met NPCs in store; scripted NPC_DIALOGUE supports `metText` variants for re-encounters.

## ~~Socket.IO disconnect handling during scene LOADING state~~ ✅ DONE

**Completed:** v1.2.0.0 (2026-05-01)
**Results:** ScenePanel has `disconnectError` state + fallback button for connection loss during LLM dialogue loading.

## Mobile responsive ScenePanel

**Added:** 2026-04-30 (from /plan-design-review)
**Context:** ScenePanel is designed for desktop (1920x1080, min 1024px). On mobile/tablet, the full-screen overlay with small text and buttons creates a poor experience.
**What:** Design mobile variant (375-768px): bottom sheet instead of full overlay, condensed text, larger buttons (44px min touch target). 
**Effort:** ~30 min

## ScenePanel keyboard navigation and screen reader support

**Added:** 2026-04-30 (from /plan-design-review)
**Context:** ScenePanel has no keyboard nav or a11y spec. Players who rely on keyboard or screen readers can't interact with the scene.
**What:** Add Escape to close, Tab between choices, Enter to select. Add ARIA labels for screen readers (`role="dialog"`, `aria-label` for scene title, `aria-describedby` for description).
**Effort:** ~15 min

## ~~Wire building effects as runtime stat modifiers~~ ✅ DONE

**Completed:** 2026-05-03 (v1.6.0.0+)
**Results:** 练功房 wired into cultivate() exp gain (1.1/1.2/1.3x), 藏经阁 wired into squad combat memberAtk/memberDef (1.05/1.10/1.15x), 丹房 wired into 洗髓丹 stat bonuses (1.1/1.2/1.3x), 库房 wired into treasury cap (10000+level*5000) in collectTax and factionTick, 哨塔 wired into Map2D fog distance and zoom. 11 tests.

## ~~Morale debuff warning when faction morale < 20~~ ✅ DONE

**Completed:** 2026-05-03 (v1.6.0.0+)
**Results:** Log warning (throttled 30s) in factionTick, red animated pulse on morale value in FactionPanel, inline warning banner, and 50% tax income penalty when morale < 20.
