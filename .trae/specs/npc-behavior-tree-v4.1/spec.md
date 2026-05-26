# NPC 行为树 V4.1 — Review Bug 修复与测试验证 Spec

## Why
V2-V4 四轮迭代在 17 小时内建立了完整的 6 层级行为树、LLM 联动指令链和 C++ WASM 迁移架构。Review 发现 6 个代码级 bug / 不一致问题，且 C++ 侧零单元测试覆盖。V4.1 专注修复这些发现，不新增功能。

## What Changes
- **修复 BTEvaluator Selector 节点逻辑**：当前 Selector 与 Sequence 行为完全相同，需区分子节点成功/失败的跳转语义
- **修复 evaluateCommand 硬编码参数**：`relationshipValue=0.0f` / `riskLevel=0.0f` 需从实际组件读取
- **修复 hasDisciples() 永远返回 false**：从 V2 遗留至今
- **填补空壳方法**：`executeFamilyGathering`、`executeMentorTeach`、`executeDiscipleAsk` 添加实质性逻辑
- **新增 C++ 单元测试框架与关键路径测试**：BTEvaluator、CommandResponseComponent、RelationshipComponent、MemoryRingComponent
- **CommandChainSystem findDelegationParent O(n) 查找优化**：增加 issuer 快速索引
- **WitnessedSlot 编码与 spec 对齐**：`uint16_t eventIndex` → `uint32_t slot + uint8_t significance`

## Impact
- Affected specs: `npc-behavior-tree-v3` — BTEvaluator 行为修正
- Affected specs: `npc-behavior-tree-v4` — evaluateCommand 参数修正、空壳方法填补
- Affected specs: `npc-memory-cpp-migration` — WitnessedSlot 编码对齐
- Affected code:
  - `game/bt/BTEvaluator.h` — Selector 节点逻辑修复
  - `game/npc/BehaviorTreeSystem.h` — evaluateCommand 参数 + 空壳方法逻辑
  - `game/ecs/components/RelationshipComponent.h` — hasDisciples 实现
  - `game/ecs/components/MemoryRingComponent.h` — WitnessedSlot 编码修正
  - `game/npc/CommandChainSystem.h` — 新增 issuerIndex 查找优化
  - 新增 `test/bt/BTEvaluator.test.cpp`
  - 新增 `test/components/CommandResponseComponent.test.cpp`
  - 新增 `test/components/RelationshipComponent.test.cpp`
  - 新增 `test/components/MemoryRingComponent.test.cpp`
  - 新增 `test/bt/Makefile`

---
## ADDED Requirements

### Requirement: C++ 单元测试框架
系统 SHALL 具备 C++ 侧的单元测试能力，使用 Google Test (gtest) 框架，覆盖行为树核心模块。

#### Scenario: gtest 集成编译
- **WHEN** 在 `test/` 目录下执行 `make`
- **THEN** 所有测试源文件正确编译链接 gtest
- 返回 0 exit code（全部通过）

#### Scenario: BTEvaluator 核心逻辑测试
- **WHEN** 运行 BTEvaluator 测试套件
- **THEN** 覆盖：Selector 子节点成功返回、Sequence 子节点失败回退、BlackboardCache 脏标志刷新、Condition 节点评估、模板根节点入口

#### Scenario: CommandResponseComponent 多维度响应测试
- **WHEN** 运行 CommandResponseComponent 测试套件
- **THEN** 覆盖：loyalty≥70 必定接受、loyalty<30 高风险指令拒绝概率翻倍、ambition>80 超额完成概率、greed>70 资源截留概率、关系值对接受概率的影响

#### Scenario: RelationshipComponent 关系矩阵测试
- **WHEN** 运行 RelationshipComponent 测试套件
- **THEN** 覆盖：setAffinity 双向写入、modifyAffinity 钳位、getTopRelationships 排序正确性、hasDisciples 判断、容量上限

#### Scenario: MemoryRingComponent 环形缓冲区测试
- **WHEN** 运行 MemoryRingComponent 测试套件
- **THEN** 覆盖：push/getRecent 顺序正确、容量溢出覆盖最旧、getConsecutiveFailures 连续计数、getOverachieveCount 超额计数

### Requirement: BTEvaluator Selector 节点行为修正
BTEvaluator SHALL 正确区分 Selector 和 Sequence 节点的语义。

#### Scenario: Sequence 节点失败传播
- **WHEN** Sequence 节点中的子条件节点评估为 false
- **THEN** 跳转到该节点的 `fail` 分支（父失败分支）
- 行为：所有子节点必须成功，任一个失败则整个 Sequence 失败

#### Scenario: Selector 节点成功返回
- **WHEN** Selector 节点中的子条件节点评估为 true
- **THEN** 进入该条件指向的 action 子节点链，返回 true 给调用者
- 行为：任一子节点成功则整个 Selector 成功，不检查后续兄弟节点

#### Scenario: Selector 节点失败继续
- **WHEN** Selector 节点中的子条件节点评估为 false
- **THEN** 尝试 `next` 索引的下一个兄弟条件节点
- 若所有子条件均为 false，跳转到 Selector 的 `fail` 分支

### Requirement: evaluateCommand 参数正确注入
`evaluateCommand` SHALL 从实际组件读取 `relationshipValue` 和 `riskLevel`，而非硬编码为 0.0f。

#### Scenario: relationshipValue 从关系矩阵读取
- **WHEN** T3 NPC 收到来自 issuerSlot 的指令
- **THEN** 调用 `RelationshipComponent::getAffinity(issuerSlot)` 获取亲密度值
- 将亲密度值传入 `CommandResponseComponent::evaluateResponse()` 的 `relationshipValue` 参数

#### Scenario: riskLevel 从指令类型推断
- **WHEN** T3 NPC 收到指令
- **THEN** 若指令类型为 `NPCActivity::Attack` / `Hunt` / `Ambush` / `Assassinate` / `Duel`，设置 `riskLevel = 0.9f`
- 若指令类型为 `NPCActivity::Scout` / `Explore`，设置 `riskLevel = 0.5f`
- 若指令类型为采集/生产类，设置 `riskLevel = 0.1f`
- 其他指令类型默认 `riskLevel = 0.3f`

## MODIFIED Requirements

### Requirement: hasDisciples 从 V2 空壳改为实际查询
V2 中 `hasDisciples()` 永远返回 false。SHALL 改为检查 `getRoleCommandComponent` 中被委派过指令的下属数量，或遍历所有 NPC slot 查找 `mentorSlot == 当前slot` 的数量。

#### Scenario: 有弟子时返回 true
- **WHEN** 存在至少 1 个 NPC 的 `mentorSlot == 当前 NPC slot`
- **THEN** `hasDisciples()` 返回 true

#### Scenario: 无弟子时返回 false
- **WHEN** 没有任何 NPC 的 `mentorSlot` 指向当前 NPC
- **THEN** `hasDisciples()` 返回 false

### Requirement: executeFamilyGathering 空壳填入实际逻辑
`executeFamilyGathering` SHALL 读取 `RoleCommandComponent` 中的聚会目标坐标，驱动 NPC 向该坐标移动。

#### Scenario: 有聚会坐标
- **WHEN** `RoleCommandComponent` 中 `params` 包含 `targetX`/`targetY`
- **THEN** NPC 向 (targetX, targetY) 移动
- 到达后（距离 < 5），`behavior->activityProgress += dt/hours * 0.3f`
- 满 1.0 后切换到 Rest

#### Scenario: 无聚会坐标
- **WHEN** cmd 为 null 或 params 无坐标
- **THEN** 降级为 Walk 随机漫步

### Requirement: executeMentorTeach 空壳填入实际逻辑
`executeMentorTeach` SHALL 遍历所有 disciples 的 CultivationComponent，递增 `cultivationProgress`。

#### Scenario: 教导弟子
- **WHEN** NPC 执行 MentorTeach 活动
- **THEN** 遍历 `mentorSlot == 当前slot` 的 NPC，对每个弟子 `cult->addProgress(0.5f * hours)`
- 每次教导消耗 mentor 的 `stats->mp` 减少 5 点
- 教导完成后切换到 Rest

### Requirement: executeDiscipleAsk 空壳填入实际逻辑
`executeDiscipleAsk` SHALL 查询 mentor 的 CultivationComponent，若 mentor 境界更高则获得额外修炼加成。

#### Scenario: 向师父请教
- **WHEN** NPC 执行 DiscipleAsk 活动
- **THEN** 若 mentor 存在且 `mentor_realm >= self_realm`：
  - `cult->addProgress(1.5f * hours)` （比自主修炼快 50%）
  - mentor 不消耗任何资源
- 若 mentor 不存在或已死亡：降级为自主 Cultivate

### Requirement: CommandChainSystem findDelegationParent 优化
`findDelegationParent` SHALL 使用 `issuerIndex` 反向索引，将 O(n×m×k) 降为 O(1)。

#### Scenario: 反向索引构建
- **WHEN** 子指令被创建（`processDelegation` 中 `addChildCommand` 被调用）
- **THEN** 同时写入 `m_childToParent[childCommandId] = {parentSlot, parentCommandId}`
- 使用固定大小哈希表（MAX_COMMAND_META=256），childCommandId % 256 取模

#### Scenario: 反向索引查询
- **WHEN** `processFeedback(childCommandId)` 被调用
- **THEN** 通过 `m_childToParent[childCommandId % 256]` 直接定位 parentSlot
- 无需遍历所有 NPC 和 delegation slot

### Requirement: WitnessedSlot 编码与 spec 对齐
将 WitnessedSlot 的 `uint16_t eventIndex` 替换为 spec 定义的 `uint32_t slot + uint8_t significance + uint8_t _pad`，总量保持 8 bytes。

#### Scenario: WitnessedSlot 重编码
- **WHEN** 目击事件被写入
- **THEN** `WitnessedSlot` 包含：
  - `timestamp(48bit)` 或直接用 `uint64_t` 存储
  - `slot(32bit)` — 事件相关 NPC slot
  - `significance(8bit)` — 事件重要性等级
  - `_pad(8bit)` — 对齐填充
- 事件文字描述仍通过 `EventStringPool` 按 `significance` 级别的全局词条查找

## REMOVED Requirements

### Requirement: WitnessedSlot 中用 eventIndex 替代 slot 的旧编码
**Reason**: 与 spec 设计不一致，`eventIndex` 无法追踪事件关联的 NPC slot。
**Migration**: 重编码为 `uint64_t timestamp + uint32_t slot + uint8_t significance + uint8_t _pad`（8 bytes 不变），已有数据在 `ecs_loadMemory` 时按新版格式迁移。
