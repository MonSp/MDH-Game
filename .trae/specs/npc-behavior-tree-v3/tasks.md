# Tasks

## Phase 1: 数据模型新增
- [x] Task 1: 新增 BehaviorTreeComponent
  - 文件: `game/ecs/components/BehaviorTreeComponent.h`
  - 字段: `const BehaviorTreeTemplate* tmpl`, `uint16_t currentNode`, `uint16_t updatePhase`, `uint16_t evalInterval`
  - 方法: `shouldEvaluate(uint16_t frameCounter)` — 判断当前帧是否需要跑 evaluate
  - 默认构造函数: tmpl=空, currentNode=0, updatePhase=0, evalInterval=30

- [x] Task 2: 新增 BehaviorTreeTemplate + FlatBTNode
  - 文件: `game/bt/BehaviorTreeTemplate.h`
  - `struct FlatBTNode { uint8_t type; uint16_t next; uint16_t fail; uint16_t actionId; }` (6 bytes)
  - `struct BehaviorTreeTemplate { const char* name; std::array<FlatBTNode,N> nodes; uint16_t rootIndex; }`
  - 提供 6 种预定义模板实例：
    - `BT_TEMPLATE_LEADER` — FamilyHead/Elder 的优先级树
    - `BT_TEMPLATE_GUARD` — LawEnforcementElder 的巡逻树
    - `BT_TEMPLATE_DISCIPLE` — CoreDisciple/InnerDisciple 的修炼树
    - `BT_TEMPLATE_WORKER` — BranchDisciple 的生产树
    - `BT_TEMPLATE_COMBAT` — 战斗中切入的简化树
    - `BT_TEMPLATE_COMMAND` — 指令执行中的简化树

- [x] Task 3: 新增 BlackboardCache
  - 文件: `game/bt/BlackboardCache.h`
  - 位域结构: `struct BlackboardCache { uint8_t flags; }` (1 byte)，bits: hasThreatNearby, isHungry, isExhausted, hasSocialTarget, hasCommand, shouldCultivate, dirty
  - helper: `bool check(uint8_t bit) const`, `void set(uint8_t bit)`, `void invalidate()`
  - 注册为 SoA 数组（与 BehaviorTreeComponent 并列）

- [x] Task 4: 新增 SpatialIndexCache
  - 文件: `game/spatial/SpatialIndexCache.h`
  - 类: `SpatialIndexCache` — 单例
  - `void rebuild()` — 遍历 Position SoA 填网格
  - `std::vector<uint32_t> queryNeighbors(float x, float y, float radius)` — 返回候选 slot 索引
  - 网格: `std::array<std::vector<uint32_t>, 10000>` cells (100×100)
  - 保留 `gridSize` 可配置（默认 100m per cell）

- [x] Task 5: 更新 Registry.h — 注册新组件
  - 新增 SoA 数组: `BehaviorTreeComponent bt_`, `BlackboardCache bb_`
  - 更新 `getArray<T>()` 模板特化
  - 更新 `createEntity()` 的默认初始化
  - 更新 `clear()` 清空列表

## Phase 2: 模板化行为树评估
- [x] Task 6: 新增 BTEvaluator — 模板解释器
  - 文件: `game/bt/BTEvaluator.h`
  - `static bool evaluate(ECS::EntityId id, const BehaviorTreeTemplate& tmpl, uint16_t startNode, uint64_t currentTime)`
  - 循环/栈模拟节点遍历
  - 返回 bool: 是否成功选择一个活动

- [x] Task 7: 在 BehaviorTreeSystem 中集成模板派发
  - 模板路径优先，LLM 计划次之，祖传 fallback 保底

## Phase 3: 分频 + 决策/执行分离
- [x] Task 8: 重构 NPChunkUpdateSystem — 分频逻辑
  - slot-range 并行分块评估
  - 每帧 social tick 所有 NPC
  - PhaseCounter 驱动 evaluate 频率

- [x] Task 9: 实现 ActionRequest 分桶 + 批量 execute
  - 每 worker 独立 localRequests，按 activity 预分桶
  - 主线程批量执行

- [x] Task 10: 简单活动降级为状态机
  - batchExecuteSimple 处理 9 种简单活动
  - SIMPLE_ACTIVITY_MASK 检测

- [x] Task 11: 条件黑板刷新 + 脏标志
  - BTEvaluator 中 dirty check
  - Flee/Heal 触发 invalidate
  - 饥饿/疲劳触发 bb.set

## Phase 4: 空间索引
- [x] Task 12: 实现 SpatialIndexCache
  - 每帧 rebuild 10000 cell 网格
  - queryNeighbors 遍历 9 邻格

## Phase 5: 适配
- [x] Task 13: 适配 NPCCreationSystem
  - createNPC 分配 BehaviorTreeTemplate
  - BlackboardCache 默认 dirty=1

- [x] Task 14: 适配 WASM 导出 + TypeScript
  - NPCStateWasm 保持 128 字节不变
  - ECSWasmLoader.ts 无需修改

- [x] Task 15: 编译验证
  - emcc WASM 编译 ✅ 0 errors
  - TypeScript ✅ 0 errors
  - g++ 原生 ✅ 0 errors
  - 产物大小: 211KB (+6% vs V2 199KB, < 15%)
