## 1. 架构设计

```mermaid
graph TD
    subgraph "前端应用 (Frontend - React + 2.5D Render)"
        A["React App"]
        B["UI 组件层 (Tailwind CSS)"]
        C["2.5D 游戏渲染层 (CSS Isometric / Canvas)"]
        D["状态管理 (Zustand)"]
        A --> B
        A --> C
        A --> D
    end
    subgraph "后端服务模拟 (Mock Backend)"
        E["游戏逻辑服务器 (模拟)"]
        F["NPC 自治演算引擎 (模拟)"]
        G["玩家数据存储 (Local/Mock)"]
    end
    C <-->|"状态同步"| E
    E --> F
    E --> G
```

## 2. 技术栈说明
- **前端框架**: React@18 + Vite
- **样式方案**: TailwindCSS@3 + Lucide React (图标)
- **游戏渲染**: 采用 CSS Isometric Transform (等距变换) 配合 React 渲染简单的 2.5D 像素风网格地图。无需引入复杂重型引擎，保持原型轻量。
- **状态管理**: Zustand (用于管理玩家属性、背包、NPC状态、家族声望等复杂游戏数据)。
- **字体与资源**: 引入开源像素字体，利用 CSS 滤镜和渐变生成像素风占位图与素材。

## 3. 路由定义
| 路由 | 用途 |
|-------|---------|
| `/` | 登录与选服页面，展示服务器状态 |
| `/game` | 核心游戏主界面，包含2.5D地图视窗、角色HUD、NPC交互菜单等 |

## 4. 核心数据模型 (前端状态/模拟后端)
### 4.1 数据模型定义

```mermaid
erDiagram
    PLAYER {
        string id
        string name
        int hp
        int mp
        string realm "境界"
        string body_type "体质"
        string clan_id "所属家族"
    }
    CLAN {
        string id
        string name
        string country "所属国家"
        int level "家族层级"
        int reputation "玩家好感度"
    }
    NPC {
        string id
        string name
        string role "身份(家主/支脉)"
        int power "战斗力"
        string status "当前状态"
    }
    PLAYER ||--o{ CLAN : "belongs_to"
    CLAN ||--|{ NPC : "contains"
    PLAYER ||--o{ NPC : "interacts"
```

### 4.2 核心状态结构 (TypeScript)
```typescript
interface Player {
  id: string;
  name: string;
  realm: string; // 凡人, 练气, 筑基, 金丹...
  bodyType: '凡体' | '仙体'; // 初始为凡体
  country: string; // 战国七国之一 (秦、楚、齐、燕、赵、魏、韩)
  clanId: string; // 随机分配至某一家族支脉
  stats: { hp: number; maxHp: number; mp: number; maxMp: number; attack: number };
  position: { x: number; y: number }; // 2.5D坐标
}

interface Clan {
  id: string;
  name: string;
  country: string;
  type: '皇族' | '1级' | '2级' | '3级';
  reputation: number; // 家族对玩家的整体友好度 (过低会引发追杀)
}

interface NPC {
  id: string;
  clanId: string;
  name: string;
  role: '家主' | '长老' | '精英' | '支脉子弟';
  power: number; // 战斗力，后台自动演算成长
  activity: string; // 当前演算状态，如"正在闭关"、"外出历练"
  position: { x: number; y: number };
}
```
