# Changelog

All notable changes to 《太古纪元：霸业》 (Xianxia Pixel MMORPG).

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
