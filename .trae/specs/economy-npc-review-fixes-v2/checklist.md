# Checklist

## P0：经济系统核心数值

- [x] `MarketRegistry.h` 中 `recordProduction` 对 SpiritStones 的税收只经过 `collectTax` 一次乘法（`income × rate`），不再预乘 0.05
- [x] `MarketRegistry.h` 中 `recordConsumption` 对 SpiritStones 的税收同上
- [x] 5% 默认税率下：NPC 卖出 1 件装备获得 ~40 灵石时，Treasury 增加 ~2 灵石
- [x] 15% 高税率下：NPC 卖出 1 件装备获得 ~40 灵石时，Treasury 增加 ~6 灵石
- [x] `BehaviorTree_Production.h` 中 `exec_buy` 在购买前检查 `resources->spiritStones >= cost`
- [x] `exec_buy` 灵石不足时切换为 Rest，不产生装备
- [x] `exec_buy` 灵石充足时调用 `removeSpiritStones(cost)` 扣除灵石
- [x] `BehaviorTreeSystem.h` 中 `evaluateDaily` 不再调用 `tickDecay`
- [x] `BehaviorTreeSystem` 新增 `globalTick` 静态方法，内部调用 `tickDecay`
- [x] 游戏主循环每帧只调用一次 `globalTick`（而非每个 NPC 调用一次）

## P1：灵石溢出

- [x] `exec_sell` 产出灵石为固定范围 `randRange(10, 50)`，不经过 `recordProduction` 的 amount×price 乘法
- [x] `exec_sell` 仍通过 `recordConsumption` 记录装备需求变化
- [x] `exec_bargain` 在消费前检查 `resources->spiritStones >= basePrice * 0.7`
- [x] `exec_bargain` 灵石不足时切换为 Rest
- [x] `exec_bargain` 充足时调用 `removeSpiritStones` 扣除消费额
- [x] `exec_bargain` 产出侧直接 `addSpiritStones(finalPrice)`，不经过 `recordProduction`
- [x] `exec_setTaxRate` 基于 EconomicDigest 态势决定税率（Crisis→12%, Surplus→3%）
- [x] `exec_setTaxRate` 加入性格修正（greed/ambition）
- [x] `exec_setTaxRate` 税率 clamp 到 [1%, 15%]

## P2：架构优化

- [x] `MarketRegistry.h` 新增 Treasury 收支累加器（income/expense accumulator）
- [x] `collectTax` 中累加 `treasuryIncomeAccumulator_`
- [x] `spendTreasury` 中累加 `treasuryExpenseAccumulator_`
- [x] `computeEconomicDigest` 使用累加器计算 `weeklyIncomeRate`/`weeklyExpenseRate`
- [x] `MarketRegistry.h` 新增 `clanMembers_` 反向索引（clanId → vector<EntityId>）
- [x] `recordProduction`/`recordConsumption` 中维护反向索引
- [x] `evaluateEconomicCrisis` 使用 `clanMembers_[clanId]` 替代全实体遍历
- [x] `exec_economicMobilize` 同样使用反向索引
- [x] `evaluateEconomicCrisis` 中 T1/T2 执行动员后返回 `true`
- [x] `BehaviorTree_Production.h` 中 `kProductionTable[]` 已删除
- [x] `BehaviorTreeSystem.h` 中 `EconomicSignals::computeFromHeritage` 已删除
- [x] 编译通过，无未定义符号
- [x] `MarketService.ts` 初始 `demands` 为 0（与 C++ 端一致）

## P3：防御性改进

- [x] `RelationshipComponent.h` 中 `setFactionAffinity` 直接赋值而非步进 +1/-1
- [x] `SocialComponent.h` 中 `tickEmotions` 的 `effectiveFrames` clamp 到 [0, 10]
