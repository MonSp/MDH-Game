# Tasks

- [x] Task 1: LLM 规划不遮蔽生存本能 — P0
  - [x] 1.1 在 `BehaviorTreeSystem.h` 的 `evaluate()` 中重构 LLM 规划分支：在 `translateActionType` 后、`changeActivity` 前插入 `evaluateSurvival` 检查点
  - [x] 1.2 若生存层触发打断，将 `llmPlan->status` 设置为 `INTERRUPTED`，并标记异常事件
  - [x] 1.3 验证：测试 NPC 在执行 LLM 规划途中 HP 降至 30% 时切换到 Flee

- [x] Task 2: 交互记忆时间戳补全 — P0
  - [x] 2.1 在所有写入 `InteractionSlot` 的代码路径中赋值 `timestamp = currentFrame`（`BehaviorTree_Social.h` 等文件中的社交行为执行函数）
  - [x] 2.2 确保 `compressToMidTerm()` 读取的 `firstTime` / `lastTime` 来自真实的交互时间戳
  - [x] 2.3 验证：`upgradeMidTermToLongTerm()` 的 `(currentFrame - firstTime) >= 1000` 条件在 1000 帧以内不触发

- [x] Task 3: 情绪冷却 LRU 淘汰 — P0
  - [x] 3.1 修改 `SocialComponent.h` 的 `addCooldown()`：满容量且全活跃时，遍历找到 `cooldownUntilFrame` 最小的记录，覆写之
  - [x] 3.2 日志等级从 WARNING 降至 DEBUG（LRU 淘汰是预期行为，非异常）
  - [x] 3.3 验证：16 槽全满时 17 条冷却请求的全部生效（最旧记录被替换）

- [x] Task 4: C++/TS 关系衰减参数统一，TS 端收敛 — P1
  - [x] 4.1 将 `RelationshipComponent.h` 中 `computeDecayRate` 的 loyalty 修正改为 `-2/+1`（与 TS 端对齐）
  - [x] 4.2 修改 `NPCWorldService.ts`：移除 `applyRelationshipDecay()` 调用，仅保留 LLM 规划编排和 `requestMicroPlan` 钩子
  - [x] 4.3 验证：C++ 和 TS 两侧的衰减速率参数一致

- [x] Task 5: 评估层接口化重构 — P1
  - [x] 5.1 在 `BehaviorTreeSystem.h` 中定义 `EvaluateContext` 结构体，聚合所有 ECS 组件指针引用和 `currentTime`
  - [x] 5.2 定义 `EvaluateFn` 函数指针类型：`bool (*)(EvaluateContext&, BehaviorComponent*)`
  - [x] 5.3 将 7 层评估函数（`evaluateSurvival` ~ `evaluateDaily`）统一签名为 `EvaluateFn`
  - [x] 5.4 用 `kEvaluateLayers[]` 数组 + 循环调用替代现有的顺序 if-return 链
  - [x] 5.5 验证：g++ 编译通过，NPC 行为决策结果与重构前一致

- [x] Task 6: 流言传播/情绪传染空间索引接入 — P1
  - [x] 6.1 检查或实现空间网格索引（如 `SpatialIndex` 按 200 单位网格分桶）
  - [x] 6.2 修改 `exec_gossip()` 的听众选择：改为从空间索引的邻居桶中采样
  - [x] 6.3 修改 `tryEmotionalContagion()` 的近邻遍历：替换全实体扫描为邻居桶遍历
  - [x] 6.4 空间索引不可用时回退为全实体扫描（写 fallback 路径 + 日志）
  - [x] 6.5 验证：1000 NPC 下 Gossip 听众采样开销从 O(n) 降为 O(k)，k ≤ 邻居桶内 NPC 数

- [x] Task 7: 文档迭代总览表更新
  - [x] 7.1 在 `NPC行为树系统介绍.md` 的迭代总览表新增 V7 行
  - [x] 7.2 更新数字一览表中的 V6.3 列重命名为 V7，补充本版数据变化
  - [x] 7.3 更新文档底部的 Spec 链接指向 `npc-behavior-system-v7`

# Task Dependencies
- Task 1、Task 2、Task 3 相互独立，可并行
- Task 4 独立，可与其他任务并行
- Task 5 依赖 Task 1（评估层重构需包含 LLM+生存联动的代码路径）
- Task 6 依赖 Task 4（空间索引修改后 C++ 侧需确认性能模型）
- Task 7 依赖 Task 1-6 全部完成（文档需反映最终成果）
