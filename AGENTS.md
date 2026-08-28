# AGENTS.md

Agent guidance for **太古纪元：霸业** — a 2.5D pixel-art cultivation (修仙) MMORPG.

## Project Identity

- **Name**: xianxia-pixel-game
- **Version**: 1.13.1.0 (see `VERSION`)
- **License**: Private
- **Author**: MonSp

## Dual-Runtime Architecture

Two runtimes coexist and must stay in sync:

| Runtime | Role | Entry Point | Build |
|---------|------|-------------|-------|
| **TypeScript (Node.js)** | Authoritative game server + React client | `src/server/index.ts` (server), `src/pages/` (client) | `npm run build` / `npm run dev` |
| **C++ (CMake)** | Headless ECS simulation for 100K+ NPC entities | `src/server/main.cpp` | `cd build && cmake .. && make` |

The C++ engine communicates with the TS server via IPC/Unix sockets for LLM-powered NPC planning. It is a **benchmark/simulation tool**, not a production server.

## Quick Reference — Build & Test

```bash
npm install           # Install dependencies
npm run dev           # Vite dev server (client + HMR)
npm run dev:server    # TS Express + Socket.IO server (port 3000)
npm run build         # tsc → dist/
npm start             # node dist/server/index.js
npm test              # vitest run (33 test files, 653+ tests)
npm run lint          # eslint src --ext .ts

# C++ engine
cd build && cmake .. && make
./build/game_engine [threadCount] [npcCount]
```

## Directory Map

```
MyGame/
├── src/
│   ├── server/
│   │   ├── index.ts              # Express + Socket.IO entry point, 60fps game loop
│   │   ├── services/             # 16 singleton service classes (see below)
│   │   ├── game/                 # C++ ECS engine (header-only .h files)
│   │   │   ├── ecs/              # Core ECS: Registry, Entity, Component, Archetype
│   │   │   │   └── components/   # 16 component types (Identity, Stats, Position, ...)
│   │   │   │   └── systems/      # 5 systems (WorldUpdateLoop, Lifecycle, LLM, ...)
│   │   │   ├── npc/              # 16 files: behavior trees, combat, movement, creation
│   │   │   ├── economy/          # 7 files: market, price engine, caravans, commodities
│   │   │   ├── bt/               # Behavior tree framework (evaluator, templates, cache)
│   │   │   ├── job/              # Thread pool, job dispatcher, task queue
│   │   │   ├── llm/              # LLM service, HTTP client, prompt builder, local engine
│   │   │   ├── ipc/              # Unix socket server, message queue, protocol
│   │   │   ├── services/         # 7 TS bridge services (LLM gateway, planning, ontology, ...)
│   │   │   ├── spatial/          # Spatial index cache
│   │   │   └── world/            # World generator, simplex noise
│   │   ├── llm/                  # TS-side LLM integration (7 files)
│   │   ├── addons/               # Native C++ addons (ECS bridge, occlusion, world gen)
│   │   └── config/               # LLM configuration
│   ├── components/               # 35 React UI components (.tsx)
│   ├── pages/                    # Login (/) and Game (/game) page components
│   ├── store/
│   │   ├── gameStore.ts          # Central Zustand store (~2768 lines) — ALL game state
│   │   ├── craftingRecipes.ts    # Alchemy + forge recipe definitions
│   │   ├── gameConstants.ts      # Tuning constants
│   │   ├── gameService.ts        # Client-side service layer
│   │   └── saveManager.ts        # Save/load logic
│   ├── shared/
│   │   ├── types/                # 13 domain interface files (player, npc, economy, ...)
│   │   ├── constants/            # Map dimensions, tick rate, etc.
│   │   └── socket.ts             # Socket.IO event type definitions
│   ├── content/scenes/           # Scene narrative content (branching story)
│   ├── buildings/                # Building system (11 files: geometry, store, types)
│   ├── hooks/                    # React hooks
│   ├── lib/                      # Utility libraries
│   ├── utils/                    # General utilities (sprite gen, terrain, camera)
│   ├── assets/                   # Static assets
│   ├── ecs/                      # Client-side ECS (WASM bridge)
│   └── blockworld/               # Voxel block world system (29 files, WASM)
├── test/                         # 33 Vitest TS tests + 17 C++ unit tests
│   ├── bt/                       # C++ behavior tree tests
│   ├── common/                   # C++ shared test utilities
│   ├── components/               # C++ component tests (8 files)
│   ├── npc/                      # C++ NPC system tests (8 files)
│   ├── services/                 # TS service tests
│   └── simulation/               # Economy-NPC integration tests
├── docs/                         # Game design documents (Chinese, 33 files)
│   ├── cultivation/              # 修仙境界, 飞升, 功法, 炼丹/炼器, 阵法
│   ├── economy/                  # 经济系统
│   ├── factions/                 # 战国七国, 家族势力
│   ├── map/                      # 地图资源, 秘境探索
│   ├── npc/                      # NPC行为, 生命周期, AI决策, 妖兽
│   ├── player/                   # 玩家系统, 社交师徒, 妖族玩家
│   ├── world/                    # 游戏背景, 任务剧情, 战争史诗
│   └── technical/                # 技术架构设计
├── code-design/                  # 9 code architecture design docs (Chinese)
├── CMakeLists.txt                # C++ engine build config
├── package.json                  # Node.js project config
├── tsconfig.json                 # TypeScript config (strict: false, noImplicitAny: false)
├── vite.config.ts                # Vite bundler config
├── vitest.config.ts              # Test config
├── CLAUDE.md                     # AI agent instructions
└── CHANGELOG.md                  # Version history
```

## TypeScript Services (`src/server/services/`)

| Service | Purpose |
|---------|---------|
| `PlayerService` | Player lifecycle, creation, state |
| `CountryService` | 7 warring states management |
| `FamilyService` | Family/clan dynamics, lineage |
| `CultivationService` | 10-realm cultivation progression |
| `EconomyService` | Market dynamics, trade |
| `ResourceService` | Resource nodes, gathering |
| `NPCService` | NPC CRUD, behavior dispatch |
| `NPCWorldService` | NPC world simulation |
| `DeathService` | Death/rebirth lifecycle |
| `PopulationService` | Population balance |
| `MarketService` | Market transactions |
| `MapGeneratorService` | Procedural map generation |
| `WorldGenService` | World initialization |
| `ECSEngineService` | C++ engine bridge |
| `DataService` | Data persistence |

## React Components (`src/components/`)

Key UI panels: `HUD`, `Map2D`, `MarketPanel`, `AlchemyPanel`, `ForgePanel`, `SkillBar`, `ScenePanel`, `FactionPanel`, `SquadPanel`, `DiplomacyPanel`, `WarPanel`, `ChroniclePanel`, `CaptivePanel`, `EventLog`, `SurveyPopup`, `TimeControlPanel`, `PixelPanel` (modal base).

Pixel art renderers: `PixelCharacterSprite`, `PixelMonsterSprite`, `PixelBuildingSprite`, `PixelResourceSprite`, `PixelItemIcon`, `PixelTechniqueIcon`, `PixelDecoration`, `PixelMinimap`, `PixelParticleEffects`.

## C++ ECS Component Types

`Identity`, `Position`, `Stats`, `Personality`, `Behavior`, `BehaviorTree`, `Resources`, `Lifecycle`, `LLM`, `MemoryRing`, `Relationship`, `Social`, `Cultivation`, `CommandDelegation`, `CommandResponse`, `RoleCommand`.

## C++ NPC Behavior Trees

9 behavior tree categories: `Daily`, `Combat`, `Cultivation`, `EconomyStrategy`, `Exploration`, `Production`, `Social`, `Survival`, `Command`.

## Game Systems (10 Realms)

Cultivation progression: 凡人 → 练气 → 筑基 → 金丹 → 元婴 → 化神 → 炼虚 → 合体 → 大乘 → 渡劫

Core systems: Cultivation, Alchemy & Forging, Combat, Faction, Diplomacy & War, NPC AI (LLM-driven), NPC Dialogue, Squad, Scene Narrative, Economy & Market.

## Key Conventions

- **Singletons**: Both TS services and C++ systems use `getInstance()` pattern.
- **Zustand store**: `gameStore.ts` is the single source of truth for all client state (~2768 lines).
- **Socket.IO events**: Follow `domain:action` naming (e.g., `player:create`, `resource:collect`).
- **Path aliases**: `@/*` → `src/*`, `@shared/*` → `src/shared/*`, `@server/*` → `src/server/*`.
- **TypeScript strictness**: `strict: false`, `noImplicitAny: false` — intentional.
- **C++ style**: Header-only ECS components and systems (`.h` files compiled directly).
- **Commit style**: Conventional commits — `feat(scope):`, `refactor(scope):`, `fix(scope):`, `docs(scope):`.
- **Language**: Game design docs and most commit messages are in Chinese. Code identifiers are English.

## Testing

- **TS framework**: Vitest — 33 `.test.ts` files covering combat, cultivation, diplomacy, factions, forging, NPC behavior/memory, LLM integration/parsing, economy simulation, squads, scenes, equipment, talents, effects.
- **C++ framework**: Custom `test/common/test_utils.h` — 17 `.test.cpp` files in `test/bt/`, `test/components/`, `test/npc/`, `test/simulation/`. Built via `test/Makefile`.
- **Simulation tests**: `test/simulation/economy-npc-simulation.test.ts` for full-system integration.
- Run TS: `npm test` (all) or `npx vitest run test/<file>.test.ts` (single).
- Run C++: `make -C test` then execute individual test binaries.

## Documentation (Chinese)

- `docs/README.md` — Design doc index
- `docs/` — 33 game design documents organized by domain
- `code-design/` — 9 code architecture design docs mapping game design → implementation
- `CLAUDE.md` — Detailed AI agent instructions and project context

## Git

- **155 commits** on `main`, all authored by `MonSp <qgh132555@qq.com>`
- **26 feature branches** (local + remote)
- **Date range**: 2026-04-20 to present
- **Remote**: `origin` at `/home/test/MyGame.git` (local bare repo)
- **No CI/CD**: No `.github/` directory or CI configuration files
