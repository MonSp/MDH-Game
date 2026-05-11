import { createNoise2D } from 'simplex-noise';
import { TerrainType, type TerrainTile, isWater as checkWater, REALM_VISION_RANGES, TERRAIN_MOVE_COST } from '../shared/types/map';

const noise2D = createNoise2D(() => 0.5);

export type Biome = TerrainType;

export interface TerrainTileOld {
  x: number;
  y: number;
  elevation: number;
  biome: Biome;
  color: string;
  hasTree: boolean;
}

// Map old Biome strings to TerrainType for backwards compat
const BIOMES = [
  { type: TerrainType.DEEP_WATER, threshold: -0.4, color: '#0369a1', baseHeight: -0.5 },
  { type: TerrainType.SHALLOW_WATER, threshold: -0.1, color: '#0ea5e9', baseHeight: -0.3 },
  { type: TerrainType.SAND, threshold: 0.05, color: '#fcd34d', baseHeight: 0.1 },
  { type: TerrainType.GRASS, threshold: 0.4, color: '#4ade80', baseHeight: 0.3 },
  { type: TerrainType.FOREST, threshold: 0.7, color: '#15803d', baseHeight: 0.4 },
  { type: TerrainType.ROCK, threshold: 0.9, color: '#78716c', baseHeight: 0.8 },
  { type: TerrainType.SNOW, threshold: Infinity, color: '#f8fafc', baseHeight: 1.2 },
] as const;

export function getTerrainTile(x: number, y: number): TerrainTile {
  // Test island override: small grassy island surrounded by shallow water
  const distToIsland = Math.sqrt((x - TEST_ISLAND.x) ** 2 + (y - TEST_ISLAND.y) ** 2);
  if (distToIsland < TEST_ISLAND.radius + TEST_ISLAND.waterRing) {
    if (distToIsland <= TEST_ISLAND.radius) {
      const edgeFactor = 1 - distToIsland / TEST_ISLAND.radius;
      const innerNoise = noise2D(x * 0.3, y * 0.3);
      const isSand = edgeFactor < 0.15;
      const hasTree = distToIsland > 2 && innerNoise > 0.55 && !isSand;
      return {
        x, y,
        elevation: 0.3 + edgeFactor * 0.15 + innerNoise * 0.05,
        biome: isSand ? TerrainType.SAND : TerrainType.GRASS,
        color: isSand ? '#fcd34d' : '#4ade80',
        hasTree,
        isRoad: false,
      };
    }
    return {
      x, y,
      elevation: -0.3 - (distToIsland - TEST_ISLAND.radius) * 0.04,
      biome: TerrainType.SHALLOW_WATER,
      color: '#0ea5e9',
      hasTree: false,
      isRoad: false,
    };
  }

  const macroNoise = noise2D(x * 0.001, y * 0.001);
  const microNoise = noise2D(x * 0.005, y * 0.005) * 0.3;
  const value = macroNoise + microNoise;

  let biome: TerrainType = TerrainType.SNOW;
  let color = '#f8fafc';
  let elevation = 1.2;

  for (const b of BIOMES) {
    if (value <= b.threshold) {
      biome = b.type;
      color = b.color;
      elevation = b.baseHeight + (!checkWater(b.type) ? microNoise * 0.5 : 0);
      break;
    }
  }

  const isRoad = (Math.abs(x % 8) <= 1 || Math.abs(y % 8) <= 1) && !checkWater(biome);
  if (isRoad) {
    biome = TerrainType.ROAD;
    color = '#a8a29e';
    elevation = 0.15;
  }

  let hasTree = false;
  if ((biome === TerrainType.GRASS || biome === TerrainType.FOREST) && !isRoad) {
    const treeNoise = noise2D(x * 0.5, y * 0.5);
    if (treeNoise > (biome === TerrainType.FOREST ? 0.3 : 0.8)) {
      hasTree = true;
    }
  }

  return { x, y, elevation, biome, color, hasTree, isRoad };
}

/** Check if a position is traversable by foot */
export function isPositionPassable(x: number, y: number): boolean {
  const tile = getTerrainTile(x, y);
  return tile.biome !== TerrainType.DEEP_WATER
    && tile.biome !== TerrainType.MOUNTAIN
    && tile.biome !== TerrainType.ROCK;
}

/** Get movement cost multiplier at a position (1.0 = normal speed) */
export function getMovementCost(x: number, y: number): number {
  const tile = getTerrainTile(x, y);
  return TERRAIN_MOVE_COST[tile.biome] || 1.0;
}

/** Scout vision multiplier (applied when a scout squad member is present) */
export const SCOUT_VISION_MULTIPLIER = 2.0;

/** Get vision radius for a realm level (with optional watchtower bonus) */
export function getVisionRadius(realm: string, watchtowerBonus: number = 0): number {
  const base = REALM_VISION_RANGES[realm] || REALM_VISION_RANGES['练气'];
  return base + watchtowerBonus;
}

// Re-export TerrainType for backwards compatibility
export { TerrainType };

/** Test island: circular land surrounded by water, far from all buildings */
export const TEST_ISLAND = { x: 300, y: 300, radius: 55, waterRing: 7 };

export function isOnTestIsland(x: number, y: number): boolean {
  const dist = Math.sqrt((x - TEST_ISLAND.x) ** 2 + (y - TEST_ISLAND.y) ** 2);
  return dist < TEST_ISLAND.radius + TEST_ISLAND.waterRing;
}
