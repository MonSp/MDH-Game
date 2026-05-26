# Tasks

- [x] Task 1: 微规划行为重置（P0 修复）
  - [x] 1.1 在 `ReflectionData::recordResult()` 中添加：当 `act == microPlanActivity` 且 `score > 0` 时，或 `microPlanActivity` 的最近 3 次得分均 < 0 时，重置 `microPlanTriggered = 0`、`microPlanActivity = Idle`
  - [x] 1.2 在 `BehaviorTreeSystem::tryMicroPlan()` 中，当 `microPlanTriggered == 1` 且当前 `currentActivity != microPlanActivity`（说明微规划行为已被打断），重置触发标记
  - [x] 1.3 在 `BehaviorTreeSystem::evaluateDaily()` 中，如果行为切换为非微规划行为，调用重置

- [x] Task 2: chooseByRole 接入基线权重（P0 修复）
  - [x] 2.1 在 `chooseByRole` 中添加 `IdentityComponent*` 参数用于查询 `RoleBaselineWeights::getRoleBaselineWeight`
  - [x] 2.2 每个 return 语句前，将概率乘以对应的基线权重值
  - [x] 2.3 fallback 行为不乘以基线权重（保证至少返回一个有效行为）
  - [x] 2.4 更新 `evaluateDaily` 中调用 `chooseByRole` 处传入 `ctx.identity`

- [x] Task 3: LLM Plan 层移入 kEvaluateLayers（P1 重构）
  - [x] 3.1 将 `evaluate()` 顶部的 LLM Plan 硬编码拦截逻辑（L130-L158）移入 `evaluateLLMPlan`
  - [x] 3.2 `evaluateLLMPlan` 中检查 `llmPlan->tier != T3 && status == ACTIVE`，为真时执行 plan action 并处理 HP 打断
  - [x] 3.3 将 `evaluateLLMPlan` 插入 `kEvaluateLayers[]` 数组，位于 `evaluateCommand` 之后、`evaluateSocial` 之前（第 4 层）
  - [x] 3.4 移除 `evaluate()` 顶部的 LLM Plan 特殊路径代码

- [x] Task 4: 废弃 getActivityTags 统一三维标签（P1 清理）
  - [x] 4.1 修改 `jaccardSimilarity` 函数：内部改用 `getActivityTagBundle` + `jaccardUint16`，对 career/resource/personality 三维分别计算 Jaccard，取加权平均 (0.5/0.3/0.2)
  - [x] 4.2 `getActivityTags` 函数体改为委托 `getActivityTagBundle` 生成（从 BehaviorTag 到旧 uint32_t 的映射）
  - [x] 4.3 在 `BehaviorComponent.h` 中注释标记 `getActivityTags` 为 deprecated
  - [x] 4.4 `computeTagSimilarity` 中的 `jaccardSimilarity` 调用替换为对 `jaccardUint16` 的直接三维调用

- [x] Task 5: Daily 层经济信号感知（P1 新增）
  - [x] 5.1 在 `EvaluateContext` 中新增 `float economicSignalBias = 1.0f` 字段
  - [x] 5.2 在 `evaluateDaily` 调用 `chooseByRole` 前，查询家族经济状态并计算信号因子
  - [x] 5.3 在 `chooseByRole` 中将信号因子乘以行为选择概率（铁矿紧缺 → Mine ×1.5）

- [x] Task 6: RefuseCommand 优先级修正（P2 修复）
  - [x] 6.1 在 `getPriorityLevel` 的 switch 中，将 `RefuseCommand` 从 `return 2` 改为 `return 6`（或移除 case 让其 fallthrough 到 default）

- [x] Task 7: tryMicroPlan 改用 kExecuteTable（P2 优化）
  - [x] 7.1 将 `allActivities[]` 硬编码数组替换为遍历 `kExecuteTable`
  - [x] 7.2 从 `kExecuteTable[i].activity` 取值
  - [x] 7.3 过滤掉不需要的生存行为（Flee/Heal/Defend/Incapacitated/Dead）和 Idle

- [x] Task 8: evaluateDaily 优化 chooseByRole 调用（P2 优化）
  - [x] 8.1 将两次 `chooseByRole` 调用合并为一次，先用 `behavior` 参数获取 chosen + weight
  - [x] 8.2 在 weight < 0.7f 需要换行为时，使用标签相似度查找替代行为而非重新随机
