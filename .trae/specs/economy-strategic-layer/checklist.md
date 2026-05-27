# Checklist: 经济战略层

> 验证经济战略层实现是否符合 Spec 中定义的所有需求和场景。

---

## 数据结构

- [ ] `EconomicDigest` 结构体包含所有字段：posture, treasuryBalance, weeklyIncomeRate, weeklyExpenseRate, alerts[3], opportunities[2], enemyWeaknesses[2]
- [ ] `EconomicDigestWasm` 紧凑结构 ≤ 256 字节，字段按 spec 定义排列
- [ ] `EconomicPosture` 枚举包含 Surplus / Balanced / Tight / Crisis 四个值
- [ ] `CommodityAlert` 含 commodityType, supply, demand, priceRatio, desc[32]
- [ ] `TradeOpportunity` 含 fromClanId, toClanId, commodityType, profitRate
- [ ] `EnemyWeakness` 含 clanId, weaknessType, desc[48]

## 态势计算逻辑

- [ ] `computeEconomicDigest` 遍历六类商品计算供需比
- [ ] 最严重的 3 个 alert 按 priceRatio 降序排列
- [ ] 跨家族比价正确（遍历所有家族 CommodityPool 找价差 > 20% 的机会）
- [ ] 敌族弱点检测正确（检测敌族 Food 依赖进口 / Treasury < 500 / 某商品价格 > 2.5×基准）
- [ ] 态势判定：储备率 < 0.5 或 max(d/s) > 3.0 → Crisis；储备率 < 1.0 或 max(d/s) > 2.0 → Tight；储备率 > 3.0 且 max(d/s) < 1.2 → Surplus；其余 → Balanced

## MarketRegistry 扩展

- [ ] `getEconomicDigest` 缓存 TTL=600 帧，命中直接返回
- [ ] `tickDecay` 标记 digestDirty=true
- [ ] `applyTaxRate` clamp 到 [0.01, 0.15]
- [ ] `applyEmbargo` 正确加入/移除 embargoTargets 集合
- [ ] `applyStockpile` 正确修改 stockpileRatios[type]
- [ ] `getEffectiveSupply` = supply × (1 - stockpileRatios[type])
- [ ] CaravanSystem 跳过 embargoTargets 中的目标家族

## 经济危机自动响应

- [ ] `evaluateEconomicCrisis` 在 NPC 层级 ≥ T2 且 posture == Crisis 时触发
- [ ] T2 自动执行经济动员：紧缺商品关联生产行为基线权重 ×1.5
- [ ] T1 额外执行价格平準：Treasury 动用不超过余额 30% 或 300 灵石上限
- [ ] Crisis 解除时（posture 变为 Tight/Balanced/Surplus）动员和平準自动撤销
- [ ] `kEvaluateLayers[]` 在 Emotion(2) 和 Command(3) 之间插入 EconomicCrisis(2.5)

## 5 种经济战略行为

- [ ] `SetTaxRate`：修改族级 taxRate，贪婪 NPC 交易意愿下降
- [ ] `TradeEmbargo`：禁止指定家族交互，冷却 1200 帧
- [ ] `StockpileMaterial`：标记储备比例，PriceEngine 从 getEffectiveSupply 读值
- [ ] `PriceStabilize`：短缺时溢价 120% 买入，过剩时折价 80% 卖出，回写 CommodityPool
- [ ] `EconomicMobilize`：修改全族 NPC 指定行为基线权重，300 帧自动过期，与 economicBiasFor 正确叠加
- [ ] 5 种行为均注册到 `kExecuteTable[]`，category=EconomyStrategy
- [ ] 各行为含前置检查（NPC 层级对应 T0/T1/T2）

## 行为标签

- [ ] SetTaxRate: CareerTag=Ruler, ResourceTag=SpiritStones, PersonalityTag=Ambitious
- [ ] TradeEmbargo: CareerTag=Ruler, ResourceTag=None, PersonalityTag=Cautious+Ambitious
- [ ] StockpileMaterial: CareerTag=Commander, ResourceTag=Materials, PersonalityTag=Cautious
- [ ] PriceStabilize: CareerTag=Commander, ResourceTag=SpiritStones, PersonalityTag=Diligent
- [ ] EconomicMobilize: CareerTag=Elder, ResourceTag=None, PersonalityTag=Diligent+Loyal
- [ ] 标签相似度匹配可发现经济战略行为（微规划兼容）

## WASM 导出

- [ ] `ecs_getEconomicDigest` 导出符号可被 JS 端调用
- [ ] EconomicDigestWasm 在 WASM 线性内存中正确布局
- [ ] 返回所有字段值正确（无内存越界）

## TS 端集成

- [ ] `wasmGetEconomicDigest` 正确解析二进制 → EconomicDigestWasm 对象
- [ ] `ECONOMIC_POSTURE_LABELS` 映射表输出正确中文
- [ ] `LLMPlanningService.buildPlanningPrompt()` 拼入经济摘要段落
- [ ] T0 prompt 含态势 + 警报 + 套利机会 + 敌族弱点
- [ ] T1 prompt 含态势 + 警报
- [ ] Balanced 态势下 prompt 输出一行简洁描述，无冗余 token

## 端到端场景

- [ ] 矿难场景：Ore supply=45, demand=380, Treasury=900 净流出 → digest.posture=Crisis → T2 自动动员 → T1 自动平準 → T0 LLM prompt 含警报
- [ ] 丰裕场景：所有商品 d/s 正常，Treasury 充足 → digest.posture=Surplus → 无危机响应 → prompt 简洁
- [ ] 动员叠加：基线权重 1.0，动员 ×1.5，economicBiasFor ×1.5 → 最终权重 2.25
- [ ] 动员过期：300 帧后权重自动恢复为基线值
- [ ] 贸易禁令：CaravanSystem 跳过被禁目标，冷却 1200 帧后禁令到期可重新设置
- [ ] 价格平準限制：Treasury 仅 50 灵石时最多支出 min(15, 300)=15 灵石

## 性能

- [ ] EconomicDigest 缓存命中率 > 99%（TTL=600 帧，同频衰减触发重算）
- [ ] `getEconomicDigest` 在缓存命中时 O(1)
- [ ] `computeEconomicDigest` 遍历 families × 6 商品，O(families)，家族数通常 < 20
- [ ] EconomicDigestWasm ≤ 256 字节，不显著增加 WASM 内存传输
- [ ] 经济战略行为只在 T0-T2 高优先级评估层触发，层级 NPC 数量极少（< 家族数 × 3）
