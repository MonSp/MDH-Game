import { CultivationRealm, RealmConfig, REALM_CONFIGS, BreakthroughResult, CultivationEvent, EventBus } from '../../shared';

export class CultivationService {
  private static instance: CultivationService;

  static getInstance(): CultivationService {
    if (!CultivationService.instance) {
      CultivationService.instance = new CultivationService();
    }
    return CultivationService.instance;
  }

  getRealmConfig(realm: CultivationRealm): RealmConfig {
    return REALM_CONFIGS[realm];
  }

  getNextRealm(currentRealm: CultivationRealm): CultivationRealm | null {
    if (currentRealm === CultivationRealm.Tribulation) {
      return null;
    }
    return currentRealm + 1 as CultivationRealm;
  }

  canBreakthrough(cultivation: number, realm: CultivationRealm, spiritStones: number): boolean {
    const currentConfig = this.getRealmConfig(realm);
    return cultivation >= currentConfig.requiredCultivation && spiritStones >= currentConfig.spiritStoneCost;
  }

  attemptBreakthrough(
    realm: CultivationRealm,
    cultivation: number,
    spiritStones: number
  ): BreakthroughResult {
    const currentConfig = this.getRealmConfig(realm);

    if (cultivation < currentConfig.requiredCultivation) {
      return { success: false, reason: 'cultivation_insufficient' };
    }

    if (spiritStones < currentConfig.spiritStoneCost) {
      return { success: false, reason: 'spirit_stones_insufficient' };
    }

    const nextRealm = this.getNextRealm(realm);
    if (!nextRealm) {
      return { success: false, reason: 'max_realm_reached' };
    }

    EventBus.emit(CultivationEvent.BREAKTHROUGH_SUCCESS, { realm: nextRealm });
    return { success: true, newRealm: nextRealm };
  }

  applyRealmBonus(
    realm: CultivationRealm
  ): { healthMultiplier: number; spiritMultiplier: number; powerMultiplier: number } {
    const config = this.getRealmConfig(realm);
    return {
      healthMultiplier: config.healthMultiplier,
      spiritMultiplier: config.spiritMultiplier,
      powerMultiplier: config.powerMultiplier
    };
  }

  getRealmName(realm: CultivationRealm): string {
    return REALM_CONFIGS[realm].name;
  }

  getRequiredCultivation(realm: CultivationRealm): number {
    return REALM_CONFIGS[realm].requiredCultivation;
  }

  getAllRealms(): CultivationRealm[] {
    return Object.keys(CultivationRealm).filter(k => !isNaN(Number(k))).map(k => Number(k) as CultivationRealm);
  }
}