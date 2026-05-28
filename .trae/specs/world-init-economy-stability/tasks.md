# Tasks

## P0：经济基础修复（阻塞所有后续工作）

- [x] Task 1: CommodityPool 初始供需平衡 — P0
  - [x] 1.1 修改 `CommodityPool.h` 默认构造函数：demand[i] 从 0 改为 100（与 supply 对齐）
  - [x] 1.2 新增 `CommodityPool(float targetRatio)` 构造函数：demand[i] = 100 × targetRatio
  - [x] 1.3 新增 `CommodityPool::initWithProfile(float baseSupply, const float demandRatios[6])` 方法：按配置设置 supply 和 demand
  - [x] 1.4 更新 `MarketService.ts` 构造函数：this.demands 从 0 改为与 supply 对齐（与 C++ 端一致）
  - **验证**: 默认构造后 PriceEngine::getPrice(pool, Ore) 返回 5.0（而非 1.5）

- [x] Task 2: NationEconomyProfile 国家产业配置数据结构 — P0
  - [x] 2.1 新建 `NationEconomyProfile.h` 定义 `EconomicSpecialty` 枚举
  - [x] 2.2 定义 `NationEconomyProfile` 结构体
  - [x] 2.3 定义 7 国的静态配置表
  - [x] 2.4 实现 `getNationProfile(nation)` 查询函数
  - [x] 2.5 实现 `applySupplyBiasJitter()` 函数
  - **验证**: getNationProfile("秦").supplyBias[Ore] == 1.5

## P1：NPC 创建核心重构

- [x] Task 3: NPCCreationSystem::createStatsForRealm 按境界分配属性 — P1
  - [x] 3.1 修改 `createStatsForRealm` 按境界查表分配 basePower
  - [x] 3.2 保留 layer 微调：basePower += layer × 50
  - [x] 3.3 添加 ±10% 随机扰动
  - [x] 3.4 更新 hp/mp 计算
  - **验证**: GoldenCore 境界 NPC 的 basePower ≥ 1800

- [x] Task 4: NPCCreationSystem::createPersonalityByNation 正态分布性格 — P1
  - [x] 4.1 定义 7 国性格均值表
  - [x] 4.2 定义角色性格修正表
  - [x] 4.3 函数签名改为接受 NPCRole 参数
  - [x] 4.4 使用正态分布替代固定值
  - [x] 4.5 clamp 结果到 [5.0, 95.0]
  - **验证**: 100 个秦国 NPC 的 ambition 标准差 > 10

- [x] Task 5: NPCCreationSystem 角色金字塔模板 — P1
  - [x] 5.1 定义 `FamilyNPCConfig` 结构体
  - [x] 5.2 定义标准模板数组
  - [x] 5.3 实现 `createFamilyNPCs` 方法
  - [x] 5.4 按模板循环创建 NPC，境界按角色分配
  - [x] 5.5 clanId 使用 clan.id
  - [x] 5.6 位置在家族领地内正态分布
  - [x] 5.7 初始灵石按角色分配
  - **验证**: 每个家族 30 个 NPC，角色分布为 1:2:1:3:8:15

- [x] Task 6: factionCareerHeritage 按国家设置 — P1
  - [x] 6.1 创建 IdentityComponent 后调用 assignFactionCareerHeritage
  - [x] 6.2 实现国家→CareerTag 映射
  - [x] 6.3 BranchDisciple 只保留初级职业标签
  - [x] 6.4 FamilyHead/Elder 保留全部标签
  - **验证**: 秦国 BranchDisciple 的 heritage 包含 Miner 位

- [x] Task 7: CultivationComponent 按境界初始化 — P1
  - [x] 7.1 调用 initCultivationForRealm
  - [x] 7.2-7.6 各境界进度范围正确
  - **验证**: GoldenCore 家主的 cultivationProgress > 0

- [x] Task 8: 驱动力保障检查 — P1
  - [x] 8.1 调用 ensureNPCDrive
  - [x] 8.2-8.3 检查并修正无驱动力 NPC
  - [x] 8.4 确保无"平庸"NPC
  - **验证**: 所有 NPC 的 max(diligence, sociability, ambition) ≥ 50

## P2：关系网络与阵营偏见

- [x] Task 9: 家族内部初始关系构建 — P2
  - [x] 9.1-9.5 为同族成员建立初始关系
  - **验证**: 同族 NPC 的 relationCount ≥ 5

- [x] Task 10: 家族间阵营偏见初始化 — P2
  - [x] 10.1-10.6 7×7 国家关系矩阵 + 随机扰动
  - **验证**: 秦国皇族与楚国皇族的阵营亲和度 < -15

## P3：世界生成改造

- [x] Task 11: WorldGenerator 资源点按国家分配 — P3
  - [x] 11.1-11.4 国家专属资源点 + 随机资源点
  - **验证**: 秦国领地内矿脉数量 ≥ 2

- [x] Task 12: WorldGenerator 与 NPCCreationSystem 集成 — P3
  - [x] 12.1-12.4 main.cpp 改用 createFamilyNPCs
  - **验证**: 112 个家族各有独立 clanId

- [x] Task 13: MarketRegistry 按家族初始化 CommodityPool — P3
  - [x] 13.1-13.3 按国家配置初始化 pool 和 Treasury
  - **验证**: 秦国皇族的 Ore pool supply > 楚国皇族

## P4：验证与文档更新

- [x] Task 14: 更新相关文档 — P4
  - [x] 14.1 更新 `docs/npc/NPC行为树系统介绍.md` 的"数字一览"表
  - [x] 14.2 更新迭代总览表添加 V7.4 行
  - [x] 14.3 添加世界初始化 Spec 链接

# Task Dependencies

- Task 1（CommodityPool）不依赖其他任务，可独立执行
- Task 2（NationEconomyProfile）不依赖其他任务，可独立执行
- Task 3（createStatsForRealm）不依赖其他任务，可独立执行
- Task 4（createPersonalityByNation）不依赖其他任务，可独立执行
- Task 5（角色金字塔）依赖 Task 1, 2, 3, 4
- Task 6-9, 13 依赖 Task 5
- Task 10 依赖 Task 5
- Task 11 不依赖其他任务，可独立执行
- Task 12 依赖 Task 5, 11
- Task 14 依赖所有前置任务

# 可并行执行组

**第一组（无依赖，可并行）**: Task 1, Task 2, Task 3, Task 4, Task 11 ✅
**第二组（依赖第一组）**: Task 5 ✅
**第三组（依赖第二组，可并行）**: Task 6, Task 7, Task 8, Task 9, Task 10, Task 13 ✅
**第四组（依赖第三组）**: Task 12 ✅
**第五组（依赖第四组）**: Task 14（进行中）
