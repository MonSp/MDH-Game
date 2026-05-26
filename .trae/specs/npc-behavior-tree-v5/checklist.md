# Checklist

## 基础设施
- [x] `ActivityCategory` 枚举包含 8 个类别值（SURVIVAL/DAILY/CULTIVATION/SOCIAL/PRODUCTION/COMBAT/EXPLORATION/COMMAND）
- [x] 8 个组件 bitmask 常量定义（REQ_POSITION=1, REQ_STATS=2, REQ_RESOURCES=4, REQ_SOCIAL=8, REQ_CULT=16, REQ_RELATIONSHIP=32, REQ_CMD=64, REQ_IDENTITY=128）
- [x] `ExecuteDescriptor` 包含 activity / name / category / requiredComponents / execute 五个字段
- [x] `ExecuteContext` 提供惰性 get 方法（getPosition/getStats/getResources/getSocial/getCult/getRelationship/getCmd/getIdentity）
- [x] ExecuteContext 缓存已获取的组件指针，entityId 不变时不重复查询

## BehaviorTreeSystem 重构
- [x] `execute()` 中 switch-case 移除，改为 `kExecuteTable[]` 查表分发
- [x] `evaluate()` 保持 6 层优先级不变（行为不变）
- [x] 48 个私有 `execute*()` 方法定义全部移除
- [x] `activityName()` 方法移除
- [x] 保留 `evaluateSurvival/evaluateCommand/evaluateLLMPlan/evaluateSocial/evaluateCultivation/evaluateDaily`
- [x] 保留 `getRiskLevel/translateActionType/chooseByRole/random01/randRange`
- [x] `BehaviorTreeSystem.h` 行数从 936 降至 411 行（-56%）

## 分类头文件
- [x] `BehaviorTree_Survival.h` — exec_flee / exec_heal / exec_defend + 3 条目表
- [x] `BehaviorTree_Daily.h` — exec_eat / exec_rest / exec_sleep / exec_walk / exec_awaitOrders + 5 条目表
- [x] `BehaviorTree_Cultivation.h` — exec_cultivate / exec_breakthrough / exec_tribulation / exec_meditate / exec_alchemy / exec_seekFortune + 6 条目表
- [x] `BehaviorTree_Social.h` — exec_visitFriend / exec_date / exec_familyGathering / exec_mentorTeach / exec_discipleAsk / exec_trade / exec_gossip / exec_reportTask + 8 条目表
- [x] `BehaviorTree_Production.h` — exec_build / exec_mine / exec_farm / exec_fish / exec_lumber / exec_gather / exec_craft / exec_refine / exec_cook / exec_construct / exec_repair / exec_sell / exec_buy + 13 条目表
- [x] `BehaviorTree_Combat.h` — exec_duel / exec_hunt / exec_ambush / exec_assassinate / exec_attack / exec_defendPosition / exec_patrol / exec_escort / exec_scout + 9 条目表
- [x] `BehaviorTree_Exploration.h` — exec_explore / exec_treasureHunt / exec_mapExplore + 3 条目表
- [x] `BehaviorTree_Command.h` — exec_refuseCommand / exec_coordinateSquad + 2 条目表
- [x] 所有 exec_*() 函数签名统一为 `void exec_xxx(ExecuteContext& ctx)`
- [x] 每个分类头文件末尾有 `constexpr ExecuteDescriptor kXxxTable[]` 常量表

## kExecuteTable 汇总
- [x] 全局 `kExecuteTable[]` 包含全部 50 个 activity 条目（含 Chat、AwaitOrders）
- [x] 每条条目正确填写 activity / name / category / requiredComponents / execute
- [x] 每个 activity 名与重构前 `activityName()` 返回值一致
- [x] 查表匹配 `desc.activity == behavior->currentActivity` 后直接调用 `desc.execute(ctx)`

## 向后兼容
- [x] `BehaviorTreeSystem::getInstance().evaluate(id, time)` 对外行为不变
- [x] `BehaviorTreeSystem::getInstance().execute(id, time, dt)` 对外接口和语义不变
- [x] `NPChunkUpdateSystem` 无需修改（调用接口不变）
- [x] `CommandChainSystem` 无需修改

## 编译验证
- [x] g++ -std=c++17 -c -D__EMSCRIPTEN__ 所有新/改文件编译通过
- [x] 修复 pre-existing 的 4 个 ActionType 枚举缺失（LLMComponent.h）
- [x] 新增 1 个独立基础设施头文件 `ExecuteDescriptor.h`

## 测试验证
- [x] 原有 23 个 gtest 全部通过（smoke=2, BTEvaluator=5, CommandResponseComponent=5, MemoryRingComponent=5, RelationshipComponent=6）
- [x] 新增 `ExecuteDescriptorDispatch` 测试套件 9 个测试通过（test/npc/ExecuteDescriptor.test.cpp）
- [x] **总计 32 测试，6 suites，全部通过**
