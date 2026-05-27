# Tasks

- [x] Task 1: 统一 SpiritStones 税收基准
  - [x] 1.1 修改 `MarketRegistry.h` 中 `recordProduction` 的 SpiritStones 税：税收 = `amount × price × 0.05`（当前已是此逻辑，确认不变）
  - [x] 1.2 修改 `MarketRegistry.h` 中 `recordConsumption` 的 SpiritStones 税：从 `amount × 0.05` 改为 `amount × PriceEngine::getPrice(pool, SpiritStones) × 0.05`
  - **验证**: 编译通过，Sell/Buy/Trade/Bargain 行为税收计算统一

- [x] Task 2: 前端市场买卖回写 WASM CommodityPool
  - [x] 2.1 在 `wasm_exports.cpp` 中新增 `ecs_recordMarketTransaction(clanId, commodityType, amount, isBuy)` 导出函数
  - [x] 2.2 在 `ECSWasmLoader.ts` 中新增 `wasmRecordMarketTransaction` 封装函数
  - [x] 2.3 修改 `gameStore.ts` 的 `buyItem` / `sellItem`：成功后调用 wasmRecordMarketTransaction（WASM 不可用时静默跳过）
  - **验证**: 玩家买卖后 WASM CommodityPool 供需变化

- [x] Task 3: 修复 Cook 行为亏损问题
  - [x] 3.1 修改 `BehaviorTree_Production.h` 中 `exec_cook`：产出量从 `1` 改为 `exec_randRange(2, 3)`
  - **验证**: NPC Cook 行为净产出 ≥ 消耗

- [x] Task 4: EconomicSignals 缓存优化
  - [x] 4.1 在 `MarketRegistry.h` 中添加 `CachedEconSignals` 结构体（含 `EconomicSignals` + `cachedFrame` + `dirty`）
  - [x] 4.2 添加 `getEconomicSignals(clanId, currentFrame)` 方法：TTL=100，dirty 时或超时时重新计算
  - [x] 4.3 `tickDecay` 执行衰减时将同 clanId 的缓存标记 dirty
  - [x] 4.4 修改 `BehaviorTreeSystem.h` 的 `evaluateDaily`：改为调用 `MarketRegistry::getEconomicSignals()` 替代直接 `computeFromMarket`
  - **验证**: 编译通过，同一帧内多个 NPC 复用同一份 EconomicSignals

- [x] Task 5: 修正 exec_farm 产出范围
  - [x] 5.1 修改 `BehaviorTree_Production.h` 中 `exec_farm`：`exec_randRange(20, 60)` → `exec_randRange(30, 60)`
  - **验证**: 与文档一致

- [x] Task 6: 修复 WASM 字符串 null 终止
  - [x] 6.1 修改 `ECSWasmLoader.ts` 中 `wasmGetMarketPrice`：`HEAPU8.set(bytes.slice(0, 64), tmpBuf)` 后追加 `HEAPU8[tmpBuf + bytes.length] = 0`
  - [x] 6.2 修改 `ECSWasmLoader.ts` 中 `wasmGetCommodityPool`：同上
  - **验证**: WASM 函数正确读取 clanId

- [x] Task 7: 商队利润归属修正
  - [x] 7.1 修改 `CaravanSystem.h` 中 `executeRoute`：利润存入 `fromClan` 的 Treasury（`collectTax(route.fromClan, profit)`）
  - **验证**: 编译通过，商队利润归出发家族

- [x] Task 8: 商队 cooldown key 安全性修复
  - [x] 8.1 修改 `CaravanSystem.h` 中 key 生成：`fromClan + "→" + toClan + "_" + commodityIndex` → `fromClan + "\x01" + toClan + "\x01" + commodityIndexStr`
  - [x] 8.2 同步修改 `findBestRoute` 中的 key 查询逻辑
  - **验证**: 编译通过，key 使用统一分隔符

# Task Dependencies
- Task 2 依赖 Task 1（前端回写需要税收基准已统一，但可并行开发）
- Task 4 依赖 Task 1（缓存层依赖 MarketRegistry）
- Task 7 依赖 Task 8（同一文件 CaravanSystem.h，建议一起改）
- Task 3、5、6、8 无依赖，可并行

# 可并行执行组
**第一组（无依赖，可并行）**: Task 1, Task 3, Task 5, Task 6, Task 8
**第二组（依赖 Task 1）**: Task 4
**第三组（依赖 Task 1）**: Task 2
**第四组（依赖 Task 8 或合并）**: Task 7
