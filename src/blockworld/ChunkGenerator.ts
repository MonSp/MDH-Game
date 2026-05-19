import { createNoise2D, createNoise3D } from 'simplex-noise';
import { CHUNK_SIZE, BlockType } from './BlockTypes';
import { ChunkData } from './ChunkData';
import { generateStructures, generateGameBuildings, type GameBuildingSpec, getZoneKind, StructureKind, STRUCTURE_ZONE_SIZE } from './StructureGenerator';

const TERRAIN_BASE_HEIGHT = 40;
const TERRAIN_AMPLITUDE = 20;
const DIRT_DEPTH = 4;
const WATER_LEVEL = TERRAIN_BASE_HEIGHT - 4;

function seededRandom(seed: string): () => number {
  let s = 0;
  for (let i = 0; i < seed.length; i++) {
    s = ((s << 5) - s) + seed.charCodeAt(i);
    s |= 0;
  }
  return () => {
    s = (s * 16807 + 0) & 0x7fffffff;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

const rand = seededRandom('taigu_world_seed_2025');
const noise2D = createNoise2D(rand);
const noise3D = createNoise3D(rand);

export function getTerrainHeight(wx: number, wz: number): number {
  const continent = noise2D(wx * 0.003, wz * 0.003) * 0.5 + 0.5;
  const hill = noise2D(wx * 0.015, wz * 0.015) * 0.5 + 0.5;
  const detail = noise2D(wx * 0.04, wz * 0.04) * 0.5 + 0.5;

  const raw = continent * 0.6 + hill * 0.3 + detail * 0.1;
  const height = Math.floor(raw * TERRAIN_AMPLITUDE + TERRAIN_BASE_HEIGHT - TERRAIN_AMPLITUDE / 2);
  return Math.max(1, Math.min(height, 100));
}

function resourceHash(x: number, z: number): number {
  let h = x * 374761393 + z * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) & 0x7fffffff;
}

function resourceHashFloat(x: number, z: number): number {
  return resourceHash(x, z) / 0x7fffffff;
}

function generateWorldResources(blocks: Uint8Array, cx: number, cy: number, cz: number) {
  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wx = cx * CHUNK_SIZE + lx;
      const wz = cz * CHUNK_SIZE + lz;

      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        const wy = cy * CHUNK_SIZE + ly;
        const idx = ly * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx;
        const block = blocks[idx];

        if (block === BlockType.AIR || block === BlockType.WATER) continue;

        const h = resourceHashFloat(wx, wz);
        const hDeep = resourceHashFloat(wx + 7000, wz + 9000);

        // Spirit field: grass surface in plains (y=30~44), ~3% coverage
        if (block === BlockType.GRASS && wy >= 30 && wy <= 44 && h < 0.03) {
          blocks[idx] = BlockType.SPIRIT_FIELD;
        }

        // Spirit ore: stone underground (y=20~30), ~1.5% coverage, often in clusters
        if (block === BlockType.STONE && wy >= 20 && wy <= 30 && h < 0.015) {
          blocks[idx] = BlockType.SPIRIT_ORE;
        }

        // Spirit ore cluster: if adjacent block is already SPIRIT_ORE, higher chance
        if (block === BlockType.STONE && wy >= 20 && wy <= 30) {
          const adjOre =
            (lx > 0 && blocks[idx - 1] === BlockType.SPIRIT_ORE) ||
            (lx < CHUNK_SIZE - 1 && blocks[idx + 1] === BlockType.SPIRIT_ORE) ||
            (lz > 0 && blocks[idx - CHUNK_SIZE] === BlockType.SPIRIT_ORE) ||
            (lz < CHUNK_SIZE - 1 && blocks[idx + CHUNK_SIZE] === BlockType.SPIRIT_ORE);
          if (adjOre && h < 0.25) {
            blocks[idx] = BlockType.SPIRIT_ORE;
          }
        }

        // Fish spot: adjacent to water, on grass/sand surface, ~2% 
        if (block === BlockType.GRASS && hDeep < 0.02) {
          const adjWater =
            (lz > 0 && blocks[idx - CHUNK_SIZE] === BlockType.WATER) ||
            (lz < CHUNK_SIZE - 1 && blocks[idx + CHUNK_SIZE] === BlockType.WATER) ||
            (lx > 0 && blocks[idx - 1] === BlockType.WATER) ||
            (lx < CHUNK_SIZE - 1 && blocks[idx + 1] === BlockType.WATER);
          if (adjWater) {
            blocks[idx] = BlockType.FISH_SPOT;
          }
        }

        // Lumber field: dense forest marker, grass/dirt surface in forest areas, ~3%
        if ((block === BlockType.GRASS || block === BlockType.DIRT) &&
            wy >= 30 && wy <= 48 && h < 0.06 && h > 0.03) {
          const treeNearby =
            (lx > 1 && (blocks[idx - 1] === BlockType.OAK_LOG || blocks[idx - 2] === BlockType.OAK_LOG || blocks[idx - 1] === BlockType.SPRUCE_LOG)) ||
            (lx < CHUNK_SIZE - 2 && (blocks[idx + 1] === BlockType.OAK_LOG || blocks[idx + 2] === BlockType.OAK_LOG || blocks[idx + 1] === BlockType.SPRUCE_LOG)) ||
            (lz > 1 && (blocks[idx - CHUNK_SIZE] === BlockType.OAK_LOG || blocks[idx - CHUNK_SIZE * 2] === BlockType.OAK_LOG)) ||
            (lz < CHUNK_SIZE - 2 && (blocks[idx + CHUNK_SIZE] === BlockType.OAK_LOG || blocks[idx + CHUNK_SIZE * 2] === BlockType.OAK_LOG));
          if (treeNearby) {
            blocks[idx] = BlockType.LUMBER_FIELD;
          }
        }
      }
    }
  }
}

function flattenBlockColumn(
  blocks: Uint8Array,
  lx: number, lz: number,
  targetY: number,
  cy: number,
) {
  const stride = CHUNK_SIZE;
  const row = CHUNK_SIZE * CHUNK_SIZE;

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    const wy = cy * CHUNK_SIZE + ly;
    const idx = ly * row + lz * stride + lx;

    if (wy > targetY) {
      blocks[idx] = BlockType.AIR;
    } else if (wy === targetY) {
      if (blocks[idx] !== BlockType.AIR) {
        blocks[idx] = BlockType.GRASS;
      }
    } else if (wy > targetY - 4) {
      blocks[idx] = BlockType.DIRT;
    } else {
      blocks[idx] = BlockType.STONE;
    }
  }
}

function flattenAround(
  blocks: Uint8Array,
  cx: number, cy: number, cz: number,
  worldCenterX: number, worldCenterZ: number,
  radius: number,
) {
  const targetY = getTerrainHeight(worldCenterX, worldCenterZ);
  const chunkMinX = cx * CHUNK_SIZE;
  const chunkMinZ = cz * CHUNK_SIZE;
  const chunkMaxX = chunkMinX + CHUNK_SIZE - 1;
  const chunkMaxZ = chunkMinZ + CHUNK_SIZE - 1;

  const boxMinX = worldCenterX - radius;
  const boxMaxX = worldCenterX + radius;
  const boxMinZ = worldCenterZ - radius;
  const boxMaxZ = worldCenterZ + radius;

  const overlapMinX = Math.max(chunkMinX, boxMinX);
  const overlapMaxX = Math.min(chunkMaxX, boxMaxX);
  const overlapMinZ = Math.max(chunkMinZ, boxMinZ);
  const overlapMaxZ = Math.min(chunkMaxZ, boxMaxZ);

  if (overlapMinX > overlapMaxX || overlapMinZ > overlapMaxZ) return;

  for (let wx = overlapMinX; wx <= overlapMaxX; wx++) {
    for (let wz = overlapMinZ; wz <= overlapMaxZ; wz++) {
      const lx = wx - chunkMinX;
      const lz = wz - chunkMinZ;
      flattenBlockColumn(blocks, lx, lz, targetY, cy);
    }
  }
}

function flattenBuildingTerrain(
  blocks: Uint8Array,
  cx: number, cy: number, cz: number,
  gameBuildings: GameBuildingSpec[],
) {
  for (const b of gameBuildings) {
    const zoneCX = Math.floor(b.worldX / STRUCTURE_ZONE_SIZE);
    const zoneCZ = Math.floor(b.worldZ / STRUCTURE_ZONE_SIZE);
    const centerX = zoneCX * STRUCTURE_ZONE_SIZE + STRUCTURE_ZONE_SIZE / 2;
    const centerZ = zoneCZ * STRUCTURE_ZONE_SIZE + STRUCTURE_ZONE_SIZE / 2;

    let radius: number;
    switch (b.kind) {
      case 'capital': radius = 21; break;
      case 'city':
      case 'manor': radius = 12; break;
      case 'fortress':
      case 'watchtower': radius = 10; break;
      default: radius = 10;
    }
    flattenAround(blocks, cx, cy, cz, centerX, centerZ, radius);
  }

  const zoneCX = Math.floor((cx * CHUNK_SIZE) / STRUCTURE_ZONE_SIZE);
  const zoneCZ = Math.floor((cz * CHUNK_SIZE) / STRUCTURE_ZONE_SIZE);

  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      const zcx = zoneCX + dx;
      const zcz = zoneCZ + dz;
      const kind = getZoneKind(zcx, zcz);
      if (kind === StructureKind.NONE) continue;

      const centerX = zcx * STRUCTURE_ZONE_SIZE + STRUCTURE_ZONE_SIZE / 2;
      const centerZ = zcz * STRUCTURE_ZONE_SIZE + STRUCTURE_ZONE_SIZE / 2;

      let radius: number;
      if (kind === StructureKind.CAPITAL_CITY) radius = 21;
      else if (kind === StructureKind.MANOR) radius = 12;
      else if (kind === StructureKind.TEMPLE || kind === StructureKind.PAGODA) radius = 8;
      else radius = 9;

      flattenAround(blocks, cx, cy, cz, centerX, centerZ, radius);
    }
  }
}

export function generateChunk(cx: number, cy: number, cz: number): ChunkData {
  const chunk = new ChunkData(cx, cy, cz);

  if (cy > 4) {
    return chunk;
  }

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const wx = cx * CHUNK_SIZE + lx;
      const wz = cz * CHUNK_SIZE + lz;
      const surfaceHeight = getTerrainHeight(wx, wz);
      const waterSurface = WATER_LEVEL;

      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        const wy = cy * CHUNK_SIZE + ly;

        if (wy > surfaceHeight) {
          if (wy <= waterSurface) {
            chunk.setBlock(lx, ly, lz, BlockType.WATER);
          }
          continue;
        }

        if (wy === surfaceHeight) {
          chunk.setBlock(lx, ly, lz, BlockType.GRASS);
        } else if (wy > surfaceHeight - DIRT_DEPTH) {
          chunk.setBlock(lx, ly, lz, BlockType.DIRT);
        } else {
          if (wy > 30) {
            const caveNoise = noise3D(wx * 0.07, wy * 0.07, wz * 0.07);
            const depthFactor = (surfaceHeight - wy) / 20;
            if (caveNoise > 0.55 - depthFactor * 0.15) {
              chunk.setBlock(lx, ly, lz, BlockType.STONE);
            }
          } else {
            chunk.setBlock(lx, ly, lz, BlockType.STONE);
          }
        }
      }
    }
  }

  const BLOCK_SCALE = 100;
  const CAPITAL_OFFSET = 100;
  const FAMILY_COLS = 3;

  const capitalCoords: [number, number][] = [
    [20, 50], [50, 80], [80, 50], [70, 20], [50, 30], [45, 50], [40, 60],
  ];

  const gameBuildings: GameBuildingSpec[] = [
    ...capitalCoords.map(([cx, cz]) => ({
      kind: 'capital' as const,
      worldX: cx * BLOCK_SCALE,
      worldZ: cz * BLOCK_SCALE,
    })),
    ...capitalCoords.flatMap(([cx, cz]) =>
      Array.from({ length: 6 }, (_, j) => ({
        kind: (j === 0 ? 'city' : 'manor') as GameBuildingSpec['kind'],
        worldX: cx * BLOCK_SCALE + (j % FAMILY_COLS) * CAPITAL_OFFSET + CAPITAL_OFFSET,
        worldZ: cz * BLOCK_SCALE + Math.floor(j / FAMILY_COLS) * CAPITAL_OFFSET + CAPITAL_OFFSET,
      }))
    ),
    ...([0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
      const rad = deg * Math.PI / 180;
      return {
        kind: 'fortress' as const,
        worldX: 5000 + Math.floor(Math.cos(rad) * 3000),
        worldZ: 5000 + Math.floor(Math.sin(rad) * 3000),
      };
    })),
    ...([0, 60, 120, 180, 240, 300].map((deg, i) => {
      const rad = deg * Math.PI / 180;
      return {
        kind: 'manor' as const,
        worldX: 5000 + Math.floor(Math.cos(rad) * (1500 + i * 300)),
        worldZ: 5000 + Math.floor(Math.sin(rad) * (1500 + i * 300)),
      };
    })),
  ];

  flattenBuildingTerrain(chunk.blocks, cx, cy, cz, gameBuildings);

  generateStructures(chunk.blocks, cx, cy, cz, getTerrainHeight);
  generateGameBuildings(gameBuildings, chunk.blocks, cx, cy, cz, getTerrainHeight);

  generateWorldResources(chunk.blocks, cx, cy, cz);

  return chunk;
}
