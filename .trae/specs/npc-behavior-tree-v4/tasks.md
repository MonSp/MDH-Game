# Tasks

- [x] Task 1: 扩展共享类型与配置 — ActionType 枚举与 Command 数据模型
  - [x] 在 `src/shared/types/LLMPlanning.ts` 的 `ActionType` 枚举中新增 `COMMAND_DELEGATE`、`REPORT_STATUS`、`COORDINATE_SQUAD`、`RESIST_ORDER`
  - [x] 新增 `CommandStatus` 枚举（9 态：ISSUED / RECEIVED / DELEGATED / EXECUTING / COMPLETED / PARTIALLY_COMPLETED / FAILED / REFUSED / EXPIRED）
  - [x] 新增 `Command` 接口：id、parent_command_id、issuer_id、issuer_tier、target_role、scope、action_type、params、status、priority、issued_at、expires_at、feedback
  - [x] 新增 `Squad` 接口：id、task_id、members(包含 role 字段)、leader_id
  - [x] 新增 `CommandResponse` 接口：accept_probability、response_type（ACCEPT / REFUSE / DELAY / OVERACHIEVE）、extras
  - [x] 在 `src/server/config/LLMConfig.ts` 同步更新 `getFallbackBehavior` 映射，新增 action types 的兜底行为

- [x] Task 2: 重写 RoleCommandComponent（C++ WASM 层）— 指令队列与委派链
  - [x] 重写 `game/ecs/components/RoleCommandComponent.h`：command_queue 替代单一 command，新增 parent_command_id、child_commands 列表、issuer_tier、feedback 字段
  - [x] 新增 `CommandSlot` 结构体：8 字节对齐，command_id(32bit) + status(8bit) + priority(8bit) + padding
  - [x] 实现 `pushCommand`、`popCommand`、`peekCommand`、`updateStatus` 方法
  - [x] 实现 `expireCommands()` 方法，在每帧 tick 中自动检测并过期超时指令
  - [x] 更新 `game/ecs/Registry.h`，注册新的 RoleCommandComponent SoA 数组

- [x] Task 3: 新增 CommandDelegationComponent（C++ WASM 层）— 中间层拆解能力
  - [x] 创建 `game/ecs/components/CommandDelegationComponent.h`
  - [x] 定义 `DelegationSlot` 结构体：存储拆解后的子指令 ID 列表、目标 T3 slot 范围
  - [x] 实现 `delegateCommand(parent_cmd, targets, params)` — 生成子指令并写入目标 NPC 的 RoleCommandComponent
  - [x] 实现 `collectFeedback(parent_cmd_id)` — 汇总所有子指令的反馈状态
  - [x] 注册到 Registry

- [x] Task 4: 新增 CommandResponseComponent（C++ WASM 层）— T3 多维度响应
  - [x] 创建 `game/ecs/components/CommandResponseComponent.h`
  - [x] 包含响应状态字段：response_type（ACCEPT/REFUSE/DELAY/OVERACHIEVE）、overachieve_mult (1.2-1.5)、resource_intercept_ratio
  - [x] 实现 `evaluateResponse(command, npcPersonality, relationshipValue)` 函数：
    - loyalty >= 70 → 100% accept
    - loyalty >= 40 → 90% accept
    - loyalty < 40 → (100-loyalty)% 拒绝概率；高风险指令且 loyalty < 30 时拒绝概率翻倍
    - ambition > 80 → 30% 概率 overachieve_mult = rand(1.2, 1.5)
    - greed > 70 → 25% 概率 resource_intercept_ratio = rand(0.1, 0.3)
    - 关系亲密度 < 0 → accept_prob -20%
    - 关系亲密度 > 50 → accept_prob +10%
  - [x] 注册到 Registry

- [x] Task 5: 新增 CommandChainSystem（C++ WASM 层）— 指令链核心引擎
  - [x] 创建 `game/npc/CommandChainSystem.h`
  - [x] 实现 `routeCommand(command)` — 根据 command.target_role 和 scope 将指令路由到正确的中间层 NPC
  - [x] 实现 `processDelegation(npcId)` — 处理中间层 NPC 的指令拆解：读取 LLM 子任务 → 生成子 Command → 下发到下一层
  - [x] 实现 `processFeedback(commandId, result)` — 向上逐级传播反馈，更新 parent_command 状态
  - [x] 实现 `processEmergencyReport(event)` — 关键事件即时穿透所有层级上报
  - [x] 实现 `updateCommandChain()` — 每帧 tick：遍历活跃 Command、处理超时、汇总反馈、触发上级 LLM 规划更新

- [x] Task 6: 扩展行为树优先级 2（指令执行层）逻辑
  - [x] 修改 `game/npc/BehaviorTreeSystem.h` 的指令层（优先级 2）dispatch：
    1. 调用 CommandResponseComponent 评估响应 → 若 REFUSE → 记录拒绝 → 降级到日常循环
    2. 检查 squad_id → 若非 0 → 走 CoordinateSquad 协调执行路径
    3. 检查指令是否有依赖同步 → 等待同步条件满足
    4. 执行指令指定的活动
    5. 完成后触发 ReportTask → 向上反馈
  - [x] 在 `NPCActivity` 枚举中新增 `ReportTask`、`RefuseCommand`、`CoordinateSquad`、`AwaitOrders`
  - [x] 为新增 activity 实现对应的 execute 分支（可降级为简单状态机）

- [x] Task 7: 实现 Squad 小队协同系统
  - [x] 在 CommandChainSystem 中实现 `formSquad(taskId, memberSlots)` — 当同一指令分配给 ≥3 T3 时自动组建
  - [x] 实现 leader 选举算法：按 combatPower 排序取最高，若相等则按 loyalty
  - [x] 实现 `updateSquadTactics(squadId)` — 战斗协同站位 + member HP < 30% 触发 leader 撤退指令
  - [x] 实现 `disbandSquad(squadId)` — 任务完成/失败时解散

- [x] Task 8: 集成 NPC 记忆系统与指令响应联动
  - [x] 在 `src/server/llm/NPCMemory.ts` 中新增 `CommandMemoryRingBuffer` 类型：记录指令交互历史（issuer、结果、情感标签）
  - [x] 实现 `updateCommandMemory(npcId, issuerId, result)` — 写入记忆
  - [x] 实现连续失败检测：同一 issuer 连续 3 次失败 → 生成负面记忆标签 `(issuerId, "distrust", -25)`
  - [x] 实现超额完成激励循环：超额完成成功后 → 生成正面记忆标签 `(issuerId, "motivated", +10)`
  - [x] 在 NPCMemory 的 `getCommandInfluence(npcId, targetId)` 中纳入指令记忆的影响因子

- [x] Task 9: WASM 导出层与 TypeScript 接口适配
  - [x] 更新 `tools/ecs-wasm/src/wasm_exports.cpp`：NPCStateWasm 新增 activeCommandId、commandStatus、squadId 字段
  - [x] 更新 `src/ecs/ECSWasmLoader.ts`：NPCState 接口 + DataView 偏移适配新字段
  - [x] 更新 `src/server/game/ecs/Registry.h`：注册新组件 SoA 数组
  - [x] WASM 导出层 ecs_getNPCStates 读取并填充新字段

- [x] Task 10: 纳入 V3 分频评估体系
  - [x] 在 `BehaviorTreeComponent` 中为指令相关活动设置评估频率：
    - AwaitOrders (25)：低频（每 30 帧）
    - RefuseCommand (48)：低频（每 30 帧）
    - ReportTask (47)：中频（每 5 帧）
    - CoordinateSquad (49)：中频（每 5 帧）
  - [x] CommandChainSystem 独立维护指令链状态，通过 updateCommandChain 驱动

# Task Dependencies
- [Task 2] depends on [Task 1]（Command 数据模型需先定义）
- [Task 5] depends on [Task 2], [Task 3], [Task 4]（指令链引擎依赖各组件）
- [Task 6] depends on [Task 4], [Task 5]（行为树扩展依赖响应评估和指令链）
- [Task 7] depends on [Task 5]（小队系统依赖指令链基础设施）
- [Task 8] depends on [Task 4]（记忆联动依赖响应评估结果）
- [Task 9] depends on [Task 2], [Task 6]（WASM 导出依赖底层组件和枚举）
- [Task 10] depends on [Task 5], [Task 6], [Task 7]（纳入 V3 分频需所有系统就绪）
- [Task 3] 可与 [Task 2], [Task 4] 并行开发
