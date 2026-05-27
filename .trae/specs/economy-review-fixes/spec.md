# 经济系统评审迭代改进 Spec

## Why
在完成经济市场引擎 V1 并经过全面代码评审后，发现 8 个需要修复的问题：2 个高优先级（税收计算不一致、前端市场与 CommodityPool 脱节）、3 个中优先级（Cook 亏损、EconomicSignals 重复计算、Farm 产出范围不一致）、3 个低优先级（WASM 字符串未终止、商队利润归属不明确、cooldown key 碰撞风险）。本次迭代将修复这些问题，提升系统稳定性和数据一致性。

## What Changes
- 统一 `recordProduction` 与 `recordConsumption` 中 SpiritStones 税收基准
- 前端 `MarketPanel` 买卖操作通过 WASM 回写 C++ CommodityPool
- Cook 行为产出从"消耗 2 Food → 产出 1 Food"改为 ≥2 产出
- MarketRegistry 层级缓存 EconomicSignals（TTL 10 帧），避免逐 NPC 重复计算
- exec_farm 产出范围从 [20,60] 统一为 [30,60]
- WASM 字符串写入后追加 null 终止符
- CaravanSystem 利润归属明确为 fromClan 的 Treasury
- CaravanSystem cooldown key 使用分隔符 `\x01` 防止碰撞

## Impact
- Affected specs: economy-market-engine
- Affected code:
  - C++ 修改: `MarketRegistry.h`, `CaravanSystem.h`, `BehaviorTree_Production.h`, `BehaviorTreeSystem.h`
  - TS 修改: `ECSWasmLoader.ts`, `gameStore.ts`

## ADDED Requirements

### Requirement: SpiritStones Tax Base Unification
系统 SHALL 在 `recordProduction` 和 `recordConsumption` 中使用统一的税收基准 `amount × currentPrice`。

#### Scenario: recordProduction with SpiritStones
- **WHEN** `recordProduction(entityId, SpiritStones, amount)` 被调用且需要抽税
- **THEN** 税收 = `amount × PriceEngine::getPrice(pool, SpiritStones) × 0.05`

#### Scenario: recordConsumption with SpiritStones
- **WHEN** `recordConsumption(entityId, SpiritStones, amount)` 被调用且需要抽税
- **THEN** 税收 = `amount × PriceEngine::getPrice(pool, SpiritStones) × 0.05`

---

### Requirement: Frontend Market Write-back to CommodityPool
系统 SHALL 在玩家进行买卖操作时将供需变化回写到 C++ 侧 CommodityPool。

#### Scenario: Player buys item
- **WHEN** 玩家在 MarketPanel 中成功购买商品
- **THEN** 调用 WASM `ecs_recordMarketTransaction(clanId, commodityType, amount)` 更新对应 CommodityPool
- **THEN** WASM 侧增加该商品的 demand，减少 supply

#### Scenario: Player sells item
- **WHEN** 玩家在 MarketPanel 中成功出售商品
- **THEN** 调用 WASM 更新对应 CommodityPool，增加 supply，减少 demand

#### Scenario: WASM not available
- **WHEN** WASM 不可用
- **THEN** 玩家买卖仅影响前端 stock，不影响 CommodityPool，静默降级

---

### Requirement: Cook Behavior Profit Fix
`exec_cook` SHALL 消耗 2 Food 且产出 Food 量不低于消耗量，确保 NPC 从烹饪中获益。

#### Scenario: Cook completion
- **WHEN** NPC 完成一次烹饪（`activityProgress >= 1.0f`）
- **THEN** `recordConsumption(Food, 2)`, `recordProduction(Food, rand(2, 3))`
- **THEN** 个人收益 = 产出 × FoodPrice − 2 × FoodPrice（正期望值）

---

### Requirement: Cached EconomicSignals
MarketRegistry SHALL 维护缓存的经济信号，每 10 帧或首次访问后刷新，避免每个 NPC 每帧重复计算。

#### Scenario: evaluateDaily reads signals
- **WHEN** `evaluateDaily` 调用经济信号
- **THEN** 调用 `MarketRegistry::getEconomicSignals(clanId)` 获取缓存值
- **THEN** 若缓存已过 TTL（10 帧），重新计算并缓存；否则直接返回

#### Scenario: Economy tick decays demand and invalidates cache
- **WHEN** `tickDecay` 执行衰减操作
- **THEN** 对应 clanId 的 EconomicSignals 缓存标记为 dirty，下次访问时重新计算

---

### Requirement: Farm Output Range Correction
`exec_farm` SHALL 产出 Food 量范围与文档一致：`[30, 60]`。

#### Scenario: Farm completion
- **WHEN** NPC 完成耕作
- **THEN** `recordProduction(Food, rand(30, 60))`

---

## MODIFIED Requirements

### Requirement: CaravanSystem Profit Destination Clarification
商队利润 SHALL 存入出发家族（fromClan）的 Treasury。

#### Scenario: Caravan completes route
- **WHEN** 商队完成套利
- **THEN** 利润存入 `fromClan` 的 Treasury，而非 `toClan`

### Requirement: CaravanSystem Cooldown Key Safety
商队 cooldown key SHALL 使用分隔符 `\x01` 替代 `_` 和 `->`，防止家族名称中的特殊字符导致 key 碰撞。

#### Scenario: Cooldown check
- **WHEN** 检查路线 cooldown
- **THEN** key 格式为 `fromClan + "\x01" + toClan + "\x01" + commodityIndex`

### Requirement: WASM String Null Termination
`wasmGetMarketPrice` 和 `wasmGetCommodityPool` SHALL 在写入 clanId 字符串后追加 null 终止符。

#### Scenario: WASM string preparation
- **WHEN** 准备调用 WASM 函数传递 clanId
- **THEN** HEAPU8 写入 bytes 后追加 `HEAPU8[tmpBuf + bytes.length] = 0`
