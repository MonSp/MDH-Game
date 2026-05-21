import { BlockType, CHUNK_SIZE, worldToChunk, worldToBlockLocal } from './BlockTypes';

export const STRUCTURE_ZONE_SIZE = 64;

export enum StructureKind {
  NONE,
  TREE_OAK,
  TREE_PINE,
  TREE_CHERRY,
  TREE_BIRCH,
  HOUSE_SMALL,
  HOUSE_MEDIUM,
  HOUSE_LARGE,
  WATCHTOWER,
  GATEHOUSE,
  MANOR,
  TEMPLE,
  PAGODA,
  CITY_WALL,
  CAPITAL_PALACE,
  CAPITAL_CITY,
}

interface StructureZone {
  kind: StructureKind;
  zoneCX: number;
  zoneCZ: number;
  baseY: number;
}

function hash2D(x: number, z: number): number {
  let h = x * 374761393 + z * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return h ^ (h >> 16);
}

function hashFloat(x: number, z: number): number {
  return (hash2D(x, z) & 0x7fffffff) / 0x7fffffff;
}

function pickFrom<T>(arr: T[], x: number, z: number): T {
  return arr[Math.abs(hash2D(x, z)) % arr.length];
}

function fillBlock(
  blocks: Uint8Array,
  cx: number, cy: number, cz: number,
  wx: number, wy: number, wz: number,
  type: BlockType,
) {
  const { cx: bcx, cy: bcy, cz: bcz } = worldToChunk(wx, wy, wz);
  if (bcx !== cx || bcy !== cy || bcz !== cz) return;
  const { bx, by, bz } = worldToBlockLocal(wx, wy, wz);
  blocks[by * CHUNK_SIZE * CHUNK_SIZE + bz * CHUNK_SIZE + bx] = type;
}

function fillBlockIf(
  blocks: Uint8Array,
  cx: number, cy: number, cz: number,
  wx: number, wy: number, wz: number,
  type: BlockType, condition: boolean,
) {
  if (condition) fillBlock(blocks, cx, cy, cz, wx, wy, wz, type);
}

function setBlockIfAir(
  blocks: Uint8Array,
  cx: number, cy: number, cz: number,
  wx: number, wy: number, wz: number,
  type: BlockType,
) {
  const { cx: bcx, cy: bcy, cz: bcz } = worldToChunk(wx, wy, wz);
  if (bcx !== cx || bcy !== cy || bcz !== cz) return;
  const { bx, by, bz } = worldToBlockLocal(wx, wy, wz);
  const idx = by * CHUNK_SIZE * CHUNK_SIZE + bz * CHUNK_SIZE + bx;
  if (blocks[idx] === BlockType.AIR) {
    blocks[idx] = type;
  }
}

function makeOakTree(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, height: number, rng: () => number,
) {
  const trunkH = height;
  for (let y = 0; y < trunkH; y++) {
    fillBlock(blocks, cx, cy, cz, ox, oy + y, oz, BlockType.OAK_LOG);
  }
  const leafStart = trunkH - 2;
  const leafRadius = 2 + (rng() > 0.5 ? 1 : 0);
  for (let dy = -1; dy <= 2; dy++) {
    const ly = oy + leafStart + dy;
    const r = dy <= 0 ? leafRadius + 1 : leafRadius;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx * dx + dz * dz > (dy <= 0 ? (r - 0.5) * (r - 0.5) : r * r)) continue;
        if (dx === 0 && dz === 0 && dy >= 0) continue;
        setBlockIfAir(blocks, cx, cy, cz, ox + dx, ly, oz + dz, BlockType.OAK_LEAVES);
      }
    }
  }
}

function makePineTree(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, height: number, _rng: () => number,
) {
  for (let y = 0; y < height; y++) {
    fillBlock(blocks, cx, cy, cz, ox, oy + y, oz, BlockType.SPRUCE_LOG);
  }
  for (let layer = 0; layer < height - 1; layer++) {
    const ly = oy + height - 1 - layer;
    const radius = Math.max(1, Math.ceil((height - layer) / 3));
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (Math.abs(dx) === radius && Math.abs(dz) === radius && (dx !== 0 || dz !== 0)) continue;
        if (dx === 0 && dz === 0) continue;
        setBlockIfAir(blocks, cx, cy, cz, ox + dx, ly, oz + dz, BlockType.SPRUCE_LEAVES);
      }
    }
  }
}

function makeCherryTree(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, height: number, rng: () => number,
) {
  for (let y = 0; y < height; y++) {
    fillBlock(blocks, cx, cy, cz, ox, oy + y, oz, BlockType.OAK_LOG);
  }
  const crownR = 3;
  for (let dy = -1; dy <= 2; dy++) {
    const ly = oy + height - 2 + dy;
    const r = crownR + (dy <= 0 ? 1 : 0);
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const dist = dx * dx + dz * dz;
        if (dist > r * r) continue;
        if (dist < 1.5 && dy <= 0) continue;
        if (dx === 0 && dz === 0 && dy >= 0) continue;
        if (rng() < 0.1) continue;
        setBlockIfAir(blocks, cx, cy, cz, ox + dx, ly, oz + dz, BlockType.CHERRY_LEAVES);
      }
    }
  }
}

function makeBirchTree(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, height: number, _rng: () => number,
) {
  for (let y = 0; y < height; y++) {
    fillBlock(blocks, cx, cy, cz, ox, oy + y, oz, BlockType.BIRCH_LOG);
  }
  const crownR = 2;
  for (let dy = 0; dy <= 2; dy++) {
    const ly = oy + height - 1 + dy;
    const r = crownR - dy;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx * dx + dz * dz > r * r) continue;
        if (dx === 0 && dz === 0 && dy === 0) continue;
        setBlockIfAir(blocks, cx, cy, cz, ox + dx, ly, oz + dz, BlockType.BIRCH_LEAVES);
      }
    }
  }
}

function makeHut(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, _seed: number,
) {
  const w = 8, d = 8, wh = 4;

  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy, oz + z, BlockType.STONE_PATH);
      fillBlock(blocks, cx, cy, cz, ox + x, oy, oz + z, BlockType.DARK_PLANK);
    }
  }

  for (let y = 0; y < wh; y++) {
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const isWall = (x === 0 || x === w - 1 || z === 0 || z === d - 1);
        const isDoor = z === d - 1 && x >= 3 && x <= 5 && y < 3;
        if (isWall && !isDoor) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + y, oz + z, BlockType.PLANK);
        }
        if (isDoor) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + y, oz + z, BlockType.DOOR);
        }
      }
    }
  }

  fillBlock(blocks, cx, cy, cz, ox + 1, oy + 2, oz + 1, BlockType.WINDOW);
  fillBlock(blocks, cx, cy, cz, ox + 6, oy + 2, oz + 1, BlockType.WINDOW);
  fillBlock(blocks, cx, cy, cz, ox + 6, oy + 2, oz + 6, BlockType.WINDOW);

  for (let x = 2; x <= 3; x++) {
    for (let z = 2; z <= 4; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy + 1, oz + z, BlockType.BOOKSHELF);
    }
  }

  for (let x = -1; x <= w; x++) {
    for (let z = -1; z <= d; z++) {
      const roofY = oy + 1 + wh;
      if (x >= 0 && x < w && z >= 0 && z < d) {
        fillBlock(blocks, cx, cy, cz, ox + x, roofY, oz + z, BlockType.RED_ROOF);
      }
      if (x >= 1 && x < w - 1 && z >= 1 && z < d - 1) {
        fillBlock(blocks, cx, cy, cz, ox + x, roofY + 1, oz + z, BlockType.RED_ROOF);
      }
      if (x >= 2 && x < w - 2 && z >= 2 && z < d - 2) {
        fillBlock(blocks, cx, cy, cz, ox + x, roofY + 2, oz + z, BlockType.RED_ROOF);
      }
    }
  }
}

function makeHouse(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, _seed: number,
) {
  const w = 12, d = 9, groundH = 4, upperH = 4;

  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy, oz + z, BlockType.STONE_PATH);
    }
  }

  for (let y = 0; y < groundH; y++) {
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const isWall = (x === 0 || x === w - 1 || z === 0 || z === d - 1);
        const isDoor = z === 0 && x >= 4 && x <= 6 && y < 3;
        const wallBlock = y < 2 ? BlockType.STONE_BRICK : BlockType.PLANK;
        if (isWall && !isDoor) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + y, oz + z, wallBlock);
        }
        if (isDoor) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + y, oz + z, BlockType.DOOR);
        }
      }
    }
  }

  fillBlock(blocks, cx, cy, cz, ox + 10, oy + 3, oz + 1, BlockType.WINDOW);
  fillBlock(blocks, cx, cy, cz, ox + 1, oy + 3, oz + 7, BlockType.WINDOW);
  fillBlock(blocks, cx, cy, cz, ox + 1, oy + 3, oz + 1, BlockType.WINDOW);

  for (let x = 1; x < w - 1; x++) {
    for (let z = 1; z < d - 1; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + groundH, oz + z, BlockType.PLANK);
      fillBlock(blocks, cx, cy, cz, ox + x, oy + 1, oz + z, BlockType.DARK_PLANK);
    }
  }

  for (let x = 2; x <= 4; x++) {
    for (let z = 2; z <= 3; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy + 1, oz + z, BlockType.BOOKSHELF);
    }
  }

  const stairX = 9;
  for (let step = 0; step < groundH; step++) {
    const sz = oz + 2 + step;
    const sy = oy + 1 + step;
    fillBlock(blocks, cx, cy, cz, ox + stairX, sy, sz, BlockType.OAK_STAIRS);
    if (step < groundH - 1) {
      fillBlock(blocks, cx, cy, cz, ox + stairX - 1, sy, sz, BlockType.PLANK_SLAB);
      fillBlock(blocks, cx, cy, cz, ox + stairX, sy, sz + 1, BlockType.PLANK_SLAB);
    }
  }

  const upperY = oy + 1 + groundH + 1;
  for (let x = 1; x < w - 1; x++) {
    for (let z = 1; z < d - 1; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, upperY - 1, oz + z, BlockType.DARK_PLANK);
    }
  }

  for (let y = 0; y < upperH; y++) {
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const isWall = (x === 0 || x === w - 1 || z === 0 || z === d - 1);
        const isWindow = z === 0 && x === 5 && y === 1;
        const isWindow2 = x === w - 1 && z === 4 && y === 1;
        if (isWall && !isWindow && !isWindow2) {
          fillBlock(blocks, cx, cy, cz, ox + x, upperY + y, oz + z, BlockType.PLANK);
        }
        if (isWindow || isWindow2) {
          fillBlock(blocks, cx, cy, cz, ox + x, upperY + y, oz + z, BlockType.GLASS_PANE);
        }
      }
    }
  }

  fillBlock(blocks, cx, cy, cz, ox + 5, upperY + 2, oz + 4, BlockType.GLOWSTONE);
  fillBlock(blocks, cx, cy, cz, ox + 5, upperY + upperH - 1, oz + 4, BlockType.GLOWSTONE);

  const roofBaseY = upperY + upperH;
  for (let x = -1; x <= w; x++) {
    for (let z = -1; z <= d; z++) {
      if (x >= 0 && x < w && z >= 0 && z < d) {
        fillBlock(blocks, cx, cy, cz, ox + x, roofBaseY, oz + z, BlockType.RED_ROOF);
        if (x >= 2 && x < w - 2 && z >= 2 && z < d - 2) {
          fillBlock(blocks, cx, cy, cz, ox + x, roofBaseY + 1, oz + z, BlockType.RED_ROOF);
        }
        if (x >= 4 && x < w - 4 && z >= 3 && z < d - 3) {
          fillBlock(blocks, cx, cy, cz, ox + x, roofBaseY + 2, oz + z, BlockType.RED_ROOF);
        }
      }
      if (z === -1 || z === d) {
        if (x >= 0 && x < w) fillBlock(blocks, cx, cy, cz, ox + x, roofBaseY, oz + z, BlockType.RED_ROOF);
      }
      if (x === -1 || x === w) {
        if (z >= 0 && z < d) fillBlock(blocks, cx, cy, cz, ox + x, roofBaseY, oz + z, BlockType.RED_ROOF);
      }
    }
  }
}

function makeWatchtower(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, _seed: number,
) {
  const w = 5, d = 5, h = 10;

  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy, oz + z, BlockType.COBBLESTONE);
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const isWall = (x === 0 || x === w - 1 || z === 0 || z === d - 1);
        const isDoor = z === 4 && x >= 1 && x <= 2 && y < 3;
        if (isWall && !isDoor) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + y, oz + z, BlockType.STONE_BRICK);
        }
        if (isDoor) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + y, oz + z, BlockType.DOOR);
        }
      }
    }
  }

  fillBlock(blocks, cx, cy, cz, ox + 1, oy + 4, oz + 0, BlockType.WINDOW);
  fillBlock(blocks, cx, cy, cz, ox + 4, oy + 6, oz + 2, BlockType.WINDOW);
  fillBlock(blocks, cx, cy, cz, ox + 0, oy + 8, oz + 2, BlockType.WINDOW);

  for (let step = 0; step < 9; step++) {
    const sy = oy + 1 + step;
    const stairX = step < 5 ? 3 : 1;
    const stairZ = 2 + (step % 2);
    fillBlock(blocks, cx, cy, cz, ox + stairX, sy, oz + stairZ, BlockType.PLANK_STAIRS);
  }

  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + h, oz + z, BlockType.PLANK);
    }
  }

  for (let x = -1; x <= w; x++) {
    for (let z = -1; z <= d; z++) {
      if ((x < 0 || x >= w || z < 0 || z >= d) && !(x < -1 || x > w || z < -1 || z > d)) {
        fillBlock(blocks, cx, cy, cz, ox + x, oy + 2 + h, oz + z, BlockType.OAK_FENCE);
      }
    }
  }

  fillBlock(blocks, cx, cy, cz, ox + 2, oy + 2, oz + 0, BlockType.LANTERN);
}

function makeManor(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, _seed: number,
) {
  const wallW = 21, wallD = 17, wallH = 4;

  for (let y = 0; y < wallH; y++) {
    for (let x = 0; x < wallW; x++) {
      for (let z = 0; z < wallD; z++) {
        const isEdge = x === 0 || x === wallW - 1 || z === 0 || z === wallD - 1;
        const isGate = z === 0 && x >= 8 && x <= 12 && y < 3;
        if (isEdge && !isGate) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + y, oz + z, BlockType.COBBLESTONE);
        }
      }
    }
  }

  for (let x = 1; x < wallW - 1; x++) {
    for (let z = 1; z < wallD - 1; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy, oz + z, BlockType.STONE_PATH);
    }
  }

  for (let i = 0; i < 4; i++) {
    const tx = i < 2 ? 1 : wallW - 2;
    const tz = i % 2 === 0 ? 1 : wallD - 2;
    for (let y = 0; y < 6; y++) {
      fillBlock(blocks, cx, cy, cz, ox + tx, oy + y, oz + tz, BlockType.COBBLESTONE);
    }
    fillBlock(blocks, cx, cy, cz, ox + tx, oy + 6, oz + tz, BlockType.OAK_FENCE);
    fillBlock(blocks, cx, cy, cz, ox + tx, oy + 7, oz + tz, BlockType.LANTERN);
  }

  for (let x = 0; x < wallW; x++) {
    fillBlock(blocks, cx, cy, cz, ox + x, oy + wallH, oz, BlockType.COBBLESTONE_SLAB);
    fillBlock(blocks, cx, cy, cz, ox + x, oy + wallH, oz + wallD - 1, BlockType.COBBLESTONE_SLAB);
  }
  for (let z = 0; z < wallD; z++) {
    fillBlock(blocks, cx, cy, cz, ox, oy + wallH, oz + z, BlockType.COBBLESTONE_SLAB);
    fillBlock(blocks, cx, cy, cz, ox + wallW - 1, oy + wallH, oz + z, BlockType.COBBLESTONE_SLAB);
  }

  makeHouse(blocks, cx, cy, cz, ox + 3, oy, oz + 3, _seed);

  const fountainX = Math.floor((wallW - 1) / 2);
  const fountainZ = Math.floor((wallD - 1) / 2) + 1;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const block = (dx === 0 && dz === 0) ? BlockType.WATER : BlockType.STONE_BRICK_SLAB;
      fillBlock(blocks, cx, cy, cz, ox + fountainX + dx, oy, oz + fountainZ + dz, block);
    }
  }

  for (let x = 6; x <= 14; x++) {
    fillBlock(blocks, cx, cy, cz, ox + x, oy, oz + 1, BlockType.STONE_PATH);
  }
}

function makeTemple(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, _seed: number,
) {
  const w = 14, d = 10, wh = 5;

  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy, oz + z, BlockType.CHISELED_STONE);
    }
  }

  for (let y = 0; y < wh; y++) {
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const isWall = (x === 0 || x === w - 1 || z === 0 || z === d - 1);
        const isDoor = z === 0 && x >= 5 && x <= 8 && y < 4;
        const isWindow = x === 0 && z === 3 && y === 2;
        const isWindow2 = x === w - 1 && z === 3 && y === 2;
        const isWindow3 = x === 0 && z === 6 && y === 2;
        const isWindow4 = x === w - 1 && z === 6 && y === 2;
        const wallBlock = y < 2 ? BlockType.STONE_BRICK : BlockType.SMOOTH_STONE;
        if (isWall && !isDoor && !isWindow && !isWindow2 && !isWindow3 && !isWindow4) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + y, oz + z, wallBlock);
        }
        if (isDoor) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + y, oz + z, BlockType.DOOR);
        }
        if (isWindow || isWindow2 || isWindow3 || isWindow4) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + y, oz + z, BlockType.GLASS_PANE);
        }
      }
    }
  }

  for (let x = 1; x < w - 1; x++) {
    for (let z = 1; z < d - 1; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy + 1, oz + z, BlockType.CLAY);
    }
  }

  for (let x = 3; x <= 6; x++) {
    fillBlock(blocks, cx, cy, cz, ox + x, oy + 1, oz + 1, BlockType.BOOKSHELF);
  }
  fillBlock(blocks, cx, cy, cz, ox + 4, oy + 2, oz + 1, BlockType.CHISELED_STONE);

  for (let x = 1; x < w - 1; x++) {
    for (let z = 1; z < d - 1; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + wh, oz + z, BlockType.RED_ROOF);
      if (x >= 3 && x <= w - 4 && z >= 3 && z <= d - 4) {
        fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + wh + 1, oz + z, BlockType.RED_ROOF);
      }
      if (x >= 5 && x <= w - 6 && z >= 4 && z <= d - 5) {
        fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + wh + 2, oz + z, BlockType.RED_ROOF);
      }
    }
  }
  for (let x = -1; x <= w; x++) {
    for (let z = -1; z <= d; z++) {
      if (x >= 0 && x < w && (z === -1 || z === d)) fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + wh, oz + z, BlockType.RED_ROOF);
      if (z >= 0 && z < d && (x === -1 || x === w)) fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + wh, oz + z, BlockType.RED_ROOF);
    }
  }

  fillBlock(blocks, cx, cy, cz, ox + 6, oy + 1 + wh, oz + 4, BlockType.LANTERN);
}

function makePagoda(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, _seed: number,
) {
  const floors = 3;
  const floorH = 4;
  const gap = 2;
  const fw = 9;

  for (let cx = 0; cx < 3; cx++) {
    for (let cz = 0; cz < 3; cz++) {
      const px = ox + 2 + cx * 2;
      const pz = oz + 2 + cz * 2;
      for (let y = 0; y < floors * (floorH + gap) + 4; y++) {
        fillBlock(blocks, cx, cy, cz, px, oy + y, pz, BlockType.CHISELED_STONE);
      }
    }
  }

  for (let floor = 0; floor < floors; floor++) {
    const fy = oy + floor * (floorH + gap);

    for (let x = 0; x < fw; x++) {
      for (let z = 0; z < fw; z++) {
        fillBlock(blocks, cx, cy, cz, ox + x, fy, oz + z, BlockType.STONE_PATH);
      }
    }

    for (let y = 0; y < floorH; y++) {
      for (let x = 0; x < fw; x++) {
        for (let z = 0; z < fw; z++) {
          const isWall = (x === 0 || x === fw - 1 || z === 0 || z === fw - 1);
          const isDoor = z === 0 && x >= 3 && x <= 5 && y < 3;
          const isWindow = x === 0 && z === 3 && y === 1;
          const isWindow2 = x === fw - 1 && z === 6 && y === 1;
          if (isWall && !isDoor && !isWindow && !isWindow2) {
            fillBlock(blocks, cx, cy, cz, ox + x, fy + 1 + y, oz + z, BlockType.BRICK);
          }
          if (isDoor) {
            fillBlock(blocks, cx, cy, cz, ox + x, fy + 1 + y, oz + z, BlockType.DOOR);
          }
          if (isWindow || isWindow2) {
            fillBlock(blocks, cx, cy, cz, ox + x, fy + 1 + y, oz + z, BlockType.GLASS_PANE);
          }
        }
      }
    }

    for (let step = 0; step < floorH; step++) {
      const sy = fy + 1 + step;
      fillBlock(blocks, cx, cy, cz, ox + 1, sy, oz + 1, BlockType.OAK_STAIRS);
      fillBlock(blocks, cx, cy, cz, ox + 1, sy, oz + 2, BlockType.PLANK_SLAB);
      fillBlock(blocks, cx, cy, cz, ox + 2, sy, oz + 2, BlockType.PLANK_SLAB);
    }

    fillBlock(blocks, cx, cy, cz, ox + 4, fy + floorH - 1, oz + 4, BlockType.GLOWSTONE);

    for (let x = 1; x < fw - 1; x++) {
      for (let z = 1; z < fw - 1; z++) {
        fillBlock(blocks, cx, cy, cz, ox + x, fy + 1 + floorH, oz + z, BlockType.PLANK);
      }
    }

    const roofY = fy + 1 + floorH + 1;
    for (let x = -2; x <= fw + 1; x++) {
      for (let z = -2; z <= fw + 1; z++) {
        if (x >= -1 && x <= fw && z >= -1 && z <= fw) {
          const inner = x >= 0 && x < fw && z >= 0 && z < fw;
          fillBlock(blocks, cx, cy, cz, ox + x, roofY, oz + z, BlockType.RED_ROOF);
        }
      }
    }
  }

  const topY = oy + floors * (floorH + gap) + 4;
  for (let y = 0; y < 4; y++) {
    fillBlock(blocks, cx, cy, cz, ox + 4, topY + y, oz + 4, BlockType.PILLAR);
  }
  fillBlock(blocks, cx, cy, cz, ox + 4, topY + 4, oz + 4, BlockType.LANTERN);
}

function makePalace(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, _seed: number,
) {
  const w = 23, d = 15, wh = 6;

  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy, oz + z, BlockType.SANDSTONE_BRICK);
    }
  }

  for (let y = 0; y < wh; y++) {
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const isOuterWall = (x === 0 || x === w - 1 || z === 0 || z === d - 1);
        const isGrandDoor = z === 0 && x >= 9 && x <= 13 && y < 5;
        const isSideWindow = x === 0 && z === 4 && (y === 2 || y === 3);
        const isSideWindow2 = x === w - 1 && z === 4 && (y === 2 || y === 3);
        const isSideWindow3 = x === 0 && z === 10 && (y === 2 || y === 3);
        const isSideWindow4 = x === w - 1 && z === 10 && (y === 2 || y === 3);
        const isBackWindow = z === d - 1 && x === 6 && y === 2;
        const isBackWindow2 = z === d - 1 && x === 16 && y === 2;
        const wallBlock = y < 2 ? BlockType.CHISELED_STONE : BlockType.STONE_BRICK;
        const divX1 = 7, divX2 = 15;
        const isDiv1 = x === divX1 && z >= 0 && z <= d - 1;
        const isDiv2 = x === divX2 && z >= 0 && z <= d - 1;
        const isDivDoor1 = isDiv1 && z === 2 && y < 3;
        const isDivDoor2 = isDiv2 && z === 2 && y < 3;
        const isDivDoor3 = isDiv1 && z === 11 && y < 3;
        const isDivDoor4 = isDiv2 && z === 11 && y < 3;

        if ((isDiv1 || isDiv2) && y < wh) {
          if (!isDivDoor1 && !isDivDoor2 && !isDivDoor3 && !isDivDoor4) {
            fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + y, oz + z, BlockType.STONE_BRICK);
          }
        }

        if (isOuterWall && !isGrandDoor && !isSideWindow && !isSideWindow2 &&
            !isSideWindow3 && !isSideWindow4 && !isBackWindow && !isBackWindow2 &&
            !isDiv1 && !isDiv2) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + y, oz + z, wallBlock);
        }
        if (isSideWindow || isSideWindow2 || isSideWindow3 || isSideWindow4 ||
            isBackWindow || isBackWindow2) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + 1 + y, oz + z, BlockType.GLASS);
        }
      }
    }
  }

  for (let x = 1; x < w - 1; x++) {
    for (let z = 1; z < d - 1; z++) {
      if (x === 7 || x === 15) continue;
      fillBlock(blocks, cx, cy, cz, ox + x, oy + 1, oz + z, BlockType.DARK_PLANK);
    }
  }

  for (let room = 0; room < 3; room++) {
    const rx = ox + 1 + room * 8;
    const rz = oz + 1;
    for (let dx = 0; dx < 6; dx++) {
      for (let dz = 0; dz < 3; dz++) {
        const color = room === 0 ? BlockType.WOOL_RED : room === 2 ? BlockType.WOOL_BLUE : BlockType.WOOL_RED;
        fillBlock(blocks, cx, cy, cz, rx + dx, oy + 1, rz + dz, color);
      }
    }
  }

  for (let x = 2; x <= 5; x++) {
    fillBlock(blocks, cx, cy, cz, ox + x, oy + 1, oz + 7, BlockType.BOOKSHELF);
    fillBlock(blocks, cx, cy, cz, ox + x, oy + 2, oz + 7, BlockType.BOOKSHELF);
  }

  for (let rx of [2, 10, 18]) {
    fillBlock(blocks, cx, cy, cz, ox + rx + 2, oy + wh - 1, oz + 3, BlockType.GLOWSTONE);
    fillBlock(blocks, cx, cy, cz, ox + rx + 2, oy + wh - 1, oz + 10, BlockType.GLOWSTONE);
  }

  fillBlock(blocks, cx, cy, cz, ox + 8, oy, oz, BlockType.PILLAR);
  fillBlock(blocks, cx, cy, cz, ox + 14, oy, oz, BlockType.PILLAR);
  fillBlock(blocks, cx, cy, cz, ox + 8, oy, oz + d - 1, BlockType.PILLAR);
  fillBlock(blocks, cx, cy, cz, ox + 14, oy, oz + d - 1, BlockType.PILLAR);

  const roofBase = oy + 1 + wh;
  for (let layer = 0; layer < 4; layer++) {
    const lw = w - layer * 3;
    const ld = d - layer * 3;
    const lx = ox + Math.floor(layer * 1.5);
    const lz = oz + Math.floor(layer * 1.5);
    for (let x = 0; x < lw; x++) {
      for (let z = 0; z < ld; z++) {
        fillBlock(blocks, cx, cy, cz, lx + x, roofBase + layer, lz + z, BlockType.RED_ROOF);
      }
    }
  }

  fillBlock(blocks, cx, cy, cz, ox + 11, roofBase + 4, oz + 7, BlockType.LANTERN);
}

function makeCityWall(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, length: number, isXAxis: boolean,
) {
  for (let i = 0; i < length; i++) {
    for (let y = 0; y < 4; y++) {
      if (isXAxis) {
        fillBlock(blocks, cx, cy, cz, ox + i, oy + y, oz, BlockType.STONE_BRICK);
      } else {
        fillBlock(blocks, cx, cy, cz, ox, oy + y, oz + i, BlockType.STONE_BRICK);
      }
    }
    if (isXAxis) {
      fillBlock(blocks, cx, cy, cz, ox + i, oy + 4, oz, BlockType.COBBLESTONE);
    } else {
      fillBlock(blocks, cx, cy, cz, ox, oy + 4, oz + i, BlockType.COBBLESTONE);
    }
  }
}

function makeCityGate(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, isXAxis: boolean,
) {
  for (let y = 0; y < 5; y++) {
    for (let w = -1; w <= 1; w++) {
      if (w === 0 && y < 2) continue;
      if (isXAxis) {
        fillBlock(blocks, cx, cy, cz, ox + w, oy + y, oz, BlockType.STONE_BRICK);
      } else {
        fillBlock(blocks, cx, cy, cz, ox, oy + y, oz + w, BlockType.STONE_BRICK);
      }
    }
  }
  if (isXAxis) {
    fillBlock(blocks, cx, cy, cz, ox - 1, oy + 5, oz, BlockType.ROOF_TILE);
    fillBlock(blocks, cx, cy, cz, ox, oy + 5, oz, BlockType.ROOF_TILE);
    fillBlock(blocks, cx, cy, cz, ox + 1, oy + 5, oz, BlockType.ROOF_TILE);
  } else {
    fillBlock(blocks, cx, cy, cz, ox, oy + 5, oz - 1, BlockType.ROOF_TILE);
    fillBlock(blocks, cx, cy, cz, ox, oy + 5, oz, BlockType.ROOF_TILE);
    fillBlock(blocks, cx, cy, cz, ox, oy + 5, oz + 1, BlockType.ROOF_TILE);
  }
  if (isXAxis) {
    for (let y = 0; y < 3; y++) {
      fillBlock(blocks, cx, cy, cz, ox - 2, oy + y, oz - 1, BlockType.COBBLESTONE);
      fillBlock(blocks, cx, cy, cz, ox - 2, oy + y, oz + 1, BlockType.COBBLESTONE);
      fillBlock(blocks, cx, cy, cz, ox + 2, oy + y, oz - 1, BlockType.COBBLESTONE);
      fillBlock(blocks, cx, cy, cz, ox + 2, oy + y, oz + 1, BlockType.COBBLESTONE);
    }
  } else {
    for (let y = 0; y < 3; y++) {
      fillBlock(blocks, cx, cy, cz, ox - 1, oy + y, oz - 2, BlockType.COBBLESTONE);
      fillBlock(blocks, cx, cy, cz, ox + 1, oy + y, oz - 2, BlockType.COBBLESTONE);
      fillBlock(blocks, cx, cy, cz, ox - 1, oy + y, oz + 2, BlockType.COBBLESTONE);
      fillBlock(blocks, cx, cy, cz, ox + 1, oy + y, oz + 2, BlockType.COBBLESTONE);
    }
  }
}

function makeLampPosts(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number,
) {
  for (let y = 0; y < 4; y++) {
    fillBlock(blocks, cx, cy, cz, ox, oy + y, oz, BlockType.FENCE);
  }
  fillBlock(blocks, cx, cy, cz, ox, oy + 4, oz, BlockType.LANTERN);
}

export function getZoneKind(zoneCX: number, zoneCZ: number): StructureKind {
  const h = hashFloat(zoneCX, zoneCZ);
  const dist = Math.sqrt(zoneCX * zoneCX + zoneCZ * zoneCZ) * STRUCTURE_ZONE_SIZE;

  if (dist < 200 && h < 0.005) {
    return StructureKind.CAPITAL_CITY;
  }
  if (dist < 1000 && h < 0.002) {
    return StructureKind.CAPITAL_CITY;
  }
  if (dist < 200 && h < 0.08) {
    return StructureKind.MANOR;
  }
  if (dist < 800 && h < 0.04) {
    return StructureKind.MANOR;
  }
  if (dist < 150 && h < 0.5) {
    return StructureKind.HOUSE_MEDIUM;
  }
  if (dist < 400 && h < 0.30) {
    return StructureKind.HOUSE_SMALL;
  }
  if (dist < 700 && h < 0.18) {
    return StructureKind.WATCHTOWER;
  }
  if (dist < 1200 && h < 0.10) {
    return StructureKind.TEMPLE;
  }
  if (dist < 3000 && h < 0.03) {
    return StructureKind.PAGODA;
  }
  return StructureKind.NONE;
}

function determineTrees(
  zoneCX: number, zoneCZ: number,
  baseY: number,
  blocks: Uint8Array, cx: number, cy: number, cz: number,
) {
  const treeChance = hashFloat(zoneCX + 1000, zoneCZ + 2000);
  if (treeChance < 0.75) return;

  const treeCount = Math.floor(hashFloat(zoneCX + 3000, zoneCZ + 4000) * 12) + 3;
  let rngState = hash2D(zoneCX + 5000, zoneCZ + 6000);
  const baseX = zoneCX * STRUCTURE_ZONE_SIZE;
  const baseZ = zoneCZ * STRUCTURE_ZONE_SIZE;

  for (let i = 0; i < treeCount; i++) {
    rngState = (rngState * 16807 + 0) & 0x7fffffff;
    const r1 = (rngState & 0x7fffffff) / 0x7fffffff;
    rngState = (rngState * 16807 + 0) & 0x7fffffff;
    const r2 = (rngState & 0x7fffffff) / 0x7fffffff;
    rngState = (rngState * 16807 + 0) & 0x7fffffff;
    const r3 = (rngState & 0x7fffffff) / 0x7fffffff;

    const treeX = baseX + Math.floor(r1 * STRUCTURE_ZONE_SIZE);
    const treeZ = baseZ + Math.floor(r2 * STRUCTURE_ZONE_SIZE);
    const treeY = baseY + Math.floor(r3 * 3) - 1;

    const treeType = pickFrom(
      [StructureKind.TREE_OAK, StructureKind.TREE_PINE, StructureKind.TREE_CHERRY, StructureKind.TREE_BIRCH],
      treeX + i * 100, treeZ + i * 200,
    );

    const treeHeight = 4 + Math.floor(hashFloat(treeX + 7000, treeZ + 8000) * 3);
    const rng = (() => {
      let s = hash2D(treeX + 9000, treeZ + 10000);
      return () => {
        s = (s * 16807 + 0) & 0x7fffffff;
        return (s & 0x7fffffff) / 0x7fffffff;
      };
    })();

    switch (treeType) {
      case StructureKind.TREE_OAK:
        makeOakTree(blocks, cx, cy, cz, treeX, treeY, treeZ, treeHeight, rng);
        break;
      case StructureKind.TREE_PINE:
        makePineTree(blocks, cx, cy, cz, treeX, treeY, treeZ, treeHeight + 2, rng);
        break;
      case StructureKind.TREE_CHERRY:
        makeCherryTree(blocks, cx, cy, cz, treeX, treeY, treeZ, treeHeight, rng);
        break;
      case StructureKind.TREE_BIRCH:
        makeBirchTree(blocks, cx, cy, cz, treeX, treeY, treeZ, treeHeight, rng);
        break;
    }
  }
}

function generateCapitalCity(
  cityCX: number, cityCZ: number, cityBaseY: number,
  blocks: Uint8Array, cx: number, cy: number, cz: number,
) {
  const rngState = hash2D(cityCX + 20000, cityCZ + 30000);
  const cityCenterX = cityCX * STRUCTURE_ZONE_SIZE + STRUCTURE_ZONE_SIZE / 2;
  const cityCenterZ = cityCZ * STRUCTURE_ZONE_SIZE + STRUCTURE_ZONE_SIZE / 2;
  const wallHalf = 24;
  const wallLen = wallHalf * 2 + 1;

  for (let x = -wallHalf; x <= wallHalf; x++) {
    fillBlock(blocks, cx, cy, cz, cityCenterX + x, cityBaseY + 5, cityCenterZ - wallHalf, BlockType.LANTERN);
    fillBlock(blocks, cx, cy, cz, cityCenterX + x, cityBaseY + 5, cityCenterZ + wallHalf, BlockType.LANTERN);
  }
  for (let z = -wallHalf; z <= wallHalf; z++) {
    fillBlock(blocks, cx, cy, cz, cityCenterX - wallHalf, cityBaseY + 5, cityCenterZ + z, BlockType.LANTERN);
    fillBlock(blocks, cx, cy, cz, cityCenterX + wallHalf, cityBaseY + 5, cityCenterZ + z, BlockType.LANTERN);
  }

  makeCityWall(blocks, cx, cy, cz, cityCenterX - wallHalf, cityBaseY, cityCenterZ - wallHalf, wallLen, true);
  makeCityWall(blocks, cx, cy, cz, cityCenterX - wallHalf, cityBaseY, cityCenterZ + wallHalf, wallLen, true);
  makeCityWall(blocks, cx, cy, cz, cityCenterX - wallHalf, cityBaseY, cityCenterZ - wallHalf, wallLen, false);
  makeCityWall(blocks, cx, cy, cz, cityCenterX + wallHalf, cityBaseY, cityCenterZ - wallHalf, wallLen, false);

  makeCityGate(blocks, cx, cy, cz, cityCenterX, cityBaseY, cityCenterZ - wallHalf, true);
  makeCityGate(blocks, cx, cy, cz, cityCenterX, cityBaseY, cityCenterZ + wallHalf, true);
  makeCityGate(blocks, cx, cy, cz, cityCenterX - wallHalf, cityBaseY, cityCenterZ, false);
  makeCityGate(blocks, cx, cy, cz, cityCenterX + wallHalf, cityBaseY, cityCenterZ, false);

  for (let x = -20; x <= 20; x++) {
    for (let z = -20; z <= 20; z++) {
      if (Math.abs(x) <= 2 && Math.abs(z) <= 2) continue;
      const isRoadX = Math.abs(x) % 8 === 0 && Math.abs(x) <= 16;
      const isRoadZ = Math.abs(z) % 8 === 0 && Math.abs(z) <= 16;
      if (isRoadX || isRoadZ) {
        fillBlock(blocks, cx, cy, cz, cityCenterX + x, cityBaseY, cityCenterZ + z, BlockType.STONE_PATH);
      }
    }
  }

  const buildingsInCity: Array<{
    fn: (blocks: Uint8Array, cx: number, cy: number, cz: number, ox: number, oy: number, oz: number, seed: number) => void;
    ox: number; oz: number;
  }> = [];

  for (let qx = -1; qx <= 1; qx++) {
    for (let qz = -1; qz <= 1; qz++) {
      if (qx === 0 && qz === 0) continue;
      const bx = qx * 14;
      const bz = qz * 10;
      const bh = hashFloat(cityCX + bx * 100, cityCZ + bz * 100);
      if (bh < 0.4) {
        buildingsInCity.push({ fn: makeHouse, ox: cityCenterX + bx, oz: cityCenterZ + bz });
      } else if (bh < 0.6) {
        buildingsInCity.push({ fn: makeTemple, ox: cityCenterX + bx, oz: cityCenterZ + bz });
      } else {
        buildingsInCity.push({ fn: makePagoda, ox: cityCenterX + bx, oz: cityCenterZ + bz });
      }
    }
  }

  makePalace(blocks, cx, cy, cz, cityCenterX - 11, cityBaseY, cityCenterZ - 7, rngState);

  for (const b of buildingsInCity) {
    b.fn(blocks, cx, cy, cz, b.ox, cityBaseY, b.oz, rngState);
  }

  const lampPositions = [
    [-20, -20], [-20, 20], [20, -20], [20, 20],
    [-12, -12], [-12, 12], [12, -12], [12, 12],
  ];
  for (const [lx, lz] of lampPositions) {
    makeLampPosts(blocks, cx, cy, cz, cityCenterX + lx, cityBaseY, cityCenterZ + lz);
  }
}

function generateManorComplex(
  zoneCX: number, zoneCZ: number, baseY: number,
  blocks: Uint8Array, cx: number, cy: number, cz: number,
) {
  const centerX = zoneCX * STRUCTURE_ZONE_SIZE + STRUCTURE_ZONE_SIZE / 2;
  const centerZ = zoneCZ * STRUCTURE_ZONE_SIZE + STRUCTURE_ZONE_SIZE / 2;
  const seed = hash2D(zoneCX + 50000, zoneCZ + 60000);

  makeManor(blocks, cx, cy, cz, centerX - 10, baseY, centerZ - 8, seed);

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const dist = 20 + (hashFloat(zoneCX + i * 1000, zoneCZ + i * 2000) * 5);
    const hx = centerX + Math.floor(Math.cos(angle) * dist);
    const hz = centerZ + Math.floor(Math.sin(angle) * dist);
    const hType = hashFloat(zoneCX + i * 3000, zoneCZ + i * 4000);
    if (hType < 0.5) {
      makeHut(blocks, cx, cy, cz, hx, baseY, hz, seed);
    } else {
      makeHouse(blocks, cx, cy, cz, hx, baseY, hz, seed);
    }
  }
}

function generateBuildingsForZone(
  zoneCX: number, zoneCZ: number, baseY: number,
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  kind: StructureKind,
) {
  const centerX = zoneCX * STRUCTURE_ZONE_SIZE + STRUCTURE_ZONE_SIZE / 2;
  const centerZ = zoneCZ * STRUCTURE_ZONE_SIZE + STRUCTURE_ZONE_SIZE / 2;
  const seed = hash2D(zoneCX + 70000, zoneCZ + 80000);

  // Zone boundary: offset within ±6 so buildings stay well inside STRUCTURE_ZONE_SIZE
  const offsetX = Math.floor((hashFloat(zoneCX + 2, zoneCZ + 3) - 0.5) * 12);
  const offsetZ = Math.floor((hashFloat(zoneCX + 5, zoneCZ + 7) - 0.5) * 12);
  const bx = centerX + offsetX;
  const bz = centerZ + offsetZ;

  switch (kind) {
    case StructureKind.HOUSE_SMALL:
      makeHut(blocks, cx, cy, cz, bx, baseY, bz, seed);
      break;
    case StructureKind.HOUSE_MEDIUM:
      makeHouse(blocks, cx, cy, cz, bx, baseY, bz, seed);
      break;
    case StructureKind.HOUSE_LARGE:
      makeHouse(blocks, cx, cy, cz, bx, baseY, bz, seed);
      break;
    case StructureKind.WATCHTOWER:
      makeWatchtower(blocks, cx, cy, cz, bx, baseY, bz, seed);
      break;
    case StructureKind.TEMPLE:
      makeTemple(blocks, cx, cy, cz, bx, baseY, bz, seed);
      break;
    case StructureKind.PAGODA:
      makePagoda(blocks, cx, cy, cz, bx, baseY, bz, seed);
      break;
  }
}

export function generateStructures(
  blocks: Uint8Array,
  cx: number, cy: number, cz: number,
  terrainHeightAt: (wx: number, wz: number) => number,
) {
  const zoneCX = Math.floor((cx * CHUNK_SIZE) / STRUCTURE_ZONE_SIZE);
  const zoneCZ = Math.floor((cz * CHUNK_SIZE) / STRUCTURE_ZONE_SIZE);

  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      const zcx = zoneCX + dx;
      const zcz = zoneCZ + dz;
      const baseX = zcx * STRUCTURE_ZONE_SIZE;
      const baseZ = zcz * STRUCTURE_ZONE_SIZE;
      const baseY = Math.floor(terrainHeightAt(baseX + STRUCTURE_ZONE_SIZE / 2, baseZ + STRUCTURE_ZONE_SIZE / 2));

      const kind = getZoneKind(zcx, zcz);

      switch (kind) {
        case StructureKind.CAPITAL_CITY:
          generateCapitalCity(zcx, zcz, baseY, blocks, cx, cy, cz);
          break;
        case StructureKind.MANOR:
          generateManorComplex(zcx, zcz, baseY, blocks, cx, cy, cz);
          break;
        case StructureKind.NONE:
          determineTrees(zcx, zcz, baseY, blocks, cx, cy, cz);
          break;
        default:
          generateBuildingsForZone(zcx, zcz, baseY, blocks, cx, cy, cz, kind);
          break;
      }
    }
  }
}

export interface GameBuildingSpec {
  kind: 'capital' | 'manor' | 'city' | 'fortress' | 'watchtower';
  worldX: number;
  worldZ: number;
}

export function generateGameBuildings(
  buildings: GameBuildingSpec[],
  blocks: Uint8Array,
  cx: number,
  cy: number,
  cz: number,
  terrainHeightAt: (wx: number, wz: number) => number,
) {
  for (const b of buildings) {
    const zoneCX = Math.floor(b.worldX / STRUCTURE_ZONE_SIZE);
    const zoneCZ = Math.floor(b.worldZ / STRUCTURE_ZONE_SIZE);
    const baseX = zoneCX * STRUCTURE_ZONE_SIZE;
    const baseZ = zoneCZ * STRUCTURE_ZONE_SIZE;
    const baseY = Math.floor(terrainHeightAt(baseX + STRUCTURE_ZONE_SIZE / 2, baseZ + STRUCTURE_ZONE_SIZE / 2));

    const buildingCX = zoneCX * STRUCTURE_ZONE_SIZE + STRUCTURE_ZONE_SIZE / 2;
    const buildingCZ = zoneCZ * STRUCTURE_ZONE_SIZE + STRUCTURE_ZONE_SIZE / 2;
    const bboxHalf = 20;
    const chunkMinX = cx * CHUNK_SIZE;
    const chunkMinZ = cz * CHUNK_SIZE;
    const chunkMaxX = chunkMinX + CHUNK_SIZE - 1;
    const chunkMaxZ = chunkMinZ + CHUNK_SIZE - 1;

    if (chunkMaxX < buildingCX - bboxHalf || chunkMinX > buildingCX + bboxHalf ||
        chunkMaxZ < buildingCZ - bboxHalf || chunkMinZ > buildingCZ + bboxHalf) {
      continue;
    }

    switch (b.kind) {
      case 'capital':
        generateCapitalCity(zoneCX, zoneCZ, baseY, blocks, cx, cy, cz);
        break;
      case 'manor':
        generateManorComplex(zoneCX, zoneCZ, baseY, blocks, cx, cy, cz);
        break;
      case 'city':
        generateManorComplex(zoneCX, zoneCZ, baseY, blocks, cx, cy, cz);
        break;
      case 'fortress':
        generateBuildingsForZone(zoneCX, zoneCZ, baseY, blocks, cx, cy, cz, StructureKind.WATCHTOWER);
        break;
      case 'watchtower':
        generateBuildingsForZone(zoneCX, zoneCZ, baseY, blocks, cx, cy, cz, StructureKind.WATCHTOWER);
        break;
    }
  }
}
