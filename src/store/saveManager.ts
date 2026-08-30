import { getSocket } from '../shared/socket';

const SAVE_VERSION = '1.0.0';
const STORAGE_PREFIX = 'xianxia_save_';

export interface SaveMeta {
  slot: number;
  version: string;
  timestamp: number;
  playerName: string;
  playerRealm: string;
  heavenLevel: number;
}

export interface SaveSlotInfo {
  slot: number;
  meta: SaveMeta | null;
}

function storageKey(slot: number): string {
  return `${STORAGE_PREFIX}${slot}`;
}

// --- localStorage fallback ---

function localSave(slot: number, data: { meta: SaveMeta; gameState: unknown }): void {
  try {
    localStorage.setItem(storageKey(slot), JSON.stringify(data));
  } catch (e) {
    console.error('[SaveManager] localStorage save failed:', e);
  }
}

function localLoad(slot: number): { meta: SaveMeta; gameState: unknown } | null {
  try {
    const raw = localStorage.getItem(storageKey(slot));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function localGetSlots(): SaveSlotInfo[] {
  const slots: SaveSlotInfo[] = [];
  for (let i = 1; i <= 5; i++) {
    try {
      const raw = localStorage.getItem(storageKey(i));
      if (raw) {
        const data = JSON.parse(raw);
        slots.push({ slot: i, meta: data.meta ?? null });
      } else {
        slots.push({ slot: i, meta: null });
      }
    } catch {
      slots.push({ slot: i, meta: null });
    }
  }
  return slots;
}

function localDelete(slot: number): void {
  try { localStorage.removeItem(storageKey(slot)); } catch {}
}

// --- Server-side save/load ---

function emitWithAck<T>(event: string, data: any, timeoutMs: number = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    if (!socket.connected) {
      reject(new Error('not connected'));
      return;
    }
    const timer = setTimeout(() => {
      socket.off(`${event}-result`, handler);
      reject(new Error('timeout'));
    }, timeoutMs);
    const handler = (result: T) => {
      clearTimeout(timer);
      socket.off(`${event}-result`, handler);
      resolve(result);
    };
    socket.once(`${event}-result`, handler);
    socket.emit(event, data);
  });
}

async function serverSave(slot: number, meta: SaveMeta, gameState: unknown): Promise<boolean> {
  try {
    const result = await emitWithAck<{ ok: boolean; error?: string }>('game:save', { slot, meta, state: gameState });
    return result.ok;
  } catch {
    return false;
  }
}

async function serverLoad(slot: number): Promise<{ meta: SaveMeta; gameState: unknown } | null> {
  try {
    const result = await emitWithAck<{ ok: boolean; meta?: any; state?: any; error?: string }>('game:load', { slot });
    if (result.ok && result.state) {
      return { meta: result.meta, gameState: result.state };
    }
    return null;
  } catch {
    return null;
  }
}

async function serverGetSlots(): Promise<SaveSlotInfo[] | null> {
  try {
    const result = await emitWithAck<{ ok: boolean; slots?: SaveSlotInfo[] }>('game:save-slots', {});
    if (result.ok && result.slots) return result.slots;
    return null;
  } catch {
    return null;
  }
}

async function serverDelete(slot: number): Promise<boolean> {
  try {
    const result = await emitWithAck<{ ok: boolean }>('game:delete-save', { slot });
    return result.ok;
  } catch {
    return false;
  }
}

// --- Public API (server-first, localStorage fallback) ---

export function saveGame(
  slot: number,
  gameState: unknown,
  playerName: string,
  playerRealm: string,
  heavenLevel: number,
): void {
  const meta: SaveMeta = {
    slot,
    version: SAVE_VERSION,
    timestamp: Date.now(),
    playerName,
    playerRealm,
    heavenLevel,
  };

  // Always save to localStorage as backup
  localSave(slot, { meta, gameState });

  // Try server save (fire-and-forget for sync API)
  serverSave(slot, meta, gameState).then(ok => {
    if (!ok) console.warn('[SaveManager] Server save failed, localStorage backup retained');
  });
}

export async function saveGameAsync(
  slot: number,
  gameState: unknown,
  playerName: string,
  playerRealm: string,
  heavenLevel: number,
): Promise<boolean> {
  const meta: SaveMeta = {
    slot,
    version: SAVE_VERSION,
    timestamp: Date.now(),
    playerName,
    playerRealm,
    heavenLevel,
  };

  localSave(slot, { meta, gameState });
  return serverSave(slot, meta, gameState);
}

export function loadGame(slot: number): unknown | null {
  // Try localStorage first (synchronous, fast)
  return localLoad(slot);
}

export async function loadGameAsync(slot: number): Promise<{ meta: SaveMeta; gameState: unknown } | null> {
  // Try server first
  const serverResult = await serverLoad(slot);
  if (serverResult) return serverResult;

  // Fallback to localStorage
  return localLoad(slot);
}

export async function getSaveSlotsAsync(): Promise<SaveSlotInfo[]> {
  const serverSlots = await serverGetSlots();
  if (serverSlots) return serverSlots;
  return localGetSlots();
}

export function getSaveSlots(): SaveSlotInfo[] {
  return localGetSlots();
}

export function deleteSave(slot: number): void {
  localDelete(slot);
  serverDelete(slot).catch(() => {});
}

export function getLatestSaveSlot(): number | null {
  const slots = getSaveSlots();
  let latest: SaveSlotInfo | null = null;
  for (const s of slots) {
    if (s.meta && (!latest || s.meta.timestamp > latest.meta!.timestamp)) {
      latest = s;
    }
  }
  return latest?.slot ?? null;
}
