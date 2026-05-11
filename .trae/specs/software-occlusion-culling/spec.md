# 软件光栅化遮挡剔除系统 Spec

## Why
当前遮挡剔除使用圆柱体近似 + 射线检测，无法精确处理任意形状建筑、动态破坏和开门场景。需要替换为基于 CPU 软件光栅化深度图的方案，从体素建筑自动生成遮挡三角形几何，实现精准的实时遮挡剔除。

## What Changes
- 移除 `occlusion.cpp` 中的射线-圆柱体相交检测逻辑（`rayHits3DCylinder` 及相关 lambda）
- 新增遮挡缓冲（二维浮点深度图）数据结构
- 新增三角形软件光栅化函数（顶点投影、背面剔除、重心坐标填充）
- 新增体素→遮挡三角形的几何生成函数
- 新增 AABB 可见性查询函数（查询深度缓冲判定遮挡）
- 更新 `ComputeOcclusion` N-API 接口：接收相机 FOV/近远裁剪面参数、建筑体素数据、树木列表
- 返回结果格式保持不变（`{ buildingIds, treeKeys }`）
- 更新 JS 端调用方传递新参数
- **BREAKING**: 建筑数据从 `{id, worldX, worldY, hw, hd, height}` 改为 `{id, worldX, worldY, solid[][][], voxelSize}`

## Impact
- Affected specs: 无（新建项目）
- Affected code:
  - `src/server/addons/occlusion.cpp` — 核心算法重写
  - `src/server/addons/occlusion.h` — 无变更（签名保持）
  - `src/server/addons/world_gen.cpp` — 可能需要更新 `computeOcclusion` 注册逻辑
  - `src/server/services/WorldGenService.ts` — 更新调用参数
  - `src/server/index.ts` — 更新 Socket.IO 事件处理
  - `src/buildings/BuildingWorld.tsx` — 更新发送数据格式
  - `src/components/Map2D.tsx` — 更新发送数据格式

---

## ADDED Requirements

### Requirement: 遮挡缓冲管理
系统 SHALL 维护一张低分辨率浮点深度图（默认 256×128），每帧清空为 1.0（最远深度）。

#### Scenario: 遮挡缓冲初始化
- **WHEN** `ComputeOcclusion` 被调用
- **THEN** 系统分配或复用一张 256×128 的浮点数组，所有元素初始化为 1.0

#### Scenario: 遮挡缓冲分辨率可配置
- **WHEN** 编译时或运行时指定分辨率
- **THEN** 系统使用指定分辨率（如 512×256）的缓冲

### Requirement: 三角形软件光栅化
系统 SHALL 将三角形三个顶点投影到屏幕空间，在遮挡缓冲上逐像素光栅化，使用深度测试（更近深度覆盖更远深度）。

#### Scenario: 顶点投影
- **WHEN** 给定世界坐标 (wx, wy, wz)、相机位置、FOV、宽高比、近远裁剪面
- **THEN** 系统将顶点变换为屏幕像素坐标 (px, py) 和线性深度值 depth（0.0=近，1.0=远）
- **WHEN** 顶点在相机后方（cz <= 0）
- **THEN** 系统跳过该三角形

#### Scenario: 背面剔除
- **WHEN** 三角形法向量与相机到三角形中心的向量点积 > 0
- **THEN** 系统跳过该三角形

#### Scenario: 逐像素光栅化
- **WHEN** 三角形投影到屏幕后
- **THEN** 系统计算屏幕空间包围矩形，对矩形内每个像素用重心坐标判断是否在三角形内
- **WHEN** 像素在三角形内且其插值深度 < 缓冲现有深度
- **THEN** 系统更新缓冲为该更小深度值

### Requirement: 体素建筑→遮挡三角形生成
系统 SHALL 从建筑体素数据（三维布尔数组）自动提取可见外表面，生成遮挡用三角形列表。

#### Scenario: 可见面提取
- **WHEN** 一个实心体素在某方向上的邻居为空或不存在
- **THEN** 系统为该体素该方向的面生成两个三角形（一个四边形）

#### Scenario: 合并共面四边形（可选优化）
- **WHEN** 相邻体素在同一方向上有可见面
- **THEN** 系统可将它们合并为更大的四边形以减少三角形数量

#### Scenario: 动态破坏后重生成
- **WHEN** 建筑体素数据发生变化（破坏或开门）
- **THEN** 下一帧 `ComputeOcclusion` 调用时基于最新体素数据重新生成三角形

### Requirement: AABB 可见性测试
系统 SHALL 将被测物体 AABB 的 8 个角点投影到屏幕，查询深度缓冲判定其是否被完全遮挡。

#### Scenario: AABB 投影
- **WHEN** 给定 AABB（min/max 坐标）
- **THEN** 系统计算 8 个角点的投影屏幕坐标和最近深度 `boxNearestDepth`
- **WHEN** 任意角点在相机后方
- **THEN** 保守判定为可见

#### Scenario: 深度缓冲查询
- **WHEN** 遍历 AABB 投影矩形内所有像素
- **THEN** 若存在任一像素 `bufferDepth > boxNearestDepth`，判定为可见
- **WHEN** 所有采样像素 `bufferDepth <= boxNearestDepth`
- **THEN** 判定为被遮挡

### Requirement: 玩家三采样点可见性
系统 SHALL 用头部（y=1.7）、躯干（y=1.1）、脚部（y=0.1）三个微小 AABB 测试玩家可见性，任一未被遮挡即认为可见。

#### Scenario: 玩家部分可见
- **WHEN** 头部 AABB 被遮挡但躯干 AABB 未被遮挡
- **THEN** 系统判定玩家可见（不加入遮挡列表）

#### Scenario: 玩家完全遮挡
- **WHEN** 头部、躯干、脚部三个 AABB 全部被遮挡
- **THEN** 系统将该建筑 ID 加入遮挡列表

### Requirement: 相机在建筑内部处理
系统 SHALL 检测相机是否在建筑内部，若是则不对该建筑本身进行玩家遮挡判定。

#### Scenario: 相机被建筑包围
- **WHEN** 相机位置在建筑体素范围内
- **THEN** 该建筑不构成对玩家的遮挡（玩家在该建筑内视为可见）

### Requirement: 遮挡体筛选
系统 SHALL 根据体积和距离筛选哪些建筑充当遮挡体写入深度缓冲。

#### Scenario: 小建筑排除
- **WHEN** 建筑高度 ≤ 2 米（或体积小于阈值）
- **THEN** 该建筑不生成遮挡三角形，不写入深度缓冲

#### Scenario: 远距离建筑排除
- **WHEN** 建筑距相机超过远裁剪面
- **THEN** 该建筑不参与遮挡体光栅化

### Requirement: N-API 接口扩展
系统 SHALL 扩展 `ComputeOcclusion` 接口接收相机投影参数和建筑体素数据，返回结果格式保持不变。

#### Scenario: 新参数接收
- **WHEN** JS 端调用 `computeOcclusion(camX, camZ, camY, playerX, playerY, fovY, near, far, aspect, buildings, trees)`
- **THEN** C++ 端正确解析所有参数并使用默认值回退缺失参数

#### Scenario: 建筑体素数据传递
- **WHEN** JS 端传递建筑的 `solid` 三维数组和 `voxelSize`
- **THEN** C++ 端从体素数据生成遮挡三角形
- **WHEN** JS 端未传递体素数据但传递了 `hw/hd/height`
- **THEN** C++ 端回退为包围盒近似（六个面）

## MODIFIED Requirements

### Requirement: ComputeOcclusion 核心流程
原有射线检测流程替换为：清空深度缓冲 → 筛选遮挡体 → 生成三角形并光栅化 → AABB 可见性测试 → 返回结果。

#### Scenario: 每帧执行流程
- **WHEN** `ComputeOcclusion` 被调用
- **THEN** 系统按序执行：
  1. 清空遮挡缓冲
  2. 遍历建筑：筛选遮挡体 → 生成三角形 → 光栅化到缓冲
  3. 遍历建筑：对每个建筑执行玩家三采样点 AABB 测试
  4. 遍历树木：对每棵树执行 AABB 遮挡测试
  5. 返回被遮挡的建筑 ID 和树木 key

## REMOVED Requirements

### Requirement: 射线-圆柱体相交检测
**Reason**: 圆柱体近似无法精确表示任意形状建筑，且不支持动态破坏后的体素形状变化。
**Migration**: 改为基于深度缓冲的 AABB 可见性查询，兼容任意形状。
