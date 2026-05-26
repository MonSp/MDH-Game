# Checklist

- [x] LLM 规划执行期间插入 `evaluateSurvival` 检查点，HP < 30% 时打断 LLM 规划并切换到 Flee
- [x] LLM 规划被打断时 `PlanStatus` 更新为 `INTERRUPTED`，前端可感知规划被生存原因终止
- [x] 所有写入 `InteractionSlot` 的代码路径均赋值 `timestamp = currentFrame`
- [x] `upgradeMidTermToLongTerm()` 的时间门控 `(currentFrame - firstTime) >= 1000` 基于真实帧差
- [x] 情绪冷却槽满 16 时 LRU 淘汰最旧记录，不拒绝写入
- [x] 情绪冷却淘汰时日志等级为 DEBUG 而非 WARNING（体现设计意图：LRU 是正常调度策略）
- [x] `RelationshipComponent::computeDecayRate` 参数与 `NPCWorldService.ts` 中的公式一致（loyalty: -2/+1, greed: +2）
- [x] `NPCWorldService.tick()` 不再调用 `applyRelationshipDecay()`，关系衰减统一在 C++ WASM 侧
- [x] `EvaluateContext` 结构体定义完整，包含所有 evaluate 层所需的 ECS 组件引用 + `currentTime`
- [x] `kEvaluateLayers[]` 函数指针数组中 7 层顺序与原 `evaluate()` 中的 if-return 链一致
- [x] 评估层接口化后 g++ 编译零错误零警告
- [x] `exec_gossip()` 听众采样从全实体扫描改为空间索引邻居桶采样
- [x] `tryEmotionalContagion()` 近邻遍历从全实体扫描改为空间索引邻居桶遍历
- [x] 空间索引 fallback 路径存在且无编译错误
- [x] `NPC行为树系统介绍.md` 迭代总览表新增 V7 条目，数字一览表更新
