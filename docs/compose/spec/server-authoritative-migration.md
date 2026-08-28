---
feature: server-authoritative-migration
status: in-progress
updated: 2026-06-01
branch: feat/server-authoritative
---

# Server-Authoritative Migration

## Report

(empty — status: designed)

## [S1] Problem

The project has two parallel game engines running simultaneously:

1. **Client Zustand store** (`gameStore.ts`, 3000+ lines) — the "real" game the player interacts with. Runs combat, economy, cultivation, diplomacy, NPC behavior entirely in the browser. All state mutations are local.
2. **Server C++ ECS + TS services** — a full simulation with 10,000+ NPCs, behavior trees, supply/demand economics, combat systems. Runs on the server but only NPC positions/stats are synced to the client for display.

Of 6 major systems, only **NPC state sync** and **Faction AI (LLM)** have working server-client pipelines. The other 4 systems — Economy, Combat, Cultivation, Diplomacy — have complete server-side service implementations and tests, but the client never calls them. Server handlers are dead code (`player:input` attack is a no-op, `resource:collect` and `cultivation:breakthrough` are never emitted by the client).

**Concrete symptoms:**
- Market is hardcoded 5-item shop in `gameStore.ts:71-77`, ignores `MarketService` supply/demand pricing
- Combat is pure client-side RNG (`gameStore.ts:297-389`), server combat at `index.ts:266` is `break`
- Cultivation breakthrough happens inline in `cultivate()` (`gameStore.ts:651-763`), `CultivationService` is never called
- Diplomacy actions (`declareWar`, `proposeAlliance` at `gameStore.ts:1181-1284`) are local state mutations
- Server has no authoritative game state for players — `PlayerService` exists but is unused beyond initial creation

## [S2] Design

### Architecture

**Principle**: Client sends intent commands via socket. Server validates, mutates authoritative state via existing services, broadcasts results. Client receives state deltas and updates local store for rendering.

**Split**: C++ ECS handles large-scale NPC simulation (10K+ entities, behavior trees, movement). TS `PlayerService` + domain services handle player-facing logic (economy, combat, cultivation, diplomacy). Client is a thin presentation layer.

### Socket Protocol

All new events follow `domain:action` naming. Responses use `domain:action:result` pattern with `{ success, data?, error? }` envelope.

#### Economy Events

| Client emits | Server handles | Server responds |
|---|---|---|
| `economy:buy` `{ itemId, quantity }` | Validates funds via `EconomyService.spendCurrency()`, grants items via `ItemService.addItem()`, adjusts market supply via `MarketService.adjustSupply()` | `economy:buy:result` `{ success, balance, inventory, error? }` |
| `economy:sell` `{ itemId, quantity }` | Validates inventory via `ItemService.removeItem()`, grants currency via `EconomyService.addCurrency()`, adjusts demand | `economy:sell:result` `{ success, balance, inventory, error? }` |
| `economy:market` `{}` | Returns `MarketService.getAllMarketInfo()` + player balance | `economy:market:result` `{ items, balance }` |
| `economy:inventory` `{}` | Returns `ItemService.getPlayerItems()` + `EconomyService.getCurrency()` | `economy:inventory:result` `{ items, balance }` |

Server game loop: market prices tick every 60s via `MarketService.adjustSupply/adjustDemand` based on NPC trading activity from ECS.

#### Combat Events

| Client emits | Server handles | Server responds |
|---|---|---|
| `combat:attack` `{ targetId, targetKind }` | Validates range, computes damage via `calculateDamage()`, mutates target HP, handles death/loot | `combat:attack:result` `{ damage, targetHp, killed, loot?, playerHp }` |
| `combat:skill` `{ targetId, skillIndex }` | Validates cooldown + spirit cost, applies skill multiplier to damage | `combat:skill:result` `{ damage, targetHp, killed, spiritCost, loot? }` |

**Target kinds**: `npc` (from ECS/NPCWorldService), `monster` (server-managed spawn table).

Server game loop additions:
- Monster spawning: server spawns monsters near players every 30s (currently client-side at `gameStore.ts:1700-1735`)
- NPC-vs-monster combat: resolved in server NPC behavior tick (C++ ECS handles this already)
- Combat state broadcast: `combat:event` `{ type, attackerId, defenderId, damage }` to nearby players

The server does NOT need to run a per-frame combat loop for player combat — player attacks are request/response. Auto-combat (player auto-attacking adjacent monsters) remains client-side for responsiveness, but **outcomes are validated by the server** via periodic `combat:validate` batch checks.

#### Cultivation Events

| Client emits | Server handles | Server responds |
|---|---|---|
| `cultivation:cultivate` `{}` | Adds cultivation exp via `Player.addCultivation()`, returns new exp + threshold | `cultivation:cultivate:result` `{ cultivation, maxCultivation, realm }` |
| `cultivation:breakthrough` `{}` | Calls `CultivationService.attemptBreakthrough()`, applies realm bonus via `Player` | `cultivation:breakthrough:result` `{ success, newRealm?, stats?, reason? }` |
| `cultivation:status` `{}` | Returns player cultivation state from `PlayerService` | `cultivation:status:result` `{ realm, cultivation, maxCultivation, spiritStones, stats }` |

Cultivation exp gain rate is server-controlled (base rate + realm multiplier). Client `cultivate()` becomes a request to the server, not a local mutation.

#### Diplomacy Events

| Client emits | Server handles | Server responds |
|---|---|---|
| `diplomacy:declare-war` `{ targetClanId }` | Validates preconditions, updates faction relationship | `diplomacy:declare-war:result` `{ success, relationships }` |
| `diplomacy:propose-alliance` `{ targetClanId }` | Validates, updates relationship | `diplomacy:propose-alliance:result` `{ success, relationships }` |
| `diplomacy:propose-truce` `{ targetClanId }` | Validates, updates relationship | `diplomacy:propose-truce:result` `{ success, relationships }` |
| `diplomacy:surrender` `{ targetClanId }` | Validates war state, applies surrender terms | `diplomacy:surrender:result` `{ success, terms }` |
| `diplomacy:break-alliance` `{ targetClanId }` | Validates, updates relationship | `diplomacy:break-alliance:result` `{ success, relationships }` |
| `diplomacy:status` `{}` | Returns all faction relationships | `diplomacy:status:result` `{ relationships }` |

Diplomacy state is server-authoritative. The existing `faction:ai-decision` LLM pipeline continues to work — it can now also trigger server-side diplomacy mutations.

### Authoritative State Sync

New server-to-client broadcast: `state:sync` every 1s (piggybacks on existing NPC sync at 500ms). Contains:

```ts
interface StateSync {
  player: { health, maxHealth, spirit, maxSpirit, attack, defense, spiritStones, realm, cultivation, position, state };
  nearbyMonsters: Array<{ id, type, hp, maxHp, position }>;
  combatEvents: Array<{ type, attackerId, defenderId, damage, timestamp }>;
  economy?: { marketPrices: MarketInfo[] };  // every 10s
}
```

Client `gameStore` consumes `state:sync` to update local rendering state. Client no longer computes authoritative outcomes — it displays what the server says.

### Client Refactoring

**Phase 1 — Wire socket calls (minimal disruption)**:
- `buyItem()` → `socket.emit('economy:buy', ...)` + await result
- `sellItem()` → `socket.emit('economy:sell', ...)` + await result
- `cultivate()` → `socket.emit('cultivation:cultivate', ...)` + await result
- `interactWithNPC(id, '攻击')` → `socket.emit('combat:attack', { targetId: id, targetKind: 'npc' })`
- `declareWar()`, `proposeAlliance()`, etc. → `socket.emit('diplomacy:...')`

**Phase 2 — Remove client-authoritative logic**:
- Delete hardcoded market items from `gameStore.ts:71-77`
- Delete client-side `calculateDamage` combat resolution from `updateNPCs()` (lines 1652-2186)
- Delete client-side cultivation breakthrough logic from `cultivate()` (lines 651-763)
- Delete client-side diplomacy state mutations (lines 1181-1284)
- Client `updateNPCs()` becomes a display-only update: apply server state deltas, run client-side animation/interpolation

**Phase 3 — Server game loop integration**:
- Add monster spawn timer to server (30s interval per active player area)
- Add market price tick to server (60s interval, `MarketService` adjusts based on NPC trade volume)
- Wire `DeathService` and `PopulationService` into server entry point (currently exported but unused)
- Server-side auto-save for player state (replaces client localStorage)

### Server Handler Implementation

Reuse existing service singletons — no new service classes needed. New socket handlers in `src/server/index.ts`:

```
EconomyService.getInstance()   — already has spendCurrency/addCurrency/getCurrency
ItemService.getInstance()      — already has addItem/removeItem/getPlayerItems
MarketService.getInstance()    — already has getPrice/adjustSupply/adjustDemand/getAllMarketInfo
CultivationService.getInstance() — already has attemptBreakthrough/canBreakthrough
PlayerService.getInstance()    — already has getPlayer (server-side Player class with takeDamage/addCultivation/etc.)
```

New handler code per event: ~20-40 lines each (validate input, call service, emit result). Total new server code: ~300-400 lines.

### Out of Scope Boundaries

- C++ ECS engine changes — it already works for NPC simulation
- Multiplayer/PvP — architecture enables it but not implementing now
- Save/load migration from localStorage to server — Phase 3 item, not in this spec
- UI changes — client refactoring is logic-only, same components

## [S3] Out of Scope

- Multiplayer/PvP combat between players
- Server-side save/load persistence (keep localStorage for now)
- UI redesign or new UI components
- C++ ECS engine modifications
- NPC LLM planning changes (existing `faction:ai-decision` pipeline untouched)
- WASM ECS client-side module removal (fire-and-forget side effects remain)
- New game features beyond wiring existing systems

## Tasks

- [x] T1: Add shared socket event type definitions to `src/shared/types/socket-events.ts` — all 16 new socket events with request/response types, compiles cleanly. (covers: S2)
- [x] T2: Implement economy socket handlers — `src/server/handlers/economy.ts` with `economy:buy`, `economy:sell`, `economy:market`, `economy:inventory`. (covers: S2; depends: T1)
- [x] T3: Implement combat socket handlers — `src/server/handlers/combat.ts` with `combat:attack`, `combat:skill`. (covers: S2; depends: T1)
- [x] T4: Implement cultivation socket handlers — `src/server/handlers/cultivation.ts` with `cultivation:cultivate`, `cultivation:breakthrough`, `cultivation:status`. (covers: S2; depends: T1)
- [x] T5: Implement diplomacy socket handlers — `src/server/handlers/diplomacy.ts` with all 6 `diplomacy:*` events. (covers: S2; depends: T1)
- [x] T6: Add `state:sync` broadcast to server game loop — emits player state + nearby monsters + combat events every 1s. (covers: S2; depends: T2, T3)
- [ ] T7: Add server-side monster spawning — spawn monsters near active players every 30s based on player realm/location. (covers: S2; depends: T6)
- [ ] T8: Add server-side market price tick — every 60s, adjust market supply/demand based on NPC trade volume from ECS. (covers: S2; depends: T2)
- [x] T9-T10: Client adapter (`serverAdapter.ts`) + state:sync listener wired into `gameStore.ts`. (covers: S2; depends: T2, T4)
- [x] T11: Client combat adapter — `interactWithNPC('攻击')` now calls `serverAttack()`. (covers: S2; depends: T3, T6)
- [x] T15: Server GameEngine.ts — unified damage formula, monster templates, realm configs, equipment generation, crafting, technique catalog (19 techniques), material drop system. (covers: S2)
- [x] T16: Crafting handler — server-side recipe validation, material consumption, equipment/pill generation. (covers: S2; depends: T15)
- [x] T17: Resource gathering handler — 灵田/矿脉/遗迹 with material drops. (covers: S2; depends: T15)
- [x] T18: Save/Load handler — server-side 5-slot persistence to `data/saves/`. (covers: S2)
- [x] T19: Technique handler — learn/upgrade/status with 19 techniques across 5 grades. (covers: S2; depends: T15)
- [ ] T12: Full client diplomacy migration. (covers: S2; depends: T5)
- [ ] T13: Wire `DeathService` and `PopulationService`. (covers: S2; depends: T6)
- [ ] T14: Update existing tests. (covers: S2; depends: T2-T12)
- [ ] T14: Update existing tests — modify `test/combat.test.ts`, `test/cultivation.test.ts`, `test/diplomacy.test.ts`, `test/economy-npc-simulation.test.ts` to test server-authoritative flows. Add socket mock tests for new handlers. Acceptance: all existing tests pass or are updated to reflect server authority, new handler tests cover happy path + error cases. (covers: S2; depends: T2-T12)
