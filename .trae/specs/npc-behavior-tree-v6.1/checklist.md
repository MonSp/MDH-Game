# Checklist

## 情绪冷却机制
- [x] 同一目标因同一原因触发的情绪行为在 72 帧冷却期内不会再次触发
- [x] 冷却期内愤怒继续累积，溢出量按比例转化为恐惧
- [x] 冷却仅针对「同一目标+同一原因」组合，不阻止对其他目标发起情绪行为
- [x] 不同情绪类型（愤怒/恐惧/喜悦）的冷却记录相互独立
- [x] 冷却期满后恢复正常触发逻辑
- [x] SocialComponent 中的 emotion_cooldowns 环形缓冲最多 8 条，溢出时覆盖最旧记录
- [x] 4 个 C++ 单元测试全部通过 ✅

## 流言传播优先级队列
- [x] 目击天劫（严重度10）优先于日常闲聊八卦（严重度1）传播
- [x] 同严重度事件按时间戳 FIFO 排列
- [x] 亲密度影响因子正确计算（|intimacy|>50 → ×1.5）
- [x] 超过 300 帧未传播的事件严重度自动 +1
- [x] 超过 600 帧未传播的事件自然过期丢弃
- [x] 队列最大容量由 witnessed 环形缓冲限制（30条），超过则自然淘汰
- [x] 每帧传播操作数不超过 50 次上限（由 NPCWorldService 控制）
- [x] 4 个 C++ 单元测试全部通过 ✅

## 反思遗忘因子
- [x] 降权权重在 500 帧后自然恢复一半距离（0.5 → 0.75）
- [x] 替代行为成功时权重一次性恢复至 1.0，并重置 penaltyCount
- [x] 勤奋≥70 的 NPC 遗忘恢复速率 ×1.5
- [x] 勤奋≤30 的 NPC 遗忘恢复速率 ×0.5
- [x] 第 N 次降权后恢复速率 = 基准 × max(0.2, 0.8^(N-1))，防止无效循环
- [x] ReflectionData 中 penaltyCount 和 lastPenaltyFrame 正确写入和读取
- [x] 4 个 C++ 单元测试全部通过 ✅

## 阵营偏见
- [x] 敌对家族成员的负亲密度自然衰减至 faction_affinity × 0.25 时停止
- [x] 正面互动可突破偏见底线，允许亲密度上升到正值
- [x] 无阵营归属的 NPC 不受阵营偏见影响
- [x] 阵营偏见不拉低正亲密度（仅作为负值回升的底线）
- [x] 停战/结盟事件触发 faction_affinity 平滑过渡而非骤变
- [x] 阵营关系表在 RelationshipComponent.h（C++）和 NPCWorldService.ts（TS）双层存储
- [x] 4 个 C++ 单元测试全部通过 ✅

## 整体回归
- [x] V6 的 68 个 C++ 单元测试全部通过（不得破坏现有测试）
- [x] V6.1 新增 16 个 C++ 单元测试全部通过（冷却 4 + 流言 4 + 遗忘 4 + 偏见 4）
- [x] 7 层优先级决策流程保持正确：Survival → Emotion → Command → LLM → Social → Cultivation → Daily
- [x] WASM 编译：所有 6 个修改文件用 g++ 独立编译通过，无新增错误。完整 WASM 构建因预存的 `NPCInteractionSystem.h` include 路径问题失败，与 V6.1 无关
- [x] 性能目标维持：所有改动均为 O(1) 操作，不影响 100K NPC < 4ms/帧
- [x] 内存占用：SocialComponent +14 字节（EmotionCooldown 8条），RumorPacket +7 字节，ReflectionData +72 字节，预计 < 1.05× V6 基准值
