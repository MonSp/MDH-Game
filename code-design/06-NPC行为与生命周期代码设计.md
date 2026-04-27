# NPC行为与生命周期代码设计

## 1. 数据模型

### 1.1 NPC核心属性

```typescript
interface NPCBaseAttributes {
  id: string;
  name: string;
  clanId: string;
  role: NPCRole;
  realm: RealmLevel;
  power: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  activity: NPCActivity;
  position: { x: number; y: number };
}

enum NPCRole {
  FamilyHead = 'family_head',      // 家主
  Elder = 'elder',                  // 长老
  CoreDisciple = 'core_disciple',   // 核心子弟
  InnerDisciple = 'inner_disciple', // 内门子弟
  BranchDisciple = 'branch_disciple', // 支脉子弟
  LawEnforcementElder = 'law_enforcement_elder' // 执法堂长老
}

enum RealmLevel {
  Mortal = 'mortal',        // 凡人
  QiRefining = 'qi_refining', // 练气
  FoundationBuilding = 'foundation_building', // 筑基
  GoldenCore = 'golden_core', // 金丹
  YuanInfant = 'yuan_infant', // 元婴
  Transcension = 'transcension' // 化神
}

enum NPCActivity {
  Patrol = 'patrol',           // 巡逻边界
  Retreat = 'retreat',         // 闭关突破
  Logistics = 'logistics',      // 后勤炼丹
  Compete = 'compete',         // 争夺机缘
  Work = 'work',               // 坊市打工
  Rest = 'rest',               // 打坐吐纳
  Trade = 'trade',             // 坊市跑商
  Flee = 'flee',              // 重伤逃遁
  Chase = 'chase',            // 追杀中
  Dead = 'dead'               // 死亡
}
```

### 1.2 人格参数

```typescript
interface NPCPersonality {
  ambition: number;    // 野心 (0-100)
  caution: number;     // 谨慎 (0-100)
  loyalty: number;     // 忠诚 (0-100)
  greed: number;       // 贪婪 (0-100)
}

interface PersonalityConfig {
  BASE_RANGE: { min: number; max: number };  // 0-100
  AMBITION_IMPACT = 0.2;
  CAUTION_IMPACT = 0.2;
  LOYALTY_IMPACT = 0.2;
  GREED_IMPACT = 0.2;
}
```

### 1.3 国家特质对人格的影响

```typescript
const NATIONALITY_PERSONALITY_BONUS: Record<string, Partial<NPCPersonality>> = {
  '秦国': { ambition: 20, loyalty: 20 },
  '楚国': { caution: 20 },
  '齐国': { caution: 10, ambition: 10 },
  '燕国': { caution: 20, greed: -10 },
  '赵国': { ambition: 10, greed: 10 },
  '魏国': { loyalty: 20 },
  '韩国': { greed: 20, caution: 10 }
};
```

### 1.4 层级灵气倍率

```typescript
interface LayerConfig {
  layer: number;
  name: string;
  spiritMultiplier: number;
  resourceMultiplier: number;
  npcPowerRange: { min: number; max: number };
  maxRealm: RealmLevel;
}

const LAYER_CONFIGS: LayerConfig[] = [
  { layer: 9, name: '凡界·新生地', spiritMultiplier: 1.0, resourceMultiplier: 1.0, npcPowerRange: { min: 500, max: 10000 }, maxRealm: RealmLevel.Transcension },
  { layer: 8, name: '灵界·汇聚地', spiritMultiplier: 1.5, resourceMultiplier: 1.5, npcPowerRange: { min: 750, max: 15000 }, maxRealm: RealmLevel.FakeGod },
  { layer: 7, name: '灵界·争锋地', spiritMultiplier: 2.0, resourceMultiplier: 2.0, npcPowerRange: { min: 1000, max: 20000 }, maxRealm: RealmLevel.Merging },
  { layer: 6, name: '灵界·霸业地', spiritMultiplier: 3.0, resourceMultiplier: 2.5, npcPowerRange: { min: 1500, max: 30000 }, maxRealm: RealmLevel.Completion },
  { layer: 5, name: '太虚·问道境', spiritMultiplier: 4.0, resourceMultiplier: 3.0, npcPowerRange: { min: 2000, max: 40000 }, maxRealm: RealmLevel.Tribulation },
  { layer: 4, name: '太虚·明道境', spiritMultiplier: 5.0, resourceMultiplier: 4.0, npcPowerRange: { min: 2500, max: 50000 }, maxRealm: RealmLevel.Tribulation },
  { layer: 3, name: '太虚·证道境', spiritMultiplier: 7.0, resourceMultiplier: 5.0, npcPowerRange: { min: 3000, max: 60000 }, maxRealm: RealmLevel.Tribulation },
  { layer: 2, name: '仙界·门槛', spiritMultiplier: 10.0, resourceMultiplier: 8.0, npcPowerRange: { min: 5000, max: 100000 }, maxRealm: RealmLevel.Tribulation },
  { layer: 1, name: '混元仙界', spiritMultiplier: 20.0, resourceMultiplier: 15.0, npcPowerRange: { min: 10000, max: 200000 }, maxRealm: RealmLevel.Tribulation }
];
```

## 2. 生命周期管理

### 2.1 NPC生命周期状态

```typescript
enum NPCLifeState {
  Waiting = 'waiting',     // 天道轮回池等待
  Born = 'born',           // 诞生
  Growing = 'growing',     // 成长中
  Active = 'active',       // 活跃
  Dying = 'dying',         // 死亡中
  Dead = 'dead'            // 死亡结算
}

interface NPCLifecycleData {
  lifeState: NPCLifeState;
  birthTime: number;
  age: number;
  deathCause?: DeathCause;
  inheritRealm?: RealmLevel;
  birthType: BirthType;
}

enum BirthType {
  Natural = 'natural',       // 自然诞生 (60%)
  WarOrphan = 'war_orphan',  // 战争遗孤 (20%)
  Wanderer = 'wanderer',     // 散修投靠 (15%)
  DemonBeast = 'demon_beast' // 妖兽化形 (5%)
}

enum DeathCause {
  AgeLimit = 'age_limit',           // 寿元耗尽
  Battle = 'battle',               // 战死沙场
  CultivationFail = 'cultivation_fail', // 修炼失败
  MonsterAttack = 'monster_attack', // 妖兽猎杀
  Robbery = 'robbery',             // 资源争夺
  LawEnforcement = 'law_enforcement', // 执法追杀
  TribulationFail = 'tribulation_fail', // 渡劫失败
  FireDeviation = 'fire_deviation'  // 修炼走火
}
```

### 2.2 天道轮回池

```typescript
class ReincarnationPool {
  private static instance: ReincarnationPool;
  private souls: Map<string, SoulData> = new Map();
  private birthCooldown: Map<string, number> = new Map();

  static getInstance(): ReincarnationPool {
    if (!ReincarnationPool.instance) {
      ReincarnationPool.instance = new ReincarnationPool();
    }
    return ReincarnationPool.instance;
  }

  addSoul(npcId: string, soul: SoulData): void {
    soul.poolEntryTime = Date.now();
    this.souls.set(npcId, soul);
  }

  getSoul(npcId: string): SoulData | undefined {
    return this.souls.get(npcId);
  }

  removeSoul(npcId: string): void {
    this.souls.delete(npcId);
  }

  getPoolStatus(): PoolStatus {
    const soulsArray = Array.from(this.souls.values());
    return {
      totalCount: soulsArray.length,
      byRealm: this.groupByRealm(soulsArray),
      byNation: this.groupByNation(soulsArray),
      byDeathCause: this.groupByDeathCause(soulsArray)
    };
  }

  checkBirthConditions(layerId: string): BirthResult {
    const layerConfig = this.getLayerConfig(layerId);
    const currentPopulation = this.getCurrentPopulation(layerId);
    const targetPopulation = layerConfig.targetPopulation;

    if (currentPopulation < targetPopulation * 0.9) {
      return { shouldBorn: true, count: this.randomRange(5, 10) };
    }

    const nationDeficits = this.checkNationBalance(layerId);
    for (const deficit of nationDeficits) {
      if (deficit < 0.8) {
        return { shouldBorn: true, count: this.randomRange(3, 5), nation: deficit.nation };
      }
    }

    const familyDeficits = this.checkFamilyBalance(layerId);
    for (const deficit of familyDeficits) {
      if (deficit < deficit.minPopulation) {
        return { shouldBorn: true, count: this.randomRange(1, 2), family: deficit.familyId };
      }
    }

    if (this.noBirthForDays(layerId) >= 3) {
      return { shouldBorn: true, count: 1 };
    }

    return { shouldBorn: false };
  }

  private noBirthForDays(layerId: string): number {
    const lastBirth = this.birthCooldown.get(layerId) || Date.now();
    const daysSinceLastBirth = (Date.now() - lastBirth) / (24 * 60 * 60 * 1000);
    return daysSinceLastBirth;
  }
}

interface SoulData {
  originalNpcId: string;
  originalClanId: string;
  originalNation: string;
  originalRealm: RealmLevel;
  deathCause: DeathCause;
  deathTime: number;
  poolEntryTime?: number;
  inheritedResources?: number;
}

interface PoolStatus {
  totalCount: number;
  byRealm: Record<RealmLevel, number>;
  byNation: Record<string, number>;
  byDeathCause: Record<DeathCause, number>;
}

interface BirthResult {
  shouldBorn: boolean;
  count?: number;
  nation?: string;
  family?: string;
}
```

### 2.3 NPC诞生服务

```typescript
class NPCBirthService {
  private static instance: NPCBirthService;

  static getInstance(): NPCBirthService {
    if (!NPCBirthService.instance) {
      NPCBirthService.instance = new NPCBirthService();
    }
    return NPCBirthService.instance;
  }

  createNPC(params: {
    layerId: string;
    clanId: string;
    nation: string;
    birthType: BirthType;
    parentData?: SoulData;
  }): NPCEntity {
    const layerConfig = LAYER_CONFIGS.find(l => l.layer === parseInt(params.layerId));
    const clanData = ClanService.getInstance().getClan(params.clanId);

    const personality = this.generatePersonality(params.nation, clanData, params.birthType);
    const realm = this.determineInitialRealm(params.birthType, params.parentData);
    const initialResources = this.calculateInitialResources(params.birthType, clanData);

    const npc: NPCEntity = {
      id: this.generateNPCId(),
      name: NameGenerator.generate(params.nation),
      clanId: params.clanId,
      nation: params.nation,
      role: NPCRole.BranchDisciple,
      realm: realm,
      power: this.calculatePower(realm, layerConfig),
      hp: this.calculateHP(realm, layerConfig),
      maxHp: this.calculateHP(realm, layerConfig),
      mp: this.calculateMP(realm, layerConfig),
      maxMp: this.calculateMP(realm, layerConfig),
      personality: personality,
      activity: NPCActivity.Rest,
      position: this.calculateSpawnPosition(clanData),
      birthTime: Date.now(),
      age: this.getInitialAge(params.birthType),
      birthType: params.birthType,
      resources: initialResources,
      state: NPCLifeState.Active
    };

    if (params.birthType === BirthType.Natural) {
      clanData.storage.spiritStones -= 100;
    }

    return npc;
  }

  private generatePersonality(nation: string, clan: ClanData, birthType: BirthType): NPCPersonality {
    const nationalBonus = NATIONALITY_PERSONALITY_BONUS[nation] || {};
    const clanBonus = this.getClanPersonalityBonus(clan);
    const birthTypeModifier = this.getBirthTypeModifier(birthType);

    return {
      ambition: this.clamp(50 + (nationalBonus.ambition || 0) + clanBonus.ambition + birthTypeModifier.ambition),
      caution: this.clamp(50 + (nationalBonus.caution || 0) + clanBonus.caution + birthTypeModifier.caution),
      loyalty: this.clamp(50 + (nationalBonus.loyalty || 0) + clanBonus.loyalty + birthTypeModifier.loyalty),
      greed: this.clamp(50 + (nationalBonus.greed || 0) + clanBonus.greed + birthTypeModifier.greed)
    };
  }

  private getClanPersonalityBonus(clan: ClanData): Partial<NPCPersonality> {
    const clanStrength = clan.members.reduce((sum, m) => sum + m.power, 0);
    if (clanStrength < 10000) {
      return { ambition: 20, greed: 20 };
    } else if (clanStrength > 50000) {
      return { ambition: -10, greed: -10 };
    }
    return { ambition: 0, greed: 0 };
  }

  private getBirthTypeModifier(birthType: BirthType): Partial<NPCPersonality> {
    switch (birthType) {
      case BirthType.Natural:
        return { loyalty: 0 };
      case BirthType.WarOrphan:
        return { caution: 10 };
      case BirthType.Wanderer:
        return { loyalty: -20, greed: 10 };
      case BirthType.DemonBeast:
        return { ambition: 20, loyalty: -30 };
    }
  }

  private getInitialAge(birthType: BirthType): number {
    switch (birthType) {
      case BirthType.Natural:
        return 16;
      case BirthType.WarOrphan:
        return 10;
      case BirthType.Wanderer:
        return this.randomRange(26, 40);
      case BirthType.DemonBeast:
        return 0;
    }
  }
}
```

## 3. 行为树系统

### 3.1 行为树核心架构

```typescript
enum BehaviorPriority {
  SURVIVAL = 1,      // 优先级1：生存应急
  FAMILY_DUTY = 2,    // 优先级2：家族职责
  OPPORTUNISM = 3,    // 优先级3：机缘竞争
  DAILY = 4           // 优先级4：日常自主
}

interface BehaviorWeight {
  patrol: number;
  retreat: number;
  logistics: number;
  explore: number;
  work: number;
  rest: number;
  trade: number;
}

const BASE_WEIGHTS: BehaviorWeight = {
  patrol: 10,
  retreat: 10,
  logistics: 10,
  explore: 10,
  work: 10,
  rest: 10,
  trade: 0
};

class BehaviorTree {
  private npc: NPCEntity;
  private currentBehavior: BehaviorWeight;

  constructor(npc: NPCEntity) {
    this.npc = npc;
    this.currentBehavior = { ...BASE_WEIGHTS };
  }

  evaluate(): NPCActivity {
    if (this.checkSurvivalCondition()) {
      return NPCActivity.Flee;
    }

    if (this.checkFamilyDutyCondition()) {
      return this.selectFamilyDutyBehavior();
    }

    if (this.checkOpportunityCondition()) {
      return NPCActivity.Compete;
    }

    return this.selectDailyBehavior();
  }

  private checkSurvivalCondition(): boolean {
    return this.npc.hp < this.npc.maxHp * 0.3;
  }

  private checkFamilyDutyCondition(): boolean {
    return true;
  }

  private checkOpportunityCondition(): boolean {
    const nearbyResourcePoints = ResourceManager.getInstance().getNearbyPoints(this.npc.position, 3);
    return nearbyResourcePoints.length > 0;
  }

  private selectFamilyDutyBehavior(): NPCActivity {
    const weights = this.calculateFamilyDutyWeights();
    return this.rouletteSelect(weights);
  }

  private selectDailyBehavior(): NPCActivity {
    const weights = this.calculateDailyWeights();
    return this.rouletteSelect(weights);
  }

  private calculateFamilyDutyWeights(): BehaviorWeight {
    const role = this.npc.role;
    const personality = this.npc.personality;
    const weights = { ...BASE_WEIGHTS };

    switch (role) {
      case NPCRole.FamilyHead:
      case NPCRole.Elder:
        weights.retreat += 30;
        weights.patrol += 10;
        weights.trade += this.personality.greed > 70 ? 30 : 0;
        break;
      case NPCRole.CoreDisciple:
      case NPCRole.InnerDisciple:
        weights.explore += 20;
        weights.patrol += 10;
        break;
      case NPCRole.BranchDisciple:
        weights.work += 20;
        weights.logistics += 20;
        break;
    }

    weights.explore += personality.ambition * 0.2;
    weights.retreat += personality.caution * 0.2;
    weights.logistics += personality.loyalty * 0.2;
    weights.work += personality.greed * 0.2;

    return weights;
  }

  private calculateDailyWeights(): BehaviorWeight {
    const weights = { ...BASE_WEIGHTS };
    const nearResourcePoints = ResourceManager.getInstance().getNearbyPoints(this.npc.position, 3);
    if (nearResourcePoints.length > 0) {
      weights.explore += 50;
    }
    if (this.npc.resources.spiritStones < 20) {
      weights.work += 30;
    }
    weights.rest += 10;
    return weights;
  }

  private rouletteSelect(weights: BehaviorWeight): NPCActivity {
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    const behaviorMap: [NPCActivity, number][] = [
      [NPCActivity.Patrol, weights.patrol],
      [NPCActivity.Retreat, weights.retreat],
      [NPCActivity.Logistics, weights.logistics],
      [NPCActivity.Compete, weights.explore],
      [NPCActivity.Work, weights.work],
      [NPCActivity.Rest, weights.rest],
      [NPCActivity.Trade, weights.trade]
    ];

    for (const [activity, weight] of behaviorMap) {
      random -= weight;
      if (random <= 0) {
        return activity;
      }
    }
    return NPCActivity.Rest;
  }
}
```

### 3.2 行为执行器

```typescript
class BehaviorExecutor {
  private npc: NPCEntity;
  private currentActivity: NPCActivity;
  private activityData: Map<string, any> = new Map();

  constructor(npc: NPCEntity) {
    this.npc = npc;
  }

  execute(activity: NPCActivity): void {
    if (this.currentActivity === activity) return;

    this.exitCurrentActivity();
    this.currentActivity = activity;
    this.enterActivity(activity);
  }

  update(deltaTime: number): void {
    if (!this.currentActivity) return;

    switch (this.currentActivity) {
      case NPCActivity.Patrol:
        this.executePatrol(deltaTime);
        break;
      case NPCActivity.Retreat:
        this.executeRetreat(deltaTime);
        break;
      case NPCActivity.Logistics:
        this.executeLogistics(deltaTime);
        break;
      case NPCActivity.Compete:
        this.executeCompete(deltaTime);
        break;
      case NPCActivity.Work:
        this.executeWork(deltaTime);
        break;
      case NPCActivity.Rest:
        this.executeRest(deltaTime);
        break;
      case NPCActivity.Trade:
        this.executeTrade(deltaTime);
        break;
      case NPCActivity.Flee:
        this.executeFlee(deltaTime);
        break;
      case NPCActivity.Chase:
        this.executeChase(deltaTime);
        break;
    }
  }

  private executePatrol(deltaTime: number): void {
    const patrolPoints = this.getPatrolPoints();
    const currentTarget = this.activityData.get('currentTarget') || patrolPoints[0];

    if (this.npc.distanceTo(currentTarget) < 10) {
      const nextIndex = (patrolPoints.indexOf(currentTarget) + 1) % patrolPoints.length;
      this.activityData.set('currentTarget', patrolPoints[nextIndex]);
    } else {
      this.npc.moveTo(currentTarget.x, currentTarget.y, deltaTime);
    }
  }

  private executeRetreat(deltaTime: number): void {
    if (this.npc.personality.ambition > 70 && Math.random() < 0.1) {
      this.npc.power += this.calculatePowerGain();
      EventBus.emit(NPCEvent.LEVEL_UP, { npcId: this.npc.id });
    }
  }

  private executeLogistics(deltaTime: number): void {
    if (this.npc.role === NPCRole.Elder || this.npc.role === NPCRole.FamilyHead) {
      const clan = ClanService.getInstance().getClan(this.npc.clanId);
      clan.storage.spiritStones += 5;
    }
  }

  private executeCompete(deltaTime: number): void {
    const resourcePoints = ResourceManager.getInstance().getNearbyPoints(this.npc.position, 3);
    if (resourcePoints.length > 0) {
      const target = resourcePoints[0];
      if (this.npc.distanceTo(target.position) <= 1) {
        ResourceManager.getInstance().collect(target.id, this.npc.id);
      } else {
        this.npc.moveTo(target.position.x, target.position.y, deltaTime);
      }
    }
  }

  private executeWork(deltaTime: number): void {
    this.npc.resources.spiritStones += 10 * this.getLayerConfig().resourceMultiplier;
  }

  private executeRest(deltaTime: number): void {
    const recoveryRate = 0.05 * deltaTime / 1000;
    this.npc.hp = Math.min(this.npc.maxHp, this.npc.hp + this.npc.maxHp * recoveryRate);
    this.npc.mp = Math.min(this.npc.maxMp, this.npc.mp + this.npc.maxMp * recoveryRate);
  }

  private executeFlee(deltaTime: number): void {
    const awayDirection = this.getAwayFromThreat();
    const fleeTarget = {
      x: this.npc.x + awayDirection.x * 100,
      y: this.npc.y + awayDirection.y * 100
    };
    this.npc.moveTo(fleeTarget.x, fleeTarget.y, deltaTime);

    const recoveryRate = 0.05 * deltaTime / 1000;
    this.npc.hp = Math.min(this.npc.maxHp, this.npc.hp + this.npc.maxHp * recoveryRate);
  }

  private executeChase(deltaTime: number): void {
    const targetPlayer = this.activityData.get('chaseTarget');
    if (targetPlayer) {
      if (this.npc.distanceTo(targetPlayer) <= 1) {
        this.triggerCombat(targetPlayer);
      } else {
        this.npc.moveTo(targetPlayer.x, targetPlayer.y, deltaTime);
      }
    }
  }

  private executeTrade(deltaTime: number): void {
    const targetCity = this.activityData.get('tradeTarget');
    if (targetCity && this.npc.distanceTo(targetCity) <= 1) {
      const profit = 500 * this.getLayerConfig().resourceMultiplier;
      this.npc.resources.spiritStones += profit;

      const clan = ClanService.getInstance().getClan(this.npc.clanId);
      clan.storage.spiritStones += profit * 0.1;

      this.activityData.set('tradeTarget', null);
      this.currentActivity = NPCActivity.Patrol;
    }
  }

  private getPatrolPoints(): Array<{ x: number; y: number }> {
    const clan = ClanService.getInstance().getClan(this.npc.clanId);
    const origin = { x: clan.territory.x, y: clan.territory.y };
    return [
      { x: origin.x - 50, y: origin.y - 50 },
      { x: origin.x + 50, y: origin.y - 50 },
      { x: origin.x + 50, y: origin.y + 50 },
      { x: origin.x - 50, y: origin.y + 50 }
    ];
  }
}
```

## 4. 执法堂长老系统

### 4.1 LawEnforcementElder

```typescript
class LawEnforcementElder {
  readonly role = NPCRole.LawEnforcementElder;
  readonly realm = RealmLevel.Transcension;
  loyalty: number = 100;
  greed: number = 10;
  ambition: number = 50;
  caution: number = 50;

  static create(playerId: string, playerPower: number): NPCEntity {
    return {
      id: this.generateElderId(),
      name: '执法堂长老',
      clanId: '', // 由追杀目标决定
      role: NPCRole.LawEnforcementElder,
      realm: RealmLevel.Transcension,
      power: playerPower * 3,
      hp: playerPower * 3 * 10,
      maxHp: playerPower * 3 * 10,
      mp: playerPower * 3 * 5,
      maxMp: playerPower * 3 * 5,
      personality: {
        loyalty: 100,
        greed: 10,
        ambition: 50,
        caution: 50
      },
      activity: NPCActivity.Chase,
      position: this.calculateSpawnPosition(playerId),
      targetPlayerId: playerId,
      resources: { spiritStones: 500, items: [], equipment: null }
    };
  }

  private static calculateSpawnPosition(playerId: string): { x: number; y: number } {
    const player = PlayerService.getPlayer(playerId);
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = (Math.random() - 0.5) * 20;
    return {
      x: player.x + (Math.abs(offsetX) > 5 ? offsetX : 10),
      y: player.y + (Math.abs(offsetY) > 5 ? offsetY : 10)
    };
  }

  update(deltaTime: number): void {
    const player = PlayerService.getPlayer(this.targetPlayerId);
    if (!player) {
      this.destroy();
      return;
    }

    if (this.distanceTo(player) <= 1) {
      this.triggerCombat(player);
    } else {
      this.moveTo(player.x, player.y, deltaTime);
    }
  }

  private distanceTo(entity: { x: number; y: number }): number {
    const dx = this.position.x - entity.x;
    const dy = this.position.y - entity.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private triggerCombat(player: Player): void {
    CombatService.getInstance().startCombat(this, player);
  }

  private destroy(): void {
    EventBus.emit(NPCEvent.LAW_ENFORCEMENT_END, { elderId: this.id, reason: 'target_dead_or_offline' });
  }
}
```

## 5. NPC跑商系统

### 5.1 TradeCaravan

```typescript
interface TradeCaravanData {
  npcId: string;
  originClan: string;
  targetNation: string;
  targetCity: { x: number; y: number };
  profit: number;
  state: 'moving_to_target' | 'trading' | 'returning';
}

class NPCTradeSystem {
  private static instance: NPCTradeSystem;
  private activeCaravans: Map<string, TradeCaravanData> = new Map();

  static getInstance(): NPCTradeSystem {
    if (!NPCTradeSystem.instance) {
      NPCTradeSystem.instance = new NPCTradeSystem();
    }
    return NPCTradeSystem.instance;
  }

  tryStartTrade(npc: NPCEntity): boolean {
    if (npc.role !== NPCRole.FamilyHead && npc.role !== NPCRole.Elder) {
      return false;
    }
    if (npc.personality.greed <= 70) {
      return false;
    }
    if (Math.random() > 0.1) {
      return false;
    }

    const targetNation = this.selectRandomForeignNation(npc.clanId);
    const targetCity = this.getNationCapital(targetNation);
    const layerMultiplier = LAYER_CONFIGS.find(l => l.layer === npc.layer)?.resourceMultiplier || 1;

    const caravan: TradeCaravanData = {
      npcId: npc.id,
      originClan: npc.clanId,
      targetNation: targetNation,
      targetCity: targetCity,
      profit: 500 * layerMultiplier,
      state: 'moving_to_target'
    };

    this.activeCaravans.set(npc.id, caravan);
    npc.activity = NPCActivity.Trade;
    return true;
  }

  update(deltaTime: number): void {
    for (const caravan of this.activeCaravans.values()) {
      const npc = GameWorld.getInstance().getNPC(caravan.npcId);
      if (!npc) continue;

      switch (caravan.state) {
        case 'moving_to_target':
          if (npc.distanceTo(caravan.targetCity) <= 1) {
            caravan.state = 'trading';
            setTimeout(() => this.completeTrade(caravan), 2000);
          } else {
            npc.moveTo(caravan.targetCity.x, caravan.targetCity.y, deltaTime);
          }
          break;
        case 'returning':
          const origin = ClanService.getInstance().getClan(caravan.originClan).territory;
          if (npc.distanceTo(origin) <= 1) {
            this.completeReturn(caravan);
          } else {
            npc.moveTo(origin.x, origin.y, deltaTime);
          }
          break;
      }
    }
  }

  private completeTrade(caravan: TradeCaravanData): void {
    const npc = GameWorld.getInstance().getNPC(caravan.npcId);
    if (npc) {
      npc.resources.spiritStones += caravan.profit;
      caravan.state = 'returning';
    }
  }

  private completeReturn(caravan: TradeCaravanData): void {
    const clan = ClanService.getInstance().getClan(caravan.originClan);
    const profitTax = caravan.profit * 0.1;
    clan.storage.spiritStones += profitTax;

    this.activeCaravans.delete(caravan.npcId);
    const npc = GameWorld.getInstance().getNPC(caravan.npcId);
    if (npc) {
      npc.activity = NPCActivity.Patrol;
    }
  }

  private selectRandomForeignNation(clanId: string): string {
    const clan = ClanService.getInstance().getClan(clanId);
    const foreignNations = NATIONS.filter(n => n !== clan.nation);
    return foreignNations[Math.floor(Math.random() * foreignNations.length)];
  }
}
```

## 6. 数据库设计

### 6.1 NPC表

```sql
CREATE TABLE npcs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  clan_id TEXT NOT NULL,
  nation TEXT NOT NULL,
  role TEXT NOT NULL,
  realm TEXT NOT NULL,
  power INTEGER NOT NULL,
  hp INTEGER NOT NULL,
  max_hp INTEGER NOT NULL,
  mp INTEGER NOT NULL,
  max_mp INTEGER NOT NULL,
  activity TEXT NOT NULL,
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  personality_ambition REAL DEFAULT 50,
  personality_caution REAL DEFAULT 50,
  personality_loyalty REAL DEFAULT 50,
  personality_greed REAL DEFAULT 50,
  birth_time INTEGER NOT NULL,
  birth_type TEXT NOT NULL,
  layer_id INTEGER NOT NULL,
  state TEXT NOT NULL,
  resources_json TEXT,
  FOREIGN KEY (clan_id) REFERENCES clans(id)
);

CREATE TABLE npc_souls (
  id TEXT PRIMARY KEY,
  original_npc_id TEXT NOT NULL,
  original_clan_id TEXT NOT NULL,
  original_nation TEXT NOT NULL,
  original_realm TEXT NOT NULL,
  death_cause TEXT NOT NULL,
  death_time INTEGER NOT NULL,
  pool_entry_time INTEGER,
  inherited_resources INTEGER
);

CREATE TABLE npc_death_records (
  id TEXT PRIMARY KEY,
  npc_id TEXT NOT NULL,
  death_cause TEXT NOT NULL,
  death_time INTEGER NOT NULL,
  killer_type TEXT,
  killer_id TEXT,
  dropped_resources_json TEXT,
  family_favorability_change INTEGER,
  FOREIGN KEY (npc_id) REFERENCES npcs(id)
);

CREATE INDEX idx_npcs_clan ON npcs(clan_id);
CREATE INDEX idx_npcs_nation ON npcs(nation);
CREATE INDEX idx_npcs_realm ON npcs(realm);
CREATE INDEX idx_npc_souls_pool ON npc_souls(pool_entry_time);
CREATE INDEX idx_npc_death_records_time ON npc_death_records(death_time);
```

## 7. 事件定义

```typescript
enum NPCEvent {
  STATE_CHANGED = 'npc:state_changed',
  ACTIVITY_CHANGED = 'npc:activity_changed',
  DIED = 'npc:died',
  ATTACKED = 'npc:attacked',
  INTERACT = 'npc:interact',
  PATROL_START = 'npc:patrol_start',
  PATROL_COMPLETE = 'npc:patrol_complete',
  LEVEL_UP = 'npc:level_up',
  BIRTH = 'npc:birth',
  SOUL_ENTER_POOL = 'npc:soul_enter_pool',
  SOUL_REBORN = 'npc:soul_reborn',
  LAW_ENFORCEMENT_START = 'npc:law_enforcement_start',
  LAW_ENFORCEMENT_END = 'npc:law_enforcement_end',
  TRADE_START = 'npc:trade_start',
  TRADE_COMPLETE = 'npc:trade_complete'
}
```

## 8. 相关文档索引

| 关联文档 | 关联内容 |
|:---|:---|
| [11-NPC生死轮回与人口平衡代码设计.md](11-NPC生死轮回与人口平衡代码设计.md) | 死亡掉落、资源回收、人口平衡算法 |
| [02-家族势力体系代码设计.md](02-家族势力体系代码设计.md) | 家族层级、职位继承 |
| [05-经济系统代码设计.md](05-经济系统代码设计.md) | 灵石流通、家族资金 |

---

## 9. LLM规划系统集成

> **Phase 1b实现说明**: 以下第9节的代码(`LLMPlanningService`/`LLMToBehaviorTreeMapper`/`EmergencyPlanningHandler`)为原始设计，**实际未按此实现**。Phase 1b采用`NPCWorldService`(轮询LLM调度) + `PlanParser`(JSON验证) + `NPCMemory`(3种记忆结构)替代。详见第10节"Phase 1b 新增"。

### 9.1 LLM规划服务

```typescript
// server/game/services/LLMPlanningService.ts

import { LLMTier, PlanningType, ActionType, LLMPlan, SubTask } from '../../shared/types/LLMPlanning';

class LLMPlanningService {
  private static instance: LLMPlanningService;
  private llmGateway: LLMGatewayService;
  private planCache: Map<string, LLMPlan>;

  static getInstance(): LLMPlanningService {
    if (!LLMPlanningService.instance) {
      LLMPlanningService.instance = new LLMPlanningService();
    }
    return LLMPlanningService.instance;
  }

  getLLMTier(npc: NPCEntity): LLMTier {
    if (npc.role === NPCRole.FamilyHead || npc.role === NPCRole.LawEnforcementElder) {
      if (npc.realm === RealmLevel.Transcension || npc.realm === RealmLevel.YuanInfant) {
        return LLMTier.T1;
      }
    }
    if (npc.role === NPCRole.Elder) {
      return LLMTier.T2;
    }
    return LLMTier.T3;
  }

  shouldGeneratePlan(npc: NPCEntity): boolean {
    const tier = this.getLLMTier(npc);
    if (tier === LLMTier.T3) return false;

    const eligibility = npc.llm_eligibility;
    if (!eligibility) return true;

    const tierConfig = LLM_SERVICE_CONFIG.tier_config[tier];
    const lastPlanning = eligibility.last_planning_time;
    const now = Date.now();

    return now - lastPlanning > this.getPlanningInterval(tier);
  }

  async generatePlan(npc: NPCEntity, type: PlanningType = PlanningType.NORMAL): Promise<LLMPlan | null> {
    const tier = this.getLLMTier(npc);
    if (tier === LLMTier.T3) return null;

    const request = this.buildPlanningRequest(npc, type);
    const response = await this.llmGateway.callLLM(request);

    if (!response) {
      return this.getFallbackPlan(npc, tier);
    }

    return this.parseLLMResponse(response, npc.id);
  }

  private buildPlanningRequest(npc: NPCEntity, type: PlanningType): LLMPlanningRequest {
    const tier = this.getLLMTier(npc);
    const horizon = LLM_SERVICE_CONFIG.tier_config[tier].horizon;

    return {
      npc_id: npc.id,
      npc_data: {
        name: npc.name,
        role: npc.role,
        realm: npc.realm,
        personality: npc.personality,
        family_status: this.getFamilyStatus(npc),
        current_state: {
          hp_percent: npc.hp / npc.maxHp,
          mp_percent: npc.mp / npc.maxMp,
          location: npc.position,
          resources: npc.resources.spiritStones
        }
      },
      world_context: WorldService.getInstance().getContext(),
      planning_horizon: horizon as '1天' | '1周' | '1月',
      planning_type: type
    };
  }

  private parseLLMResponse(response: string, npcId: string): LLMPlan {
    const parsed = JSON.parse(response);
    return {
      plan_id: parsed.plan_id,
      generated_at: Date.now(),
      expires_at: Date.now() + parsed.horizon_days * 24 * 60 * 60 * 1000,
      tasks: parsed.sub_tasks,
      current_task_index: 0,
      status: 'ACTIVE'
    };
  }

  private getFallbackPlan(npc: NPCEntity, tier: LLMTier): LLMPlan {
    const fallbackScripts = {
      [LLMTier.T1]: 'fallback_t1_strategy',
      [LLMTier.T2]: 'fallback_t2_tactics'
    };
    return this.loadFallbackScript(fallbackScripts[tier], npc.id);
  }

  updatePlanExecution(npc: NPCEntity): void {
    const plan = npc.llm_plan;
    if (!plan || plan.status !== 'ACTIVE') return;

    const currentTask = plan.tasks[plan.current_task_index];
    if (this.checkTaskCompletion(npc, currentTask)) {
      plan.current_task_index++;
      if (plan.current_task_index >= plan.tasks.length) {
        plan.status = 'COMPLETED';
      }
    }

    if (this.checkTaskTimeout(currentTask)) {
      plan.status = 'INTERRUPTED';
    }
  }

  private checkTaskCompletion(npc: NPCEntity, task: SubTask): boolean {
    return true;
  }

  private checkTaskTimeout(task: SubTask): boolean {
    return false;
  }
}
```

### 9.2 LLM任务到行为树节点的映射

```typescript
// server/game/services/LLMToBehaviorTreeMapper.ts

class LLMToBehaviorTreeMapper {
  static mapActionToBehavior(actionType: ActionType, actionParams: Record<string, any>): Partial<BehaviorWeight> {
    switch (actionType) {
      case ActionType.PATROL:
        return { patrol: 100 };
      case ActionType.CULTIVATE:
        return { retreat: 100 };
      case ActionType.TRADE:
        return { trade: 100 };
      case ActionType.EXPLORE:
        return { explore: 100 };
      case ActionType.LOGISTICS:
        return { logistics: 100 };
      case ActionType.REST:
        return { rest: 100 };
      default:
        return {};
    }
  }

  static injectLLMTask(npc: NPCEntity, task: SubTask): void {
    const behaviorWeights = this.mapActionToBehavior(task.action_type as ActionType, task.action_params);

    Object.keys(behaviorWeights).forEach(key => {
      const weightKey = key as keyof BehaviorWeight;
      npc.llm_injected_weights = npc.llm_injected_weights || {};
      npc.llm_injected_weights[weightKey] = behaviorWeights[weightKey];
    });

    EventBus.emit(NPCEvent.LLM_TASK_INJECTED, {
      npcId: npc.id,
      task: task
    });
  }
}
```

### 9.3 突发事件响应

```typescript
class EmergencyPlanningHandler {
  private static instance: EmergencyPlanningHandler;
  private emergencyQueue: Map<string, EmergencyEvent>;

  static getInstance(): EmergencyPlanningHandler {
    if (!EmergencyPlanningHandler.instance) {
      EmergencyPlanningHandler.instance = new EmergencyPlanningHandler();
    }
    return EmergencyPlanningHandler.instance;
  }

  handleEmergency(npc: NPCEntity, event: EmergencyEvent): void {
    const tier = LLMPlanningService.getInstance().getLLMTier(npc);
    if (tier === LLMTier.T3) return;

    if (event.severity === 'critical' || event.severity === 'high') {
      npc.llm_plan && (npc.llm_plan.status = 'INTERRUPTED');

      LLMPlanningService.getInstance().generatePlan(npc, PlanningType.EMERGENCY);
    }
  }
}

interface EmergencyEvent {
  type: 'family_war' | 'assassination' | 'treasury_critical' | 'heir_death';
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: number;
}
```

### 9.4 数据模型扩展

```typescript
interface NPCEntity {
  // ... existing fields
  llm_plan?: LLMPlan;
  llm_eligibility: {
    tier: LLMTier;
    last_planning_time: number;
    planning_horizon: string;
  };
  llm_injected_weights?: Partial<BehaviorWeight>;
}
```

---

## 10. 实现状态 (2026-04)

### 已实现
- `NPCBirthService` (名字生成/人格生成含国家修正/境界判定/战力计算)
- `BehaviorTree` (4优先级: 生存>家族职责>机会主义>日常, 轮盘赌选择)
- `BehaviorExecutor` (activity状态切换框架, 10种activity类型定义)
- NPC人格模型 (ambition/caution/loyalty/greed 0-100)
- 9层世界配置 (LAYER_CONFIGS, 灵气倍率1.0-20.0)

### Phase 1b 新增 (2026-04-27)

#### NPCWorldService (`src/server/services/NPCWorldService.ts`)
- EventEmitter单例, 通过`tick()`循环驱动NPC模拟(8s/tick)
- 轮询LLM调度: `MAX_PLANNING_PER_TICK=2`, `planningOffset`跟踪进度, 50NPC公平调度
- LLM错误隔离: `Promise.all`中单NPC失败不影响其他NPC
- 编年史事件推送: 通过`chronicle:event`事件广播action/emotion/relationship变更
- 玩家操作: `recruit`(3候选人A/B/C)/`assignTask`/`promote`/`demote`/`ceremony`
- 回退计划: LLM不可用时`fallbackPlan()`生成随机action

#### PlanParser (`src/server/llm/PlanParser.ts`)
- JSON提取: `extractJSON()`支持`<think>`标签剥离/代码围栏/自然语言环绕/大括号计数嵌套对象
- 验证规则: `targetId`必填字符串, `actionType`需在`VALID_ACTION_TYPES`范围内, `priority` 1-10, `duration` 5-120(默认30), `reason`必填
- 动作类型: `cultivate | request | scheme | defect | train | socialize | patrol | rest`
- 默认值: `missing emotionalState` → `neutral`, `missing/out-of-range duration` → 30

#### NPCMemory (`src/server/llm/NPCMemory.ts`)
- `NPCRelationshipMatrix`: 50×50亲密度矩阵, `modifyRelationship(reason)`记录原因
- `NPCInteractionRingBuffer`: 每个NPC最近20条交互记录(谁/何时/做了什么)
- `NPCWitnessedEvents`: 每个NPC最近30条见证事件
- `buildMemoryContext(npcId)`: 将三者组合为LLM提示上下文

#### ChroniclePanel (`src/components/ChroniclePanel.tsx`)
- WebSocket事件流(`ws://host/chronicle`), 自动重连+指数退避(1s→2s→4s→8s→max16s)
- NPC列表: 实时搜索/角色筛选/活动状态/情绪颜色
- 事件过滤: 时间分组(最近/本小时/更早), 9种事件类型颜色标记, NPC筛选
- 操作模态框: 招募弟子/分配任务/提拔/贬斥/祭祀/庆典

#### 测试框架
- Vitest, 95项测试覆盖3个套件
- `test/llm-parser.test.ts` (36项): JSON解析/验证/边缘情况/嵌套对象/思维链剥离
- `test/npc-memory.test.ts` (40项): 记忆存储/检索/关系操作/并发安全
- `test/npc-world-service.test.ts` (19项): NPC初始化/操作/回归测试/关系查询

### Bug / 空壳
- `executePatrol`/`executeLogistics`/`executeCompete`/`executeChase`/`executeTrade`: 全部空壳
- `checkFamilyDutyCondition()` 仅对家主/长老/执法长老返回true → 低阶NPC永不执行家族职责
- `BehaviorExecutor.update()`每帧调用`evaluate()`+事件emit+`executeActivity()`, 设计冗余

### 未实现
- **`LawEnforcementElder`**: 设计4节完全未实现 (无追杀逻辑)
- **`NPCTradeSystem` / `TradeCaravan`**: 设计5节完全未实现
- **LLM规划集成(旧设计)**: `LLMPlanningService`/`LLMToBehaviorTreeMapper`/`EmergencyPlanningHandler`均未实现 (被Phase 1b的NPCWorldService替代)
- `BehaviorWeight` 的LLM注入权重(`llm_injected_weights`)无代码消费

### 与 docs/ 设计差距
- docs中的三层AI架构(战略gemini-3.1-pro/战术gemini-2.5-flash/角色低成本模型)对应代码中的T0-T3但HTTP客户端完全stub
- docs中的NPC记忆系统(5种记忆/遗忘曲线)未实现 (Phase 1b实现了3种简化结构)
- docs中的情感系统(6维度: confident/fear/anger/hope/sadness/joy)未实现 (Phase 1b使用单字符串emotionalState)
- docs中的人格进化(事件驱动修改)未实现
- docs中的行为树是真正的行为树(组合节点), 代码实现是优先级状态机+轮盘赌