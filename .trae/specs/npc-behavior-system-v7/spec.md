# NPC 行为系统 V7 工程质量与架构演进 Spec

## Why
V6.3 完成了鲁棒性增强（帧率无关衰减、冷却溢出保护、流言 TTL 等），但在 C++ 和 TypeScript 全量代码评审中发现了 3 个必须修复的运行时缺陷和 4 个影响可扩展性的架构问题。这些问题如果不解决，将在 V8+ 的扩展中持续累积技术债务。

## What Changes
- **P0 修复**: LLM 规划期间 NPC 对生存威胁无响应（被攻击也不逃跑）
- **P0 修复**: `InteractionSlot.timestamp` 从未赋值，导致记忆凝固规则的时间门控形同虚设
- **P0 修复**: 情绪冷却槽满 16 后静默丢弃新冷却，可能导致群体暴怒卡死回潮
- **P1 改进**: C++/TS 关系衰减参数不一致（-1.5/+1/+1.5 vs -2/+1/+2），TS 端收敛至只做 LLM 编排
- **P1 改进**: 评估链重构为可迭代的函数指针数组，降低新增决策层的边际成本
- **P1 改进**: 流言传播和情绪传染复用空间索引，避免 Gossip 时全实体扫描
- 文档: V6→V7 迭代总览表更新

## Impact
- Affected specs: npc-behavior-system-v6.3
- Affected code: `BehaviorTreeSystem.h`, `SocialComponent.h`, `MemoryRingComponent.h`, `BehaviorTree_Social.h`, `RelationshipComponent.h`, `NPCWorldService.ts`
- **BREAKING**: `evaluate()` 方法签名改为接收 `EvaluateContext` 结构体，外部调用方需同步更新

## ADDED Requirements

### Requirement: LLM 规划不遮蔽生存本能
系统 SHALL 在 LLM 规划执行期间保留 `evaluateSurvival` 检查，生存威胁始终能打断任何高层行为。

#### Scenario: LLM 规划中被攻击
- **WHEN** NPC 正在执行 LLM 规划（如"联魏伐楚"→移动中），且 HP 降至 30% 以下
- **THEN** NPC 立即切换到 Flee，LLM 规划的当前 action 被标记为 Interrupted

#### Scenario: LLM 规划正常执行
- **WHEN** NPC 正在执行 LLM 规划且 HP 正常
- **THEN** 按 LLM 规划的 action 序列正常执行，不做额外打断

### Requirement: 交互记忆时间戳完整性
系统 SHALL 在每次写入 `InteractionSlot` 时记录当前帧号，确保记忆凝固的时间门控有效。

#### Scenario: 记录交互时写入时间戳
- **WHEN** NPC A 与 NPC B 发生社交互动（如 VisitFriend、Gossip）
- **THEN** 对应的 `InteractionSlot.timestamp` 被赋值为 `currentFrame`

#### Scenario: 记忆凝固时间门控生效
- **WHEN** 近期记忆压缩为中期摘要后，中期摘要的 `firstTime` 被正确赋值为最早交互的帧号
- **THEN** `upgradeMidTermToLongTerm()` 中 `(currentFrame - firstTime) >= 1000` 的判断基于真实时间跨度

### Requirement: 情绪冷却 LRU 淘汰
系统 SHALL 在冷却槽满时使用 LRU 策略淘汰而非拒绝写入。

#### Scenario: 冷却槽满时淘汰最旧记录
- **WHEN** 16 条冷却槽全部活跃且有新的冷却需求写入
- **THEN** 淘汰 16 条中 `cooldownUntilFrame` 最小的记录，写入新记录；输出 DEBUG 日志（非 WARNING）

#### Scenario: 冷却槽未满时正常追加
- **WHEN** 冷却槽未满
- **THEN** 按现有逻辑追加新记录（与 V6.3 行为一致）

#### Scenario: 存在过期记录时优先复用
- **WHEN** 冷却槽已满但存在已过期的记录
- **THEN** 覆写该过期记录的位置（与 V6.3 行为一致）

### Requirement: C++ 端统一关系衰减调度
系统 SHALL 将 NPC 关系衰减的计算与调度逻辑统一在 C++ 端执行，TypeScript 端仅保留 LLM 规划编排。

#### Scenario: C++ 端衰减参数同步
- **WHEN** `RelationshipComponent::applyDecay()` 执行衰减
- **THEN** `computeDecayRate` 公式与 TypeScript 端一致：loyalty≥70 时 rate-2，loyalty<30 时 rate+1，greed≥70 时 rate+2

#### Scenario: TS 端移除衰减逻辑
- **WHEN** `NPCWorldService.ts` 的 `tick()` 执行
- **THEN** 不再调用 `applyRelationshipDecay()`，关系衰减仅由 C++ WASM 侧执行

#### Scenario: 阵营偏见底线查询保留
- **WHEN** TS 端需要查询阵营偏见底线
- **THEN** 通过 `wasm` 接口调用 C++ 端 `getFactionBiasFloor()` 获取

### Requirement: 评估层接口化
系统 SHALL 将 7 层评估链重构为可迭代的函数指针数组结构。

#### Scenario: 评估链执行
- **WHEN** `evaluate()` 被调用
- **THEN** 遍历 `kEvaluateLayers[]` 函数指针数组，依次调用，任一返回 true 即停止

#### Scenario: 新增评估层
- **WHEN** 新版本需要增加第 8 层评估（如仪式层）
- **THEN** 只需：实现评估函数 + 在数组中插入一行，无需修改 evaluate() 主体

#### Scenario: 评估上下文传递
- **WHEN** 评估层函数被调用
- **THEN** 接收 `EvaluateContext&` 引用，包含所有必要的 ECS 组件引用和 `currentTime`

### Requirement: 流言/情绪传播复用空间索引
系统 SHALL 在 Gossip 执行时使用空间索引采样邻居，而非遍历全实体。

#### Scenario: 随机听众采样
- **WHEN** `exec_gossip()` 需要选择聊天听众
- **THEN** 从当前 NPC 所在的空间网格桶及其邻居桶中随机采样活跃 NPC（最多 32 个候选），而非遍历全部 `entityIds_`

#### Scenario: 情绪传染统计
- **WHEN** `tryEmotionalContagion()` 需要统计周围 NPC 情绪
- **THEN** 只遍历当前 NPC 所在网格桶及邻居桶内的 NPC，而非遍历全部实体

#### Scenario: 性能回退
- **WHEN** 空间索引未初始化或不可用
- **THEN** 回退为全实体扫描（保持正确性，降级性能）

## MODIFIED Requirements

### Requirement: 文档迭代总览表更新
NPC行为树系统介绍.md 的 V6→V6.3 迭代总览表 SHALL 扩展至 V7。

#### Scenario: 文档版本表更新
- **WHEN** 读者查看文档末尾的"V5 → V6 → V6.1 → V6.2 迭代总览"和"数字一览"
- **THEN** 看到 V7 的新增条目的完整记录
