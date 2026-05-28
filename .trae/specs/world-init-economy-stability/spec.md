# 世界随机初始化——经济稳定与NPC驱动力 Spec

## Why

当前 `NPCCreationSystem::createBatchNPCs()` 和 `WorldGenerator::generateClans()` 的初始化逻辑存在 14 个结构性缺陷，导致：(1) 开局所有商品价格触底（demand=0 → 价格=基准×0.3），经济陷入死锁；(2) 所有 NPC 归属 "clan_0"，跨家族经济完全不存在；(3) 高层 NPC 境界为凡人，无法执行战略决策；(4) NPC 无初始关系、无产业传承、性格无差异，社交/情绪/经济信号反馈回路全部断裂。

## What Changes

- **BREAKING** `CommodityPool` 默认构造函数行为变更：demand 从 0 改为按目标供需比初始化，确保开局价格在 0.85×-1.15× 区间
- `NPCCreationSystem::createBatchNPCs()` 重构：按家族金字塔模板分配角色和境界，clanId 关联 WorldGenerator 的真实家族
- `NPCCreationSystem::createPersonalityByNation()` 改造：从"固定值+窄范围随机"改为"国家均值+角色修正+N(0,15)正态分布"
- `NPCCreationSystem::createStatsForRealm()` 改造：按境界分配 basePower，不再统一使用 Mortal
- `IdentityComponent` 初始化：新增 `factionCareerHeritage` 按国家产业配置设置
- `CultivationComponent` 初始化：按境界设置初始修炼进度
- `WorldGenerator::generateResources()` 改造：资源点类型按国家领地分配，不再完全随机
- 新增家族内部初始关系网络构建
- 新增家族间阵营偏见初始化
- 新增 NPC 驱动力检查机制
- 新增国家产业配置数据结构 `NationEconomyProfile`

## Impact

- Affected specs: `economy-market-engine`, `npc-behavior-system-v7.3`, `economy-strategic-layer`
- Affected code:
  - `src/server/game/economy/CommodityPool.h` — 构造函数变更
  - `src/server/game/economy/MarketRegistry.h` — 新增按配置初始化 pool 的接口
  - `src/server/game/npc/NPCCreationSystem.h` — 核心重构
  - `src/server/game/world/WorldGenerator.h` — 资源点分配改造
  - `src/server/game/ecs/components/IdentityComponent.h` — heritage 初始化
  - `src/server/game/ecs/components/CultivationComponent.h` — 境界进度初始化
  - `src/server/game/ecs/components/RelationshipComponent.h` — 初始关系构建接口

## ADDED Requirements

### Requirement: NationEconomyProfile 国家产业配置

系统 SHALL 提供 `NationEconomyProfile` 数据结构，为 7 个国家定义：
- 6 种商品的供给倍率 `supplyBias[6]`（范围 0.5-2.0）
- 主导资源类型 `dominantResource`
- 经济专长 `EconomicSpecialty`（Mining/Agriculture/Alchemy/Trade/Military/Balanced）

#### Scenario: 秦国产业配置
- **WHEN** 为秦国创建 CommodityPool
- **THEN** 矿石供给倍率 = 1.5，食物供给倍率 = 0.8，丹药供给倍率 = 0.7

#### Scenario: 随机扰动
- **WHEN** 同一国家在不同存档中初始化
- **THEN** 各商品供给倍率在基准值上 ±20% 随机扰动

### Requirement: CommodityPool 初始供需平衡

CommodityPool SHALL 在构造时按目标供需比初始化 demand，使开局价格在 0.85×-1.15× 基准价区间。

#### Scenario: 默认构造函数行为变更
- **WHEN** 调用 `CommodityPool()` 默认构造
- **THEN** supply[i] = 100，demand[i] = 100（targetRatio=1.0），对应价格 = 基准价

#### Scenario: 按国家配置初始化
- **WHEN** 调用 `CommodityPool::initWithProfile(baseSupply, demandRatios[6])`
- **THEN** supply[i] = baseSupply × supplyBias[i] × jitter(0.8,1.2)，demand[i] = supply[i] × demandRatios[i]

#### Scenario: 价格验证
- **WHEN** 初始化完成后调用 `PriceEngine::getPrice(pool, Ore)`
- **THEN** 价格在 [basePrice×0.85, basePrice×1.15] 范围内

### Requirement: NPC 角色金字塔分配

NPCCreationSystem SHALL 按金字塔模板为每个家族分配 NPC 角色：

| 角色 | 数量/家族 | 最低境界 | 最高境界 |
|:---|:---|:---|:---|
| FamilyHead | 1 | GoldenCore | YuanInfant |
| Elder | 2 | FoundationBuilding | GoldenCore |
| LawEnforcementElder | 1 | FoundationBuilding | GoldenCore |
| CoreDisciple | 3 | QiRefining | FoundationBuilding |
| InnerDisciple | 8 | QiRefining | QiRefining |
| BranchDisciple | 15 | Mortal | QiRefining |

#### Scenario: 家族角色分配
- **WHEN** 为某家族创建 30 个 NPC
- **THEN** 角色数量符合金字塔分布（1:2:1:3:8:15）

#### Scenario: 境界与角色匹配
- **WHEN** 创建 FamilyHead 角色
- **THEN** 境界在 [GoldenCore, YuanInfant] 范围内随机，basePower ≥ 2000

### Requirement: 性格正态分布

NPCCreationSystem SHALL 使用正态分布生成 NPC 性格，均值由国家和角色决定，标准差 = 15。

#### Scenario: 秦国家主性格
- **WHEN** 为秦国创建 FamilyHead
- **THEN** ambition ~ N(75, 15)，loyalty ~ N(75, 15)，结果 clamp 到 [5, 95]

#### Scenario: 个体差异
- **WHEN** 创建 100 个秦国 BranchDisciple
- **THEN** ambition 标准差 > 10（不再全部等于 70）

### Requirement: factionCareerHeritage 初始化

NPCCreationSystem SHALL 在创建 NPC 时按国家产业配置设置 `factionCareerHeritage`。

#### Scenario: 秦国矿工
- **WHEN** 为秦国创建 BranchDisciple
- **THEN** factionCareerHeritage 包含 `CareerTag::Miner`

#### Scenario: 经济信号生效
- **WHEN** 矿石紧缺（ironOreDemand > 1.5）且 NPC 的 heritage 包含 Miner
- **THEN** `economicBiasFor(Mine)` 返回值 > 1.0

### Requirement: 初始关系网络

系统 SHALL 在 NPC 创建后为同族成员建立初始关系。

#### Scenario: 同族初始亲密度
- **WHEN** 两个 NPC 属于同一 clan
- **THEN** 初始亲密度在 [+20, +50] 范围内随机

#### Scenario: 社交层立即可用
- **WHEN** NPC 的 sociability ≥ 60 且 relationCount > 0
- **THEN** `evaluateSocial()` 可以触发 VisitFriend/Gossip 等行为

### Requirement: 阵营偏见初始化

系统 SHALL 在世界生成时为家族间设置初始阵营偏见。

#### Scenario: 秦楚世仇
- **WHEN** 秦国皇族与楚国皇族
- **THEN** 阵营亲和度在 [-40, -20] 范围

#### Scenario: 同国加成
- **WHEN** 两个同属秦国的家族
- **THEN** 阵营亲和度在 [+10, +30] 范围

### Requirement: NPC 位置与家族领地关联

NPCCreationSystem SHALL 将 NPC 位置定位在所属家族领地内。

#### Scenario: 家主位置
- **WHEN** 创建 FamilyHead
- **THEN** 位置在家族 centerX/centerY 附近（半径 ≤ 2）

#### Scenario: 分支弟子位置
- **WHEN** 创建 BranchDisciple
- **THEN** 位置在家族领地范围内正态分布

### Requirement: 初始灵石按角色分配

NPCCreationSystem SHALL 按角色和国家经济倍率分配初始灵石。

#### Scenario: 家主初始灵石
- **WHEN** 创建 FamilyHead
- **THEN** spiritStones = 500 × 国家经济倍率

#### Scenario: 分支弟子初始灵石
- **WHEN** 创建 BranchDisciple
- **THEN** spiritStones = 100 × 国家经济倍率

### Requirement: 修炼进度按境界初始化

NPCCreationSystem SHALL 按境界设置 CultivationComponent 的初始进度。

#### Scenario: 金丹境家主
- **WHEN** 创建 GoldenCore 境界的 FamilyHead
- **THEN** cultivationProgress 在 [300, 800] 范围内随机

#### Scenario: 凡人分支弟子
- **WHEN** 创建 Mortal 境界的 BranchDisciple
- **THEN** cultivationProgress = 0

### Requirement: 驱动力保障

系统 SHALL 在 NPC 创建后检查驱动力，确保每个 NPC 至少在一个决策层活跃。

#### Scenario: 低社交低勤奋 NPC
- **WHEN** NPC 的 sociability < 50 且 diligence < 50
- **THEN** 系统提升其中一项至 ≥ 50，或赋予初始关系

## MODIFIED Requirements

### Requirement: CommodityPool 默认构造函数

**原行为**: supply[i]=100, demand[i]=0（所有商品价格触底）
**新行为**: supply[i]=100, demand[i]=100（价格 = 基准价）

**BREAKING**: 所有依赖 demand=0 初始状态的测试/逻辑需要更新。

### Requirement: NPCCreationSystem::createBatchNPCs

**原行为**: 均匀轮转角色（每种 20%），全部 Mortal 境界，clanId="clan_0"
**新行为**: 按金字塔模板分配角色，境界按角色匹配，clanId 关联真实家族

### Requirement: NPCCreationSystem::createPersonalityByNation

**原行为**: ambition/caution/loyalty/greed 为固定值，sociability/diligence 在 [30,70] 均匀分布
**新行为**: 六维性格 = 国家均值 + 角色修正 + N(0,15) 正态扰动，clamp 到 [5, 95]

### Requirement: NPCCreationSystem::createStatsForRealm

**原行为**: basePower = 500 + layer×100（忽略境界）
**新行为**: basePower 按境界查表（Mortal=100, QiRefining=300, ...），加 ±10% 扰动

### Requirement: WorldGenerator::generateResources

**原行为**: 15 个资源点类型从 {"灵田","矿脉","遗迹"} 均匀随机
**新行为**: 资源点按国家领地分配，确保每个国家的主导资源点 ≥ 2 个

## REMOVED Requirements

无。

