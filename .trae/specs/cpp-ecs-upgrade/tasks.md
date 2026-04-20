# Tasks

## Phase 1: C++ ECS基础架构

### Task 1: 创建C++ ECS基础架构
**Description**: 实现ECS核心组件和Registry模板类

- [x] SubTask 1.1: 创建Component.h - 定义IComponent接口和组件基类
- [x] SubTask 1.2: 创建Registry.h - 实现实体注册、组件关联存储
- [x] SubTask 1.3: 创建Entity.h - 定义EntityId类型和EntityBuilder构造器
- [x] SubTask 1.4: 创建Archetype.h - 实现 archetype 存储优化

### Task 2: 实现Job System多线程调度
**Description**: 实现线程池和任务调度系统

- [x] SubTask 2.1: 创建ThreadPool.h - 实现固定数量线程池
- [x] SubTask 2.2: 创建TaskQueue.h - 实现无锁任务队列
- [x] SubTask 2.3: 创建Job.h - 定义Job基类和LambdaJob包装器
- [x] SubTask 2.4: 创建JobDispatcher.h - 实现任务分发器
- [x] SubTask 2.5: 实现工作窃取(Work Stealing)算法

## Phase 2: NPC组件系统

### Task 3: 实现NPC组件
**Description**: 将TypeScript NPCEntity拆分为C++组件结构

- [x] SubTask 3.1: 创建PositionComponent.h/.cpp - 位置与移动
- [x] SubTask 3.2: 创建StatsComponent.h/.cpp - 属性数值
- [x] SubTask 3.3: CreateBehaviorComponent.h/.cpp - 行为状态
- [x] SubTask 3.4: CreatePersonalityComponent.h/.cpp - 人格参数
- [x] SubTask 3.5: CreateIdentityComponent.h/.cpp - 身份标识
- [x] SubTask 3.6: CreateLifecycleComponent.h/.cpp - 生命周期
- [x] SubTask 3.7: CreateResourcesComponent.h/.cpp - 资源持有

### Task 4: 实现NPC Systems
**Description**: 实现NPC相关的游戏系统

- [x] SubTask 4.1: 创建NPCCreationSystem.h/.cpp - NPC创建与销毁
- [x] SubTask 4.2: 创建BehaviorTreeSystem.h/.cpp - 行为树执行
- [x] SubTask 4.3: 创建MovementSystem.h/.cpp - 移动与寻路
- [x] SubTask 4.4: 创建CombatSystem.h/.cpp - 战斗逻辑

## Phase 3: NPC Update Pipeline

### Task 5: 实现NPC Update Pipeline
**Description**: 实现多线程NPC更新管线

- [x] SubTask 5.1: 创建NPChunkUpdateSystem.h/.cpp - 按区域分片并行更新
- [x] SubTask 5.2: 创建LifecycleSystem.h/.cpp - 生死轮回处理
- [x] SubTask 5.3: 创建PopulationBalanceSystem.h/.cpp - 人口动态平衡
- [x] SubTask 5.4: 创建WorldUpdateLoop.h/.cpp - 主循环整合

## Phase 4: IPC通信层

### Task 6: 实现IPC通信层
**Description**: 实现Node.js与C++引擎间的进程间通信

- [x] SubTask 6.1: 创建Protocol.h - 定义消息类型和序列化格式
- [x] SubTask 6.2: 创建UnixSocketServer.h/.cpp - C++侧Socket服务器
- [x] SubTask 6.3: 创建MessageQueue.h - 实现消息队列
- [x] SubTask 6.4: 创建NPAddon.h/.cpp - Node.js Addon桥接层

## Phase 5: 集成与测试

### Task 7: 集成与性能测试
**Description**: 集成测试和性能基准验证

- [x] SubTask 7.1: 创建main.cpp - 整合所有模块
- [x] SubTask 7.2: 实现基准测试工具 - 10万NPC实例化
- [x] SubTask 7.3: 性能测试 - 测量帧时间和吞吐量
- [x] SubTask 7.4: 内存分析 - 检测内存泄漏和占用
- [x] SubTask 7.5: 集成测试 - 与Node.js网关联调

## Task Dependencies

```
Task 1 (ECS基础)
    ↓
Task 2 (Job System) ─┐
    │                  │
    ↓                  │
Task 3 (NPC组件) ─────┴──→ Task 4 (NPC Systems)
                           │
                           ↓
Task 5 (NPC Update Pipeline)
         │
         ├──────────────────────┐
         ↓                      ↓
Task 6 (IPC通信层)    Task 7 (集成测试)
         │                      │
         └──────────┬───────────┘
                    ↓
               完成验证
```

## Verification

- SubTask 1.1-1.4: Registry单元测试，组件关联正确
- SubTask 2.1-2.5: 线程池启动成功，任务并行执行
- SubTask 3.1-3.7: 组件数据赋值读取正确
- SubTask 4.1-4.4: NPC行为树执行符合预期
- SubTask 5.1-5.4: 10万NPC帧时间 < 16ms
- SubTask 6.1-6.4: IPC消息收发正确
- SubTask 7.1-7.5: 全链路集成测试通过
