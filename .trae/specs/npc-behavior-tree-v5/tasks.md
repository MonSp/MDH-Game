# Tasks

## Phase 1: 基础设施（无依赖，可并行）

- [x] Task 1: 新增 ActivityCategory 枚举
  - 文件: `src/server/game/npc/ExecuteDescriptor.h`
  - [x] 在独立头文件中定义 `ActivityCategory` 枚举（8 个值）
  - [x] 定义 `REQ_POSITION` 等 8 个组件 bitmask 常量
  - [x] 验证: g++ 编译通过

- [x] Task 2: 新增 ExecuteDescriptor + ExecuteContext
  - 文件: `src/server/game/npc/ExecuteDescriptor.h`
  - [x] 新增 `struct ExecuteDescriptor` 结构体定义（5 个字段）
  - [x] 新增 `struct ExecuteContext` 结构体定义（8 个缓存成员 + 惰性 getter）
  - [x] 验证: g++ 编译通过

- [x] Task 3: 重写 BehaviorTreeSystem::execute() 为查表分发
  - 文件: `src/server/game/npc/BehaviorTreeSystem.h`
  - [x] 移除 48 路 switch-case + 48 个私有 execute*() 方法 + activityName()
  - [x] 实现查表分发：`for (auto& desc : kExecuteTable) { if match → desc.execute(ctx); }`
  - [x] 保留 evaluate() + 6 层优先级 + 全部辅助方法不变
  - [x] 验证: g++ + 全部 32 测试通过

## Phase 2: 分类头文件（全部并行，互不依赖）

- [x] Task 4: 创建 BehaviorTree_Survival.h — exec_flee / exec_heal / exec_defend（3 个）
- [x] Task 5: 创建 BehaviorTree_Daily.h — exec_eat / exec_rest / exec_sleep / exec_walk / exec_awaitOrders（5 个）
- [x] Task 6: 创建 BehaviorTree_Cultivation.h — exec_cultivate / exec_breakthrough / exec_tribulation / exec_meditate / exec_alchemy / exec_seekFortune（6 个）
- [x] Task 7: 创建 BehaviorTree_Social.h — exec_visitFriend / exec_date / exec_familyGathering / exec_mentorTeach / exec_discipleAsk / exec_trade / exec_gossip / exec_reportTask（8 个）
- [x] Task 8: 创建 BehaviorTree_Production.h — exec_build / exec_mine / exec_farm / exec_fish / exec_lumber / exec_gather / exec_craft / exec_refine / exec_cook / exec_construct / exec_repair / exec_sell / exec_buy（13 个）
- [x] Task 9: 创建 BehaviorTree_Combat.h — exec_duel / exec_hunt / exec_ambush / exec_assassinate / exec_attack / exec_defendPosition / exec_patrol / exec_escort / exec_scout（9 个）
- [x] Task 10: 创建 BehaviorTree_Exploration.h + BehaviorTree_Command.h — exec_explore / exec_treasureHunt / exec_mapExplore / exec_refuseCommand / exec_coordinateSquad（5 个）

## Phase 3: 整合与收尾

- [x] Task 11: 全局 kExecuteTable + BehaviorTreeSystem 清理
  - [x] `kExecuteTable[]` 包含全部 50 条 activity 条目（含 Chat）
  - [x] 从 BehaviorTreeSystem 中移除 48 个私有 execute*() 方法
  - [x] 移除 `activityName()` 方法
  - [x] include 所有 9 个头文件（ExecuteDescriptor + 8 个分类）

- [x] Task 12: 测试
  - [x] 原有 23 个 gtest 全部通过（不受影响）
  - [x] 新增 `test/npc/ExecuteDescriptor.test.cpp` — 9 个测试覆盖表大小、去重、分类覆盖、惰性加载、实际分发
  - [x] **32 测试全部通过（6 suites）**

- [x] Task 13: 编译验证
  - [x] g++ 编译通过（4 个 ActionType 枚举缺失为 pre-existing，已修复）
  - [x] 全部 C++ 测试编译 + 运行时通过

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4-10] depends on [Task 1], [Task 2]
- [Task 11] depends on [Task 3], [Task 4-10]
- [Task 12] depends on [Task 11]
- [Task 13] depends on [Task 12]
