# TODOS

## Phase 1.1: LLM → 行为规划 → 行为执行 闭环 ✅ DONE

**Completed:** 2026-05-04 (branch: feat/npc-awakening-phase2)
**Tests:** 537 passed (22 files), TypeScript compiles clean

| # | Task | Status |
|---|------|--------|
| 1.1a | Fill `BehaviorExecutor.execute*` methods | ✅ DONE — patrol, logistics, trade, compete, chase all implemented in NPCService.ts |
| 1.1b | Wire LLM planning tick into game loop | ✅ DONE — `LLMIntegrationManager.tick()` every 5s via setInterval in server/index.ts |
| 1.1c | Fix `NPCBehaviorTree` — LLMPlanNode returns real ActionType | ✅ DONE — SelectorNode: SurvivalNode → LLMPlanNode → FallbackNode |
| 1.1d | Sync server behavior to client via Socket.IO | ✅ DONE — 2s NPC behavior processing interval + state sync in server/index.ts |
| 1.1e | Behavior → memory feedback loop | ✅ DONE — EventBus emissions (ACTIVITY_CHANGED, STATE_CHANGED, TRADE_COMPLETE) for NPCWorldService memory integration |

**Key fixes:**
- `translateActionToActivity` private method in LLMIntegrationManager shadowed the real mapper and always returned `'rest'` — removed, now uses imported function directly.
- NPC behavior processing at 2s interval: patrol/explore/logistics/compete → random movement; trade/work → resource gain; rest/retreat → HP regen.

---

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

---

## Known Technical Debt

- **BehaviorExecutor full integration:** `NPCService.ts` BehaviorExecutor has complete implementations but isn't instantiated per-NPC. Current behavior execution uses simplified inline logic in server/index.ts (random movement, basic resource gain, HP regen). The full executor classes should replace the inline implementation.
- **LLMPlanningService memory context:** NPC memory (from NPCWorldService) isn't fed back into LLM planning prompts yet — the loop is wired at the event level (EventBus) but the `planningRequest.world_context` doesn't include memory data.
- **NPCWorldService NPCs:** Server-side NPC pool (50 NPCs) uses hardcoded `clanId: 'sect_main'` and is disconnected from the client-side clan/diplomacy system in gameStore. These two NPC systems need unification.

---

## Forward: Roadmap v2

See `docs/22-开发路线图.md` for full context.

| Phase | Theme | Priority | Est. |
|-------|-------|----------|------|
| **Phase 2** | **世界具象化 — 2.5D terrain, collision, fog, pixel art** | ★★★★☆ | ~7 days |
| Phase 3 | 修仙深化 — skills, equipment, crafting | ★★★★☆ | ~8 days |
| Phase 4 | 战争深化 — siege, territory, armies | ★★★☆☆ | ~5 days |
| Phase 5 | 跨天统一 — ascension cross-server | ★★★☆☆ | ~5 days |
| Phase 6 | 多人联机 — multiplayer coordination | ★★☆☆☆ | ~7 days |
