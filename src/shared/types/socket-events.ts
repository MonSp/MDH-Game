import type { Item } from './economy';
import type { CultivationRealm } from './cultivation';
import type { PlayerState } from './player';

export interface MarketInfo {
  commodity: string;
  basePrice: number;
  currentPrice: number;
  supply: number;
  demand: number;
}

// ─── Result Envelope ────────────────────────────────────────────

export interface SocketResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Economy ────────────────────────────────────────────────────

export interface EconomyBuyRequest {
  itemId: string;
  quantity: number;
}

export interface EconomyBuyResponse {
  balance: number;
  inventory: Array<{ item: Item; count: number }>;
}

export interface EconomySellRequest {
  itemId: string;
  quantity: number;
}

export interface EconomySellResponse {
  balance: number;
  inventory: Array<{ item: Item; count: number }>;
}

export interface EconomyMarketResponse {
  items: MarketInfo[];
  balance: number;
}

export interface EconomyInventoryResponse {
  items: Array<{ item: Item; count: number }>;
  balance: number;
}

// ─── Combat ─────────────────────────────────────────────────────

export type CombatTargetKind = 'npc' | 'monster';

export interface CombatAttackRequest {
  targetId: string;
  targetKind: CombatTargetKind;
}

export interface CombatAttackResponse {
  damage: number;
  targetHp: number;
  targetMaxHp: number;
  killed: boolean;
  playerHp: number;
  loot?: Array<{ itemId: string; name: string; count: number }>;
  expGained?: number;
}

export interface CombatSkillRequest {
  targetId: string;
  skillIndex: number;
}

export interface CombatSkillResponse {
  damage: number;
  targetHp: number;
  killed: boolean;
  spiritCost: number;
  loot?: Array<{ itemId: string; name: string; count: number }>;
}

export interface CombatEvent {
  type: 'player_attack' | 'npc_attack' | 'monster_attack' | 'death';
  attackerId: string;
  defenderId: string;
  damage: number;
  timestamp: number;
}

export interface MonsterState {
  id: string;
  type: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  position: { x: number; y: number };
}

// ─── Cultivation ────────────────────────────────────────────────

export interface CultivationCultivateResponse {
  cultivation: number;
  maxCultivation: number;
  realm: CultivationRealm;
  spiritStones: number;
  expGained: number;
}

export interface CultivationBreakthroughResponse {
  success: boolean;
  newRealm?: CultivationRealm;
  newRealmName?: string;
  stats?: {
    maxHealth: number;
    maxSpirit: number;
    attack: number;
    defense: number;
  };
  reason?: 'cultivation_insufficient' | 'spirit_stones_insufficient' | 'max_realm_reached';
}

export interface CultivationStatusResponse {
  realm: CultivationRealm;
  realmName: string;
  cultivation: number;
  maxCultivation: number;
  spiritStones: number;
  stats: {
    health: number;
    maxHealth: number;
    spirit: number;
    maxSpirit: number;
    attack: number;
    defense: number;
  };
}

// ─── Diplomacy ──────────────────────────────────────────────────

export interface DiplomacyWarRequest {
  targetClanId: string;
}

export interface DiplomacyAllianceRequest {
  targetClanId: string;
}

export interface DiplomacyTruceRequest {
  targetClanId: string;
}

export interface DiplomacySurrenderRequest {
  targetClanId: string;
}

export interface DiplomacyBreakRequest {
  targetClanId: string;
}

export type DiplomaticStatus = 'neutral' | 'allied' | 'war' | 'truce' | 'hostile';

export interface DiplomacyRelationship {
  clanA: string;
  clanB: string;
  status: DiplomaticStatus;
  hostility: number;
  lastAction?: string;
  lastActionTime?: number;
}

export interface DiplomacyWarResponse {
  relationships: DiplomacyRelationship[];
  warTarget: string;
}

export interface DiplomacyAllianceResponse {
  relationships: DiplomacyRelationship[];
  alliedWith: string;
}

export interface DiplomacyStatusResponse {
  relationships: DiplomacyRelationship[];
  currentClan: string;
}

// ─── State Sync ─────────────────────────────────────────────────

export interface PlayerSyncState {
  health: number;
  maxHealth: number;
  spirit: number;
  maxSpirit: number;
  attack: number;
  defense: number;
  spiritStones: number;
  realm: CultivationRealm;
  cultivation: number;
  maxCultivation: number;
  position: { x: number; y: number };
  state: PlayerState;
}

export interface StateSync {
  player: PlayerSyncState;
  nearbyMonsters: MonsterState[];
  combatEvents: CombatEvent[];
}

// ─── Socket Event Map ──────────────────────────────────────────

export interface ClientToServerEvents {
  'economy:buy': (req: EconomyBuyRequest) => void;
  'economy:sell': (req: EconomySellRequest) => void;
  'economy:market': () => void;
  'economy:inventory': () => void;
  'combat:attack': (req: CombatAttackRequest) => void;
  'combat:skill': (req: CombatSkillRequest) => void;
  'cultivation:cultivate': () => void;
  'cultivation:breakthrough': () => void;
  'cultivation:status': () => void;
  'diplomacy:declare-war': (req: DiplomacyWarRequest) => void;
  'diplomacy:propose-alliance': (req: DiplomacyAllianceRequest) => void;
  'diplomacy:propose-truce': (req: DiplomacyTruceRequest) => void;
  'diplomacy:surrender': (req: DiplomacySurrenderRequest) => void;
  'diplomacy:break-alliance': (req: DiplomacyBreakRequest) => void;
  'diplomacy:status': () => void;
}

export interface ServerToClientEvents {
  'economy:buy:result': (res: SocketResult<EconomyBuyResponse>) => void;
  'economy:sell:result': (res: SocketResult<EconomySellResponse>) => void;
  'economy:market:result': (res: SocketResult<EconomyMarketResponse>) => void;
  'economy:inventory:result': (res: SocketResult<EconomyInventoryResponse>) => void;
  'combat:attack:result': (res: SocketResult<CombatAttackResponse>) => void;
  'combat:skill:result': (res: SocketResult<CombatSkillResponse>) => void;
  'combat:event': (event: CombatEvent) => void;
  'cultivation:cultivate:result': (res: SocketResult<CultivationCultivateResponse>) => void;
  'cultivation:breakthrough:result': (res: SocketResult<CultivationBreakthroughResponse>) => void;
  'cultivation:status:result': (res: SocketResult<CultivationStatusResponse>) => void;
  'diplomacy:declare-war:result': (res: SocketResult<DiplomacyWarResponse>) => void;
  'diplomacy:propose-alliance:result': (res: SocketResult<DiplomacyAllianceResponse>) => void;
  'diplomacy:propose-truce:result': (res: SocketResult<DiplomacyStatusResponse>) => void;
  'diplomacy:surrender:result': (res: SocketResult<DiplomacyStatusResponse>) => void;
  'diplomacy:break-alliance:result': (res: SocketResult<DiplomacyStatusResponse>) => void;
  'diplomacy:status:result': (res: SocketResult<DiplomacyStatusResponse>) => void;
  'state:sync': (state: StateSync) => void;
}
