# NPC生死轮回与人口平衡代码设计

## 1. 死亡系统

### 1.1 死亡类型与触发条件

```typescript
enum DeathCause {
  AgeLimit = 'age_limit',                 // 寿元耗尽
  Battle = 'battle',                     // 战死沙场
  CultivationFail = 'cultivation_fail',   // 修炼失败
  MonsterAttack = 'monster_attack',       // 妖兽猎杀
  Robbery = 'robbery',                   // 资源争夺
  LawEnforcement = 'law_enforcement',     // 执法追杀
  TribulationFail = 'tribulation_fail',  // 渡劫失败
  FireDeviation = 'fire_deviation'       // 修炼走火
}

interface DeathConfig {
  cause: DeathCause;
  playerInfluence: boolean;
  baseFrequency: 'high' | 'medium' | 'low';
  triggers?: string[];
}

const DEATH_CONFIGS: Record<DeathCause, DeathConfig> = {
  [DeathCause.Battle]: {
    cause: DeathCause.Battle,
    playerInfluence: true,
    baseFrequency: 'high',
    triggers: ['nation_war', 'family_war']
  },
  [DeathCause.MonsterAttack]: {
    cause: DeathCause.MonsterAttack,
    playerInfluence: true,
    baseFrequency: 'medium',
    triggers: ['exploration', 'resource_collection']
  },
  [DeathCause.Robbery]: {
    cause: DeathCause.Robbery,
    playerInfluence: true,
    baseFrequency: 'medium',
    triggers: ['resource_competition']
  },
  [DeathCause.LawEnforcement]: {
    cause: DeathCause.LawEnforcement,
    playerInfluence: true,
    baseFrequency: 'continuous',
    triggers: ['family_reputation_zero']
  },
  [DeathCause.TribulationFail]: {
    cause: DeathCause.TribulationFail,
    playerInfluence: false,
    baseFrequency: 'probabilistic'
  },
  [DeathCause.AgeLimit]: {
    cause: DeathCause.AgeLimit,
    playerInfluence: false,
    baseFrequency: 'periodic'
  },
  [DeathCause.FireDeviation]: {
    cause: DeathCause.FireDeviation,
    playerInfluence: false,
    baseFrequency: 'very_low'
  },
  [DeathCause.CultivationFail]: {
    cause: DeathCause.CultivationFail,
    playerInfluence: false,
    baseFrequency: 'low'
  }
};
```

### 1.2 寿元系统

```typescript
interface LifespanConfig {
  realm: RealmLevel;
  baseLifespan: number;     // 年
  maxLifespan: number;      // 年
  deathProbabilityPerYear: number; // 老年后每年死亡概率
}

const REALM_LIFESPANS: Record<RealmLevel, LifespanConfig> = {
  [RealmLevel.Mortal]: { baseLifespan: 80, maxLifespan: 100, deathProbabilityPerYear: 0.1 },
  [RealmLevel.QiRefining]: { baseLifespan: 100, maxLifespan: 120, deathProbabilityPerYear: 0.15 },
  [RealmLevel.FoundationBuilding]: { baseLifespan: 150, maxLifespan: 200, deathProbabilityPerYear: 0.08 },
  [RealmLevel.GoldenCore]: { baseLifespan: 300, maxLifespan: 400, deathProbabilityPerYear: 0.05 },
  [RealmLevel.YuanInfant]: { baseLifespan: 800, maxLifespan: 1000, deathProbabilityPerYear: 0.03 },
  [RealmLevel.Transcension]: { baseLifespan: 2000, maxLifespan: 3000, deathProbabilityPerYear: 0.01 }
};

class LifespanSystem {
  private static instance: LifespanSystem;

  static getInstance(): LifespanSystem {
    if (!LifespanSystem.instance) {
      LifespanSystem.instance = new LifespanSystem();
    }
    return LifespanSystem.instance;
  }

  updateAge(npc: NPCEntity, deltaYears: number): void {
    npc.age += deltaYears;
    const lifespanConfig = REALM_LIFESPANS[npc.realm];

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
```

## 2. 死亡掉落系统

### 2.1 掉落规则

```typescript
interface DropRule {
  resourceType: 'spirit_stones' | 'items' | 'equipment';
  dropRate: number;          // 0-1
  minAmount?: number;
  maxAmount?: number;
  condition?: (npc: NPCEntity) => boolean;
}

interface DeathDropConfig {
  baseSpiritStoneDropRate: number;    // 40%-60%
  baseItemDropCount: { min: number; max: number };
  equipmentDropRate: number;          // 30%损坏率
  spaceTurbulenceRate: number;        // 10%
  familyContributionRefundRate: number; // 50%
  worldRecoveryRate: number;          // 15%-20%
}

const DEATH_DROP_CONFIG: DeathDropConfig = {
  baseSpiritStoneDropRate: 0.5,
  baseItemDropCount: { min: 1, max: 3 },
  equipmentDropRate: 0.3,
  spaceTurbulenceRate: 0.1,
  familyContributionRefundRate: 0.5,
  worldRecoveryRate: 0.175
};

class DeathDropService {
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
    const clan = ClanService.getInstance().getClan(npc.clanId);
    if (clan) {
      clan.storage.spiritStones += familyContributionRefund;
    }

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
    const layerMultiplier = LAYER_CONFIGS.find(l => l.layer === npc.layer)?.resourceMultiplier || 1;
    return baseDrop * layerMultiplier;
  }

  private calculateFavorabilityChange(npc: NPCEntity, killerType: 'player' | 'npc'): number {
    if (killerType === 'npc') return 0;

    const isMerchant = npc.role === NPCRole.Elder && npc.activity === NPCActivity.Trade;
    return isMerchant ? -20 : -10;
  }
}

interface DropItem {
  type: 'spirit_stones' | 'item' | 'equipment';
  amount?: number;
  item?: Item;
  equipment?: Equipment;
  recipient: string;
}

interface DropResult {
  drops: DropItem[];
  worldRecovery: DropItem[];
  actualWorldRecovery: number;
  familyFavorabilityChange: number;
}
```

### 2.2 死亡结算

```typescript
class DeathService {
  private static instance: DeathService;

  static getInstance(): DeathService {
    if (!DeathService.instance) {
      DeathService.instance = new DeathService();
    }
    return DeathService.instance;
  }

  processDeath(npc: NPCEntity, params: { cause: DeathCause; killerId: string | null; killerType: 'player' | 'npc' | null }): DeathResult {
    npc.state = NPCLifeState.Dying;
    npc.activity = NPCActivity.Dead;

    const dropResult = this.calculateDrops(npc, params.killerId, params.killerType);

    this.distributeDrops(dropResult);

    const soulData = this.createSoulRecord(npc, params.cause);
    ReincarnationPool.getInstance().addSoul(npc.id, soulData);

    this.processSocialImpact(npc, params);

    this.notifyRelatedEntities(npc, dropResult, params);

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

      if (drop.type === 'spirit_stones' && drop.amount) {
        PlayerService.getPlayer(drop.recipient)?.addResources({ spiritStones: drop.amount });
      } else if (drop.type === 'item' && drop.item) {
        PlayerService.getPlayer(drop.recipient)?.inventory.add(drop.item);
      } else if (drop.type === 'equipment' && drop.equipment) {
        PlayerService.getPlayer(drop.recipient)?.inventory.add(drop.equipment);
      }
    }
  }

  private processSocialImpact(npc: NPCEntity, params: { killerId: string | null; killerType: 'player' | 'npc' | null }): void {
    const clan = ClanService.getInstance().getClan(npc.clanId);
    if (!clan) return;

    clan.totalPower -= npc.power;

    if (npc.role === NPCRole.FamilyHead || npc.role === NPCRole.Elder) {
      this.handlePositionVacancy(clan, npc.role);
    }

    if (params.killerType === 'player' && params.killerId) {
      this.addToFamilyGrudge(clan, params.killerId);
      if (this.isImportantFigure(npc)) {
        this.triggerBounty(clan, params.killerId);
      }
    }
  }

  private handlePositionVacancy(clan: ClanData, vacatedRole: NPCRole): void {
    const eligibleMembers = clan.members
      .filter(m => m.role !== NPCRole.LawEnforcementElder)
      .sort((a, b) => b.power - a.power);

    if (eligibleMembers.length > 0) {
      const successor = eligibleMembers[0];
      successor.role = vacatedRole;
      EventBus.emit(ClanEvent.POSITION_CHANGED, {
        clanId: clan.id,
        oldRole: vacatedRole,
        newHolder: successor.id
      });
    }
  }

  private addToFamilyGrudge(clan: ClanData, killerId: string): void {
    if (!clan.grudges) {
      clan.grudges = [];
    }
    clan.grudges.push({
      killerId: killerId,
      time: Date.now(),
      permanent: true
    });
  }

  private triggerBounty(clan: ClanData, killerId: string): void {
    const bountyAmount = 1000 * (clan.level || 1);
    clan.activeBounties.push({
      targetId: killerId,
      amount: bountyAmount,
      startTime: Date.now()
    });
    EventBus.emit(ClanEvent.BOUNTY_ISSUED, {
      clanId: clan.id,
      targetId: killerId,
      amount: bountyAmount
    });
  }

  private isImportantFigure(npc: NPCEntity): boolean {
    return npc.role === NPCRole.FamilyHead ||
           npc.role === NPCRole.Elder ||
           npc.role === NPCRole.CoreDisciple;
  }

  private notifyRelatedEntities(npc: NPCEntity, dropResult: DropResult, params: { killerId: string | null; killerType: 'player' | 'npc' | null }): void {
    EventBus.emit(NPCEvent.DIED, {
      npcId: npc.id,
      clanId: npc.clanId,
      cause: params.cause,
      killerId: params.killerId,
      drops: dropResult.drops
    });

    if (params.killerType === 'player' && params.killerId) {
      BroadcastToArea(npc.position, {
        type: 'notification',
        message: `${npc.name} 已被击杀！`
      });
    }
  }
}
```

## 3. 天道回收系统

### 3.1 WorldRecoveryPool

```typescript
class WorldRecoveryPool {
  private static instance: WorldRecoveryPool;
  private recoveredResources: {
    spiritStones: number;
    items: Item[];
    equipment: Equipment[];
  } = { spiritStones: 0, items: [], equipment: [] };
  private lastReinvestTime: number = Date.now();

  static getInstance(): WorldRecoveryPool {
    if (!WorldRecoveryPool.instance) {
      WorldRecoveryPool.instance = new WorldRecoveryPool();
    }
    return WorldRecoveryPool.instance;
  }

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
    ResourceManager.getInstance().increaseResourceDensity(layerId, reinvestAmount);

    this.recoveredResources.spiritStones *= 0.5;

    const currentInterval = Date.now() - this.lastReinvestTime;
    if (currentInterval > 24 * 60 * 60 * 1000) {
      ResourceManager.getInstance().refreshResourcePoints(layerId);
      this.lastReinvestTime = Date.now();
    }
  }
}
```

## 4. 人口动态平衡系统

### 4.1 PopulationBalanceController

```typescript
interface PopulationTarget {
  layerId: string;
  totalTarget: number;
  nationTargets: Record<string, number>;
  familyTargets: Record<string, { min: number; max: number }>;
}

class PopulationBalanceController {
  private static instance: PopulationBalanceController;
  private populationHistory: Map<string, number[]> = new Map();
  private lastBirthCheck: Map<string, number> = new Map();
  private readonly BIRTH_CHECK_INTERVAL = 60 * 60 * 1000; // 1小时

  static getInstance(): PopulationBalanceController {
    if (!PopulationBalanceController.instance) {
      PopulationBalanceController.instance = new PopulationBalanceController();
    }
    return PopulationBalanceController.instance;
  }

  calculateTargetPopulation(layerId: string): PopulationTarget {
    const layerConfig = LAYER_CONFIGS.find(l => l.layer === parseInt(layerId));
    const flyingPlayers = this.getFlyingPlayerCount(layerId);
    const warModifier = this.getWarModifier(layerId);

    const baseTotal = 7 * 16 * 100; // 7国 × 16家族 × 100人
    const totalTarget = Math.floor((baseTotal + flyingPlayers * 5) * warModifier);

    const nationTargets: Record<string, number> = {};
    const nations = ['秦国', '楚国', '齐国', '燕国', '赵国', '魏国', '韩国'];
    for (const nation of nations) {
      nationTargets[nation] = Math.floor(totalTarget / 7);
    }

    const familyTargets: Record<string, { min: number; max: number }> = {};
    for (const nation of nations) {
      for (let i = 0; i < 16; i++) {
        const familyId = `${nation}_family_${i}`;
        familyTargets[familyId] = {
          min: Math.floor(totalTarget / 7 / 16 * 0.5),
          max: Math.floor(totalTarget / 7 / 16 * 1.5)
        };
      }
    }

    return {
      layerId,
      totalTarget,
      nationTargets,
      familyTargets
    };
  }

  update(layerId: string, currentPopulation: number): BirthDecision {
    const now = Date.now();
    const lastCheck = this.lastBirthCheck.get(layerId) || 0;

    if (now - lastCheck < this.BIRTH_CHECK_INTERVAL) {
      return { action: 'none' };
    }

    this.lastBirthCheck.set(layerId, now);

    const target = this.calculateTargetPopulation(layerId);
    const deficit = target.totalTarget - currentPopulation;

    if (deficit > target.totalTarget * 0.1) {
      const birthCount = this.randomRange(5, 10);
      return {
        action: 'batch_birth',
        count: birthCount,
        distribution: this.distributeByNation(target)
      };
    }

    const nationDeficits = this.checkNationDeficits(layerId, target);
    for (const deficit of nationDeficits) {
      if (deficit.ratio < 0.8) {
        return {
          action: 'nation_targeted_birth',
          count: this.randomRange(3, 5),
          nation: deficit.nation
        };
      }
    }

    const familyDeficits = this.checkFamilyDeficits(layerId, target);
    for (const deficit of familyDeficits) {
      if (deficit.current < deficit.target.min) {
        return {
          action: 'family_targeted_birth',
          count: this.randomRange(1, 2),
          familyId: deficit.familyId
        };
      }
    }

    if (this.noBirthForDays(layerId) >= 3) {
      return {
        action: 'forced_birth',
        count: 1
      };
    }

    return { action: 'none' };
  }

  private checkNationDeficits(layerId: string, target: PopulationTarget): Array<{ nation: string; current: number; target: number; ratio: number }> {
    const result = [];
    for (const [nation, nationTarget] of Object.entries(target.nationTargets)) {
      const current = this.getNationPopulation(layerId, nation);
      result.push({
        nation,
        current,
        target: nationTarget,
        ratio: current / nationTarget
      });
    }
    return result;
  }

  private checkFamilyDeficits(layerId: string, target: PopulationTarget): Array<{ familyId: string; current: number; target: { min: number; max: number } }> {
    const result = [];
    for (const [familyId, familyTarget] of Object.entries(target.familyTargets)) {
      const current = this.getFamilyPopulation(layerId, familyId);
      result.push({ familyId, current, target: familyTarget });
    }
    return result;
  }

  private noBirthForDays(layerId: string): number {
    const lastBirth = this.lastBirthCheck.get(layerId) || Date.now();
    return (Date.now() - lastBirth) / (24 * 60 * 60 * 1000);
  }

  private distributeByNation(target: PopulationTarget): Record<string, number> {
    const distribution: Record<string, number> = {};
    const nations = Object.keys(target.nationTargets);
    const totalCount = 5 + Math.floor(Math.random() * 6);

    let remaining = totalCount;
    for (let i = 0; i < nations.length - 1; i++) {
      const count = Math.floor(remaining / (nations.length - i));
      distribution[nations[i]] = count;
      remaining -= count;
    }
    distribution[nations[nations.length - 1]] = remaining;

    return distribution;
  }

  private getNationPopulation(layerId: string, nation: string): number {
    return GameWorld.getInstance().getNPCs().filter(n => n.nation === nation && n.layer === layerId).length;
  }

  private getFamilyPopulation(layerId: string, familyId: string): number {
    return GameWorld.getInstance().getNPCs().filter(n => n.clanId === familyId && n.layer === layerId).length;
  }

  private getFlyingPlayerCount(layerId: string): number {
    return PlayerService.getPlayers().filter(p => p.currentLayer === layerId && p.hasFlying).length;
  }

  private getWarModifier(layerId: string): number {
    const warActive = WarService.getInstance().isWarActive(layerId);
    if (warActive) {
      const warDuration = WarService.getInstance().getWarDuration(layerId);
      if (warDuration > 30) return 0.85;
      if (warDuration > 14) return 0.9;
      if (warDuration > 7) return 0.95;
      return 0.95;
    }
    return 1.0;
  }

  private randomRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

interface BirthDecision {
  action: 'none' | 'batch_birth' | 'nation_targeted_birth' | 'family_targeted_birth' | 'forced_birth';
  count?: number;
  nation?: string;
  familyId?: string;
  distribution?: Record<string, number>;
}
```

### 4.2 PID控制器

```typescript
class PIDBirthController {
  private kp: number = 0.1;  // 比例系数
  private ki: number = 0.01; // 积分系数
  private kd: number = 0.05; // 微分系数

  private integralError: number = 0;
  private previousError: number = 0;
  private errorHistory: number[] = [];

  calculateBirthRate(currentPopulation: number, targetPopulation: number): number {
    const error = targetPopulation - currentPopulation;

    this.integralError += error;
    const derivativeError = error - this.previousError;

    this.errorHistory.push(error);
    if (this.errorHistory.length > 100) {
      this.errorHistory.shift();
    }

    const proportional = this.kp * error;
    const integral = this.ki * this.integralError;
    const derivative = this.kd * derivativeError;

    this.previousError = error;

    const adjustment = proportional + integral + derivative;

    const baseRate = 8; // 第9层基准
    return Math.max(0, Math.floor(baseRate + adjustment));
  }

  reset(): void {
    this.integralError = 0;
    this.previousError = 0;
    this.errorHistory = [];
  }
}
```

## 5. 资源循环系统

### 5.1 ResourceCycleManager

```typescript
class ResourceCycleManager {
  private static instance: ResourceCycleManager;

  static getInstance(): ResourceCycleManager {
    if (!ResourceCycleManager.instance) {
      ResourceCycleManager.instance = new ResourceCycleManager();
    }
    return ResourceCycleManager.instance;
  }

  processNPCDeathResources(npc: NPCEntity, killerId: string | null): void {
    const deathConfig = DEATH_DROP_CONFIG;
    const spiritStoneTotal = npc.resources.spiritStones;

    const droppedToKiller = spiritStoneTotal * deathConfig.baseSpiritStoneDropRate;
    const recoveredToWorld = spiritStoneTotal * (1 - deathConfig.baseSpiritStoneDropRate) * deathConfig.worldRecoveryRate;

    if (killerId) {
      const player = PlayerService.getPlayer(killerId);
      if (player) {
        player.addResources({ spiritStones: droppedToKiller });
        player.addKillReputation(this.getKillReputationBonus(npc));

        if (npc.nation === '秦国') {
          player.addNationBonus('秦国', 'kill_exp', 0.1);
        }
      }
    }

    WorldRecoveryPool.getInstance().addRecoveredResources([{
      type: 'spirit_stones',
      amount: recoveredToWorld,
      recipient: 'world_pool'
    }]);
  }

  processNPCBirthResources(npc: NPCEntity): void {
    if (npc.birthType === BirthType.Natural) {
      const clan = ClanService.getInstance().getClan(npc.clanId);
      if (clan) {
        const养育费 = 100 * (LAYER_CONFIGS.find(l => l.layer === parseInt(npc.layer))?.resourceMultiplier || 1);
        clan.storage.spiritStones -=养育费;
      }
    } else if (npc.birthType === BirthType.Wanderer) {
      npc.resources = {
        spiritStones: 50,
        items: [ItemService.createItem('回血丹'), ItemService.createItem('聚气散')],
        equipment: ItemService.createEquipment('低级法器'),
        familyContribution: 0
      };
    } else if (npc.birthType === BirthType.DemonBeast) {
      npc.resources = {
        spiritStones: 0,
        items: [ItemService.createItem('妖兽材料'), ItemService.createItem('妖兽材料'), ItemService.createItem('妖兽材料')],
        equipment: null,
        familyContribution: 0
      };
    }
  }

  private getKillReputationBonus(npc: NPCEntity): number {
    const realmMultipliers: Record<RealmLevel, number> = {
      [RealmLevel.Mortal]: 10,
      [RealmLevel.QiRefining]: 20,
      [RealmLevel.FoundationBuilding]: 50,
      [RealmLevel.GoldenCore]: 100,
      [RealmLevel.YuanInfant]: 200,
      [RealmLevel.Transcension]: 500
    };
    return realmMultipliers[npc.realm] || 10;
  }

  getCycleStatistics(): ResourceCycleStats {
    const totalNpcs = GameWorld.getInstance().getNPCs().length;
    const avgResourcesPerNpc = this.calculateAverageResources();
    const worldPool = WorldRecoveryPool.getInstance().getRecoveryStatus();
    const reincarnationPool = ReincarnationPool.getInstance().getPoolStatus();

    return {
      totalNpcs,
      avgResourcesPerNpc,
      worldRecoveryPool: worldPool,
      reincarnationPoolSize: reincarnationPool.totalCount,
      deathRate: this.calculateDeathRate(),
      birthRate: this.calculateBirthRate()
    };
  }

  private calculateAverageResources(): number {
    const npcs = GameWorld.getInstance().getNPCs();
    if (npcs.length === 0) return 0;
    const total = npcs.reduce((sum, n) => sum + n.resources.spiritStones, 0);
    return total / npcs.length;
  }

  private calculateDeathRate(): number {
    return 0;
  }

  private calculateBirthRate(): number {
    return 0;
  }
}

interface ResourceCycleStats {
  totalNpcs: number;
  avgResourcesPerNpc: number;
  worldRecoveryPool: { totalSpiritStones: number; itemCount: number; equipmentCount: number };
  reincarnationPoolSize: number;
  deathRate: number;
  birthRate: number;
}
```

## 6. 数值设计参考

### 6.1 NPC生涯总账计算

```typescript
class NPCLifeCycleCalculator {
  static calculateTotalContribution(npc: NPCEntity): LifeCycleSummary {
    const layerMultiplier = LAYER_CONFIGS.find(l => l.layer === parseInt(npc.layer))?.resourceMultiplier || 1;
    const avgLifespan = 65; // 平均寿命65岁（未突破筑基）

    const birthCost = 100 * layerMultiplier;

    const yearlyConsumption = 10 * 12; // 月俸10灵石
    const cultivationCost = 300 * layerMultiplier; // 突破消耗
    const totalConsumption = birthCost + yearlyConsumption * avgLifespan + cultivationCost;

    const yearlyIncome = 30 * 12; // 月收入30灵石
    const opportunityIncome = 300 * layerMultiplier; // 机缘收益
    const totalIncome = yearlyIncome * avgLifespan + opportunityIncome;

    const netContribution = totalIncome - totalConsumption;

    const deathDropRange = {
      min: netContribution * 0.25,
      max: netContribution * 0.375
    };
    const worldLoss = netContribution * 0.175;

    return {
      birthCost,
      totalConsumption,
      totalIncome,
      netContribution,
      deathDrop: deathDropRange,
      worldLoss,
      netContributionPerYear: netContribution / avgLifespan
    };
  }
}

interface LifeCycleSummary {
  birthCost: number;
  totalConsumption: number;
  totalIncome: number;
  netContribution: number;
  deathDrop: { min: number; max: number };
  worldLoss: number;
  netContributionPerYear: number;
}
```

## 7. 数据库设计

### 7.1 死亡相关表

```sql
CREATE TABLE death_records (
  id TEXT PRIMARY KEY,
  npc_id TEXT NOT NULL,
  npc_name TEXT NOT NULL,
  clan_id TEXT NOT NULL,
  nation TEXT NOT NULL,
  realm TEXT NOT NULL,
  death_cause TEXT NOT NULL,
  death_time INTEGER NOT NULL,
  killer_id TEXT,
  killer_type TEXT,
  dropped_spirit_stones INTEGER,
  dropped_items_json TEXT,
  dropped_equipment_json TEXT,
  world_recovery_spirit_stones INTEGER,
  family_favorability_change INTEGER,
  layer_id INTEGER NOT NULL,
  FOREIGN KEY (npc_id) REFERENCES npcs(id)
);

CREATE TABLE soul_pool (
  id TEXT PRIMARY KEY,
  original_npc_id TEXT NOT NULL,
  original_clan_id TEXT NOT NULL,
  original_nation TEXT NOT NULL,
  original_realm TEXT NOT NULL,
  death_cause TEXT NOT NULL,
  death_time INTEGER NOT NULL,
  pool_entry_time INTEGER NOT NULL,
  inherited_resources INTEGER,
  status TEXT DEFAULT 'waiting' -- waiting, assigned, reborn
);

CREATE TABLE population_history (
  id TEXT PRIMARY KEY,
  layer_id INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  total_npc_count INTEGER NOT NULL,
  nation_counts_json TEXT,
  family_counts_json TEXT,
  birth_count INTEGER DEFAULT 0,
  death_count INTEGER DEFAULT 0
);

CREATE INDEX idx_death_records_time ON death_records(death_time);
CREATE INDEX idx_death_records_clan ON death_records(clan_id);
CREATE INDEX idx_soul_pool_status ON soul_pool(status);
CREATE INDEX idx_soul_pool_entry_time ON soul_pool(pool_entry_time);
CREATE INDEX idx_population_history_layer ON population_history(layer_id, timestamp);
```

## 8. 事件定义

```typescript
enum DeathEvent {
  NPC_DIED = 'death:npc_died',
  DROP_DISTRIBUTED = 'death:drop_distributed',
  SOUL_ENTER_POOL = 'death:soul_enter_pool',
  FAMILY_REPUTATION_CHANGED = 'death:family_reputation_changed',
  BOUNTY_ISSUED = 'death:bounty_issued',
  POSITION_VACATED = 'death:position_vacated'
}

enum PopulationEvent {
  BIRTH_TRIGGERED = 'population:birth_triggered',
  BIRTH_COMPLETED = 'population:birth_completed',
  POPULATION_UPDATED = 'population:updated',
  NATION_BALANCE_ADJUSTED = 'population:nation_balance_adjusted',
  FAMILY_BALANCE_ADJUSTED = 'population:family_balance_adjusted'
}
```

## 9. 相关文档索引

| 关联文档 | 关联内容 |
|:---|:---|
| [06-NPC行为与生命周期代码设计.md](06-NPC行为与生命周期代码设计.md) | 行为树、NPC诞生、NPC日常活动 |
| [02-家族势力体系代码设计.md](02-家族势力体系代码设计.md) | 家族层级、职位继承、家族资金 |
| [05-经济系统代码设计.md](05-经济系统代码设计.md) | 灵石流通、坊市交易 |
| [04-地图资源系统代码设计.md](04-地图资源系统代码设计.md) | 资源点刷新、妖兽生态 |

---

## 10. LLM决策集成

### 10.1 轮回调控LLM调用

```typescript
// server/game/services/ReincarnationControlLLM.ts

interface ReincarnationControlContext {
  trigger_type: 'BIRTH_DECISION' | 'DEATH_NARRATIVE' | 'WAR_ASSESSMENT';
  world_status: {
    total_npc_count: number;
    target_npc_count: number;
    layer: number;
    recent_death_rate: number;
  };
  reincarnation_pool: {
    pending_souls: number;
    available_birth_slots: number;
  };
  family_distribution_needed: Record<string, number>;
  player_context: {
    active_players: number;
    war_ongoing: boolean;
  };
}

class ReincarnationControlLLM {
  async generateDecision(context: ReincarnationControlContext): Promise<ReincarnationDecision> {
    const prompt = this.buildDecisionPrompt(context);
    const response = await LLMGatewayService.getInstance().call(prompt);
    return JSON.parse(response);
  }

  private buildDecisionPrompt(context: ReincarnationControlContext): string {
    return `
      你是一个修仙世界的"天道意志"，负责调控世界人口的轮回平衡。
      当前世界状态：总NPC${context.world_status.total_npc_count}人，
      目标${context.world_status.target_npc_count}人，
      待转生灵魂${context.reincarnation_pool.pending_souls}个。
      玩家状态：活跃玩家${context.player_context.active_players}人，
      战争状态：${context.player_context.war_ongoing ? '进行中' : '和平'}.
      请生成人口调控决策，包括诞生分配和死亡叙事等。
      返回JSON格式的决策。
    `;
  }
}

interface ReincarnationDecision {
  decision_id: string;
  decision_type: 'BIRTH_ALLOCATION' | 'DEATH_NARRATIVE' | 'WAR_ASSESSMENT';
  allocations?: Array<{
    birth_type: string;
    target_family: string;
    count: number;
    inheritance_bonus: number;
    initial_personality: Record<string, number>;
  }>;
  narrative_prompts?: string[];
  war_recommendations?: Array<{
    action: string;
    target: string;
    priority: number;
  }>;
}
```

### 10.2 死亡叙事生成

```typescript
// server/game/services/DeathNarrativeLLM.ts

interface DeathNarrativeContext {
  npc_id: string;
  npc_name: string;
  npc_realm: string;
  death_cause: DeathCause;
  killer_id?: string;
  killer_name?: string;
  inheritance?: {
    spirit_stones: number;
    items: string[];
  };
}

class DeathNarrativeLLM {
  async generateNarrative(context: DeathNarrativeContext): Promise<DeathNarrative> {
    const prompt = this.buildNarrativePrompt(context);
    const response = await LLMGatewayService.getInstance().call(prompt);
    return JSON.parse(response);
  }

  private buildNarrativePrompt(context: DeathNarrativeContext): string {
    return `
      你是一个修仙世界的叙事系统，需要为NPC死亡事件生成叙事文本。
      死亡NPC：${context.npc_name}，境界${context.npc_realm}，
      死因：${this.getDeathCauseDescription(context.death_cause)}。
      ${context.killer_name ? `击杀者：${context.killer_name}` : ''}
      遗产：灵石${context.inheritance?.spirit_stones || 0}。
      请生成一段死亡叙事，包括遗言、遗愿等。
      返回JSON格式。
    `;
  }

  private getDeathCauseDescription(cause: DeathCause): string {
    const descriptions = {
      [DeathCause.Battle]: '战死沙场',
      [DeathCause.AgeLimit]: '寿元耗尽',
      [DeathCause.TribulationFail]: '渡劫失败',
      // ... other causes
    };
    return descriptions[cause] || '未知原因';
  }
}

interface DeathNarrative {
  death_scene: string;
  last_words: string;
  legacy_hints: string[];
  revenge_trigger?: {
    type: 'family_grudge' | 'personal_grudge';
    target_id: string;
  };
}
```

---

## 11. 实现状态 (2026-04)

### 已实现
- `LifespanSystem` (寿元追踪、基础/最大寿命、概率死亡)
- `DeathDropService` (计算掉落: 50%灵石/1-3物品/30%装备损毁/50%家族返还)
- `ReincarnationPool` (灵魂存储、pool状态查询)
- `WorldRecoveryPool` (资源回收累积、每日50% reinvest)
- `DeathService.processDeath` (流程框架)
- `PIDBirthController` (Kp=0.1/Ki=0.01/Kd=0.05)
- `PopulationBalanceController` (1h检查、分层target计算 7x16x100=11200)

### 关键 Bug
- `distributeDrops` 循环体为空:掉落被计算但从未交付给击杀者
- `processSocialImpact` 空壳: 家族实力/仇恨/赏金完全未实现
- `notifyRelatedEntities` 空壳
- `ReincarnationPool.checkBirthConditions` 始终返回 `{ shouldBorn: false }`: 转世彻底不工作
- `checkNationDeficits` 和 `checkFamilyDeficits` 硬编码 `current=0`: 永远检测到满缺口
- `deathCause` 字符串与 `PopulationBalanceSystem` 国家名使用汉字 vs NPCCreationSystem使用拼音，永不匹配

### 未实现
- **宗族赏金系统**: `activeBounties` 被引用但未定义
- **死亡叙事LLM** (`DeathNarrativeLLM`): 设计10.2节未实现
- **转世控制LLM** (`ReincarnationControlLLM`): 设计10.1节未实现
- `NPCLifeCycleCalculator`: 未实现
- `DataService` 中 `death_records`/`npc_death_records` 表存在但从未写入

### 与 docs/ 设计差距
- docs中的心腹NPC轮回转生(10人魂空间/忠诚度保留/跨epoch进化)未实现
- docs中的战争人口损失曲线未实现
- docs中的妖兽-捕食者模型未实现