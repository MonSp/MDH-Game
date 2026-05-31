# Checklist

## OntologyBridge 语义翻译层

- [x] `OntologyBridge.ts` 文件存在且导出 `OntologyBridge` 类
- [x] `SemanticNPCProfile` 接口定义完整（emotional_state, needs, temperament, behavioral_profile, social_network）
- [x] `CausalChain` 接口定义完整（trigger, steps, risk_projection, countermeasures）
- [x] `ActivityOntology` 接口定义完整（activity, category, economic_role, preconditions, produces, consumes）
- [x] `semanticizeEmotion(73.5, 'anger')` 返回 `{ value: 73.5, state: '暴怒', above_threshold: true }`（实现边界≥70为暴怒，语义合理）
- [x] `semanticizeEmotion(10, 'anger')` 返回 `{ value: 10, state: '平静', above_threshold: false }`
- [x] `semanticizeEmotion(100, 'anger')` 返回 `{ value: 100, state: '暴怒', above_threshold: true }`
- [x] `semanticizeNeeds(hunger=80, fatigue=20, social=50)` 正确映射为语义标签（极度饥饿/精力充沛/略有社交欲）
- [x] `semanticizeTemperament` 六维性格全部映射为修仙世界语义
- [x] `semanticizeNPC` 整合所有语义化函数，返回完整 profile
- [x] `buildCausalChain` 能从 EconomicDigest 推导出至少 1 条因果链
- [x] `describeActivity(NPCActivity::Mine)` 返回正确的经济角色和价值链位置
- [x] `snapshotWorld` 函数存在（可为占位实现）

## WASM 扩展导出

- [x] `ecs_bridge.cpp` 的 `GetAllNPCStates` 导出 `anger` 字段（float）
- [x] `ecs_bridge.cpp` 的 `GetAllNPCStates` 导出 `fear` 字段（float）
- [x] `ecs_bridge.cpp` 的 `GetAllNPCStates` 导出 `joy` 字段（float）
- [x] `ecs_bridge.cpp` 的 `GetAllNPCStates` 导出 `lastDecisionSnippet` 字段（string）
- [x] `ecs_bridge.cpp` 的 `GetAllNPCStates` 导出 `spouseSlot` 字段（uint32）
- [x] `ecs_bridge.cpp` 的 `GetAllNPCStates` 导出 `mentorSlot` 字段（uint32）
- [x] `ECSWasmLoader.ts` 的 `NPCState` 接口新增 anger/fear/joy/lastDecisionSnippet 字段
- [x] `wasmGetNPCDetailFromState(state)` 函数存在且能读取扩展数据

## 决策本体论 System Prompt

- [x] `buildSystemPrompt` 内嵌七层优先级描述（L0-L6，含触发条件和阈值）
- [x] `buildSystemPrompt` 内嵌每层的触发条件和阈值
- [x] `buildSystemPrompt` 内嵌行为惯性机制说明（hysteresis）
- [x] `buildSystemPrompt` 内嵌情绪冷却机制说明（emotionCooldown）
- [x] `buildSystemPrompt` T0 级内嵌经济学常识（供需定律、边际递减、比较优势、拉弗曲线等）
- [x] `buildSystemPrompt` T0 级内嵌社会规则（阵营偏见、流言传播、情绪传染等）
- [x] `buildSystemPrompt(0)` 返回 T0 级完整 System Prompt
- [x] `buildSystemPrompt(2)` 返回 T2 级精简 System Prompt

## 增强 Prompt 构建

- [x] `buildPlanPromptWithFrontline` 输出包含 System Prompt（决策本体论知识）
- [x] `buildPlanPromptWithFrontline` 输出包含语义化 NPC 画像（非原始数值）
- [x] `buildPlanPromptWithFrontline` 输出包含经济因果推理链（T0-T1 级别，由 formatEconomicDigestForPrompt 传入）
- [x] `formatEconomicDigestForPrompt` 输出增加因果推理链段落
- [x] `formatEconomicDigestForPrompt` 输出增加趋势分析段落

## NPCMemory 增强

- [x] `buildMemoryContext` 输出包含 `## 当前情感` 段落
- [x] `buildMemoryContext` 输出包含 `## 行为偏好` 段落（通过 reflectionData 参数传入，使用 activityIdToChinese 映射行为名）
- [x] `buildMemoryContext` 输出包含 `## 最近决策` 段落
- [x] 情感段落使用语义标签而非原始数值

## 集成验证

- [x] TypeScript 编译通过（`npx tsc --noEmit` 零错误）
- [x] OntologyBridge 边界值测试通过（空数据、极值、正常值 — semanticizeEmotion/Needs/Temperament 均有 clamp 保护）
- [ ] LLM prompt 输出可读性验证（人工审查生成的 prompt 文本）
