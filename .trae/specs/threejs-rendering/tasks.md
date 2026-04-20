# Tasks

- [x] Task 1: 安装依赖并初始化 3D Canvas
  - [x] SubTask 1.1: 运行 `npm install three @react-three/fiber @react-three/drei @types/three`。
  - [x] SubTask 1.2: 在 `Map2D.tsx` 中引入 `<Canvas>`，并配置 `OrthographicCamera` 以实现等距（Isometric）视角。

- [x] Task 3: 渲染基础 3D 地形网格
  - [x] SubTask 3.1: 在 Canvas 中添加光源（`AmbientLight` 和 `DirectionalLight` 带阴影）。
  - [x] SubTask 3.2: 创建一个基础的地面 Mesh（接收阴影），并根据玩家坐标动态生成可见范围内的装饰性地形（如高低起伏的方块）。

- [x] Task 4: 迁移实体渲染（玩家、NPC、资源点、都城）
  - [x] SubTask 4.1: 创建 `PlayerMesh`, `NPCMesh`, `ResourceMesh` 等 R3F 子组件，绑定 Zustand 状态。
  - [x] SubTask 4.2: 将 2D 坐标（x, y）映射到 3D 世界坐标（如 x, 0, z）。
  - [x] SubTask 4.3: 为 `NPCMesh` 绑定 `onClick` 事件以支持原有的交互弹窗，并使用 HTML 标签（来自 `drei` 的 `<Html>`）显示角色名称和状态气泡。
  - [x] SubTask 4.4: 适配 `appearance.ts` 的规则，将颜色字符串转换为 Three.js 的材质颜色，光环转换为发光平面。

# Task Dependencies
- Task 3 和 4 强依赖于 Task 1 成功挂载 R3F Canvas。
- 所有的 3D 组件必须作为 `<Canvas>` 的子组件运行。
