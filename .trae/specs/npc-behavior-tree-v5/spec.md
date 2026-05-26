# NPC 行为树 V5 — ExecuteDescriptor 数据表 + 分类头文件 Spec

## Why
V4.1 修复了 Review 发现的 bug 后，`BehaviorTreeSystem.h` 仍是 936 行的单体文件：`execute()` 用 48 路 `switch-case` 分发到 48 个 `execute*()` 方法。添加新行为需要改动 4 处（枚举、switch、方法、activityName），且所有活动挤在一个文件中不利于维护。根据架构分析，应引入 **ExecuteDescriptor 常量数据表 + 按类别拆分头文件**，在不引入虚函数的前提下实现"添加行为只需加一行表项"。

## What Changes
- 新增 `ExecuteDescriptor` 结构体：描述每个 activity 的执行元信息（函数指针、分类枚举、所需组件 bitmask）
- 新增 `ExecuteContext` 结构体：将当前在 `execute()` 中逐行获取的 8 个组件指针统一为惰性获取的上下文
- **BREAKING**: `BehaviorTreeSystem::execute()` 中 48 路 `switch-case` 替换为 `kExecuteTable[]` 查表分发
- `BehaviorTreeSystem` 保留 `evaluate()` 6 层优先级逻辑不变（决策层不改）
- 48 个 `execute*()` 方法按 6 个分类拆到独立头文件：
  - `BehaviorTree_Survival.h` — Flee / Heal / Defend
  - `BehaviorTree_Daily.h` — Eat / Rest / Sleep / Walk / AwaitOrders
  - `BehaviorTree_Cultivation.h` — Cultivate / Breakthrough / Tribulation / Meditate / Alchemy / SeekFortune
  - `BehaviorTree_Social.h` — VisitFriend / Date / FamilyGathering / MentorTeach / DiscipleAsk / Trade / Gossip
  - `BehaviorTree_Production.h` — Build / Mine / Farm / Fish / Lumber / Gather / Craft / Refine / Cook / Construct / Repair / Sell / Buy
  - `BehaviorTree_Combat.h` — Duel / Hunt / Ambush / Assassinate / Attack / DefendPosition / Patrol / Escort / Scout
  - `BehaviorTree_Exploration.h` — Explore / TreasureHunt / MapExplore
  - `BehaviorTree_Command.h` — ReportTask / RefuseCommand / CoordinateSquad
- `activityName()` 整合到 `ExecuteDescriptor` 的 `name` 字段
- 新增 `ActivityCategory` 枚举
- 所有新头文件保持 header-only + WASM 兼容

## Impact
- Affected specs: `npc-behavior-tree-v2` — BehaviorTreeSystem 内部重构，外部接口不变
- Affected specs: `npc-behavior-tree-v3` — NPChunkUpdateSystem 调用接口不变
- Affected specs: `npc-behavior-tree-v4` — 不影响 CommandChainSystem
- Affected specs: `npc-behavior-tree-v4.1` — 重构覆盖的 execute 方法需同步迁移
- Affected code:
  - `game/npc/BehaviorTreeSystem.h` — **BREAKING** execute() 重写，移除 48 个私有 execute*() 方法
  - 新增 `game/npc/BehaviorTree_Survival.h`
  - 新增 `game/npc/BehaviorTree_Daily.h`
  - 新增 `game/npc/BehaviorTree_Cultivation.h`
  - 新增 `game/npc/BehaviorTree_Social.h`
  - 新增 `game/npc/BehaviorTree_Production.h`
  - 新增 `game/npc/BehaviorTree_Combat.h`
  - 新增 `game/npc/BehaviorTree_Exploration.h`
  - 新增 `game/npc/BehaviorTree_Command.h`
  - `game/ecs/components/BehaviorComponent.h` — 新增 `ActivityCategory` 枚举
  - `test/components/` — 测试文件 include 路径适配

---
## ADDED Requirements

### Requirement: ExecuteDescriptor 数据表驱动执行
系统 SHALL 用常量数据表替代 `execute()` 中的 `switch-case` 分发，添加新行为仅需在表中加一行。

#### Scenario: ExecuteDescriptor 结构体
- **WHEN** `ExecuteDescriptor` 被定义
- **THEN** 包含以下字段：
  - `NPCActivity activity` — 枚举值
  - `const char* name` — 字符串名（替代 activityName）
  - `ActivityCategory category` — 所属分类
  - `uint8_t requiredComponents` — bitmask（REQ_POSITION/REQ_STATS/REQ_RESOURCES/REQ_SOCIAL/REQ_CULT/REQ_RELATIONSHIP/REQ_CMD/REQ_IDENTITY）
  - `void (*execute)(ExecuteContext& ctx)` — 执行函数指针

#### Scenario: execute() 改用查表分发
- **WHEN** `BehaviorTreeSystem::execute(entityId, currentTime, deltaTime)` 被调用
- **THEN** 遍历 `kExecuteTable[]`，匹配 `desc.activity == behavior->currentActivity`
- 若匹配，构建 `ExecuteContext` 并按 `desc.requiredComponents` bitmask 逐位检查是否需要获取对应组件指针
- 仅获取 bitmask 标记的组件（节省不必要的内存访问）
- 调用 `desc.execute(ctx)`

#### Scenario: 添加新行为只需一步
- **WHEN** 开发者在 `NPCActivity` 枚举中新增一个活动值
- **THEN** 不需要修改 `BehaviorTreeSystem` 的任何 switch/case 或私有方法
- 只需：在对应分类头文件中写一个 `exec_xxx(ExecuteContext& ctx)` 函数，在 `kExecuteTable[]` 中添加一行条目

### Requirement: ExecuteContext 惰性组件获取
系统 SHALL 提供 `ExecuteContext` 结构体，在执行函数内部按需获取组件指针，而非在 dispatcher 中预取所有指针。

#### Scenario: 组件惰性获取
- **WHEN** 一个 execute 函数（如 `exec_mine`）需要 `ResourcesComponent` 和 `PositionComponent`
- **THEN** 通过 `ctx.getResources()` / `ctx.getPosition()` 获取指针
- 组件指针首次获取后缓存在 ExecuteContext 成员中，后续调用直接返回缓存值
- 缓存失效：仅当 entityId 变化时清空

#### Scenario: 组件缺失安全处理
- **WHEN** `ctx.getComponent<T>()` 被调用但 NPC 没有该组件
- **THEN** 返回 nullptr
- execute 函数应在首行检查 `if (!ctx.getStats()) return;` 保持现有行为

### Requirement: ActivityCategory 枚举 + 按类别拆分
系统 SHALL 定义 `ActivityCategory` 枚举，将 48 个 activity 归入 7 个类别，每个类别一个独立头文件。

#### Scenario: 类别枚举
- **WHEN** `ActivityCategory` 被定义
- **THEN** 包含：
  - `CAT_SURVIVAL` = 0 — Flee / Heal / Defend（3 个）
  - `CAT_DAILY` = 1 — Eat / Rest / Sleep / Walk / Chat / AwaitOrders（6 个）
  - `CAT_CULTIVATION` = 2 — Cultivate / Breakthrough / Tribulation / Meditate / Alchemy / SeekFortune（6 个）
  - `CAT_SOCIAL` = 3 — VisitFriend / Date / FamilyGathering / MentorTeach / DiscipleAsk / Trade / Gossip / ReportTask（8 个）
  - `CAT_PRODUCTION` = 4 — Build / Mine / Farm / Fish / Lumber / Gather / Craft / Refine / Cook / Construct / Repair / Sell / Buy（13 个）
  - `CAT_COMBAT` = 5 — Duel / Hunt / Ambush / Assassinate / Attack / DefendPosition / Patrol / Escort / Scout（9 个）
  - `CAT_EXPLORATION` = 6 — Explore / TreasureHunt / MapExplore（3 个）
  - `CAT_COMMAND` = 7 — RefuseCommand / CoordinateSquad（2 个）

#### Scenario: 分类头文件自包含
- **WHEN** 某个分类头文件（如 `BehaviorTree_Combat.h`）被 include
- **THEN** 该文件包含该类别所有活动的 `exec_*()` 函数定义
- 函数签名统一为 `void exec_xxx(ExecuteContext& ctx)`
- 文件内部 include 所需的组件头文件（`StatsComponent.h` 等）

### Requirement: 向后兼容
系统 SHALL 保持 `BehaviorTreeSystem` 的 `evaluate()` 方法和 `getInstance()` 单例接口不变。

#### Scenario: evaluate() 不受影响
- **WHEN** 现有代码调用 `BehaviorTreeSystem::getInstance().evaluate(entityId, currentTime)`
- **THEN** 行为与重构前完全一致（6 层优先级逻辑不变）

#### Scenario: execute() 对外接口不变
- **WHEN** `NPChunkUpdateSystem` 调用 `BehaviorTreeSystem::getInstance().execute(entityId, currentTime, deltaTime)`
- **THEN** 函数签名和外部行为不变
- 内部实现从 switch 改为查表

## MODIFIED Requirements

### Requirement: BehaviorTreeSystem 结构
原 `BehaviorTreeSystem` 类 SHALL 精简：移除所有私有 `execute*()` 方法定义，仅保留 `evaluate()` + `execute()`（查表分发）+ `evaluateSurvival/evaluateCommand/evaluateSocial/evaluateCultivation/evaluateDaily` + `getRiskLevel` + `translateActionType` + `chooseByRole` + `random01/randRange`。

#### Scenario: 文件长度变化
- **WHEN** 重构完成
- **THEN** `BehaviorTreeSystem.h` 从 ~936 行降至 ~300 行
- 48 个 execute 方法分布到 8 个分类头文件中（每文件 20~80 行）

### Requirement: NPCActivity 枚举中 activityName 移除
原 `activityName()` 静态方法 SHALL 移除，替换为 `ExecuteDescriptor::name` 字段。

#### Scenario: 名称查询
- **WHEN** 代码需要获取 activity 的字符串名
- **THEN** 通过查 `kExecuteTable[]` 获取 `desc.name`

## REMOVED Requirements

### Requirement: execute() 中的 switch-case 分发
**Reason**: 48 路 switch 难以维护，添加新行为需同时改 switch 和写方法。
**Migration**: 替换为 `kExecuteTable[]` 常量数组查表分发。所有现有的 execute 行为语义完全保留，仅分发机制改变。
