# NPC 行为树 V3 大规模性能优化 Spec

## Why
V2 行为树在 100K NPC 下单线程 ~16ms (60fps) 可运行，但 1M NPC 时 ~113ms (9fps) 不可接受。当前 `evaluate()` 采用通用解释型 6 层优先级仲裁 + 42 路 `execute` 分支，每帧所有 NPC 全量评估。根据 [advise.md](file:///home/test/MyGame/.trae/specs/npc-behavior-tree-v3/advise.md) 的分析，需要通过分频评估、行为树模板化、决策/执行分离、并行化等手段将 100K NPC 降至 2–4ms，1M NPC 降至 20–30ms。

## What Changes
- 新增 `BehaviorTreeComponent`：每 NPC 挂载 `const BehaviorTreeTemplate*` + 当前节点索引 + 更新相位计数器
- 新增 `BehaviorTreeTemplate`：共享的只读打平行为树节点数组，6 种角色模板
- 新增 `BlackboardCache`：每 NPC 条件位域缓存，一帧内复用
- 重构 `RPChunkUpdateSystem`: **BREAKING** `evaluate() → execute()` 即刻执行改为两阶段（评估→写入 ActionRequest 数组 → 排序分桶 → 批量执行）
- **BREAKING**: `BehaviorTreeSystem` 从通用解释器改为按模板 `dispatch`，6 层仲裁被模板化的 `if/else` 替代
- 简单自模拟活动（Cultivate/Rest/Sleep/Walk/Mine/Farm/Fish/Eat）降级为线性状态机，不跑行为树
- 空间网格缓存：`SpatialIndexCache` 为近邻查询提供 O(1) 格子查询
- 保留 WASM 导出接口兼容性

## Impact
- Affected specs: `npc-behavior-tree-v2` — V2 的 `evaluate()` 逻辑被替换
- Affected code:
  - `game/npc/BehaviorTreeSystem.h` — 拆分为模板化 dispatch
  - `game/ecs/systems/NPChunkUpdateSystem.h` — 两阶段批量执行
  - `game/ecs/Registry.h` — 注册 `BehaviorTreeComponent` SoA 数组
  - 新增 `game/ecs/components/BehaviorTreeComponent.h`
  - 新增 `game/bt/BehaviorTreeTemplate.h`
  - 新增 `game/bt/BlackboardCache.h`
  - 新增 `game/spatial/SpatialIndexCache.h`
  - `tools/ecs-wasm/src/wasm_exports.cpp` — 适配新组件导出
  - `src/ecs/ECSWasmLoader.ts` — RFCStateWasm 适配

---

## ADDED Requirements

### Requirement: 分频评估（P0）
系统 SHALL 根据 NPC 当前活动类型决定行为树评估频率，而非每帧全量评估。

#### Scenario: 修炼/休息低频评估
- **WHEN** NPC 当前活动为 Cultivate / Rest / Sleep / Meditate
- **THEN** 每 30 帧才执行一次 `evaluate()`，30 帧内仅执行 `execute()` 推进进度

#### Scenario: 放牧/采集中频评估
- **WHEN** NPC 当前活动为 Mine / Farm / Fish / Lumber / Gather
- **THEN** 每 10 帧执行一次 `evaluate()`，10 帧内仅推进采集进度

#### Scenario: 巡逻/移动/社交调频评估
- **WHEN** NPC 当前活动为 Patrol / Walk / VisitFriend / Date / Explore
- **THEN** 每 5 帧执行一次 `evaluate()`，移动和社交不需要逐帧决策

#### Scenario: 战斗/指令/LLM 全频评估
- **WHEN** NPC 当前活动为 Duel / Hunt / Ambush / Flee / Heal / 任何 RoleCommand 执行中
- **THEN** 每帧执行 `evaluate()`，战斗和指令需要实时响应

#### Scenario: 相位计数器驱动
- **WHEN** 每帧 `updateAllNPCs` 被调用
- **THEN** `BehaviorTreeComponent.updatePhase` 自增，`updatePhase % evalInterval == 0` 的 NPC 才跑 evaluate

### Requirement: 行为树模板打平 + 共享（P0）
系统 SHALL 用共享的只读 `BehaviorTreeTemplate` 替代通用解释器。

#### Scenario: 6 种角色模板
- **WHEN** NPC 被创建
- **THEN** 根据 `IdentityComponent.role` 分配对应模板指针：
  - `FamilyHead` / `Elder` → Template: Leader
  - `LawEnforcementElder` → Template: Guard
  - `CoreDisciple` / `InnerDisciple` → Template: Disciple
  - `BranchDisciple` → Template: Worker
  - 额外 Template: Combat（战斗中切入）、Template: Command（指令执行中）

#### Scenario: 打平节点结构
- **WHEN** 行为树模板被定义
- **THEN** 每个模板是一个 `std::array<FlatBTNode, N>` 静态数组，节点包含：
  - `uint8_t type`：1=Condition, 2=Action, 3=Sequence, 4=Selector
  - `uint16_t next`：成功分支索引
  - `uint16_t fail`：失败分支索引
  - `uint16_t actionId`：若 type=Action，映射到 NPCActivity

#### Scenario: 模板评估
- **WHEN** 某个 NPC 需要 evaluate
- **THEN** 从 `BehaviorTreeComponent.tmpl` 读取模板，从 `BehaviorTreeComponent.currentNode` 开始执行：
  - Condition 节点：查 `BlackboardCache`，通过→跳 `next`，失败→跳 `fail`
  - Action 节点：设置 `BehaviorComponent.currentActivity = actionId`
  - Sequence/Selector：递归子节点（栈模拟）

### Requirement: 决策/执行分离 + 批量执行（P1）
系统 SHALL 将每帧的行为树决策与动作执行分离为两个阶段。

#### Scenario: 阶段 1 — 评估写入 ActionRequest
- **WHEN** 所有需要 evaluate 的 NPC 完成决策
- **THEN** 产出 `std::vector<ActionRequest>` 数组，每项包含：
  - `slot`：NPC 在 SoA 数组中的槽位索引（非 EntityId，避免重复哈希）
  - `actionType`：NPCActivity 值
  - `prevActivity`：上一个活动（用于状态机切换检测）

#### Scenario: 阶段 2 — 排序分桶 + 批量执行
- **WHEN** ActionRequest 数组生成完毕
- **THEN** 按 `actionType` 哈希分桶（用固定大小数组 `std::vector<size_t> buckets[MAX_ACTIVITY]`），然后对每个桶内的所有 NPC 一次性批量执行：
  - `batchRest(bucket)` → 批量对 SoA 数组中的 HP/MP/疲劳做增量
  - `batchCultivate(bucket)` → 批量增加 cultivationProgress
  - `batchMove(bucket)` → 批量更新 Position SoA 数组
  - `batchDealDamage(bucket)` → 批量递减 HP SoA 数组

#### Scenario: 批量执行无额外内存分配
- **WHEN** 批量执行阶段
- **THEN** 分桶使用固定大小的 43 元素数组（每种 activity 一个桶），每个桶直接存储 slot 索引
- 批量执行函数直接操作 SoA 数组的指针偏移，不分配临时对象

### Requirement: 并行分块评估（P1）
系统 SHALL 利用现有 JobDispatcher 将 NPC 评估分块并行执行。

#### Scenario: 按 slot 范围分块
- **WHEN** `updateAllNPCs` 被调用且 `ThreadPool` 有多个 worker
- **THEN** 将 NPC 按 SoA 数组索引 [0, totalSlots) 均分为 N 块（N = threadCount），每块内部：
  1. 跳过 inactive slot
  2. 检查 updatePhase 是否需要 evaluate
  3. 执行社交状态 tick
  4. 若需要 evaluate → 调用模板评估，产出本块的 ActionRequest
  5. 若仅需 execute → 直接调用原来的 execute 逻辑

#### Scenario: 各 worker 独立产出 ActionRequest
- **WHEN** 每个 worker 完成自己块的评估
- **THEN** worker 写入自己的 `std::vector<ActionRequest>` 局部数组，等待所有 worker 完成后，主线程合并所有局部数组，然后执行批量执行阶段

### Requirement: 简单活动降级为状态机（P2）
系统 SHALL 将 Cultivate / Rest / Sleep / Walk / Mine / Farm / Fish / Lumber / Eat 等简单活动编码为线性状态机，不经过行为树节点遍历。

#### Scenario: 修炼状态机
- **WHEN** NPC 当前活动为 Cultivate
- **THEN** `executeCultivate()` 内 switch(phase): 0→静止+设置计时器, 1→扣计时器到期→phase++, 2→加进度→切 Rest

#### Scenario: 采集状态机
- **WHEN** NPC 当前活动为 Mine/Farm/Fish/Lumber
- **THEN** `executeGather()` 内用统一的开关：phase 0→寻路到资源点, 1→采集 + activityProgress, 满→切 Rest 并增加资源

#### Scenario: 状态机入口
- **WHEN** 批量执行阶段检测到 activity 属于简单活动
- **THEN** 不通过 BehaviorTreeTemplate，直接用 switch-case 状态机处理

### Requirement: 条件黑板缓存（P2）
系统 SHALL 在每个 NPC 的 `BlackboardCache` 位域中缓存条件评估结果，一帧内复用。

#### Scenario: 黑板缓存结构
- **WHEN** `BlackboardCache` 被定义
- **THEN** 包含以下位域：
  - `hasThreatNearby : 1` — 周围是否有危险
  - `isHungry : 1` — 饥饿
  - `isExhausted : 1` — 疲劳
  - `hasSocialTarget : 1` — 是否有社交对象
  - `hasCommand : 1` — 是否有有效指令
  - `shouldCultivate : 1` — 是否应修炼
  - `dirty : 1` — 缓存是否需要刷新

#### Scenario: 缓存刷新
- **WHEN** 需要 evaluate 的 NPC 进入模板评估
- **THEN** 如果 `dirty == 0`，跳过 condition 节点，直接执行 action 节点
- 如果 `dirty == 1`，条件节点写入缓存各位，完成后 `dirty = 0`

#### Scenario: 缓存失效时机
- **WHEN** 外部事件发生（受到伤害、收到指令、资源变化）
- **THEN** 对应 NPC 的 `dirty` 位设为 1，下次 evaluate 强制刷新

### Requirement: 空间索引缓存（集成）
系统 SHALL 提供轻量级空间索引，支撑近邻查询和批量交互。

#### Scenario: 空间网格构建
- **WHEN** 每帧开始时
- **THEN** 将 `PositionComponent` SoA 数组中的 (x,y) 映射到 100m×100m 网格单元：
  - 构建 `std::vector<uint32_t> cellHeads[100][100]`（gridSize 可配置）
  - 构建 `std::vector<uint32_t> nextInCell`（链表索引）
  - 总内存 < 1 MB（100K NPC）

#### Scenario: 近邻查询
- **WHEN** 批量交互需要查询 NPC_A 周围 100m 内的 NPC
- **THEN** 遍历 A 所在格及 8 邻格（共 9 格）的链表，返回候选 ID 列表，O(1+邻居数) 而非 O(N)

---

## MODIFIED Requirements

### Requirement: BehaviorTreeSystem 架构
原 V2 中 `BehaviorTreeSystem::evaluate(entityId)` + `execute(entityId)` 作为通用解释器每 NPC 独立调用的模式 **SHALL 保留**，但 evaluate 内部实现从 6 层仲裁 switch 替换为模板化的 `FlatBTNode` dispatch。简单活动绕过行为树直接走状态机。

### Requirement: NPChunkUpdateSystem 执行流程
原 `updateSingleNPC` 内的 `evaluate() → execute() → MovementSystem::update()` 顺序 SHALL 改为：
1. Social tick（所有 NPC）
2. 检测是否需要 evaluate（基于 updatePhase + 当前活动）
3. 评估阶段（并行分块）→ 产出 ActionRequest
4. 批量执行阶段（主线程，按 activity 分桶）
5. Movement update

---

## REMOVED Requirements

### Requirement: 通用 6 层优先级仲裁 switch
**Reason**: 被模板化 `BehaviorTreeTemplate` + `FlatBTNode` 取代，单 NPC 评估从 O(N_layers) 降为 O(N_nodes)。
**Migration**: 6 层优先级逻辑迁移到 `BehaviorTreeTemplate` 的节点数组中，语义等价。

### Requirement: 每帧全量评估
**Reason**: 被分频评估取代，95% NPC 在大多数帧中跳过 evaluate。
**Migration**: `BehaviorTreeComponent.updatePhase` 控制评估频率，默认每 30 帧一次。
