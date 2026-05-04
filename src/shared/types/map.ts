export enum TerrainType {
  DEEP_WATER = 'DEEP_WATER',
  SHALLOW_WATER = 'SHALLOW_WATER',
  SAND = 'SAND',
  GRASS = 'GRASS',
  FOREST = 'FOREST',
  ROCK = 'ROCK',
  MOUNTAIN = 'MOUNTAIN',
  SNOW = 'SNOW',
  ROAD = 'ROAD',
}

export interface TerrainTile {
  x: number;
  y: number;
  elevation: number;
  biome: TerrainType;
  color: string;
  hasTree: boolean;
  isRoad: boolean;
  /** Optional feature marker (e.g., 'capital', 'resource', 'dungeon') */
  feature?: string;
}

export interface MapRegion {
  id: string;
  name: string;
  country: string;
  centerX: number;
  centerY: number;
  radius: number;
}

export interface MapConfig {
  width: number;
  height: number;
  seed: number;
  regions: MapRegion[];
}

/** Movement cost multipliers per terrain type (1.0 = normal speed) */
export const TERRAIN_MOVE_COST: Record<TerrainType, number> = {
  [TerrainType.DEEP_WATER]: Infinity,
  [TerrainType.SHALLOW_WATER]: 3.0,
  [TerrainType.SAND]: 1.0,
  [TerrainType.GRASS]: 1.0,
  [TerrainType.FOREST]: 1.3,
  [TerrainType.ROCK]: 1.5,
  [TerrainType.MOUNTAIN]: Infinity,
  [TerrainType.SNOW]: 2.0,
  [TerrainType.ROAD]: 0.7,
};

/** Whether a terrain type is passable */
export function isTerrainPassable(biome: TerrainType): boolean {
  return TERRAIN_MOVE_COST[biome] !== Infinity;
}

/** Whether a terrain type is water */
export function isWater(biome: TerrainType): boolean {
  return biome === TerrainType.DEEP_WATER || biome === TerrainType.SHALLOW_WATER;
}

export const REALM_VISION_RANGES: Record<string, number> = {
  '凡人': 10,
  '练气': 12,
  '筑基': 15,
  '金丹': 18,
  '元婴': 22,
  '化神': 26,
  '合体': 30,
  '大乘': 35,
  '渡劫': 40,
  '飞升': 50,
};
