import { FamilyLevel, FamilyConfig, PlayerFamilyInfo, FAMILY_CONFIG, Country } from '../../shared';
import { CountryService } from './CountryService';
import { EventBus, FamilyEvent } from '../../shared';

export class FavorabilitySystem {
  private static instance: FavorabilitySystem;
  private favorabilityCache: Map<string, number>;

  private constructor() {
    this.favorabilityCache = new Map();
  }

  static getInstance(): FavorabilitySystem {
    if (!FavorabilitySystem.instance) {
      FavorabilitySystem.instance = new FavorabilitySystem();
    }
    return FavorabilitySystem.instance;
  }

  initializePlayerFavorability(playerId: string, families: string[]): void {
    for (const familyId of families) {
      this.favorabilityCache.set(`${playerId}_${familyId}`, FAMILY_CONFIG.INITIAL_FAVORABILITY);
    }
  }

  get(playerId: string, familyId: string): number {
    return this.favorabilityCache.get(`${playerId}_${familyId}`) ?? FAMILY_CONFIG.INITIAL_FAVORABILITY;
  }

  modify(playerId: string, familyId: string, delta: number): number {
    const key = `${playerId}_${familyId}`;
    const current = this.get(playerId, familyId);
    const newValue = Math.max(-100, Math.min(100, current + delta));
    this.favorabilityCache.set(key, newValue);
    if (newValue <= FAMILY_CONFIG.HOSTILE_THRESHOLD) {
      EventBus.emit(FamilyEvent.BECOME_HOSTILE, { playerId, familyId });
    }
    return newValue;
  }
}

export class FamilyService {
  private static instance: FamilyService;
  private families: Map<string, FamilyConfig>;
  private playerFamilyMap: Map<string, string>;

  private constructor() {
    this.families = new Map();
    this.playerFamilyMap = new Map();
  }

  static getInstance(): FamilyService {
    if (!FamilyService.instance) {
      FamilyService.instance = new FamilyService();
    }
    return FamilyService.instance;
  }

  initializeFamilies(): void {
    const countries = [Country.Qin, Country.Chu, Country.Qi, Country.Yan, Country.Zhao, Country.Wei, Country.Han];
    for (const country of countries) {
      this.createFamiliesForCountry(country);
    }
  }

  private createFamiliesForCountry(country: Country): void {
    const imperial = this.createFamily(country, FamilyLevel.Imperial, '皇族');
    for (let i = 0; i < 3; i++) {
      this.createFamily(country, FamilyLevel.First, `一级家族${i + 1}`);
    }
    for (let i = 0; i < 5; i++) {
      this.createFamily(country, FamilyLevel.Second, `二级家族${i + 1}`);
    }
    for (let i = 0; i < 7; i++) {
      this.createFamily(country, FamilyLevel.Third, `三级家族${i + 1}`);
    }
  }

  private createFamily(country: Country, level: FamilyLevel, baseName: string): FamilyConfig {
    const countryName = CountryService.getInstance().getCountryName(country);
    const family: FamilyConfig = {
      id: `${countryName}_${level}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${countryName}${baseName}`,
      level,
      country: countryName,
      memberCount: 0
    };
    this.families.set(family.id, family);
    return family;
  }

  assignPlayerToFamily(playerId: string, country: Country): PlayerFamilyInfo {
    const countryName = CountryService.getInstance().getCountryName(country);
    const familiesInCountry = this.getFamiliesByCountry(countryName);
    const randomFamily = familiesInCountry[Math.floor(Math.random() * familiesInCountry.length)];
    this.playerFamilyMap.set(playerId, randomFamily.id);
    randomFamily.memberCount++;
    
    FavorabilitySystem.getInstance().initializePlayerFavorability(playerId, familiesInCountry.map(f => f.id));
    
    return {
      familyId: randomFamily.id,
      isMainBranch: randomFamily.level === FamilyLevel.Imperial,
      familyName: randomFamily.name
    };
  }

  getFamilyFavorability(familyId: string): number {
    return FAMILY_CONFIG.INITIAL_FAVORABILITY;
  }

  modifyFavorability(familyId: string, delta: number): number {
    const favorability = this.getFamilyFavorability(familyId);
    const newValue = favorability + delta;
    if (newValue <= FAMILY_CONFIG.HOSTILE_THRESHOLD) {
      this.triggerElderHunt(familyId);
    }
    return newValue;
  }

  private triggerElderHunt(familyId: string): void {
    console.log(`Family ${familyId} triggered elder hunt!`);
    EventBus.emit(FamilyEvent.ELDER_HUNT_START, { familyId });
  }

  getFamiliesByCountry(country: string): FamilyConfig[] {
    return Array.from(this.families.values()).filter(f => f.country === country);
  }

  getFamilyConfig(familyId: string): FamilyConfig | undefined {
    return this.families.get(familyId);
  }

  getPlayerFamily(playerId: string): FamilyConfig | undefined {
    const familyId = this.playerFamilyMap.get(playerId);
    return familyId ? this.families.get(familyId) : undefined;
  }

  getAllFamilies(): FamilyConfig[] {
    return Array.from(this.families.values());
  }
}