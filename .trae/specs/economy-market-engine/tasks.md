# Tasks

- [ ] Task 1: CommodityPool & PriceEngine 核心数据结构
  - [ ] 1.1 创建 `CommodityPool.h`：定义 `CommodityType` 枚举（Ore/Food/Equipment/Materials/Pills/SpiritStones），`CommodityPool` 结构体含 `supply[6]` + `demand[6]` 的 `int64_t` 数组
  - [ ] 1.2 创建 `PriceEngine.h`：实现 `static float getPrice(uint32_t familyId, CommodityType type)`，使用对数弹性公式 `basePrice * (1 + 0.3 * ln(demand/max(supply,1)))` clamped to `[0.3*base, 3.0*base]`
  - [ ] 1.3 定义各商品 basePrice: Ore=5, Food=3, Equipment=40, Materials=4, Pills=80, SpiritStones=1

- [ ] Task 2: MarketRegistry 全局注册中心
  - [ ] 2.1 创建 `MarketRegistry.h`：单例模式，维护 `Map<familyId, CommodityPool>`，提供 `recordProduction(entityId, type, amount)` / `recordConsumption(entityId, type, amount)` 静态方法
  - [ ] 2.2 `recordProduction`: 通过 `EntityId→IdentityComponent→familyId` 查找对应 CommodityPool，累加供给
  - [ ] 2.3 `recordConsumption`: 同上，累加需求
  - [ ] 2.4 NPC 个人收益计算: `getPersonalIncome(entityId, type, amount)` = amount × PriceEngine::getPrice(familyId, type)，将灵石写入 `ResourcesComponent`
  - [ ] 2.5 需求衰减：每 N 帧（如 600 帧 ≈ 10 秒），所有 demand 值 × 0.95，模拟需求自然消退（已消耗的需求不再持续推高价格）

- [ ] Task 3: 重构 15 种生产行为接入 CommodityPool
  - [ ] 3.1 Mine: 移除直接 `addSpiritStones(15*h)`，改为结束时 `recordProduction(Ore, 15)` + 个人收益结算
  - [ ] 3.2 Farm: 移除直接 `addSpiritStones(30-60)`，改为结束时 `recordProduction(Food, rand(30,60))` + 个人收益
  - [ ] 3.3 Fish: `recordProduction(Food, 10/hr)` + 个人收益
  - [ ] 3.4 Lumber: `recordProduction(Materials, 8/hr)` + 个人收益
  - [ ] 3.5 Gather: `recordProduction(Materials, 5/hr)` + 个人收益
  - [ ] 3.6 Craft: `recordConsumption(Ore, 5)` + 70%概率 `recordProduction(Equipment, 1)` + 个人收益 = EquipmentPrice - 5*OrePrice
  - [ ] 3.7 Refine: `recordConsumption(Ore, 8)` + 50%概率 `recordProduction(Materials, 2)` + 个人收益结算
  - [ ] 3.8 Cook: `recordConsumption(Food, 2)` + `recordProduction(Food, 1)`（加工溢价，产出 Food 价值 > 消耗） + 个人收益
  - [ ] 3.9 Tailor: `recordConsumption(Materials, 3)` + 65%概率 `recordProduction(Equipment, 1)` + 个人收益
  - [ ] 3.10 Build: `recordConsumption(Materials, 5/帧)` （不产出，建筑进度由 activityProgress 管理）
  - [ ] 3.11 Construct: `recordConsumption(Materials, 6/帧)` + `recordConsumption(Ore, 6/帧)`
  - [ ] 3.12 Repair: `recordConsumption(Materials, 2/帧)`
  - [ ] 3.13 Alchemy: 60%概率 `recordProduction(Pills, 1)` + 个人收益
  - [ ] 3.14 Sell: `recordConsumption(equipmentOrMaterial, 1)` + `recordProduction(SpiritStones, price*0.8)` + 个人收益
  - [ ] 3.15 Buy: `recordConsumption(SpiritStones, price)` + `recordProduction(equipmentOrMaterial, 1)` + 个人获得物品
  - [ ] 3.16 Bargain: `recordConsumption(SpiritStones, price*0.7)` + `recordProduction(SpiritStones, price*(0.6~1.5))` + 个人收益

- [ ] Task 4: EconomicSignals 切换数据源
  - [ ] 4.1 在 `EconomicSignals` 中新增 `computeFromMarket(uint32_t familyId)` 方法，从 `MarketRegistry` 读取 CommodityPool 的 demand/supply 比值
  - [ ] 4.2 修改定价格映射：`ironOreDemand = Ore.demand / max(Ore.supply, 1)`（保留 clamp），其他字段类推
  - [ ] 4.3 在 `evaluateDaily` 中调用 `ctx.econSignals.computeFromMarket(familyId)` 替换 `computeFromHeritage`
  - [ ] 4.4 保留 `computeFromHeritage` 作为 MarketRegistry 不可用时的回退路径

- [ ] Task 5: FamilyTreasury & 突破消耗
  - [ ] 5.1 在 `MarketRegistry` 中添加 `familyTreasury: Map<familyId, int64_t>` 和 `collectTax(familyId, amount)` 方法
  - [ ] 5.2 在 `recordProduction`/`recordConsumption` 中，Sell/Buy/Bargain/Trade 类型的交易完成后调用 `collectTax(familyId, amount * 0.05)`
  - [ ] 5.3 NPC 的 `familyContribution` 在纳税时同步增加（`contribution += taxAmount * 2`）
  - [ ] 5.4 修改 `exec_breakthrough` 增加灵石消耗：练气→筑基 300, 筑基→金丹 1000, 金丹→元婴 3000, 元婴→化神 10000
  - [ ] 5.5 突破时灵石不足 → 从 `familyTreasury` 借款（`familyContribution` 变为负值表示负债）
  - [ ] 5.6 突破消耗的灵石记录到 CommodityPool: `recordConsumption(SpiritStones, amount)`

- [ ] Task 6: CaravanSystem 商队套利
  - [ ] 6.1 创建 `CaravanSystem.h`：`findBestRoute(familyId)` 遍历所有家族的 CommodityPool，找出同商品价差最大的两个家族
  - [ ] 6.2 在 `BehaviorTree_Daily.h` 或 `BehaviorTree_Social.h` 中新增 `exec_caravanTrade` 行为
  - [ ] 6.3 在 `evaluateDaily` 或 `evaluateSocial` 中：`FamilyHead`/`Elder` + `Merchant` 传承 → 10% 概率触发商队
  - [ ] 6.4 商队逻辑：从低价区 `recordConsumption(commodity, 100)` → 移动至目标家族 → `recordProduction(commodity, 100)`
  - [ ] 6.5 商队利润 = 100 × (高价 - 低价) × 0.95（5% 税后），存入 familyTreasury
  - [ ] 6.6 同路线 500 帧冷却 + 5% 概率遭遇劫匪损失 50% 货物

- [ ] Task 7: 前端 MarketPanel 接入
  - [ ] 7.1 WASM 导出接口：`wasm.getMarketPrice(familyId, commodityType)` → `float`
  - [ ] 7.2 WASM 导出接口：`wasm.getCommodityPool(familyId, commodityType)` → `{supply, demand}`
  - [ ] 7.3 TS 层 `MarketService` 新增 `syncPricesFromWasm(familyId)` 方法，定时或按需同步
  - [ ] 7.4 `MarketPanel.tsx` 商品价格从 WASM 获取，替代硬编码随机波动
  - [ ] 7.5 玩家交易（买/卖）通过 `MarketRegistry::recordProduction/Consumption` 同步回 C++ CommodityPool

# Task Dependencies
- Task 2 依赖 Task 1（MarketRegistry 需要 CommodityPool + PriceEngine）
- Task 3 依赖 Task 2（生产行为需要 MarketRegistry API）
- Task 4 依赖 Task 2（EconomicSignals 需要 MarketRegistry）
- Task 5 依赖 Task 2,3（FamilyTreasury 依赖 MarketRegistry，突破消耗依赖行为改造）
- Task 6 依赖 Task 2,5（CaravanSystem 依赖 MarketRegistry + FamilyTreasury）
- Task 7 依赖 Task 2（前端需要 MarketRegistry WASM 接口）

# 可并行执行组
**第一组（无依赖）**: Task 1
**第二组（依赖 Task 1）**: Task 2
**第三组（依赖 Task 2，可并行）**: Task 3, Task 4
**第四组（依赖 Task 2,3）**: Task 5
**第五组（依赖 Task 2,5）**: Task 6
**第六组（依赖 Task 2）**: Task 7
