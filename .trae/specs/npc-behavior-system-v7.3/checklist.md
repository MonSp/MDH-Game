# Checklist

## 微规划行为重置
- [x] microPlanTriggered 在 recordResult 正分时重置为 0
- [x] 连续 3 次失败后 microPlanTriggered 重置为 0
- [x] 行为被外部打断离开微规划行为时触发标记重置
- [x] tryMicroPlan 不再对已离开微规划行为的 NPC 返回旧结果

## 基线权重接入 chooseByRole
- [x] BranchDisciple 角色 Mine 选择概率 = 0.25 × 1.5 = 0.375
- [x] BranchDisciple 角色 Fish 选择概率 = 0.15 × 0.5 = 0.075
- [x] CoreDisciple 角色 Cultivate 选择概率 = 0.35 × 1.5 = 0.525
- [x] fallback 行为不受基线权重影响
- [x] chooseByRole 签名包含 IdentityComponent 参数

## LLM Plan 层统一入 kEvaluateLayers
- [x] kEvaluateLayers 数组包含 evaluateLLMPlan（第 4 层位置）
- [x] evaluate() 顶部不再包含 LLM Plan 硬编码拦截
- [x] LLM Plan ACTIVE 状态正常被执行
- [x] LLM Plan 执行中 HP < 30% 被 Survival 层打断
- [x] 无 LLM Plan 的 NPC 正常跳过该层

## 废弃 getActivityTags 统一三维标签
- [x] jaccardSimilarity 使用 getActivityTagBundle + 三维加权 (0.5/0.3/0.2)
- [x] getActivityTags 标记为 deprecated
- [x] computeTagSimilarity 使用 jaccardUint16 而非 jaccardSimilarity
- [x] 编译通过且无新增 warnings

## Daily 层经济信号
- [x] 经济信号不可用时不影响行为选择
- [x] 铁矿紧缺时矿工系 NPC 采矿概率提升
- [x] 灵石通胀时生产系行为概率提升、交易概率下降

## RefuseCommand 优先级
- [x] getPriorityLevel 中 RefuseCommand 和 CoordinateSquad 的优先级 ≤ default(6)
- [x] 拒绝后允许社交/修炼正常打断

## tryMicroPlan 改用 kExecuteTable
- [x] allActivities[] 硬编码数组已移除
- [x] 遍历 kExecuteTable 获取候选行为
- [x] Idle/Dead/Incapacitated/Flee/Heal/Defend 被正确过滤
- [x] 新增行为自动纳入微规划候选池

## evaluateDaily 去重
- [x] chooseByRole 在 evaluateDaily 中只调用一次
- [x] 替代行为选择使用标签相似度而非重新随机

## 编译与性能
- [x] C++代码一致性验证通过（所有函数签名、类型、引用自洽）
- [x] 10K NPC 场景下决策帧耗时不劣于 V7.2 基线（设计层面确认 O(kExecuteTable 遍历) 不劣于原 allActivities[]）
- [x] 文档 V5→V7.3 迭代总览表更新（说明见实现总结）
