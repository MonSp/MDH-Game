# 太古纪元：霸业 — Xianxia Pixel MMORPG

**太古纪元：霸业** is a 2.5D pixel-art cultivation (修仙) MMORPG set in a Warring States-inspired world. The game combines national strategy, family/clan politics, individual cultivation progression, and AI-driven NPC behavior.

## MDH 大荒界 · 智能体世界

本项目是 **MDH 大荒界** 智能体世界的玩家前端。

- **MDH-Company** ([数字员工操作系统](https://github.com/MonSp/MDH)) — 管理后台，AI agent 团队协作执行任务
- **MDH-Game** (本项目) — 太古纪元：霸业，2.5D 修仙 MMORPG

NPC 由 C++ ECS agent-kernel 驱动，拥有与 Company 数字员工相同的技能、记忆和经验值。

**Two runtimes coexist:**
- **TypeScript (Node.js)**: Game server (Express + Socket.IO) + React client (Vite + Three.js)
- **C++**: High-performance ECS engine for NPC simulation (100K+ entities), connected via IPC/Unix sockets for LLM-powered NPC planning

## Quick Start

```bash
# Install dependencies
npm install

# Development server (starts Express + Socket.IO on port 3000)
npm run dev

# Run tests (29 test files, 653+ tests)
npm test

# Production build
npm run build

# Start production server
npm start

# Lint
npm run lint
```

## Features

- **Cultivation system**: 10 realms (凡人→练气→筑基→金丹→元婴→化神→炼虚→合体→大乘→渡劫), talent attributes, breakthroughs, ascension
- **Alchemy & Forging**: 6 pill recipes + 6 forge recipes, success rate calculation, hall buffs, slot-based equipment generation
- **Combat**: Auto-combat with proportional damage formula, 7 monster types, NPC vs monster combat, squad combat
- **Faction system**: Create/manage factions with 6 building types (3 upgrade levels each), officer appointments, tax collection
- **Diplomacy & War**: 5 diplomacy actions, 5 diplomatic statuses, war hostility, truce system
- **NPC AI**: LLM-driven NPC planning (OpenAI/Gemini), 50 NPC world simulation, relationship matrix, memory system
- **NPC dialogue**: LLM-generated Chinese dialogue with personality/emotion/memory context, scripted fallback
- **Squad system**: Recruit NPCs as squad members (4 roles), equipment, leveling, formation
- **2.5D world**: Three.js terrain rendering, fog of war, resource nodes, territory visualization
- **Scene narrative**: Branching story scenes with memory-dependent routing, 4 introductory scenes, grudge prototype

## Architecture

### TypeScript Source (`src/`)

| Directory | Purpose |
|---|---|
| `src/server/` | Express + Socket.IO server with service classes (Player, Country, Family, Cultivation, Economy, etc.) |
| `src/pages/` | React pages — `Login` (`/`) and `Game` (`/game`) |
| `src/components/` | Reusable UI components (HUD, Map2D, AlchemyPanel, ForgePanel, SkillBar, ScenePanel, FactionPanel, and more) |
| `src/store/` | Central Zustand store (`gameStore.ts`) + crafting recipes, game constants |
| `src/shared/types/` | TypeScript interfaces for all game domains |
| `src/shared/constants/` | Game configuration constants |
| `src/content/scenes/` | Scene narrative content files |

### C++ ECS Engine (`src/server/game/`)

Standalone ECS simulation with thread pool, LLM planning client, and Unix Socket IPC. Built with CMake.

## Documentation

- `docs/` — Game design documents (Chinese). `docs/README.md` is the index.
- `code-design/` — Code architecture design docs (Chinese) mapping game design to implementation.
- `CLAUDE.md` — AI agent instructions and project context.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Three.js, Tailwind CSS, Zustand
- **Backend**: Node.js, Express, Socket.IO
- **Testing**: Vitest (653+ tests)
- **C++ Engine**: CMake, ECS architecture, libcurl (LLM HTTP)
