# Changelog

All notable changes to 《太古纪元：霸业》 (Xianxia Pixel MMORPG).

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
