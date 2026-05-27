# 修仙世界市场经济引擎 Spec

## Why
当前 NPC 行为系统已具备 15 种生产/交易行为，每日产生数十万次灵石流动，但这股经济洪流是**孤立的**——每个 NPC 在自己的 ResourcesComponent 里增减灵石，不与任何人交互，也不影响物价。前端市场有独立的库存/价格系统，但完全不受 NPC 活动影响。经济系统的核心缺失不是缺少行为，而是缺少一个**连接层**：将 NPC 的生产/消费行为汇聚成区域供需池，再由供需池驱动物价波动，物价波动反过来影响 NPC 行为选择（经由已有的 EconomicSignals 接口），形成闭环。

## What Changes
- **新增 CommodityPool**: C++ 侧全局商品池，按家族/区域追踪六大类商品的供给与需求
- **新增 PriceEngine**: 基于供需比的弹性定价公式，替换前端硬编码的随机波动
- **重构 NPC 生产行为**: 15 种生产/交易行为接入 CommodityPool，产出/消耗从个人灵石流向区域市场
- **重构 EconomicSignals**: 从基于 `factionCareerHeritage` 的启发式代理切换为读取 CommodityPool 的真实供需数据
- **新增 FamilyTreasury**: 家族库房自动从 NPC 交易中抽税，用于战争、突破资助
- **新增 CaravanRoute**: NPC 商队跨区域套利，从低价市场买入、高价市场卖出，平抑区域价差
- **前端联动**: MarketPanel 商品价格由后端 CommodityPool 驱动，玩家交易影响供需

## Impact
- Affected specs: economy-system (V1), npc-behavior-system-v7.3
- Affected code:
  - C++: 新增 `CommodityPool.h`, `PriceEngine.h`, `MarketRegistry.h`, `CaravanSystem.h`
  - C++ 修改: `BehaviorTree_Production.h`（15 种行为接入 CommodityPool）, `BehaviorTreeSystem.h`（EconomicSignals 改读 MarketRegistry）, `ResourcesComponent.h`（familyContribution 激活）
  - TS 修改: `EconomyService.ts`（MarketService 同步 C++ 数据）, `MarketPanel.tsx`（动态物价）, `gameStore.ts`
- **BREAKING**: 生产行为不再直接修改 `resources->spiritStones`，改为通过 `MarketRegistry::recordProduction()` 间接影响个人收益（个人收益 = 产出量 × 当前市价 × 个人技能系数）
- NPC 的经济反馈闭环首次完整闭合

## ADDED Requirements

### Requirement: CommodityPool — 区域商品池
系统 SHALL 为每个家族/宗门维护一个 CommodityPool，追踪该区域六类商品的供给量和需求量。

#### Commodity Categories
| 商品类别 | 来源行为 | 消耗行为 | 关联 ResourceTag |
|:---|:---|:---|:---|
| **Ore（矿石）** | Mine | Craft, Refine, Construct | `ProducesSpiritStones` + `CareerTag::Miner` |
| **Food（食物）** | Farm, Fish, Cook, Hunt | Eat | `ProducesFood` |
| **Equipment（装备）** | Craft, Tailor, Construct, Build | —（耐久消耗未来扩展） | `ProducesEquipment` |
| **Materials（材料）** | Lumber, Gather, Refine | Craft, Build, Construct | `ProducesMaterials` |
| **Pills（丹药）** | Alchemy | Breakthrough, Heal | `ProducesCultivation`（视为修为资源） |
| **SpiritStones（灵石）** | Sell, Bargain, Trade | Buy, Breakthrough（未来） | `ProducesSpiritStones` |

> 注：SpiritStones 既是流通货币也是商品。NPC/玩家可以用灵石购买其他商品，灵石本身也有供需（开采增加供给，突破/战争消耗需求）。

#### Scenario: 矿工产出矿石
- **WHEN** NPC 完成一次 Mining（`exec_mine` 中 `activityProgress >= 1.0f`）
- **THEN** 该 NPC 所属家族的 CommodityPool.oreSupply += 产出量；NPC 获得灵石收益 = 产出量 × 当前矿石市价
- **THEN** 矿石市价因供给增加而微降

#### Scenario: 铁匠消耗矿石
- **WHEN** NPC 执行 Craft（`exec_craft`）
- **THEN** 该 NPC 所属家族的 CommodityPool.oreDemand += 消耗量；CommodityPool.equipmentSupply += 产出量
- **THEN** 矿石市价因需求增加而微升，装备市价因供给增加而微降

#### Scenario: 多家族共处同一区域
- **WHEN** 多个家族的 NPC 在同一地理区域（如咸阳城）活动
- **THEN** 该区域的 CommodityPool 为所有家族的供需之和；价格统一，但各家族 NPC 只能访问自己家族的 CommodityPool（不可跨家族取用库存）

### Requirement: PriceEngine — 供需弹性定价
系统 SHALL 基于供需比计算每类商品的市场价格，使用对数弹性公式防止极端波动。

#### 定价公式
```
price = basePrice × (1 + elasticity × ln(demand / max(supply, 1)))
       clamped to [basePrice × 0.3, basePrice × 3.0]
```

| 参数 | 默认值 | 说明 |
|:---|:---|:---|
| basePrice | 由商品类别决定 | Ore=5, Food=3, Equipment=40, Materials=4, Pills=80, SpiritStones=1 |
| elasticity | 0.3 | 弹性系数，控制价格对供需比的敏感度 |

#### Scenario: 供不应求涨价
- **WHEN** 某区域 Ore 供给=100 但 Craft+Refine 需求=500（demand/supply = 5.0）
- **THEN** 矿石价格 = 5 × (1 + 0.3 × ln(5.0)) = 5 × (1 + 0.3 × 1.609) ≈ 5 × 1.483 = 7.4 灵石

#### Scenario: 供过于求跌价
- **WHEN** 某区域 Ore 供给=1000 但需求=200（demand/supply = 0.2）
- **THEN** 矿石价格 = 5 × (1 + 0.3 × ln(0.2)) = 5 × (1 + 0.3 × -1.609) ≈ 5 × 0.517 = 2.6 灵石

#### Scenario: 价格地板与天花板
- **WHEN** demand/supply 极端偏离（> 100 或 < 0.01）
- **THEN** 价格被限幅在 [basePrice × 0.3, basePrice × 3.0] 区间内

### Requirement: NPC 生产行为接入 CommodityPool
所有 C++ 侧生产/交易行为 SHALL 将产出/消耗注册到 `MarketRegistry`，NPC 个人收益由 `产出量 × 当前市价` 计算。

#### Scenario: exec_mine 改造
- **WHEN** `exec_mine` 完成一轮采矿
- **THEN** 调用 `MarketRegistry::recordProduction(entityId, CommodityType::Ore, amount)` 
- **THEN** NPC 获得灵石 = amount × `PriceEngine::getPrice(familyId, CommodityType::Ore)`
- **THEN** 不再直接调用 `resources->addSpiritStones(固定值)`

#### Scenario: exec_craft 改造
- **WHEN** `exec_craft` 完成
- **THEN** 消耗 Ore: `MarketRegistry::recordConsumption(entityId, CommodityType::Ore, 5)`
- **THEN** 产出 Equipment: `MarketRegistry::recordProduction(entityId, CommodityType::Equipment, 1)`
- **THEN** NPC 收益 = 1 × EquipmentPrice − 5 × OrePrice − 固定人工成本
- **THEN** 若总收益为负，该行为仍执行但记录反思负分

#### Scenario: 所有 15 种行为接入清单
每个行为的接入映射：

| 行为 | 消耗 | 产出 | 消耗量 | 产出量 |
|:---|:---|:---|:---|:---|
| Mine | — | Ore | — | 15/hr |
| Farm | — | Food | — | 30-60/次 |
| Fish | — | Food | — | 10/hr |
| Lumber | — | Materials | — | 8/hr |
| Gather | — | Materials | — | 5/hr |
| Craft | Ore | Equipment | 5 | 1（70%概率） |
| Refine | Ore | Materials | 8 | 2（50%概率） |
| Cook | Food | Food（加工） | 2 | 1（加工溢价） |
| Tailor | Materials | Equipment | 3 | 1（65%概率） |
| Build | Materials | —（建筑进度） | 5/帧 | — |
| Construct | Materials+Ore | —（建筑进度） | 各 6/帧 | — |
| Repair | Materials | —（修复进度） | 2/帧 | — |
| Alchemy | —（材料来自外部） | Pills | — | 1（60%概率） |
| Sell | Equipment/Materials | SpiritStones | 1 件物品 | 市价 × 0.8 |
| Buy | SpiritStones | Equipment/Materials | 市价 | 1 件物品 |
| Bargain | SpiritStones | SpiritStones | 市价 × 0.7 | 市价 × (0.6~1.5) |

### Requirement: FamilyTreasury — 家族库房与经济循环
系统 SHALL 为每个家族维护一个独立的库房资金池，自动从 NPC 交易中抽取税收，并用于战争、突破资助。

#### Scenario: 自动抽税
- **WHEN** NPC 在市场中完成一次买卖（Sell/Buy/Bargain/Trade）
- **THEN** 交易额的 5% 自动汇入该 NPC 所属家族的 Treasury
- **THEN** NPC 的 `familyContribution` 增加 = 纳税额 × 2（贡献值两倍于税额）

#### Scenario: 家族库房资助突破
- **WHEN** CoreDisciple NPC 的 `evaluateCultivation` 判定需要突破但灵石不足
- **THEN** 系统检查家族 Treasury 是否足够支付突破费用（境界 × 基准灵石消耗）
- **THEN** 若足够，从 Treasury 扣除并资助弟子突破；弟子 `familyContribution` 减少对应值

#### Scenario: 战争经费消耗
- **WHEN** 家族进入战争状态（未来扩展）
- **THEN** 每游戏日从 Treasury 扣除军队维护费 = 参战 NPC 数 × 基准军费

### Requirement: EconomicSignals 接入真实供需
系统 SHALL 将 `EconomicSignals` 的数据源从 `factionCareerHeritage` 代理切换为 `MarketRegistry` 的真实供需数据。

#### Scenario: 供需驱动行为偏置
- **WHEN** `evaluateDaily` 需要计算经济信号以偏置行为选择
- **THEN** `EconomicSignals.computeFromMarket(familyId)` 读取该家族的 CommodityPool：
  - `ironOreDemand` = Ore.demand / max(Ore.supply, 1)（> 1.0 表示紧缺）
  - `foodDemand` = Food.demand / max(Food.supply, 1)
  - `equipmentDemand` = Equipment.demand / max(Equipment.supply, 1)
  - … 以此类推
- **THEN** 当 Ore 紧缺（demand/supply > 2.0）时，矿工系 NPC 采矿概率 ×1.5

#### Scenario: 供需数据不可用时的回退
- **WHEN** NPC 不属于任何家族或 MarketRegistry 未初始化
- **THEN** `EconomicSignals` 所有字段保持默认值 1.0（无偏置），行为选择不受影响

### Requirement: CaravanRoute — 跨区域商队套利
系统 SHALL 为特定 NPC（外务长老、商贾）提供跨区域商队行为，从低价区买入、移动至高价区卖出。

#### Scenario: 商队判定触发
- **WHEN** NPC 的 `evaluateDaily` 判定且角色为 `FamilyHead`/`Elder` 且家族有 Merchant 传承
- **THEN** 以 10% 概率触发商队行为：`CaravanSystem::findBestRoute(familyId)` 寻找相邻家族的价差最大的商品
- **THEN** 若最大价差 > 20%，商队从低价区买入、移动至目标家族坊市、卖出，利润存入家族 Treasury

#### Scenario: 商队平抑物价
- **WHEN** 商队从家族 A（Ore 价格 2.6）买入 100 单位 Ore，卖给家族 B（Ore 价格 7.4）
- **THEN** 家族 A 的 Ore 供给减少 100 → 价格微涨；家族 B 的 Ore 供给增加 100 → 价格微降
- **THEN** 多次商队往返后两家族 Ore 价格趋于一致

#### Scenario: 商队冷却与风险
- **WHEN** 商队完成一次往返
- **THEN** 同一条路线 500 帧内不再触发
- **THEN** 5% 概率遭遇劫匪，损失 50% 货物

### Requirement: 前端 MarketPanel 接入动态物价
前端的 MarketPanel SHALL 展示由后端 CommodityPool 驱动的实时价格。

#### Scenario: 价格同步
- **WHEN** 玩家打开 MarketPanel
- **THEN** 商品价格由 C++ 侧 `PriceEngine` 计算，通过 WASM 接口传至 TS 层
- **THEN** 显示的买入价 = currentPrice × (1 + taxRate)，卖出价 = currentPrice × 0.8

#### Scenario: 玩家交易影响供需
- **WHEN** 玩家购买 10 颗洗髓丹
- **THEN** 对应家族 CommodityPool.pillsSupply -= 10；价格因供给减少而微涨
- **THEN** 玩家卖出灵石获得洗髓丹对应款项

## MODIFIED Requirements

### Requirement: exec_breakthrough 增加灵石消耗
来自 economy-system V1 spec 的 MODIFIED 需求：境界突破 SHALL 消耗灵石。

#### Scenario: 突破消耗
- **WHEN** NPC 触发 `exec_breakthrough`
- **THEN** 扣除对应境界的灵石（练气→筑基: 300, 筑基→金丹: 1000, 金丹→元婴: 3000, 元婴→化神: 10000）
- **THEN** 灵石从 NPC 个人 `resources->spiritStones` 扣除；不足时从家族 Treasury 借款（并记录负债）
- **THEN** 消耗的灵石从 CommodityPool.spiritStonesSupply 中减去

## REMOVED Requirements
N/A
