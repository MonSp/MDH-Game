import { getSocket } from '../shared/socket';
import { toServerId, toClientName } from '../shared/itemMapping';
import type {
  SocketResult, EconomyBuyResponse, EconomySellResponse,
  EconomyMarketResponse, EconomyInventoryResponse,
  CombatAttackResponse, CombatSkillResponse, CombatEvent,
  CultivationCultivateResponse, CultivationBreakthroughResponse,
  CultivationStatusResponse, StateSync, MarketInfo,
  DiplomacyWarResponse, DiplomacyAllianceResponse, DiplomacyStatusResponse
} from '../shared/types/socket-events';

let initialized = false;
const socket = getSocket();

function emitWithAck<T>(event: string, data?: unknown): Promise<SocketResult<T>> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, error: '请求超时' });
    }, 2000);

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

// ─── Item-mapped convenience wrappers ───────────────────────────

/** Buy by Chinese item name (auto-maps to server ID). Returns mapped response. */
export async function serverBuyByChineseName(chineseName: string, quantity: number): Promise<{ success: boolean; balance: number; inventory: Record<string, number>; error?: string }> {
  const serverId = toServerId(chineseName);
  const res = await emitWithAck<EconomyBuyResponse>('economy:buy', { itemId: serverId, quantity });
  if (!res.success) return { success: false, balance: 0, inventory: {}, error: res.error };
  // Convert server inventory back to Chinese-keyed map
  const inv: Record<string, number> = { '灵石': res.data!.balance };
  for (const { item, count } of res.data!.inventory) {
    inv[toClientName(item.id)] = count;
  }
  return { success: true, balance: res.data!.balance, inventory: inv };
}

/** Sell by Chinese item name. Returns mapped response. */
export async function serverSellByChineseName(chineseName: string, quantity: number): Promise<{ success: boolean; balance: number; inventory: Record<string, number>; error?: string }> {
  const serverId = toServerId(chineseName);
  const res = await emitWithAck<EconomySellResponse>('economy:sell', { itemId: serverId, quantity });
  if (!res.success) return { success: false, balance: 0, inventory: {}, error: res.error };
  const inv: Record<string, number> = { '灵石': res.data!.balance };
  for (const { item, count } of res.data!.inventory) {
    inv[toClientName(item.id)] = count;
  }
  return { success: true, balance: res.data!.balance, inventory: inv };
}

/** Get market with Chinese names. */
export async function serverGetMarketCN(): Promise<{ success: boolean; items: Array<MarketInfo & { chineseName: string }>; balance: number; error?: string }> {
  const res = await emitWithAck<EconomyMarketResponse>('economy:market');
  if (!res.success) return { success: false, items: [], balance: 0, error: res.error };
  return {
    success: true,
    items: res.data!.items.map(i => ({ ...i, chineseName: toClientName(i.commodity) })),
    balance: res.data!.balance,
  };
}

/** Craft by recipe ID, returns Chinese-mapped product name. */
export async function serverCraftByRecipe(recipeId: string, buffMultiplier?: number): Promise<{ success: boolean; product?: string; equipment?: any; message: string; inventory: Record<string, number> }> {
  const res = await emitWithAck<any>('economy:craft', { recipeId, buffMultiplier });
  if (!res.success) return { success: false, message: res.error || '合成失败', inventory: {} };
  const d = res.data;
  return {
    success: d.success,
    product: d.product ? toClientName(d.product) : undefined,
    equipment: d.equipment,
    message: d.message,
    inventory: d.inventory || {},
  };
}

/** Gather resource, returns Chinese-mapped material names. */
export async function serverGatherCN(resourceType: string): Promise<{ success: boolean; spiritStonesGained: number; expGained: number; materials: Array<{ name: string; count: number }>; error?: string }> {
  const res = await emitWithAck<any>('resource:gather', { resourceType });
  if (!res.success) return { success: false, spiritStonesGained: 0, expGained: 0, materials: [], error: res.error };
  return {
    success: true,
    spiritStonesGained: res.data.spiritStonesGained,
    expGained: res.data.expGained,
    materials: res.data.materials.map((m: any) => ({ name: toClientName(m.name), count: m.count })),
  };
}

/** Attack target, returns result with Chinese-mapped loot names. */
export async function serverAttackCN(targetId: string, targetKind: 'npc' | 'monster'): Promise<{ success: boolean; damage: number; targetHp: number; targetMaxHp: number; killed: boolean; playerHp: number; loot: Array<{ name: string; count: number }>; expGained: number; error?: string }> {
  const res = await emitWithAck<CombatAttackResponse>('combat:attack', { targetId, targetKind });
  if (!res.success) return { success: false, damage: 0, targetHp: 0, targetMaxHp: 0, killed: false, playerHp: 0, loot: [], expGained: 0, error: res.error };
  return {
    success: true,
    damage: res.data!.damage,
    targetHp: res.data!.targetHp,
    targetMaxHp: res.data!.targetMaxHp,
    killed: res.data!.killed,
    playerHp: res.data!.playerHp,
    loot: (res.data!.loot || []).map(l => ({ name: toClientName(l.name), count: l.count })),
    expGained: res.data!.expGained || 0,
  };
}

export { toServerId, toClientName } from '../shared/itemMapping';
