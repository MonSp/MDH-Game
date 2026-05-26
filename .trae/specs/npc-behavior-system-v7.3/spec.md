# NPC 行为系统 V7.3 整合修复与架构清理 Spec

## Why
V7.2 引入了基线权重、决策日志、意图式规划、社交求助等重要特性，但对 V5→V7.2 全量源码审查发现：V7.1/V7.2 的新特性与旧代码之间的整合不彻底——基线权重在决策选择时完全未生效、微规划存在致命 Bug（触发后永不重置导致功能退化）、标签系统双轨并存增加维护成本。此 Spec 聚焦修复这些整合缺陷和架构债务，确保 V7.x 的所有设计特性在实际代码中正确运作。

## What Changes
- **P0 修复**: `ReflectionData::microPlanTriggered` 永不重置，导致微规划选择行为退化（永远返回首次结果）
- **P0 修复**: `chooseByRole` 未接入 `RoleBaselineWeights`，V7.2 基线权重在行为选择阶段完全未生效
- **P1 重构**: LLM Plan 层从 `evaluate()` 硬编码拦截移入 `kEvaluateLayers[]` 数组，统一评估链架构
- **P1 清理**: 废弃 `getActivityTags` 单维标签，统一使用 `getActivityTagBundle` 三维标签体系
- **P1 新增**: Daily 层接入家族经济信号，NPC 能感知家族资源供需状态
- **P2 修复**: `RefuseCommand` 在 `getPriorityLevel` 中优先级过高（2），导致拒绝行为被异常保护
- **P2 优化**: `tryMicroPlan` 中 `allActivities[]` 改用 `kExecuteTable` 遍历，消除硬编码数组维护成本
- **P2 优化**: `evaluateDaily` 中 `chooseByRole` 重复调用消除，减少计算浪费

## Impact
- Affected specs: npc-review-phase2-improvements (V7.2)
- Affected code: `BehaviorTreeSystem.h`（evaluate、tryMicroPlan、chooseByRole、kEvaluateLayers、getPriorityLevel）、`BehaviorComponent.h`（getActivityTags 废弃、ReflectionData、RoleBaselineWeights）
- **BREAKING**: `getActivityTags()` 标记为 deprecated，调用方迁移至 `getActivityTagBundle()`
- 决策层数从文档描述的 7 层实际变为 7 层（LLM Plan 正式加入 kEvaluateLayers）
- `getPriorityLevel` 中 RefuseCommand 优先级从 2 改为 default(6)

## ADDED Requirements

### Requirement: 微规划行为重置
系统 SHALL 在微规划行为执行成功后重置 `microPlanTriggered`，确保下次触发时重新计算标签相似度。

#### Scenario: 微规划行为成功执行后重置
- **WHEN** NPC 的微规划行为（如 SocialHelp、标签匹配替代行为）执行完成且 `recordResult` 接收到正分
- **THEN** `reflectionData.microPlanTriggered` 重置为 0，`microPlanActivity` 重置为 Idle

#### Scenario: 微规划行为连续失败
- **WHEN** NPC 的微规划行为连续 3 次 recordResult 得分 < 0
- **THEN** `microPlanTriggered` 也重置为 0，允许下次触发重新计算

#### Scenario: 微规划行为切换后正常重置
- **WHEN** NPC 从微规划行为切换到非微规划行为（如被生存/情绪打断）
- **THEN** `microPlanTriggered` 在行为离开微规划行为时重置

### Requirement: chooseByRole 接入基线权重
系统 SHALL 在 `chooseByRole` 中乘以 `RoleBaselineWeights::getBaselineWeight(activity, role)`，使基线权重参与行为选择偏好计算。

#### Scenario: 矿工模板行为偏好
- **WHEN** BranchDisciple 角色的 `chooseByRole` 被调用
- **THEN** Mine 的选择概率 = 原始概率 × baselineWeight(Mine, BranchDisciple) = 0.25 × 1.5 = 0.375
- **THEN** Fish 的选择概率 = 原始概率 × baselineWeight(Fish, BranchDisciple) = 0.15 × 0.5 = 0.075

#### Scenario: 基线权重不覆盖必要行为
- **WHEN** `chooseByRole` 因概率累积未命中而返回 fallback 行为
- **THEN** fallback 行为不受基线权重影响，保证至少返回一个有效行为

### Requirement: LLM Plan 层统一入 kEvaluateLayers
系统 SHALL 将 LLM Plan 层的拦截逻辑移入 `kEvaluateLayers[]` 作为优先级 4 层的函数指针，消除 `evaluate()` 顶部的硬编码特殊路径。

#### Scenario: LLM Plan 正常执行
- **WHEN** NPC 有 ACTIVE 状态且 tier != T3 的 LLMPlanComponent
- **THEN** `evaluateLLMPlan`（kEvaluateLayers 第 4 层）被调用，执行 plan 的当前 action 并返回 true

#### Scenario: LLM Plan 中生存打断
- **WHEN** LLM Plan 执行期间 HP < 30%
- **THEN** `evaluateSurvival`（kEvaluateLayers 第 1 层）优先执行，打断 LLM Plan

#### Scenario: 无 LLM Plan 时跳过
- **WHEN** NPC 无 LLMPlanComponent 或 plan 状态非 ACTIVE 或 tier == T3
- **THEN** `evaluateLLMPlan` 返回 false，继续后续层评估

### Requirement: 废弃单维标签统一三维标签
系统 SHALL 将 `getActivityTags` 标记为 deprecated，所有调用方（`jaccardSimilarity`、`tryMicroPlan` 中 `allActivities[]` 遍历）迁移至 `getActivityTagBundle` + `jaccardUint16` 的三维标签体系。

#### Scenario: jaccardSimilarity 迁移
- **WHEN** 计算两个行为的标签相似度
- **THEN** 使用 `getActivityTagBundle` 获取三维标签 + `jaccardUint16` 分别计算 career/resource/personality 的 Jaccard 相似度，取加权平均

#### Scenario: 旧函数保留兼容
- **WHEN** 外部代码引用 `getActivityTags`
- **THEN** 编译通过但产生 deprecation warning，内部实现委托给 `getActivityTagBundle`

### Requirement: Daily 层经济信号感知
系统 SHALL 在 Daily 层的行为选择中注入家族资源供需信号作为行为偏置因子，使中底层 NPC 能感知宏观资源状态。

#### Scenario: 铁矿紧缺时矿工加班
- **WHEN** 家族资源系统中 IronOre 库存低于警戒线且 NPC 为矿工系角色
- **THEN** `chooseByRole` 中 Mine 的行为选择概率额外 ×1.5

#### Scenario: 灵石通胀时倾向生产
- **WHEN** 家族灵石储备充足（通胀）且 NPC 为商贾系
- **THEN** 生产系行为（Mine/Farm/Craft）选择概率 ×1.3，交易行为选择概率 ×0.7

#### Scenario: 无信号时不影响
- **WHEN** 家族经济信号不可用或未初始化
- **THEN** 行为选择概率不变（等价于信号因子 = 1.0）

## MODIFIED Requirements

### Requirement: tryMicroPlan 改用 kExecuteTable
`tryMicroPlan` 中的 `allActivities[]` 硬编码数组 SHALL 替换为对 `kExecuteTable` 的遍历，消除新增行为时的双端维护成本。

#### Scenario: 遍历 kExecuteTable
- **WHEN** `tryMicroPlan` 需要枚举所有候选行为
- **THEN** 遍历 `kExecuteTable[0..kExecuteTableSize-1]`，收集所有 `activity` 值用于标签相似度计算

#### Scenario: 新增行为自动纳入
- **WHEN** 在 `kExecuteTable` 中新增一行行为注册
- **THEN** 微规划自动将其纳入候选行为池，无需修改 `tryMicroPlan` 代码

### Requirement: evaluateDaily 优化 chooseByRole 调用
`evaluateDaily` 中对 `chooseByRole` 的两次调用 SHALL 合并为一次，避免重复的随机数生成和反思权重计算。

#### Scenario: 单次调用获取行为与权重
- **WHEN** `evaluateDaily` 需要选择日常行为
- **THEN** 调用一次 `chooseByRole`（带 behavior 和 identity 参数），同时获得 chosen 和其对应的 reflectionWeight
- **THEN** 若 reflectionWeight < 0.7f 需要换行为，调用 `findAlternativeByTag(chosen, ctx)` 而非重新随机 `chooseByRole`

### Requirement: RefuseCommand 优先级修正
`getPriorityLevel` 中 `RefuseCommand` 的行为惯性优先级 SHALL 从 2 调整为 default(6)，与日常行为一致，避免瞬时拒绝行为被异常保护。

#### Scenario: 拒绝后正常切换
- **WHEN** NPC 执行 `RefuseCommand` 期间触发社交需求
- **THEN** 行为惯性允许正常降级切换（降级帧数 = HYSTERESIS_LEVEL_DOWNGRADE = 3），而非被 2 级优先级阻塞
