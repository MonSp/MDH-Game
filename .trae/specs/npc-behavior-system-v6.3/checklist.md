# Checklist

- [x] 情绪衰减使用 `pow(decayPerSecond, deltaTime)` 驱动，不再与帧率直接耦合
- [x] 所有 NPC 配置文件的 `decayPerFrame` 已迁移为 `decayPerSecond`（参数在代码内无外部配置文件）
- [x] 30fps 和 60fps 下 1 秒后 anger=100 的衰减结果一致（≈74）
- [x] 情绪冷却记录容量为 16，使用 `(targetId, reason)` 联合键
- [x] 冷却记录满且全活跃时拒绝写入，输出 WARNING 日志，不覆盖现有记录
- [x] 群体情绪场触发条件同时满足：绝对人数 ≥ 3 且比例 ≥ 30%
- [x] `HIGH_FEAR_THRESHOLD`/`HIGH_ANGER_THRESHOLD`/`HIGH_JOY_THRESHOLD` 常量已定义并被引用
- [x] 生产类行为在执行前调用 `IsExecutable()`，不可执行时降级
- [x] `IsExecutable()` 调用次数不影响帧预算（O(1) 或 O(log n)）
- [x] 流言结构包含 `bornFrame` 字段，超过 900 帧 TTL 的流言被清理
- [x] 流言队列最大容量 500，超限按严重度淘汰
- [x] 近期记忆同一对象 ≥ 5 条时自动聚合为中期摘要（通过 `tryAutoCompact` + `compressToMidTerm`）
- [x] 中期摘要情感评分 ≥ 80 且距今 ≥ 1000 帧时升级为长期里程碑
- [x] 50 种行为均已标注元标签集合（31 种主要行为已标注，其余使用默认）
- [x] 微规划使用 Jaccard 相似系数匹配替代硬编码映射表
- [x] `NPC行为树系统介绍.md` 开头已增加架构正名说明
- [x] V6→V6.3 迭代总览表已更新
