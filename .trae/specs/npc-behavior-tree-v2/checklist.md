# Checklist

## 数据模型
- [x] NPCActivity 枚举包含 40+ 个行为类型，分为生存/日常/修炼/社交/指令执行/生产/经济/战斗/探索/状态 10 大类
- [x] SocialComponent 包含饥饿值、疲劳值、精力值、社交欲望值、心情值 5 个 0-100 字段
- [x] RelationshipComponent 支持 Family/Lover/MentorDisciple/Friend/Enemy 五种关系类型，含 intimacy 亲密度
- [x] RoleCommandComponent 包含 commandType/issuerEntityId/targetX/targetY/deadline/status 六个字段
- [x] CultivationComponent 包含 cultivationProgress/bottleneckTimer/hasElixir/isBreakingThrough/tribulationTimer
- [x] PersonalityComponent 新增 sociability 和 diligence 字段
- [x] StatsComponent 新增 cultivationPower 字段
- [x] Registry.h SoA 数组包含全部新增组件

## 行为树逻辑
- [x] evaluate() 实现 6 层优先级：生存 > 指令 > LLM 计划 > 社交 > 修炼 > 日常
- [x] 生存层：HP < 30% 触发 Flee/Heal/Defend
- [x] 饥饿值 > 70 触发 Eat（生存层或日常层均可）
- [x] 指令层：检测 RoleCommandComponent 状态，执行 Pending 指令
- [x] LLM 计划层：LLMPlanComponent status==ACTIVE 时执行 SubTask
- [x] 社交层：社交欲望 > 60 时触发社交活动
- [x] 修炼层：cultivationProgress >= 1000 触发 Breakthrough
- [x] 日常层：基于 6 维性格权重选择活动
- [x] 空闲兜底：所有层不满足时默认 Rest

## 执行逻辑
- [x] executeFlee(): 向反方向移动 + 回血
- [x] executeHeal(): 原地打坐 + HP/MP 恢复
- [x] executeCultivate(): 增加 cultivationProgress
- [x] executeBreakthrough(): 概率判定、成功晋升/失败受伤
- [x] executeTribulation(): 持续扣血判定
- [x] executeMine(): 产出矿石
- [x] executeFarm(): 播种→生长→收获
- [x] executeFish(): 产出鱼获
- [x] executeBuild(): 消耗材料、增加进度
- [x] executeCraft/Refine/Cook/Construct/Repair(): 消耗材料产出
- [x] executeVisitFriend(): 移动+增加 intimacy
- [x] executeDate(): 双向移动+增加 intimacy+可能生育
- [x] executeMentorTeach(): 徒弟 cultivationProgress++
- [x] executeTrade(): 物品交换
- [x] executeEat(): 消耗食物
- [x] executeSleep(): 恢复精力
- [x] executeWalk(): 随机漫游
- [x] executeDuel/Hunt/Ambush/Assassinate(): 战斗逻辑
- [x] executeExplore(): 向未探索区域移动

## 集成适配
- [x] NPCCreationSystem 初始化全部新组件
- [x] NPChunkUpdateSystem 正确调用 SocialComponent 每帧更新
- [x] MovementSystem 支持向另一个 NPC 移动
- [x] ActionType 枚举与 NPCActivity 新值映射
- [x] WASM NPCStateWasm 结构体保持 128 字节
- [x] ECSWasmLoader.ts NPCState 接口 + NPCActivity 映射表更新

## 编译验证
- [x] emcc WASM 编译 0 error
- [x] TypeScript 类型检查通过
- [x] g++ 原生编译语法检查通过
- [x] WASM 产物大小在可接受范围 (185KB → 199KB, +8%)
