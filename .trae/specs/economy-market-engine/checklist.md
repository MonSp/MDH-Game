# Checklist

## CommodityPool & PriceEngine
- [x] CommodityType 枚举含 6 类（Ore/Food/Equipment/Materials/Pills/SpiritStones）
- [x] CommodityPool 结构体含 supply[6] + demand[6] int64_t 数组
- [x] PriceEngine 实现对数弹性公式 `basePrice × (1 + 0.3 × ln(demand/max(supply,1)))`
- [x] 价格 clamped 在 [0.3×base, 3.0×base] 区间
- [x] basePrice: Ore=5, Food=3, Equipment=40, Materials=4, Pills=80, SpiritStones=1

## MarketRegistry
- [x] 单例模式，Map<familyId, CommodityPool> 维护
- [x] recordProduction(entityId, type, amount) 通过 IdentityComponent 找到 clanId 并累加供给
- [x] recordConsumption(entityId, type, amount) 累加需求
- [x] getPersonalIncome 功能已内嵌于 recordProduction（PriceEngine × amount）
- [x] 需求衰减：每 600 帧所有 demand × 0.95

## 生产行为接入
- [x] Mine: recordProduction(Ore) 替代 addSpiritStones
- [x] Farm/Fish: recordProduction(Food) 替代 addSpiritStones
- [x] Lumber/Gather: recordProduction(Materials) 替代 addSpiritStones
- [x] Craft: recordConsumption(Ore) + recordProduction(Equipment)
- [x] Refine: recordConsumption(Ore) + recordProduction(Materials)
- [x] Cook: recordConsumption(Food) + recordProduction(Food) 加工溢价
- [x] Tailor: recordConsumption(Materials) + recordProduction(Equipment)
- [x] Build/Construct/Repair: recordConsumption(Materials/Ore) 每帧
- [x] Alchemy: recordProduction(Pills)
- [x] Sell: recordConsumption(Equipment) + recordProduction(SpiritStones)
- [x] Buy: recordConsumption(SpiritStones) + recordProduction(Equipment)
- [x] Bargain: recordConsumption(SpiritStones) + recordProduction(SpiritStones)
- [x] 所有行为 NPC 个人收益 = 产出量 × 市价（而非固定值）
- [x] Trade (社交): recordConsumption(Equipment) + recordProduction(SpiritStones)

## EconomicSignals 切换
- [x] computeFromMarket(clanId) 读取 MarketRegistry 真实供需
- [x] ironOreDemand = Ore.demand / max(Ore.supply, 1)
- [x] evaluateDaily 调用 computeFromMarket 替代 computeFromHeritage
- [x] MarketRegistry 不可用时回退到 computeFromHeritage

## FamilyTreasury & 突破消耗
- [x] familyTreasury Map 维护家族资金
- [x] Sell/Buy/Bargain/Trade 交易额 5% 自动抽税
- [x] 纳税时 familyContribution += taxAmount × 2
- [x] exec_breakthrough 消耗灵石：300/1000/3000/10000（4 个境界）
- [x] 灵石不足时从 familyTreasury 借款，contribution 变负值
- [x] 突破消耗记录到 CommodityPool

## CaravanSystem
- [x] findBestRoute(clanId) 找到最大价差路线
- [x] FamilyHead/Elder + Merchant 传承 → 10% 触发概率
- [x] 从低价区买入 100 单位 → 高价区卖出
- [x] 利润 = 100 × 价差 × 0.95 存入 Treasury
- [x] 同路线 500 帧冷却
- [x] 5% 遭遇劫匪损失 50% 货物

## 前端接入
- [x] WASM 导出 ecs_getMarketPrice 函数
- [x] WASM 导出 ecs_getCommodityPool 函数
- [x] ECSWasmLoader.ts 封装 wasmGetMarketPrice / wasmGetCommodityPool
- [x] gameStore updateMarketPrices 从 WASM 获取价格（Fallback: MarketService TS 独立引擎）

## 编译与性能
- [x] C++ WASM 导出函数添加到 wasm_exports.cpp
- [x] CommodityPool 内存增量 < 1KB/家族（6×2 int64_t = 96 bytes + map overhead）
- [x] PriceEngine::getPrice O(1) 无循环
- [x] 需求衰减分摊到每帧 O(families × 6)
