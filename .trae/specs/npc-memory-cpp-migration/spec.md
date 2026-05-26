# NPC 记忆系统 C++ WASM 迁移 Spec

## Why
当前 `NPCMemoryStore`（关系矩阵 + 3 个 Ring Buffer + 命令记忆）完全在 TypeScript 侧，使用 `Map<string, Map<...>>` 和 `Array` 做所有存储。每 NPC 约 32KB JS 堆内存（Map/对象开销），10K NPC 即 ~320MB，且 O(n²) 的交互检测循环无法利用 V3 已有的 `SpatialIndexCache`。迁移到 C++ WASM SoA 架构后，内存降至 ~4KB/NPC（10K = 40MB），交互检测从 O(n²) 降至 O(n·邻居数)，且 C++ ECS 行为树和指令链可直接查询关系矩阵。

## What Changes
- **BREAKING**: `NPCMemoryStore` 中关系矩阵 + 4 个 Ring Buffer 的底层存储从 TS Map/Array 迁移到 C++ WASM SoA 组件
- 新增 `RelationshipComponent`（V2 已有但仅含少量字段）：重写为 SoA 稀疏关系矩阵，每 NPC 最多 50 个关系
- 新增 `MemoryRingComponent`：SoA 环形缓冲区，覆盖交互记录、目击事件、命令记忆
- 新增 `NPCInteractionSystem`：利用 `SpatialIndexCache` 将 O(n²) 交互检测降为 O(n × 邻居数)
- **保留 TS 侧** `buildMemoryContext()` 作为纯字符串化层：从 WASM 共享内存读取数值，拼装 LLM prompt
- `NPCWorldService.ts` 移除 `memory` 字段和 O(n²) `checkNPCInteractions()`，改为调用 WASM 导出函数读取数据
- WASM 导出层新增 `ecs_getRelationship`、`ecs_getRecentInteractions`、`ecs_getWitnessedEvents`、`ecs_getCommandMemory` 等导出函数

## Impact
- Affected specs: `npc-behavior-tree-v4` — 命令记忆存储迁移到 C++
- Affected code:
  - 重写 `game/ecs/components/RelationshipComponent.h` — SoA 稀疏矩阵
  - 新增 `game/ecs/components/MemoryRingComponent.h`
  - 新增 `game/npc/NPCInteractionSystem.h`
  - `game/ecs/Registry.h` — 注册新组件 + 移除旧的 RelationshipComponent
  - `tools/ecs-wasm/src/wasm_exports.cpp` — 新增导出函数 + NPCStateWasm 重排
  - `src/ecs/ECSWasmLoader.ts` — 新增读取函数
  - `src/server/llm/NPCMemory.ts` — **大幅精简**：仅保留 `buildMemoryContext()` + 字符串化，移除 Map 存储
  - `src/server/services/NPCWorldService.ts` — 移除交互检测循环，接入 WASM 导出

---

## ADDED Requirements

### Requirement: SoA 关系矩阵组件（RelationshipComponent）
系统 SHALL 在 C++ WASM 侧实现 SoA 架构的 NPC 关系矩阵，替代 TS 侧 `Map<string, Map<string, RelationshipEntry>>`。

#### Scenario: 固定容量稀疏存储
- **WHEN** 关系矩阵组件被初始化
- **THEN** 每 NPC slot 最多存储 50 个关系条目
- 每条关系：`targetSlot(32bit) + affinity(int8_t) + pending(1bit pad 7bit)` = 6 bytes
- 总计 50 × 6 = 300 bytes / NPC，远小于 JS 的 ~2KB

#### Scenario: 双向关系自动维护
- **WHEN** `setAffinity(slotA, slotB, value)` 被调用
- **THEN** 自动同时写入 A→B 和 B→A（双向矩阵分片）
- `modifyAffinity` 同时更新双方

#### Scenario: Top-K 快速查询
- **WHEN** `getTopRelationships(slot, count)` 被调用
- **THEN** 使用部分排序（partial_sort）选 Top-K，O(m log k)，m=关系数，k=请求数
- 不生成临时对象

#### Scenario: 关系亲和度查询
- **WHEN** 行为树或指令链需要查询两个 NPC 之间的关系
- **THEN** `getAffinity(slotA, slotB)` 返回 int8_t 值（-100 到 +100）
- O(1) 线性扫描最多 50 条，仅需一次内存读取

### Requirement: SoA 环形缓冲区组件（MemoryRingComponent）
系统 SHALL 在 C++ WASM 侧实现 3 种环形缓冲区，替代 TS 侧 `Map<string, Array>`。

#### Scenario: 交互环形缓冲区
- **WHEN** NPC 发生交互事件
- **THEN** 写入固定长度 20 的环形缓冲区，每条记录 12 bytes：
  - `timestamp(48bit) + otherSlot(32bit) + type(8bit) + impactScore(8bit)` 
  - type 映射：0=combat, 1=trade, 2=mentor, 3=date, 4=socialize, 5=command
- 超出容量时覆盖最旧条目

#### Scenario: 目击事件环形缓冲区
- **WHEN** NPC 目击附近重大事件
- **THEN** 写入固定长度 30 的环形缓冲区，每条 8 bytes：
  - `timestamp(48bit) + slot(32bit) + significance(4bit) + padding(4bit)`
- 事件文字描述存储在单独的全局字符串池中（key 为 eventIndex）

#### Scenario: 命令记忆环形缓冲区
- **WHEN** NPC 完成/拒绝一条指令
- **THEN** 写入固定长度 30 的环形缓冲区，每条 16 bytes：
  - `timestamp(48bit) + issuerSlot(32bit) + commandId(32bit) + result(4bit) + emotion_tag(4bit) + influence(int8_t)`
- 支持 `getConsecutiveFailures(slot, issuerSlot)` — 从最新向前计数
- 支持 `getOverachieveCount(slot, issuerSlot)` — 计数 COMPLETED + emotion_tag=overachieve

### Requirement: NPC 交互系统（NPCInteractionSystem）
系统 SHALL 利用 `SpatialIndexCache` 将 O(n²) 的 NPC 间交互检测降为 O(n × 邻居数)。

#### Scenario: 分格近邻查询替代全配对
- **WHEN** NPCInteractionSystem 每帧触发
- **THEN** 对每个 NPC，查询其所在网格及 8 邻格中的其他 NPC
- 仅对近邻 NPC 做距离判定、冷却检查、关系随机交互
- 单 NPC 最多检查邻居数（通常 < 50），而非全部 N

#### Scenario: 交互冷却
- **WHEN** 两个 NPC 发生交互
- **THEN** 系统记录冷却时间戳，交互冷却时间 25 秒内不再重复触发
- 冷却记录使用固定大小哈希表（pair key = minSlot << 16 | maxSlot 的 32bit 压缩）

#### Scenario: 交互类型判定
- **WHEN** 两个 NPC 满足交互条件（距离 < 阈值、冷却已过）
- **THEN** 根据亲和度 + 性格随机生成交互类型：
  - affinity > 40 → 35% 友好交流（双方 affinity +3）
  - affinity > 20 → 25% 资源交换（双方各得灵石）
  - affinity < -20 → 25% 冲突（双方 HP 减少）
  - affinity < -50 → 15% 决斗（大额 HP 减少，胜败双方 affinity -15）
- 交互结果写入 MemoryRingComponent 交互缓冲区

#### Scenario: 分频执行
- **WHEN** NPC 数量 > 1000
- **THEN** 交互检测每 5 帧执行一次（降频），非关键交流不逐帧判定
- HP 相关的冲突/决斗可升频至每帧

### Requirement: 全局事件字符串池
系统 SHALL 提供全局固定大小字符串池存储目击事件描述，避免 SoA 组件中存变长字符串。

#### Scenario: 事件索引替代字符串
- **WHEN** 目击事件发生时
- **THEN** 事件描述写入全局字符串池，返回 `eventIndex`
- `MemoryRingComponent` 的目击记录存储 `eventIndex` 而非字符串
- 最大池容量：8192 条事件描述，超出后覆盖最旧

### Requirement: WASM 导出层适配
系统 SHALL 新增导出函数供 TS 侧读取关系矩阵和记忆数据。

#### Scenario: 关系查询导出
- **WHEN** TS 侧需要构建 LLM 上下文
- **THEN** 调用 `ecs_getTopRelationships(slot, count, outBuffer)` 获取 Top-K 关系
- 返回结构：[其他 NPC slot, 亲和度, 最近 modifier 原因索引]

#### Scenario: 记忆查询导出
- **WHEN** TS 侧需要构建 LLM 上下文
- **THEN** 调用 `ecs_getRecentInteractions(slot, count, outBuffer)` 获取最近交互
- 调用 `ecs_getRecentCommandMemory(slot, count, outBuffer)` 获取命令记忆
- 调用 `ecs_getWitnessedEvents(slot, count, outBuffer)` 获取目击事件

#### Scenario: 按需导出而非全量
- **WHEN** TS 侧需要单个 NPC 的 LLM 上下文
- **THEN** 仅导出该 NPC 的数据（~500 bytes），不遍历全量 NPC
- 大幅减少 WASM→JS 数据传输量

### Requirement: TS 侧精简
系统 SHALL 将 `NPCMemoryStore` 从"存储+查询"层精简为"查询+字符串化"层。

#### Scenario: 移除 Map 存储
- **WHEN** 迁移完成后
- **THEN** `NPCMemoryStore` 不再维护任何 `Map` 数据结构
- 所有 `get`/`set`/`modify` 调用改为 WASM 导出函数调用
- 保留 `buildMemoryContext()` 方法，但数据源改为 WASM 共享内存

#### Scenario: NPCWorldService 交互检测迁移
- **WHEN** 迁移完成后
- **THEN** `NPCWorldService.checkNPCInteractions()` 被移除
- 交互检测由 C++ `NPCInteractionSystem` 在 WASM 帧循环中执行
- `NPCWorldService` 通过消费 WASM 侧生成的交互事件队列获取结果

---

## MODIFIED Requirements

### Requirement: RelationshipComponent（V2 版本）重写
V2 中 `RelationshipComponent` 存储 `spouseId`、`mentorId`、`disciples` 等结构化社交关系，仅含少量固定字段。SHALL 重写为 SoA 稀疏矩阵，包含每 NPC 的所有关系亲和度数据，同时保留原有 `spouseId`/`mentorId` 等特殊关系标记。

### Requirement: NPCStateWasm 结构体重排
`NPCStateWasm`（当前 140 bytes）SHALL 不新增记忆相关字段。记忆数据通过独立导出函数按需查询，不纳入每帧全量导出。

### Requirement: NPCMemoryStore.bulidMemoryContext 保留
TS 侧保留 `buildMemoryContext()` 方法，但底层数据读取从 `this.relationships` / `this.interactions` Map 改为调用 WASM 导出函数，通过 `nameResolver` 将 slot 转换为 NPC 名称。

---

## REMOVED Requirements

### Requirement: TS 侧 Map<string, Map<...>> 关系矩阵存储
**Reason**: 每 NPC ~2KB 纯存储开销，10K NPC = 20MB 仅关系矩阵，且 C++ 行为树/指令链无法访问。
**Migration**: 迁移到 C++ SoA `RelationshipComponent`。TS 侧需读取关系时调用 WASM 导出函数。

### Requirement: TS 侧 Map<string, Array> Ring Buffer 存储
**Reason**: JS Array 开销大，字符串存储冗余高。3 个 Ring Buffer 每 NPC ~25KB。
**Migration**: 迁移到 C++ `MemoryRingComponent`。TS 侧按需查询。

### Requirement: NPCWorldService O(n²) 交互检测循环
**Reason**: 无法利用 C++ `SpatialIndexCache`，JS 循环性能差。
**Migration**: 替换为 C++ `NPCInteractionSystem`，TS 侧仅消费事件。
