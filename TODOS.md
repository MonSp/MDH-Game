# TODOS

## Phase 1: NPC 觉醒 — AI 原生交互闭环 ✅ DONE

**Completed:** 2026-05-04 | **评估:** 90% 完成度, ⭐⭐⭐⭐

| # | Task | Status |
|---|------|--------|
| 1.1a | 填满 `BehaviorExecutor.execute*` 9 个方法 | ✅ 全部实现 — patrol/chase/trade/compete/logistics/retreat/work/rest/flee |
| 1.1b | 接入 LLM 规划周期 | ✅ `LLMIntegrationManager.tick()` 每 5s 运行，Tier 分级冷却 |
| 1.1c | 修复 `NPCBehaviorTree` LLMPlanNode | ✅ 不再始终返回 IDLE，实际调用 `planningService.getPlan()` |
| 1.1d | 同步服务端行为到客户端 | ⚠️ 服务端有 `io.emit('npc:state-sync')` 但客户端未监听 |
| 1.1e | 行为→记忆反馈 | ✅ EventBus 监听 TRADE_COMPLETE/ATTACKED/DIED/PATROL_COMPLETE，写回 NPCMemory |
| 1.2a | 主动搭话触发 | ✅ `InitiativeService.generateInteraction()` 性格驱动 |
| 1.2b | 主动交易邀约 | ✅ 贪婪型 NPC 在近距离主动发起交易 |
| 1.2c | 主动挑衅/求助 | ✅ 高野心 NPC 挑衅、低 HP NPC 求助 |
| 1.2d | 路遇事件 | ✅ 5 种 ENCOUNTER_EVENTS，45s 冷却，完整体验流程 |
| 1.2e | 通知 UI | ⚠️ HUD 侧边栏 + Game.tsx 横幅已完成，气泡提示形态未实现 |
| 1.3a | NPC 间互动事件生成 | ✅ `checkNPCInteractions()` 4 种类型(alliance/trade/conflict/duel)，25s 冷却 |
| 1.3b | 互动可视化 | ✅ `InteractionEffectParticles` 5 种粒子特效(trade/duel/conflict/alliance/greet) |
| 1.3c | 世界事件日志 | ✅ `EventLog.tsx` 6 种类型图标/颜色/自动滚动/徽章 |
| 1.3d | Chronicle 增强 | ✅ WebSocket `/chronicle` 推送 NPC 间重大事件 |
| 1.4a | 势力 AI 决策 | ⚠️ 宣战/同盟/停战基于纯随机，未接入 LLM 评估 |
| 1.4b | 势力领土变更 | ⚠️ 资源点占领已完成，但无地图区域领土变更 |
| 1.4c | 势力间战争 | ⚠️ 宣战状态已生效，但无实际编队战斗/领土损失/国库消耗后果 |

**Tests:** 537 passed (22 files), 1 无关旧失败 (combat.test.ts)

---

## Phase 1 待修复问题（按优先级排序）

### 🔴 P0 — 客户端未消费 `npc:state-sync` (1.1d)

**问题:** 服务端每 2s 通过 Socket.IO 广播 `npc:state-sync`（所有 NPC 的位置/活动/HP/战力），但 `Game.tsx` 中没有对应的 `socket.on('npc:state-sync', ...)` 监听。
**影响:** LLM 规划的 NPC 行为**对玩家完全不可见**——玩家看到的 NPC 行为来自客户端 `gameStore.updateNPCs()` 本地计算（纯随机），服务端 NPC 的状态更新无法反映到地图上。
**修复:** 在 `Game.tsx` 添加 `socket.on('npc:state-sync', ...)` 将服务端 NPC 状态同步到 `gameStore.nearbyNPCs`。

---

### 🟡 P1 — 两套并行 LLM 规划管道 (1.1b)

**问题:** 服务端同时运行两套独立的 NPC 规划系统：
1. `LLMIntegrationManager` (server/index.ts `startGameLoop` 调用) → 通过 `NPCBehaviorTree` 评估行为
2. `NPCWorldService.tick()` → `planForNPC()` → 通过 `LLMHttpClient` 直接请求 LLM

两者各自独立运行，可能产生行为冲突。`NPCWorldService` 使用自己的 `actionType` 枚举而不通过 `NPCBehaviorTree`。
**修复:** 统一为单一规划管道，`NPCWorldService.tick()` 应委托给 `LLMIntegrationManager.getBehaviorForNPC()`。

---

### 🟡 P2 — 势力间战争无实际战斗后果 (1.4c)

**问题:** 势力 AI 决策已完成宣战状态变更，但宣战后无编队交战、领土损失、国库消耗等实际后果。目前只是外交状态标签变更 + 世界事件日志记录。
**修复:** 在 `updateNPCs()` 的 `isFactionTick` 分支中，为处于「战争」状态的势力对添加战斗结算逻辑。

---

### 🟢 P3 — 势力决策未接入 LLM (1.4a)

**问题:** 势力宣战/同盟/停战决策基于纯随机概率（2%/1.5%/3%），未如路线图要求「基于势力资源、关系和 LLM 评估」。
**修复:** 可选优化——将 LLM 引入势力 AI 决策管道。

---

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

## Phase 2 deferred items

### 2.1b: MapGenerator with kingdom-aware terrain

**What:** Create `src/server/services/MapGenerator.ts` using Perlin noise + hand-crafted region features. 1000x1000 terrain with 7 kingdoms as regions, each with distinct biome profiles (齐 plains, 楚 forests/marshes, 秦 mountains, etc.).

**Why it matters:** Current noise-based terrain is uniform. Kingdom-aware terrain gives each country a distinct visual identity and strategic feel.

---

### 2.2c: Scout role expands vision range

**What:** Squad members with scout role increase fog-of-war vision radius. If the scout is between player and a direction, reveal additional tiles in that direction.

**Why it matters:** Gives the scout squad role a concrete gameplay purpose beyond combat stats.

---

### 2.3: Pixel art style upgrade

**What:** Replace colored box geometries with pixel-art sprites (16x16 or 32x32) for characters, terrain tiles, and resources. Add particle effects for cultivation, combat, and gathering.

**Why it matters:** Visual polish — the current blocky 3D boxes are functional but not visually appealing.

---

## Mobile responsive ScenePanel

**Added:** 2026-04-30 (from /plan-design-review)
**Effort:** ~30 min

## ScenePanel keyboard navigation and screen reader support

**Added:** 2026-04-30 (from /plan-design-review)
**Effort:** ~15 min

---

## Known Technical Debt

- **客户端未监听 `npc:state-sync`:** 服务端每 2s 广播 NPC 状态，客户端无接收逻辑。LLM 驱动的 NPC 行为对玩家不可见。**P0** — 见 Phase 1 待修复。
- **双 LLM 规划管道冲突:** `LLMIntegrationManager` 和 `NPCWorldService.tick()` 各自独立规划，存在行为冲突风险。**P1** — 见 Phase 1 待修复。
- **势力间战争无实际战斗:** 宣战仅有外交状态变更，无编队交战/领土损失/国库消耗。**P2** — 见 Phase 1 待修复。
- **LLMPlanningService memory context:** NPC memory (from NPCWorldService) isn't fed back into LLM planning prompts yet — the loop is wired at the event level (EventBus) but `planningRequest.world_context` doesn't include memory data.
- **NPCWorldService NPCs:** Server-side NPC pool uses hardcoded `clanId: 'sect_main'` and is disconnected from client-side clan/diplomacy system in gameStore.
- **MapGenerator (2.1b):** Terrain is generated purely by simplex-noise without kingdom awareness. Would be enhanced with region-based terrain (plains in 赵, forests in 楚, etc.).
- **功法效果未接入属性:** `getTechniqueEffects()` 仅 UI 展示，从未叠加到 `player.stats`。**P0** — 见 Phase 3 断层。
- **装备属性未接入属性:** `equipmentSlots` 武器/护甲属性不参与战斗计算。**P0** — 见 Phase 3 断层。
- **主动技能未接入战斗:** 8 个技能的 damageMultiplier/cooldown 从未被调用。**P0** — 见 Phase 3 断层。
- **Phase 3.3 炼丹炼器零实现:** `items.ts`/`craftingRecipes.ts`/`AlchemyPanel.tsx` 均不存在。**P2** — 见 Phase 3 断层。

---

## Forward: Roadmap v2

See `docs/22-开发路线图.md` for full context.

| Phase | Theme | Priority | Est. |
|-------|-------|----------|------|
| **Phase 1** | **NPC 觉醒** | **★★★★★** | **✅ DONE (90%)** |
| Phase 2 | 世界具象化 | ★★★★☆ | ✅ DONE |
| Phase 3 | 修仙深化 — skills, equipment, crafting | ★★★★☆ | 🔄 IN PROGRESS (~55%, 致命断层) |
| Phase 4 | 战争深化 — siege, territory, armies | ★★★☆☆ | ~5 days |
| Phase 5 | 跨天统一 — ascension cross-server | ★★★☆☆ | ~5 days |
| Phase 6 | 多人联机 — multiplayer coordination | ★★☆☆☆ | ~7 days |

## Phase 3: 修仙深化 🔄 IN PROGRESS (~55%)

**评估日期:** 2026-05-04 | **分支:** feat/cultivation-depth-phase3
**结论:** 数据结构层 + UI 层基本完成，但核心游戏逻辑层（战斗接入）存在严重断层。Phase 3.3 炼丹炼器零实现。

### 完成度总览

| 子系统 | 路线图任务 | 数据/UI | 战斗接入 | 测试 | 完成度 |
|--------|-----------|---------|---------|------|--------|
| 3.1 功法技能 | 3.1a~3.1f | ✅ | ❌ | ❌ | ~75% |
| 3.2 装备扩充 | 3.2a~3.2d | ✅ | ❌ | ❌ | ~60% |
| 3.3 炼丹炼器 | 3.3a~3.3e | ❌ (0%) | ❌ | ❌ | ~5% |
| **Phase 3 整体** | | | | | **~55%** |

---

### 3.1 功法与技能系统 — ~75%

| # | Task | Status |
|---|------|--------|
| 3.1a | Technique data types | ✅ `src/shared/types/cultivation.ts` — TechniqueGrade/TechniqueType/Technique/TechniqueEffect/TechniqueSkill/LearnedTechnique interfaces |
| 3.1b | Technique acquisition | ✅ `learnTechnique()` in gameStore — realm check, cost check, slot assignment |
| 3.1c | Technique cultivation | ✅ `cultivateTechnique()` in gameStore — level-up with spirit stone cost, max level cap |
| 3.1d | Combat skills (active) | ⚠️ 8 个主动技能定义完成（炎斩/灵气护盾/地裂斩/魂火术/天刀/虚空步/混元掌/混沌元珠），但战斗代码未调用技能倍率 |
| 3.1e | SkillBar UI component | ✅ `src/components/SkillBar.tsx` — 3 tabs: learned/equipment/available, technique level-up, equipment equip/unequip |
| 3.1f | Effect system | ⚠️ `getTechniqueEffects()` 已实现效果聚合，但仅在 SkillBar 用于 UI 展示，从未应用到 `player.stats` |

---

### 3.2 装备系统扩充 — ~60%

| # | Task | Status |
|---|------|--------|
| 3.2a | Equipment types & slots | ✅ EquipmentSlot(5槽)/EquipmentRarity(4品)/RARITY_MULTIPLIER/EquipmentAffix(8词条)/Equipment interfaces |
| 3.2b | Equipment equip/unequip | ✅ `equipItem()`/`unequipItem()` in gameStore + equipmentSlots on Player |
| 3.2c | Equipment generation | ⚠️ `generateEquipment()` 按槽位/品阶/境界生成属性，但 `affixes: []` 始终空数组 |
| 3.2d | Equipment UI | ✅ SkillBar 装备标签页 — 5槽装卸显示，SquadPanel 队员装备 |

---

### 3.3 炼丹与炼器系统 — ~5%

| # | Task | Status |
|---|------|--------|
| 3.3a | 材料系统 (`src/shared/types/items.ts`) | ❌ 文件不存在。数据库中仅有 灵草/妖兽材料/灵石碎片 基础条目 |
| 3.3b | 炼丹配方 (`src/store/craftingRecipes.ts`) | ❌ 文件不存在 |
| 3.3c | 炼丹 UI (`src/components/AlchemyPanel.tsx`) | ❌ 文件不存在 |
| 3.3d | 炼器系统 | ❌ 无任何实现。`Equipment.isCrafted` 字段预留但无炼器逻辑 |
| 3.3e | 丹房/炼器房 buff | ⚠️ 丹房建筑存在，仅影响丹药使用效果(1.1x/1.2x/1.3x)，不影响炼丹成功率/品质。无炼器房建筑 |

---

### Phase 3 致命断层（按优先级）

#### 🔴 P0a — 功法效果未接入玩家属性

**问题:** `getTechniqueEffects()` 仅在 [SkillBar.tsx L27](file:///home/test/MyGame/src/components/SkillBar.tsx#L27) 调用用于 UI 展示，从未累加到 `player.stats.attack/defense/hp/mp`。学会 10 种功法对战力毫无影响。
**修复:** 在 `updateNPCs()` 或每次属性读取时调用 `getTechniqueEffects()` 并叠加到 `player.stats`。

#### 🔴 P0b — 装备属性未接入玩家属性

**问题:** `equipmentSlots` 中武器的 attack、护甲的 defense 从未累加到 `player.stats`。穿神品武器和空手战斗伤害完全相同。
**修复:** 遍历 `equipmentSlots` 将各槽 `baseStats`（含稀有度倍率）叠加到玩家属性。

#### 🔴 P0c — 主动技能未接入战斗

**问题:** 玩家战斗 [gameStore.ts L1725](file:///home/test/MyGame/src/store/gameStore.ts#L1725) 始终使用 `calculateDamage(player.stats.attack, monster.defense)`，8 个主动技能的 `damageMultiplier`/`cooldown`/`cost` 从未被调用。
**修复:** 战斗中允许玩家手动释放已装备的主动技能，应用技能倍率和冷却。

#### 🟡 P1a — 词条不随机生成

**问题:** `generateEquipment()` L534: `affixes: []`——8 种词条类型仅为接口定义，永远不会生成。`critRate`/`lifesteal`/`expRate`/`critDamage` 毫无作用。
**修复:** 按稀有度为装备随机生成 0~3 条词条。

#### 🟡 P1b — 词条效果无计算

**问题:** 即使有 affixes 数据，也无代码将 `critRate` 映射到暴击判定、`lifesteal` 映射到回血、`expRate` 映射到经验加成。
**修复:** 在战斗/经验计算中消费 affixes 数据。

#### 🟢 P2 — Phase 3.3 完全缺失

**问题:** 炼丹炼器子系统（3.3a~3.3e）代码层面零实现，仅设计文档 [15-炼丹与炼器系统.md](file:///home/test/MyGame/docs/cultivation/15-炼丹与炼器系统.md) 存在。
**修复:** 创建 `items.ts` / `craftingRecipes.ts` / `AlchemyPanel.tsx` 最小可玩循环。
