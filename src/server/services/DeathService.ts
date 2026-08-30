import {
  DeathCause, DEATH_CONFIGS, DeathDropConfig, DEATH_DROP_CONFIG, DropItem, DropResult,
  SoulData, PoolStatus, BirthResult, RealmLevel, REALM_LIFESPANS, LifespanConfig,
  BirthType, NPCEntity, NPCActivity, NPCLifeState, NPCRole, DeathEvent, PopulationEvent, ClanEvent, EventBus,
  LayerConfig, LAYER_CONFIGS
} from '../../shared';
import { v4 as uuidv4 } from 'uuid';

export class LifespanSystem {
  private static instance: LifespanSystem;

  static getInstance(): LifespanSystem {
    if (!LifespanSystem.instance) {
      LifespanSystem.instance = new LifespanSystem();
    }
    return LifespanSystem.instance;
  }

  updateAge(npc: NPCEntity, deltaYears: number): void {
    npc.age += deltaYears;
    const lifespanConfig = REALM_LIFESPANS[npc.realm as unknown as RealmLevel] as LifespanConfig;

    if (npc.age >= lifespanConfig.maxLifespan) {
      this.triggerAgeDeath(npc, DeathCause.AgeLimit);
      return;
    }

    if (npc.age >= lifespanConfig.baseLifespan) {
      const yearsOverBase = npc.age - lifespanConfig.baseLifespan;
      const totalYears = lifespanConfig.maxLifespan - lifespanConfig.baseLifespan;
      const deathProbability = lifespanConfig.deathProbabilityPerYear * (yearsOverBase / totalYears);

      if (Math.random() < deathProbability) {
        this.triggerAgeDeath(npc, DeathCause.AgeLimit);
      }
    }
  }

  private triggerAgeDeath(npc: NPCEntity, cause: DeathCause): void {
    DeathService.getInstance().processDeath(npc, {
      cause: cause,
      killerId: null,
      killerType: null
    });
  }
}

export class DeathDropService {
  private static instance: DeathDropService;

  static getInstance(): DeathDropService {
    if (!DeathDropService.instance) {
      DeathDropService.instance = new DeathDropService();
    }
    return DeathDropService.instance;
  }

  calculateDrop(npc: NPCEntity, killerId: string, killerType: 'player' | 'npc'): DropResult {
    const drops: DropItem[] = [];
    const worldRecovery: DropItem[] = [];
    const config = DEATH_DROP_CONFIG;

    const spiritStoneAmount = this.calculateSpiritStoneDrop(npc);
    const spiritStoneDrop = spiritStoneAmount * config.baseSpiritStoneDropRate;
    drops.push({
      type: 'spirit_stones',
      amount: Math.floor(spiritStoneDrop),
      recipient: killerId
    });
    worldRecovery.push({
      type: 'spirit_stones',
      amount: Math.floor(spiritStoneAmount * (1 - config.baseSpiritStoneDropRate)),
      recipient: 'world_pool'
    });

    const itemCount = this.randomRange(config.baseItemDropCount.min, config.baseItemDropCount.max);
    for (let i = 0; i < itemCount; i++) {
      if (npc.resources.items.length > 0) {
        if (Math.random() < 0.9) {
          const item = npc.resources.items.pop();
          if (item) {
            drops.push({
              type: 'item',
              item: item,
              recipient: killerId
            });
          }
        } else {
          const item = npc.resources.items.pop();
          if (item) {
            worldRecovery.push({
              type: 'item',
              item: item,
              recipient: 'world_pool'
            });
          }
        }
      }
    }

    if (npc.resources.equipment) {
      if (Math.random() > config.equipmentDropRate) {
        drops.push({
          type: 'equipment',
          equipment: npc.resources.equipment,
          recipient: killerId
        });
      } else {
        worldRecovery.push({
          type: 'equipment',
          equipment: npc.resources.equipment,
          recipient: 'world_pool'
        });
      }
    }

    const familyContributionRefund = npc.resources.familyContribution * config.familyContributionRefundRate;

    const totalDropped = drops.reduce((sum, d) => sum + (d.amount || 0), 0);
    const totalWorldRecovery = worldRecovery.reduce((sum, d) => sum + (d.amount || 0), 0);
    const actualWorldRecovery = totalDropped * config.worldRecoveryRate;

    return {
      drops: drops,
      worldRecovery: worldRecovery,
      actualWorldRecovery: actualWorldRecovery,
      familyFavorabilityChange: this.calculateFavorabilityChange(npc, killerType)
    };
  }

  private calculateSpiritStoneDrop(npc: NPCEntity): number {
    const baseDrop = npc.resources.spiritStones;
    const layerConfig = LAYER_CONFIGS.find(l => l.layer === npc.layer);
    const layerMultiplier = layerConfig?.resourceMultiplier || 1;
    return baseDrop * layerMultiplier;
  }

  private calculateFavorabilityChange(npc: NPCEntity, killerType: 'player' | 'npc'): number {
    if (killerType === 'npc') return 0;
    const isMerchant = npc.role === NPCRole.Elder && npc.activity === NPCActivity.Trade;
    return isMerchant ? -20 : -10;
  }

  private randomRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

export class ReincarnationPool {
  private static instance: ReincarnationPool;
  private souls: Map<string, SoulData>;
  private birthCooldown: Map<string, number>;

  private constructor() {
    this.souls = new Map();
    this.birthCooldown = new Map();
  }

  static getInstance(): ReincarnationPool {
    if (!ReincarnationPool.instance) {
      ReincarnationPool.instance = new ReincarnationPool();
    }
    return ReincarnationPool.instance;
  }

  private static readonly SOUL_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
  private static readonly SOUL_POOL_MAX_SIZE = 500;

  addSoul(npcId: string, soul: SoulData): void {
    soul.poolEntryTime = Date.now();
    this.souls.set(npcId, soul);
    EventBus.emit(DeathEvent.SOUL_ENTER_POOL, { npcId, soul });
    this.evictExpiredSouls();
  }

  private evictExpiredSouls(): void {
    const now = Date.now();
    for (const [npcId, soul] of this.souls) {
      if (now - soul.poolEntryTime > ReincarnationPool.SOUL_MAX_AGE_MS) {
        this.souls.delete(npcId);
      }
    }
    // Hard cap: remove oldest entries if still over limit
    if (this.souls.size > ReincarnationPool.SOUL_POOL_MAX_SIZE) {
      const entries = [...this.souls.entries()].sort((a, b) => a[1].poolEntryTime - b[1].poolEntryTime);
      const toRemove = entries.slice(0, entries.length - ReincarnationPool.SOUL_POOL_MAX_SIZE);
      for (const [npcId] of toRemove) {
        this.souls.delete(npcId);
      }
    }
  }

  getSoul(npcId: string): SoulData | undefined {
    return this.souls.get(npcId);
  }

  removeSoul(npcId: string): void {
    this.souls.delete(npcId);
  }

  getPoolStatus(): PoolStatus {
    const soulsArray = Array.from(this.souls.values());
    const byRealm: Record<string, number> = {};
    const byNation: Record<string, number> = {};
    const byDeathCause: Record<string, number> = {};

    for (const soul of soulsArray) {
      byRealm[soul.originalRealm as string] = (byRealm[soul.originalRealm as string] || 0) + 1;
      byNation[soul.originalNation] = (byNation[soul.originalNation] || 0) + 1;
      byDeathCause[soul.deathCause as string] = (byDeathCause[soul.deathCause as string] || 0) + 1;
    }

    return {
      totalCount: soulsArray.length,
      byRealm: byRealm as Record<RealmLevel, number>,
      byNation,
      byDeathCause: byDeathCause as Record<DeathCause, number>
    };
  }

  checkBirthConditions(layerId: string): BirthResult {
    return { shouldBorn: false };
  }

  private noBirthForDays(layerId: string): number {
    const lastBirth = this.birthCooldown.get(layerId) || Date.now();
    return (Date.now() - lastBirth) / (24 * 60 * 60 * 1000);
  }
}

export class WorldRecoveryPool {
  private static instance: WorldRecoveryPool;
  private recoveredResources: {
    spiritStones: number;
    items: any[];
    equipment: any[];
  };

  private lastReinvestTime: number;

  private constructor() {
    this.recoveredResources = { spiritStones: 0, items: [], equipment: [] };
    this.lastReinvestTime = Date.now();
  }

  static getInstance(): WorldRecoveryPool {
    if (!WorldRecoveryPool.instance) {
      WorldRecoveryPool.instance = new WorldRecoveryPool();
    }
    return WorldRecoveryPool.instance;
  }

  private static readonly MAX_POOL_ITEMS = 200;

  addRecoveredResources(drops: DropItem[]): void {
    for (const drop of drops) {
      if (drop.recipient !== 'world_pool') continue;

      switch (drop.type) {
        case 'spirit_stones':
          this.recoveredResources.spiritStones += drop.amount || 0;
          break;
        case 'item':
          if (drop.item) this.recoveredResources.items.push(drop.item);
          break;
        case 'equipment':
          if (drop.equipment) this.recoveredResources.equipment.push(drop.equipment);
          break;
      }
    }
    // Cap arrays to prevent unbounded growth
    if (this.recoveredResources.items.length > WorldRecoveryPool.MAX_POOL_ITEMS) {
      this.recoveredResources.items.splice(0, this.recoveredResources.items.length - WorldRecoveryPool.MAX_POOL_ITEMS);
    }
    if (this.recoveredResources.equipment.length > WorldRecoveryPool.MAX_POOL_ITEMS) {
      this.recoveredResources.equipment.splice(0, this.recoveredResources.equipment.length - WorldRecoveryPool.MAX_POOL_ITEMS);
    }
  }

  getRecoveryStatus(): { totalSpiritStones: number; itemCount: number; equipmentCount: number } {
    return {
      totalSpiritStones: this.recoveredResources.spiritStones,
      itemCount: this.recoveredResources.items.length,
      equipmentCount: this.recoveredResources.equipment.length
    };
  }

  reinvestToWorld(layerId: string): void {
    const layerConfig = LAYER_CONFIGS.find(l => l.layer === parseInt(layerId));
    if (!layerConfig) return;

    const reinvestAmount = this.recoveredResources.spiritStones * 0.5;

    this.recoveredResources.spiritStones *= 0.5;
    this.recoveredResources.items.length = 0;
    this.recoveredResources.equipment.length = 0;

    const currentInterval = Date.now() - this.lastReinvestTime;
    if (currentInterval > 24 * 60 * 60 * 1000) {
      this.lastReinvestTime = Date.now();
    }
  }
}

export class DeathService {
  private static instance: DeathService;

  private constructor() {}

  static getInstance(): DeathService {
    if (!DeathService.instance) {
      DeathService.instance = new DeathService();
    }
    return DeathService.instance;
  }

  processDeath(npc: NPCEntity, params: { cause: DeathCause; killerId: string | null; killerType: 'player' | 'npc' | null }): any {
    npc.state = NPCLifeState.Dying;
    npc.activity = NPCActivity.Dead;

    const dropResult = DeathDropService.getInstance().calculateDrop(npc, params.killerId || '', params.killerType || 'npc');

    this.distributeDrops(dropResult);

    const soulData = this.createSoulRecord(npc, params.cause);
    ReincarnationPool.getInstance().addSoul(npc.id, soulData);

    this.processSocialImpact(npc, params);

    this.notifyRelatedEntities(npc, dropResult, params);

    EventBus.emit(DeathEvent.NPC_DIED, {
      npcId: npc.id,
      clanId: npc.clanId,
      cause: params.cause,
      killerId: params.killerId,
      drops: dropResult.drops
    });

    return {
      npcId: npc.id,
      cause: params.cause,
      drops: dropResult.drops,
      soul: soulData
    };
  }

  private createSoulRecord(npc: NPCEntity, cause: DeathCause): SoulData {
    return {
      originalNpcId: npc.id,
      originalClanId: npc.clanId,
      originalNation: npc.nation,
      originalRealm: npc.realm,
      deathCause: cause,
      deathTime: Date.now(),
      inheritedResources: this.calculateInheritedResources(npc)
    };
  }

  private calculateInheritedResources(npc: NPCEntity): number {
    const birthTypeModifier = this.getBirthTypeModifier(npc.birthType);
    return npc.resources.spiritStones * birthTypeModifier;
  }

  private getBirthTypeModifier(birthType: BirthType): number {
    switch (birthType) {
      case BirthType.Natural:
        return 0.2;
      case BirthType.WarOrphan:
        return 0.5;
      case BirthType.Wanderer:
        return 0.3;
      case BirthType.DemonBeast:
        return 0.1;
    }
  }

  private distributeDrops(dropResult: DropResult): void {
    for (const drop of dropResult.drops) {
      if (drop.recipient === 'world_pool') continue;
    }
    WorldRecoveryPool.getInstance().addRecoveredResources(dropResult.worldRecovery);
  }

  private processSocialImpact(npc: NPCEntity, params: { killerId: string | null; killerType: 'player' | 'npc' | null }): void {
    if (params.killerType === 'player' && params.killerId) {
    }
  }

  private notifyRelatedEntities(npc: NPCEntity, dropResult: DropResult, params: { killerId: string | null; killerType: 'player' | 'npc' | null }): void {
    if (params.killerType === 'player' && params.killerId) {
    }
  }
}