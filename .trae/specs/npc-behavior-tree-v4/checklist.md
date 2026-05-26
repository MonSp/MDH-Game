# Checklist

## 共享类型与配置
- [x] `ActionType` 枚举包含 `COMMAND_DELEGATE`、`REPORT_STATUS`、`COORDINATE_SQUAD`、`RESIST_ORDER`
- [x] `CommandStatus` 枚举包含全部 9 个状态值
- [x] `Command` 接口包含所有必需字段（id、parent_command_id、issuer_id、issuer_tier、target_role、scope、action_type、params、status、priority、issued_at、expires_at、feedback）
- [x] `Squad` 接口包含成员角色和 leader 字段
- [x] `CommandResponse` 接口包含响应类型和概率字段
- [x] `LLMConfig.ts` 的 `getFallbackBehavior` 覆盖所有新增 ActionType

## 指令链组件
- [x] `RoleCommandComponent` 支持指令队列而非单条指令覆盖
- [x] `RoleCommandComponent` 支持委派链追溯（parent_command_id + child_commands）
- [x] `RoleCommandComponent` 支持指令超时自动过期
- [x] `CommandDelegationComponent` 实现指令拆解并写入目标 NPC 队列
- [x] `CommandDelegationComponent` 实现子指令反馈汇总
- [x] `CommandResponseComponent` 实现忠诚度驱动的接受/拒绝逻辑（loyalty 70/40 分档）
- [x] `CommandResponseComponent` 实现野心驱动的超额完成逻辑（ambition > 80 → 30% 概率）
- [x] `CommandResponseComponent` 实现谨慎驱动的防御性执行（caution > 70 → HP<50% 撤退）
- [x] `CommandResponseComponent` 实现贪婪驱动的资源截留（greed > 70 → 25% 概率截留 10-30%）
- [x] `CommandResponseComponent` 实现关系亲密度对接受概率的影响

## 指令链引擎
- [x] `CommandChainSystem::routeCommand` 将 T0 指令路由到正确的 T1 NPC
- [x] `CommandChainSystem::processDelegation` 实现中间层 NPC 拆解指令
- [x] `CommandChainSystem::processFeedback` 实现向上逐级反馈
- [x] `CommandChainSystem::processEmergencyReport` 实现关键事件穿透上报
- [x] `CommandChainSystem::updateCommandChain` 每帧正确处理超时、反馈、触发上级 LLM 更新

## 行为树指令执行层
- [x] 行为树优先级 2 先检测 CommandResponseComponent 的拒绝决定
- [x] 行为树优先级 2 支持 Squad 协调执行路径
- [x] 行为树优先级 2 完成后触发 ReportTask 反馈
- [x] `NPCActivity` 枚举包含 `ReportTask`、`RefuseCommand`、`CoordinateSquad`、`AwaitOrders`
- [x] 新增 activity 均有对应的 execute 分支实现

## Squad 小队协同
- [x] ≥3 个 T3 收到相同任务时自动组建 Squad
- [x] Squad leader 按 combatPower → loyalty 规则选举
- [x] Squad 战斗协同站位逻辑正确
- [x] member HP < 30% 时 leader 触发撤退指令
- [x] 任务完成/失败时 Squad 自动解散

## NPC 记忆联动
- [x] `CommandMemoryRingBuffer` 类型记录指令交互历史
- [x] 连续 3 次对同一 issuer 失败 → 负面记忆 -25% 接受概率
- [x] 超额完成 → 正面记忆 +10% 超额概率（上限 40%）
- [x] `getCommandInfluence` 纳入指令记忆影响因子

## WASM 导出与接口适配
- [x] `NPCStateWasm` 包含 `activeCommandId`、`commandStatus`、`squadId` 字段
- [x] TypeScript 侧 `NPCState` 接口与 DataView 偏移正确同步
- [x] `Registry.h` 注册 `cmdDelegation_` 和 `cmdResponse_` 组件数组
- [x] `NPCWorldService.ts` 新增 `recordCommandEvent` / `getCommandInfluence` 方法

## V3 分频集成
- [x] EXECUTING 阶段指令全频评估（Patrol/58 移至 1 帧评估组）
- [x] ReportTask 中频评估（每 5 帧）
- [x] CoordinateSquad 中频评估（每 5 帧）
- [x] AwaitOrders 低频评估（每 30 帧）
- [x] CommandChainSystem 非关键指令处理降频（委托、反馈检查每 5 帧）
