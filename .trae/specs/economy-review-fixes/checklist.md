# Checklist

## SpiritStones Tax Base Unification
- [x] recordProduction SpiritStones 税收 = `amount × price × 0.05`
- [x] recordConsumption SpiritStones 税收 = `amount × price × 0.05`（不再用 bare amount）

## Frontend Market Write-back
- [x] wasm_exports.cpp 新增 `ecs_recordMarketTransaction` 导出函数
- [x] ECSWasmLoader.ts 封装 `wasmRecordMarketTransaction`
- [x] gameStore buyItem 成功后调用 wasmRecordMarketTransaction(clanId, commodityType, amount, true)
- [x] gameStore sellItem 成功后调用 wasmRecordMarketTransaction(clanId, commodityType, amount, false)
- [x] WASM 不可用时静默降级，不影响玩家买卖

## Cook Profit Fix
- [x] exec_cook 消耗 2 Food
- [x] exec_cook 产出 rand(2, 3) Food（≥ 消耗量）

## EconomicSignals Cache
- [x] MarketRegistry 维护 `CachedEconSignals` 结构体
- [x] `getEconomicSignals(clanId, frame)` TTL=100 帧
- [x] tickDecay 触发时标记同 clanId 缓存 dirty
- [x] evaluateDaily 通过 MarketRegistry::getEconomicSignals 获取信号

## Farm Range Fix
- [x] exec_farm randRange(20, 60) → randRange(30, 60)

## WASM String Fix
- [x] wasmGetMarketPrice 写入后追加 null 终止符
- [x] wasmGetCommodityPool 写入后追加 null 终止符

## Caravan Profit Fix
- [x] executeRoute 利润存入 fromClan Treasury

## Caravan Cooldown Key Fix
- [x] cooldown key 使用 `\x01` 分隔符
- [x] findBestRoute 和 executeRoute key 格式一致
