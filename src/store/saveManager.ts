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

export function getSaveSlots(): SaveSlotInfo[] {
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

export function saveGame(
  slot: number,
  gameState: unknown,
  playerName: string,
  playerRealm: string,
  heavenLevel: number,
): void {
  const data = {
    meta: {
      slot,
      version: SAVE_VERSION,
      timestamp: Date.now(),
      playerName,
      playerRealm,
      heavenLevel,
    },
    gameState,
  };
  try {
    localStorage.setItem(storageKey(slot), JSON.stringify(data));
  } catch (e) {
    console.error('[SaveManager] Failed to save:', e);
  }
}

export function loadGame(slot: number): unknown | null {
  try {
    const raw = localStorage.getItem(storageKey(slot));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('[SaveManager] Failed to load:', e);
    return null;
  }
}

export function deleteSave(slot: number): void {
  try {
    localStorage.removeItem(storageKey(slot));
  } catch (e) {
    console.error('[SaveManager] Failed to delete:', e);
  }
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
