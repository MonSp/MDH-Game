# 可破坏体素建筑/墙体/树木系统 Spec

## Why
当前游戏中庄园围墙、建筑、树木均为不可破坏的整体。要实现"墙面敲洞"、"建筑部分摧毁"、"树被砍倒"等可破坏玩法，需要将围墙和建筑改造为体素方块系统。同时放弃遮挡透明化策略，改为建筑预留室内视觉空间 + 角色进入建筑时拉近相机来自然规避遮挡。

## 世界网格体系：三级递进

```
地图格 (3m × 3m × 3m, 27m³)
├── 大块 [0][0][0] = 1m³
│   ├── 小方块 [0][0][0] ≈ 33.3cm³
│   ├── 小方块 [0][0][1]
│   └── ... (3×3×3 = 27 个小方块)
├── 大块 [0][0][1]
└── ... (3×3×3 = 27 个大块)

每地图格 = 27 大块 = 729 小方块
小方块边长 = 1m / 3 ≈ 33.3cm
```

全局寻址：
```
globalSmallX = cellX × 9 + bigX × 3 + smallX
globalSmallY = cellY × 9 + bigY × 3 + smallY
globalSmallZ = cellZ × 9 + bigZ × 3 + smallZ
```

## What Changes
- 围墙与建筑统一体素化：以 ≈33.3cm³ 小方块为最小单元，按三级网格堆叠
- 方块 health 系统：不同材质拥有不同初始 health，health=0 时方块消失
- 无结构坍塌：方块只要有 health 就保留在空间中，不因周围方块消失而掉落
- **建筑预留室内空间**：建筑内部空心，角色可进入；屋顶/天花板留有可视开口
- **进入建筑拉近相机**：角色进入建筑时，相机自动切换为近距离视角，自然规避遮挡
- **移除 Ghost 遮挡透明化系统**：不再通过 C++ 遮挡检测 + 半透明渲染来穿透墙壁
- 树木 3D 建模：从纯 2D map 图标升级为 3D 模型（树干+树冠），支持站立/砍倒/树桩状态
- 同步协议：socket 事件传递方块级破坏状态
- 已完成的围墙分段（4 面墙独立 ghost）**不再需要**，围墙按 4 面独立仅用于破坏管理

## Impact
- Affected code:
  - `src/buildings/BuildingTypes.ts` — 新增 `MaterialType`、`BlockState`、`VoxelGrid` 类型及网格寻址函数，**移除全局 ghostMode 相关字段**
  - `src/buildings/BuildingGeometry.tsx` — 体素方块渲染、建筑室内空间、树木 3D，**移除 CompoundWalls ghostWalls**
  - `src/buildings/BuildingWorld.tsx` — 相机拉近逻辑，**移除 occlusion:compute 调用和 ghostedIds**
  - `src/buildings/BuildingStore.ts` — 全局破坏状态存储，**移除 ghost 相关状态**
  - `src/server/index.ts` — socket 破坏事件路由，**移除 occlusion:compute 处理**
  - `src/server/services/WorldGenService.ts` — **移除 computeOcclusion 方法**
  - `src/server/addons/occlusion.cpp` — **可考虑废弃或仅保留深度缓冲用于其他目的**
  - `src/components/Map2D.tsx` — 树木 3D 渲染替代 2D 图标

## ADDED Requirements

### Requirement: 三级网格坐标系
系统 SHALL 使用三级递进网格定义世界空间：地图格 3m³ → 大块 1m³（每格 27 个）→ 小方块 ≈33.3cm³（每大块 27 个）。建筑和围墙均以小方块为最小建模单元。

#### Scenario: 全局坐标转换
- **GIVEN** 地图格坐标 `(cellX=105, cellY=0, cellZ=90)`，大块坐标 `(1, 0, 2)`，小方块坐标 `(2, 1, 0)`
- **WHEN** 计算全局小方块坐标
- **THEN** `globalSmallX = 105×9 + 1×3 + 2 = 950`，`globalSmallY = 0×9 + 0×3 + 1 = 1`，`globalSmallZ = 90×9 + 2×3 + 0 = 816`

#### Scenario: 庄园围墙尺寸换算
- **GIVEN** 庄园围墙为 24m × 18m × 3m（北/南墙 24m×3m，东/西墙 18m×3m）
- **WHEN** 以小方块（≈33.3cm）为单位计算
- **THEN** 北/南墙每面 = 72×9×2 小方块，东/西墙每面 = 54×9×2 小方块（墙厚取 2 块 ≈ 66cm）

### Requirement: 建筑室内视觉空间
系统 SHALL 为建筑设计空心室内空间，确保角色进入后相机有足够视野。建筑地板、墙壁、屋顶由体素方块构成，内部留空。

#### Scenario: 街区建筑室内空间
- **GIVEN** 街区建筑占地约 9×9×9 小方块（≈3m³），入口在某一侧
- **WHEN** 体素化生成
- **THEN** 外墙+屋顶+地板由方块构成，内部 7×7×7 区域留空作为室内空间；入口侧预留门洞

#### Scenario: 庄园主殿室内空间
- **GIVEN** 庄园 `manor@315,270_main-hall` 占地约 15×12×12 小方块（≈5m×4m×4m）
- **WHEN** 体素化生成
- **THEN** 内部空心，角色可从城门进入院内再进入主殿内部

#### Scenario: 围墙内的庄园院落
- **GIVEN** 庄园围墙围合 24m×18m 区域
- **WHEN** 角色通过城门进入围墙内部
- **THEN** 院内空间空旷（仅有内部建筑），视野开阔；相机可保持正常距离

### Requirement: 进入建筑拉近相机
系统 SHALL 在角色进入建筑内部时，自动将相机拉近到适合室内视角的距离，以自然规避墙壁遮挡。

#### Scenario: 角色进入街区建筑
- **GIVEN** 角色在世界中行走，相机距离为默认值（如 8m）
- **WHEN** 角色进入建筑室内区域（碰撞体触发）
- **THEN** 相机平滑拉近至室内距离（如 2m），可旋转查看室内细节

#### Scenario: 角色离开建筑
- **GIVEN** 角色在建筑内，相机距离为 2m
- **WHEN** 角色走出建筑
- **THEN** 相机平滑恢复至默认室外距离

#### Scenario: 围墙院内不触发拉近
- **GIVEN** 角色进入围墙院落（仅进入围墙内部，未进入具体建筑内）
- **WHEN** 角色在院内活动
- **THEN** 相机保持默认室外距离（院落空间足够大，无遮挡）

### Requirement: 体素方块定义
系统 SHALL 将围墙和建筑以 ≈33.3cm³ 小方块堆叠表达，每个方块由 `(materialType, health)` 定义。方块数据存储为扁平 `BlockState[]` 数组。

#### Scenario: 庄园围墙北墙的体素化
- **GIVEN** 庄园围墙北墙尺寸为 72×9×2 小方块
- **WHEN** 体素化生成
- **THEN** 生成 72×9×2 = 1296 个 `stone` 材质小方块

### Requirement: 材质与 health 系统
系统 SHALL 为每种材质定义基础 health 值，每个方块独立记录当前 health。方块 health 归零时从空间中消失，不影响相邻方块。

#### Scenario: 材质基础 health 表
- **WHEN** 系统初始化
- **THEN** 基础 health 为：`stone=150`, `wood=40`, `earth=20`, `metal=300`, `thatch=5`

### Requirement: 无结构坍塌
系统 SHALL 保持每个方块独立存在：方块只要 health > 0 就保留在原位，不因四周/下方方块消失而掉落或破坏。

### Requirement: 体素方块渲染
系统 SHALL 为每个存在的方块渲染一个 ≈33.3cm³ 的 BoxGeometry，使用与材质对应的颜色，采用 GPU InstancedMesh 按材质分组合并以减少 draw call。

#### Scenario: 合并渲染同材质方块
- **GIVEN** 庄园围墙北墙有 1296 个 `stone` 方块，其中 30 个已被破坏
- **WHEN** 渲染该墙
- **THEN** 1266 个 stone 方块通过一个 InstancedMesh 一次性渲染（1 个 draw call）

### Requirement: 树木 3D 建模与状态管理
系统 SHALL 将树木从 2D Map 图标升级为 3D 模型（树干 BoxGeometry + 树冠 ConeGeometry），并支持四种状态：standing、falling、fallen、stump。

### Requirement: 破坏状态同步协议
系统 SHALL 通过 socket 事件在客户端和服务器之间同步方块级破坏状态。

#### Scenario: 客户端请求破坏方块
- **GIVEN** 玩家对墙体某位置方块发起攻击
- **WHEN** 客户端发送 `destruct:apply` 事件（包含目标 buildingId、墙面方向、局部坐标 `[lx, ly, lz]`）
- **THEN** 服务器验证并更新方块 health，广播给所有客户端

### Requirement: 破坏状态数据结构
系统 SHALL 定义以下数据类型来管理方块级破坏状态。

```typescript
type MaterialType = 'stone' | 'wood' | 'earth' | 'metal' | 'thatch';

const MATERIAL_BASE_HEALTH: Record<MaterialType, number> = {
  stone: 150, wood: 40, earth: 20, metal: 300, thatch: 5,
};

interface BlockState {
  material: MaterialType;
  health: number;
}

interface VoxelGrid {
  dimX: number; dimY: number; dimZ: number;
  originX: number; originY: number; originZ: number;
  blocks: BlockState[];  // 扁平索引 = lx + ly*dimX + lz*dimX*dimY
}

function cellToWorld(cx: number, cy: number, cz: number): [number, number, number] {
  return [cx * 3, cy * 3, cz * 3];
}
```

## REMOVED Requirements

### Requirement: Ghost 遮挡透明化系统
**Reason**: 采用"建筑室内空间 + 拉近相机"策略后，不再需要射线检测墙壁遮挡并将墙壁半透明化。相机拉近到室内后自然不存在遮挡问题。
**Migration**:
- `occlusion.cpp` 的 `ghostBuildingIds` 逻辑移除，深度缓冲部分可保留备用
- `BuildingWorld.tsx` 的 `occlusion:compute` socket 调用移除
- `BuildingGeometry.tsx` 的 `ghostWalls` prop 和 `ghostMode` 相关逻辑移除
- `BuildingGeometryProps` 接口移除 `ghostMode` 和 `ghostWalls`
- `server/index.ts` 的 `occlusion:compute` 事件处理移除
- `WorldGenService.ts` 的 `computeOcclusion` 方法移除

### Requirement: 庄园围墙分段 Ghost 检测
**Reason**: 围墙分段 Ghost 检测（`manor@315,270#north` 带方向后缀 ID）是为遮挡透明化服务的。去掉该策略后，围墙的 4 面拆分仅用于破坏管理（攻击北墙只影响北墙方块），不再需要生成带方向的 ghost ID。是否在 C++ 中保留分段取决于是否有其他用途（如建筑几何生成）。
