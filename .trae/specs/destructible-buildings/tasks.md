# Tasks: 可破坏体素建筑/墙体/树木系统

## Phase 1: 体素方块数据结构与渲染
- [ ] Task 1: 定义 MaterialType、BlockState、VoxelGrid 类型
  - [ ] 在 `BuildingTypes.ts` 中新增 `MaterialType` 联合类型（stone/wood/earth/metal/thatch）
  - [ ] 新增 `MATERIAL_BASE_HEALTH` 常量表（stone=150, wood=40, earth=20, metal=300, thatch=5）
  - [ ] 新增 `BlockState` 接口（material, health）
  - [ ] 新增 `VoxelGrid` 接口（dimX, dimY, dimZ, originX/Y/Z, blocks: BlockState[]）

- [ ] Task 2: 实现围墙体素生成函数
  - [ ] 编写 `generateWallVoxels(width, height, depth, material)` 函数
  - [ ] 根据墙尺寸（长×高×厚，单位为小方块数）生成 VoxelGrid
  - [ ] 北/南墙 72×9×2，东/西墙 54×9×2

- [ ] Task 3: 实现建筑体素生成函数（含室内空间）
  - [ ] 编写 `generateBuildingVoxels(width, height, depth, wallThickness, materials)` 函数
  - [ ] 生成空心建筑：外墙+屋顶+地板由方块构成，内部留空
  - [ ] 入口侧预留门洞（无方块）
  - [ ] 不同部位使用不同材质（地基=stone，墙体=wood，屋顶=thatch）

- [ ] Task 4: 实现 InstancedMesh 体素渲染组件
  - [ ] 创建 `VoxelRenderer` 组件，接收 `VoxelGrid`
  - [ ] 按材质分组，每种材质创建一个 `InstancedMesh`
  - [ ] 为每个存在（health > 0）的方块设置实例矩阵
  - [ ] 方块被破坏时重建 instance 矩阵（不存在方块不渲染）

- [ ] Task 5: 改造 CompoundWalls 使用体素渲染
  - [ ] 将 `CompoundWalls` 中的 `WallSegment` 替换为 `VoxelRenderer`
  - [ ] 围墙仍按 4 面独立管理，每面一个 VoxelGrid
  - [ ] 保留 GatePillars 非体素渲染（gate 尺寸小，暂不体素化）

- [ ] Task 6: 改造 GuoGridBuildings 使用体素渲染
  - [ ] 将原来单个 BoxGeometry 的街区建筑替换为 `VoxelRenderer`
  - [ ] 每个建筑生成空心室内空间的 VoxelGrid
  - [ ] 入口侧留门洞

## Phase 2: 清理 Ghost 遮挡透明化系统
- [ ] Task 7: 清理前端 Ghost 代码
  - [ ] 从 `BuildingTypes.ts` / `BuildingGeometry.tsx` 移除 `BuildingGeometryProps` 的 `ghostMode`、`ghostWalls` 字段
  - [ ] 从 `BuildingGeometry.tsx` 移除 `GhostProps` 接口和 `useLayoutEffect` 中 `ghostMode` 透明化逻辑
  - [ ] 从 `BuildingWorld.tsx` 移除 `occlusion:compute` socket 调用、`ghostedIds` state、`ghostWallMap`
  - [ ] 从 `BuildingStore.ts` 移除 ghost 相关状态

- [ ] Task 8: 清理后端 Ghost 代码
  - [ ] 从 `server/index.ts` 移除 `occlusion:compute` socket 事件处理
  - [ ] 从 `WorldGenService.ts` 移除 `computeOcclusion` 方法
  - [ ] 从 `occlusion.cpp` 移除 `ghostBuildingIds` / Ghost 射线检测逻辑（保留深度缓冲部分备用）
  - [ ] 移除 `occlusion.cpp` 中的 `rayHitsAABB` 函数（不再需要）

## Phase 3: 相机拉近系统
- [ ] Task 9: 实现建筑室内碰撞检测
  - [ ] 为每个建筑生成室内碰撞体（基于 VoxelGrid 内部空心区域的 AABB）
  - [ ] 通过 `BuildingStore` 或碰撞检测判断角色当前位于哪个建筑内部
  - [ ] 区分"围墙院内"（不触发拉近）和"建筑室内"（触发拉近）

- [ ] Task 10: 实现相机距离平滑切换
  - [ ] 在 `BuildingWorld.tsx` 或相机管理组件中监听 `playerInsideBuilding`
  - [ ] 室外默认距离（如 8m），室内距离（如 2m）
  - [ ] 使用 `MathUtils.lerp` 或 tween 平滑过渡
  - [ ] 角色离开建筑时平滑恢复外部距离

## Phase 4: 破坏状态管理与同步
- [ ] Task 11: 全局破坏状态存储
  - [ ] 在 `BuildingStore.ts` 中新增 `blockStates: Map<string, VoxelGrid>` 存储
  - [ ] 新增 action: `applyDamage(buildingId, dir, lx, ly, lz, damage)`
  - [ ] 新增 action: `updateBlockStates(updates: BlockUpdate[])`

- [ ] Task 12: Socket 破坏事件路由
  - [ ] 在 `server/index.ts` 中新增 `destruct:apply` 事件处理
  - [ ] 在 `server/index.ts` 中新增 `destruct:update` 广播逻辑
  - [ ] 服务器端验证破坏请求（范围校验、速率限制）

- [ ] Task 13: 客户端破坏交互对接
  - [ ] 在 `BuildingWorld.tsx` 中监听 `destruct:update` 事件并更新 store
  - [ ] 确保 `VoxelRenderer` 在 blockStates 变化后重建 InstancedMesh

## Phase 5: 树木 3D 建模
- [ ] Task 14: 树木 3D 模型与枚举
  - [ ] 在 `BuildingTypes.ts` 中新增 `TreeState = 'standing' | 'falling' | 'fallen' | 'stump'`
  - [ ] 创建 `TreeMesh.tsx` 组件：树干 BoxGeometry + 树冠 ConeGeometry
  - [ ] 支持不同树状态渲染

- [ ] Task 15: Map2D 集成 3D 树木
  - [ ] 在 `Map2D.tsx` 中将树木从 2D 图标替换为 `TreeMesh` 3D 组件
  - [ ] 树木破坏状态通过 store 同步

## Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 2], [Task 4]
- [Task 6] depends on [Task 3], [Task 4]
- [Task 7] 无依赖，可并行
- [Task 8] 无依赖，可并行
- [Task 9] depends on [Task 3]（需要室内空间边界信息）
- [Task 10] depends on [Task 9]
- [Task 11] depends on [Task 1]
- [Task 12] depends on [Task 11]
- [Task 13] depends on [Task 12]
- [Task 14] 无依赖，可并行
- [Task 15] depends on [Task 14]

## 可并行执行的任务组
- 组 A: [Task 1, Task 14, Task 7, Task 8] — 类型定义、树木模型、Ghost 清理互不依赖
- 组 B: [Task 2, Task 3, Task 4] — 依赖 Task 1，但彼此独立
- 组 C: [Task 5, Task 6, Task 11] — 渲染改造和状态存储可并行
