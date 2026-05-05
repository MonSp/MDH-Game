# Changelog

## [1.13.0.0] - 2026-05-05

### Added
- Phase 2.3 — Pixel art style upgrade: all procedurally-generated 3D voxel models replaced with Canvas2D pixel sprites
- `pixelSpriteGenerator.ts` — procedural pixel sprite generator: 48×48 character sprites (8-layer rendering: aura, robe, sleeves, head, hair, glow, realm overlay), 32×32 monster sprites (7 distinct species: 赤焰蛇/冰晶蝎/幽冥狼/雷纹虎/血玉蛛/玄冰蟒/金翅大鹏), 32×32 terrain tiles (9 biomes), 32×32 resource sprites (灵田/矿脉/遗迹), 16×16 effect textures (spark/star/glow/leaf/crystal/ember), 16×16 item icons (25+ types)
- `PixelCharacterSprite` — THREE.Sprite component with reactive sprite regeneration; breathing, bounce, and float animations
- `PixelMonsterSprite` — THREE.Sprite with fade-out on death animation; idle float + scale pulse
- `PixelResourceSprite` — THREE.Sprite with gentle scale oscillation
- `PixelBuildingSprite` — THREE.Sprite with idle bob and scale-pulse animation
- `PixelItemIcon` — React HTML component using Canvas2D-generated data URLs for inventory/panel icons
- `PixelDecoration` — procedurally-generated pixel grass, flowers, rocks, trees scattered across the map
- `PixelParticleEffects` — THREE.Points-based combat sparks (12 particles, physics), gathering effects (8 particles, type-dependent), breakthrough effects (expanding ring + glow sprite)
- Map2D terrain tiles now use pixel art textures with `NearestFilter` for crisp rendering
- `drei Sparkles` aura effect around high-realm NPCs (金丹+) and player
- Realm-based monster auras (colored rings + glow) mapped from realm cultivation color
- Building idle animation: gentle vertical bob and subtle scale oscillation
- Item icons integrated into MarketPanel, AlchemyPanel, ForgePanel, and HUD
- Monster realm auras: colored rings and glow based on cultivation realm
- Particle effects wired into game loop: combat sparks on HP change, gathering particles on resource click, breakthrough expansion on realm ascension
- Weather system: animated water tiles, cloud cover, rain particles, fog overlay
- Water animation: undulating pixel waves with color cycling for DEEP_WATER/SHALLOW_WATER tiles
- Procedural decoration system: seeded-random grass tufts, flowers, rocks, pine trees, dead trees placed on terrain

### Changed
- CultivatorModel refactored from 12-box voxel assembly to single `PixelCharacterSprite` billboard
- MonsterMesh refactored from box+sphere geometry to single `PixelMonsterSprite` with realm aura integration
- ResourceMesh refactored from rotating box to `PixelResourceSprite`
- Canvas2D config: `antialias: false` for crisp pixel rendering
- Terrain textures use `THREE.NearestFilter` with `generateMipmaps: false`
- `getRealmAura` from appearance.ts used for monster/NPC realm ring colors

### Removed
- Voxel mesh construction removed from CultivatorModel (12 box geometries, arm rotation logic)
- Box-based particle cubes in InteractionEffectParticles replaced with sprite-based particles

## [1.12.0.0] - 2026-05-05

### Added
- Phase 4.3b — Captive system: capture defeated NPCs (50% base chance modified by realm difference), panel to manage captives with recruit/release/execute actions; loyalty system (recruit at 70+, +10 on failure), loot on execution, reputation effects
- Phase 4.2b — Siege equipment building: consume 5000 treasury + 10 ticks to build, 1.5× damage multiplier during siege, auto-consumed after use; progress tracking and WarPanel status indicators
- `CaptivePanel` UI: modal with captive list (realm/class icons), loyalty bar, action buttons (recruit/release/execute), confirmation dialogs for destructive actions
- `MapGeneratorService` server singleton: wraps terrain.ts with in-memory LRU cache, exposes `getTerrainTile(x,y)` and `getMovementCost(x,y)` for collision/pathing queries
- Scout vision extension: scout-role squad members get 2× vision radius in fog-of-war computation
- Server broadcast of NPC deletion: `npc:removed` Socket.IO event fires when server NPCs are deallocated, client removes them from nearbyNPCs
- P2 war stat counters: `battlesLost` and `alliesLost` now increment in all 3 combat paths (inter-NPC war, army-vs-army, player-led combat)

### Changed
- Server-client NPC pool synchronization: `mergeServerNPCs()` now tracks sync misses per NPC and auto-cleans stale NPCs after 3 consecutive missed syncs; cleaning restores them to server-only simulation
- Combat helper extraction: `combatDmg()`, `applyNpcDefeat()`, `resolveArmyCombat()` extracted from inline code in `updateNPCs()` (~850 lines) for readability, preserving exact behavior
- Vision radius computation in Map2D fog-of-war detects scout-role squad members and applies `SCOUT_VISION_MULTIPLIER` (2.0×)

### Fixed
- Module-level state leak in faction AI state tests: `_serverSyncMissCount` tracking between test files — `resetServerSyncTracking()` exposed and called in `beforeEach`

## [1.11.0.0] - 2026-05-05

### Added
- Phase 3.3 — Alchemy crafting system: 6 recipes (回血丹/续命丹/聚气散/培元丹/筑基丹/凝婴丹) with success rate calculation, material consumption, and pill inventory management
- Phase 3.3 — Forge/equipment crafting system: 6 forge recipes (精铁剑/玄铁重甲/星辰剑/凤羽甲/帝剑·轩辕/天玄神甲) spanning 练气 to 合体 realms with slot-based equipment generation and auto-equip on success
- `ForgePanel` UI: modal with amber theme, forge recipe list (sword/shield slot icons), quality badges, material check with owned counts, buff indicator, craft button with success rate, and timed result toast
- `FORGE_RECIPE_META` mapping recipe IDs to equipment generation params (slot, realmValue, targetRarity); `FORGE_MATERIALS` list for economy seeding
- 炼器房 (Forge Hall) building type with 3 upgrade levels (+10% success rate per level, max 30%), matching existing 丹房 upgrade costs
- `forgeCraft` store action: validates player/recipe/materials, calculates forge hall buff, consumes materials on any outcome, generates `Equipment` with `isCrafted` flag, auto-equips to matching slot
- `AlchemyPanel` UI: modal with recipe list, material check, craft button, success rate with alchemy hall buff display, result feedback, inventory summary
- `ItemQuality`/`PillEffect`/`CraftRecipe` types in `src/shared/types/items.ts` — defines 4-tier item quality (凡品/下品/中品/上品) and pill effect system
- Inventory management: `addItem`/`removeItem` store actions for procedural item manipulation
- `COUNTRY_COLORS` constant for territory map overlay (7 warring states colors)

### Changed
- NPCWorldService clan ID system: replaced hardcoded `'sect_main'` with configurable round-robin clan ID pool; `generateDefaultClanIds()` produces 112 IDs matching client heaven-nation-type-index format
- Server NPC clan pool initialized to heaven level 9 at startup (covers all 7 countries × 3 tiers)
- LLM planning context now includes NPC memory: `triggerAndGetActions()` → `triggerPlanning()` → `createPlanningRequest()` pipeline passes formatted memory lines (up to 10) as `major_events`
- LLMPlanningService cache key includes memory hash to avoid stale plans when NPC memory changes

## [1.10.0.0] - 2026-05-05

### Added
- Phase 1.4a — LLM-driven faction AI diplomacy: AI clans now use LLM-powered decisions for alliances, war declarations, and truces instead of pure random probability
- `requestStructured<T>()` public method on `LLMHttpClient` — validates LLM output with a type-safe callback
- `FactionAIPrompts` system prompt + user prompt templates for LLM faction decisions (Chinese, 4 actions: war/alliance/truce/none)
- `FactionDecisionParser` — strips markdown fences and validates LLM output before consumption
- `faction:ai-decision` Socket.IO handler with rate limiting and auth guard
- Store transient state (`_factionLLMCooldowns`, `_factionLLMQueue`, `_factionLLMResults`) + actions for LLM decision lifecycle
- Game.tsx polling loop (15s interval) and Socket listener for faction AI decisions

### Changed
- `factionTick` now checks `_factionLLMResults` before falling back to random probability; 'none' decisions skip all random checks
- `LLMHttpClient.requestWithRetry` made accessible via `requestStructured` wrapper

### Fixed
- Pre-existing flaky test in `faction.test.ts` — Math.random mock ensures deterministic ascension path
- Math.random pollution across test files — `vi.restoreAllMocks()` in afterEach

## [1.9.0.0] - 2026-05-04

### Added
- Phase 1.4 — NPC faction autonomy: AI clans now independently form alliances, declare war, and propose truces based on power ratios (every 30 game ticks)
- Faction resource claiming: AI clans autonomously claim nearby unowned resource points within 8 tiles of their territory center; owned resources produce passive income (2%/tick)
- Inter-NPC war combat: NPCs from warring clans fight adjacent enemies; winners gain +5 treasury, losers lose -3 treasury and enter retreat
- World event system (EventLog): structured event log with icons, colors, and auto-scroll — displays faction actions, NPC interactions, and system events
- NPC-to-NPC interaction visualization: proximity-detected interactions with particle effects (trade, duel, alliance, conflict, greet) on the 2.5D map
- NPC proactive interaction system (InitiativeService): NPCs autonomously approach the player with greetings, trade offers, challenges, and encounter events
- BehaviorExecutor movement implementations: executePatrol, executeLogistics, executeCompete, executeChase, executeTrade with movement, combat, and resource collection
- LLMPlanningScheduler rewrite: per-tier cooldowns (T0=30s, T1=60s, T2=120s), NPCData store, active plan tracking, 2s NPC state sync via Socket.IO
- NPC-to-NPC interaction engine in NPCWorldService: affinity-based interactions with relationship memory, EventBus feedback loop for trade/combat/kill events

### Changed
- ResourcePoint interface: added optional `ownerClanId?: string` for resource ownership tracking
- GameState: added `worldEvents: WorldEvent[]`, `_factionTickCount: number`, and `addWorldEvent()` action
- getClanTerritoryCenter() helper added to gameConstants.ts — computes clan territory center from country capital + index offset
- LLMIntegrationManager: registerHighTierNPC now stores NPCData; registerNPC accepts optional NPCData; removed schedulePlanningForNPC in favor of cooldown-based polling
- Server tick loop: emits NPC state sync and interaction events to Socket.IO clients every 2s
- Map2D resource rendering: owned resources show amber/gold color + flag marker with clan name tooltip
- NPCBehaviorTree.SurvivalNode: returns REST when NPC HP < 30%

### Fixed
- Dead code removal: unused `clanReputationUpdates` variable in gameStore.ts

## [1.8.2.0] - 2026-05-04

### Added
- 56 new tests across 423 lines covering effect handlers (HP, items, debuffs, loseStonesFraction), scene memory routing, Li Si squad member creation, and passive heal decision matrix — all pure functions from effectUtils.ts
- All 10 exported effect functions fully tested with deterministic RNG/now injection: applyHpEffect, applyAddItemEffect, applyRemoveItemEffect, applyDebuffEffect, applyLoseStonesFractionEffect, resolveReunionScene, shouldTriggerIgnoreDeathRouter, resolveRobAdvance, createLiSiSquadMember, evaluateLiSiPassiveHeal
- 4 new data-integrity tests: removeItem count validation, loseStonesFraction range check, addItem name validation, debuff duration check

### Changed
- Grudge prototype (宿怨) Phase 2 scene flow extracted to effectUtils.ts: memory-dependent reunion routing (robbed/helped/ignored → 3 distinct scenes), rob → advance trigger, ignore → death rumor router
- Li Si passive protection integrated into game loop: auto-heals player to 10 HP when HP < 20%, with 30s cooldown and squad membership guard
- Debuff dedup: same-name debuffs now replace instead of stacking, preventing exploit via repeated application
- Scene-registry test updated to include LI_SI_IGNORED in valid memory state validation

### Fixed
- Debuff penalty clamped to [0,1] for both attackPenalty and defensePenalty (previously accepted unbounded values)
- loseStonesFraction: changed from falsy check to explicit undefined guard so 0 is treated as "lose nothing" instead of "no effect specified"
- removeItem non-determinism: now accepts injected `rng` parameter (defaults to Math.random) for deterministic testing
- Stale comment in npcDialogue.ts: "prototype" → "two-phase architecture" with expanded description
- Hardcoded '灵石' string centralized to PROTECTED_ITEMS Set instance in Game.tsx

## [1.8.1.0] - 2026-05-03

### Changed
- Extracted types, constants, and helper functions from gameStore.ts (2728 lines) into dedicated gameConstants.ts module (913 lines) with re-exports — no behavioral change
- DRY refactored LLMHttpClient: merged 4 provider-specific methods into parameterized callOpenAI()/callGemini(), extracted shared retry/backoff/fallback loop into generic requestWithRetry<T>() method (~170 lines of duplication eliminated)
- Migrated postcss.config.js to ESM format (.mjs)
- Improved ScenePanel responsive styling: mobile-optimized padding, text sizing, and touch targets (min-h-[44px])

### Fixed
- Added missing SquadRole and BuildingLevel type imports in gameStore.ts (regression from module extraction)
- Restored "Dialogue" prefix in LLMHttpClient fallback log messages (lost during DRY refactoring)
- Removed unused GEMINI_DIALOGUE_MAX_TOKENS and GEMINI_PLAN_MAX_TOKENS constants
- Reordered spread in log callback calls to prevent accidental field overrides

## [1.8.0.0] - 2026-05-03

### Added
- LLM dynamic NPC dialogue system: when players trigger NPC dialogue, NPC context (personality, emotion, memory, relationships) is sent to the server for LLM-generated Chinese dialogue via OpenAI-compatible or Gemini API
- Socket.IO client-server dialogue pipeline: `scene:npc-dialogue` request with Promise.race (15s timeout) + `scene:npc-response` event for real-time AI dialogue
- `DialoguePrompts.buildDialogueSystemPrompt()` and `buildDialogueUserPrompt()` — structured prompt templates with NPC persona fields and memory context
- `NPCWorldService.getMemoryStore()` and `getBackground()` public accessors for building LLM context
- NPC memory integration: successful LLM dialogue interactions are recorded in NPC memory with impact scoring for future context
- Scripted fallback chain: LLM unavailable → dialogueMap → generic NPC template, with 5-minute cooldown per NPC
- NPC ID validation (`/^[a-zA-Z0-9_]{1,64}$/`) and scene context sanitization (control char/angle bracket stripping, 200-char limit) as prompt injection defenses
- Per-socket rate limiting (10s window) and player authentication guard on `scene:npc-dialogue` handler
- 75 new tests covering dialogue prompts, LLM client dialogue retry/fallback/cooldown, sanitization, NPC ID validation, and NPCWorldService accessors (429 total, all passing)

### Changed
- Game.tsx `handleChoice` now async with socket-based dialogue, processingRef rapid-click guard, and `pendingNpcIdRef` cleanup on error
- ScenePanel LOADING state now shows conditional error UI with fallback button on LLM timeout only

### Fixed
- Removed dead `disconnectError` state and `llmTimerRef`/`clearLlmTimer` from Game.tsx
- Fixed `readResponseText` orphaned timer promise with try/finally cleanup
- Extracted magic number constants: `MAX_SCENE_CONTEXT_LENGTH`, `MAX_MEMORY_SUMMARY_LENGTH`, `DIALOGUE_IMPACT_SCORE`, `SOCKET_RECONNECT_ATTEMPTS`, `DIALOGUE_TEMPERATURE`, `DIALOGUE_MAX_TOKENS`
- Unmount cleanup now properly clears `dialogueTimeoutRef` and nulls `dialogueResolveRef`
- `pendingNpcIdRef` reset on LLM timeout to prevent stale response handling

### Security
- Added player authentication check to `scene:npc-dialogue` handler (prevents unauthenticated LLM API calls)
- Added type guard in `sanitizeSceneContext` for non-string input

---

All notable changes to 《太古纪元：霸业》 (Xianxia Pixel MMORPG).

## [1.7.0.0] - 2026-05-03

### Fixed
- Frozen Zustand state mutation in combat tick: squad members are now deep-cloned before mutation to prevent TypeError when Zustand freezes state in dev mode
- Hard-coded equipment filter in SquadPanel replaced with dynamic EQUIPPABLE_ITEMS constant lookup

### Added
- 13 squad system tests covering max squad size tiers, recruit cap enforcement, member initialization fields (equipment, level, exp), equip/unequip lifecycle with power bonuses, and equipment return on dismissal
- EQUIPPABLE_ITEMS exportable constant mapping item names to power bonuses, used by equipMember/unequipMember and the SquadPanel filter

## [1.6.0.0] - 2026-05-03

### Added
- P3 Diplomatic & War System (外交与战争系统): full diplomatic layer for player factions
- 5 diplomacy actions: declareWar, proposeAlliance, proposeTruce, surrenderTo (vassal), breakAlliance
- 5 diplomatic statuses (中立/同盟/战争/停战/臣服) with bidirectional state management
- Conflict levels (和平/摩擦/局部冲突/全面战争) for escalatory detail
- DiplomacyTick: truce expiry detection with auto-revert to neutral in game loop
- War hostility: NPCs from enemy clans automatically target player when at war
- DiplomacyPanel with 2-tab UI: relations overview + actions (search, filter, action buttons)
- HUD "外交" button (purple, visible when player has a faction)
- Map war indicator: pulsing red ring on faction base when at war
- 23 unit tests covering all diplomacy actions, guard clauses, edge cases, and state transitions

## [1.5.0.0] - 2026-05-03

### Added
- P2 Faction System (势力系统): create your own faction with 500+ reputation, 100K spirit stones, and 3+ squad members
- 6 building types with 3 upgrade levels: 议事厅 (tax efficiency), 练功房 (cultivation speed), 丹房 (pill effect), 藏经阁 (squad power), 库房 (passive income), 哨塔 (vision range)
- Faction management panel with create-flow and 3-tab UI: overview (stats, upgrade costs, building effects), buildings (construct/upgrade with cost display), officers (appoint members as 长老/供奉)
- Faction officer system: assign squad members to faction positions with activity tracking and appointment logging
- Tax collection: territory-based income calculation with treasury updates and morale effects
- Passive income tick: 库房 generates treasury per game tick, faction morale drifts toward neutral (50)
- Faction base on 2.5D world map: amber territory ring, colored building indicator meshes with level-scaled height, faction flag label
- Faction save/load persistence with proper clearing on ascension and cycle rebirth
- 29 tests covering all faction store methods including guard clauses, edge cases, and integration paths

## [1.4.0.0] - 2026-05-02

### Added
- Autonomous Worldbox-style combat system: 7 monster types (赤焰蛇 through 金翅大鹏) spanning 练气 to 合体 realms
- Wild monster spawning: 15% chance per tick, within 5-10 tiles of player, max 6 concurrent, despawn beyond 20 tiles
- Monster movement AI: monsters seek nearest entity (player or NPC) at 1 tile/tick
- Player auto-combat: adjacent monsters engaged automatically using proportional damage formula
- NPC auto-combat: NPCs engage nearby monsters independently with retreat/recovery behavior (5 tick recovery)
- Proportional damage formula: `atk²/(atk+def)` with floor rounding and minimum 1 damage
- Player defense stat: initialized from bone constitution, scales with breakthroughs and ascension
- Monster kills grant exp, spirit stone loot, and increment kill counter
- Player death handling: flee to capital with 1 HP on reaching 0
- 2.5D monster rendering: red glowing crystal mesh with floating HP bar and animated damage numbers
- Kill count and defense displayed in HUD stats panel

### Fixed
- NPC retreatTicksRemaining field properly cleaned up after recovery (destructured to undefined instead of leaving 0)

## [1.3.0.0] - 2026-05-01

### Added
- HUD "打坐修炼" button with 3-second cooldown timer — calls the cultivation system from the UI for the first time
- Breakthrough confirmation modal: displays current/next realm, comprehension-discounted spirit stone cost, and manual confirm before advancing
- "可突破" amber pulse indicator on the exp bar when cultivation exp is full and breakthrough is available
- "已至巅峰" disabled state when player has reached the max realm for their heaven level
- Fortune (机缘) now triggers double resource yields on gathering: `Math.random() < fortune/100` with explicit "机缘触发！" log feedback

### Fixed
- Cooldown timer interval properly cleaned up on HUD component unmount

### Changed
- Max realm guard in cultivate(): now logs a clear message and early-returns instead of falling through with an ascension hint

## [1.2.0.1] - 2026-05-01

### Added
- Scene registry system with area organization (intro/family/sect/wild) and coordinate proximity triggers
- 4 family compound scenes forming the first narrative arc: corridor exploration → yard encounters → patriarch's hall → audience with the clan leader
- Coordinate-based proximity scene triggers on the 2.5D map: walking to the family compound at (55,48) auto-starts the scene chain
- NPC dialogue logging to LogBox for player reference
- Unit tests for scene registry (34 tests covering lookup, coordinate proximity, data integrity) and NPC dialogue branching (7 tests)
- Scene breadcrumb labels for family area scenes

### Fixed
- modifyTalent now applies delta values instead of absolute overwrites (fixes talent effects in all scene choices)
- Invalid Tailwind transition duration class (duration-400 → duration-300)
- Removed unused SCENE_REGISTRY import from Game.tsx
- Coordinate distance comparison uses squared distance to avoid unnecessary Math.sqrt

### Changed
- Scene transition animations: 300ms fade (from 500ms), dynamic backdrop blur, staggered title slide-down entrance
- NPC dialogue data restructured with dedicated NPC entries (servant_02, junior_01, patriarch_01)

## [1.2.0.0] - 2026-05-01

### Added
- Player character system: Talent attributes (灵根/根骨/悟性/机缘) with 5-tier Chinese grade labels
- Talent mechanics wired into gameplay: spiritualRoot affects cultivation speed, boneConstitution affects combat stats, comprehension reduces breakthrough costs, fortune boosts resource gathering
- Scene narrative system with branching story panels (CHOOSING/LOADING/DIALOGUE states)
- NPC memory persistence: `metNpcs` tracking with dialogue variants when re-encountering NPCs
- ScenePanel component with full ARIA a11y, keyboard navigation (Escape to close), and auto-focus
- 4 introductory scene entries with branching choices and NPC dialogue flows
- Server-side `scene:npc-dialogue` Socket.IO handler for scripted NPC responses
- 22 unit tests for `computeTalentGrade` covering all grade keys, boundaries, clamping, and edge cases

### Fixed
- Removed dead code (`findSceneEntry`, `LLM_TIMEOUT_MS`) from Game.tsx

## [1.1.0.1] - 2026-04-30

### Added
- LLM vs deterministic NPC behavior benchmark (`test/llm-deterministic-benchmark.ts`) with 3-dimension scoring rubric
- `reset()` method and `llmMode` toggle on NPCWorldService for benchmark isolation
- Unit tests for `reset()` method (3 tests)
- `seedrandom` dev dependency for reproducible benchmark runs

## [1.1.0.0] - 2026-04-27

### Added
- NPC memory system fully wired into NPC simulation: relationship matrix, interaction tracking, witnessed events
- Round-robin scheduling for LLM NPC planning — fair distribution across all 50 NPCs
- Vitest test framework with 95 tests across 3 suites (PlanParser, NPCMemory, NPCWorldService)
- WebSocket connection status indicator with auto-reconnect in ChroniclePanel

### Changed
- Chronicl event batching: fixed dead code that silently discarded buffered events — events now reliably flushed every BATCH_INTERVAL_MS
- NPC planning runs in parallel (Promise.all) instead of sequential for...of loop, reducing tick latency
- LLM context now shows NPC names and relationship modifier reasons instead of raw IDs
- Action type validation centralized to a single source of truth (exported VALID_ACTION_TYPES)
- Round-robin sort optimized from O(n²) to O(n log n) for large NPC counts
- extractJSON uses brace-counting instead of non-greedy regex, correctly handling nested objects

### Fixed
- nextNPCId collision: recruiting after server init generated IDs that overwrote existing NPCs
- advanceQueue while-loop cascade: delayed ticks no longer skip multiple queued actions
- Promise.all failure isolation: one NPC's LLM failure no longer cancels other NPCs' plans
- NPC planningNext stuck permanently on LLM error — catch handler resets the flag
- Unhandled promise rejection in tick loop — errors are caught and logged
- WebSocket send race condition (TOCTOU between readyState check and send call)
- ChroniclePanel leak: ws.close triggered reconnect after component unmount

### Removed
- Redundant inlined action type Set in NPCWorldService (replaced by import from PlanParser)

## [1.0.1.0] - 2026-04-27

### Added
- NPC chronicle event streaming via WebSocket at `/chronicle` path with 5-second batching
- LLM-powered NPC planning pipeline using Gemini Flash 2.0 for autonomous NPC decision-making
- NPC memory system: relationship matrix (50×50), interaction ring buffer (20/NPC), witnessed events (30/NPC)
- Plan parsing and validation layer for LLM-generated NPC action plans
- C++ IPC bridge (Unix sockets) connecting Node.js LLM client to the C++ ECS engine
- Family/clan dynasty system with pre-built families, guest elder mechanics, and imperial usurpation battles
- Game design documentation covering world-building, factions, cultivation, economy, and NPC AI

### Changed
- ECS component registration and entity management refactored for multi-component queries
- Documentation directory restructured with detailed system design docs

### Fixed
- Missing `<chrono>` includes in C++ ECS headers causing build failures on some compilers
