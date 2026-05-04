# TODOS

## Phase 2: 世界具象化 — 2.5D Real World (世界具象化) ✅ DONE

**Completed:** 2026-05-04 (branch: feat/world-rendering-phase2)
**Tests:** 537 passed (22 files), TypeScript compiles clean

| # | Task | Status |
|---|------|--------|
| 2.1a | Terrain type definitions | ✅ `src/shared/types/map.ts` — TerrainType enum, TerrainTile, MapConfig, TERRAIN_MOVE_COST, isTerrainPassable, isWater, REALM_VISION_RANGES |
| 2.1c+2.1d | Collision + movement modifiers in movePlayer | ✅ Terrain passability check (DEEP_WATER/MOUNTAIN blocked), movement cost (forest 1.3x, swamp 3x), map bounds enforcement, log feedback |
| 2.1e | 2.5D terrain rendering | ✅ Mountain peaks with cone geometry, snow caps on high elevations, elevation-based terrain height, tree placement |
| 2.2 | Fog of war | ✅ Three-state fog (unexplored=dark 88% → explored=dimm 35% → in-sight=clear), realm-based vision radius (REALM_VISION_RANGES), watchtower bonus, exploredTiles tracked in gameStore on movePlayer |

**Not implemented (deferred):**
- 2.1b: MapGenerator with kingdom-aware terrain — current procedural noise-based terrain works well enough
- 2.2c: Scout role expands vision — enhancement for later
- 2.3: Pixel art sprites — needs art assets, visual-only improvement

---

## Mobile responsive ScenePanel

**Added:** 2026-04-30 (from /plan-design-review)
**Effort:** ~30 min

## ScenePanel keyboard navigation and screen reader support

**Added:** 2026-04-30 (from /plan-design-review)
**Effort:** ~15 min

---

## Known Technical Debt

- **BehaviorExecutor full integration:** `NPCService.ts` BehaviorExecutor has complete implementations but isn't instantiated per-NPC. Current behavior execution uses simplified inline logic in server/index.ts (random movement, basic resource gain, HP regen).
- **LLMPlanningService memory context:** NPC memory (from NPCWorldService) isn't fed back into LLM planning prompts yet — the loop is wired at the event level (EventBus) but `planningRequest.world_context` doesn't include memory data.
- **NPCWorldService NPCs:** Server-side NPC pool uses hardcoded `clanId: 'sect_main'` and is disconnected from client-side clan/diplomacy system in gameStore.
- **MapGenerator (2.1b):** Terrain is generated purely by simplex-noise without kingdom awareness. Would be enhanced with region-based terrain (plains in 赵, forests in 楚, etc.).

---

## Forward: Roadmap v2

See `docs/22-开发路线图.md` for full context.

| Phase | Theme | Priority | Est. |
|-------|-------|----------|------|
| Phase 3 | 修仙深化 — skills, equipment, crafting | ★★★★☆ | ~8 days |
| Phase 4 | 战争深化 — siege, territory, armies | ★★★☆☆ | ~5 days |
| Phase 5 | 跨天统一 — ascension cross-server | ★★★☆☆ | ~5 days |
| Phase 6 | 多人联机 — multiplayer coordination | ★★☆☆☆ | ~7 days |
