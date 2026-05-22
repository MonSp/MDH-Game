import { getRealmAura, getRoleAppearance } from '../utils/appearance';
import type { Realm, MonsterType } from '../store/gameConstants';

export const VOXEL_SIZE = 0.25;

export interface VoxelBlock {
  x: number;
  y: number;
  z: number;
  color: string;
}

export interface VoxelModel {
  blocks: VoxelBlock[];
  totalHeight: number;
}

function hexToColor(hex: string, offset: number = 0): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + offset));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + offset));
  const b = Math.min(255, Math.max(0, (num & 0xFF) + offset));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function buildHumanoidModel(realm: Realm, role: string): VoxelModel {
  const { bodyHexColor, hairHexColor, skinHexColor, hasBun } = getRoleAppearance(role);
  const beltColor = role === '家主' || role === '长老' || role === '执法堂长老' ? '#fbbf24' : hexToColor(bodyHexColor, 20);

  const blocks: VoxelBlock[] = [];

  const addBlock = (x: number, y: number, z: number, color: string) => {
    blocks.push({ x, y, z, color });
  };

  const bodyShade = (x: number, y: number, z: number) => {
    const shade = (x < 0 ? -15 : x > 0 ? 10 : 0) + (z > 0 ? -10 : 0);
    return hexToColor(bodyHexColor, shade);
  };

  const skinShade = (x: number, y: number, z: number) => {
    const shade = (x < 0 ? -15 : x > 0 ? 10 : z > 0 ? -10 : 0);
    return hexToColor(skinHexColor, shade);
  };

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = 0; dz <= 1; dz++) {
      for (let dy = 0; dy < 3; dy++) {
        addBlock(dx, dy, dz, bodyShade(dx, dy, dz));
      }
    }
  }

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = 0; dz <= 1; dz++) {
      addBlock(dx, 3, dz, bodyShade(dx, 3, dz));
    }
  }

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = 0; dz <= 1; dz++) {
      for (let dy = 5; dy <= 7; dy++) {
        addBlock(dx, dy, dz, skinShade(dx, dy, dz));
      }
    }
    if (hasBun) {
      addBlock(dx, 8, 1, hairHexColor);
    }
  }

  addBlock(0, 8, 0, hexToColor(hairHexColor, 20));

  addBlock(-2, 3, 0, skinShade(-2, 3, 0));
  addBlock(-2, 4, 0, skinShade(-2, 4, 0));
  addBlock(2, 3, 0, skinShade(2, 3, 0));
  addBlock(2, 4, 0, skinShade(2, 4, 0));

  addBlock(-1, 0, 0, bodyShade(-1, 0, 0));
  addBlock(-1, 1, 0, bodyShade(-1, 1, 0));
  addBlock(1, 0, 0, bodyShade(1, 0, 0));
  addBlock(1, 1, 0, bodyShade(1, 1, 0));

  addBlock(-1, 4, 0, beltColor);
  addBlock(0, 4, 0, beltColor);
  addBlock(1, 4, 0, beltColor);

  for (let dx = -1; dx <= 1; dx++) {
    addBlock(dx, 5, 1, '#000000');
  }
  addBlock(1, 6, 1, '#ffffff');
  addBlock(-1, 6, 1, '#ffffff');

  return {
    blocks,
    totalHeight: hasBun ? 9 : 8,
  };
}

export function buildPlayerModel(realm: Realm, role: string): VoxelModel {
  const base = buildHumanoidModel(realm, role);

  const extraBlocks: VoxelBlock[] = [
    { x: -2, y: 0, z: 0, color: '#d97706' },
    { x: 2, y: 0, z: 0, color: '#d97706' },
    { x: -1, y: 2, z: 1, color: '#fbbf24' },
    { x: 1, y: 2, z: 1, color: '#fbbf24' },
  ];

  return {
    blocks: [...base.blocks, ...extraBlocks],
    totalHeight: base.totalHeight,
  };
}

function snakeBody(x: number, y: number, colors: string[]): VoxelBlock[] {
  const blocks: VoxelBlock[] = [];
  for (let i = 0; i < 8; i++) {
    const yOff = Math.round(Math.sin(i * 0.8) * 1);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (Math.abs(dx) + Math.abs(dz) <= 2) {
          blocks.push({ x: i - 3 + dx, y: y + yOff + dz, z: 0, color: colors[(i + dz + 12) % colors.length] });
        }
      }
    }
  }
  return blocks;
}

const MONSTER_MODELS: Record<string, VoxelModel> = {
  '赤焰蛇': {
    blocks: (() => {
      const blocks: VoxelBlock[] = [];
      const colors = ['#dc2626', '#ea580c', '#dc2626'];
      blocks.push(...snakeBody(0, 3, colors));
      blocks.push({ x: 5, y: 3, z: 0, color: '#f97316' });
      blocks.push({ x: 5, y: 4, z: 0, color: '#f97316' });
      blocks.push({ x: 6, y: 3, z: 0, color: '#fbbf24' });
      blocks.push({ x: 6, y: 4, z: 0, color: '#fbbf24' });
      return blocks;
    })(),
    totalHeight: 6,
  },
  '冰晶蝎': {
    blocks: (() => {
      const blocks: VoxelBlock[] = [];
      for (let y = -1; y <= 1; y++) {
        for (let x = -2; x <= 2; x++) {
          for (let z = -1; z <= 1; z++) {
            if (Math.abs(x) + Math.abs(z) <= 3 && (x + y + z) % 3 !== 0) {
              blocks.push({ x, y, z, color: '#06b6d4' });
            }
          }
        }
      }
      for (let i = 0; i < 3; i++) {
        blocks.push({ x: -3, y: -1 + i, z: 0, color: '#0891b2' });
        blocks.push({ x: 3, y: -1 + i, z: 0, color: '#0891b2' });
      }
      for (let i = 0; i < 3; i++) {
        blocks.push({ x: 0, y: 2 + i, z: 0, color: '#0284c7' });
        blocks.push({ x: 0, y: 2 + i, z: 1, color: '#0284c7' });
      }
      blocks.push({ x: 0, y: 5, z: 0, color: '#fef08a' });
      blocks.push({ x: 0, y: 5, z: 1, color: '#fef08a' });
      return blocks;
    })(),
    totalHeight: 6,
  },
  '幽冥狼': {
    blocks: (() => {
      const blocks: VoxelBlock[] = [];
      for (let x = -2; x <= 2; x++) {
        for (let y = 0; y <= 2; y++) {
          for (let z = -1; z <= 1; z++) {
            if (Math.abs(x) + Math.abs(z) <= 4) {
              blocks.push({ x, y, z, color: '#581c87' });
            }
          }
        }
      }
      for (let x = -1; x <= 1; x++) {
        for (let y = 3; y <= 4; y++) {
          for (let z = -1; z <= 1; z++) {
            if (Math.abs(x) + Math.abs(z) <= 3) {
              blocks.push({ x, y, z, color: '#6b21a8' });
            }
          }
        }
      }
      blocks.push({ x: -1, y: 5, z: 0, color: '#6b21a8' });
      blocks.push({ x: 1, y: 5, z: 0, color: '#6b21a8' });
      blocks.push({ x: -2, y: 3, z: 0, color: '#6b21a8' });
      blocks.push({ x: 2, y: 3, z: 0, color: '#6b21a8' });
      for (let i = 0; i < 3; i++) {
        blocks.push({ x: 3 + i, y: 1, z: 0, color: '#a855f7' });
        if (i < 2) blocks.push({ x: 3 + i, y: 0, z: 0, color: '#a855f7' });
      }
      blocks.push({ x: -2, y: 4, z: 1, color: '#ffffff' });
      blocks.push({ x: 2, y: 4, z: 1, color: '#ffffff' });
      return blocks;
    })(),
    totalHeight: 6,
  },
  '雷纹虎': {
    blocks: (() => {
      const blocks: VoxelBlock[] = [];
      for (let x = -2; x <= 2; x++) {
        for (let y = 0; y <= 2; y++) {
          for (let z = -1; z <= 1; z++) {
            if (Math.abs(x) + Math.abs(z) <= 4) {
              const isStripe = (x === -1 || x === 1) && (y === 0 || y === 1);
              blocks.push({ x, y, z, color: isStripe ? '#451a03' : '#d97706' });
            }
          }
        }
      }
      for (let x = -1; x <= 1; x++) {
        for (let y = 3; y <= 4; y++) {
          for (let z = -1; z <= 1; z++) {
            if (Math.abs(x) + Math.abs(z) <= 3) {
              blocks.push({ x, y, z, color: '#d97706' });
            }
          }
        }
      }
      blocks.push({ x: -1, y: 5, z: 0, color: '#f59e0b' });
      blocks.push({ x: 0, y: 5, z: 0, color: '#f59e0b' });
      blocks.push({ x: 1, y: 5, z: 0, color: '#f59e0b' });
      blocks.push({ x: -1, y: 6, z: 0, color: '#f59e0b' });
      blocks.push({ x: 1, y: 6, z: 0, color: '#f59e0b' });
      return blocks;
    })(),
    totalHeight: 7,
  },
  '血玉蛛': {
    blocks: (() => {
      const blocks: VoxelBlock[] = [];
      for (let y = -1; y <= 1; y++) {
        for (let x = -2; x <= 2; x++) {
          for (let z = -2; z <= 2; z++) {
            const dist = x * x + z * z + y * y;
            if (dist <= 6) {
              const isJewel = Math.abs(x) <= 1 && Math.abs(z) <= 1 && y === 0;
              blocks.push({ x, y, z, color: isJewel ? '#dc2626' : '#991b1b' });
            }
          }
        }
      }
      for (let leg = 0; leg < 4; leg++) {
        const angle = (leg / 4) * Math.PI * 2 + 0.4;
        for (let i = 1; i <= 3; i++) {
          const lx = Math.round(Math.cos(angle) * (2 + i));
          const lz = Math.round(Math.sin(angle) * (2 + i));
          blocks.push({ x: lx, y: 0, z: lz, color: '#7f1d1d' });
        }
      }
      return blocks;
    })(),
    totalHeight: 6,
  },
  '玄冰蟒': {
    blocks: (() => {
      const blocks: VoxelBlock[] = [];
      const colors = ['#0ea5e9', '#0284c7', '#7dd3fc'];
      for (let i = 0; i < 10; i++) {
        const yOff = Math.round(Math.sin(i * 0.5) * 1);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
              if (Math.abs(dx) + Math.abs(dz) <= 2) {
                blocks.push({
                  x: i - 4 + dx,
                  y: 2 + yOff + dy,
                  z: dz,
                  color: colors[(i + dx + dy + 6) % 3],
                });
              }
            }
          }
        }
      }
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = 0; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            if (Math.abs(dx) + Math.abs(dz) <= 2) {
              blocks.push({ x: 6 + dx, y: 3 + dy, z: dz, color: '#0ea5e9' });
            }
          }
        }
      }
      return blocks;
    })(),
    totalHeight: 8,
  },
  '金翅大鹏': {
    blocks: (() => {
      const blocks: VoxelBlock[] = [];
      for (let x = -1; x <= 1; x++) {
        for (let y = 0; y <= 2; y++) {
          for (let z = -1; z <= 1; z++) {
            if (Math.abs(x) + Math.abs(z) <= 3) {
              blocks.push({ x, y, z, color: '#d97706' });
            }
          }
        }
      }
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 1; i <= 4; i++) {
          for (let dy = -1; dy <= 0; dy++) {
            blocks.push({ x: side * (1 + i), y: 1 + dy, z: 0, color: '#f59e0b' });
            if (i <= 3) blocks.push({ x: side * (1 + i), y: 1 + dy, z: side, color: '#f59e0b' });
          }
        }
        blocks.push({ x: side * 5, y: 2, z: 0, color: '#fef08a' });
        blocks.push({ x: side * 5, y: 2, z: side, color: '#fef08a' });
      }
      blocks.push({ x: 0, y: 3, z: 0, color: '#d97706' });
      blocks.push({ x: 0, y: 4, z: 0, color: '#fbbf24' });
      blocks.push({ x: 0, y: 4, z: 1, color: '#fbbf24' });
      return blocks;
    })(),
    totalHeight: 7,
  },
};

export function getMonsterVoxelModel(type: MonsterType): VoxelModel {
  return MONSTER_MODELS[type] || MONSTER_MODELS['赤焰蛇'];
}
