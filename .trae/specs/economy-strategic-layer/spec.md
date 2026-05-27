# 经济战略层 Spec

> 让 T0-T2 高层 NPC 感知经济态势，从家族/国家层面做出有经济依据的战略决策。

## Why

当前经济数据（CommodityPool 供需、PriceEngine 物价、Treasury 库房、CaravanSystem 套利）只在第 7 层 Daily 中通过 EconomicSignals 影响普通弟子的行为选择（采矿/耕种权重）。T0 秦王的 LLM 规划只知道前线伤亡率和任务完成率，完全不具备经济感知力——他会发动一场库房空空如也的战争，或无视敌国食物依赖进口的战略弱点。

需要在现有经济引擎和行为系统之间建立一座「上层桥梁」：将经济数据分粒度注入 T0-T2 的决策流程，让高层 NPC 像真正的统治者一样思考——"打仗就是打钱"。

## What Changes

- **新增 EconomicDigest 数据结构**：在 CachedEconSignals 之上为每个家族生成分级经济态势摘要（态勢 + 异常警報 + 战略情报）
- **新增 5 种经济战略行为**：设置税率、贸易禁令、物资囤积、价格平準、经济动员，统一纳入 BehaviorTree_EconomyStrategy.h
- **新增 EconomicCrisis 决策层**：在 Command 层与 LLM 层之间插入经济危机自动响应（无 LLM 参与，立即生效）
- **扩展 LLM 规划 prompt**：在 LLMPlanningService.ts 中拼接 EconomicDigest，注入 T0/T1 的 LLM prompt
- **扩展 MarketRegistry**：新增 `getEconomicDigest(clanId)` 方法，基于已有 CachedEconSignals 计算
- **扩展 BehaviorTreeCommand**：支持经济动员指令下行（T2 → T3 行为权重调整）
- **扩展 WASM 导出**：新增 `ecs_getEconomicDigest` 供 TS 端 LLM 服务读取
- **扩展 kExecuteTable**：注册 5 种新行为的执行函数和标签

## Impact

- Affected specs: economy-market-engine（只读已有数据）、npc-behavior-system-v7.3（新增决策层 + 行为）、npc-inventory-cpp（不变）
- Affected code:
  - **新增 C++ 文件**：`EconomicDigest.h`、`BehaviorTree_EconomyStrategy.h`
  - **修改 C++ 文件**：`MarketRegistry.h`（新增方法）、`BehaviorTreeSystem.h`（新增评估层入口）、`BehaviorTree_Command.h`（经济动员指令）、`wasm_exports.cpp`（新增导出）
  - **修改 TS 文件**：`LLMPlanningService.ts`（prompt 拼接）、`ECSWasmLoader.ts`（新增 WASM 调用封装）

---

## ADDED Requirements

### Requirement: EconomicDigest 经济态势摘要

系统 SHALL 为每个家族维护一份 EconomicDigest，包含家族经济态势、关键商品供需异常警報、跨家族战略情报，每 600 帧（与需求衰减同频）或经济危机触发时重新计算。

EconomicDigest 结构体 SHALL 包含：

- `posture`：经济态势枚举（Surplus / Balanced / Tight / Crisis），基于库房储备率与最严重商品供需比计算
- `treasuryBalance`：家族库房灵石头余额
- `weeklyIncomeRate` / `weeklyExpenseRate`：每 600 帧净收入/支出变化量
- `alerts[]`：最多 3 个最严重的供需异常（商品类型、supply、demand、当前价格倍率、描述文本）
- `opportunities[]`：最多 2 个跨家族套利机会（来源家族、目标家族、商品、利润率）
- `enemyWeaknesses[]`：最多 2 个敌对家族的经济弱点（家族 ID、弱点类型、描述文本）

#### Scenario: 矿难触发 Crisis 态势

- **GIVEN** 秦国家族 CommodityPool 中 Ore supply=45, demand=380, priceRatio=2.7
- **AND** Treasury=900, 周净流出=-80（储备率 < 1.0 周）
- **WHEN** 每 600 帧 digest 刷新
- **THEN** EconomicDigest.posture = Crisis
- **AND** alerts[0] = {commodity=Ore, supply=45, demand=380, priceRatio=2.7, desc="矿石严重短缺"}
- **AND** 该 digest 可被 LLMPlanningService 读取注入 prompt

#### Scenario: 丰裕态势无警報

- **GIVEN** 楚国家族所有商品 supply/demand 比值在 0.5~2.0 之间
- **AND** Treasury > weeklyExpense × 4
- **WHEN** digest 刷新
- **THEN** EconomicDigest.posture = Surplus
- **AND** alerts 数组为空

### Requirement: 经济危机自动响应层

当 EconomicDigest.posture == Crisis 时，系统 SHALL 在 Command 层（优先级 3）之前、LLM 层（优先级 4）之前插入 EconomicCrisis 层（优先级 2.5），自动触发经济止血措施，无需等待 LLM 规划。

自动响应措施 SHALL 包括：

- **T2 级**：对全族下属于 NPC 下达经济动员指令，紧缺商品的关联生产行为基线权重 ×1.5
- **T1 级**：从 Treasury 动用不超过余额 30% 的灵石执行价格平準（市价收購短缺商品）

Crisis 解除时（态勢恢复为 Tight 或更好），SHALL 自动撤销经济动员和价格平準。

#### Scenario: Crisis 自动响应触发

- **GIVEN** EconomicDigest.posture == Crisis，警报为 Ore 短缺
- **WHEN** T2 长老 NPC 进入决策评估
- **THEN** EconomicCrisis 层捕获 → 经济动员指令下达 → 全族 Mine 行为基线权重 ×1.5
- **AND** T1 白起自动触发价格平準(Ore)：Treasury -= min(余额×30%, 300)，Ore supply += 收购量

#### Scenario: Crisis 恢复自动撤销

- **GIVEN** 已触发经济动员（Mine 权重 ×1.5）
- **WHEN** 矿脉夺回后 Ore supply 恢复，digest 刷新为 Balanced
- **THEN** 经济动员自动撤销，Mine 权重恢复为角色基线值
- **AND** 价格平準自动停止

### Requirement: 5 种经济战略行为

系统 SHALL 在 kExecuteTable 中注册 5 种新行为，统一归类为 ActivityCategory::EconomyStrategy：

| 行为 | 执行者 | 消耗/副作用 | 效果 |
|:---|:---|:---|:---|
| SetTaxRate | T0 | — | 修改族级 taxRate（1%-15%），影响所有交易抽税和 NPC 交易意愿 |
| TradeEmbargo | T0 | — | 禁止与指定家族的 CommodityPool 交互，CaravanSystem 跳过该路线，设置冷却 1200 帧 |
| StockpileMaterial | T1 | — | 将族级 CommodityPool 中指定商品的 X%（默认 30%）标记为战略储备，不进入 PriceEngine 定价的 supply 计算 |
| PriceStabilize | T1 | Treasury 支出（买入）或收入（卖出） | 以 Treasury 资金在坊市买卖，平抑物价：短缺时溢价 120% 收购，过剰时折价 80% 抛售 |
| EconomicMobilize | T2 | — | 修改所有下属于 NPC 的指定行为基线权重（×1.2~2.0），持续 300 帧后自动过期 |

每种行为 SHALL 在 execute 阶段通过 MarketRegistry 回写 CommodityPool / Treasury，确保经济后果被追踪。

#### Scenario: T0 设置税率为 10%

- **GIVEN** 秦国家族当前 taxRate=5%
- **WHEN** T0 秦王执行 SetTaxRate(10)
- **THEN** 秦国家族 taxRate=10%
- **AND** 后续所有交易抽税比例变为 10%
- **AND** 高贪婪 NPC 交易意愿轻微下降（greed>70 时截留概率 +5%）

#### Scenario: T1 物资囤积矿石 30%

- **GIVEN** 秦国家族 Ore supply=1000
- **WHEN** T1 白起执行 StockpileMaterial(Ore, 30)
- **THEN** PriceEngine 计算 Ore 价格时 supply 按 700 计算（30% 被标记为储备）
- **AND** 储备矿石不可被商队套利购买

#### Scenario: T2 经济动员采矿 ×1.5

- **GIVEN** 秦国家族所有 Miner 角色 NPC 的 Mine 基线权重为 1.0
- **WHEN** T2 长老执行 EconomicMobilize(Mine, 1.5, 300)
- **THEN** 全族所有 NPC 的 Mine 行为基线权重 ×1.5
- **AND** 300 帧后权重自动恢复为 1.0
- **AND** economicBiasFor 中的 EconomicSignals 偏差继续正常叠加（如紧缺时再 ×1.5，最终 2.25）

### Requirement: LLM Prompt 经济摘要注入

LLMPlanningService.ts 在构建 T0/T1 LLM prompt 时，SHALL 从 WASM 读取对应家族的 EconomicDigest，并以结构化文本格式注入 system prompt。

注入内容 SHALL 区分层级：

- **T0 秦王**：完整 EconomicDigest（态勢 + 警報列表 + 套利机会 + 敌族弱点）
- **T1 白起**：态勢 + 警報列表（无需套利机会和敌族弱点，那是 T0 的决策域）

#### Scenario: T0 LLM 收到经济情报后产出有经济依据的意图

- **GIVEN** 秦国家族 EconomicDigest: posture=Tight, alerts=[Ore短缺], opportunities=[从楚购矿获利35%], enemyWeaknesses=[韩国灵石见底]
- **WHEN** LLMPlanningService 构建 T0 prompt
- **THEN** prompt 中包含上述经济情报
- **AND** LLM 可能输出意图 "seize_chu_northern_mine" 或 "trade_diplomacy_with_chu"
- **AND** 意图经规则引擎拆解为 T1/T2 可执行的具体行动

#### Scenario: 无经济异常时 prompt 简洁

- **GIVEN** EconomicDigest.posture = Balanced, alerts 为空
- **WHEN** LLMPlanningService 构建 prompt
- **THEN** prompt中仅包含 "经济态势：正常，无需特别关注"
- **AND** 不占用过多 token

### Requirement: WASM 导出 ecs_getEconomicDigest

系统 SHALL 在 wasm_exports.cpp 中新增导出函数 `ecs_getEconomicDigest(clanId: int) -> EconomicDigestWasm`，返回紧凑的二进制结构供 TS 端 LLM 服务读取。

EconomicDigestWasm 结构 SHALL 控制在 256 字节以内，包含：

- posture (uint8_t)
- treasuryBalance (int64_t)
- weeklyIncomeRate / weeklyExpenseRate (float)
- alerts[] 每项: commodityType(uint8_t) + supply(int32_t) + demand(int32_t) + priceRatio(float)
- opportunities[] 每项: fromClanId(uint32_t) + toClanId(uint32_t) + commodityType(uint8_t) + profitRate(float)
- enemyWeaknesses[] 每项: clanId(uint32_t) + weaknessType(uint8_t)

#### Scenario: TS 端读取经济摘要

- **GIVEN** 秦国家族 economic digest 已缓存
- **WHEN** LLMPlanningService 调用 `wasmGetEconomicDigest(秦clanId)`
- **THEN** 返回完整 EconomicDigestWasm 结构
- **AND** TS 端解析后拼接为 LLM prompt 文本

### Requirement: 经济战略行为标签匹配

新增的 5 种经济战略行为 SHALL 纳入 V7.1 的行为标签体系（CareerTag + ResourceTag + PersonalityTag），确保微规划、反思、角色粘性等机制自动兼容。

标签分配 SHALL 为：

| 行为 | CareerTag | ResourceTag | PersonalityTag |
|:---|:---|:---|:---|
| SetTaxRate | Ruler | SpiritStones | Ambitious |
| TradeEmbargo | Ruler | None | Cautious, Ambitious |
| StockpileMaterial | Commander | Materials | Cautious |
| PriceStabilize | Commander | SpiritStones | Diligent |
| EconomicMobilize | Elder | None | Diligent, Loyal |

#### Scenario: 微规划自动发现经济战略行为

- **GIVEN** V7.1 标签相似度匹配系统已运行
- **WHEN** T1 白起所有 Combat 行为权重 < 0.7 触发微规划
- **THEN** 标签相似度匹配可发现 StockpileMaterial 和 PriceStabilize（同为 Commander 标签）
- **AND** 微规划可建议切换到经济管理方向

---

## MODIFIED Requirements

### Requirement: MarketRegistry 扩展（修改）

MarketRegistry SHALL 新增以下方法：

- `getEconomicDigest(ClanId clanId, uint64_t currentFrame) -> const EconomicDigest&`：读取或计算经济摘要，缓存 TTL=600 帧（与需求衰减同频）
- `applyTaxRate(ClanId clanId, float newRate)`：修改家族税率
- `applyEmbargo(ClanId clanId, ClanId targetClan, bool active)`：设置/解除贸易禁令
- `applyStockpile(ClanId clanId, CommodityType type, float ratio)`：标记/取消战略储备
- `getEffectiveSupply(ClanId clanId, CommodityType type) -> int64_t`：返回扣除储备后的有效供给

缓存失效条件 SHALL 与现有 CachedEconSignals 保持一致（dirty 标记 + TTL 过期）。

### Requirement: BehaviorTreeSystem 评估层扩展（修改）

kEvaluateLayers[] 数组 SHALL 在 index 2.5 位置插入 EconomicCrisis 层：

```
kEvaluateLayers[] = {
    {Survival, 1},
    {Emotion, 2},
    {EconomicCrisis, 2.5},  // 新增
    {Command, 3},
    {LLM, 4},
    {Social, 5},
    {Cultivation, 6},
    {Daily, 7},
};
```

EconomicCrisis 层 SHALL 仅在 NPC 属于 T1/T2 层级且其家族 EconomicDigest.posture == Crisis 时生效。低层级 NPC（T3）不直接评估此层（危机响应通过指令层间接传导）。

### Requirement: LLMPlanningService.ts prompt 扩展（修改）

LLMPlanningService.ts 的 `buildPlanningPrompt()` 方法 SHALL 在现有前线摘要之后拼接经济摘要段落。

经济摘要段落的文本格式 SHALL 为：

```
[经济态势]
库房：{balance} 灵石（周净{+/-}{rate}）
态势：{posture_cn}
{如有警报}异常警报：
  - {commodity_cn}：供给{supply} 需求{demand} 价格{ratio}×基准 — {desc}
{如有机会，仅T0}战略情报：
  - 套利机会：从{from_clan}购{commodity_cn}运往{to_clan}可获利{profit}%
  - 敌族弱点：{clan}的{weakness_desc}
```

---

## REMOVED Requirements

（无移除项）
