# Tasks

- [x] Task 1: LLM叙事状态机 — P1
  - [x] 1.1 在 `LLMPlanningService.ts` 中定义 `NarrativeState` 接口和枚举：定义叙事状态维度（战况、资源、士气、领地），每个维度含多个严重度等级的描述文本
  - [x] 1.2 实现 `deriveNarrativeState(rawData: FrontlineSummary): NarrativeState[]` 函数：将原始统计数据映射为叙事状态标签
  - [x] 1.3 实现 `composeNarrativeDigest(states: NarrativeState[]): string` 函数：按严重度排序合并叙事状态为摘要文本（最多3条）
  - [x] 1.4 修改 LLM prompt 注入逻辑：在现有前线摘要之后、LLM prompt 之前追加叙事摘要段落，保留原始数据引用
  - [x] 1.5 验证：测试不同前线数据组合下生成的叙事摘要文本的合理性和可读性

- [x] Task 2: 行为标签体系 — P1
  - [x] 2.1 在C++侧定义行为标签枚举：`ActivityTag`（职业系/资源系/性格系），每维 ≤32 个标签
  - [x] 2.2 为全部50种行为编写标签表：`kActivityTags[50]` 静态数组，每种行为拥有其标签组合
  - [x] 2.3 实现标签相似度计算函数：`computeTagSimilarity(currentActivity, candidateActivity, personality, factionHeritage)` 返回0-1得分
  - [x] 2.4 重构微规划逻辑：用标签相似度匹配替换 `kMicroPlanMappings[]` 硬编码映射表，保留旧映射表作为兼容性回退
  - [x] 2.5 实现社会角色粘性：在相似度计算中引入 `FactionRoleStickiness` 权重调节
    - [x] 2.5.1 定义家族职业系标签继承规则（如王铁匠家族后代自动获得 `[铁匠系]` 标签偏置）
    - [x] 2.5.2 实现性格对粘性的调节：高野心放宽，高忠诚加强
    - [x] 2.5.3 实现粘性衰减：同类标签行为全部失败后粘性系数逐步降低
  - [x] 2.6 验证：测试微规划输出是否符合标签约束预期，确认旧硬编码映射表的输出被新系统覆盖

- [x] Task 3: 意义构建日志 — P2
  - [x] 3.1 在C++侧定义 `DecisionLogEntry` 结构体：npcId、frame、triggerLayer、oldActivity、newActivity、weightDelta、reasonEnum、narrativeSnippet
  - [x] 3.2 在 `BehaviorComponent.h` 中添加环形缓冲区：`DecisionLogEntry logBuffer[500]`，带读写索引
  - [x] 3.3 在评估链关键节点埋点：
    - [x] 3.3.1 行为切换点（`evaluate()` 各层返回true时）
    - [x] 3.3.2 反思惩罚触发点（`recordResult` 中权重变化时）
    - [x] 3.3.3 遗忘恢复触发点
    - [x] 3.3.4 微规划触发点（`requestMicroPlan` 时）
    - [x] 3.3.5 情绪打断点（情绪层触发时）
  - [x] 3.4 实现日志叙述生成：`generateNarrativeSnippet(entry) → string`，根据决策类型和参数生成第一人称中文叙事文本
  - [x] 3.5 在TS侧暴露查询接口：`getDecisionLog(npcId: number, count?: number): DecisionLogEntry[]`
  - [x] 3.6 添加编译时开关：`#ifdef NPC_DECISION_LOG_ENABLED`，发布版本可裁剪全部日志代码
  - [x] 3.7 验证：在开发模式测试日志输出完整性，确认环形缓冲无越界，发布模式编译无日志代码残留

# Task Dependencies
- Task 1（叙事状态机）、Task 2（行为标签体系）、Task 3（意义构建日志）相互独立，可并行执行
- Task 2.4 依赖 2.1、2.2、2.3 完成
- Task 2.5 依赖 2.4 完成（粘性在标签匹配框架上附加）
- Task 3.3 可随各埋点位置独立并行开发
- Task 3.5 依赖 3.1、3.2、3.3 完成
