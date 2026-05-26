# Tasks

- [x] Task 1: 情绪衰减时间驱动改造
  - [x] 1.1 在 `SocialComponent.h` 中将 `decayPerFrame` 替换为基于 deltaTime 的时间驱动衰减
  - [x] 1.2 在 `BehaviorTreeSystem.h` 的执行阶段传入 `deltaTime`，使用 `pow(0.995, deltaTime*60)` 替代逐帧衰减
  - [x] 1.3 NPC 配置文件中的情绪参数无需显式配置文件（参数在代码中，已同步更新）
  - [x] 1.4 验证：g++ 语法检查通过，逻辑上 30fps 和 60fps 衰减量一致

- [x] Task 2: 情绪冷却溢出保护
  - [x] 2.1 将冷却记录容量从 8 提升到 16
  - [x] 2.2 冷却查找已使用 `(targetSlot, emotionType, triggerBehavior)` 联合键
  - [x] 2.3 满容量时：先检查过期记录 → 未满则追加 → 全活跃则拒绝写入 + fprintf WARNING
  - [x] 2.4 验证：g++ 语法检查通过

- [x] Task 3: 群体情绪场最小人数保护
  - [x] 3.1 在 `BehaviorTree_Social.h` 的闲聊传染逻辑中增加 `highFearCount >= GROUP_EMOTION_ABSOLUTE_MIN` 等绝对人数检查
  - [x] 3.2 传染逻辑内联在 `tryEmotionalContagion()` 中，使用 `SocialComponent` 常量
  - [x] 3.3 验证：g++ 语法检查通过，逻辑上 3人中1人恐惧不触发

- [x] Task 4: 高情绪阈值常量定义
  - [x] 4.1 在 `SocialComponent.h` 中定义 `HIGH_FEAR_THRESHOLD=60`、`HIGH_ANGER_THRESHOLD=60`、`HIGH_JOY_THRESHOLD=50` 等常量
  - [x] 4.2 `isTerrified()` 和 `tryEmotionalContagion()` 中的硬编码阈值已替换为常量引用

- [x] Task 5: 行为执行前环境检查
  - [x] 5.1 在 `ExecuteDescriptor.h` 中为 `ExecuteDescriptor` 添加 `isExecutable` 函数指针
  - [x] 5.2 为 5 种生产行为（Mine/Farm/Fish/Lumber/Gather）实现环境检查
  - [x] 5.3 为 3 种探索行为（Explore/TreasureHunt/MapExplore）实现环境检查
  - [x] 5.4 在 `BehaviorTreeSystem.h` 的 `execute()` 中插入 `IsExecutable()` 调用，不可执行时降级为 Rest
  - [x] 5.5 验证：g++ 语法检查通过

- [x] Task 6: 流言队列 TTL 和容量保护
  - [x] 6.1 在 `RumorPacket` 中增加 `bornFrame` 字段，`MAX_RUMOR_TTL=900`，`MAX_RUMOR_QUEUE=500`
  - [x] 6.2 `cleanExpiredRumors()` 清理过期流言（bornFrame + TTL < currentFrame）
  - [x] 6.3 队列满时 `evictLowestSeverityRumor()` 按严重度淘汰最低的
  - [x] 6.4 验证：g++ 语法检查通过

- [x] Task 7: 记忆凝固规则
  - [x] 7.1 `tryAutoCompact()` 在 interactions 满 20 条时自动压缩
  - [x] 7.2 `upgradeMidTermToLongTerm()` 情感评分绝对值 ≥ 80 且距今 ≥ 1000 帧时升级
  - [x] 7.3 `compressToMidTerm()` 末尾自动调用 `upgradeMidTermToLongTerm()`
  - [x] 7.4 验证：g++ 语法检查通过

- [x] Task 8: 行为元标签体系
  - [x] 8.1 定义 `BehaviorTag` 枚举（21 种标签，uint32_t 底层类型）
  - [x] 8.2 `getActivityTags()` 为 31 种主要行为标注元标签
  - [x] 8.3 `jaccardSimilarity()` 实现位运算版 Jaccard 相似系数
  - [x] 8.4 `tryMicroPlan()` 替换硬编码映射为标签相似度匹配

- [x] Task 9: 文档架构正名
  - [x] 9.1 在 `NPC行为树系统介绍.md` 开头增加架构正名说明段落
  - [x] 9.2 V6→V6.3 迭代总览表和数字一览表已更新

# Task Dependencies
- Task 2 依赖 Task 1（情绪模型参数变更影响冷却记录格式）
- Task 3 依赖 Task 4（群体情绪阈值定义后才能实现最小人数保护）
- Task 5 依赖 Task 8（环境检查的部分资源类型需要元标签体系支持）
- Task 6 独立可并行
- Task 7 独立可并行
- Task 9 独立可并行
