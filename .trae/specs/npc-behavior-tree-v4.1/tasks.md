# Tasks

## Phase 1: 核心 Bug 修复（独立、无依赖）
- [x] Task 1: 修复 BTEvaluator Selector 节点语义
  - 文件: `src/server/game/bt/BTEvaluator.h`
  - [x] 修改 `evaluate()` 中 `case 4`（Selector 类型）的处理逻辑
  - [x] Selector 子条件 true → 进入 action 链 → 返回 true
  - [x] Selector 子条件 false → 跳到 `next` 索引尝试下一个兄弟条件
  - [x] Selector 所有子条件 false → 跳到 `fail` 分支
  - [x] 验证: `g++ -std=c++17 -c -D__EMSCRIPTEN__` 编译通过

- [x] Task 2: 修复 evaluateCommand 硬编码参数
  - 文件: `src/server/game/npc/BehaviorTreeSystem.h`
  - [x] 在 `evaluateCommand()` 中通过 `cmd->issuerId` 查找 issuer slot 并读取 `RelationshipComponent::getAffinity()`
  - [x] 新增 `getRiskLevel(NPCActivity)` 辅助函数，按活动类型返回风险值（战斗类 0.9 / 侦查类 0.5 / 采集类 0.1 / 默认 0.3）
  - [x] 将 `relationshipValue` 和 `riskLevel` 实际值传入 `cmdResp->evaluateResponse()`
  - [x] 验证: g++ 编译通过

- [x] Task 3: 修复 hasDisciples() 空壳
  - 文件: `src/server/game/ecs/components/RelationshipComponent.h` + `src/server/game/ecs/Registry.h`
  - [x] 修改 `hasDisciples()` 实现：遍历 Registry 中所有活跃 slot，检查 `mentorSlot == 当前slot`
  - [x] 性能考虑：遍历最多 4096 slot 开销可接受（仅在社交层 evaluate 中被调用，低频）
  - [x] 验证: g++ 编译通过

- [x] Task 4: 修复 WitnessedSlot 编码对齐
  - 文件: `src/server/game/ecs/components/MemoryRingComponent.h`
  - [x] 将 `WitnessedSlot` 从 `{uint64_t timestamp; uint16_t eventIndex; uint8_t significance; uint8_t _pad;}` (12 bytes) 改为 `{uint64_t timestamp; uint32_t slot; uint8_t significance; uint8_t _pad;}` (14 bytes)
  - [x] RingBuffer 模板自动适配新 sizeof
  - [x] 验证: g++ 编译通过

## Phase 2: CommandChainSystem 优化（独立）

- [x] Task 5: findDelegationParent 反向索引优化
  - 文件: `src/server/game/npc/CommandChainSystem.h`
  - [x] 新增 `struct ParentMapping { uint32_t parentSlot; uint32_t parentCommandId; }`
  - [x] 新增成员 `m_childToParent[256]`（固定大小哈希表）
  - [x] 在 `processDelegation()` 中 `addChildCommand()` 调用时写入 `m_childToParent[childCmdId % 256]`
  - [x] 重写 `findDelegationParent()` 使用 `m_childToParent` 索引查找，移除全遍历

## Phase 3: 空壳方法填入（并行）

- [x] Task 6: 实现 executeFamilyGathering 逻辑
  - 文件: `src/server/game/npc/BehaviorTreeSystem.h`
  - [x] NPC 向原点(0,0)聚集点移动
  - [x] 到达后停留
  - [x] 验证: g++ 编译通过

- [x] Task 7: 实现 executeMentorTeach 逻辑
  - 文件: `src/server/game/npc/BehaviorTreeSystem.h`
  - [x] 遍历 Registry 查找 `mentorSlot == selfSlot` 的 NPC
  - [x] 对每个弟子 `cult->addProgress(0.5f * 0.016f)`，mentor `stats->mp -= 5`
  - [x] 验证: g++ 编译通过

- [x] Task 8: 实现 executeDiscipleAsk 逻辑
  - 文件: `src/server/game/npc/BehaviorTreeSystem.h`
  - [x] 查询 mentorSlot 对应的 NPC 的 CultivationComponent
  - [x] 若 mentor 存在且境界 ≥ 自身：`cult->addProgress(1.5f * 0.016f)`
  - [x] 若 mentor 不存在：降级为 `cult->addProgress(1.0f * 0.016f)`（自主修炼）
  - [x] 验证: g++ 编译通过

## Phase 4: C++ 测试框架与测试用例（依赖 Phase 1-3 完成）

- [x] Task 9: 搭建 gtest 测试框架
  - [x] 在 `test/` 下创建 `Makefile`，包含 gtest 编译链接规则
  - [x] 创建 `test/common/test_utils.h`：Registry 初始化/清理辅助、NPC 创建辅助、确定性随机数辅助
  - [x] 创建 `test/common/smoke.test.cpp`：2 个冒烟测试验证框架可用
  - [x] 验证: `make run` 全部通过（23 测试）

- [x] Task 10: 编写 BTEvaluator 测试用例
  - 文件: `test/bt/BTEvaluator.test.cpp`
  - [x] 测试1: `SelectorNodeTrueReturnsImmediately` — 第一个子条件 true 时立即返回，不检查后续兄弟
  - [x] 测试2: `SequenceNodeFailsOnFirstFalse` — 第一个子条件 false 时跳 fail 分支
  - [x] 测试3: `BlackboardCacheDirtyFlag` — dirty=0 时跳过条件评估直接执行 action
  - [x] 测试4: `ConditionEvaluation` — 6 种 condition 各自正确评估
  - [x] 测试5: `TemplateRootEntry` — 模板根节点索引正确入口
  - [x] 验证: `make && ./bt/BTEvaluator.test` 5/5 通过

- [x] Task 11: 编写 CommandResponseComponent 测试用例
  - 文件: `test/components/CommandResponseComponent.test.cpp`
  - [x] 测试1: `LoyaltyAbove70AlwaysAccepts` — 输入 loyalty=80，验证 isAccepting()=true
  - [x] 测试2: `LowLoyaltyHighRiskRefuses` — loyalty=25、riskLevel=0.9，拒绝概率 100%
  - [x] 测试3: `AmbitionOverachievement` — ambition=90，验证 30% 概率 overachieveMult∈[1.2,1.5]
  - [x] 测试4: `GreedInterceptRatio` — greed=85，验证 25% 概率 resourceInterceptRatio∈[0.1,0.3]
  - [x] 测试5: `RelationshipModifiesProbability` — relationshipValue=-30 降低 20%；+60 增加 10%
  - [x] 验证: `make && ./components/CommandResponseComponent.test` 5/5 通过

- [x] Task 12: 编写 RelationshipComponent 测试用例
  - 文件: `test/components/RelationshipComponent.test.cpp`
  - [x] 测试1: `SetAffinityBounded` — modifyAffinity 钳位到 [-100, 100]
  - [x] 测试2: `ModifyAffinityClamped` — 多次 modifyAffinity 不越界
  - [x] 测试3: `TopRelationshipsSorted` — 按绝对值排序正确
  - [x] 测试4: `CapacityLimit` — relationCount 最多 50
  - [x] 测试5: `HasDisciplesTrue` — 有弟子时返回 true
  - [x] 测试6: `HasDisciplesFalse` — 无弟子时返回 false
  - [x] 验证: `make && ./components/RelationshipComponent.test` 6/6 通过

- [x] Task 13: 编写 MemoryRingComponent 测试用例
  - 文件: `test/components/MemoryRingComponent.test.cpp`
  - [x] 测试1: `PushGetRecentOrder` — push 5 条，getRecent(3) 顺序正确
  - [x] 测试2: `OverflowOverwrites` — 25 次 push 后 count=20，最早覆盖
  - [x] 测试3: `ConsecutiveFailuresCount` — 连续 4 条失败正确计数
  - [x] 测试4: `OverachieveCount` — 超额完成正确计数
  - [x] 测试5: `WitnessedSlotEncoding` — slot/significance 字段值正确
  - [x] 验证: `make && ./components/MemoryRingComponent.test` 5/5 通过

# Task Dependencies
- [Task 9] depends on: none（可最先搭建）
- [Task 1] depends on: none
- [Task 2] depends on: none
- [Task 3] depends on: none
- [Task 4] depends on: none
- [Task 5] depends on: none
- [Task 6] depends on: none
- [Task 7] depends on: none
- [Task 8] depends on: none
- [Task 10] depends on: [Task 1], [Task 9]（BTEvaluator 测试依赖修复 + 框架）
- [Task 11] depends on: [Task 2], [Task 9]（CommandResponse 测试依赖 evaluateCommand 修复 + 框架）
- [Task 12] depends on: [Task 3], [Task 9]（RelationshipComponent 测试依赖 hasDisciples 修复 + 框架）
- [Task 13] depends on: [Task 4], [Task 9]（MemoryRing 测试依赖 WitnessedSlot 编码对齐 + 框架）
- [Task 1-9] 全部可并行开发，互不依赖
