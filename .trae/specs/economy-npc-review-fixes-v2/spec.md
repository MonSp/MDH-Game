# 经济系统与NPC行为系统评审迭代修复 Spec

## Why
游戏专家评审发现了 3 个 P0 级 bug（双重征税、无限购买、tickDecay 多调用导致需求衰减速度是设计的 10000 倍）和多个 P1/P2 级问题，导致经济数值严重偏离设计文档、灵石凭空产生、市场永远供过于求。需要系统性修复以确保代码实现与设计文档一致。

## What Changes
- **P0** 修复 `collectTax` 双重征税：实际税率从 0.25% 恢复到设计的 5%
- **P0** 修复 `exec_buy` 不扣灵石：NPC 购买前检查余额并扣除
- **P0** 将 `tickDecay` 从 `evaluateDaily` 移到全局单帧调用：需求衰减速度恢复正常
- **P1** 修复 `exec_sell` 的 amount×price 乘法导致灵石产出失控
- **P1** 修复 `exec_bargain` 纯收益行为：扣除消费侧灵石
- **P1** 重写 `exec_setTaxRate` 税率计算：基于态势和性格而非灵石余额模运算
- **P2** 实现 `EconomicDigest` 的 `weeklyIncomeRate`/`weeklyExpenseRate` 动态计算
- **P2** 优化 `evaluateEconomicCrisis` 全实体遍历：引入 clanId 反向索引
- **P2** 修正 `evaluateEconomicCrisis` 返回值：经济动员应阻断决策链
- **P2** 清理死代码：`kProductionTable[]`、`computeFromHeritage`、`EconomicSignals` 冗余
- **P2** 修复 `MarketService.ts` 初始 demand 不一致（50→0）
- **P3** 修复 `setFactionAffinity` 步进更新逻辑：一步到位而非每次 +1/-1
- **P3** 为 `tickEmotions` 的 deltaTime 尖峰添加上限保护

## Impact
- Affected specs: economy-market-engine, economy-strategic-layer, npc-behavior-system-v7.3, npc-inventory-cpp
- Affected code:
  - `src/server/game/economy/MarketRegistry.h` — 税收逻辑、tickDecay 位置
  - `src/server/game/economy/EconomicDigest.h` — 收支率计算
  - `src/server/game/npc/BehaviorTree_Production.h` — exec_buy/exec_sell/exec_bargain
  - `src/server/game/npc/BehaviorTree_EconomyStrategy.h` — exec_setTaxRate
  - `src/server/game/npc/BehaviorTreeSystem.h` — evaluateEconomicCrisis、tickDecay、死代码
  - `src/server/game/ecs/components/RelationshipComponent.h` — setFactionAffinity
  - `src/server/game/ecs/components/SocialComponent.h` — tickEmotions
  - `src/server/services/MarketService.ts` — 初始 demand

## MODIFIED Requirements

### Requirement: 税收系统
`recordProduction` 和 `recordConsumption` 中对 SpiritStones 的税收计算 SHALL 只乘一次税率（通过 `collectTax`）。`collectTax(clanId, amount)` 的语义是"对 amount 征收 clanTaxRate 比例的税"，调用方传入的是**税前交易额**，`collectTax` 内部乘以税率。

#### Scenario: 5% 税率下卖出装备
- **WHEN** NPC 卖出装备获得 40 灵石（Sell 行为产出 SpiritStones）
- **THEN** 家族 Treasury 增加 `40 × 0.05 = 2` 灵石（而非当前的 `40 × 0.05 × 0.05 = 0.1`）

### Requirement: NPC 购买行为
`exec_buy` SHALL 在购买前检查 NPC 的灵石余额是否足够支付成本，并在购买时扣除灵石。

#### Scenario: 灵石不足时购买
- **WHEN** NPC 灵石余额 < 购买成本
- **THEN** 行为切换为 Rest，不产生装备

#### Scenario: 灵石充足时购买
- **WHEN** NPC 灵石余额 ≥ 购买成本
- **THEN** 扣除灵石、增加装备、CommodityPool 记录供需变化

### Requirement: 需求衰减调度
`tickDecay` SHALL 在游戏主循环的每帧中调用一次（而非每个 NPC 的 evaluate 中调用）。内部 `frameCounter_` 继续按 600 帧间隔触发实际衰减。

#### Scenario: 10K NPC 场景下的衰减频率
- **WHEN** 游戏有 10000 个 NPC，每帧调用 evaluate
- **THEN** `tickDecay` 的 `frameCounter_` 每帧只 +1，实际衰减每 600 帧（约 10 秒）触发一次

### Requirement: NPC 出售行为
`exec_sell` SHALL 使用设计文档中的固定产出范围（10-50 灵石），而非 `amount × marketPrice` 的乘法。

#### Scenario: 卖出装备
- **WHEN** NPC 执行 Sell 行为
- **THEN** 获得 `randRange(10, 50)` 灵石（不受市价影响）

### Requirement: NPC 议价行为
`exec_bargain` SHALL 在消费侧扣除灵石（`removeSpiritStones`），确保不是纯收益行为。

#### Scenario: 议价失败
- **WHEN** NPC 灵石余额 < 消费额（basePrice × 0.7）
- **THEN** 行为切换为 Rest

### Requirement: 税率设置行为
`exec_setTaxRate` SHALL 基于 EconomicDigest 态势和 NPC 性格来决定税率，而非灵石余额模运算。

#### Scenario: 危机时 T0 设税
- **WHEN** T0 NPC 执行 SetTaxRate 且态势为 Crisis
- **THEN** 税率设为 10%-15%（高税率应对危机）

#### Scenario: 盈余时 T0 设税
- **WHEN** T0 NPC 执行 SetTaxRate 且态势为 Surplus
- **THEN** 税率设为 1%-5%（低税率刺激经济）

### Requirement: EconomicDigest 收支率
`weeklyIncomeRate` 和 `weeklyExpenseRate` SHALL 基于最近 600 帧的 Treasury 实际变动计算，而非硬编码。

### Requirement: EconomicCrisis 层行为
`evaluateEconomicCrisis` SHALL 在执行经济动员后返回 `true`，阻断后续决策层（高层 NPC 在危机期间专注于动员）。同族成员查找 SHALL 使用 clanId 反向索引而非全实体遍历。

### Requirement: 死代码清理
以下代码 SHALL 被移除：
- `BehaviorTree_Production.h` 中的 `kProductionTable[]`（与 `kExecuteTable[]` 重复）
- `BehaviorTreeSystem.h` 中的 `EconomicSignals::computeFromHeritage`（已被 `getEconomicSignals` 缓存替代）

### Requirement: 阵营亲和度设置
`setFactionAffinity` SHALL 直接设置目标值（经过 clamp），而非每次移动 1 步。

### Requirement: 情绪衰减保护
`tickEmotions` SHALL 对 `effectiveFrames` 设置上限（如 10.0），防止 deltaTime 尖峰导致情绪骤降。

## REMOVED Requirements
### Requirement: kProductionTable 生产行为描述符表
**Reason**: 与 `kExecuteTable[]` 完全重复，是死代码
**Migration**: 无影响，该表从未被引用

### Requirement: EconomicSignals::computeFromHeritage
**Reason**: V7.3 已切换为真实供需数据，此方法是遗留代码
**Migration**: 无影响，该方法从未被调用
