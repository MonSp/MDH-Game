import { getTerrainTile } from '../../utils/terrain';
import { TerrainType, isTerrainPassable } from '../../shared/types/map';
import type { TerrainTile } from '../../shared/types/map';

const DEFAULT_CACHE_SIZE = 10000;

export class MapGeneratorService {
  private static instance: MapGeneratorService;
  private cache: Map<string, TerrainTile>;
  private maxSize: number;

  private constructor(maxSize: number = DEFAULT_CACHE_SIZE) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  static getInstance(): MapGeneratorService {
    if (!MapGeneratorService.instance) {
      MapGeneratorService.instance = new MapGeneratorService();
    }
    return MapGeneratorService.instance;
  }

  getTerrainTile(x: number, y: number): TerrainTile {
    const key = `${x},${y}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const tile = getTerrainTile(x, y);

    // LRU eviction: delete oldest entry if at cap
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, tile);
    return tile;
  }

  isPositionPassable(x: number, y: number): boolean {
    const tile = this.getTerrainTile(x, y);
    return tile.biome !== TerrainType.DEEP_WATER && tile.biome !== TerrainType.MOUNTAIN && tile.biome !== TerrainType.ROCK;
  }

  getMovementCost(x: number, y: number): number {
    const tile = this.getTerrainTile(x, y);
    const costs: Partial<Record<TerrainType, number>> = {
      [TerrainType.GRASS]: 1.0, [TerrainType.FOREST]: 1.5, [TerrainType.SAND]: 1.2,
      [TerrainType.SHALLOW_WATER]: 2.0, [TerrainType.ROAD]: 0.8, [TerrainType.SNOW]: 1.3,
      [TerrainType.DEEP_WATER]: 99, [TerrainType.MOUNTAIN]: 99, [TerrainType.ROCK]: 99,
    };
    return costs[tile.biome] ?? 1.0;
  }

  generateRegion(centerX: number, centerY: number, radius: number): TerrainTile[] {
    const tiles: TerrainTile[] = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        tiles.push(this.getTerrainTile(centerX + dx, centerY + dy));
      }
    }
    return tiles;
  }

  clearCache(): void {
    this.cache.clear();
  }

  get cacheSize(): number {
    return this.cache.size;
  }
}
