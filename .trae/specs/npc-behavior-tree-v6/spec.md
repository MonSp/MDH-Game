# NPC 行为树 V6 Spec

## Why
V5 的行为树系统六层优先级决策清晰、性能优化扎实，但存在三个结构性缺陷：(1) NPC 在优先级临界值附近"行为抖动"（如 HP≈30% 时反复切换逃跑与修炼），(2) 关系网络随时间无自然衰减导致所有 NPC 最终都成为朋友，(3) LLM 指令链纯单向、高层战略无法感知底层执行阻力。此外，NPC 行为表现力尚有提升空间。

## What Changes
- 引入**行为惯性/迟滞机制**消除临界值抖动
- 引入**关系自然衰减**与**分层记忆**（近期/中期/长期）
- LLM 规划 prompt 注入**前线摘要**实现自下而上的信息反馈
- 新增**瞬时情绪系统**作为横向打断机制（介于生存层与指令层之间）
- 新增轻量级**反思循环**让 NPC 根据历史结果自我调整行为倾向
- **信息传播系统**（八卦/流言）让 NPC 之间的目击事件可以在社交网络中扩散

## Impact
- Affected specs: npc-behavior-tree-v5
- Affected code:
  - `src/server/game/npc/BehaviorTreeSystem.h` — 决策评估流程（加入惯性检查、情绪层、反思层）
  - `src/server/game/ecs/components/BehaviorComponent.h` — 新增惯性/情绪字段
  - `src/server/game/ecs/components/RelationshipComponent.h` — 新增衰减率和分层记忆
  - `src/server/game/ecs/components/MemoryRingComponent.h` — 分层记忆结构改造
  - `src/server/game/ecs/components/SocialComponent.h` — 新增情绪字段
  - `src/server/game/services/LLMPlanningService.ts` — 前线摘要注入
  - `src/server/game/llm/NPCMemory.ts` — 记忆上下文构建适配分层记忆
  - 可能新增 `src/server/game/npc/BehaviorTree_Emotion.h` — 情绪评估
  - 可能新增 `src/server/game/npc/BehaviorTree_Reflection.h` — 反思评估
  - 可能新增 `src/server/game/systems/InformationSpreadSystem.h` — 信息传播系统

## ADDED Requirements

### Requirement: 行为惯性机制
系统 SHALL 在 NPC 行为切换时引入迟滞阈值，防止临界值附近的"行为抖动"。

#### Scenario: HP 临界值附近不再反复切换
- **GIVEN** 一个 HP=31% 的 NPC 正在执行"修炼"行为
- **WHEN** 受到轻微伤害导致 HP 降至 29%（触发逃跑阈值的 30%）
- **THEN** 系统因惯性机制而不立即切换行为（逃跑阈值实际为 25% 才打断非战斗行为）
- **WHEN** HP 继续降至 24%
- **THEN** 系统切换到"逃跑"行为
- **WHEN** HP 恢复到 31%
- **THEN** 系统因惯性机制而不立即切换回修炼（需稳定在 >35% 持续 N 帧）

#### Scenario: 已处于生存行为时保持低阈值
- **GIVEN** NPC 已处于"疗伤"状态
- **WHEN** HP 恢复到 55%
- **THEN** 系统允许退出"疗伤"行为（恢复阈值 = 原始阈值 + 惯性余量）

#### Scenario: 外部事件强制打断惯性
- **GIVEN** NPC 处于"采矿"行为的惯性保护期内
- **WHEN** 收到上级紧急命令（优先级高于生存层的 LLM 指令）
- **THEN** 系统立即忽略惯性，切换到命令行为

### Requirement: 关系自然衰减
系统 SHALL 随时间推移自动衰减 NPC 之间的亲密度，速率因性格而异。

#### Scenario: 长期无互动的朋友关系降温
- **GIVEN** NPC A 与 NPC B 亲密度为 60（友好关系）
- **WHEN** 超过 30 帧（游戏时间）无任何互动
- **THEN** 每 N 帧亲密度衰减 1 点（N 由性格决定：薄情者衰减更快，忠诚者衰减更慢）
- **WHEN** 亲密度降至 40 以下
- **THEN** 停止衰减（维持在保底水平）

#### Scenario: 敌意关系的自然恢复
- **GIVEN** NPC A 与 NPC B 亲密度为 -50
- **WHEN** 长期无冲突互动
- **THEN** 亲密度缓慢向 0 回升（负值自然消解），速率受性格影响

#### Scenario: 主动互动逆转衰减
- **GIVEN** NPC A 与 NPC B 亲密度正在自然衰减
- **WHEN** NPC A 主动访友或与 B 发生社交互动
- **THEN** 不仅抵消衰减，还按正常逻辑增加亲密度

### Requirement: 分层记忆系统
系统 SHALL 将 NPC 记忆分为近期（精确）、中期（压缩摘要）、长期（里程碑）三层。

#### Scenario: 近期记忆保留完整细节
- **GIVEN** NPC 经历了一次交互
- **WHEN** 该交互发生在最近 20 条记忆范围内
- **THEN** 保留完整细节（谁、何时、类型、结果、情感标签）

#### Scenario: 中期记忆压缩为摘要
- **GIVEN** 交互/目击事件超出 20 条近期容量
- **WHEN** 系统将旧条目移出近期记忆
- **THEN** 压缩为摘要存入中期记忆（100 条容量），合并同类事件、保留情感倾向和高频交互对象
- **AND** 摘要格式：{对象ID, 交互次数, 平均情感分, 首次时间, 末次时间}

#### Scenario: 长期记忆仅保留里程碑事件
- **GIVEN** NPC 经历重大事件（突破境界、道侣结合、生死之战、家族战争）
- **WHEN** 事件发生
- **THEN** 直接写入长期记忆（50 条容量），永不压缩
- **AND** 里程碑事件权重最高，在 LLM prompt 构建时优先注入

#### Scenario: 记忆在 LLM 上下文中的注入
- **GIVEN** LLM 为高层 NPC 构建规划 prompt
- **WHEN** 构建 NPC 的上下文记忆
- **THEN** 注入规则：长期记忆全量 + 中期记忆 TOP 10（按重要性排序）+ 近期记忆全量

### Requirement: LLM 前线摘要反馈
系统 SHALL 在 LLM 规划 prompt 中注入底层执行反馈摘要，使高层战略能感知执行阻力。

#### Scenario: 伤亡率反馈影响战略调整
- **GIVEN** T0 级 NPC "秦王"即将进行新一轮 LLM 规划
- **WHEN** 构建规划 prompt
- **THEN** 注入前线摘要：下属 NPC 的伤亡率、资源消耗率、任务完成率、异常事件（矿脉被妖兽占领等）
- **AND** 摘要格式为结构化 JSON，包含统计指标与关键事件列表

#### Scenario: 中层指挥官提出修正建议
- **GIVEN** T1 级 NPC "白起" 在执行 LLM 规划时
- **WHEN** 前线摘要显示某路兵马伤亡率 > 50%
- **THEN** 白起可在其规划中标记该任务为"需修正"
- **AND** 该标记反馈到 T0 层级的下次规划中

#### Scenario: 无 LLM 的 NPC 也贡献前线数据
- **GIVEN** T3 级 NPC（无 LLM 规划能力）在战斗中受伤
- **WHEN** 执行统计汇总
- **THEN** 该 NPC 的状态变更被纳入前线摘要的统计指标中

### Requirement: 瞬时情绪系统
系统 SHALL 引入情绪层作为横向打断机制，优先级介于生存层与指令层之间。

#### Scenario: 愤怒累积触发决斗
- **GIVEN** 忠诚 80 的弟子被连续 3 次辱骂
- **WHEN** 累积"愤怒"情绪值超过阈值（性格相关：谨慎高则阈值高）
- **THEN** 系统触发情绪打断：NPC 发起决斗（即使此时有其他优先级更低的行为在运行）

#### Scenario: 情绪自然消散
- **GIVEN** NPC 处于"愤怒"情绪状态
- **WHEN** 无新的愤怒触发事件持续 N 帧
- **THEN** 愤怒值按固定速率衰减，直至归零后恢复正常行为优先级

#### Scenario: 情绪与性格的交互
- **GIVEN** 两个 NPC 受到同样的侮辱事件
- **WHEN** NPC A 谨慎=80，NPC B 谨慎=20
- **THEN** NPC A 的愤怒累积较慢（高谨慎不易放大情绪），NPC B 的愤怒累积较快
- **WHEN** 愤怒触达阈值
- **THEN** NPC A 的决斗触发阈值更高（70），NPC B 的阈值更低（40）

#### Scenario: 情绪不覆盖生存本能
- **GIVEN** NPC 极度愤怒，准备决斗
- **WHEN** NPC 的 HP 突然降至 15%
- **THEN** 生存层的"逃跑"行为仍会覆盖情绪层（生存优先级始终最高）

### Requirement: 行为反思循环
系统 SHALL 让 NPC 根据行为结果自我调整行为倾向，实现轻量级"学习"效果。

#### Scenario: 连续采矿产出低促使行为切换
- **GIVEN** NPC 已连续 3 次执行"采矿"且每次产出低于预期的 50%
- **WHEN** 下次决策时评估"采矿"行为
- **THEN** 系统对该 NPC 降低"采矿"行为的选取权重（乘以衰减因子 0.7）
- **WHEN** NPC 尝试其他行为（如"耕种"）且产出正常
- **THEN** "采矿"的衰减因子逐步恢复至 1.0

#### Scenario: 与特定个体的负面社交经历降低互动倾向
- **GIVEN** NPC A 与 NPC B 连续 2 次社交结果为负面（亲密度下降）
- **WHEN** NPC A 下次决策评估社交层
- **THEN** 系统降低 NPC A 主动寻找 NPC B 的概率（乘以回避因子）
- **AND** 该回避因子随时间衰减，长期不互动后恢复

#### Scenario: 多次探索某区域无收获降低探索频率
- **GIVEN** NPC 在"探索"行为下连续前往坐标区域 (x±200, y±200) 均无收获（≥3次）
- **WHEN** 下次评估探索行为
- **THEN** 系统降低该区域的探索优先级，增加更远区域的探索概率

### Requirement: 信息传播系统（八卦/流言）
系统 SHALL 实现 NPC 之间通过社交互动传播目击事件和流言的机制。

#### Scenario: 目击事件在闲聊中传播
- **GIVEN** NPC A 目击了长老 B 私吞灵石（存入 A 的目击记忆）
- **WHEN** NPC A 与 NPC C 进行"八卦"或"闲聊"互动
- **THEN** 系统根据 A 与 C 的亲密度、A 的谨慎性格、事件敏感度判定是否传播
- **AND** 若传播，C 将收到该信息并存入目击记忆（标记为"二手信息"）

#### Scenario: 信息在传播中衰减和扭曲
- **GIVEN** 一条信息经 NPC A → NPC C → NPC D 传播 3 次
- **WHEN** D 收到该信息
- **THEN** 信息内容有概率扭曲（如"私吞 100 灵石"→"私吞了灵石"→"据说长老贪污"）
- **AND** 扭曲概率随传播次数递增

#### Scenario: 流言到达当事人触发关系变化
- **GIVEN** 关于长老 B 的流言在社交网络中传播
- **WHEN** 流言最终传到长老 B 本人
- **THEN** 长老 B 与传播链上各 NPC 的关系可能发生变化（根据 B 的性格：高谨慎可能贿赂/威胁，低谨慎可能直接决斗）

#### Scenario: 信息传播的性能边界
- **GIVEN** 系统中有 10K NPC
- **WHEN** 信息传播系统运行
- **THEN** 每次信息传播仅在当前社交互动中计算（不额外遍历社交网络）
- **AND** 每帧最多处理的信息传播事件数有上限（可配置，默认 50 条/帧）

## MODIFIED Requirements

### Requirement: 六层优先级决策（行为惯性化）
原有六层严格静态排序 SHALL 保留，但每层切换时需经过惯性/迟滞检查。

#### Scenario: 行为切换需跨过迟滞阈值
- **GIVEN** NPC 当前行为属于日常层（优先级最低）
- **WHEN** 社交层触发访友需求
- **THEN** 允许切换（从低优先级切换到高优先级不受惯性限制）
- **GIVEN** NPC 当前行为属于社交层
- **WHEN** 社交需求满足后，日常层尝试恢复
- **THEN** 系统要求社交层条件"不满足"持续 N 帧（惯性帧数）后才允许降级到日常层

### Requirement: 关系组件（增强衰减）
原有关系组件 SHALL 新增衰减率字段，并在 NPCWorldService 的 tick 中定期衰减。

### Requirement: 记忆组件（分层改造）
原有 `MemoryRingComponent` SHALL 改造为三层结构：近期（环形缓冲，20条精确）+ 中期（环形缓冲，100条摘要）+ 长期（环形缓冲，50条里程碑）。

### Requirement: LLM 规划服务（前线摘要注入）
原有 `LLMPlanningService` SHALL 在构建规划 prompt 时注入前线摘要数据。
