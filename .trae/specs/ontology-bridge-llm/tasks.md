# Tasks

- [x] Task 1: 创建 OntologyBridge.ts 语义翻译层
  - [x] SubTask 1.1: 定义语义化接口类型（SemanticNPCProfile, OntologicalWorldSnapshot, CausalChain, ActivityOntology）
  - [x] SubTask 1.2: 实现 `semanticizeEmotion(value, type)` — 将 anger/fear/joy 数值映射为语义标签（平静/不悦/愤怒/暴怒 等）
  - [x] SubTask 1.3: 实现 `semanticizeNeeds(hunger, fatigue, socialDesire)` — 将生理需求映射为语义标签
  - [x] SubTask 1.4: 实现 `semanticizeTemperament(personality)` — 将性格六维映射为修仙世界语义描述
  - [x] SubTask 1.5: 实现 `semanticizeBehaviorProfile(activity, reflectionData, decisionLog)` — 行为反思语义化
  - [x] SubTask 1.6: 实现 `semanticizeNPC(rawData)` — 整合上述函数，返回完整 SemanticNPCProfile
  - [x] SubTask 1.7: 实现 `buildCausalChain(economicDigest)` — 从 EconomicDigest 推导因果推理链
  - [x] SubTask 1.8: 实现 `describeActivity(activity)` — 返回行为的语义描述（经济角色、价值链位置、前置条件、效果）
  - [x] SubTask 1.9: 实现 `snapshotWorld()` — 生成世界状态语义快照（占位，依赖 WASM 扩展）

- [x] Task 2: 扩展 WASM 导出 — 新增 NPC 详情接口
  - [x] SubTask 2.1: 在 `ecs_bridge.cpp` 的 `GetAllNPCStates` 中新增导出 anger/fear/joy 字段（从 SocialComponent 读取）
  - [x] SubTask 2.2: 在 `ecs_bridge.cpp` 中新增导出 reflectionWeights（从 BehaviorComponent.reflection 读取，最多 8 个 float）
  - [x] SubTask 2.3: 在 `ecs_bridge.cpp` 中新增导出 lastDecisionSnippet（从 BehaviorComponent.getReadableDecisionSummary 读取）
  - [x] SubTask 2.4: 在 `ecs_bridge.cpp` 中新增导出 spouseSlot/mentorSlot（从 RelationshipComponent 读取）
  - [x] SubTask 2.5: 在 `ECSWasmLoader.ts` 中新增 `wasmGetNPCDetail(slot)` 函数读取扩展数据
  - [x] SubTask 2.6: 更新 `NPCState` 接口，新增 anger/fear/joy/lastDecisionSnippet 字段

- [x] Task 3: 构建决策本体论 System Prompt
  - [x] SubTask 3.1: 在 `OntologyBridge.ts` 中定义 `DECISION_ONTOLOGY_SYSTEM_PROMPT` 常量，包含七层优先级决策框架知识
  - [x] SubTask 3.2: 定义 `ECONOMICS_KNOWLEDGE_PROMPT` 常量，包含供需定律、边际递减、比较优势等经济学常识
  - [x] SubTask 3.3: 定义 `SOCIAL_RULES_PROMPT` 常量，包含阵营偏见、流言传播、情绪传染等社会规则
  - [x] SubTask 3.4: 实现 `buildSystemPrompt(tier)` — 根据 NPC 层级组合不同的 System Prompt

- [x] Task 4: 增强 LLMPlanningService prompt 构建
  - [x] SubTask 4.1: 修改 `buildPlanPromptWithFrontline`，在 prompt 开头注入 System Prompt（决策本体论 + 经济学常识）
  - [x] SubTask 4.2: 在 prompt 中注入 `OntologyBridge.semanticizeNPC()` 生成的语义画像，替代原始数值
  - [x] SubTask 4.3: 在 prompt 中注入 `OntologyBridge.buildCausalChain()` 生成的经济因果推理链
  - [x] SubTask 4.4: 增强 `formatEconomicDigestForPrompt`，增加因果推理链和趋势分析

- [x] Task 5: 增强 NPCMemory 记忆上下文
  - [x] SubTask 5.1: 修改 `buildMemoryContext`，新增 `## 当前情感` 段落（语义化情感状态）
  - [x] SubTask 5.2: 修改 `buildMemoryContext`，新增 `## 行为偏好` 段落（反思系统加权后的偏好/回避行为）
  - [x] SubTask 5.3: 修改 `buildMemoryContext`，新增 `## 最近决策` 段落（最近 3 条决策日志可读摘要）

- [x] Task 6: 验证与集成测试
  - [x] SubTask 6.1: 验证 OntologyBridge.semanticizeNPC 对边界值的处理（anger=0, anger=100, 空 reflectionData）
  - [x] SubTask 6.2: 验证 WASM 导出的新字段能正确读取
  - [x] SubTask 6.3: 验证 LLM prompt 中包含语义画像和因果链
  - [x] SubTask 6.4: 运行 TypeScript 类型检查确保无编译错误

# Task Dependencies

- Task 1 (OntologyBridge) 可独立开始，不依赖其他任务
- Task 2 (WASM 扩展) 可独立开始，不依赖其他任务
- Task 3 (System Prompt) 依赖 Task 1 的接口定义
- Task 4 (Prompt 增强) 依赖 Task 1 + Task 3
- Task 5 (NPCMemory 增强) 依赖 Task 1
- Task 6 (验证) 依赖 Task 1-5 全部完成

# Parallelizable Work

- Task 1 和 Task 2 可并行
- Task 3 和 Task 2 可并行
- Task 4 和 Task 5 可并行（都依赖 Task 1）
