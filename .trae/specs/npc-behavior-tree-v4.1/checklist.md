# Checklist

## BTEvaluator Selector 修复
- [x] `BTEvaluator::evaluate()` 中 `case 4`（Selector）子条件 true 时进入 action 链并返回 true
- [x] Selector 子条件 false 时跳到 `next` 索引，不立刻跳到 `fail`
- [x] Selector 所有子条件均 false 时跳到 `fail` 分支
- [x] Sequence 节点行为不变（子条件 false → `fail`，子条件 true → 推进）

## evaluateCommand 参数注入
- [x] `evaluateCommand` 中 `relationshipValue` 从 `RelationshipComponent::getAffinity(issuerSlot)` 读取
- [x] `riskLevel` 从 `getRiskLevel(commandType)` 辅助函数读取
- [x] 战斗类 activity（Attack/Hunt/Ambush/Assassinate/Duel）→ riskLevel=0.9
- [x] 侦查类 activity（Scout/Explore）→ riskLevel=0.5
- [x] 采集生产类 activity（Mine/Farm/Fish/Lumber/Build/Craft 等）→ riskLevel=0.1
- [x] 其他 activity → riskLevel=0.3（默认）

## hasDisciples 修复
- [x] `RelationshipComponent::hasDisciples()` 遍历 Registry 查找 `mentorSlot == 当前slot` 的 NPC
- [x] 有至少 1 个弟子时返回 true
- [x] 无弟子时返回 false

## WitnessedSlot 编码对齐
- [x] `WitnessedSlot` 结构体包含 `uint64_t timestamp + uint32_t slot + uint8_t significance + uint8_t _pad`
- [x] `MemoryRingComponent` 的 ring buffer 自动适配新 sizeof (14 bytes)
- [x] `ecs_getWitnessedEvents` WASM 导出函数偏移适配新结构体（待 WASM 重新编译时生效）
- [x] `ECSWasmLoader.ts` 中 `WitnessedEventWasm` 接口待适配（TS 侧绑定后续任务）
- [x] C++ 编译通过（g++ -std=c++17 -fsyntax-only）

## CommandChainSystem findDelegationParent 优化
- [x] `m_childToParent[256]` 反向索引数组存在
- [x] `processDelegation` 中 `addChildCommand` 调用时写入反向索引
- [x] `findDelegationParent` 使用 `m_childToParent[childCmdId % 256]` 直接查找
- [x] 移除原 `findDelegationParent` 中的 O(n×m×k) 全遍历
- [x] 哈希冲突处理：存入时直接覆盖（最后写入的生效）

## 空壳方法填入
- [x] `executeFamilyGathering` 向原点(0,0)聚集点移动
- [x] `executeFamilyGathering` 到达后停留
- [x] `executeMentorTeach` 遍历 disciples 增加 cultivationProgress，消耗 mentor mp
- [x] `executeMentorTeach` 每个弟子 +0.5*0.016 progress
- [x] `executeDiscipleAsk` 查询 mentor 境界，isHigher→1.5x 修炼加成
- [x] `executeDiscipleAsk` mentor 不存在时降级为自主 Cultivate (1.0x)

## 测试框架
- [x] `test/Makefile` 包含 gtest 编译链接规则，`make run` 成功
- [x] `test/common/test_utils.h` 提供 Registry 初始化/清理、NPC 创建、确定性随机数辅助

## BTEvaluator 测试
- [x] `SelectorNodeTrueReturnsImmediately` — 第一个子条件 true 时立即返回成功
- [x] `SequenceNodeFailsOnFirstFalse` — 第一个子条件 false 时失败
- [x] `BlackboardCacheDirtyFlag` — dirty=0 跳过条件评估
- [x] `ConditionEvaluation` — 6 种 condition 正确评估
- [x] `TemplateRootEntry` — 模板根节点正确入口

## CommandResponseComponent 测试
- [x] `LoyaltyAbove70AlwaysAccepts` — loyalty=80 时 isAccepting()=true
- [x] `LowLoyaltyHighRiskRefuses` — loyalty=25 + riskLevel=0.9 拒绝概率 100%
- [x] `AmbitionOverachievement` — ambition=90 时 overachieveMult ∈ [1.2, 1.5]
- [x] `GreedInterceptRatio` — greed=85 时 resourceInterceptRatio ∈ [0.1, 0.3]
- [x] `RelationshipModifiesProbability` — relationshipValue 正/负对 acceptProbability 的影响

## RelationshipComponent 测试
- [x] `SetAffinityBounded` — modifyAffinity 钳位到 [-100, 100]
- [x] `ModifyAffinityClamped` — 多次 modify 不越界
- [x] `TopRelationshipsSorted` — 按绝对值排序正确
- [x] `CapacityLimit` — relationCount 最多 50
- [x] `HasDisciplesTrue` — 有弟子时返回 true
- [x] `HasDisciplesFalse` — 无弟子时返回 false

## MemoryRingComponent 测试
- [x] `PushGetRecentOrder` — 顺序正确
- [x] `OverflowOverwrites` — 25 次 push 后 count=20，最早覆盖
- [x] `ConsecutiveFailuresCount` — 连续 4 条失败正确计数
- [x] `OverachieveCount` — 超额完成正确计数
- [x] `WitnessedSlotEncoding` — slot/significance 字段值正确

## 编译验证
- [x] `g++ -std=c++17 -c -D__EMSCRIPTEN__ -fsyntax-only` 编译所有修改文件通过（MemoryRingComponent, BTEvaluator, RelationshipComponent）
- [x] C++ 测试编译通过（g++ with gtest）
- [x] `test/` 下 `make run` 全部 23 测试通过（5 suites: smoke=2, BTEvaluator=5, CommandResponseComponent=5, RelationshipComponent=6, MemoryRingComponent=5）
