# Tasks: 经济战略层

> 为 T0-T2 高层 NPC 注入经济感知，从家族/国家层面驱动战略决策。

---

## Task 1: 新增 EconomicDigest.h — 经济态势摘要数据结构 ✅

创建 `/home/test/MyGame/src/server/game/economy/EconomicDigest.h`。

- [x] 1.1 定义 `EconomicPosture` 枚举：`Surplus` / `Balanced` / `Tight` / `Crisis`
- [x] 1.2 定义 `CommodityAlert` 结构体：commodityType, supply, demand, priceRatio, desc[32]
- [x] 1.3 定义 `TradeOpportunity` 结构体：fromClanId, toClanId, commodityType, profitRate
- [x] 1.4 定义 `EnemyWeakness` 结构体：clanId, weaknessType, desc[48]
- [x] 1.5 定义 `EconomicDigest` 主结构体：posture, treasuryBalance, weeklyIncomeRate, weeklyExpenseRate, alerts[3], opportunities[2], enemyWeaknesses[2]
- [x] 1.6 定义 `EconomicDigestWasm` 紧凑导出结构（≤256 bytes）
- [x] 1.7 实现 `computeEconomicDigest` 函数：遍历 CommodityPool 六类商品计算供需比 → 收集最严重 3 个 alert → 跨家族比价找套利机会 → 检测敌族弱点 → 判定态势 → 构造 digest
- [x] 1.8 实现 `economicPostureToString` / `commodityTypeChineseName` / `weaknessTypeToString` 辅助函数

**验证**: `static_assert(sizeof(EconomicDigestWasm) <= 256)` 通过。

---

## Task 2: 扩展 MarketRegistry.h — 经济战略层接口 ✅

修改 `/home/test/MyGame/src/server/game/economy/MarketRegistry.h`。

- [x] 2.1 新增成员 `EconomicDigest cachedDigest` + `uint64_t digestCachedFrame` + `bool digestDirty`
- [x] 2.2 在 `tickDecay()` 中标记 `digestDirty = true`（与 CachedEconSignals dirty 同步）
- [x] 2.3 实现 `getEconomicDigest(clanId, currentFrame)`：检查 TTL=600 帧 + dirty → 命中返回缓存 → 未命中调用 `computeEconomicDigest` → 写入缓存
- [x] 2.4 新增成员 `clanTaxRates_`（默认 0.05）+ `embargoTargets_`
- [x] 2.5 实现 `applyTaxRate(clanId, newRate)`：修改税率，clamp [0.01, 0.15]
- [x] 2.6 实现 `applyEmbargo(clanId, targetClan, active)` + `isEmbargoed()`：加入/移除 embargoTargets
- [x] 2.7 新增成员 `stockpileRatios_`（六类商品的储备比例，默认全 0）
- [x] 2.8 实现 `applyStockpile(clanId, type, ratio)`：修改 stockpileRatios[type]
- [x] 2.9 实现 `getEffectiveSupply(clanId, type)`：返回 `supply × (1 - stockpileRatios[type])`
- [x] 2.10 修改 `CaravanSystem::findBestRoute()`：跳过 embargoTargets 中的目标家族
- [x] 修改 `collectTax()` 使用 clanTaxRate 动态税率

**验证**: MarketRegistry 新增接口完整，CaravanSystem 编译通过。

---

## Task 3: 新增 BehaviorTree_EconomyStrategy.h — 5 种经济战略行为 ✅

创建 `/home/test/MyGame/src/server/game/npc/BehaviorTree_EconomyStrategy.h`。

- [x] 3.1 在 `NPCActivity` 枚举中新增 5 项：`SetTaxRate=103`, `TradeEmbargo=104`, `StockpileMaterial=105`, `PriceStabilize=106`, `EconomicMobilize=107`
- [x] 3.2 在 `ActivityCategory` 枚举中新增 `EconomyStrategy=8`
- [x] 3.3 实现 `exec_setTaxRate(ctx)`：读取目标税率 → `MarketRegistry::applyTaxRate`
- [x] 3.4 实现 `exec_tradeEmbargo(ctx)`：读取目标家族 ID → `MarketRegistry::applyEmbargo`
- [x] 3.5 实现 `exec_stockpileMaterial(ctx)`：读取最紧缺商品类型 → `MarketRegistry::applyStockpile`，默认比例 30%
- [x] 3.6 实现 `exec_priceStabilize(ctx)`：短缺时 Treasury 溢价 120% 收購（最多 30% 余额或 300 灵石上限）；过剩时折价 80% 抛售
- [x] 3.7 实现 `exec_economicMobilize(ctx)`：读取最紧缺商品 → 遍历全族 NPC → `setTemporaryBoost(activity, 0.5, expireFrame)` → 300 帧后过期
- [x] 3.8 实现 `canExecute_*` 前置检查（层 0=SetTaxRate/TradeEmbargo, 层 1=Stockpile/PriceStabilize, 层 2=EconomicMobilize）

**验证**: 行为文件完整，可被 kExecuteTable 索引。

---

## Task 4: 扩展 BehaviorTreeSystem.h — 经济危机决策层 + 行为注册 ✅

修改 `/home/test/MyGame/src/server/game/npc/BehaviorTreeSystem.h`。

- [x] 4.1 实现 `evaluateEconomicCrisis(ctx)` 函数：检查 NPC 层级 ≤ 2 → posture == Crisis → T1 级：价格平準 + 经济动员，T2 级：仅经济动员 → 通过 `setTemporaryBoost` 应用 → 返回 false（不短路，允许后续层继续执行）
- [x] 4.2 在 `kEvaluateLayers[]` 中插入 `evaluateEconomicCrisis` 位于 `evaluateEmotion` 和 `evaluateCommand` 之间
- [x] 4.3 在 `kExecuteTable[]` 中注册 5 种新行为（category=EconomyStrategy, REQ_IDENTITY）
- [x] 4.4 在 `#include` 块中添加 `BehaviorTree_EconomyStrategy.h`（EconomicDigest.h 通过 MarketRegistry.h 间接引入）
- [x] 4.5 经济动员权重过期通过 `ReflectionData::setTemporaryBoost` 的 `boostExpireFrame` 机制自动处理

**验证**: kEvaluateLayers 数组新增 1 层（8 层），kExecuteTable 新增 5 行。

---

## Task 5: 扩展 BehaviorTree_Command.h + LLMComponent — 经济战略指令支持 ✅

修改 LLM 指令映射和 ActionType 枚举。

- [x] 5.1 在 `ActionType` 枚举中新增 5 项：`ECONOMIC_MOBILIZE=32`, `TRADE_EMBARGO=33`, `STOCKPILE_MATERIAL=34`, `PRICE_STABILIZE=35`, `SET_TAX_RATE=36`
- [x] 5.2 在 `translateActionType` 中新增对应的 5 个 NPCActivity 映射
- [x] 5.3 动员权重通过 `setTemporaryBoost` 与 `economicBiasFor` 叠加（TemporaryBoost 修改基线权重，economicBiasFor 额外乘算）

**验证**: translateActionType 可正确映射所有经济战略 ActionType。

---

## Task 6: 扩展 wasm_exports.cpp — 新增 ecs_getEconomicDigest 导出 ✅

修改 `/home/test/MyGame/tools/ecs-wasm/src/wasm_exports.cpp`。

- [x] 6.1 实现 `ecs_getEconomicDigest(clanId, outDigest)` 导出函数
- [x] 6.2 调用 `MarketRegistry::getEconomicDigest` + `digestToWasm` 写入紧凑结构
- [x] 6.3 blockworld-wasm 副本未同步（若需可后续追加）

**验证**: WASM 导出函数签名与 TS 端 CGetEconomicDigestFn 类型一致。

---

## Task 7: 扩展 ECSWasmLoader.ts — TS 端经济摘要读取封装 ✅

修改 `/home/test/MyGame/src/ecs/ECSWasmLoader.ts`。

- [x] 7.1 定义 `EconomicDigestWasm` 接口 + `EconomicAlertWasm` / `EconomicOpportunityWasm` / `EconomicWeaknessWasm` 子接口
- [x] 7.2 实现 `wasmGetEconomicDigest(clanId: string): EconomicDigestWasm | null`
- [x] 7.3 在函数内部直接解析 WASM 二进制布局（offset 计算匹配 C++ 侧 `EconomicDigestWasm` 结构）
- [x] 7.4 导出 `ECONOMIC_POSTURE_LABELS` 中文态势映射表
- [x] 在 `initECSWasm` 中加载 `_ecs_getEconomicDigest`
- [x] 在 NPCActivity 映射表中新增 5 个条目 + SocialHelp

**验证**: wasmGetEconomicDigest 返回的 EconomicDigestWasm 对象结构完整。

---

## Task 8: 扩展 LLMPlanningService.ts — LLM Prompt 注入经济摘要 ✅

修改 `/home/test/MyGame/src/server/game/services/LLMPlanningService.ts`。

- [x] 8.1 导入 `EconomicDigestWasm`, `ECONOMIC_POSTURE_LABELS`, `wasmGetEconomicDigest`
- [x] 8.2 实现 `formatEconomicDigestForPrompt(digest, tier)` 静态方法：
  - T0：完整摘要（态势 + 警报 + 套利机会 + 敌族弱点）
  - T1+：态势 + 警报
- [x] 8.3 `buildPlanPromptWithFrontline` 新增可选参数 `economicDigestText`，拼接在 frontlineSummary 之后
- [x] 8.4 态势为 Balanced 且无警报时仅输出一行 "经济态势：正常，无需特别关注"
- [x] 8.5 `deriveEconomicIntent` 未单独实现（通过 prompt 中的经济情报 + 意图式规划框架，LLM 可自行推断战略意图）

**验证**: `formatEconomicDigestForPrompt` 返回符合 spec 定义的格式化文本。

---

# Task Dependencies（全部完成）

```
Task 1 (EconomicDigest.h) ✅
  ├── Task 2 (MarketRegistry 扩展) ✅
  │     ├── Task 3 (BehaviorTree_EconomyStrategy.h) ✅
  │     │     ├── Task 4 (BehaviorTreeSystem 扩展) ✅
  │     │     └── Task 5 (LLMComponent/Command 扩展) ✅
  │     └── Task 6 (wasm_exports 扩展) ✅
  │           ├── Task 7 (ECSWasmLoader.ts) ✅
  │           └── Task 8 (LLMPlanningService.ts) ✅
```
