import { ResourceType, ResourceConfig, RESOURCE_CONFIGS, ResourceNode, CollectResult, GAME_CONFIG } from '../../shared';

class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;

  constructor(private maxSize: number, factory: () => T) {
    this.factory = factory;
  }

  acquire(): T {
    return this.pool.pop() || this.factory();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }
}

export class ResourceManager {
  private static instance: ResourceManager;
  private activeResources: Map<string, ResourceNode>;
  private resourcePool: ObjectPool<ResourceNode>;
  private mapWidth: number = GAME_CONFIG.MAP_WIDTH;
  private mapHeight: number = GAME_CONFIG.MAP_HEIGHT;

  private constructor() {
    this.activeResources = new Map();
    this.resourcePool = new ObjectPool<ResourceNode>(100, () => this.createResourceNode());
  }

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  initialize(mapWidth: number, mapHeight: number, initialCount: number): void {
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.activeResources = new Map();

    for (let i = 0; i < initialCount; i++) {
      this.spawnRandomResource();
    }
  }

  private createResourceNode(): ResourceNode {
    return {
      id: '',
      type: ResourceType.SpiritField,
      x: 0,
      y: 0,
      respawnTimer: 0
    };
  }

  spawnRandomResource(): ResourceNode | null {
    const types = Object.keys(ResourceType) as ResourceType[];
    const weights = [0.5, 0.35, 0.15];
    const type = this.weightedRandom(types, weights);

    const node = this.resourcePool.acquire();
    node.id = `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    node.type = type;
    node.x = Math.random() * this.mapWidth;
    node.y = Math.random() * this.mapHeight;
    node.lastCollectedAt = undefined;

    this.activeResources.set(node.id, node);
    return node;
  }

  collectResource(collectorId: string, resourceId: string, addCultivation: (amount: number) => void, addSpiritStones: (amount: number) => void, addItem: (itemId: string) => void): CollectResult {
    const resource = this.activeResources.get(resourceId);
    if (!resource) {
      return { success: false, reason: 'resource_not_found' };
    }

    const config = RESOURCE_CONFIGS[resource.type];

    if (config.cultivationReward > 0) {
      addCultivation(config.cultivationReward);
    }
    if (config.spiritStoneReward > 0) {
      addSpiritStones(config.spiritStoneReward);
    }

    let specialDrop: string | null = null;
    if (config.specialDropChance && Math.random() < config.specialDropChance && config.specialDropItem) {
      specialDrop = config.specialDropItem;
      addItem(specialDrop);
    }

    resource.lastCollectedAt = Date.now();
    this.activeResources.delete(resourceId);
    this.resourcePool.release(resource);

    this.scheduleRespawn(resource);

    return { success: true, rewards: { cultivation: config.cultivationReward, spiritStones: config.spiritStoneReward, specialDrop } };
  }

  private scheduleRespawn(collectedResource: ResourceNode): void {
    if (Math.random() >= GAME_CONFIG.RESPAWN_CHANCE) {
      return;
    }

    const offsetX = (Math.random() - 0.5) * 2 * GAME_CONFIG.SPAWN_RADIUS;
    const offsetY = (Math.random() - 0.5) * 2 * GAME_CONFIG.SPAWN_RADIUS;
    const newX = Math.max(0, Math.min(this.mapWidth, collectedResource.x + offsetX));
    const newY = Math.max(0, Math.min(this.mapHeight, collectedResource.y + offsetY));

    setTimeout(() => {
      this.spawnAtPosition(collectedResource.type, newX, newY);
    }, 30000);
  }

  spawnAtPosition(type: ResourceType, x: number, y: number): void {
    const node = this.resourcePool.acquire();
    node.id = `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    node.type = type;
    node.x = x;
    node.y = y;
    node.lastCollectedAt = undefined;

    this.activeResources.set(node.id, node);
  }

  private weightedRandom<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  getActiveResources(): ResourceNode[] {
    return Array.from(this.activeResources.values());
  }

  getResourceById(id: string): ResourceNode | undefined {
    return this.activeResources.get(id);
  }

  getNearbyResources(x: number, y: number, radius: number): ResourceNode[] {
    return this.getActiveResources().filter(r => {
      const dx = r.x - x;
      const dy = r.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  increaseResourceDensity(layerId: string, amount: number): void {
    const additionalCount = Math.floor(amount / 100);
    for (let i = 0; i < additionalCount; i++) {
      this.spawnRandomResource();
    }
  }

  refreshResourcePoints(layerId: string): void {
    const resources = this.getActiveResources();
    for (const resource of resources) {
      if (resource.lastCollectedAt && Date.now() - resource.lastCollectedAt > 60000) {
        this.activeResources.delete(resource.id);
        this.resourcePool.release(resource);
      }
    }
  }
}

export class NPCResourceCompetition {
  private static instance: NPCResourceCompetition;
  private npcResources: Map<string, Set<string>>;

  private constructor() {
    this.npcResources = new Map();
  }

  static getInstance(): NPCResourceCompetition {
    if (!NPCResourceCompetition.instance) {
      NPCResourceCompetition.instance = new NPCResourceCompetition();
    }
    return NPCResourceCompetition.instance;
  }

  npcCollects(npcId: string, resourceId: string): void {
    if (!this.npcResources.has(npcId)) {
      this.npcResources.set(npcId, new Set());
    }
    this.npcResources.get(npcId)!.add(resourceId);
  }

  canNpcCollect(npcId: string, resourceId: string): boolean {
    for (const [npc, resources] of this.npcResources.entries()) {
      if (npc !== npcId && resources.has(resourceId)) {
        return false;
      }
    }
    return true;
  }

  npcReleases(npcId: string, resourceId: string): void {
    this.npcResources.get(npcId)?.delete(resourceId);
  }
}