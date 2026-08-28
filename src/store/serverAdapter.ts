import { getSocket } from '../shared/socket';
import type {
  SocketResult, EconomyBuyResponse, EconomySellResponse,
  EconomyMarketResponse, EconomyInventoryResponse,
  CombatAttackResponse, CombatSkillResponse, CombatEvent,
  CultivationCultivateResponse, CultivationBreakthroughResponse,
  CultivationStatusResponse, StateSync,
  DiplomacyWarResponse, DiplomacyAllianceResponse, DiplomacyStatusResponse
} from '../shared/types/socket-events';

let initialized = false;
const socket = getSocket();

function emitWithAck<T>(event: string, data?: unknown): Promise<SocketResult<T>> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, error: '请求超时' });
    }, 10000);

    const resultEvent = `${event}:result`;
    socket.once(resultEvent, (res: SocketResult<T>) => {
      clearTimeout(timeout);
      resolve(res);
    });

    if (data !== undefined) {
      socket.emit(event, data);
    } else {
      socket.emit(event);
    }
  });
}

// ─── Economy ────────────────────────────────────────────────────

export async function serverBuyItem(itemId: string, quantity: number): Promise<SocketResult<EconomyBuyResponse>> {
  return emitWithAck<EconomyBuyResponse>('economy:buy', { itemId, quantity });
}

export async function serverSellItem(itemId: string, quantity: number): Promise<SocketResult<EconomySellResponse>> {
  return emitWithAck<EconomySellResponse>('economy:sell', { itemId, quantity });
}

export async function serverGetMarket(): Promise<SocketResult<EconomyMarketResponse>> {
  return emitWithAck<EconomyMarketResponse>('economy:market');
}

export async function serverGetInventory(): Promise<SocketResult<EconomyInventoryResponse>> {
  return emitWithAck<EconomyInventoryResponse>('economy:inventory');
}

// ─── Combat ─────────────────────────────────────────────────────

export async function serverAttack(targetId: string, targetKind: 'npc' | 'monster'): Promise<SocketResult<CombatAttackResponse>> {
  return emitWithAck<CombatAttackResponse>('combat:attack', { targetId, targetKind });
}

export async function serverUseSkill(targetId: string, skillIndex: number): Promise<SocketResult<CombatSkillResponse>> {
  return emitWithAck<CombatSkillResponse>('combat:skill', { targetId, skillIndex });
}

// ─── Cultivation ────────────────────────────────────────────────

export async function serverCultivate(): Promise<SocketResult<CultivationCultivateResponse>> {
  return emitWithAck<CultivationCultivateResponse>('cultivation:cultivate');
}

export async function serverBreakthrough(): Promise<SocketResult<CultivationBreakthroughResponse>> {
  return emitWithAck<CultivationBreakthroughResponse>('cultivation:breakthrough');
}

export async function serverCultivationStatus(): Promise<SocketResult<CultivationStatusResponse>> {
  return emitWithAck<CultivationStatusResponse>('cultivation:status');
}

// ─── Diplomacy ──────────────────────────────────────────────────

export async function serverDeclareWar(targetClanId: string): Promise<SocketResult<DiplomacyWarResponse>> {
  return emitWithAck<DiplomacyWarResponse>('diplomacy:declare-war', { targetClanId });
}

export async function serverProposeAlliance(targetClanId: string): Promise<SocketResult<DiplomacyAllianceResponse>> {
  return emitWithAck<DiplomacyAllianceResponse>('diplomacy:propose-alliance', { targetClanId });
}

export async function serverProposeTruce(targetClanId: string): Promise<SocketResult<DiplomacyStatusResponse>> {
  return emitWithAck<DiplomacyStatusResponse>('diplomacy:propose-truce', { targetClanId });
}

export async function serverSurrender(targetClanId: string): Promise<SocketResult<DiplomacyStatusResponse>> {
  return emitWithAck<DiplomacyStatusResponse>('diplomacy:surrender', { targetClanId });
}

export async function serverBreakAlliance(targetClanId: string): Promise<SocketResult<DiplomacyStatusResponse>> {
  return emitWithAck<DiplomacyStatusResponse>('diplomacy:break-alliance', { targetClanId });
}

// ─── State Sync Listener ────────────────────────────────────────

type StateSyncCallback = (state: StateSync) => void;
type CombatEventCallback = (event: CombatEvent) => void;

const stateSyncCallbacks: StateSyncCallback[] = [];
const combatEventCallbacks: CombatEventCallback[] = [];

export function onStateSync(callback: StateSyncCallback) {
  stateSyncCallbacks.push(callback);
}

export function onCombatEvent(callback: CombatEventCallback) {
  combatEventCallbacks.push(callback);
}

export function initSocketListeners() {
  if (initialized) return;
  initialized = true;

  socket.on('state:sync', (state: StateSync) => {
    for (const cb of stateSyncCallbacks) cb(state);
  });

  socket.on('combat:event', (event: CombatEvent) => {
    for (const cb of combatEventCallbacks) cb(event);
  });
}

// ─── Crafting ───────────────────────────────────────────────────

export interface CraftServerRequest {
  recipeId: string;
  buffMultiplier?: number;
}

export async function serverCraft(req: CraftServerRequest): Promise<SocketResult<any>> {
  return emitWithAck<any>('economy:craft', req);
}

export async function serverGetRecipes(): Promise<SocketResult<any[]>> {
  return emitWithAck<any[]>('economy:recipes');
}

// ─── Resource Gathering ─────────────────────────────────────────

export async function serverGather(resourceType: string): Promise<SocketResult<any>> {
  return emitWithAck<any>('resource:gather', { resourceType });
}

// ─── Techniques ─────────────────────────────────────────────────

export async function serverTechniqueStatus(): Promise<SocketResult<any>> {
  return emitWithAck<any>('technique:status');
}

export async function serverTechniqueLearn(techniqueId: string): Promise<SocketResult<any>> {
  return emitWithAck<any>('technique:learn', { techniqueId });
}

export async function serverTechniqueLevelUp(techniqueId: string): Promise<SocketResult<any>> {
  return emitWithAck<any>('technique:levelup', { techniqueId });
}

// ─── Save/Load ──────────────────────────────────────────────────

export async function serverSaveList(): Promise<SocketResult<any[]>> {
  return emitWithAck<any[]>('save:list');
}

export async function serverSave(slot: number, gameState: unknown, meta: { playerName: string; playerRealm: string; heavenLevel: number }): Promise<SocketResult<any>> {
  return emitWithAck<any>('save:save', { slot, gameState, ...meta });
}

export async function serverLoad(slot: number): Promise<SocketResult<any>> {
  return emitWithAck<any>('save:load', { slot });
}

export async function serverDeleteSave(slot: number): Promise<SocketResult<any>> {
  return emitWithAck<any>('save:delete', { slot });
}
