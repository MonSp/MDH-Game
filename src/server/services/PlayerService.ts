import { Country, CultivationRealm, PlayerState, PlayerData, PlayerAttributes, PlayerEvent, EventBus, CountryTrait } from '../../shared';
import { CountryService } from './CountryService';
import { FamilyService } from './FamilyService';
import { CultivationService } from './CultivationService';
import { EconomyService } from './EconomyService';
import { DataService } from './DataService';

export class Player {
  readonly id: string;
  name: string;
  country: Country;
  familyId: string;
  realm: CultivationRealm;
  cultivation: number;
  areaId: string;

  health: number;
  maxHealth: number;
  spirit: number;
  maxSpirit: number;
  attack: number;
  defense: number;
  baseMoveSpeed: number;
  spiritStones: number;

  position: { x: number; y: number };
  state: PlayerState;
  stateTimer: number;

  createdAt: number;
  lastLoginAt: number;

  constructor(data: PlayerData) {
    this.id = data.id;
    this.name = data.name;
    this.country = data.country;
    this.familyId = data.familyId;
    this.realm = data.realm;
    this.cultivation = data.cultivation;
    this.health = data.attributes.health;
    this.maxHealth = data.attributes.maxHealth;
    this.spirit = data.attributes.spirit;
    this.maxSpirit = data.attributes.maxSpirit;
    this.attack = data.attributes.attack;
    this.defense = data.attributes.defense;
    this.baseMoveSpeed = data.attributes.moveSpeed;
    this.spiritStones = data.attributes.spiritStone;
    this.position = { ...data.position };
    this.state = data.state;
    this.areaId = '';
    this.stateTimer = 0;
    this.createdAt = data.createdAt;
    this.lastLoginAt = data.lastLoginAt;
  }

  applyCountryTrait(): void {
    const trait = CountryService.getInstance().getCountryTrait(this.country);
    switch (trait.type) {
      case 'battle_exp':
        this.attack *= (1 + trait.value / 100);
        break;
      case 'spirit_cap':
        this.maxSpirit *= (1 + trait.value / 100);
        this.spirit = this.maxSpirit;
        break;
      case 'move_speed':
        this.baseMoveSpeed *= (1 + trait.value / 100);
        break;
      case 'spirit_absorption':
        break;
    }
  }

  update(deltaTime: number): void {
    this.stateTimer += deltaTime;

    switch (this.state) {
      case PlayerState.Idle:
        this.recoverSpirit(deltaTime);
        break;
      case PlayerState.Sitting:
        this.recoverSpirit(deltaTime * 3);
        break;
      case PlayerState.Moving:
        break;
      case PlayerState.Fighting:
        break;
    }
  }

  private recoverSpirit(deltaTime: number): void {
    const recoveryRate = 1;
    this.spirit = Math.min(this.maxSpirit, this.spirit + recoveryRate * (deltaTime / 1000));
  }

  moveTo(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
    this.setState(PlayerState.Moving);
  }

  sit(): void {
    this.setState(PlayerState.Sitting);
  }

  stand(): void {
    this.setState(PlayerState.Idle);
  }

  takeDamage(amount: number, attackerId: string): void {
    const actualDamage = Math.max(1, amount - this.defense);
    this.health -= actualDamage;

    EventBus.emit(PlayerEvent.HEALTH_CHANGED, {
      playerId: this.id,
      health: this.health,
      maxHealth: this.maxHealth
    });

    if (this.health <= 0) {
      this.onDeath(attackerId);
    }
  }

  private onDeath(killerId: string): void {
    this.setState(PlayerState.Dead);
    EventBus.emit(PlayerEvent.PLAYER_DIED, {
      playerId: this.id,
      killerId
    });

    setTimeout(() => {
      this.respawn();
    }, 5000);
  }

  private respawn(): void {
    const familyConfig = FamilyService.getInstance().getFamilyConfig(this.familyId);
    if (familyConfig) {
      const capital = CountryService.getInstance().getCapitalPosition(familyConfig.country as unknown as Country);
      this.position.x = capital.x;
      this.position.y = capital.y;
    }
    this.health = this.maxHealth;
    this.spirit = this.maxSpirit;
    this.setState(PlayerState.Idle);

    EventBus.emit(PlayerEvent.PLAYER_RESPAWNED, { playerId: this.id });
  }

  setState(newState: PlayerState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.stateTimer = 0;
      EventBus.emit(PlayerEvent.STATE_CHANGED, {
        playerId: this.id,
        from: oldState,
        to: newState
      });
    }
  }

  addCultivation(amount: number): void {
    const realmConfig = CultivationService.getInstance().getRealmConfig(this.realm);
    this.cultivation += amount;

    if (this.cultivation >= realmConfig.requiredCultivation) {
      EventBus.emit(PlayerEvent.CULTIVATION_FULL, { playerId: this.id });
    }

    EventBus.emit(PlayerEvent.CULTIVATION_GAINED, {
      playerId: this.id,
      amount,
      total: this.cultivation
    });
  }

  addSpiritStones(amount: number): void {
    this.spiritStones += amount;
    EventBus.emit(PlayerEvent.SPIRIT_STONES_CHANGED, {
      playerId: this.id,
      amount: this.spiritStones
    });
  }

  attemptBreakthrough(): boolean {
    const result = CultivationService.getInstance().attemptBreakthrough(
      this.realm,
      this.cultivation,
      this.spiritStones
    );

    if (result.success && result.newRealm) {
      const bonuses = CultivationService.getInstance().applyRealmBonus(result.newRealm);
      this.maxHealth *= bonuses.healthMultiplier;
      this.maxSpirit *= bonuses.spiritMultiplier;
      this.attack *= bonuses.powerMultiplier;
      this.health = this.maxHealth;
      this.spirit = this.maxSpirit;
      this.realm = result.newRealm;
      return true;
    }
    return false;
  }

  toData(): PlayerData {
    return {
      id: this.id,
      name: this.name,
      country: this.country,
      familyId: this.familyId,
      realm: this.realm,
      cultivation: this.cultivation,
      attributes: {
        health: this.health,
        maxHealth: this.maxHealth,
        spirit: this.spirit,
        maxSpirit: this.maxSpirit,
        attack: this.attack,
        defense: this.defense,
        moveSpeed: this.baseMoveSpeed,
        spiritStone: this.spiritStones
      },
      position: { ...this.position },
      state: this.state,
      createdAt: this.createdAt,
      lastLoginAt: this.lastLoginAt
    };
  }
}

export class PlayerService {
  private static instance: PlayerService;
  private players: Map<string, Player>;
  private playerDataCache: Map<string, PlayerData>;

  private constructor() {
    this.players = new Map();
    this.playerDataCache = new Map();
  }

  static getInstance(): PlayerService {
    if (!PlayerService.instance) {
      PlayerService.instance = new PlayerService();
    }
    return PlayerService.instance;
  }

  createPlayer(id: string, name: string): Player {
    const country = CountryService.getInstance().getRandomCountry();
    const familyInfo = FamilyService.getInstance().assignPlayerToFamily(id, country);

    const player = new Player({
      id,
      name,
      country,
      familyId: familyInfo.familyId,
      realm: CultivationRealm.Mortal,
      cultivation: 0,
      attributes: {
        health: 100,
        maxHealth: 100,
        spirit: 100,
        maxSpirit: 100,
        attack: 10,
        defense: 5,
        moveSpeed: 100,
        spiritStone: 0
      },
      position: CountryService.getInstance().getCapitalPosition(country),
      state: PlayerState.Idle,
      createdAt: Date.now(),
      lastLoginAt: Date.now()
    });

    player.applyCountryTrait();
    EconomyService.getInstance().initializePlayerCurrency(id, 0);
    this.players.set(id, player);
    this.savePlayerData(id);

    return player;
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  removePlayer(id: string): void {
    this.players.delete(id);
    this.playerDataCache.delete(id);
  }

  async savePlayerData(playerId: string): Promise<void> {
    const player = this.players.get(playerId);
    if (!player) return;

    const data = player.toData();
    await DataService.getInstance().savePlayer(data);
  }

  async loadPlayerData(playerId: string): Promise<PlayerData | null> {
    return await DataService.getInstance().loadPlayer(playerId);
  }

  getOnlinePlayers(): Player[] {
    return Array.from(this.players.values());
  }

  getPlayersInArea(areaId: string): Player[] {
    return this.getOnlinePlayers().filter(p => p.areaId === areaId);
  }
}