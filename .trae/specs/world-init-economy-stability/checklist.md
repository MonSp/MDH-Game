# Checklist

## P0：经济基础修复

- [x] CommodityPool 默认构造后 demand[i] == 100（而非 0）
- [x] PriceEngine::getPrice(默认pool, Ore) 返回 5.0（而非 1.5）
- [x] CommodityPool::initWithProfile 方法存在且功能正确
- [x] NationEconomyProfile 结构体定义完整（7 国配置表）
- [x] getNationProfile("秦").supplyBias[0] == 1.5
- [x] MarketService.ts 的初始 demand 与 C++ 端一致

## P1：NPC 创建核心重构

- [x] createStatsForRealm(GoldenCore, 5) 返回 basePower ≥ 1800
- [x] createStatsForRealm(Mortal, 9) 返回 basePower ≈ 550（而非 1400）
- [x] createPersonalityByNation("Qin", FamilyHead) 的 ambition 均值 ≈ 75
- [x] 100 个秦国 NPC 的 ambition 标准差 > 10（不再全部等于 70）
- [x] createFamilyNPCs 为每个家族创建 30 个 NPC
- [x] 角色分布：1 FamilyHead + 2 Elder + 1 LawEnforcementElder + 3 CoreDisciple + 8 InnerDisciple + 15 BranchDisciple
- [x] FamilyHead 境界 ≥ GoldenCore
- [x] BranchDisciple 境界 ≤ QiRefining
- [x] clanId 不为 "clan_0"，而是 WorldGenerator 中的真实 clan.id
- [x] factionCareerHeritage 不为 0（秦国 NPC 包含 Miner 位）
- [x] GoldenCore 家主的 cultivationProgress > 0
- [x] Mortal 分支弟子的 cultivationProgress == 0
- [x] 所有 NPC 的 max(diligence, sociability, ambition) ≥ 50
- [x] 初始灵石：FamilyHead ≈ 500，BranchDisciple ≈ 100

## P2：关系网络与阵营偏见

- [x] 同族 NPC 的 relationCount ≥ 5
- [x] 同族 NPC 间亲密度在 [+20, +50] 范围
- [x] 秦国皇族与楚国皇族的阵营亲和度 < -15
- [x] 同国家家族间阵营亲和度 > 0
- [x] evaluateSocial() 对 sociability ≥ 60 且 relationCount > 0 的 NPC 可触发

## P3：世界生成改造

- [x] 秦国领地内矿脉数量 ≥ 2
- [x] 楚国领地内灵田数量 ≥ 2
- [x] 资源点总数不变（15 个 + 国家主导资源点）
- [x] main.cpp 初始化流程：WorldGenerator → createFamilyNPCs（而非 createBatchNPCs）
- [x] 112 个家族各有独立的 CommodityPool
- [x] 秦国皇族 Treasury == 100000 × heavenLevel

## P4：验证与文档

- [x] 价格验证：开局后 60 帧内无商品价格触底（< basePrice×0.7）
- [x] 经济信号验证：矿石紧缺时秦国矿工的 economicBiasFor(Mine) > 1.0
- [x] 文档更新：NPC行为树系统介绍.md 迭代总览表包含 V7.4 行
- [x] 文档更新：NPC行为树系统介绍.md 数字一览表包含 V7.4 列
