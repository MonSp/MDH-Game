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
  const w = 3, d = 3, h = 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const isEdge = x === 0 || x === w - 1 || z === 0 || z === d - 1;
        const isDoor = z === d - 1 && x === 1 && y === 0;
        if (isEdge && !isDoor) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + y, oz + z, BlockType.PLANK);
        }
      }
    }
  }
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy + h, oz + z, BlockType.ROOF_TILE);
    }
  }
}

function makeHouse(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, _seed: number,
) {
  const w = 5, d = 5, h = 3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const isEdge = x === 0 || x === w - 1 || z === 0 || z === d - 1;
        const isFrontDoor = z === 0 && (x === 1 || x === 3) && y === 0;
        if (isEdge && !isFrontDoor) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + y, oz + z, BlockType.PLANK);
        }
        if (x === 1 && z === 1 && y === 0) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + y, oz + z, BlockType.DOOR);
        }
      }
    }
  }
  for (let x = -1; x <= w; x++) {
    for (let z = -1; z <= d; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy + h, oz + z, BlockType.ROOF_TILE);
    }
  }
  for (let y = 1; y < h; y++) {
    fillBlock(blocks, cx, cy, cz, ox + 2, oy + y, oz + 2, BlockType.WINDOW);
  }
}

function makeWatchtower(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, _seed: number,
) {
  const w = 3, d = 3, h = 5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const isEdge = x === 0 || x === w - 1 || z === 0 || z === d - 1;
        if (isEdge) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + y, oz + z, BlockType.STONE_BRICK);
        }
      }
    }
  }
  for (let x = -1; x <= w; x++) {
    for (let z = -1; z <= d; z++) {
      const roofEdge = Math.abs(x) === w || Math.abs(z) === d;
      if (roofEdge) continue;
      fillBlock(blocks, cx, cy, cz, ox + x, oy + h, oz + z, BlockType.ROOF_TILE);
    }
  }
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy + h + 1, oz + z, BlockType.FENCE);
    }
  }
}

function makeManor(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, _seed: number,
) {
  const wallW = 11, wallD = 9, wallH = 3;
  for (let y = 0; y < wallH; y++) {
    for (let x = 0; x < wallW; x++) {
      for (let z = 0; z < wallD; z++) {
        const isEdge = x === 0 || x === wallW - 1 || z === 0 || z === wallD - 1;
        const isGate = z === 0 && x >= 4 && x <= 6 && y < 1;
        if (isEdge && !isGate) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + y, oz + z, BlockType.COBBLESTONE);
        }
      }
    }
  }
  const mainHX = 4, mainHZ = 2;
  makeHouse(blocks, cx, cy, cz, ox + mainHX, oy, oz + mainHZ, _seed);
  const wingW = 3, wingD = 3;
  makeHouse(blocks, cx, cy, cz, ox + 1, oy, oz + 1, _seed);
  makeHouse(blocks, cx, cy, cz, ox + wallW - 1 - wingW, oy, oz + 1, _seed);
  for (let x = 3; x <= 7; x++) {
    fillBlock(blocks, cx, cy, cz, ox + x, oy, oz + 1, BlockType.STONE_PATH);
  }
  for (let x = 3; x <= 7; x++) {
    for (let z = 2; z <= 4; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy, oz + z, BlockType.STONE_PATH);
    }
  }
  for (let x = 0; x < wallW; x++) {
    fillBlock(blocks, cx, cy, cz, ox + x, oy + wallH, oz, BlockType.ROOF_TILE);
    fillBlock(blocks, cx, cy, cz, ox + x, oy + wallH, oz + wallD - 1, BlockType.ROOF_TILE);
  }
  for (let z = 0; z < wallD; z++) {
    fillBlock(blocks, cx, cy, cz, ox, oy + wallH, oz + z, BlockType.ROOF_TILE);
    fillBlock(blocks, cx, cy, cz, ox + wallW - 1, oy + wallH, oz + z, BlockType.ROOF_TILE);
  }
}

function makeTemple(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, _seed: number,
) {
  const w = 7, d = 5, h = 4;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const isEdge = x === 0 || x === w - 1 || z === 0 || z === d - 1;
        const isDoor = z === d - 1 && x >= 2 && x <= 4 && y === 0;
        if (isEdge && !isDoor) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + y, oz + z, BlockType.STONE_BRICK);
        }
      }
    }
  }
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      if (x === 0 || x === w - 1 || z === 0 || z === d - 1) continue;
      fillBlock(blocks, cx, cy, cz, ox + x, oy + h, oz + z, BlockType.ROOF_TILE);
    }
  }
  for (let x = 1; x < w - 1; x++) {
    for (let z = 1; z < d - 1; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy + h + 1, oz + z, BlockType.ROOF_TILE);
    }
  }
  for (let i = 0; i < 4; i++) {
    const px = i < 2 ? 1 : w - 2;
    const pz = i % 2 === 0 ? 1 : d - 2;
    for (let py = 0; py < 3; py++) {
      fillBlock(blocks, cx, cy, cz, ox + px, oy + h + 2 + py, oz + pz, BlockType.PILLAR);
    }
    fillBlock(blocks, cx, cy, cz, ox + px, oy + h + 5, oz + pz, BlockType.ROOF_TILE);
  }
}

function makePagoda(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, _seed: number,
) {
  const floors = 3;
  for (let floor = 0; floor < floors; floor++) {
    const fw = 5 - floor;
    const fh = 3;
    const fy = oy + floor * (fh + 1);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        for (let z = 0; z < fw; z++) {
          const isEdge = x === 0 || x === fw - 1 || z === 0 || z === fw - 1;
          const isDoor = y === 0 && z === 0 && x === Math.floor(fw / 2);
          if (isEdge && !isDoor) {
            fillBlock(blocks, cx, cy, cz, ox + x, fy + y, oz + z, BlockType.BRICK);
          }
        }
      }
    }
    for (let x = -1; x <= fw; x++) {
      for (let z = -1; z <= fw; z++) {
        if (x === -1 || x === fw || z === -1 || z === fw) continue;
        if (x < 0 || x >= fw || z < 0 || z >= fw) {
          fillBlock(blocks, cx, cy, cz, ox + x, fy + fh, oz + z, BlockType.ROOF_TILE);
        } else {
          fillBlock(blocks, cx, cy, cz, ox + x, fy + fh, oz + z, BlockType.ROOF_TILE);
        }
      }
    }
  }
  const topY = oy + floors * 4;
  for (let y = 0; y < 3; y++) {
    fillBlock(blocks, cx, cy, cz, ox + 2, topY + y, oz + 2, BlockType.PILLAR);
  }
  fillBlock(blocks, cx, cy, cz, ox + 2, topY + 3, oz + 2, BlockType.LANTERN);
}

function makePalace(
  blocks: Uint8Array, cx: number, cy: number, cz: number,
  ox: number, oy: number, oz: number, _seed: number,
) {
  const w = 11, d = 7, h = 5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const isEdge = x === 0 || x === w - 1 || z === 0 || z === d - 1;
        const isDoor = z === 0 && x >= 4 && x <= 6 && y < 2;
        const isWindow = !isEdge && (y === 2 || y === 3) && (x % 3 === 0 && z % 2 === 0);
        if (isEdge && !isDoor) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + y, oz + z, BlockType.STONE_BRICK);
        }
        if (isWindow) {
          fillBlock(blocks, cx, cy, cz, ox + x, oy + y, oz + z, BlockType.WINDOW);
        }
      }
    }
  }
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < d; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy + h, oz + z, BlockType.ROOF_TILE);
    }
  }
  for (let x = 1; x < w - 1; x++) {
    for (let z = 1; z < d - 1; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy + h + 1, oz + z, BlockType.ROOF_TILE);
    }
  }
  for (let x = 2; x < w - 2; x++) {
    for (let z = 2; z < d - 2; z++) {
      fillBlock(blocks, cx, cy, cz, ox + x, oy + h + 2, oz + z, BlockType.ROOF_TILE);
    }
  }
  for (let i = 0; i < w; i += 2) {
    fillBlock(blocks, cx, cy, cz, ox + i, oy, oz, BlockType.PILLAR);
    fillBlock(blocks, cx, cy, cz, ox + i, oy, oz + d - 1, BlockType.PILLAR);
  }
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

function getZoneKind(zoneCX: number, zoneCZ: number): StructureKind {
  const h = hashFloat(zoneCX, zoneCZ);
  const dist = Math.sqrt(zoneCX * zoneCX + zoneCZ * zoneCZ) * STRUCTURE_ZONE_SIZE;

  if (dist < 200 && h < 0.005) {
    return StructureKind.CAPITAL_CITY;
  }
  if (dist < 800 && h < 0.002) {
    return StructureKind.CAPITAL_CITY;
  }
  if (dist < 150 && h < 0.06) {
    return StructureKind.MANOR;
  }
  if (dist < 600 && h < 0.03) {
    return StructureKind.MANOR;
  }
  if (dist < 100 && h < 0.4) {
    return StructureKind.HOUSE_MEDIUM;
  }
  if (dist < 300 && h < 0.25) {
    return StructureKind.HOUSE_SMALL;
  }
  if (dist < 500 && h < 0.15) {
    return StructureKind.WATCHTOWER;
  }
  if (dist < 800 && h < 0.08) {
    return StructureKind.TEMPLE;
  }
  if (dist < 2000 && h < 0.02) {
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
  if (treeChance < 0.6) return;

  const treeCount = Math.floor(hashFloat(zoneCX + 3000, zoneCZ + 4000) * 8) + 2;
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
  const wallHalf = 16;
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

  for (let x = -14; x <= 14; x++) {
    for (let z = -14; z <= 14; z++) {
      if (Math.abs(x) <= 1 && Math.abs(z) <= 1) continue;
      const isRoadX = Math.abs(x) % 6 === 0 && Math.abs(x) <= 12;
      const isRoadZ = Math.abs(z) % 6 === 0 && Math.abs(z) <= 12;
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
      const bx = qx * 7;
      const bz = qz * 7;
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

  makePalace(blocks, cx, cy, cz, cityCenterX - 5, cityBaseY, cityCenterZ - 3, rngState);

  for (const b of buildingsInCity) {
    b.fn(blocks, cx, cy, cz, b.ox, cityBaseY, b.oz, rngState);
  }

  const lampPositions = [
    [-12, -12], [-12, 12], [12, -12], [12, 12],
    [-8, -8], [-8, 8], [8, -8], [8, 8],
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

  makeManor(blocks, cx, cy, cz, centerX - 5, baseY, centerZ - 4, seed);

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const dist = 10 + (hashFloat(zoneCX + i * 1000, zoneCZ + i * 2000) * 3);
    const hx = centerX + Math.floor(Math.cos(angle) * dist);
    const hz = centerZ + Math.floor(Math.sin(angle) * dist);
    const hType = hashFloat(zoneCX + i * 3000, zoneCZ + i * 4000);
    if (hType < 0.5) {
      makeHut(blocks, cx, cy, cz, hx, baseY, hz, seed);
    } else {
      makeHouse(blocks, cx, cy, cz, hx, baseY, hz, seed);
    }
  }

  for (let i = -6; i <= 6; i++) {
    for (let j = -6; j <= 6; j++) {
      if (Math.abs(i) <= 5 && Math.abs(j) <= 5) continue;
      if (Math.abs(i) > 5 || Math.abs(j) > 5) {
        const isGate = (Math.abs(i) <= 1 && Math.abs(j) === 6) || (Math.abs(i) === 6 && Math.abs(j) <= 1);
        if (!isGate) {
          fillBlock(blocks, cx, cy, cz, centerX + i, baseY + 1, centerZ + j, BlockType.FENCE);
        }
      }
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

  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const zcx = zoneCX + dx;
      const zcz = zoneCZ + dz;
      const baseX = zcx * STRUCTURE_ZONE_SIZE;
      const baseZ = zcz * STRUCTURE_ZONE_SIZE;
      const baseY = Math.floor(terrainHeightAt(baseX, baseZ));

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
