# NPC 行为树 V4 — 指令链深化与 T0-T3 联动强化 Spec

## Why
V2/V3 已建立了 6 层优先级行为树和 T0-T3 分级 LLM 规划框架，但指令下发多为"高层直接写入低层 NPC 的优先级 2"的简单模式，缺乏中间层的指令解析/拆解/分发、反馈闭环，以及 T3 对高级 NPC 指令的多维度响应机制。当前系统无法支撑"秦王一道密令 → 家主拆解为三路兵马 → 各队 T3 战士根据自身性格/状态差异化执行"的深度联动场景。

## What Changes
- 新增 `CommandChainSystem`：指令从 T0→T1→T2→T3 的逐级下发、拆解、委托机制
- 新增 `CommandDelegationComponent`：中间层 NPC 接收上级指令后可进一步拆解任务分派给下属
- 新增 `CommandResponseComponent`：T3 NPC 对指令的多维度响应（接受/拒绝/拖延/超额完成）
- 扩展 `RoleCommandComponent`：指令状态从简单"执行中/完成/失败"扩展为完整生命周期
- 新增 `CommandFeedbackLoop`：T3→T2→T1→T0 向上反馈执行进度和结果
- 扩展 `NPCActivity`：新增指令响应相关活动（AwaitOrders、ReportTask、DelegateTask、RefuseCommand）
- 扩展 `ActionType`：新增 COMMAND_DELEGATE、REPORT_STATUS、COORDINATE_SQUAD、RESIST_ORDER
- **BREAKING**: `RoleCommandComponent` 字段结构重写，新增委派链、反馈状态
- 影响 WASM 导出层 NPCStateWasm

## Impact
- Affected specs: `npc-behavior-tree-v2` — 指令执行层扩展、NPCActivity 新增值
- Affected specs: `npc-behavior-tree-v3` — 新增 CommandChainSystem 需纳入分频评估和批量执行
- Affected code:
  - `game/ecs/components/RoleCommandComponent.h` — 重写
  - 新增 `game/ecs/components/CommandDelegationComponent.h`
  - 新增 `game/ecs/components/CommandResponseComponent.h`
  - 新增 `game/npc/CommandChainSystem.h`
  - `game/npc/BehaviorTreeSystem.h` — 扩展 instruction 层
  - `src/server/config/LLMConfig.ts` — 扩展 ActionType
  - `src/shared/types/LLMPlanning.ts` — ActionType 枚举扩展
  - `src/server/services/NPCService.ts` — 支持指令链
  - `tools/ecs-wasm/src/wasm_exports.cpp` — NPCStateWasm 适配

---

## ADDED Requirements

### Requirement: 指令链系统（T0→T1→T2→T3 逐级下发）
系统 SHALL 支持高级 NPC 的指令通过中间层逐级解析和分发，而非 T0/T1 直接写入 T3 目标。

#### Scenario: T0 发出战略指令
- **WHEN** T0 NPC（如秦王）LLM 规划输出 `ISSUE_ORDER` 类型的子任务
- **THEN** 系统生成 `Command` 对象，设置 `issuer_tier=T0`、`scope=战略级`、`target_role=family_head/general`
- 该 Command 不直接写入底层 NPC，而是分发到符合 `target_role` 的所有 T1 NPC 的命令队列

#### Scenario: T1 拆解战略指令
- **WHEN** T1 NPC（如白起）收到 T0 的 `ISSUE_ORDER` 指令
- **THEN** T1 的 LLM 规划将此指令作为上下文输入，生成子任务序列
- T1 使用 `COMMAND_DELEGATE` 将战略目标拆解为多个战术指令，下发至 T2 NPC 的命令队列

#### Scenario: T2 拆解战术指令
- **WHEN** T2 NPC（如长老）收到 T1 的 `COMMAND_DELEGATE` 指令
- **THEN** T2 将战术目标拆解为具体可执行动作，分发至 T3 NPC 的命令队列
- T2 可通过 `MOBILIZE` 批量修改下属 T3 的状态

#### Scenario: T3 接收并执行指令
- **WHEN** T3 NPC 的 `RoleCommandComponent` 队列收到 T2 下发的具体指令
- **THEN** 该指令注入行为树优先级 2，T3 开始执行
- T3 根据自身性格和状态决定响应方式（参见 CommandResponseComponent 需求）

#### Scenario: 指令委派链追踪
- **WHEN** 一条原始 T0 指令被逐级拆解
- **THEN** 每层 Command 维护 `parent_command_id`，形成完整委派链
- 任一子指令的状态变化可向上追溯至原始指令

### Requirement: 指令完整生命周期
系统 SHALL 为指令维护完整生命周期，包含委派、执行、反馈、闭环四个阶段。

#### Scenario: 指令状态机
- **WHEN** Command 对象被创建
- **THEN** 其生命周期状态为：
  - `ISSUED` — 已下发，等待目标接收
  - `RECEIVED` — 目标已接收，进入规划/拆解中
  - `DELEGATED` — 已拆解并下发至下级
  - `EXECUTING` — 正在执行中
  - `COMPLETED` — 执行完成
  - `PARTIALLY_COMPLETED` — 部分完成（部分目标未达成）
  - `FAILED` — 执行失败
  - `REFUSED` — 目标拒绝执行
  - `EXPIRED` — 超出有效时间

#### Scenario: 指令超时处理
- **WHEN** 指令超过其 `expires_at` 时间且状态非终态
- **THEN** 自动标记为 `EXPIRED`，向 issuer 上报告知超时
- T3 恢复自由行为，T2/T1 的 LLM 规划可感知子指令超时并调整计划

#### Scenario: 指令优先级冲突
- **WHEN** T3 同时收到多条指令且都处于优先级 2
- **THEN** 按指令的 `priority` 字段排序，同优先级按 `issued_at` 时间戳排序
- 高优先级指令可中断低优先级指令的执行

### Requirement: T3 多维度指令响应
系统 SHALL 支持 T3 NPC 根据自身性格、状态、关系对指令做出差异化响应。

#### Scenario: 忠诚度驱动接受/拒绝
- **WHEN** T3 NPC 收到指令
- **THEN** 当 `personality.loyalty >= 70` 时，100% 接受指令
- 当 `personality.loyalty >= 40` 时，90% 接受指令
- 当 `personality.loyalty < 40` 时，有 `(100 - loyalty)%` 概率拒绝指令
- 当指令风险评估（涉及战斗/危险区域/资源消耗）为 HIGH 且 `loyalty < 30` 时，拒绝概率翻倍

#### Scenario: 野心驱动超额完成
- **WHEN** T3 NPC 执行指令中且 `personality.ambition > 80`
- **THEN** 有 30% 概率将指令目标放大 1.2-1.5 倍（如采矿量超额、巡逻范围扩大）
- 超额完成后，该 T3 NPC 获得额外家族贡献值

#### Scenario: 谨慎驱动防御性执行
- **WHEN** T3 NPC 执行战斗类指令且 `personality.caution > 70`
- **THEN** 在战斗中 HP < 50% 时，此 NPC 的生存应急优先于指令，执行撤退
- 撤退后向指令下发者报告 `PARTIALLY_COMPLETED` 并附撤退原因

#### Scenario: 贪婪驱动资源截留
- **WHEN** T3 NPC 执行采集/生产类指令且 `personality.greed > 70`
- **THEN** 有 25% 概率截留 10%-30% 的产出资源
- 截留行为增加个人财富但降低家族贡献值，且有概率被执法堂发现

#### Scenario: 关系影响响应意愿
- **WHEN** T3 NPC 收到来自与自身关系亲密度 < 0（敌对/厌恶）的上级的指令
- **THEN** 接受概率降低 20%
- 关系亲密度 > 50（友好/亲密）时，接受概率提升 10%

### Requirement: 指令反馈闭环
系统 SHALL 支持 T3 执行结果向上逐级反馈，形成完整的指令闭环。

#### Scenario: T3 向上报告完成状态
- **WHEN** T3 NPC 完成或失败一条指令
- **THEN** 自动向直属上级 T2 发送 `REPORT_STATUS` 反馈，包含：
  - 完成状态（COMPLETED / FAILED / PARTIALLY_COMPLETED）
  - 消耗时间
  - 产出/成果
  - 备注（如遭遇的事件）

#### Scenario: T2 汇总向上报告
- **WHEN** T2 NPC 收集到所有子指令的反馈后
- **THEN** 汇总后向 T1 报告整体完成度
- 若有子指令失败，T2 的 LLM 规划可决定是否重新分配任务

#### Scenario: T1 向 T0 反馈战略执行进度
- **WHEN** T1 各条线的执行结果汇总后
- **THEN** T1 向 T0 的 LLM 规划上下文注入执行进度摘要
- T0 据此决定是否调整下一周期的战略方向

#### Scenario: 关键事件即时上报
- **WHEN** T3 在执行指令过程中遭遇重大事件（如发现敌方主力、获得至宝、上级 NPC 死亡）
- **THEN** 触发 `EMERGENCY` 级别的即时上报，中断正常反馈链，直达所有上级链路上的 NPC

### Requirement: 指令类型扩展
系统 SHALL 扩展 ActionType 和对应的行为树节点，支撑指令链的深度联动。

#### Scenario: COMMAND_DELEGATE 指令类型
- **WHEN** T1/T2 NPC 需要将上级指令拆解分派
- **THEN** 使用 `COMMAND_DELEGATE` action_type，生成子 Command 对象
- 子 Command 的 `issuer_tier` 设置为当前 NPC 的 tier，`parent_command_id` 设为当前 Command 的 id

#### Scenario: REPORT_STATUS 活动类型
- **WHEN** T3 NPC 完成指令后
- **THEN** 行为树插入 `ReportTask` 活动，令 NPC 移动至上级 NPC 所在位置或通过传音符/神念进行任务汇报

#### Scenario: COORDINATE_SQUAD 活动类型
- **WHEN** 多条 T3 NPC 在同一区域内执行相关联的指令（如同一个巡逻队、同一个采矿队）
- **THEN** 系统自动将他们标记为 Squad，触发 `CoordinateSquad` 活动
- Squad 成员共享视野和威胁信息，协调行动节奏

#### Scenario: RESIST_ORDER 状态
- **WHEN** T3 NPC 根据 CommandResponseComponent 决定拒绝指令
- **THEN** 行为树注入 `RefuseCommand` 活动，NPC 表现为："拒绝执行命令，继续原行为"或"惰性拖延（delay + 随机移动）"

### Requirement: T3 小队协同
系统 SHALL 支持 T3 NPC 在同一条指令下组成临时小队，协调执行。

#### Scenario: 小队自动组建
- **WHEN** 同一 T2 向 ≥3 个 T3 NPC 下发相同任务（如采矿、巡逻、进攻）
- **THEN** 系统自动将这些 T3 标记为一个 Squad
- Squad 有一个隐式 leader（战斗力最高或 loyal 最高的成员），其他为 member

#### Scenario: 小队内部协调
- **WHEN** Squad 执行战斗类任务
- **THEN** leader 在战斗中站位靠前（tank），member 分散站位
- 当 member HP < 30% 时，leader 下达撤退指令覆盖原任务

#### Scenario: 小队解散
- **WHEN** Squad 的任务完成或失败
- **THEN** 自动解散 Squad，成员恢复独立 NPC 状态

### Requirement: NPC 内存与行为树联动增强
系统 SHALL 将 NPC 记忆系统与行为树指令响应深度联动。

#### Scenario: 指令历史记忆
- **WHEN** T3 NPC 完成或拒绝一条指令
- **THEN** 在 `NPCMemory` 中记录该指令交互：指令内容、issuer、执行结果、情感标签
- 影响未来对同 issuer 指令的响应倾向

#### Scenario: 连续失败逃避
- **WHEN** T3 NPC 连续 3 次执行同一 issuer 的指令失败
- **THEN** 该 NPC 对该 issuer 产生负面记忆，未来接受其指令的概率额外 -25%
- 此效果随时间衰减，30 游戏天后恢复

#### Scenario: 超额完成激励循环
- **WHEN** T3 NPC 超额完成指令并获得额外贡献奖励
- **THEN** 该 NPC 对 issuer 生成正面记忆
- 未来对同 issuer 指令，超额完成概率 +10%（可叠加，上限 40%）

### Requirement: WASM NPC 状态结构体适配
NPCStateWasm 结构体 SHALL 包含指令链所需的最小字段。

#### Scenario: 结构体扩展
- **WHEN** 导出 NPC 状态到前端
- **THEN** 包含：
  - `currentActivity`（包含新增 ReportTask、DelegateTask、RefuseCommand、CoordinateSquad）
  - `activeCommandId`（当前执行的指令 ID，0 表示无）
  - `commandStatus`（当前指令的执行状态枚举）
  - `squadId`（所属小队 ID，0 表示独立）

---

## MODIFIED Requirements

### Requirement: 行为优先级仲裁树层级 2（指令执行层）扩展
V2 中行为树优先级 2 原本为"收到指令→执行指令指定活动→完成后恢复"，SHALL 扩展为：
1. 检查 `CommandResponseComponent` 是否决定拒绝 → 是 → 优先级 2 直接返回，行为树降级到日常循环
2. 检查是否为 Squad 成员 → 是 → 协调执行（CoordinateSquad 逻辑）
3. 检查指令是否有依赖（需与同 Squad 其他成员同步进度）→ 是 → 等待同步
4. 执行指令指定的活动（原逻辑）
5. 完成后触发 `ReportTask` 反馈 → 等待上级确认 → 恢复自由行为

### Requirement: RoleCommandComponent 重写
V2 的 `RoleCommandComponent` 仅存储单条指令的 `type` + `params` + `status`。SHALL 扩展为支持：
- 指令队列（而非单条指令覆盖）
- 委派链字段（parent_command_id, child_commands, issuer_tier）
- 完整生命周期状态（9 态状态机）
- 反馈内容存储
- Squad 信息（squad_id, squad_role）

### Requirement: LLMConfig ActionType 枚举扩展
`ActionType` 枚举 SHALL 新增：
- `COMMAND_DELEGATE` — 中间层拆解分发指令
- `REPORT_STATUS` — 向上反馈执行进度
- `COORDINATE_SQUAD` — 小队协同
- `RESIST_ORDER` — 拒绝执行指令

---

## REMOVED Requirements

### Requirement: 高层直接写入低层 NPC 优先级 2 的简单指令模式
**Reason**: 此模式无法支持多层级的指令拆解、反馈闭环和联动。
**Migration**: 替换为 CommandChainSystem 的逐级下发机制。已下发到 T3 但未完成的旧指令按 `EXPIRED` 处理，新的指令通过指令链系统重新下发。
