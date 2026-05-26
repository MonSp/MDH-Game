# Checklist

## SoA 关系矩阵组件
- [x] `RelationshipComponent` 每 NPC 最多存储 50 个关系条目
- [x] `RelationSlot` 结构体 6 bytes：`targetSlot(32bit) + affinity(int8_t) + _pad(7bit)`
- [x] `setAffinity(slotA, slotB, val)` 双向写入（通过 WASM export ecs_modifyAffinity 实现双向）
- [x] `modifyAffinity(slotA, slotB, delta)` 双向修改 + [-100, 100] 钳位
- [x] `getAffinity(slotA, slotB)` 返回 int8_t（-100 到 100）
- [x] `getTopRelationships(slot, count)` 使用 partial_sort Top-K
- [x] 保留原有 `spouseSlot`、`mentorSlot` 字段（uint32_t）

## 环形缓冲区组件
- [x] `MemoryRingComponent` 交互环形缓冲区 20 条，紧凑打包编码
- [x] 交互记录编码：timestamp(64bit) + otherSlot(32bit) + type(8bit) + impactScore(8bit)
- [x] 目击事件环形缓冲区 30 条，存储 eventIndex 而非字符串
- [x] 命令记忆环形缓冲区 30 条
- [x] `getConsecutiveFailures(slot, issuerSlot)` 正确计数
- [x] `getOverachieveCount(slot, issuerSlot)` 正确计数
- [x] 通用环形缓冲区模板：push 覆盖最旧、getRecent、count

## 事件字符串池
- [x] `EventStringPool` 容量 8192 条，每字符串 ≤ 128 chars
- [x] `registerEvent(desc)` 返回 uint16_t 索引
- [x] `getEvent(index)` 按索引读取
- [x] 超出容量时覆盖最旧条目

## NPC 交互系统
- [x] `NPCInteractionSystem` 使用 `SpatialIndexCache` 做 9 格近邻查询
- [x] 固定大小冷却哈希表（pair key 压缩为 32bit）
- [x] 交互类型判定：亲和度驱动（友好/交换/冲突/决斗）
- [x] 交互结果写入 MemoryRingComponent
- [x] 分频执行：frameCounter % 5 == 0（非关键交互降频）
- [x] `consumeInteractionEvents()` 导出事件队列

## WASM 导出函数
- [x] `ecs_getTopRelationships` 正确返回 Top-K 关系
- [x] `ecs_getRecentInteractions` 正确返回交互记录
- [x] `ecs_getRecentCommandMemory` 正确返回命令记忆
- [x] `ecs_getWitnessedEvents` 正确返回目击事件
- [x] `ecs_getEventString` 按索引返回事件描述字符串
- [x] `ecs_getAffinity` 返回 int8_t 亲和度
- [x] `ecs_modifyAffinity` 双向修改亲和度
- [x] `ecs_consumeInteractionEvents` 消费交互事件队列
- [x] `ecs_recordWitnessedEvent` 记录全局事件
- [x] 导出函数按需查询单 NPC，非全量导出

## TS 侧绑定
- [x] `ECSWasmLoader` 新增所有导出函数的函数指针绑定
- [x] `wasmGetTopRelationships(slot, count)` 返回 TypeScript 可读结构
- [x] `wasmGetRecentInteractions(slot, count)` 返回 TypeScript 可读结构
- [x] `wasmGetCommandMemory(slot, count)` 返回 TypeScript 可读结构
- [x] `wasmGetWitnessedEvents(slot, count)` 返回 TypeScript 可读结构
- [x] `wasmConsumeInteractionEvents()` 返回交互事件列表
- [x] `wasmGetAffinity(slotA, slotB)` 返回 number
- [x] `wasmModifyAffinity(slotA, slotB, delta)` 双向修改亲和度

## NPCMemory.ts 精简
- [x] 移除 `NPCRelationshipMatrix` 类（Map 存储）
- [x] 移除 `NPCInteractionRingBuffer` 类
- [x] 移除 `NPCWitnessedEvents` 类
- [x] 移除 `CommandMemoryRingBuffer` 类
- [x] `NPCMemoryStore.buildMemoryContext()` 调用 WASM 导出函数查询数据
- [x] `buildMemoryContext()` 输出格式与迁移前一致
- [x] 移除 `toJSON()`/`fromJSON()`

## NPCWorldService.ts 精简
- [x] 移除 `checkNPCInteractions()` 方法
- [x] 移除 `lastInteractionTime` 冷却 Map
- [x] 新增 `syncInteractionEvents()` 调用 WASM 消费事件
- [x] `planForNPC()` 正常使用新的 `buildMemoryContext`

## 帧循环集成
- [x] `NPCInteractionSystem::tickInteraction` 在 `WorldUpdateLoop::updateOnce` 中被调用
- [x] `SpatialIndexCache::rebuild` 在交互检测前执行
- [x] 交互系统在 `NPChunkUpdateSystem` 之后执行（行为树已完成决策）

## 持久化
- [x] `ecs_dumpMemory` 正确序列化关系矩阵 + 交互/命令/目击环形缓冲区为二进制 blob
- [x] `ecs_loadMemory` 正确从二进制 blob 恢复（含关系/交互/命令/目击）
- [x] TS 侧 DataService 调用 `ecsDumpMemory` → 写入 SQLite npc_memory_blob 表
- [x] 服务器重启后 DataService → `ecsLoadMemory` 恢复
