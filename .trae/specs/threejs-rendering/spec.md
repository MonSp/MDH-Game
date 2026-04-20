# Three.js (R3F) 2.5D Rendering Engine Spec

## Why
目前游戏的 2.5D 地图和角色渲染是基于纯 CSS Isometric Transform (DOM 节点) 实现的。虽然原型阶段开发速度快，但在实体数量增加（NPC、资源点、特效）时，DOM 渲染面临严重的性能瓶颈，且无法实现真实的光影、Z轴高度差（地形起伏）以及复杂的粒子特效。用户选择“方案二”：引入 Three.js 和 `@react-three/fiber`，将渲染系统升级为真 3D 引擎驱动的 2.5D 像素风视觉。

## What Changes
- [x] 安装 `three`, `@react-three/fiber`, `@react-three/drei` 等 3D 渲染依赖。
- [x] **BREAKING**: 重构 `Map2D.tsx`，移除所有的 DOM `<div>` 瓦片，替换为 R3F 的 `<Canvas>` 组件。
- [x] 引入 `OrthographicCamera`（正交相机）锁定 45 度等距视角，维持 2.5D 像素风视觉体验。
- [x] 使用 3D Mesh（如 BoxGeometry）替代原有的角色和地形 DOM，并结合真实的光照（DirectionalLight/AmbientLight）渲染。
- [x] 保留 Zustand 的状态驱动，将 R3F 组件直接绑定 `useGameStore` 状态流。
- [x] 将现有的 UI 面板（如 `HUD`, `MarketPanel`）与 3D Canvas 进行层级分离（HTML 浮层覆盖在 Canvas 之上）。

## Impact
- Affected specs: 游戏主循环渲染、视觉表现、地图交互
- Affected code: `src/components/Map2D.tsx`, `package.json`, `src/utils/appearance.ts`

## ADDED Requirements
### Requirement: 3D 场景与正交相机
系统必须提供一个锁定的等距 3D 视口，完美模拟 2.5D。
#### Scenario: 视角渲染
- **WHEN** 玩家进入 `/game` 页面。
- **THEN** 看到由 Three.js 渲染的场景，相机为 `OrthographicCamera`，角度锁定（如 `rotation={[-Math.PI/4, Math.PI/4, 0]}`），且渲染性能极高（60 FPS+）。

### Requirement: 基于状态的实体渲染
所有的 NPC、资源点和玩家必须以 3D 网格（Mesh）形式渲染。
#### Scenario: 实体更新
- **WHEN** Zustand 状态更新（如 NPC 移动、生成新的资源点）。
- **THEN** R3F 组件会自动响应并更新对应的 Mesh 位置、材质（颜色/光环）和大小。

## MODIFIED Requirements
### Requirement: 交互点击事件
原基于 DOM `onClick` 的交互必须迁移到 R3F 的网格点击系统。
- **Migration**: 将原有的 `onClick={() => setSelectedNPC(npc)}` 绑定到 R3F 的 `<mesh onClick={...}>` 上。

## REMOVED Requirements
### Requirement: CSS 3D Transforms
**Reason**: 性能差，无法支持复杂光影。
**Migration**: 彻底删除 `Map2D.tsx` 中的所有 `transform: 'rotateX(-60deg) rotateZ(45deg)'` 和绝对定位的 `left/top` CSS 样式。
