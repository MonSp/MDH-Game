import { Country } from './country';
import { CultivationRealm } from './cultivation';
import type { Position } from './country';

export type { Position };

export enum PlayerState {
  Idle = 'idle',
  Moving = 'moving',
  Sitting = 'sitting',
  Fighting = 'fighting',
  Trading = 'trading',
  Dead = 'dead'
}

export interface PlayerAttributes {
  health: number;
  maxHealth: number;
  spirit: number;
  maxSpirit: number;
  attack: number;
  defense: number;
  moveSpeed: number;
  spiritStone: number;
}

export interface PlayerData {
  id: string;
  name: string;
  country: Country;
  familyId: string;
  realm: CultivationRealm;
  cultivation: number;
  attributes: PlayerAttributes;
  position: Position;
  state: PlayerState;
  createdAt: number;
  lastLoginAt: number;
}

export enum InputType {
  Move = 'move',
  Sit = 'sit',
  Stand = 'stand',
  Attack = 'attack',
  Interact = 'interact'
}

export interface InputCommand {
  type: InputType;
  x?: number;
  y?: number;
  targetId?: string;
  action?: string;
}

export enum InteractionAction {
  Talk = 'talk',
  Trade = 'trade',
  Attack = 'attack'
}