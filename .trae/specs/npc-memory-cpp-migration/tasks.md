# Tasks

- [x] Task 1: 重写 RelationshipComponent（C++ WASM 层）— SoA 稀疏关系矩阵
  - [x] 读取当前 `game/ecs/components/RelationshipComponent.h` 了解现有字段
  - [x] 重写为 SoA 稀疏矩阵结构：每 NPC 最多 50 个关系，RelationSlot 6 bytes
  - [x] 保留原有 `spouseSlot`、`mentorSlot` 字段（uint32_t），移除 disciples vector
  - [x] 实现 getAffinity / setAffinity / modifyAffinity / getTopRelationships
  - [x] 更新 Registry 确认字段兼容，更新 BehaviorTreeSystem 兼容性引用

- [x] Task 2: 新增 MemoryRingComponent（C++ WASM 层）— 3 种环形缓冲区
  - [x] 创建 `game/ecs/components/MemoryRingComponent.h`
  - [x] InteractionSlot / WitnessedSlot / CommandMemorySlot 紧凑编码
  - [x] 通用 RingBuffer 模板：push / getRecent / size / empty
  - [x] getConsecutiveFailures / getOverachieveCount 实现
  - [x] 注册到 Registry

- [x] Task 3: 新增 EventStringPool（C++ WASM 层）— 全局目击事件字符串池
  - [x] 创建 `game/ecs/EventStringPool.h`
  - [x] 容量 8192 条，每字符串 ≤ 128 chars
  - [x] registerEvent / getEvent / clear 实现

- [x] Task 4: 新增 NPCInteractionSystem（C++ WASM 层）— O(n·k) 交互引擎
  - [x] 创建 `game/npc/NPCInteractionSystem.h`
  - [x] 利用 SpatialIndexCache 做 9 格近邻查询
  - [x] 固定大小冷却哈希表（pair key 32bit 压缩）
  - [x] 亲和度驱动交互类型判定（友好/交换/冲突/决斗）
  - [x] 分频执行（frameCounter % 5 == 0）
  - [x] consumeInteractionEvents 事件队列导出

- [x] Task 5: 扩展 WASM 导出函数
  - [x] ecs_getAffinity / ecs_modifyAffinity（双向）
  - [x] ecs_getTopRelationships / ecs_getRecentInteractions
  - [x] ecs_getRecentCommandMemory / ecs_getWitnessedEvents
  - [x] ecs_getEventString / ecs_consumeInteractionEvents / ecs_recordWitnessedEvent
  - [x] ecs_dumpMemory / ecs_loadMemory（含关系+交互+命令+目击）

- [x] Task 6: 更新 TS ECSWasmLoader — 新增导出函数绑定
  - [x] 11 个新函数指针类型 + 11 个 null-initialized 变量
  - [x] _memBufPtr malloc(16384) 内存查询缓冲区
  - [x] RelationEntry / InteractionEntry / CommandMemoryEntryWasm 等接口
  - [x] wasmGetTopRelationships / wasmGetRecentInteractions 等 8 个高层封装

- [x] Task 7: 精简 NPCMemory.ts — 移除 Map 存储，改为 WASM 查询
  - [x] 移除 4 个 Map 存储类（385→104 行，精简 73%）
  - [x] NPCMemoryStore.buildMemoryContext 调用 WASM 导出函数
  - [x] 移除 toJSON/fromJSON

- [x] Task 8: 精简 NPCWorldService.ts — 移除交互检测循环
  - [x] 移除 checkNPCInteractions（110 行 O(n²)）
  - [x] 移除 memory/lastInteractionTime 字段
  - [x] 新增 syncInteractionEvents WASM 消费
  - [x] 移除 initRelationships

- [x] Task 9: 集成到 WorldUpdateLoop — NPCInteractionSystem 帧循环
  - [x] SpatialIndexCache::rebuild 在交互检测前执行
  - [x] NPCInteractionSystem::tickInteraction 在 NPChunkUpdateSystem 之后调用

- [x] Task 10: 持久化与恢复 — 二进制 dump/load
  - [x] ecs_dumpMemory 序列化关系矩阵 + 交互/命令/目击环形缓冲区
  - [x] ecs_loadMemory 反序列化恢复
  - [x] DataService 新增 saveNPCBlob / loadNPCBlob + npc_memory_blob 表
  - [x] ECSWasmLoader 新增 ecsDumpMemory / ecsLoadMemory 封装

# Task Dependencies
- [Task 2] depends on [Task 1]（MemoryRingComponent 引用 RelationshipComponent 的 slot 约定）
- [Task 4] depends on [Task 1], [Task 2], [Task 3]（交互系统依赖关系矩阵、环形缓冲区、事件字符串池）
- [Task 5] depends on [Task 1], [Task 2], [Task 3], [Task 4]（导出函数依赖所有底层组件）
- [Task 6] depends on [Task 5]（TS 绑定依赖 C 导出函数定义）
- [Task 7] depends on [Task 6]（NPCMemory 精简依赖 TS 绑定可用）
- [Task 8] depends on [Task 4], [Task 6]（NPCWorldService 精简依赖交互系统和 TS 绑定）
- [Task 9] depends on [Task 4]（帧循环集成依赖交互系统）
- [Task 10] depends on [Task 1], [Task 2]（持久化依赖底层数据在 C++ 侧）
