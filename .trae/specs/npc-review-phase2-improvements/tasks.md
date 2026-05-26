# Tasks

- [x] Task 1: 角色基线权重系统 — P0
  - [x] 1.1 在 `BehaviorComponent.h` 中定义 `RoleBaselineWeights` 结构体或静态数组：为5种角色模板（FamilyHead/Elder/CoreDisciple/InnerDisciple/BranchDisciple）定义各自的50项行为基线权重（范围0.5~1.6）
  - [x] 1.2 在 `ReflectionData` 中新增 `getBaselineWeight(NPCActivity, NPCRole)` 查询方法
  - [x] 1.3 修改 `getWeightWithDecay()` 的恢复目标：从固定 1.0 改为向 baselineWeight 回归——最终权重 = baselineWeight × reflectionMultiplier × recoveryFactor
  - [x] 1.4 修改 `recordResult()` 的惩罚逻辑：反思惩罚最多将 finalWeight 压低到 baselineWeight × 0.5，避免绝对0.5的硬编码下限
  - [x] 1.5 实现基线权重动态调节：NPC因微规划/社交求助成功切换到新职业系行为且连续成功3次后，新行为baselineWeight临时提升至1.2（500帧），原职业基线不受影响
  - [x] 1.6 验证：矿工NPC连续采矿失败5次后，采矿权重不会低于其基线×0.5；500帧后自然向基线回归

- [x] Task 2: 玩家可读性暴露 — P1
  - [x] 2.1 在 `BehaviorComponent.h` 中新增 `getReadableDecisionSummary()` 方法：读取最近一条决策日志，生成面向玩家的叙事摘要字符串（如"（矿工·沮丧中）最近连续挖不到好矿，正打算改行种田"）
  - [x] 2.2 扩展 `DecisionLogService.ts`：新增 `getPlayerFacingSummary(npcId: number): string` 方法，将决策日志中的 DecisionReason 映射为玩家可读的中文语句
  - [x] 2.3 在NPC交互对话中注入决策原因：修改 NPC 对话生成逻辑（如有）或新增 `buildBehaviorAwareDialogue(npcId, playerId)` 函数，根据最近决策日志将NPC当前心理状态融入对话文本
  - [x] 2.4 实现透露概率规则：高谨慎NPC 30%概率透露、低谨慎80%；只透露24游戏小时内且与交互对象相关的决策原因
  - [x] 2.5 验证：选中一个因阵营偏见拒绝交易的NPC，其详细信息面板能展示一句话摘要；与沮丧中的矿工对话能看到"最近采矿手气不好"的文本

- [x] Task 3: LLM意图式规划 — P1
  - [x] 3.1 定义 `LLMIntent` 类型（在 `shared/types/LLMPlanning.ts` 或新文件中）：包含 goal（string）、metric（string）、target_value（number）、deadline_frames（number）、validity_condition（string）
  - [x] 3.2 修改 `LLMPlanningService.ts` 的 `buildPlanPromptWithFrontline()`：重构prompt要求LLM产出意图+建议任务双结构，保留旧格式兼容解析
  - [x] 3.3 实现 `LLMIntentValidator`（在 `LLMPlanningService.ts` 中）：每30帧检查意图的 validity_condition 和 metric 进度——条件失效→中断所有下游任务、metric达标→标记完成、超时→触发重新规划
  - [x] 3.4 实现 `RuleBasedDecomposer`（在 `BehaviorTreeSystem.h` 或新模块）：T1/T2角色根据意图的metric和target_value，使用纯规则将意图拆解为具体CommandSlot——从标签库匹配行为→分配子任务→写入RoleCommandComponent
  - [x] 3.5 修改 `LLMPlanningRequest` 接口：新增可选的 `intent` 字段；修改 `parseResponse()` 支持新旧两种格式
  - [x] 3.6 验证：LLM返回意图式响应后，T1白起能基于规则自动拆解为三路兵马的具体命令；楚国突然灭亡后所有下游命令自动取消

- [x] Task 4: 社交求助行为 — P1
  - [x] 4.1 在 `BehaviorTree_Social.h` 中新增 `exec_socialHelp()` 函数：NPC向求助对象移动→到达后触发社交求助交互→获取推荐行为→更新behavior
  - [x] 4.2 在 `NPCActivity` 枚举中新增 `SocialHelp = 83`
  - [x] 4.3 在 `kExecuteTable[]` 中注册 SocialHelp 行为描述符
  - [x] 4.4 修改 `tryMicroPlan()` 的降级逻辑：当标签相似度得分 < 0.3 时，不强制选择低分行为，改为检查社交求助条件（有师父→DiscipleAsk标记求助、有高亲密度朋友→VisitFriend标记求助、有附近长老→移动求助、均不满足→回退标签匹配）
  - [x] 4.5 实现求助结果反馈：求助对象根据自身知识推荐新行为（师父→同系+自身职业标签匹配、朋友→朋友当前行为、长老→家族需要行为），推荐行为获得临时baselineWeight加成（1.3，300帧）
  - [x] 4.6 实现社交求助冷却：600帧内不重复触发；冷却期内触发微规划≥2次则冷却结束后立即触发
  - [x] 4.7 实现求助的流言记录：求助过程生成严重度3的流言内容（"XX向YY请教生计，看来是走投无路了"）
  - [x] 4.8 验证：一个所有行为权重都低于0.7且标签匹配得分<0.3的NPC，有师父时触发请教行为，师父推荐了新方向

# Task Dependencies
- Task 1（角色基线权重）不依赖其他任务，可独立执行
- Task 2（玩家可读性）依赖 Task 1 的 baselineWeight 概念用于生成准确的叙事摘要，但核心逻辑可并行开发
- Task 3（LLM意图式规划）不依赖其他任务，可独立执行
- Task 4（社交求助）依赖 Task 1（求助结果需要基线权重变更机制），且需要 Task 2 完成后才能为求助行为生成玩家可见的叙事摘要
- Task 2.1/2.2 可先行，Task 2.3/2.4 依赖对话系统上下文
- Task 3.3 依赖 3.1 和 3.2
- Task 3.4 依赖 3.1
- Task 4.4 依赖 4.1/4.2/4.3
