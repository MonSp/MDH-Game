# Ontology Bridge: LLM 语义感知增强 Spec

## Why

当前 LLM 规划系统收到的 NPC 数据是原始数值（`anger: 73.5`、`hp: 450`），缺少语义上下文——LLM 不知道 73.5 意味着"暴怒"还是"微怒"，不知道 HP 30% 会触发生存逃跑。经济系统有完整的供需数据但未转化为因果推理链。NPC 的情感、反思轨迹、决策日志、社交网络等关键本体论数据完全未注入 LLM 上下文。

本 Spec 建立一个 **OntologyBridge** 翻译层，将 ECS 原始组件数据转化为 LLM 可直接推理的语义描述，同时在 System Prompt 中注入决策本体论知识。

## What Changes

- 新增 `OntologyBridge.ts`：语义化翻译层，将原始 ECS 数据转为结构化语义描述
- 扩展 WASM 导出：新增 `ecs_getNPCDetail` 导出情感(anger/fear/joy)、反思权重、决策日志摘要
- 扩展 `ECSWasmLoader.ts`：新增 `wasmGetNPCDetail()` 读取扩展数据
- 增强 `LLMPlanningService.ts`：使用 OntologyBridge 重构 prompt 构建，注入决策本体论 System Prompt
- 扩展 `NPCMemory.ts`：`buildMemoryContext` 增加情感状态、反思轨迹、行为因果链

## Impact

- Affected specs: NPC行为系统V7、经济战略层、LLM规划系统
- Affected code:
  - `src/server/game/services/LLMPlanningService.ts` — prompt 构建增强
  - `src/server/llm/NPCMemory.ts` — 记忆上下文增强
  - `src/ecs/ECSWasmLoader.ts` — 新增 WASM 导出读取
  - `src/server/addons/ecs_bridge.cpp` — 新增 Node.js 原生导出
  - 新增 `src/server/game/services/OntologyBridge.ts` — 语义翻译层

---

## ADDED Requirements

### Requirement: OntologyBridge 语义翻译层

系统 SHALL 提供 `OntologyBridge` 模块，将原始 ECS 数值数据转换为 LLM 可推理的语义描述。

#### Scenario: 语义化 NPC 状态

- **WHEN** 调用 `OntologyBridge.semanticizeNPC(rawData)`
- **THEN** 返回 `SemanticNPCProfile`，包含：
  - `emotional_state`：将 anger/fear/joy 数值映射为语义标签（平静/不悦/愤怒/暴怒）
  - `needs`：将 hunger/fatigue/socialDesire 映射为语义标签（饱腹/微饿/饥饿/极度饥饿）
  - `temperament`：将性格六维映射为修仙世界语义描述
  - `behavioral_profile`：当前行为 + 触发原因 + 反思偏好/回避
  - `social_network`：最亲密盟友 + 最大敌人 + 阵营张力

#### Scenario: 语义化世界快照

- **WHEN** 调用 `OntologyBridge.snapshotWorld()`
- **THEN** 返回 `OntologicalWorldSnapshot`，包含：
  - 各国家经济态势 + 关键警报 + 趋势
  - 阵营关系矩阵（友好/敌对/中立）
  - 价值链健康度（六类商品供需趋势）

#### Scenario: 因果推理链生成

- **WHEN** 调用 `OntologyBridge.buildCausalChain(economicDigest, commodityPools)`
- **THEN** 返回 `CausalChain`，包含：
  - 触发事件 → 直接效应 → 价格效应 → 下游连锁效应
  - 风险预测（如"4.5周后库房耗尽"）
  - 可选对策及其成本/收益/风险

### Requirement: WASM 扩展导出

系统 SHALL 通过 WASM 导出 NPC 的情感状态、反思权重、决策日志摘要。

#### Scenario: 读取 NPC 详情

- **WHEN** 调用 `wasmGetNPCDetail(slot)`
- **THEN** 返回包含以下字段的对象：
  - `anger`, `fear`, `joy`（float，0-100）
  - `reflectionWeights`（最多 8 种行为的权重修正）
  - `lastDecisionSnippet`（最近决策的可读摘要，≤64字符）
  - `spouseSlot`, `mentorSlot`（关系特殊标记）

### Requirement: 决策本体论 System Prompt

LLM 规划 SHALL 在 System Prompt 中注入决策本体论知识。

#### Scenario: System Prompt 包含决策框架

- **WHEN** 构建 T0-T2 的 LLM 规划 prompt
- **THEN** System Prompt 包含：
  - 七层优先级决策框架（Survival → Emotion → Command → LLM → Social → Cultivation → Daily）
  - 每层的触发条件和阈值
  - 行为惯性机制说明
  - 情绪冷却机制说明
  - 反思系统如何影响行为选择

### Requirement: 增强 Prompt 构建

`buildPlanPromptWithFrontline` SHALL 使用 OntologyBridge 生成的语义数据替代原始数值。

#### Scenario: NPC 语义画像注入

- **WHEN** 构建 LLM 规划 prompt
- **THEN** prompt 中包含该 NPC 的语义画像：
  - 情感状态（如"此NPC正处于愤怒状态，已超过决斗阈值"）
  - 生理需求（如"饥饿度高，可能中断当前行为去进食"）
  - 行为反思（如"采矿连续失败，权重降至0.7，已转向耕种"）
  - 社交网络摘要（如"与白起关系亲密(+80)，与楚国弟子敌对(-60)"）

#### Scenario: 经济因果链注入

- **WHEN** T0-T1 级 NPC 构建 prompt
- **THEN** prompt 中包含经济因果推理链（非原始数字），如：
  - "矿脉被占领 → 矿石供给骤降 → 价格飙升2.7× → 铁匠成本上升 → 装备产出减少"

---

## MODIFIED Requirements

### Requirement: NPCMemory 记忆上下文

`buildMemoryContext` SHALL 增加情感状态、反思轨迹、行为因果链信息。

#### Scenario: 增强记忆上下文

- **WHEN** 调用 `buildMemoryContext(npcId)`
- **THEN** 返回的上下文字符串额外包含：
  - `## 当前情感`：语义化情感状态
  - `## 行为偏好`：反思系统加权后的偏好/回避行为
  - `## 最近决策`：最近 3 条决策日志的可读摘要

### Requirement: EconomicDigest 格式化

`formatEconomicDigestForPrompt` SHALL 增加因果推理链和趋势分析。

#### Scenario: 经济摘要包含因果链

- **WHEN** 格式化 EconomicDigest 用于 T0-T1 prompt
- **THEN** 输出额外包含：
  - 供需异常的根本原因推导
  - 下游连锁效应预测
  - 风险评估和对策建议

---

## REMOVED Requirements

无。本 Spec 为纯增量改进，不移除现有功能。
