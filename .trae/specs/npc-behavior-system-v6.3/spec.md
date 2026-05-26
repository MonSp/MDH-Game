# NPC 行为系统 V6.3 鲁棒性增强 Spec

## Why
V6.2 的行为系统在设计和工程层面已有坚实基础（分层优先级、情绪闭环、流言传播、反思学习），但评审发现了若干运行时边界缺陷和设计耦合问题，其中帧率耦合和情绪冷却溢出是**潜在线上 bug**，需要在 V6.3 中修复。

## What Changes
- 情绪衰减从"每帧 ×0.995"改为基于时间（deltaTime）驱动，消除帧率耦合
- 情绪冷却环形缓冲增加容量保护，防止溢出导致死循环回归
- 群体情绪场增加绝对人数下限，避免小样本误触发
- 决策执行前加入 `IsExecutable()` 环境可行性检查，避免选择不可执行的行为
- 明确定义"高情绪"触发阈值
- 流言队列增加显式 TTL 和最大容量保护
- 三层记忆增加"记忆凝固"升级规则
- 修复文档中 BehaviorTree 命名与实现不匹配的问题（文档层面）
- 行为元标签体系设计（为未来扩展预留）

## Impact
- Affected specs: npc-behavior-tree-v6.1, npc-behavior-tree-v6.2
- Affected code: `BehaviorTreeSystem.h`, `SocialComponent.h`, `BehaviorComponent.h`, `MemoryRingComponent.h`, 所有 `BehaviorTree_*.h` 执行函数, `NPCBehaviorConfig.h`
- **BREAKING**: 情绪衰减参数从 `decayPerFrame` 改为 `decayPerSecond`，所有 NPC 的情绪配置文件需更新

## ADDED Requirements

### Requirement: 情绪衰减时间驱动
系统 SHALL 基于 deltaTime 计算情绪衰减，而非与帧率直接耦合。

#### Scenario: 60fps 下情绪衰减一致
- **WHEN** 游戏运行在 60fps，情绪 anger=100
- **THEN** 1 秒后 anger ≈ 100 × 0.995^60 ≈ 74

#### Scenario: 30fps 下情绪衰减一致
- **WHEN** 游戏运行在 30fps，情绪 anger=100
- **THEN** 1 秒后 anger ≈ 100 × 0.995^60 ≈ 74（与 60fps 一致）

#### Scenario: 非均匀帧间隔
- **WHEN** 某一帧间隔 deltaTime = 0.05s（约 20fps 瞬时）
- **THEN** 衰减量 = anger × (1 - 0.995^(0.05×60))，按实际时间衰减

### Requirement: 情绪冷却溢出保护
系统 SHALL 防止情绪冷却记录溢出导致对某目标的冷却意外消失。

#### Scenario: 冷却记录未满
- **WHEN** 当前冷却记录数 < 16
- **THEN** 新冷却记录直接追加

#### Scenario: 冷却记录已满且全部活跃
- **WHEN** 当前冷却记录数 = 16 且全部仍在活跃冷却期
- **THEN** 新情绪触发被拒绝，不覆盖任何现有记录，记录 WARNING 日志

#### Scenario: 冷却记录已满但存在过期记录
- **WHEN** 当前冷却记录数 = 16 且存在已过期（超过冷却帧数）的记录
- **THEN** 淘汰最老的过期记录，写入新记录

#### Scenario: 同一目标不同原因
- **WHEN** NPC A 被 NPC B 辱骂（原因=Rumor）后立即又被 NPC B 攻击（原因=Attack）
- **THEN** 系统分别创建两条冷却记录，使用 `(targetId, reason)` 作为联合键

### Requirement: 群体情绪场最小人数保护
系统 SHALL 在群体情绪触发时同时检查绝对人数和比例。

#### Scenario: 小样本不误触发
- **WHEN** 半径 200 内共 3 个 NPC，其中 1 个恐惧（比例 33% > 30%）
- **THEN** 群体情绪场不触发（绝对恐惧人数 1 < 最低阈值 3）

#### Scenario: 大样本正常触发
- **WHEN** 半径 200 内共 20 个 NPC，其中 8 个恐惧（比例 40% > 30%）
- **THEN** 群体情绪场正常触发传染（8 ≥ 3 且 40% ≥ 30%）

### Requirement: 行为执行前环境检查
系统 SHALL 在执行行为前检查该行为在当前环境的可行性。

#### Scenario: 附近无矿脉时跳过采矿
- **WHEN** NPC 决策系统选择了"采矿"行为，但在 IsExecutable() 中检测到空间索引内无矿脉
- **THEN** 该行为被标记为不可执行，降级到下一优先级行为

#### Scenario: 环境检查性能约束
- **WHEN** IsExecutable() 被调用
- **THEN** 检查必须是 O(1) 或 O(log n) 操作（利用空间索引），不应遍历全部实体

### Requirement: 高情绪阈值明确定义
系统 SHALL 为群体情绪场定义明确的"高情绪"数值阈值。

#### Scenario: 恐惧阈值
- **WHEN** NPC 的 fear 值 ≥ 60
- **THEN** 该 NPC 被计入群体情绪场的恐惧人数

#### Scenario: 愤怒阈值
- **WHEN** NPC 的 anger 值 ≥ 60
- **THEN** 该 NPC 被计入群体情绪场的愤怒人数

#### Scenario: 喜悦阈值
- **WHEN** NPC 的 joy 值 ≥ 50
- **THEN** 该 NPC 被计入群体情绪场的喜悦人数（喜悦触发阈值略低，正面情绪更易传播）

### Requirement: 流言队列 TTL 和容量保护
系统 SHALL 对流言传播队列设置显式的生命周期和最大容量。

#### Scenario: 流言 TTL 过期
- **WHEN** 一条流言在队列中停留超过 900 帧
- **THEN** 该流言被丢弃，不再尝试传播

#### Scenario: 流言队列满
- **WHEN** 流言待传播队列超过最大容量（建议 500 条）
- **THEN** 按严重度淘汰最低严重度的流言，为新流言腾出空间

### Requirement: 记忆凝固规则
系统 SHALL 定义近期记忆升级为中期摘要、中期记忆升级为长期里程碑的触发条件。

#### Scenario: 近期记忆聚合为中期摘要
- **WHEN** 近期记忆中同一对象的互动记录 ≥ 5 条
- **THEN** 系统将其压缩为 1 条中期摘要（聚合互动次数、平均情感分、时间范围）

#### Scenario: 中期摘要升级为长期里程碑
- **WHEN** 中期摘要中情感评分绝对值 ≥ 80 且距今 ≥ 1000 帧
- **THEN** 系统将其提升为长期里程碑

#### Scenario: 近期记忆周期清理
- **WHEN** 近期记忆达到 20 条上限且有新记忆需要写入
- **THEN** 淘汰最老的非聚合记录，被淘汰记录如满足聚合条件则先压缩到中期

### Requirement: 行为元标签体系
系统 SHALL 为每个行为关联元标签，用于微规划映射和未来扩展。

#### Scenario: 标签定义
- **WHEN** 注册新行为
- **THEN** 行为需声明标签集合（如 {产出:灵石, 场景:户外, 强度:中, 类别:生产}）

#### Scenario: 微规划使用标签匹配
- **WHEN** 反思系统触发微规划，需要找"最接近的行为"
- **THEN** 按标签相似度（Jaccard 相似系数）自动计算，替代手工硬编码映射表

## MODIFIED Requirements

### Requirement: NPC行为树系统介绍文档命名修正
文档 SHALL 在开头明确标注系统实际架构为"分层优先级决策系统"，与经典行为树区分。

#### Scenario: 文档开头增加架构说明
- **WHEN** 读者打开 `NPC行为树系统介绍.md`
- **THEN** 在第一节前看到架构正名说明："本系统采用分层优先级决策架构，与传统树形行为树不同"
