# TODOS

## Phase 1: NPC 觉醒 — AI 原生交互闭环 ✅ DONE

**Completed:** 2026-05-05 | **评估:** 100% 完成度, ⭐⭐⭐⭐⭐

| # | Task | Status |
|---|------|--------|
| 1.1a | 填满 `BehaviorExecutor.execute*` 9 个方法 | ✅ 全部实现 — patrol/chase/trade/compete/logistics/retreat/work/rest/flee |
| 1.1b | 接入 LLM 规划周期 | ✅ `LLMIntegrationManager.tick()` 每 5s 运行，Tier 分级冷却 |
| 1.1c | 修复 `NPCBehaviorTree` LLMPlanNode | ✅ 不再始终返回 IDLE，实际调用 `planningService.getPlan()` |
| 1.1d | 同步服务端行为到客户端 | ✅ `Game.tsx` 监听 `npc:state-sync`，合并到 `nearbyNPCs`，广播扩展含完整字段 |
| 1.1e | 行为→记忆反馈 | ✅ EventBus 监听 TRADE_COMPLETE/ATTACKED/DIED/PATROL_COMPLETE，写回 NPCMemory |
| 1.2a | 主动搭话触发 | ✅ `gameService.ts` generateInteraction() 性格驱动 |
| 1.2b | 主动交易邀约 | ✅ 贪婪型 NPC 在近距离主动发起交易 |
| 1.2c | 主动挑衅/求助 | ✅ 高野心 NPC 挑衅、低 HP NPC 求助 |
| 1.2d | 路遇事件 | ✅ 5 种 ENCOUNTER_EVENTS，45s 冷却，完整体验流程 |
| 1.2e | 通知 UI | ✅ HUD 侧边栏 + Game.tsx 横幅 + 浮动气泡提示（greeting/trade/challenge/plea 四色图标，4s 自动淡出） |
| 1.3a | NPC 间互动事件生成 | ✅ `checkNPCInteractions()` 4 种类型(alliance/trade/conflict/duel)，25s 冷却 |
| 1.3b | 互动可视化 | ✅ `InteractionEffectParticles` 5 种粒子特效(trade/duel/conflict/alliance/greet) |
| 1.3c | 世界事件日志 | ✅ `EventLog.tsx` 6 种类型图标/颜色/自动滚动/徽章 |
| 1.3d | Chronicle 增强 | ✅ WebSocket `/chronicle` 推送 NPC 间重大事件 |
| 1.4a | 势力 AI 决策 | ✅ LLM驱动(异步Socket.IO) + 随机回退, 冷却/队列/None跳过 |
| 1.4b | 势力领土变更 | ✅ 地图上每个势力根据 type 显示彩色领地圈（皇族8/1级5/2级3/3级2），7国各有颜色 |
| 1.4c | 势力间战争 | ✅ Phase 4 已实现 siege combat + army grouping + garrison/fortification + vassal tribute + warPanel |

**Tests:** 651 passed (29 files), 0 失败

---

## Phase 2: 世界具象化 — 2.5D Real World (世界具象化) ✅ DONE

**Completed:** 2026-05-04 | **分支:** feat/world-rendering-phase2

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

## Forward: Roadmap v2

See `docs/22-开发路线图.md` for full context.

| Phase | Theme | Priority | Est. |
|-------|-------|----------|------|
| **Phase 1** | **NPC 觉醒** | **★★★★★** | **✅ DONE (100%)** |
| Phase 2 | 世界具象化 | ★★★★☆ | ✅ DONE |
| Phase 3 | 修仙深化 — skills, equipment, crafting, alchemy, forging | ★★★★☆ | 🔄 IN PROGRESS (~92%, 3.1/3.2/3.3 全部完成) |
| Phase 4 | 战争深化 — siege, territory, armies | ★★★☆☆ | ✅ DONE |
| Phase 5 | 跨天统一 — ascension cross-server | ★★★☆☆ | ~5 days |
| Phase 6 | 多人联机 — multiplayer coordination | ★★☆☆☆ | ~7 days |

## Phase 3: 修仙深化 🔄 IN PROGRESS (~92%)

**评估日期:** 2026-05-05 | **分支:** main
**更新:** 3.1 功法技能 + 3.2 装备扩充已基本完成。3.3 炼丹炼器系统全部完成 — 6 丹方 + 6 炼器配方、成功率计算、炼丹炉/炼器房 buff、完整 UI 面板。

### 完成度总览

| 子系统 | 路线图任务 | 战斗接入 | 测试 | 完成度 |
|--------|-----------|---------|------|--------|
| 3.1 功法技能 | 3.1a~3.1f | ✅ P0a+P0c 已修复 | ✅ | ~85% |
| 3.2 装备扩充 | 3.2a~3.2d | ✅ P0b+P1a+P1b 已修复 | ✅ 10 新测试 | ~90% |
| 3.3 炼丹炼器 | 3.3a~3.3e | ✅ 全部完成 | ✅ 19 新锻造测试 | ~100% |
| **Phase 3 整体** | | | | **~92%** |

---

### 3.1 功法与技能系统 — ~85%

| # | Task | Status |
|---|------|--------|
| 3.1a | Technique data types | ✅ `src/shared/types/cultivation.ts` — TechniqueGrade/TechniqueType/Technique/TechniqueEffect/TechniqueSkill/LearnedTechnique interfaces |
| 3.1b | Technique acquisition | ✅ `learnTechnique()` in gameStore — realm check, cost check, slot assignment |
| 3.1c | Technique cultivation | ✅ `cultivateTechnique()` in gameStore — level-up with spirit stone cost, max level cap |
| 3.1d | Combat skills (active) | ✅ 8 个主动技能已接入战斗 — 自动选择最优技能（最高倍率），应用冷却/MP消耗，日志含技能名 |
| 3.1e | SkillBar UI component | ✅ `src/components/SkillBar.tsx` — 3 tabs: learned/equipment/available, technique level-up, equipment equip/unequip |
| 3.1f | Effect system | ✅ `getTechniqueEffects()` 已在战斗计算中叠加到有效攻击/防御 |

---

### 3.2 装备系统扩充 — ~90%

| # | Task | Status |
|---|------|--------|
| 3.2a | Equipment types & slots | ✅ EquipmentSlot(5槽)/EquipmentRarity(4品)/RARITY_MULTIPLIER/EquipmentAffix(8词条)/Equipment interfaces |
| 3.2b | Equipment equip/unequip | ✅ `equipItem()`/`unequipItem()` in gameStore + equipmentSlots on Player |
| 3.2c | Equipment generation | ✅ `generateEquipment()` 按槽位/品阶/境界生成属性，按稀有度随机生成 0~3 条词条（P1a 已修复） |
| 3.2d | Equipment UI | ✅ SkillBar 装备标签页 — 5槽装卸显示，SquadPanel 队员装备 |

---

### 3.3 炼丹与炼器系统 — ~100%

| # | Task | Status |
|---|------|--------|
| 3.3a | 材料系统 (`src/shared/types/items.ts`) | ✅ `ItemQuality`/`PillEffect`/`CraftRecipe` 类型定义，支撑炼丹+炼器系统 |
| 3.3b | 炼丹配方 (`src/store/craftingRecipes.ts`) | ✅ 6 种丹方 + 6 种炼器配方，`attemptCraft()` 含成功率计算和境界过滤，`FORGE_RECIPE_META` 装备参数映射 |
| 3.3c | 炼丹 UI (`src/components/AlchemyPanel.tsx`) | ✅ Modal 面板：丹方列表/材料检查/炼制按钮/成功率显示/结果反馈/背包摘要 |
| 3.3d | 炼器系统 | ✅ 6 配方（精铁剑→天玄神甲），`forgeCraft` action 自动装备，`ForgePanel.tsx` UI，炼器房 buff，19 测试 |
| 3.3e | 丹房/炼器房 buff | ✅ 丹房/炼器房等级加成（每级 +10%），上限 95%。UI 显示当前 buff 状态 |

---

### Phase 3 状态总览

#### ✅ P0a — 功法效果未接入玩家属性 (已修复)

#### ✅ P0b — 装备属性未接入玩家属性 (已修复)

#### ✅ P0c — 主动技能未接入战斗 (已修复)

#### ✅ P1a — 词条不随机生成 (已修复)

**问题:** `generateEquipment()` 原设 `affixes: []`——8 种词条类型仅为接口定义，永远不会生成。
**修复:** 按稀有度随机生成 0~3 条词条，无重复，value 按 baseValue+rarity 缩放，含 label 显示文本。

#### ✅ P1b — 词条效果无计算 (已修复)

**问题:** `critRate`/`lifesteal`/`expRate`/`critDamage` 无接入任何游戏逻辑。
**修复:** 战斗循环中: `critRate`→暴击判定(1.5x 倍率,可叠加 critDamage), `lifesteal`→按伤害百分比回血, `expRate`→经验加成系数。

#### ✅ P2 — Phase 3.3 炼丹+炼器全部完成

**完成:** 6 丹方 + 6 炼器配方、`attemptCraft()` 通用成功率计算、炼丹炉/炼器房 buff、`ForgePanel`/`AlchemyPanel` 双 UI 面板、完整测试覆盖。
**炼器特性:** 自动装备到对应槽位、`isCrafted` 标记、6 境界等级配方链、炼器房建筑 buff（每级 +10%）。
