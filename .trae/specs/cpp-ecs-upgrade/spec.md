# C++ ECS + Job System 服务器升级方案

## Why

当前Node.js单进程架构无法支撑10万+ NPC的实时计算，每帧遍历所有NPC进行行为树更新会导致严重的性能瓶颈。C++ ECS架构结合多线程Job System可将计算密集型任务并行化，充分利用多核CPU资源。

## What Changes

- 引入C++ ECS（Entity Component System）架构替代传统OOP NPC类继承结构
- 实现多线程Job System支持NPC并行更新
- 保留Node.js作为HTTP/WebSocket网关，计算逻辑下沉到C++核心
- 设计模块化组件系统便于扩展新NPC类型

## Impact

- Affected specs: 00-代码架构设计, 06-NPC行为与生命周期代码设计, 11-NPC生死轮回与人口平衡代码设计
- Affected code: server/game/ 目录下的核心游戏逻辑

## ADDED Requirements

### Requirement: ECS组件定义
系统 SHALL 提供基础组件类型定义，支持Position、Behavior、Stats、Personality等组件的组合

### Requirement: Job System多线程调度
系统 SHALL 提供可配置线程数的Job System，支持任务并行调度和依赖等待

### Requirement: NPC Update Pipeline
系统 SHALL 提供NPC批量更新管线，每帧按区域分片并行处理所有NPC行为

### Requirement: IPC通信层
系统 SHALL 提供Node.js与C++引擎之间的进程间通信机制

### Requirement: 行为树执行器
系统 SHALL 在C++侧实现行为树evaluate和execute逻辑

## MODIFIED Requirements

### Requirement: NPC数据模型
原有的TypeScript NPCEntity接口需拆分为组件结构体，支持ECS序列化

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Node.js Gateway                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Express   │  │  Socket.IO  │  │   IPC Client    │  │
│  │   Server    │  │   Server    │  │   (nan/napi)    │  │
│  └─────────────┘  └─────────────┘  └────────┬────────┘  │
└────────────────────────────────────────────┼────────────┘
                                             │ Unix Socket
┌────────────────────────────────────────────┼────────────┐
│                    C++ Game Engine         │            │
│  ┌─────────────────────────────────────────┴──────────┐ │
│  │                   Job System                        │ │
│  │   ThreadPool (可配置4-16线程) + TaskQueue          │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │  NPCCmpSys │  │ WorldCmpSys│  │  CombatCmpSys      │ │
│  │  (并行)    │  │  (并行)    │  │   (并行)           │ │
│  └────────────┘  └────────────┘  └────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │              ECS Registry (Archetype存储)          │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Component Design

### Core Components

| 组件 | 字段 | 说明 |
|------|------|------|
| PositionComponent | x, y, targetX, targetY, speed | 位置与移动 |
| StatsComponent | power, hp, maxHp, mp, maxMp, realm | 属性数值 |
| BehaviorComponent | currentActivity, activityData, behaviorTree | 行为状态 |
| PersonalityComponent | ambition, caution, loyalty, greed | 人格参数 |
| IdentityComponent | id, name, clanId, nation, role | 身份标识 |
| LifecycleComponent | birthTime, age, lifeState, birthType | 生命周期 |
| ResourcesComponent | spiritStones, items, equipment | 资源持有 |

## Job System Design

### ThreadPool配置

```cpp
struct ThreadPoolConfig {
    uint32_t threadCount;      // 建议: std::thread::hardware_concurrency() - 1
    uint32_t queueSize;        // 任务队列上限
    bool enableStealing;        // 工作窃取启用
};
```

### Job类型

| Job | 描述 | 依赖 |
|-----|------|------|
| NPCUpdateJob | 单个NPC行为更新 | 无 |
| ChunkUpdateJob | 1000个NPC批量更新 | 无 |
| WorldSyncJob | 同步世界状态到Node.js | ChunkUpdateJob |
| CombatResolveJob | 战斗结算 | NPCUpdateJob |

## IPC Protocol

### 消息类型

| 消息 | 方向 | 内容 |
|------|------|------|
| NPC_STATE_SYNC | C++→Node | 全量NPC状态快照 |
| PLAYER_INPUT | Node→C++ | 玩家操作指令 |
| EVENT_BROADCAST | C++→Node | 触发事件（死亡/升级等） |

## Tasks

- [ ] Task 1: 创建C++ ECS基础架构
  - [ ] SubTask 1.1: 定义组件头文件（Component.h）
  - [ ] SubTask 1.2: 实现Registry模板类
  - [ ] SubTask 1.3: 创建EntityBuilder构造器
- [ ] Task 2: 实现Job System多线程调度
  - [ ] SubTask 2.1: 实现ThreadPool线程池
  - [ ] SubTask 2.2: 实现TaskQueue任务队列
  - [ ] SubTask 2.3: 实现Job基类与调度器
- [ ] Task 3: 实现NPC组件系统
  - [ ] SubTask 3.1: 实现NPCCreationSystem
  - [ ] SubTask 3.2: 实现BehaviorTreeSystem
  - [ ] SubTask 3.3: 实现MovementSystem
- [ ] Task 4: 实现NPC Update Pipeline
  - [ ] SubTask 4.1: 实现NPChunkUpdateSystem（按区域分片）
  - [ ] SubTask 4.2: 实现LifecycleSystem（生死轮回）
  - [ ] SubTask 4.3: 实现PopulationBalanceSystem
- [ ] Task 5: 实现IPC通信层
  - [ ] SubTask 5.1: 定义Protocol消息格式
  - [ ] SubTask 5.2: 实现UnixSocket通信
  - [ ] SubTask 5.3: 实现Node.js Addon桥接
- [ ] Task 6: 集成与测试
  - [ ] SubTask 6.1: 性能基准测试（10万NPC）
  - [ ] SubTask 6.2: 内存占用分析
  - [ ] SubTask 6.3: 集成测试验证

## Task Dependencies

- Task 2 必须在 Task 1 完成后开始
- Task 3 依赖 Task 1 和 Task 2
- Task 4 依赖 Task 3
- Task 5 可与 Task 3、4 并行开发
- Task 6 依赖 Task 4 和 Task 5

## Performance Target

| 指标 | 目标值 |
|------|--------|
| 10万NPC单帧更新耗时 | < 16ms (60FPS) |
| 内存占用 | < 2GB |
| 线程数配置 | 8-16（可配置） |
| Job Queue响应 | < 1ms |
