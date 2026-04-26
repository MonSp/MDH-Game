# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

《太古纪元：霸业》 — a 2.5D pixel-art cultivation (修仙) MMORPG set in a Warring States-inspired world. The game combines national strategy, family/clan politics, individual cultivation progression, and AI-driven NPC behavior.

**Two runtimes coexist:**
- **TypeScript (Node.js)**: Game server (Express + Socket.IO) + React client (Vite + Three.js)
- **C++**: High-performance ECS engine for NPC simulation (100K+ entities), connected to the TS server via IPC/Unix sockets for LLM-powered NPC planning

## Build & Run Commands

```bash
# TypeScript build
npm run build          # tsc -- uses tsconfig.json, outputs to dist/

# Development server (TS only, uses ts-node)
npm run dev            # starts Express + Socket.IO server on port 3000

# Start production server
npm start              # runs node dist/server/index.js

# Lint TypeScript
npm run lint           # eslint src --ext .ts

# C++ engine build (CMake)
cd build && cmake .. && make
# Run C++ engine benchmark: ./build/game_engine [threadCount] [npcCount]
```

There are no tests yet — no test runner is configured in `package.json`.

## Architecture

### Dual Runtime

The C++ engine (`src/server/main.cpp`) is a standalone ECS simulation benchmark that processes NPC lifecycles, behavior, and LLM planning requests. It uses a thread pool (`src/server/game/job/`) and IPC (`src/server/game/ipc/`) to communicate with the TypeScript server. The TS server (`src/server/index.ts`) is the authoritative game server — it handles player connections via Socket.IO and game logic through service classes.

### TypeScript Source Layout (`src/`)

| Directory | Purpose |
|---|---|
| `src/server/index.ts` | Express + Socket.IO entry point. Player lifecycle, game loop at 60fps |
| `src/server/services/` | Singleton service classes: `PlayerService`, `CountryService`, `FamilyService`, `CultivationService`, `EconomyService`, `ResourceService`, `NPCService`, `DeathService`, `PopulationService` |
| `src/server/game/` | C++ ECS engine headers (compiled separately via CMake) |
| `src/pages/` | React page components — `Login` (`/`) and `Game` (`/game`) |
| `src/components/` | Reusable UI: `HUD`, `LogBox`, `Map2D`, `MarketPanel` |
| `src/store/gameStore.ts` | **Central Zustand store** (~1400 lines). All game state and logic: player data, clans, NPCs, resources, market, cultivation, ascension, NPC behavior tree evaluation |
| `src/shared/types/` | TypeScript interfaces for all game domains (`player.ts`, `npc.ts`, `cultivation.ts`, `country.ts`, `family.ts`, `economy.ts`, `resource.ts`, `life-cycle.ts`, `events.ts`) |
| `src/shared/constants/` | Game config constants: map dimensions, tick rate |

### C++ ECS Engine (`src/server/game/`)

- **Core** (`ecs/`): `Registry` (singleton entity-component store), `Entity`, `Component`, `Archetype`
- **Components** (`ecs/components/`): `Position`, `Identity`, `Stats`, `Personality`, `Behavior`, `Resources`, `Lifecycle`, `LLM`
- **Systems** (`ecs/systems/`): `WorldUpdateLoop` (main loop orchestrator), `NPChunkUpdateSystem`, `LifecycleSystem`, `PopulationBalanceSystem`, `LLMPlanningSystem`
- **NPC** (`npc/`): `NPCCreationSystem`, `MovementSystem`, `CombatSystem`, `BehaviorTreeSystem`
- **Job System** (`job/`): `ThreadPool`, `JobDispatcher`, `TaskQueue`, `Job`
- **LLM** (`llm/`): `LLMService`, `LLMPlanningClient`, `LLMHttpClient`, `LLMPromptBuilder`
- **IPC** (`ipc/`): `UnixSocketServer`, `MessageQueue`, `Protocol`, `LLMPlanningIPC`

### Key Design Patterns

- **Singletons everywhere**: Both TS services and C++ systems use the `getInstance()` pattern. The C++ ECS `Registry` is a singleton.
- **Zustand as the single source of truth**: The entire client game state lives in `useGameStore` — player, NPCs, clans, resources, market, logs. NPC behavior evaluation is inline in the store.
- **Socket.IO event-driven**: Server uses `socket.on('eventName', ...)` pattern. Events follow `domain:action` naming (e.g., `player:create`, `resource:collect`, `cultivation:breakthrough`).
- **C++ ECS**: Each component type registers a static type ID via `ComponentRegistry`. Systems query entities by component type and process them in parallel via the thread pool.

### Path Aliases (tsconfig.json)

```
@/*        → src/*
@shared/*  → src/shared/*
@server/*  → src/server/*
```

## Documentation

- `docs/` — Game design documents (Chinese). `docs/README.md` is the index. Covers world-building, factions, cultivation, economy, NPC AI, maps, player systems, and technical architecture.
- `code-design/` — Code architecture design docs mapping game design to implementation (Chinese).
- `.trae/specs/` — Feature specification documents for system upgrades.

## Important Notes

- `tsconfig.json` has `strict: false` and `noImplicitAny: false` — TypeScript strictness is intentionally relaxed.
- The C++ engine is a **benchmark/headless simulation** — it doesn't run as a production server. The TS Express server is the actual game server.
- `gameStore.ts` is the largest file (~1400 lines) and contains both state and logic (NPC behavior tree, market economics, cultivation mechanics). Major game systems are implemented here rather than in separate service files.
- The codebase is early-stage: no test suite, some placeholder implementations, and framework-level scaffolding mixed with detailed game logic.
