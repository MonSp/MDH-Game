import * as path from 'path';

export interface CppClanInfo {
  id: string;
  name: string;
  country: string;
  type: string;
  reputation: number;
  treasury: number;
  territory: number;
  garrison: number;
  fortification: number;
  centerX: number;
  centerY: number;
  heavenLevel: number;
}

export interface CppBuildingInfo {
  id: string;
  kind: string;
  clanId: string;
  country: string;
  worldX: number;
  worldY: number;
  compoundWidth: number;
  compoundDepth: number;
  label: string;
  level: number;
  height: number;
}

export interface CppTreeInfo {
  x: number;
  y: number;
  scale: number;
  variant: number;
}

export interface CppResourceInfo {
  id: string;
  type: string;
  amount: number;
  posX: number;
  posY: number;
}

export interface CppWorldOutput {
  clans: CppClanInfo[];
  buildings: CppBuildingInfo[];
  trees: CppTreeInfo[];
  resources: CppResourceInfo[];
}

export interface CppTerrainTile {
  x: number;
  y: number;
  elevation: number;
  biome: number;
  hasTree: boolean;
  isRoad: boolean;
}

export class WorldGenService {
  private static instance: WorldGenService;
  private addon: any = null;
  private initialized = false;
  private _world: CppWorldOutput | null = null;

  private constructor() {}

  static getInstance(): WorldGenService {
    if (!WorldGenService.instance) {
      WorldGenService.instance = new WorldGenService();
    }
    return WorldGenService.instance;
  }

  initialize(): void {
    if (this.initialized) return;
    try {
      this.addon = require(path.join(__dirname, '../addons/build/Release/world_gen.node'));
      console.log('[WorldGen] C++ addon loaded successfully');
    } catch (e) {
      console.warn('[WorldGen] C++ addon not available, falling back to TS terrain gen');
    }
    this.initialized = true;
  }

  generateWorld(seed: number = 42, width: number = 600, height: number = 600, heavenLevel: number = 9): CppWorldOutput {
    if (!this.addon) {
      return { clans: [], buildings: [], trees: [], resources: [] };
    }
    const result = this.addon.generateWorld(seed, width, height, heavenLevel);
    this._world = result as CppWorldOutput;
    return this._world;
  }

  getTerrainTile(seed: number, x: number, y: number): CppTerrainTile | null {
    if (!this.addon) return null;
    const result = this.addon.getTerrainTile(seed, x, y);
    return result as CppTerrainTile;
  }

  get isAvailable(): boolean {
    return this.addon !== null;
  }
}
