# NPC 行为系统第二轮评审改进 Spec

## Why
经过V7.1的设计评审改进（叙事状态机、行为标签体系、意义构建日志），游戏专家进行了第二轮深度评审，指出了四个从游戏设计角度必须正视的问题：玩家无法理解NPC行为的黑盒复杂性、反思系统可能导致长期行为趋同、LLM规划延时与具体性不匹配、以及NPC走投无路时缺少社交求助出口。这些是系统从"技术正确"走向"玩家可感知"的关键关口。

## What Changes
- **玩家可读性暴露**：将V7.1的决策日志从纯调试工具升级为玩家可见的叙事线索——NPC在对话中会自然透露行为改变的动机，通过行为观察窗口可查看简化的决策摘要
- **角色基线权重**：在反思系统中引入不可被完全抵消的"职业本能"基线权重，矿工即使连续失败也只是暂时沮丧而非永久改行，遗忘因子的恢复力被强化为向基线回归的弹簧力
- **LLM意图式规划**：LLM产出改为"目标意图"（如"削弱楚国至50%战力"）而非具体命令，T1/T2的战术拆解改为纯规则驱动，增加目标失效检测使任务链可自动中断
- **社交求助行为**：当微规划失败（NPC走投无路）时，不再只是内部映射一个新行为，而是触发社交求助——向长老求指点、拜师学艺、问计于友——将系统死结转化为新的人际互动

## Impact
- Affected specs: npc-system-design-review-improvements (V7.1)
- Affected code: `BehaviorComponent.h`（ReflectionData基线字段）, `BehaviorTreeSystem.h`（微规划→社交求助、基线权重介入）, `LLMPlanningService.ts`（意图式规划prompt重构）, `LLMGatewayService.ts`（T1/T2规则拆解器）, `BehaviorTree_Social.h`（社交求助行为）, `DecisionLogService.ts`（日志→玩家叙事转换）
- **BREAKING**: `LLMPlanningRequest` 的 prompt 结构变更，LLM 输出格式从 `tasks[]` 变为 `intent{goal, metrics, conditions}` + `tasks[]`（向后兼容旧格式）
- 玩家可读性为纯叙事系统改动，不影响决策核心逻辑
- 社交求助为新增的50+1种行为，需在kExecuteTable注册

## ADDED Requirements

### Requirement: 玩家可读性暴露
系统 SHALL 将NPC行为决策的关键原因通过对话文本和行为观察窗口暴露给玩家，使黑盒行为变得可理解。

#### Scenario: NPC对话中自然透露决策原因
- **WHEN** NPC因决策日志中记录的原因发生行为变化（反思惩罚、阵营偏见、情绪打断等）且玩家与之交互
- **THEN** NPC的对话文本中插入决策原因的自然语言表述：
  - 反思惩罚 → "最近采矿运气不好，手头有点紧……"
  - 阵营偏见 → "你是XX宗的人，我不想和你们打交道。"
  - 情绪恐惧 → "最近镇上不太平，我还是躲远点好。"
  - 遗忘恢复 → "说起来，好久没去矿坑了，改天试试。"
  - 微规划 → "这行当干不下去了，得想个新出路……"

#### Scenario: 行为观察窗口
- **WHEN** 玩家选中一个NPC并查看其详细信息
- **THEN** 系统展示该NPC最近一条决策摘要（决策日志中最近的narrativeSnippet），格式为NPC当前状态的一句话描述
- **THEN** 摘要格式："（矿工·沮丧中）最近连续挖不到好矿，正打算改行种田"

#### Scenario: 对话文本生成规则
- **WHEN** 系统为NPC生成交互对话
- **THEN** 从最近3条决策日志中提取叙事片段，按以下优先级选择可透露的：
  - 只透露与当前交互对象相关的原因（阵营偏见、关系变化）
  - 不透露超过24游戏小时前的旧原因
  - 高谨慎NPC透露概率低（30%），低谨慎NPC透露概率高（80%）

### Requirement: 角色基线权重
系统 SHALL 为每种角色模板提供不可被反思完全抵消的职业基线权重，确保NPC长期行为不会趋同。

#### Scenario: 基线权重的定义
- **WHEN** 系统初始化NPC的行为权重
- **THEN** 基于角色模板预设基线权重数组：
  - 矿工模板（BranchDisciple）：Mine=1.5, Farm=0.8, Fish=0.5, Lumber=0.6, Gather=0.7, Craft=0.4...
  - 农夫模板：Farm=1.5, Gather=1.2, Mine=0.5, Fish=0.6...
  - 铁匠模板（角色通过家族传承识别）：Craft=1.6, Mine=1.2, Refine=1.0, Trade=0.9...
  - 修士模板（CoreDisciple/InnerDisciple）：Cultivate=1.5, Meditate=1.2, SeekFortune=0.8...
  - 通用模板（默认）：所有行为基线=1.0

#### Scenario: 基线权重与反思的交互
- **WHEN** 反思系统计算行为的最终权重
- **THEN** 最终权重 = baselineWeight × reflectionMultiplier × recoveryFactor
  - baselineWeight 是角色模板赋予的不可归零的初始倾向（范围0.5~1.6）
  - reflectionMultiplier 是反思惩罚（0.5~1.5），与V6行为一致
  - recoveryFactor 是遗忘恢复因子，V6.1已有，但恢复目标改为baselineWeight而非1.0
- **THEN** 反思惩罚最多将 finalWeight 压低到 baselineWeight × 0.5，而非绝对0.5

#### Scenario: 职业本能的回归力
- **WHEN** 遗忘因子触发恢复
- **THEN** 恢复目标为 baselineWeight 而非 1.0——一个矿工的采矿权重即使被惩罚也不会永久低于其职业基线×0.5，且500帧后自然向基线回归
- **THEN** 勤奋NPC的恢复力更强（×1.5），"职业本能"的弹簧力更大

#### Scenario: 基线权重的动态调节
- **WHEN** NPC因微规划或社交求助成功切换到新职业系行为且连续成功3次
- **THEN** 新行为的 baselineWeight 临时提升至1.2（持续500帧），模拟"尝到甜头"——但原职业的基线权重不会被永久降低
- **THEN** 如果新行为也连续失败，baselineWeight 恢复原值，NPC回归原职业系

### Requirement: LLM意图式规划
系统 SHALL 将LLM规划产出从具体命令序列改为"目标意图+规则拆解"，避免延时导致的策略过时。

#### Scenario: LLM产出意图而非具体命令
- **WHEN** T0/T1 NPC发起LLM规划请求
- **THEN** LLM prompt要求产出意图对象：
  ```json
  {
    "intent": {
      "goal": "削弱楚国战力至50%以下",
      "metric": "楚国.fightingStrength",
      "target_value": 50,
      "deadline_frames": 5000,
      "validity_condition": "楚国.exists"
    },
    "suggested_tasks": [
      { "action": "CAPTURE_RESOURCE_POINT", "target": "楚国东侧矿脉" },
      { "action": "DOMAIN_WAR", "target": "楚国边境要塞" }
    ]
  }
  ```
- **THEN** 向后兼容：如果LLM返回旧格式（仅有tasks），系统将tasks作为suggested_tasks处理，并自动生成默认intent

#### Scenario: T1/T2规则化拆解
- **WHEN** 意图下达到T1/T2角色
- **THEN** 系统使用纯规则（非LLM）将意图拆解为具体任务：
  - 根据意图的metric和target_value评估当前进度
  - 从行为标签库中查找匹配意图方向的行为（如"削弱战力"→Attack/Ambush/Assassinate/CaptureResourcePoint）
  - 基于NPC当前资源和位置分配子任务
  - 拆解产物为具体CommandSlot写入RoleCommandComponent

#### Scenario: 目标失效检测
- **WHEN** 意图生效期间
- **THEN** 每30帧检查 intent.validity_condition：
  - "楚国.exists" == false → 意图立即失效，所有下游任务中断
  - metric值已达标（fightingStrength < 50）→ 意图完成，自动上报
  - deadline_frames超时 → 意图标记为超时，触发LLM重新规划
- **THEN** 意图失效后，T1/T2的CommandSlot全部标记为Cancelled，NPC回归日常行为或进入待命状态

#### Scenario: LLM prompt重构
- **WHEN** 构造LLM规划prompt
- **THEN** prompt明确要求LLM区分"意图"和"建议手段"：
  ```
  请制定战略意图（而非具体命令）：
  - 目标：你希望达成的状态变化（如"削弱X国至50%战力"）
  - 衡量指标：如何判断目标达成
  - 失效条件：什么情况下此计划自动作废
  - 建议手段：你可建议一些具体行动，但最终由下属根据战场态势决定
  ```
- **THEN** 叙事状态机（V7.1）产出的叙事摘要作为意图制定的上下文

### Requirement: 社交求助行为
系统 SHALL 在NPC走投无路时提供社交求助行为作为微规划的替代出口，而非仅在内部映射新行为。

#### Scenario: 微规划失败→社交求助
- **WHEN** NPC触发微规划但标签相似度匹配得分 < 0.3（所有已知行为都不合适）
- **THEN** 不强制选择一个低相似度行为，改为触发社交求助行为：
  - 有师父 → NPC执行 "DiscipleAsk"（向师父请教人生方向）
  - 有高亲密度朋友（>60）→ NPC执行 "VisitFriend" 并标记求助意图
  - 有家族长老且在附近 → NPC向长老移动并请求指点
  - 以上都不满足 → 回退到当前微规划逻辑（选择最高相似度行为）

#### Scenario: 社交求助的结果
- **WHEN** NPC完成社交求助互动
- **THEN** 求助对象（师父/朋友/长老）根据自身知识推荐一个新行为：
  - 师父推荐其擅长领域（Cultivate → 推荐同系行为 + 所有与师父自身职业标签匹配的行为）
  - 朋友推荐朋友当前从事的行为（"跟我一起干吧"）
  - 长老推荐家族需要的行为（标签匹配 + 家族传承偏置 ×2.0）
- **THEN** 推荐行为获得临时baselineWeight加成（1.3，持续300帧），且记录求助关系（增进亲密度+5）

#### Scenario: 社交求助的冷却
- **WHEN** 社交求助行为已完成
- **THEN** 同一NPC在600帧内不会再次触发社交求助（防止反复求助骚扰），期间微规划回退到标签匹配
- **THEN** 冷却期间记录微规划触发次数，如果冷却期内再次触发微规划2次以上，冷却结束后立即触发社交求助

#### Scenario: 社交求助融入流言网络
- **WHEN** 社交求助发生
- **THEN** 求助过程被记录为可传播的流言（严重度=3，内容："XX向YY请教生计，看来是走投无路了"）
- **THEN** 这增加了社交网络的信息密度，可能引发更多NPC的共情或轻视反应
