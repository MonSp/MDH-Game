export * from './country';
export * from './family';
export * from './cultivation';
export * from './resource';
export * from './economy';
export * from './life-cycle';

export interface EventBus {
  emit(event: string, data?: any): void;
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
}

class SimpleEventBus implements EventBus {
  private handlers: Map<string, Set<(data: any) => void>> = new Map();

  emit(event: string, data?: any): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach(handler => handler(data));
    }
  }

  on(event: string, handler: (data: any) => void): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: (data: any) => void): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler);
    }
  }
}

export const EventBus = new SimpleEventBus();

export enum GameEvent {
  COUNTRY_INFO = 'country:info',
  FAMILY_INFO = 'family:info',
  CULTIVATION_BREAKTHROUGH = 'cultivation:breakthrough',
  RESOURCE_COLLECT = 'resource:collect',
  PLAYER_DEATH = 'player:death',
  NPC_DEATH = 'npc:death',
  FAMILY_HOSTILE = 'family:hostile'
}

export enum NPCEvent {
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

export enum PlayerEvent {
  STATE_CHANGED = 'player:state_changed',
  HEALTH_CHANGED = 'player:health_changed',
  CULTIVATION_GAINED = 'player:cultivation_gained',
  CULTIVATION_FULL = 'player:cultivation_full',
  SPIRIT_STONES_CHANGED = 'player:spirit_stones_changed',
  PLAYER_DIED = 'player:died',
  PLAYER_RESPAWNED = 'player:respawned',
  ATTACK = 'player:attack'
}

export enum EconomyEvent {
  CURRENCY_CHANGED = 'economy:currency_changed',
  TRANSACTION_COMPLETED = 'economy:transaction',
  PURCHASE_COMPLETED = 'economy:purchase',
  SALE_COMPLETED = 'economy:sale'
}

export enum ItemEvent {
  ITEM_ADDED = 'item:added',
  ITEM_REMOVED = 'item:removed'
}

export enum CultivationEvent {
  CULTIVATION_GAINED = 'cultivation:gained',
  BREAKTHROUGH_START = 'cultivation:breakthrough_start',
  BREAKTHROUGH_SUCCESS = 'cultivation:breakthrough_success',
  BREAKTHROUGH_FAILED = 'cultivation:breakthrough_failed',
  TRIBULATION_READY = 'cultivation:tribulation_ready'
}

export enum FamilyEvent {
  PLAYER_JOIN = 'family:player_join',
  PLAYER_LEAVE = 'family:player_leave',
  FAVORABILITY_CHANGED = 'family:favorability_changed',
  BECOME_HOSTILE = 'family:hostile',
  ELDER_HUNT_START = 'family:elder_hunt'
}

export enum DeathEvent {
  NPC_DIED = 'death:npc_died',
  DROP_DISTRIBUTED = 'death:drop_distributed',
  SOUL_ENTER_POOL = 'death:soul_enter_pool',
  FAMILY_REPUTATION_CHANGED = 'death:family_reputation_changed',
  BOUNTY_ISSUED = 'death:bounty_issued',
  POSITION_VACATED = 'death:position_vacated'
}

export enum PopulationEvent {
  BIRTH_TRIGGERED = 'population:birth_triggered',
  BIRTH_COMPLETED = 'population:birth_completed',
  POPULATION_UPDATED = 'population:updated',
  NATION_BALANCE_ADJUSTED = 'population:nation_balance_adjusted',
  FAMILY_BALANCE_ADJUSTED = 'population:family_balance_adjusted'
}

export enum ClanEvent {
  POSITION_CHANGED = 'clan:position_changed',
  BOUNTY_ISSUED = 'clan:bounty_issued'
}