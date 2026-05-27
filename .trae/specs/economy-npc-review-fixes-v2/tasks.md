# Tasks

## P0：必须立即修复（经济系统核心数值 bug）

- [x] Task 1: 修复 `collectTax` 双重征税 — P0
  - [x] 1.1 修改 `MarketRegistry.h` 中 `recordProduction` 的 SpiritStones 税：移除 `income * 0.05f` 的预计算，改为直接传入 `income` 作为税前交易额给 `collectTax`
  - [x] 1.2 修改 `recordConsumption` 的 SpiritStones 税：同上，传入 `amount * price` 给 `collectTax`，不再预乘 0.05
  - [x] 1.3 确认 `collectTax` 内部逻辑不变（`amount * rate`），语义为"对交易额征税"
  - **验证**: 5% 税率下卖出 40 灵石，Treasury 增加 2 灵石（而非 0.1）

- [x] Task 2: 修复 `exec_buy` 不扣灵石 — P0
  - [x] 2.1 修改 `BehaviorTree_Production.h` 中 `exec_buy`：在购买前计算 `cost = exec_randRange(10, 100)`
  - [x] 2.2 检查 `resources->spiritStones >= cost`，不足时 `behavior->changeActivity(NPCActivity::Rest)` 并 return
  - [x] 2.3 充足时调用 `resources->removeSpiritStones(cost)` 扣除灵石
  - [x] 2.4 然后再执行 `MarketRegistry::recordConsumption` 和 `recordProduction` 和 `addItem`
  - **验证**: 灵石为 0 的 NPC 无法购买装备

- [x] Task 3: 将 `tickDecay` 从 `evaluateDaily` 移到全局调用 — P0
  - [x] 3.1 在 `BehaviorTreeSystem.h` 的 `evaluate()` 方法开头（所有 NPC 共享的入口），将 `MarketRegistry::getInstance().tickDecay(ctx.currentTime)` 移除
  - [x] 3.2 新增 `BehaviorTreeSystem::globalTick(uint64_t currentFrame)` 静态方法，内部调用 `MarketRegistry::getInstance().tickDecay(currentFrame)`
  - [x] 3.3 在游戏主循环（或 TS 服务层 NPCWorldService.ts 的 tick 函数）中每帧调用一次 `BehaviorTreeSystem::globalTick(currentFrame)`
  - **验证**: 10K NPC 场景下 `frameCounter_` 每帧只 +1，需求衰减每 600 帧触发一次

## P1：灵石溢出修复

- [x] Task 4: 修复 `exec_sell` 灵石产出失控 — P1
  - [x] 4.1 修改 `BehaviorTree_Production.h` 中 `exec_sell`：移除 `MarketRegistry::recordProduction(ctx.entityId, CommodityType::SpiritStones, exec_randRange(10, 50))`
  - [x] 4.2 改为直接 `resources->addSpiritStones(exec_randRange(10, 50))`，不经过 `recordProduction`（避免 amount×price 乘法）
  - [x] 4.3 保留 `MarketRegistry::recordConsumption(ctx.entityId, CommodityType::Equipment, 1)` 记录装备需求
  - **验证**: 卖出装备获得 10-50 灵石（固定范围，不受市价影响）

- [x] Task 5: 修复 `exec_bargain` 纯收益行为 — P1
  - [x] 5.1 修改 `BehaviorTree_Production.h` 中 `exec_bargain`：在 `recordConsumption` 前检查 `resources->spiritStones >= basePrice * 0.7f`
  - [x] 5.2 不足时 `behavior->changeActivity(NPCActivity::Rest)` 并 return
  - [x] 5.3 充足时调用 `resources->removeSpiritStones(basePrice * 0.7f)` 扣除消费
  - [x] 5.4 产出侧改为直接 `resources->addSpiritStones(finalPrice)`，不经过 `recordProduction`
  - **验证**: 灵石不足的 NPC 无法议价；议价不再是纯收益行为

- [x] Task 6: 重写 `exec_setTaxRate` 税率计算 — P1
  - [x] 6.1 修改 `BehaviorTree_EconomyStrategy.h` 中 `exec_setTaxRate`：移除灵石余额模运算
  - [x] 6.2 从 `MarketRegistry::getEconomicDigest` 获取当前态势
  - [x] 6.3 基于态势决定基准税率：Crisis→12%, Tight→8%, Balanced→5%, Surplus→3%
  - [x] 6.4 性格修正：`greed > 70` 税率 +3%，`ambition > 70` 税率 +2%（倾向高税充实国库）
  - [x] 6.5 最终税率 clamp 到 [1%, 15%]
  - **验证**: Crisis 态势下 T0 设税约 12-15%；Surplus 态势下约 1-5%

## P2：架构优化

- [x] Task 7: 实现 `EconomicDigest` 收支率动态计算 — P2
  - [x] 7.1 在 `MarketRegistry.h` 中新增 `treasuryIncomeAccumulator_` 和 `treasuryExpenseAccumulator_`（int64_t），以及 `lastDigestFrame_`
  - [x] 7.2 在 `collectTax` 中累加 `treasuryIncomeAccumulator_ += tax`
  - [x] 7.3 在 `spendTreasury` 中累加 `treasuryExpenseAccumulator_ += amount`
  - [x] 7.4 在 `computeEconomicDigest` 中：如果距离上次 Digest 超过 600 帧，用累加器计算 `weeklyIncomeRate` 和 `weeklyExpenseRate`，然后重置累加器
  - **验证**: Treasury 收支率反映实际变动，而非硬编码 350/400

- [x] Task 8: 优化 `evaluateEconomicCrisis` 全实体遍历 — P2
  - [x] 8.1 在 `MarketRegistry.h` 中新增 `std::unordered_map<std::string, std::vector<ECS::EntityId>> clanMembers_` 反向索引
  - [x] 8.2 在 `recordProduction`/`recordConsumption` 中，首次遇到新 entityId 时将其加入 `clanMembers_[clanId]`
  - [x] 8.3 修改 `BehaviorTreeSystem.h` 中 `evaluateEconomicCrisis`：用 `clanMembers_[clanId]` 替代 `getEntitiesWithComponent<IdentityComponent>()` 全遍历
  - [x] 8.4 同步修改 `BehaviorTree_EconomyStrategy.h` 中 `exec_economicMobilize` 的全实体遍历
  - **验证**: 危机触发时同族成员查找从 O(N) 降为 O(clanMembers)

- [x] Task 9: 修正 `evaluateEconomicCrisis` 返回值 — P2
  - [x] 9.1 修改 `BehaviorTreeSystem.h` 中 `evaluateEconomicCrisis`：在 T1 执行价格平準后返回 `true`（阻断后续层）
  - [x] 9.2 T2 仅执行动员（设置 boost），也返回 `true`
  - [x] 9.3 T0 不在 EconomicCrisis 层处理（T0 走 LLM 路径），保持返回 `false`
  - **验证**: T1/T2 在 Crisis 期间不再继续走到 Daily 层选择其他行为

- [x] Task 10: 清理死代码 — P2
  - [x] 10.1 删除 `BehaviorTree_Production.h` 末尾的 `kProductionTable[]` 数组（L260-276）
  - [x] 10.2 删除 `BehaviorTreeSystem.h` 中 `EconomicSignals::computeFromHeritage` 方法（L131-146）
  - [x] 10.3 确认无其他文件引用这些被删除的代码
  - **验证**: 编译通过，无未定义符号

- [x] Task 11: 修复 `MarketService.ts` 初始 demand 不一致 — P2
  - [x] 11.1 修改 `MarketService.ts` 构造函数：`this.demands[key] = 0`（从 50 改为 0，与 C++ 端 CommodityPool 初始值一致）
  - **验证**: TS 端和 C++ 端初始定价结果一致

## P3：防御性改进

- [x] Task 12: 修复 `setFactionAffinity` 步进更新逻辑 — P3
  - [x] 12.1 修改 `RelationshipComponent.h` 中 `setFactionAffinity`：找到已有条目时直接 `factionAffinities[i] = affinity`（一步到位）
  - [x] 12.2 保留 clamp 逻辑（如果需要限制范围）
  - **验证**: 调用 `setFactionAffinity(A, B, -40)` 后立即生效，无需调用 40 次

- [x] Task 13: 为 `tickEmotions` 添加 deltaTime 尖峰保护 — P3
  - [x] 13.1 修改 `SocialComponent.h` 中 `tickEmotions`：`effectiveFrames` clamp 到 `[0.0f, 10.0f]`（即最大衰减 0.995^10 ≈ 0.95）
  - **验证**: 即使 deltaTime=1s（60 帧），情绪也只衰减约 5% 而非 26%

# Task Dependencies
- Task 1（双重征税）不依赖其他任务，可独立执行
- Task 2（exec_buy）不依赖其他任务，可独立执行
- Task 3（tickDecay）不依赖其他任务，可独立执行
- Task 4（exec_sell）不依赖其他任务，可独立执行
- Task 5（exec_bargain）不依赖其他任务，可独立执行
- Task 6（exec_setTaxRate）依赖 Task 7（需要 EconomicDigest 的动态收支率来判断态势）
- Task 7（收支率）不依赖其他任务，可独立执行
- Task 8（反向索引）不依赖其他任务，可独立执行
- Task 9（返回值）依赖 Task 8（使用同一文件 BehaviorTreeSystem.h）
- Task 10（死代码）依赖 Task 9（都在 BehaviorTreeSystem.h 中修改）
- Task 11-13 无依赖，可独立执行

# 可并行执行组
**第一组（无依赖，可并行）**: Task 1, Task 2, Task 3, Task 4, Task 5, Task 7, Task 8, Task 11, Task 12, Task 13
**第二组（依赖第一组）**: Task 6（依赖 Task 7）, Task 9（依赖 Task 8）
**第三组（依赖第二组）**: Task 10（依赖 Task 9）
