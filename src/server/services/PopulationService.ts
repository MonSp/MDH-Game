import {
  BirthDecision, PopulationTarget, ResourceCycleStats, LAYER_CONFIGS, LayerConfig,
  PopulationEvent, EventBus
} from '../../shared';

export class PIDBirthController {
  private kp: number = 0.1;
  private ki: number = 0.01;
  private kd: number = 0.05;

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

    const baseRate = 8;
    return Math.max(0, Math.floor(baseRate + adjustment));
  }

  reset(): void {
    this.integralError = 0;
    this.previousError = 0;
    this.errorHistory = [];
  }
}

export class PopulationBalanceController {
  private static instance: PopulationBalanceController;
  private populationHistory: Map<string, number[]>;
  private lastBirthCheck: Map<string, number>;
  private readonly BIRTH_CHECK_INTERVAL = 60 * 60 * 1000;

  private constructor() {
    this.populationHistory = new Map();
    this.lastBirthCheck = new Map();
  }

  static getInstance(): PopulationBalanceController {
    if (!PopulationBalanceController.instance) {
      PopulationBalanceController.instance = new PopulationBalanceController();
    }
    return PopulationBalanceController.instance;
  }

  calculateTargetPopulation(layerId: string): PopulationTarget {
    const layerConfig = LAYER_CONFIGS.find(l => l.layer === parseInt(layerId));
    const flyingPlayers = 0;
    const warModifier = 1.0;

    const baseTotal = 7 * 16 * 100;
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
      EventBus.emit(PopulationEvent.BIRTH_TRIGGERED, { layerId, count: birthCount });
      return {
        action: 'batch_birth',
        count: birthCount,
        distribution: this.distributeByNation(target)
      };
    }

    const nationDeficits = this.checkNationDeficits(layerId, target);
    for (const deficit of nationDeficits) {
      if (deficit.ratio < 0.8) {
        EventBus.emit(PopulationEvent.NATION_BALANCE_ADJUSTED, { layerId, nation: deficit.nation });
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
        EventBus.emit(PopulationEvent.FAMILY_BALANCE_ADJUSTED, { layerId, familyId: deficit.familyId });
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
      const current = 0;
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
      const current = 0;
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

  private randomRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

export class ResourceCycleManager {
  private static instance: ResourceCycleManager;

  private constructor() {}

  static getInstance(): ResourceCycleManager {
    if (!ResourceCycleManager.instance) {
      ResourceCycleManager.instance = new ResourceCycleManager();
    }
    return ResourceCycleManager.instance;
  }

  processNPCDeathResources(npc: any, killerId: string | null): void {
  }

  processNPCBirthResources(npc: any): void {
    if (npc.birthType === 'natural') {
    } else if (npc.birthType === 'wanderer') {
      npc.resources = {
        spiritStones: 50,
        items: [],
        equipment: null,
        familyContribution: 0
      };
    } else if (npc.birthType === 'demon_beast') {
      npc.resources = {
        spiritStones: 0,
        items: [],
        equipment: null,
        familyContribution: 0
      };
    }
  }

  getCycleStatistics(): ResourceCycleStats {
    return {
      totalNpcs: 0,
      avgResourcesPerNpc: 0,
      worldRecoveryPool: { totalSpiritStones: 0, itemCount: 0, equipmentCount: 0 },
      reincarnationPoolSize: 0,
      deathRate: 0,
      birthRate: 0
    };
  }
}