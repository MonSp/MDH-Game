import {
  NPCEntity, NPCRole, RealmLevel, NPCActivity, NPCPersonality, BirthType, NPCLifeState,
  LayerConfig, LAYER_CONFIGS, NATIONALITY_PERSONALITY_BONUS, BASE_WEIGHTS, BehaviorWeight,
  NPCEvent, EventBus, Position, ResourceNode, GAME_CONFIG, NPCItemEntry
} from '../../shared';
import { ResourceManager, NPCResourceCompetition } from './ResourceService';
import { v4 as uuidv4 } from 'uuid';

const NATIONS = ['秦国', '楚国', '齐国', '燕国', '赵国', '魏国', '韩国'];

const ITEM_NAME_MAP: Record<number, string> = {
  1: '矿石', 2: '食物', 3: '材料', 4: '丹药', 5: '装备',
  6: '练气丹', 7: '筑基丹', 8: '洗髓丹', 9: '低级法器',
  10: '中级法器', 11: '聚气散', 12: '飞升令', 13: '灵草',
  14: '灵石碎片', 15: '妖兽材料',
};

class NameGenerator {
  static generate(nation: string): string {
    const surnames = ['李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴'];
    const givenNames = ['云', '飞', '翔', '天', '地', '玄', '灵', '静', '明', '空'];
    return surnames[Math.floor(Math.random() * surnames.length)] + 
           givenNames[Math.floor(Math.random() * givenNames.length)];
  }
}

export class NPCBirthService {
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
    parentData?: any;
  }): NPCEntity {
    const layerConfig = LAYER_CONFIGS.find(l => l.layer === parseInt(params.layerId)) || LAYER_CONFIGS[0];
    const realm = this.determineInitialRealm(params.birthType, params.parentData);
    const personality = this.generatePersonality(params.nation, params.birthType);
    const initialResources = this.calculateInitialResources(params.birthType, layerConfig);

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
      position: { x: 0, y: 0 },
      birthTime: Date.now(),
      age: this.getInitialAge(params.birthType),
      birthType: params.birthType,
      layer: parseInt(params.layerId),
      resources: initialResources,
      state: NPCLifeState.Active
    };

    EventBus.emit(NPCEvent.BIRTH, { npc });
    return npc;
  }

  private generateNPCId(): string {
    return `npc_${Date.now()}_${uuidv4().substr(0, 8)}`;
  }

  private generatePersonality(nation: string, birthType: BirthType): NPCPersonality {
    const nationalBonus = NATIONALITY_PERSONALITY_BONUS[nation] || {};
    const birthTypeModifier = this.getBirthTypeModifier(birthType);

    return {
      ambition: this.clamp(50 + (nationalBonus.ambition || 0) + birthTypeModifier.ambition),
      caution: this.clamp(50 + (nationalBonus.caution || 0) + birthTypeModifier.caution),
      loyalty: this.clamp(50 + (nationalBonus.loyalty || 0) + birthTypeModifier.loyalty),
      greed: this.clamp(50 + (nationalBonus.greed || 0) + birthTypeModifier.greed)
    };
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

  private determineInitialRealm(birthType: BirthType, parentData?: any): RealmLevel {
    if (parentData?.realm) {
      return parentData.realm;
    }
    return RealmLevel.Mortal;
  }

  private calculatePower(realm: RealmLevel, layerConfig: LayerConfig): number {
    const realmPowerMap: Record<RealmLevel, number> = {
      [RealmLevel.Mortal]: 100,
      [RealmLevel.QiRefining]: 300,
      [RealmLevel.FoundationBuilding]: 800,
      [RealmLevel.GoldenCore]: 2000,
      [RealmLevel.YuanInfant]: 5000,
      [RealmLevel.Transcension]: 12000
    };
    const basePower = realmPowerMap[realm] || 100;
    const layerMultiplier = layerConfig.spiritMultiplier;
    return Math.floor(basePower * layerMultiplier * (0.8 + Math.random() * 0.4));
  }

  private calculateHP(realm: RealmLevel, layerConfig: LayerConfig): number {
    return Math.floor(this.calculatePower(realm, layerConfig) * 10);
  }

  private calculateMP(realm: RealmLevel, layerConfig: LayerConfig): number {
    return Math.floor(this.calculatePower(realm, layerConfig) * 5);
  }

  private calculateInitialResources(birthType: BirthType, layerConfig: LayerConfig): { spiritStones: number; items: NPCItemEntry[]; equipment: string | null; familyContribution: number } {
    const multiplier = layerConfig.resourceMultiplier;
    switch (birthType) {
      case BirthType.Natural:
        return { spiritStones: 50 * multiplier, items: [], equipment: null, familyContribution: 0 };
      case BirthType.Wanderer:
        // Items now managed by C++ WASM
        return { spiritStones: 30 * multiplier, items: [], equipment: null, familyContribution: 0 };
      case BirthType.DemonBeast:
        // Items now managed by C++ WASM
        return { spiritStones: 0, items: [], equipment: null, familyContribution: 0 };
      default:
        return { spiritStones: 20 * multiplier, items: [], equipment: null, familyContribution: 0 };
    }
  }

  private getInitialAge(birthType: BirthType): number {
    switch (birthType) {
      case BirthType.Natural:
        return 16;
      case BirthType.WarOrphan:
        return 10;
      case BirthType.Wanderer:
        return 26 + Math.floor(Math.random() * 15);
      case BirthType.DemonBeast:
        return 0;
    }
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(100, value));
  }
}

export class BehaviorTree {
  private npc: NPCEntity;
  private currentWeights: BehaviorWeight;

  constructor(npc: NPCEntity) {
    this.npc = npc;
    this.currentWeights = { ...BASE_WEIGHTS };
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
    return this.npc.role === NPCRole.FamilyHead || 
           this.npc.role === NPCRole.Elder || 
           this.npc.role === NPCRole.LawEnforcementElder;
  }

  private checkOpportunityCondition(): boolean {
    const nearbyResourcePoints = ResourceManager.getInstance().getNearbyResources(this.npc.position.x, this.npc.position.y, 3);
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
        weights.trade += personality.greed > 70 ? 30 : 0;
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
    const nearResourcePoints = ResourceManager.getInstance().getNearbyResources(this.npc.position.x, this.npc.position.y, 3);
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

export class BehaviorExecutor {
  private npc: NPCEntity;
  private currentActivity: NPCActivity;
  private activityData: Map<string, any>;
  private behaviorTree: BehaviorTree;

  constructor(npc: NPCEntity) {
    this.npc = npc;
    this.currentActivity = NPCActivity.Rest;
    this.activityData = new Map();
    this.behaviorTree = new BehaviorTree(npc);
  }

  update(deltaTime: number): void {
    const newActivity = this.behaviorTree.evaluate();
    if (newActivity !== this.currentActivity) {
      this.exitCurrentActivity();
      this.currentActivity = newActivity;
      this.enterActivity(newActivity);
      EventBus.emit(NPCEvent.ACTIVITY_CHANGED, { npcId: this.npc.id, activity: newActivity });
    }

    this.executeActivity(deltaTime);
  }

  private enterActivity(activity: NPCActivity): void {
    switch (activity) {
      case NPCActivity.Patrol:
        EventBus.emit(NPCEvent.PATROL_START, { npcId: this.npc.id });
        break;
    }
  }

  private exitCurrentActivity(): void {
    if (this.currentActivity === NPCActivity.Patrol) {
      EventBus.emit(NPCEvent.PATROL_COMPLETE, { npcId: this.npc.id });
    }
  }

  private executeActivity(deltaTime: number): void {
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

  // ---- Movement constants ----
  private static readonly PATROL_SPEED = 30;
  private static readonly CHASE_SPEED = 60;
  private static readonly LOGISTICS_SPEED = 25;
  private static readonly ARRIVAL_DISTANCE = 3;
  private static readonly PATROL_RADIUS = 80;
  private static readonly DETECTION_RADIUS = 40;

  /** Move NPC toward target at a given speed (units/sec). */
  private moveToward(target: Position, speed: number, deltaTime: number): void {
    const dx = target.x - this.npc.position.x;
    const dy = target.y - this.npc.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 0.5) return;
    const step = speed * (deltaTime / 1000);
    const ratio = Math.min(step / distance, 1);
    this.npc.position.x += dx * ratio;
    this.npc.position.y += dy * ratio;
  }

  /** Pick a random patrol target within patrol radius, clamped to map bounds. */
  private pickPatrolTarget(): Position {
    const angle = Math.random() * Math.PI * 2;
    const radius = 20 + Math.random() * BehaviorExecutor.PATROL_RADIUS;
    return {
      x: Math.max(0, Math.min(GAME_CONFIG.MAP_WIDTH, this.npc.position.x + Math.cos(angle) * radius)),
      y: Math.max(0, Math.min(GAME_CONFIG.MAP_HEIGHT, this.npc.position.y + Math.sin(angle) * radius)),
    };
  }

  private executePatrol(deltaTime: number): void {
    let target = this.activityData.get('patrolTarget') as Position | undefined;
    if (!target) {
      target = this.pickPatrolTarget();
      this.activityData.set('patrolTarget', target);
    }

    const dist = Math.hypot(target.x - this.npc.position.x, target.y - this.npc.position.y);
    if (dist < BehaviorExecutor.ARRIVAL_DISTANCE) {
      EventBus.emit(NPCEvent.PATROL_COMPLETE, { npcId: this.npc.id, position: { ...this.npc.position } });
      this.activityData.delete('patrolTarget');
      return;
    }

    this.moveToward(target, BehaviorExecutor.PATROL_SPEED, deltaTime);
  }

  private executeRetreat(deltaTime: number): void {
    if (this.npc.personality.ambition > 70 && Math.random() < 0.1) {
      this.npc.power += 10;
      EventBus.emit(NPCEvent.LEVEL_UP, { npcId: this.npc.id });
    }
  }

  private executeLogistics(deltaTime: number): void {
    const targetId = this.activityData.get('logisticsTarget') as string | undefined;

    if (!targetId) {
      const resources = ResourceManager.getInstance().getNearbyResources(
        this.npc.position.x, this.npc.position.y, BehaviorExecutor.DETECTION_RADIUS
      );
      if (resources.length === 0) {
        this.executePatrol(deltaTime);
        return;
      }
      // Pick the nearest resource
      const nearest = resources.reduce((a, b) =>
        Math.hypot(a.x - this.npc.position.x, a.y - this.npc.position.y) <
        Math.hypot(b.x - this.npc.position.x, b.y - this.npc.position.y) ? a : b
      );
      this.activityData.set('logisticsTarget', nearest.id);
      this.activityData.set('logisticsTargetPos', { x: nearest.x, y: nearest.y });
      return;
    }

    const targetPos = this.activityData.get('logisticsTargetPos') as Position | undefined;
    if (!targetPos) { this.activityData.delete('logisticsTarget'); return; }

    const dist = Math.hypot(targetPos.x - this.npc.position.x, targetPos.y - this.npc.position.y);
    if (dist < BehaviorExecutor.ARRIVAL_DISTANCE) {
      const resourceMgr = ResourceManager.getInstance();
      const resource = resourceMgr.getResourceById(targetId);
      if (resource) {
        resourceMgr.collectResource(
          this.npc.id, resource.id,
          () => {},
          (amount) => { this.npc.resources.spiritStones += Math.floor(amount); },
          () => {} // Items now managed by C++ WASM
        );
      }
      this.activityData.delete('logisticsTarget');
      this.activityData.delete('logisticsTargetPos');
      return;
    }

    this.moveToward(targetPos, BehaviorExecutor.LOGISTICS_SPEED, deltaTime);
  }

  private executeCompete(deltaTime: number): void {
    const competition = NPCResourceCompetition.getInstance();
    const resourceMgr = ResourceManager.getInstance();
    const claimedId = this.activityData.get('competeTarget') as string | undefined;

    if (claimedId) {
      if (!competition.canNpcCollect(this.npc.id, claimedId)) {
        this.activityData.delete('competeTarget');
        return;
      }
      const resource = resourceMgr.getResourceById(claimedId);
      if (!resource) {
        competition.npcReleases(this.npc.id, claimedId);
        this.activityData.delete('competeTarget');
        return;
      }
      const dist = Math.hypot(resource.x - this.npc.position.x, resource.y - this.npc.position.y);
      if (dist < BehaviorExecutor.ARRIVAL_DISTANCE) {
        resourceMgr.collectResource(
          this.npc.id, resource.id,
          () => {},
          (amount) => { this.npc.resources.spiritStones += Math.floor(amount); },
          () => {} // Items now managed by C++ WASM
        );
        competition.npcReleases(this.npc.id, resource.id);
        this.activityData.delete('competeTarget');
      } else {
        this.moveToward({ x: resource.x, y: resource.y }, BehaviorExecutor.LOGISTICS_SPEED, deltaTime);
      }
      return;
    }

    // Find a new unclaimed resource
    const resources = resourceMgr.getNearbyResources(
      this.npc.position.x, this.npc.position.y, BehaviorExecutor.DETECTION_RADIUS
    );
    for (const res of resources) {
      if (competition.canNpcCollect(this.npc.id, res.id)) {
        competition.npcCollects(this.npc.id, res.id);
        this.activityData.set('competeTarget', res.id);
        return;
      }
    }

    // Nothing to compete for — patrol instead
    this.executePatrol(deltaTime);
  }

  private executeWork(deltaTime: number): void {
    const layerConfig = LAYER_CONFIGS.find(l => l.layer === this.npc.layer);
    const multiplier = layerConfig?.resourceMultiplier || 1;
    this.npc.resources.spiritStones += 10 * multiplier * (deltaTime / 1000);
  }

  private executeRest(deltaTime: number): void {
    const recoveryRate = 0.05 * deltaTime / 1000;
    this.npc.hp = Math.min(this.npc.maxHp, this.npc.hp + this.npc.maxHp * recoveryRate);
    this.npc.mp = Math.min(this.npc.maxMp, this.npc.mp + this.npc.maxMp * recoveryRate);
  }

  private executeFlee(deltaTime: number): void {
    const recoveryRate = 0.05 * deltaTime / 1000;
    this.npc.hp = Math.min(this.npc.maxHp, this.npc.hp + this.npc.maxHp * recoveryRate);
  }

  /** Chase a hostile target set via activityData('chaseTarget', npcId).
   *  The target NPC position is resolved from NPCWorldService.
   *  Falls back to patrol when no target is assigned. */
  private executeChase(deltaTime: number): void {
    const targetNpcId = this.activityData.get('chaseTarget') as string | undefined;
    if (!targetNpcId) {
      this.executePatrol(deltaTime);
      return;
    }

    // Lazy-require to avoid circular dependency at module level
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NPCWorldService } = require('./NPCWorldService');
    const worldService = NPCWorldService.getInstance();
    const targetState = worldService.getNPC(targetNpcId);
    if (!targetState || targetState.npc.hp <= 0) {
      this.activityData.delete('chaseTarget');
      this.executePatrol(deltaTime);
      return;
    }

    const targetPos = targetState.npc.position;
    const dist = Math.hypot(targetPos.x - this.npc.position.x, targetPos.y - this.npc.position.y);

    if (dist < BehaviorExecutor.ARRIVAL_DISTANCE) {
      // In range — deal damage proportional to power
      const damage = Math.max(1, Math.floor(this.npc.power * 0.1));
      targetState.npc.hp = Math.max(0, targetState.npc.hp - damage);
      EventBus.emit(NPCEvent.ATTACKED, { targetId: targetNpcId, attackerId: this.npc.id, damage });
      if (targetState.npc.hp <= 0) {
        targetState.activity = 'dead';
        EventBus.emit(NPCEvent.DIED, { npcId: targetNpcId, killerId: this.npc.id });
        this.activityData.delete('chaseTarget');
      }
    } else {
      this.moveToward(targetPos, BehaviorExecutor.CHASE_SPEED, deltaTime);
    }
  }

  /** Trade with a partner NPC set via activityData('tradePartner', npcId).
   *  Exchanges a fixed amount of spirit stones.
   *  Falls back to patrol when no partner is assigned. */
  private executeTrade(deltaTime: number): void {
    const partnerId = this.activityData.get('tradePartner') as string | undefined;
    if (!partnerId) {
      this.executePatrol(deltaTime);
      return;
    }

    const targetPos = this.activityData.get('tradePartnerPos') as Position | undefined;
    if (!targetPos) {
      this.activityData.delete('tradePartner');
      return;
    }

    const dist = Math.hypot(targetPos.x - this.npc.position.x, targetPos.y - this.npc.position.y);
    if (dist < BehaviorExecutor.ARRIVAL_DISTANCE) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { NPCWorldService } = require('./NPCWorldService');
      const partner = NPCWorldService.getInstance().getNPC(partnerId);
      if (partner && this.npc.resources.spiritStones >= 30) {
        // Future: item exchange via C++ WASM
        const tradeAmount = Math.floor(Math.min(30, this.npc.resources.spiritStones));
        this.npc.resources.spiritStones -= tradeAmount;
        partner.npc.resources.spiritStones += tradeAmount;
        EventBus.emit(NPCEvent.TRADE_COMPLETE, {
          fromId: this.npc.id, toId: partnerId, amount: tradeAmount,
        });
      }
      this.activityData.delete('tradePartner');
      this.activityData.delete('tradePartnerPos');
    } else {
      this.moveToward(targetPos, BehaviorExecutor.LOGISTICS_SPEED, deltaTime);
    }
  }
}