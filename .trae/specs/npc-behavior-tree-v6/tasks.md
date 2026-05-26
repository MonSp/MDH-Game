# Tasks

## Task 1: 行为惯性机制实现 ✅
为 NPC 行为切换引入迟滞阈值，消除临界值附近的"行为抖动"。
- [x] **1.1** 在 `BehaviorComponent.h` 中新增字段：`activityStartFrame`（行为起始帧）、`hysteresisFrames`（惯性帧数）、`hysteresisLocked`（是否锁定）、`lastInterruptSource`（打断来源）
- [x] **1.2** 在 `BehaviorTreeSystem.h` 中实现惯性检查函数 `shouldInterrupt()`
- [x] **1.3** 为 `evaluateSurvival()` 加入迟滞阈值：进入立即/退出需HP稳定恢复+N帧
- [x] **1.4** 确保 `BehaviorTreeSystem::evaluate()` 主循环在所有决策点调用 `shouldInterrupt()` 检查
- [x] **1.5** 编写 3 个 C++ 单元测试 ✅ (BehaviorInertia.test.cpp)

## Task 2: 关系自然衰减机制 ✅
为 NPC 人际关系引入随时间衰减机制，速率由性格决定。
- [x] **2.1** 在 `RelationshipComponent.h` 中新增字段：`decayRate`、`lastInteractionFrame`
- [x] **2.2** 实现衰减速率计算函数 `computeDecayRate()`：忠诚≥70→衰减慢，贪婪≥70→衰减快
- [x] **2.3** 在 `NPCWorldService.ts` 的 tick 循环中调用衰减逻辑
- [x] **2.4** 衰减边界控制：正亲密度≥0，负亲密度自然回升，特殊关系衰减率50%
- [x] **2.5** 在社交执行函数中更新 `lastInteractionFrame` 以重置衰减计时器
- [x] **2.6** 编写 4 个测试 ✅ (RelationshipDecay.test.cpp)

## Task 3: 分层记忆系统 ✅
将 NPC 记忆从单层环形缓冲改造为近期/中期/长期三层。
- [x] **3.1** 定义三层数据结构：近期（20条）、中期（100条摘要）、长期（50条里程碑）
- [x] **3.2** 实现近期→中期压缩算法：按targetSlot聚合
- [x] **3.3** 定义 `MilestoneType` 枚举（突破境界、道侣结合等6种）
- [x] **3.4** 在各行为执行函数中标记里程碑事件入口点
- [x] **3.5** 改造 `MemoryRingComponent.h` 为三层结构，保持packed布局
- [x] **3.6** 在 `NPCMemory.ts` 中适配三层注入规则
- [x] **3.7** 编写 10 个测试 ✅ (MemoryLayered.test.cpp)

## Task 4: LLM 前线摘要反馈 ✅
在 LLM 规划 prompt 中注入底层执行摘要，实现自下而上的信息反馈。
- [x] **4.1** 定义 `FrontlineMetrics` 数据结构（伤亡率、资源消耗率、任务完成率、异常事件）
- [x] **4.2** 在 `NPCWorldService.tick()` 中执行 `collectFrontlineMetrics()`
- [x] **4.3** 实现 `buildFrontlineSummary()` 生成格式化摘要
- [x] **4.4** 在 `LLMPlanningService`/`LLMGatewayService` 中注入摘要到 prompt
- [x] **4.5** T1 层的 `revision_flags` 标记传递到 T0 层
- [x] **4.6** 编写 8 个 TS 测试 ✅ (FrontlineSummary.test.ts)

## Task 5: 瞬时情绪系统 ✅
引入情绪层作为横向打断机制，优先级介于生存层与指令层之间。
- [x] **5.1** 在 `SocialComponent.h` 中定义情绪字段：anger/fear/joy（0-100）
- [x] **5.2** 定义情绪触发事件映射（辱骂+20愤怒、受击+30恐惧+15愤怒等）
- [x] **5.3** 实现情绪衰减逻辑：每帧 *= 0.995
- [x] **5.4** 实现情绪→行为打断映射：愤怒→决斗、恐惧→逃跑、喜悦→Gossip
- [x] **5.5** 性格调节：谨慎→高阈值，忠诚→慢累积
- [x] **5.6** 在 `BehaviorTreeSystem.evaluate()` 中插入情绪评估层
- [x] **5.7** 生存层始终优先于情绪层（HP<15%时覆盖）
- [x] **5.8** 编写 11 个测试 ✅ (EmotionSystem.test.cpp)

## Task 6: 行为反思循环 ✅
让 NPC 根据历史行为结果自我调整行为倾向。
- [x] **6.1** 在 `BehaviorComponent.h` 中新增 `ReflectionData` 结构
- [x] **6.2** 在生产类执行函数中记录产出结果
- [x] **6.3** 在社交类执行函数中记录社交结果
- [x] **6.4** 在探索类执行函数中记录探索结果
- [x] **6.5** 实现 `applyReflection()` 函数：连续3次低产出→权重×0.5~0.7
- [x] **6.6** 衰减因子恢复逻辑：滚动窗口自然恢复至 1.0
- [x] **6.7** 在 `chooseByRole()` 中调用 `applyReflection()` 调整行为选取概率
- [x] **6.8** 编写 4 个测试 ✅ (BehaviorReflection.test.cpp)

## Task 7: 信息传播系统（八卦/流言） ✅
实现 NPC 之间通过社交互动传播目击事件和流言。
- [x] **7.1** 定义 `RumorPacket` 数据结构（contentIntegrity/hopCount/sensitivity）
- [x] **7.2** 实现传播判定：caution>60 不传播，significance<2 跳过
- [x] **7.3** 实现信息扭曲：hopCount递增，integrity按sensitivity衰减
- [x] **7.4** 在 `BehaviorTree_Social.h` 的 `exec_gossip` 中集成传播逻辑
- [x] **7.5** 流言到达当事人触发关系变化（caution>70私下摆平，否则公开暴怒）
- [x] **7.6** 性能保护：每帧最多 50 次传播，由 `NPCWorldService` 控制
- [x] **7.7** 编写 4 个测试 ✅ (RumorSpread.test.cpp)
