import * as path from 'path';

export interface ECSNPCState {
  id: string;
  name: string;
  clanId: string;
  nation: string;
  role: string;
  layer: number;
  realm: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  power: number;
  x: number;
  y: number;
  activity: string;
  ambition: number;
  caution: number;
  loyalty: number;
  greed: number;
  spiritStones: number;
}

export interface ECSStats {
  npcCount: number;
  avgFrameTime: number;
  frameCount: number;
}

export class ECSEngineService {
  private static instance: ECSEngineService;
  private addon: any = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): ECSEngineService {
    if (!ECSEngineService.instance) {
      ECSEngineService.instance = new ECSEngineService();
    }
    return ECSEngineService.instance;
  }

  initialize(threadCount: number = 8): void {
    if (this.initialized) return;
    try {
      this.addon = require(path.join(__dirname, '../addons/build/Release/ecs_engine.node'));
      this.addon.initialize(threadCount);
      this.initialized = true;
      console.log('[ECS Engine] C++ addon loaded with', threadCount, 'threads');
    } catch (e) {
      console.warn('[ECS Engine] C++ addon not available:', (e as Error).message);
      this.addon = null;
    }
  }

  createNPCs(count: number, layer: number = 9): { created: number; layer: number; totalNPCs: number } | null {
    if (!this.addon) return null;
    return this.addon.createNPCs(count, layer);
  }

  updateFrame(): boolean {
    if (!this.addon) return false;
    return this.addon.updateFrame();
  }

  getAllNPCStates(): ECSNPCState[] {
    if (!this.addon) return [];
    return this.addon.getAllNPCStates() as ECSNPCState[];
  }

  getStats(): ECSStats | null {
    if (!this.addon) return null;
    return this.addon.getStats() as ECSStats;
  }

  stop(): void {
    if (this.addon) {
      this.addon.stop();
    }
    this.initialized = false;
  }

  get isAvailable(): boolean {
    return this.addon !== null && this.initialized;
  }
}
