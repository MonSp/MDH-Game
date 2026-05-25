# Checklist

## 数据模型
- [x] BehaviorTreeComponent 包含 tmpl 指针、currentNode、updatePhase、evalInterval 字段
- [x] FlatBTNode 包含 type/next/fail/actionId 四字段，6 bytes
- [x] BehaviorTreeTemplate 为 6 种预设实例（Leader/Guard/Disciple/Worker/Combat/Command）
- [x] BlackboardCache 包含 7 位域 + invalidate/check/set 方法，1 byte
- [x] SpatialIndexCache 提供 rebuild() 和 queryNeighbors() 方法
- [x] Registry.h SoA 数组包含 BehaviorTreeComponent 和 BlackboardCache

## 分频评估
- [x] Cultivate/Rest/Sleep/Meditate 每 30 帧评估一次
- [x] Mine/Farm/Fish/Lumber/Gather 每 10 帧评估一次
- [x] Patrol/Walk/VisitFriend/Date/Explore 每 5 帧评估一次
- [x] Duel/Hunt/Ambush/Flee/Heal/Command 每帧评估
- [x] updatePhase 计数器自增，% evalInterval 取模驱动

## 模板评估
- [x] BTEvaluator::evaluate 正确遍历 FlatBTNode 数组
- [x] Condition 节点通过 BlackboardCache 位域判断
- [x] Action 节点正确设置 BehaviorComponent.currentActivity
- [x] 6 种模板语义等价于原 6 层优先级
- [x] 祖传 NPC（tmpl==null）回退到旧 evaluate 逻辑

## 决策/执行分离
- [x] 评估阶段产出 ActionRequest{slot, actionType, prevActivity}
- [x] Worker 各自产出独立的 localRequests 分桶数组
- [x] 批量执行阶段按 activity 类型分桶处理
- [x] 批量执行不产生堆分配（固定大小数组 + slot 索引）
- [x] Combat/Command 强制每帧 evaluate，实时响应

## 简单活动状态机
- [x] Cultivate/Rest/Sleep/Walk 有 phase-driven 状态机
- [x] Mine/Farm/Fish/Lumber 统一为简单投入-产出模型
- [x] Eat 有特殊处理（恢复饥饿值后切 Rest）
- [x] 批量执行中简单活动走 batchExecuteSimple 路径

## 黑板缓存
- [x] Condition 评估结果写入 BlackboardCache 位域
- [x] dirty=0 时跳过条件评估直接执行 action
- [x] 受伤、收指令、生理阈值触发 dirty=1
- [x] 非 evaluate 帧不读写黑板（黑板仅在 evaluate 中使用）

## 空间索引
- [x] rebuild() 在每帧开始时调用，网格大小 100m
- [x] queryNeighbors 遍历 9 邻格链表
- [x] 10K cells 固定数组，无动态内存分配
- [x] 返回 uint32_t 数组（slot 索引）

## 集成适配
- [x] NPCCreationSystem 初始化 tmpl 指针和黑板缓存
- [x] WASM NPCStateWasm 保持 128 字节不变
- [x] NPCActivity 映射表无变更

## 编译验证
- [x] emcc WASM 编译 0 error
- [x] TypeScript 类型检查通过
- [x] g++ 原生编译语法检查通过（-D__EMSCRIPTEN__）
- [x] WASM 产物大小增幅 < 15%（vs V2 199KB → 211KB, +6%）
